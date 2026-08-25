"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { createClient } from "@/lib/supabase/client";
import { appConfirm } from "@/lib/app-confirm";
import { FloatingToolbar } from "@/components/editor/FloatingToolbar";
import { htmlToDocxBlob, downloadBlob } from "@/lib/docx-export";

export interface SynopsisDoc {
  id: string;
  title: string;
  content: string;
  position: number;
}

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "synopsis"
  );
}

/**
 * Onglet « Synopsis » de la planification.
 *
 * Un roman peut avoir plusieurs synopsis (ex. version courte + version
 * détaillée). Chaque synopsis est un sous-onglet ; on peut en ajouter,
 * dupliquer, renommer, supprimer. Éditeur de texte riche sans panneaux.
 */
export function SynopsisView({
  novelId,
  initialSynopses,
}: {
  novelId: string;
  initialSynopses: SynopsisDoc[];
}) {
  const supabaseRef = useRef(createClient());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [list, setList] = useState<SynopsisDoc[]>(initialSynopses);
  const [activeId, setActiveId] = useState<string>(initialSynopses[0]?.id ?? "");
  const activeIdRef = useRef<string>(activeId);
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);

  const [initialContent] = useState<string>(
    () => (initialSynopses[0]?.content ?? "").trim() || "<p></p>",
  );

  const active = list.find((s) => s.id === activeId) ?? null;

  const saveContent = useCallback(async (id: string, content: string) => {
    if (!id) return;
    setStatus("saving");
    try {
      await supabaseRef.current
        .from("synopses")
        .update({ content })
        .eq("id", id);
    } finally {
      setStatus("saved");
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    enableInputRules: false,
    enablePasteRules: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({
        placeholder: "Rédigez ici ce synopsis…",
        showOnlyWhenEditable: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tiptap",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      const id = activeIdRef.current;
      const html = editor.getHTML();
      setList((prev) =>
        prev.map((s) => (s.id === id ? { ...s, content: html } : s)),
      );
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveContent(id, html), 1500);
    },
  });

  /** Bascule de synopsis : on sauvegarde l'actuel avant de charger l'autre. */
  function switchTo(id: string) {
    if (!editor || id === activeIdRef.current) return;
    const curId = activeIdRef.current;
    const curHtml = editor.getHTML();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveContent(curId, curHtml);
    setList((prev) =>
      prev.map((s) => (s.id === curId ? { ...s, content: curHtml } : s)),
    );
    const target = list.find((s) => s.id === id);
    activeIdRef.current = id;
    setActiveId(id);
    setRenaming(false);
    editor.commands.setContent(target?.content || "<p></p>", {
      emitUpdate: false,
    });
  }

  async function addSynopsis(fromActive: boolean) {
    if (busy) return;
    setBusy(true);
    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    const pos = list.reduce((m, s) => Math.max(m, s.position), -1) + 1;
    const src = fromActive ? active : null;
    const { data } = await supabase
      .from("synopses")
      .insert({
        novel_id: novelId,
        user_id: user.id,
        title: src ? `${src.title} (copie)` : `Synopsis ${list.length + 1}`,
        content: src ? src.content : "",
        position: pos,
      })
      .select("id, title, content, position")
      .single();
    if (data && editor) {
      setList((prev) => [...prev, data as SynopsisDoc]);
      // bascule directe sans repasser par switchTo (le doc n'est pas
      // encore dans `list`).
      const curId = activeIdRef.current;
      const curHtml = editor.getHTML();
      saveContent(curId, curHtml);
      activeIdRef.current = (data as SynopsisDoc).id;
      setActiveId((data as SynopsisDoc).id);
      editor.commands.setContent((data as SynopsisDoc).content || "<p></p>", {
        emitUpdate: false,
      });
    }
    setBusy(false);
  }

  async function deleteActive() {
    if (list.length <= 1 || !active || !editor) return;
    if (!(await appConfirm(`Supprimer le synopsis « ${active.title} » ?`, { confirmLabel: "Supprimer" }))) return;
    const removedId = active.id;
    const remaining = list.filter((s) => s.id !== removedId);
    setList(remaining);
    const next = remaining[0];
    activeIdRef.current = next.id;
    setActiveId(next.id);
    editor.commands.setContent(next.content || "<p></p>", { emitUpdate: false });
    await supabaseRef.current.from("synopses").delete().eq("id", removedId);
  }

  /** Exporte le synopsis actif en document Word (.docx). */
  async function exportActive() {
    if (!editor || !active) return;
    const blob = await htmlToDocxBlob(editor.getHTML(), active.title || "Synopsis");
    downloadBlob(`${slugify(active.title || "synopsis")}.docx`, blob);
  }

  async function commitRename() {
    const title = renameValue.trim();
    setRenaming(false);
    if (!title || !active || title === active.title) return;
    const id = active.id;
    setList((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    await supabaseRef.current.from("synopses").update({ title }).eq("id", id);
  }

  return (
    <div className="editor-paper flex-1">
      {/* Sous-onglets de synopsis */}
      <div className="flex items-center gap-1 px-3 h-9 border-b border-white/[0.05] shrink-0 bg-bg-secondary/30 overflow-x-auto">
        {list.map((s) => {
          const isActive = s.id === activeId;
          if (isActive && renaming) {
            return (
              <input
                key={s.id}
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="h-6 px-2 text-[12px] rounded-[var(--radius-sm)] bg-bg-primary border border-[var(--color-accent-border)] text-text-primary focus:outline-none"
              />
            );
          }
          return (
            <button
              key={s.id}
              onClick={() => switchTo(s.id)}
              onDoubleClick={() => {
                if (isActive) {
                  setRenameValue(s.title);
                  setRenaming(true);
                }
              }}
              title={isActive ? "Double-clic pour renommer" : s.title}
              className={`h-6 px-2.5 rounded-[var(--radius-sm)] text-[12px] whitespace-nowrap cursor-pointer transition-colors ${
                isActive
                  ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent-border)]"
                  : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              {s.title}
            </button>
          );
        })}
        <button
          onClick={() => addSynopsis(false)}
          disabled={busy}
          title="Nouveau synopsis"
          className="h-6 w-6 shrink-0 rounded-[var(--radius-sm)] text-[14px] leading-none text-text-tertiary hover:text-[var(--color-accent)] hover:bg-white/[0.04] cursor-pointer transition-colors disabled:opacity-50"
        >
          +
        </button>

        <div className="ml-auto flex items-center gap-1 pl-2">
          <button
            onClick={exportActive}
            disabled={!active}
            title="Exporter ce synopsis en fichier texte"
            className="h-6 px-2 rounded-[var(--radius-sm)] text-[11px] text-text-tertiary hover:text-[var(--color-accent)] hover:bg-white/[0.04] cursor-pointer transition-colors disabled:opacity-50"
          >
            Exporter
          </button>
          <button
            onClick={() => addSynopsis(true)}
            disabled={busy || !active}
            title="Dupliquer ce synopsis"
            className="h-6 px-2 rounded-[var(--radius-sm)] text-[11px] text-text-tertiary hover:text-[var(--color-accent)] hover:bg-white/[0.04] cursor-pointer transition-colors disabled:opacity-50"
          >
            Dupliquer
          </button>
          <button
            onClick={deleteActive}
            disabled={list.length <= 1}
            title="Supprimer ce synopsis"
            className="h-6 px-2 rounded-[var(--radius-sm)] text-[11px] text-text-tertiary hover:text-[var(--color-danger,#e0556b)] hover:bg-white/[0.04] cursor-pointer transition-colors disabled:opacity-40"
          >
            Supprimer
          </button>
          <span
            className="text-[10.5px] px-1.5"
            style={{ color: status === "saving" ? "var(--accent)" : "var(--text-4)" }}
          >
            {status === "saving" ? "Sauvegarde…" : "Sauvegardé"}
          </span>
        </div>
      </div>

      {/* Conteneur positionné SOUS la barre d'onglets : la barre
          flottante s'y ancre et ne chevauche plus les sous-onglets. */}
      <div className="relative flex flex-col flex-1 min-h-0">
        <FloatingToolbar editor={editor} />

        <div className="editor-scroll">
          <div className="paper-sheet">
            <div className="paper-prose">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
