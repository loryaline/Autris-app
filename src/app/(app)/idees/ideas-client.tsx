"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { appToast } from "@/lib/app-toast";
import type { Idea } from "@/types/database";

/**
 * La boîte à idées — l'écran de LISTE.
 *
 * Deux écrans, pas un : ici on parcourt, on cherche, on range. Écrire se
 * fait ailleurs, en plein écran (voir NoteEditor). Un champ de saisie posé
 * au-dessus d'une liste est un formulaire web ; une liste plus un bouton
 * « + » qui ouvre une page, c'est ce que fait toute application de notes —
 * et ça règle au passage la question de la modification, puisque ouvrir
 * une note c'est l'éditer.
 *
 * Une seule action reste sur la ligne : ranger. C'est le geste répété de
 * cet écran — sa raison d'être est le tri — et ouvrir la note pour ça
 * demanderait trois gestes au lieu d'un. Tout le reste vit dans la note.
 */

function frenchDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `aujourd'hui à ${d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "hier";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function IdeasClient({
  initialIdeas,
  projects,
}: {
  initialIdeas: Idea[];
  projects: { id: string; title: string }[];
}) {
  const supabase = createClient();
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [showArchived, setShowArchived] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ideas.filter(
      (i) =>
        !!i.archived_at === showArchived &&
        (!projectFilter || i.project_id === projectFilter) &&
        (!q || i.body.toLowerCase().includes(q)),
    );
  }, [ideas, showArchived, projectFilter, query]);

  const projectName = (id: string | null) =>
    id ? (projects.find((p) => p.id === id)?.title ?? null) : null;

  async function toggleArchive(idea: Idea) {
    const next = idea.archived_at ? null : new Date().toISOString();
    setIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, archived_at: next } : i)),
    );
    const { error } = await supabase
      .from("ideas")
      .update({ archived_at: next })
      .eq("id", idea.id);
    if (error) {
      console.error(error);
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id ? { ...i, archived_at: idea.archived_at } : i,
        ),
      );
      appToast("Le rangement n'a pas pu être enregistré.", { danger: true });
      return;
    }
    if (next) {
      appToast("Idée rangée.", {
        action: {
          label: "Annuler",
          onClick: () => toggleArchive({ ...idea, archived_at: next }),
        },
      });
    }
  }

  const archivedCount = ideas.filter((i) => i.archived_at).length;
  const filtresActifs = !!query || !!projectFilter || showArchived;

  return (
    <div className="max-w-[720px] mx-auto px-4 py-4 md:py-8">
      <div className="flex items-center gap-2 mb-3">
        <h1
          className="font-serif text-[22px] md:text-[30px] flex-1 m-0"
          style={{ color: "var(--text-1)" }}
        >
          Idées
        </h1>
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          title="Chercher et trier"
          aria-label="Chercher et trier"
          className="rd-icon-btn"
          style={filtresActifs ? { color: "var(--accent)" } : undefined}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M10.2 10.2L14 14"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {showFilters && (
        <div
          className="flex flex-col gap-2 mb-3 pb-3"
          style={{ borderBottom: "1px solid var(--border-soft)" }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Rechercher dans vos idées…"
            aria-label="Rechercher dans vos idées"
            className="w-full h-10 sm:h-9 px-3 rounded-[var(--radius-md)] text-[13px]"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--text-1)",
            }}
          />
          <div className="flex items-center gap-2">
            {projects.length > 1 && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Filtrer par projet"
                className="h-9 sm:h-8 px-2 rounded text-[12px] cursor-pointer flex-1 min-w-0 sm:flex-none"
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--text-2)",
                }}
              >
                <option value="">Tous les projets</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
            <span className="flex items-center shrink-0 sm:ml-auto">
              <button
                onClick={() => setShowArchived(false)}
                className="h-9 sm:h-8 px-3 text-[12px] cursor-pointer rounded-l"
                style={{
                  background: !showArchived ? "var(--accent-bg)" : "transparent",
                  border: `1px solid ${!showArchived ? "var(--accent-border)" : "var(--border-soft)"}`,
                  color: !showArchived ? "var(--accent)" : "var(--text-3)",
                }}
              >
                À trier
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className="h-9 sm:h-8 px-3 text-[12px] cursor-pointer rounded-r border-l-0"
                style={{
                  background: showArchived ? "var(--accent-bg)" : "transparent",
                  border: `1px solid ${showArchived ? "var(--accent-border)" : "var(--border-soft)"}`,
                  color: showArchived ? "var(--accent)" : "var(--text-3)",
                }}
              >
                Rangées {archivedCount > 0 && `(${archivedCount})`}
              </button>
            </span>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[13.5px] m-0" style={{ color: "var(--text-4)" }}>
            {showArchived
              ? "Rien de rangé pour l'instant."
              : query || projectFilter
                ? "Aucune idée ne correspond."
                : "La boîte est vide."}
          </p>
          {!showArchived && !query && !projectFilter && (
            <Link
              href="/idees/nouvelle"
              className="inline-block mt-3 text-[13px]"
              style={{ color: "var(--accent)" }}
            >
              Écrire la première
            </Link>
          )}
        </div>
      ) : (
        <ul className="list-none p-0 m-0">
          {visible.map((idea) => (
            <li
              key={idea.id}
              style={{
                borderTop: "1px solid var(--border-soft)",
                opacity: idea.archived_at ? 0.55 : 1,
              }}
            >
              <div className="flex items-start gap-2">
                {/* La ligne entière ouvre la note : sur un écran tactile,
                    une cible de la largeur de la page ne se rate pas. */}
                <Link
                  href={`/idees/${idea.id}`}
                  className="flex-1 min-w-0 py-3 no-underline block"
                >
                  <span
                    className="text-[14px] leading-snug block"
                    style={{
                      color: "var(--text-1)",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {idea.body || "Note vide"}
                  </span>
                  <span
                    className="flex items-center gap-1.5 mt-1 text-[11px]"
                    style={{ color: "var(--text-4)" }}
                  >
                    <span>{frenchDate(idea.created_at)}</span>
                    {projectName(idea.project_id) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span style={{ color: "var(--accent)" }}>
                          {projectName(idea.project_id)}
                        </span>
                      </>
                    )}
                  </span>
                </Link>

                <button
                  onClick={() => toggleArchive(idea)}
                  title={idea.archived_at ? "Remettre à trier" : "Ranger"}
                  aria-label={idea.archived_at ? "Remettre à trier" : "Ranger"}
                  className="rd-icon-btn shrink-0 self-center"
                >
                  {idea.archived_at ? "↩" : "✓"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Écrire : un bouton, une page.
          Posé au-dessus de la barre de navigation du téléphone, sinon il
          se retrouverait dessous. */}
      <Link
        href="/idees/nouvelle"
        title="Écrire une idée"
        aria-label="Écrire une idée"
        className="fixed right-4 z-40 flex items-center justify-center rounded-full no-underline shadow-lg"
        style={{
          bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
          width: 56,
          height: 56,
          background: "var(--accent)",
          color: "#1a1410",
          fontSize: 26,
          lineHeight: 1,
        }}
      >
        +
      </Link>
    </div>
  );
}
