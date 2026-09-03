"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { appConfirm } from "@/lib/app-confirm";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const visible = useMemo(
    () =>
      ideas.filter(
        (i) =>
          !!i.archived_at === showArchived &&
          (!projectFilter || i.project_id === projectFilter),
      ),
    [ideas, showArchived, projectFilter],
  );

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

  async function remove(idea: Idea) {
    if (
      !(await appConfirm(
        "Supprimer cette idée définitivement ? L'archivage la garde sans " +
          "l'afficher.",
        { confirmLabel: "Supprimer" },
      ))
    ) {
      return;
    }
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    const { error } = await supabase.from("ideas").delete().eq("id", idea.id);
    if (error) {
      console.error(error);
      setIdeas((prev) => [idea, ...prev]);
      appToast("L'idée n'a pas pu être supprimée : elle est toujours là.", {
        danger: true,
      });
    }
  }

  const archivedCount = ideas.filter((i) => i.archived_at).length;

  return (
    <div className="max-w-[720px] mx-auto px-4 py-6 md:py-8">
      <h1
        className="font-serif text-[26px] md:text-[30px] mb-1"
        style={{ color: "var(--text-1)" }}
      >
        Idées
      </h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--text-3)" }}>
        Notez maintenant, triez plus tard. Une idée qu&apos;il faut classer
        avant de l&apos;écrire est une idée perdue.
      </p>

      {/* Capture */}
      <div className="mb-6">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée passe à la ligne : une idée tient
            // presque toujours sur une phrase.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              capture();
            }
          }}
          rows={3}
          placeholder="Une scène, un nom, une réplique, une question…"
          className="w-full text-[14px] px-3 py-2.5 rounded-[var(--radius-md)] resize-y"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-1)",
            minHeight: 84,
          }}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={capture}
            disabled={!draft.trim() || busy}
            className="h-9 px-4 rounded-[var(--radius-md)] text-[13px] font-medium cursor-pointer border-none disabled:opacity-40 disabled:cursor-default"
            style={{ background: "var(--accent)", color: "#1a1410" }}
          >
            {busy ? "Enregistrement…" : "Noter"}
          </button>
          <span className="text-[11px]" style={{ color: "var(--text-4)" }}>
            Entrée pour noter · Maj+Entrée pour une nouvelle ligne
          </span>
        </div>
      </div>

      {/* Filtres */}
      <div
        className="flex items-center gap-2 flex-wrap pb-3 mb-3"
        style={{ borderBottom: "1px solid var(--border-soft)" }}
      >
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-8 px-2 rounded text-[12px] cursor-pointer"
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

        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className="h-8 px-3 rounded text-[12px] cursor-pointer"
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
            className="h-8 px-3 rounded text-[12px] cursor-pointer"
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
              <p
                className="text-[14px] leading-snug m-0 whitespace-pre-wrap"
                style={{ color: "var(--text-1)" }}
              >
                {idea.body}
              </p>
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
