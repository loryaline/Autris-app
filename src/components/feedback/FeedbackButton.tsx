"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Bouton flottant de retour (bug / suggestion / question), visible
 * en bas à droite de toutes les pages authentifiées.
 *
 * À l'envoi, on construit un mailto: pré-rempli avec :
 *  - type de retour
 *  - description de l'utilisatrice
 *  - URL de la page
 *  - user-agent + plateforme
 *  - email du compte (passé en prop par le layout)
 *
 * Pas de DB ni d'API tierce — la soumission ouvre simplement le client
 * mail (Mail.app, Gmail web, Outlook, etc) sur aline@autris.app.
 *
 * Plus tard, on pourra ajouter une table `feedback` côté Supabase pour
 * un traçage centralisé. En V1 bêta, le mailto suffit largement.
 */

type FeedbackType = "bug" | "idee" | "question";

const TYPES: { value: FeedbackType; label: string; icon: string; subject: string }[] = [
  { value: "bug",      label: "Bug",       icon: "🐛", subject: "Bug" },
  { value: "idee",     label: "Idée",      icon: "✨", subject: "Suggestion" },
  { value: "question", label: "Question",  icon: "?",  subject: "Question" },
];

export function FeedbackButton({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [includeContext, setIncludeContext] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Reset à l'ouverture
  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
  }, [open]);

  function buildMailto(): string {
    const t = TYPES.find((x) => x.value === type)!;
    const subject = `[Autris bêta · ${t.subject}] ${message.slice(0, 60).trim() || "Retour"}`;

    const lines: string[] = [];
    lines.push(message.trim() || "(Décrivez ici votre retour)");
    lines.push("");
    if (includeContext) {
      lines.push("---");
      lines.push("Contexte technique (joint automatiquement) :");
      lines.push(`Page : ${typeof window !== "undefined" ? window.location.href : pathname}`);
      if (typeof navigator !== "undefined") {
        lines.push(`Navigateur : ${navigator.userAgent}`);
        const lang = navigator.language;
        if (lang) lines.push(`Langue : ${lang}`);
      }
      if (typeof window !== "undefined") {
        lines.push(`Résolution : ${window.innerWidth} × ${window.innerHeight}`);
      }
      if (userEmail) lines.push(`Compte : ${userEmail}`);
      lines.push(`Date : ${new Date().toISOString()}`);
    }

    const body = encodeURIComponent(lines.join("\n"));
    const subj = encodeURIComponent(subject);
    return `mailto:aline@autris.app?subject=${subj}&body=${body}`;
  }

  function handleSubmit() {
    if (!message.trim()) return;
    const url = buildMailto();
    // Ouvre le client mail. On ne fait pas window.location.href (qui peut
    // bloquer la navigation) — on laisse le navigateur gérer le mailto.
    window.location.href = url;
    setSubmitted(true);
    // Auto-close après 4s, le temps que le client mail s'ouvre
    setTimeout(() => {
      setOpen(false);
      setMessage("");
    }, 4000);
  }

  return (
    <>
      {/* Bouton flottant — en bas à droite, discret mais visible */}
      <button
        onClick={() => setOpen(true)}
        title="Signaler un bug ou laisser un retour"
        aria-label="Feedback"
        className="fixed bottom-4 right-4 z-30 w-11 h-11 rounded-full bg-bg-tertiary/80 backdrop-blur border border-white/[0.10] text-text-secondary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] hover:bg-bg-tertiary cursor-pointer transition-colors flex items-center justify-center shadow-lg"
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
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-lg)] w-full max-w-[460px] shadow-2xl">
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
                    className="w-full text-[13px] leading-relaxed px-3 py-2 bg-bg-primary border border-white/[0.08] rounded-[var(--radius-sm)] resize-none focus:outline-none focus:border-[var(--color-accent-border)] text-text-primary placeholder:text-text-quaternary"
                  />
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

                {/* Boutons */}
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="h-8 px-3 rounded-[var(--radius-sm)] text-[12.5px] text-text-tertiary hover:text-text-primary cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim()}
                    className={`h-8 px-3.5 rounded-[var(--radius-sm)] text-[12.5px] font-medium transition-colors ${
                      message.trim()
                        ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] cursor-pointer"
                        : "bg-white/[0.05] text-text-quaternary cursor-not-allowed"
                    }`}
                  >
                    Envoyer
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
                  Votre client mail vient de s&apos;ouvrir avec votre retour pré-rempli.
                  <br />
                  Cliquez sur <strong>Envoyer</strong> dans votre client pour finaliser.
                </p>
                <p className="text-[11px] text-text-quaternary mt-3">
                  Rien ne se passe ? Écrivez-nous directement à{" "}
                  <a href="mailto:aline@autris.app" className="text-[var(--color-accent)] underline">
                    aline@autris.app
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
