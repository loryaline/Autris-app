import Link from "next/link";

export default function LegalIndex() {
  const sections = [
    {
      href: "/legal/mentions",
      title: "Mentions légales",
      desc: "Édition, hébergement, gratuité et coordonnées de contact.",
    },
    {
      href: "/legal/cgu",
      title: "Conditions Générales d'Utilisation",
      desc: "Règles d'usage du service Autris.",
    },
    {
      href: "/legal/confidentialite",
      title: "Politique de confidentialité",
      desc: "Comment vos données sont collectées, traitées et protégées (nLPD + RGPD).",
    },
  ];

  return (
    <>
      <h1 className="text-[28px] mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Informations <span className="italic text-[var(--color-accent)]">légales</span>
      </h1>
      <p className="text-[14px] text-text-tertiary mb-8">
        Tout ce qu&apos;il faut savoir sur Autris, son fonctionnement et vos droits.
      </p>

      <ul className="flex flex-col gap-3">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block p-4 rounded-[var(--radius-md)] border border-white/[0.06] bg-bg-tertiary/40 hover:bg-bg-tertiary/70 hover:border-[var(--color-accent-border)] transition-colors no-underline"
            >
              <div className="text-[15px] text-text-primary font-medium">{s.title}</div>
              <div className="text-[12.5px] text-text-tertiary mt-1">{s.desc}</div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
