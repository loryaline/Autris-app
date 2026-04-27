"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary global pour l'app router. Attrapé pour toute exception
 * non gérée pendant le rendu. On log côté console (et plus tard Sentry)
 * et on offre à l'utilisatrice de réessayer ou rentrer à l'accueil.
 *
 * Note : Next.js App Router exige que ce composant soit client.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Plus tard : envoyer à Sentry / Resend pour notification
    console.error("[autris] erreur non gérée :", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
      <div className="text-center max-w-[460px]">
        <div className="text-[10px] font-medium text-text-quaternary uppercase mb-3" style={{ letterSpacing: "0.22em" }}>
          Quelque chose a dérapé
        </div>
        <h1
          className="text-[32px] leading-[1.1] mb-3 text-text-primary"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Une <span className="italic text-[var(--color-accent)]">erreur inattendue</span>
          {" "}s&apos;est invitée.
        </h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed mb-2 font-serif italic">
          Vos données sont en sécurité. Réessayez — si ça persiste, dites-le-nous.
        </p>

        {error?.digest && (
          <p className="text-[10.5px] text-text-quaternary mb-6 font-mono">
            Référence : {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] font-medium text-[13px] cursor-pointer transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] border border-white/[0.08] text-text-secondary hover:text-text-primary text-[13px] transition-colors no-underline"
          >
            Retour à l&apos;accueil
          </Link>
          <a
            href={`mailto:aline@autris.app?subject=Erreur%20Autris${error?.digest ? `%20%5B${encodeURIComponent(error.digest)}%5D` : ""}&body=${encodeURIComponent(
              `Bonjour,\n\nJ'ai rencontré une erreur sur Autris.\n\nDétails techniques :\n- Référence : ${error?.digest ?? "(aucune)"}\n- Message : ${error?.message ?? "(aucun)"}\n- Page : ${typeof window !== "undefined" ? window.location.href : ""}\n\nMerci !`
            )}`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] border border-white/[0.08] text-text-secondary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] text-[13px] transition-colors no-underline"
          >
            Nous écrire
          </a>
        </div>

        <div className="mt-12 text-[20px] text-[var(--color-accent)]">◆</div>
      </div>
    </div>
  );
}
