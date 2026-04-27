import Link from "next/link";

export const metadata = {
  title: "Page introuvable — Autris",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
      <div className="text-center max-w-[440px]">
        <div className="text-[10px] font-medium text-text-quaternary uppercase mb-3" style={{ letterSpacing: "0.22em" }}>
          Erreur 404
        </div>
        <h1
          className="text-[34px] leading-[1.1] mb-3 text-text-primary"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Cette page <span className="italic text-[var(--color-accent)]">n&apos;existe pas</span>.
        </h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed mb-8 font-serif italic">
          Peut-être l&apos;avez-vous imaginée. Peut-être l&apos;avons-nous déplacée.
          Quoi qu&apos;il en soit, votre roman vous attend ailleurs.
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] font-medium text-[13px] transition-colors no-underline"
          >
            ← Retour à l&apos;accueil
          </Link>
          <a
            href="mailto:contact@autris.app?subject=Page%20introuvable%20Autris"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] border border-white/[0.08] text-text-secondary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] text-[13px] transition-colors no-underline"
          >
            Signaler le lien cassé
          </a>
        </div>

        <div className="mt-12 text-[20px] text-[var(--color-accent)]">◆</div>
      </div>
    </div>
  );
}
