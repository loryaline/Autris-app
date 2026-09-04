"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useViewport } from "@/lib/useViewport";
import { appToast } from "@/lib/app-toast";
import type { Idea } from "@/types/database";

/**
 * La boîte à idées.
 *
 * Un champ, un bouton. Pas de titre, pas de catégorie, pas de projet
 * obligatoire : une idée qu'on doit classer avant de l'écrire est une
 * idée perdue. Tout le reste vient après, ou jamais.
 *
 * Volontairement sans conversion vers une fiche ou un chapitre : la
 * correspondance de champs ne pourrait être qu'approximative, et
 * produirait des fiches à moitié remplies. On relit son idée à côté de ce
 * qu'on écrit, et on décide soi-même.
 */

function frenchDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
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
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("");
  // Note dont les actions sont dépliées (téléphone uniquement).
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Notes dépliées : une idée longue est repliée par défaut.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { isPhone, isTablet, hasTouch } = useViewport();
  /* Téléphone ET tablette : à 834 px en portrait, une note ne peut pas
   * plus porter un menu déroulant et deux boutons de 44 px qu'à 375. Le
   * seuil utile n'est pas « petit écran » mais « écran où la ligne
   * d'actions ne tient pas ». */
  const compact = isPhone || isTablet;
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  async function capture() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusy(false);
      return;
    }
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        user_id: userData.user.id,
        body,
        // Le filtre courant sert de raccourci : si on regarde un projet,
        // l'idée y atterrit. Sinon elle n'appartient à rien, et c'est bien.
        project_id: projectFilter || null,
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      console.error(error);
      appToast(
        "L'idée n'a pas pu être enregistrée. Vérifiez votre connexion — le " +
          "texte est toujours dans le champ.",
        { danger: true },
      );
      return;
    }
    setIdeas((prev) => [data as Idea, ...prev]);
    setDraft("");
    inputRef.current?.focus();
  }

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
      // Remise en place : l'écran ne doit pas mentir sur ce qui est rangé.
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
        action: { label: "Annuler", onClick: () => toggleArchive({ ...idea, archived_at: next }) },
      });
    }
  }

  async function assign(idea: Idea, projectId: string) {
    const value = projectId || null;
    setIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, project_id: value } : i)),
    );
    const { error } = await supabase
      .from("ideas")
      .update({ project_id: value })
      .eq("id", idea.id);
    if (error) {
      console.error(error);
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id ? { ...i, project_id: idea.project_id } : i,
        ),
      );
      appToast("Le projet n'a pas pu être enregistré.", { danger: true });
    }
  }

  /**
   * Supprimer sans demander, mais en offrant de revenir.
   *
   * Une confirmation modale à chaque suppression, c'est un obstacle avant
   * chaque geste juste pour couvrir le geste rare qui était une erreur.
   * On supprime, on le dit, et on propose d'annuler — l'idée est alors
   * réinsérée avec son identifiant d'origine, donc rien n'est perdu.
   */
  async function remove(idea: Idea) {
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    const { error } = await supabase.from("ideas").delete().eq("id", idea.id);
    if (error) {
      console.error(error);
      setIdeas((prev) => [idea, ...prev]);
      appToast("L'idée n'a pas pu être supprimée : elle est toujours là.", {
        danger: true,
      });
      return;
    }
    appToast("Idée supprimée.", {
      duration: 8000,
      action: { label: "Annuler", onClick: () => restore(idea) },
    });
  }

  /** Réinsère une idée supprimée, avec son identifiant d'origine. */
  async function restore(idea: Idea) {
    setIdeas((prev) => [idea, ...prev]);
    const { error } = await supabase.from("ideas").insert({
      id: idea.id,
      user_id: idea.user_id,
      project_id: idea.project_id,
      body: idea.body,
      archived_at: idea.archived_at,
      created_at: idea.created_at,
    });
    if (error) {
      console.error(error);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      appToast("L'idée n'a pas pu être rétablie.", { danger: true });
    }
  }

  const archivedCount = ideas.filter((i) => i.archived_at).length;

  return (
    <div className="max-w-[720px] mx-auto px-4 py-6 md:py-8">
      <h1
        className="font-serif text-[22px] md:text-[30px] mb-2 md:mb-1"
        style={{ color: "var(--text-1)" }}
      >
        Idées
      </h1>
      {/* Une phrase d'intention se lit une fois. Sur un écran où l'on
          revient dix fois par jour pour noter en dix secondes, elle
          repousse la liste vers le bas à chaque visite. */}
      <p
        className="text-[13px] mb-6 hidden md:block"
        style={{ color: "var(--text-3)" }}
      >
        Notez maintenant, triez plus tard. Une idée qu&apos;il faut classer
        avant de l&apos;écrire est une idée perdue.
      </p>

      {/* Capture */}
      {/* Sur petit écran, la capture tient sur une ligne qui grandit avec
          le texte, et le bouton se met à côté. Un champ de trois lignes
          plus une rangée de bouton, c'était 140 px de mobilier avant la
          première note — sur une page dont l'objet EST la liste. */}
      <div className="mb-4 md:mb-6">
        <div className={compact ? "flex items-start gap-2" : ""}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (compact) {
              // Le champ épouse son contenu : une ligne au repos, autant
              // que nécessaire ensuite.
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }
          }}
          onKeyDown={(e) => {
            // Entrée n'envoie QU'AU CLAVIER physique.
            //
            // Un clavier de téléphone n'a pas de Maj+Entrée : envoyer sur
            // Entrée rendait toute idée de plus d'une ligne impossible à
            // écrire. Sur tactile, Entrée fait ce qu'elle dit — elle passe
            // à la ligne — et c'est le bouton qui envoie.
            if (!hasTouch && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              capture();
            }
          }}
          rows={compact ? 1 : 3}
          placeholder="Une scène, un nom, une réplique…"
          className="w-full text-[14px] px-3 py-2.5 rounded-[var(--radius-md)] resize-y"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-1)",
            minHeight: compact ? 44 : 84,
            resize: compact ? "none" : "vertical",
          }}
        />
        {/* En compact, le bouton se met à CÔTÉ du champ : seul sur sa
            rangée, il coûtait 50 px de haut pour un mot de cinq lettres,
            sur une page dont l'objet est la liste en dessous. */}
        {compact && (
          <button
            onClick={capture}
            disabled={!draft.trim() || busy}
            aria-label="Noter cette idée"
            className="shrink-0 rounded-[var(--radius-md)] text-[13px] font-medium cursor-pointer border-none disabled:opacity-40 disabled:cursor-default"
            style={{
              background: "var(--accent)",
              color: "#1a1410",
              minWidth: 62,
              height: 44,
            }}
          >
            {busy ? "…" : "Noter"}
          </button>
        )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {!compact && (
          <button
            onClick={capture}
            disabled={!draft.trim() || busy}
            className="h-9 px-4 rounded-[var(--radius-md)] text-[13px] font-medium cursor-pointer border-none disabled:opacity-40 disabled:cursor-default"
            style={{ background: "var(--accent)", color: "#1a1410" }}
          >
            {busy ? "Enregistrement…" : "Noter"}
          </button>
          )}
          {!hasTouch && (
            <span className="text-[11px]" style={{ color: "var(--text-4)" }}>
              Entrée pour noter · Maj+Entrée pour une nouvelle ligne
            </span>
          )}
        </div>
      </div>

      {/* Filtres */}
      {/* La recherche n'apparaît qu'une fois la boîte assez pleine pour
          qu'on s'y perde : en dessous, elle ne ferait qu'occuper une
          rangée au-dessus d'une liste qu'on lit d'un coup d'œil. */}
      {ideas.length > 8 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Rechercher dans vos idées…"
          aria-label="Rechercher dans vos idées"
          className="w-full h-10 sm:h-9 px-3 mb-2 rounded-[var(--radius-md)] text-[13px]"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-1)",
          }}
        />
      )}

      {/* Deux rangées sur téléphone plutôt qu'une seule qui déborde : le
          menu des projets prend toute la largeur, les deux états se
          partagent la suivante. `ml-auto` poussait tout à droite jusqu'à
          renvoyer les boutons à la ligne en escalier. */}
      <div
        className="flex items-center gap-2 pb-3 mb-3"
        style={{ borderBottom: "1px solid var(--border-soft)" }}
      >
        {/* Filtrer n'a de sens qu'à partir de deux projets. En dessous,
            ce menu occupait une rangée entière pour ne rien trier. */}
        {projects.length > 1 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Filtrer par projet"
            className="h-9 sm:h-8 px-2 rounded text-[12px] cursor-pointer flex-1 min-w-0 sm:flex-none sm:w-auto"
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

        {/* Segmenté : deux états qui s'excluent se lisent mieux collés
            qu'espacés, et la paire tient dans la largeur restante. */}
        <span className="flex items-center sm:gap-2 sm:ml-auto shrink-0">
          <button
            onClick={() => setShowArchived(false)}
            className="h-9 sm:h-8 px-3 text-[12px] cursor-pointer rounded-l sm:rounded"
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
            className="h-9 sm:h-8 px-3 text-[12px] cursor-pointer rounded-r sm:rounded border-l-0 sm:border-l"
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

      {/* Liste */}
      {visible.length === 0 ? (
        <p
          className="text-[13px] py-10 text-center"
          style={{ color: "var(--text-4)" }}
        >
          {showArchived
            ? "Rien de rangé pour l'instant."
            : projectFilter
              ? "Aucune idée pour ce projet. Le champ ci-dessus en note une."
              : "La boîte est vide. Le champ ci-dessus attend votre première idée."}
        </p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {visible.map((idea) => (
            <li
              key={idea.id}
              className="rounded-[var(--radius-md)] px-3 py-2.5"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-soft)",
                opacity: idea.archived_at ? 0.6 : 1,
              }}
            >
              {/* Repliée à six lignes.
                  Une idée de vingt lignes prenait tout l'écran et cachait
                  les suivantes — or la valeur de cette page est de voir
                  d'un coup ce qu'on a noté. Le repli est une lecture, pas
                  une troncature : rien n'est perdu, tout se déplie. */}
              <p
                className="text-[14px] leading-snug m-0 whitespace-pre-wrap"
                style={{
                  color: "var(--text-1)",
                  ...(expanded.has(idea.id)
                    ? {}
                    : {
                        display: "-webkit-box",
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }),
                }}
              >
                {idea.body}
              </p>
              {idea.body.length > 260 && (
                <button
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(idea.id)) next.delete(idea.id);
                      else next.add(idea.id);
                      return next;
                    })
                  }
                  className="mt-1 text-[12px] cursor-pointer bg-transparent border-none p-0"
                  style={{ color: "var(--accent)" }}
                >
                  {expanded.has(idea.id) ? "Replier" : "Lire la suite"}
                </button>
              )}
              {/* Pied de note.
                  Sur téléphone, il ne porte QUE ce qui se lit : la date et
                  le projet. Les actions — rattacher, ranger, supprimer —
                  passent derrière un bouton unique qui les déplie sur
                  place. Les poser toutes sur cette ligne demandait, à
                  44 px la cible tactile, plus de largeur qu'un téléphone
                  n'en a : elles repartaient à la ligne en escalier, et le
                  menu des projets répétait la pastille juste à côté. */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px]" style={{ color: "var(--text-4)" }}>
                  {frenchDate(idea.created_at)}
                </span>
                {projectName(idea.project_id) && (
                  <span
                    className="text-[10.5px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--accent-bg)",
                      color: "var(--accent)",
                    }}
                  >
                    {projectName(idea.project_id)}
                  </span>
                )}

                {compact ? (
                  <button
                    onClick={() =>
                      setOpenActions((cur) => (cur === idea.id ? null : idea.id))
                    }
                    aria-expanded={openActions === idea.id}
                    title="Actions"
                    aria-label="Actions sur cette idée"
                    className="ml-auto rd-icon-btn"
                  >
                    ⋯
                  </button>
                ) : (
                  <span className="ml-auto flex items-center gap-1">
                    {projects.length > 0 && (
                      <select
                        value={idea.project_id ?? ""}
                        onChange={(e) => assign(idea, e.target.value)}
                        title="Rattacher à un projet"
                        aria-label="Rattacher à un projet"
                        className="h-7 px-1.5 rounded text-[11px] cursor-pointer"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border-soft)",
                          color: "var(--text-3)",
                        }}
                      >
                        <option value="">Sans projet</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => toggleArchive(idea)}
                      title={idea.archived_at ? "Remettre à trier" : "Ranger"}
                      aria-label={idea.archived_at ? "Remettre à trier" : "Ranger"}
                      className="rd-icon-btn"
                    >
                      {idea.archived_at ? "↩" : "✓"}
                    </button>
                    <button
                      onClick={() => remove(idea)}
                      title="Supprimer définitivement"
                      aria-label="Supprimer définitivement"
                      className="rd-icon-btn"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              {/* Actions dépliées — téléphone. Des libellés, pas des
                  glyphes : une coche seule ne dit pas ce qu'elle range. */}
              {compact && openActions === idea.id && (
                <div
                  className="mt-2.5 pt-2.5 flex flex-col gap-2"
                  style={{ borderTop: "1px solid var(--border-soft)" }}
                >
                  {projects.length > 0 && (
                    <select
                      value={idea.project_id ?? ""}
                      onChange={(e) => assign(idea, e.target.value)}
                      aria-label="Rattacher à un projet"
                      className="h-10 px-2 rounded text-[13px] w-full cursor-pointer"
                      style={{
                        background: "var(--bg-3)",
                        border: "1px solid var(--border-soft)",
                        color: "var(--text-2)",
                      }}
                    >
                      <option value="">Sans projet</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        toggleArchive(idea);
                        setOpenActions(null);
                      }}
                      className="flex-1 h-10 rounded text-[13px] cursor-pointer"
                      style={{
                        background: "var(--bg-3)",
                        border: "1px solid var(--border-soft)",
                        color: "var(--text-2)",
                      }}
                    >
                      {idea.archived_at ? "Remettre à trier" : "Ranger"}
                    </button>
                    <button
                      onClick={() => {
                        remove(idea);
                        setOpenActions(null);
                      }}
                      className="h-10 px-4 rounded text-[13px] cursor-pointer"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-soft)",
                        color: "var(--danger, #e05555)",
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
