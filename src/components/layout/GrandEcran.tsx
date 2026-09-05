"use client";

import Link from "next/link";

/**
 * Ce qu'on affiche là où un écran de téléphone ne suffit pas.
 *
 * Certaines vues d'Autris ne se réduisent pas : le plateau demande de la
 * place et une visée fine, le chapitrage est une grille de colonnes larges
 * à sélection multiple. Les rétrécir n'en ferait pas des versions mobiles,
 * seulement des versions inutilisables portant le même nom.
 *
 * Alors on le dit. Un écran qui explique ce qu'il est et où le retrouver
 * vaut mieux qu'une interface qu'on ne peut pas manœuvrer — et il évite
 * surtout de laisser croire à une panne.
 */
export function GrandEcran({
  titre,
  raison,
  ailleurs,
}: {
  /** Le nom de la vue, tel qu'il apparaît dans l'application. */
  titre: string;
  /** Pourquoi elle ne tient pas — pas une excuse, une explication. */
  raison: string;
  /** Ce qu'on peut faire ici, à la place. */
  ailleurs?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20 min-h-[60vh]">
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ color: "var(--text-4)" }}
      >
        <rect
          x="2"
          y="4"
          width="20"
          height="13"
          rx="1.6"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M8.5 20h7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>

      <h1
        className="font-serif text-[22px] mt-4 mb-2"
        style={{ color: "var(--text-1)" }}
      >
        {titre}
      </h1>
      <p
        className="text-[15px] leading-relaxed m-0 max-w-[34ch]"
        style={{ color: "var(--text-3)" }}
      >
        {raison}
      </p>

      {ailleurs && <div className="mt-5">{ailleurs}</div>}

      <Link
        href="/idees"
        className="mt-7 text-[15px]"
        style={{ color: "var(--accent)" }}
      >
        Revenir aux idées
      </Link>
    </div>
  );
}
