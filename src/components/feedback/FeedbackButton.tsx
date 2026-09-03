"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Bouton flottant de retour (bug / suggestion / question), visible
 * en bas à droite de toutes les pages authentifiées.
 *
 * À l'envoi, on POST vers /api/feedback qui envoie un email à
 * aline@autris.app via Resend. Pas d'ouverture de client mail —
 * tout passe côté serveur.
 *
 * Champs :
 *  - type (bug / idée / question)
 *  - message (obligatoire)
 *  - replyEmail (optionnel — pour qu'on puisse répondre)
 *  - includeContext : joindre l'URL, navigateur, résolution, etc.
 */

type FeedbackType = "bug" | "idee" | "question";

const TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: "bug",      label: "Bug",       icon: "🐛" },
  { value: "idee",     label: "Idée",      icon: "✨" },
  { value: "question", label: "Question",  icon: "?" },
];

// La prop userEmail est conservée pour rétro-compatibilité avec les
// layouts existants, mais n'est plus utilisée : on n'envoie plus
// l'email du compte de manière implicite (privacy).
export function FeedbackButton(_props: { userEmail?: string | null } = {}) {
  void _props;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [includeContext, setIncludeContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pièces jointes — captures d'écran ajoutées via DnD, Ctrl+V ou parcourir.
  type Attachment = { id: string; name: string; dataUrl: string; size: number };
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILES = 5;
  const MAX_TOTAL_BYTES = 3 * 1024 * 1024; // 3 Mo (limite body serverless)

  // Reset à l'ouverture — différé pour éviter le set-state-in-effect.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSubmitted(false);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    setError(null);
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;

    let count = attachments.length;
    let total = attachments.reduce((s, a) => s + a.size, 0);
    const toAdd: Attachment[] = [];
    for (const f of incoming) {
      if (count >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} images.`);
        break;
      }
      if (total + f.size > MAX_TOTAL_BYTES) {
        setError(
          `Pièces jointes trop lourdes (${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} Mo max au total).`,
        );
        break;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        toAdd.push({
          id:
            (typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
          name: f.name || `capture-${Date.now()}.png`,
          dataUrl,
          size: f.size,
        });
        count++;
        total += f.size;
      } catch {
        /* lecture impossible — on saute ce fichier */
      }
    }
    if (toAdd.length > 0) setAttachments((prev) => [...prev, ...toAdd]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted: File[] = [];
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) pasted.push(f);
      }
    }
    if (pasted.length > 0) {
      e.preventDefault();
      addFiles(pasted);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function buildContext() {
    if (!includeContext) return null;
    const ctx: Record<string, string | null> = {
      url: typeof window !== "undefined" ? window.location.href : pathname,
      timestamp: new Date().toISOString(),
    };
    if (typeof navigator !== "undefined") {
      ctx.userAgent = navigator.userAgent;
      ctx.language = navigator.language || null;
    }
    if (typeof window !== "undefined") {
      ctx.viewport = `${window.innerWidth} × ${window.innerHeight}`;
    }
    // Volontairement : on n'envoie JAMAIS l'email du compte connecté
    // de manière implicite. L'utilisatrice doit le saisir activement
    // dans le champ « Votre email pour le suivi » si elle veut être
    // contactable. Sinon le retour reste vraiment anonyme.
    return ctx;
  }

  async function handleSubmit() {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          replyEmail: replyEmail.trim() || undefined,
          context: buildContext(),
          attachments: attachments.map((a) => ({
            filename: a.name,
            contentBase64: a.dataUrl.split(",", 2)[1] ?? "",
          })),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "L'envoi a échoué. Réessayez plus tard.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitting(false);
      // Auto-close après 3s
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setReplyEmail("");
        setAttachments([]);
      }, 3000);
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Bouton flottant — en bas à droite, discret mais visible */}
      <button
        onClick={() => setOpen(true)}
        title="Signaler un bug ou laisser un retour"
        aria-label="Feedback"
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 md:bottom-4 z-30 w-11 h-11 rounded-full bg-bg-tertiary/80 backdrop-blur border border-white/[0.10] text-text-secondary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] hover:bg-bg-tertiary cursor-pointer transition-colors flex items-center justify-center shadow-lg"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M3 4.5h12a1 1 0 011 1v6a1 1 0 01-1 1H8.5L5 15v-2.5H3a1 1 0 01-1-1v-6a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !submitting && setOpen(false)}
          />
          <div
            className={`relative bg-bg-tertiary border rounded-[var(--radius-lg)] w-full max-w-[460px] shadow-2xl transition-colors ${
              dragOver
                ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent-border)]"
                : "border-white/[0.08]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragOver) setDragOver(true);
            }}
            onDragLeave={(e) => {
              // Évite le flicker quand on survole un enfant.
              if (e.currentTarget === e.target) setDragOver(false);
            }}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] text-text-primary" style={{ fontFamily: "var(--font-serif)" }}>
                Votre <span className="italic text-[var(--color-accent)]">retour</span> compte
              </h3>
              <p className="text-[12px] text-text-tertiary mt-0.5">
                Bug, suggestion, question — on lit chaque message.
              </p>
            </div>

            {!submitted ? (
              <div className="p-4 flex flex-col gap-3">
                {/* Type */}
                <div>
                  <div className="text-[10px] uppercase text-text-quaternary tracking-wider mb-1.5">
                    Type
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setType(t.value)}
                        className={`flex flex-col items-center gap-1 py-2 rounded-[var(--radius-sm)] border cursor-pointer transition-colors ${
                          type === t.value
                            ? "bg-primary-bg border-primary-border text-primary"
                            : "bg-bg-primary border-white/[0.08] text-text-secondary hover:bg-bg-hover"
                        }`}
                      >
                        <span className="text-[14px]">{t.icon}</span>
                        <span className="text-[11.5px] font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <div className="text-[10px] uppercase text-text-quaternary tracking-wider mb-1.5">
                    Votre message
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      type === "bug"
                        ? "Que faisiez-vous ? Que s'est-il passé ?"
                        : type === "idee"
                          ? "Quelle fonctionnalité vous manque ?"
                          : "Quelle est votre question ?"
                    }
                    autoFocus
                    rows={5}
                    maxLength={5000}
                    className="w-full text-[13px] leading-relaxed px-3 py-2 bg-bg-primary border border-white/[0.08] rounded-[var(--radius-sm)] resize-none focus:outline-none focus:border-[var(--color-accent-border)] text-text-primary placeholder:text-text-quaternary"
                  />
                </div>

                {/* Captures d'écran — DnD, Ctrl+V, ou parcourir */}
                <div>
                  <div className="text-[10px] uppercase text-text-quaternary tracking-wider mb-1.5 flex items-center gap-2">
                    <span>Captures d&apos;écran</span>
                    <span className="text-text-quaternary normal-case tracking-normal">
                      (facultatif — glissez-déposez, collez Ctrl+V, ou cliquez ci-dessous)
                    </span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {attachments.map((a) => (
                        <div
                          key={a.id}
                          className="relative group w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border border-white/[0.08]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.dataUrl}
                            alt={a.name}
                            title={`${a.name} · ${Math.round(a.size / 1024)} Ko`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttachment(a.id)}
                            title="Retirer" aria-label="Retirer"
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-[11px] leading-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= MAX_FILES}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-sm)] border border-dashed border-white/[0.12] text-[11.5px] text-text-tertiary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-[13px] leading-none">＋</span>
                    {attachments.length === 0 ? "Joindre une image" : "Ajouter"}
                  </button>
                </div>

                {/* Reply email facultatif */}
                <div>
                  <div className="text-[10px] uppercase text-text-quaternary tracking-wider mb-1.5 flex items-center gap-2">
                    <span>Votre email pour le suivi</span>
                    <span className="text-text-quaternary normal-case tracking-normal">
                      (facultatif)
                    </span>
                  </div>
                  <input
                    type="email"
                    value={replyEmail}
                    onChange={(e) => setReplyEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full h-9 px-3 text-[13px] bg-bg-primary border border-white/[0.08] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-accent-border)] text-text-primary placeholder:text-text-quaternary"
                  />
                  <p className="text-[10.5px] text-text-quaternary mt-1">
                    Renseignez votre email seulement si vous voulez qu&apos;on vous réponde.
                    Sinon le retour reste anonyme — votre email de compte n&apos;est pas transmis.
                  </p>
                </div>

                {/* Contexte technique */}
                <label className="flex items-start gap-2 cursor-pointer text-[11.5px] text-text-tertiary">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={(e) => setIncludeContext(e.target.checked)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    Joindre les infos techniques (page, navigateur, résolution).
                    {" "}
                    <span className="text-text-quaternary">Décocher si vous préférez ne pas les transmettre.</span>
                  </span>
                </label>

                {error && (
                  <div className="p-2.5 rounded-[var(--radius-sm)] bg-red-bg/40 border border-red/30 text-red text-[12px]">
                    {error}
                  </div>
                )}

                {/* Boutons */}
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="h-8 px-3 rounded-[var(--radius-sm)] text-[12.5px] text-text-tertiary hover:text-text-primary cursor-pointer disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || submitting}
                    className={`h-8 px-3.5 rounded-[var(--radius-sm)] text-[12.5px] font-medium transition-colors ${
                      message.trim() && !submitting
                        ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] cursor-pointer"
                        : "bg-white/[0.05] text-text-quaternary cursor-not-allowed"
                    }`}
                  >
                    {submitting ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="text-[28px] text-[var(--color-accent)] mb-2">✦</div>
                <div className="text-[14px] text-text-primary mb-1" style={{ fontFamily: "var(--font-serif)" }}>
                  <span className="italic">Merci.</span>
                </div>
                <p className="text-[12px] text-text-tertiary leading-relaxed">
                  Votre retour est bien parti.
                  {replyEmail && " On vous écrira à l'adresse indiquée si nécessaire."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
