"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useViewport } from "@/lib/useViewport";

/**
 * Navigation du téléphone : une barre fixe en bas, pas un tiroir.
 *
 * Autris n'a que quelques destinations en mobilité. Les cacher derrière
 * un tiroir mettrait chacune à deux gestes au lieu d'un, sur la surface
 * dont la raison d'être est justement de saisir vite. Une barre basse
 * reste visible, et tombe sous le pouce.
 *
 * `safe-area-inset-bottom` tient compte de la barre d'accueil des iPhone
 * récents : sans elle, le dernier onglet passe sous le trait.
 *
 * La barre latérale, elle, ne s'affiche plus du tout sous 768 px — elle
 * fait 240 px fixes, il n'en resterait pas assez pour lire.
 */


const IconPen = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M13.2 3.8l3 3L7.5 15.5 3.5 16.5l1-4 8.7-8.7z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconBulb = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M7 12.5a4.5 4.5 0 1 1 6 0c-.6.6-.9 1.2-1 2H8c-.1-.8-.4-1.4-1-2z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M8.3 17h3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const IconStack = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 3l7 3.5-7 3.5-7-3.5L10 3zM3 10l7 3.5L17 10M3 13.5L10 17l7-3.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function BottomNav({ activeNovelId }: { activeNovelId: string | null }) {
  const pathname = usePathname();
  const { isPhone } = useViewport();

  if (!isPhone) return null;
  // Les surfaces d'écriture occupent tout l'écran : une barre de
  // navigation par-dessus volerait de la place au texte, qui est la
  // raison d'être de ces écrans. On en sort par leur propre retour.
  if (pathname.startsWith("/editor/")) return null;
  if (/^\/idees\/.+/.test(pathname)) return null;

  // Trois destinations, dans l'ordre de ce qu'on fait en mobilité : on
  // note d'abord — c'est la raison d'être de cette surface — on écrit
  // ensuite, et on retrouve ses projets si besoin.
  const items = [
    {
      href: "/idees",
      label: "Idées",
      icon: <IconBulb />,
      active: pathname.startsWith("/idees"),
    },
    {
      href: activeNovelId ? `/editor/${activeNovelId}` : "/",
      label: "Écrire",
      icon: <IconPen />,
      active: pathname.startsWith("/editor/"),
      disabled: !activeNovelId,
    },
    {
      href: "/",
      label: "Projets",
      icon: <IconStack />,
      active: pathname === "/" || pathname.startsWith("/project/"),
    },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 flex"
      style={{
        background: "var(--bg-2)",
        borderTop: "1px solid var(--border-soft)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map((it) =>
        it.disabled ? (
          <span
            key={it.label}
            aria-disabled="true"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] opacity-40"
            style={{ color: "var(--text-3)", minHeight: 56 }}
          >
            {it.icon}
            {it.label}
          </span>
        ) : (
          <Link
            key={it.label}
            href={it.href}
            aria-current={it.active ? "page" : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] no-underline"
            style={{
              color: it.active ? "var(--accent)" : "var(--text-3)",
              minHeight: 56,
            }}
          >
            {it.icon}
            {it.label}
          </Link>
        ),
      )}
    </nav>
  );
}
