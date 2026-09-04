"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { appToast } from "@/lib/app-toast";
import type { Idea } from "@/types/database";

/**
 * Une idée, en plein écran.
 *
 * C'est ici qu'on écrit — pas dans un champ posé au-dessus d'une liste.
 * La différence n'est pas cosmétique : un champ dans une liste dit « note
 * une phrase et passe à autre chose », une page dit « écris ». Et surtout,
 * ouvrir une note c'est la MODIFIER : la question de savoir si une idée
 * est corrigeable ne se pose plus.
 *
 * Rien à valider. Le texte s'enregistre tout seul, et l'état d'écriture
 * est dit en haut à droite — comme dans l'éditeur de roman.
 */

const SAVE_DELAY = 700;

export function NoteEditor({
  idea,
  projects,
}: {
  /** null = note neuve, créée à la première frappe. */
  idea: Idea | null;
  projects: { id: string; title: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [body, setBody] = useState(idea?.body ?? "");
  const [projectId, setProjectId] = useState(idea?.project_id ?? null);
  const [archived, setArchived] = useState(!!idea?.archived_at);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Identifiant réel : une note neuve n'en a pas avant sa création.
  const idRef = useRef<string | null>(idea?.id ?? null);
  const bodyRef = useRef(body);

  // Le clavier s'ouvre tout de suite sur une note neuve : on est venu
  // pour écrire, pas pour regarder une page blanche.
  useEffect(() => {
    if (!idea) areaRef.current?.focus();
  }, [idea]);

  const persist = useCallback(
    async (text: string, project: string | null) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setState("saving");

      if (idRef.current) {
        const { error } = await supabase
          .from("ideas")
          .update({ body: text, project_id: project })
          .eq("id", idRef.current);
        if (error) {
          console.error(error);
          setState("idle");
          appToast("Cette note n'a pas pu être enregistrée.", { danger: true });
          return;
        }
      } else {
        // Création à la première frappe, pas à l'ouverture : une note
        // ouverte puis abandonnée ne doit rien laisser derrière elle.
        const { data, error } = await supabase
          .from("ideas")
          .insert({ user_id: userData.user.id, body: text, project_id: project })
          .select()
          .single();
        if (error || !data) {
          console.error(error);
          setState("idle");
          appToast("Cette note n'a pas pu être créée.", { danger: true });
          return;
        }
        idRef.current = (data as Idea).id;
        // L'adresse suit, pour que le retour arrière et un rechargement
        // retombent sur la note et non sur une page « nouvelle » vide.
        router.replace(`/idees/${idRef.current}`);
      }
      setState("saved");
    },
    [router, supabase],
  );

  function onChange(text: string) {
    setBody(text);
    bodyRef.current = text;
    if (timer.current) clearTimeout(timer.current);
    if (!text.trim() && !idRef.current) return;
    timer.current = setTimeout(() => persist(text, projectId), SAVE_DELAY);
  }

  // Enregistrement immédiat en quittant : sans ça, les dernières lettres
  // frappées juste avant le retour seraient perdues.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function leave() {
    if (timer.current) clearTimeout(timer.current);
    const text = bodyRef.current;
    if (text.trim() || idRef.current) {
      if (idRef.current) {
        await supabase
          .from("ideas")
          .update({ body: text, project_id: projectId })
          .eq("id", idRef.current);
      } else if (text.trim()) {
        await persist(text, projectId);
      }
    }
    router.push("/idees");
  }

  async function assign(next: string) {
    const value = next || null;
    setProjectId(value);
    if (idRef.current) {
      await supabase
        .from("ideas")
        .update({ project_id: value })
        .eq("id", idRef.current);
    }
  }

  async function toggleArchive() {
    if (!idRef.current) return;
    const next = archived ? null : new Date().toISOString();
    setArchived(!archived);
    const { error } = await supabase
      .from("ideas")
      .update({ archived_at: next })
      .eq("id", idRef.current);
    if (error) {
      console.error(error);
      setArchived(archived);
      appToast("Le rangement n'a pas pu être enregistré.", { danger: true });
      return;
    }
    if (next) router.push("/idees");
  }

  async function remove() {
    if (!idRef.current) {
      router.push("/idees");
      return;
    }
    const snapshot = {
      id: idRef.current,
      body: bodyRef.current,
      project_id: projectId,
      archived_at: archived ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from("ideas")
      .delete()
      .eq("id", idRef.current);
    if (error) {
      console.error(error);
      appToast("Cette note n'a pas pu être supprimée.", { danger: true });
      return;
    }
    router.push("/idees");
    appToast("Note supprimée.", {
      duration: 8000,
      action: {
        label: "Annuler",
        onClick: async () => {
          const { data: u } = await supabase.auth.getUser();
          if (!u.user) return;
          await supabase.from("ideas").insert({ ...snapshot, user_id: u.user.id });
          router.refresh();
        },
      },
    });
  }

  return (
    <div className="flex flex-col h-full">
      <header
        className="flex items-center gap-2 px-3 h-12 shrink-0"
        style={{ borderBottom: "1px solid var(--border-soft)" }}
      >
        <button
          onClick={leave}
          className="rd-icon-btn"
          title="Retour aux idées"
          aria-label="Retour aux idées"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <span
          className="text-[11px] flex-1"
          style={{ color: "var(--text-4)" }}
          aria-live="polite"
        >
          {state === "saving" ? "…" : state === "saved" ? "✓" : ""}
        </span>

        {projects.length > 0 && (
          <select
            value={projectId ?? ""}
            onChange={(e) => assign(e.target.value)}
            aria-label="Rattacher à un projet"
            className="h-8 px-2 rounded text-[12px] cursor-pointer max-w-[45vw]"
            style={{
              background: "transparent",
              border: "1px solid var(--border-soft)",
              color: projectId ? "var(--accent)" : "var(--text-3)",
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
          onClick={toggleArchive}
          className="rd-icon-btn"
          title={archived ? "Remettre à trier" : "Ranger"}
          aria-label={archived ? "Remettre à trier" : "Ranger"}
        >
          {archived ? "↩" : "✓"}
        </button>
        <button
          onClick={remove}
          className="rd-icon-btn"
          title="Supprimer"
          aria-label="Supprimer"
        >
          ✕
        </button>
      </header>

      {/* La note occupe tout ce qui reste. Pas de cadre, pas de carte :
          c'est une page qu'on écrit. */}
      <textarea
        ref={areaRef}
        value={body}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Une scène, un nom, une réplique…"
        className="flex-1 w-full px-4 py-4 text-[15px] leading-relaxed resize-none"
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-1)",
        }}
      />
    </div>
  );
}
