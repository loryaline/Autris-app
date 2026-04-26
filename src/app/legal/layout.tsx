import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Topbar minimale */}
      <header className="h-14 border-b border-white/[0.04] flex items-center px-6">
        <Link href="/" className="text-[15px] no-underline" style={{ fontFamily: "var(--font-serif)" }}>
          <span className="italic text-[var(--color-accent)]">Autris</span>
        </Link>
        <div className="ml-auto flex items-center gap-5 text-[12.5px]">
          <LegalNavLink href="/legal/mentions" label="Mentions légales" />
          <LegalNavLink href="/legal/cgu" label="CGU" />
          <LegalNavLink href="/legal/confidentialite" label="Confidentialité" />
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-6 py-10">
        <article className="legal-prose">{children}</article>

        <footer className="mt-16 pt-6 border-t border-white/[0.04] text-[12px] text-text-quaternary">
          Une question ?{" "}
          <a
            href="mailto:contact@autris.app"
            className="text-[var(--color-accent)] underline"
          >
            contact@autris.app
          </a>
        </footer>
      </main>
    </div>
  );
}

function LegalNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-text-tertiary hover:text-[var(--color-accent)] transition-colors no-underline"
    >
      {label}
    </Link>
  );
}
