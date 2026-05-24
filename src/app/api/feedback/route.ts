import { NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * Endpoint d'envoi des retours bêta (bug / suggestion / question).
 *
 * Le client (FeedbackButton) POST ici un JSON :
 *   { type, message, replyEmail?, context? }
 *
 * On envoie un email à aline@autris.app via Resend. Tant que le domaine
 * autris.app n'est pas vérifié dans Resend, on envoie depuis l'adresse
 * test `onboarding@resend.dev` (autorisée par Resend par défaut). Quand
 * la vérification DNS sera faite, on basculera sur `noreply@autris.app`.
 *
 * Si RESEND_API_KEY n'est pas configurée, on retourne une erreur 503
 * explicite plutôt que de planter.
 */

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  idee: "Idée",
  question: "Question",
};

interface FeedbackBody {
  type?: string;
  message?: string;
  replyEmail?: string;
  context?: {
    url?: string;
    userAgent?: string;
    language?: string;
    viewport?: string;
    accountEmail?: string | null;
    timestamp?: string;
  } | null;
  attachments?: { filename?: string; contentBase64?: string }[];
}

const MAX_ATTACHMENTS = 5;
const MAX_ATTACH_BYTES_TOTAL = 4 * 1024 * 1024; // 4 Mo cumulés (raw)

function sanitizeFilename(name: string): string {
  return (
    (name || "capture")
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "capture"
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  let body: FeedbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const type = body.type ?? "question";
  const message = (body.message ?? "").trim();
  const replyEmail = (body.replyEmail ?? "").trim();
  const context = body.context ?? null;

  // Pièces jointes : validation (nombre, taille cumulée, format).
  const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (rawAttachments.length > MAX_ATTACHMENTS) {
    return NextResponse.json(
      { error: `Trop de pièces jointes (max ${MAX_ATTACHMENTS}).` },
      { status: 400 },
    );
  }
  const attachments: { filename: string; content: string }[] = [];
  let totalBytes = 0;
  for (const a of rawAttachments) {
    const content = (a.contentBase64 ?? "").trim();
    if (!content) continue;
    // Taille décodée approx : base64 length × 3 / 4.
    const decodedBytes = Math.floor((content.length * 3) / 4);
    totalBytes += decodedBytes;
    if (totalBytes > MAX_ATTACH_BYTES_TOTAL) {
      return NextResponse.json(
        {
          error: `Pièces jointes trop lourdes (${Math.round(MAX_ATTACH_BYTES_TOTAL / 1024 / 1024)} Mo max au total).`,
        },
        { status: 400 },
      );
    }
    attachments.push({
      filename: sanitizeFilename(a.filename ?? "capture.png"),
      content,
    });
  }

  if (!message || message.length < 3) {
    return NextResponse.json(
      { error: "Le message est trop court." },
      { status: 400 },
    );
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Le message est trop long (max 5000 caractères)." },
      { status: 400 },
    );
  }
  if (replyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail)) {
    return NextResponse.json(
      { error: "L'email de réponse n'est pas valide." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Service d'envoi non configuré. Écrivez-nous directement à aline@autris.app.",
      },
      { status: 503 },
    );
  }

  const typeLabel = TYPE_LABELS[type] ?? "Retour";
  const subject = `[Support] - ${typeLabel}`;

  // Corps HTML simple, lisible dans tous les clients mail
  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
      <h2 style="margin: 0 0 8px;">${escapeHtml(typeLabel)}</h2>
      ${replyEmail ? `<p style="margin: 0 0 16px; color: #555;">Réponse à : <a href="mailto:${escapeHtml(replyEmail)}">${escapeHtml(replyEmail)}</a></p>` : ""}

      <div style="white-space: pre-wrap; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 16px;">${escapeHtml(message)}</div>

      ${
        context
          ? `
        <h3 style="margin: 16px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #888;">Contexte technique</h3>
        <table style="font-size: 12px; color: #555; border-collapse: collapse;">
          ${context.url ? `<tr><td style="padding: 2px 8px 2px 0; color: #888;">Page</td><td>${escapeHtml(context.url)}</td></tr>` : ""}
          ${context.accountEmail ? `<tr><td style="padding: 2px 8px 2px 0; color: #888;">Compte</td><td>${escapeHtml(context.accountEmail)}</td></tr>` : ""}
          ${context.viewport ? `<tr><td style="padding: 2px 8px 2px 0; color: #888;">Résolution</td><td>${escapeHtml(context.viewport)}</td></tr>` : ""}
          ${context.language ? `<tr><td style="padding: 2px 8px 2px 0; color: #888;">Langue</td><td>${escapeHtml(context.language)}</td></tr>` : ""}
          ${context.userAgent ? `<tr><td style="padding: 2px 8px 2px 0; color: #888;">Navigateur</td><td style="font-family: ui-monospace, Menlo, monospace;">${escapeHtml(context.userAgent)}</td></tr>` : ""}
          ${context.timestamp ? `<tr><td style="padding: 2px 8px 2px 0; color: #888;">Horodatage</td><td>${escapeHtml(context.timestamp)}</td></tr>` : ""}
        </table>
      `
          : ""
      }
    </div>
  `;

  // Texte brut (fallback pour clients mail qui n'aiment pas l'HTML)
  const textLines: string[] = [];
  textLines.push(`${typeLabel}`);
  if (replyEmail) textLines.push(`Réponse à : ${replyEmail}`);
  textLines.push("");
  textLines.push(message);
  if (context) {
    textLines.push("");
    textLines.push("--- Contexte technique ---");
    if (context.url) textLines.push(`Page : ${context.url}`);
    if (context.accountEmail) textLines.push(`Compte : ${context.accountEmail}`);
    if (context.viewport) textLines.push(`Résolution : ${context.viewport}`);
    if (context.language) textLines.push(`Langue : ${context.language}`);
    if (context.userAgent) textLines.push(`Navigateur : ${context.userAgent}`);
    if (context.timestamp) textLines.push(`Horodatage : ${context.timestamp}`);
  }

  try {
    const resend = new Resend(apiKey);
    // Domaine autris.app vérifié dans Resend (DKIM + SPF + MX) — on
    // envoie depuis noreply@autris.app pour un rendu pro et une
    // délivrabilité optimale (pas de risque de spam).
    const { error } = await resend.emails.send({
      from: "Autris <noreply@autris.app>",
      to: ["aline@autris.app"],
      replyTo: replyEmail || undefined,
      subject,
      html: htmlBody,
      text: textLines.join("\n"),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      console.error("[feedback] Resend error:", error);
      return NextResponse.json(
        { error: "L'envoi a échoué. Réessayez ou écrivez-nous directement." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[feedback] Unexpected error:", e);
    return NextResponse.json(
      { error: "L'envoi a échoué. Réessayez ou écrivez-nous directement." },
      { status: 500 },
    );
  }
}
