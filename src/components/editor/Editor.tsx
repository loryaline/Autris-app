"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { createClient } from "@/lib/supabase/client";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import { StructurePanel } from "./StructurePanel";
import { ContextPanel } from "./ContextPanel";
import { Pomodoro } from "./Pomodoro";

interface ChapterData {
  id: string;
  title: string;
  content: string;
  word_count: number;
  position: number;
  status: string;
  synopsis: string | null;
}

interface WbEntryLite {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  subcategory: string | null;
  main_image_url: string | null;
  status: string;
}

interface EditorProps {
  novelId: string;
  projectId: string;
  novelTitle: string;
  projectTitle: string;
  chapters: ChapterData[];
  initialChapterId: string | null;
  wordGoal: number | null;
  wbEntries: WbEntryLite[];
  pomoDuration: number;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function NovelEditor({
  novelId,
  projectId,
  novelTitle,
  projectTitle,
  chapters,
  initialChapterId,
  wordGoal,
  wbEntries,
  pomoDuration,
}: EditorProps) {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(initialChapterId);
  const activeChapterIdRef = useRef<string | null>(initialChapterId);
  useEffect(() => {
    activeChapterIdRef.current = activeChapterId;
  }, [activeChapterId]);
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "offline" | "error">("saved");
  const [focusMode, setFocusMode] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftWidth, setLeftWidth] = useState(155);
  const [rightWidth, setRightWidth] = useState(320);
  const [localChapters, setLocalChapters] = useState(chapters);
  const [, setTick] = useState(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce du setState React pour ne pas perturber la composition iOS
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<{ html: string; words: number } | null>(null);
  const supabaseRef = useRef(createClient());

  // Contenu initial figé une fois pour toutes — pas recalculé à chaque
  // render. Évite que useEditor ré-instancie l'éditeur (cause d'écrasement
  // de lettres pendant la composition iOS Safari). Fallback <p></p>
  // explicite pour donner à ProseMirror un doc valide non-vide à l'init.
  const initialContentRef = useRef<string>(
    chapters.find((c) => c.id === initialChapterId)?.content?.trim() || "<p></p>"
  );

  const activeChapter = localChapters.find((c) => c.id === activeChapterId);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Commencez à écrire votre histoire…",
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      CharacterCount,
      Typography,
    ],
    // Contenu initial figé via useRef — ne change plus à chaque render,
    // donc useEditor ne ré-instancie pas l'éditeur sous nous.
    content: initialContentRef.current,
    editorProps: {
      attributes: {
        class: "tiptap",
        // Désactive l'auto-correct / clavier prédictif iOS qui peut
        // perturber les events de composition de TipTap.
        autocorrect: "off",
        autocapitalize: "off",
        autocomplete: "off",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      const currentId = activeChapterIdRef.current;
      if (!currentId) return;

      const html = editor.getHTML();
      const text = editor.getText();
      const words = countWords(text);

      // Sur iOS Safari, mettre à jour le state React sur chaque frappe
      // perturbe la composition du clavier prédictif (lettres écrasées).
      // On débounce le setLocalChapters de 250ms pour laisser TipTap
      // gérer ses transactions sans interférence React. Le content est
      // toujours sauvegardé dans le ref pour les autres handlers.
      latestContentRef.current = { html, words };

      setSyncStatus("saving");
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        setLocalChapters((prev) =>
          prev.map((c) =>
            c.id === currentId
              ? { ...c, content: html, word_count: words }
              : c
          )
        );
      }, 250);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveChapter(currentId, html, words);
      }, 2000);
    },
    onSelectionUpdate: () => {
      // Debounce léger pour éviter de spammer setTick à chaque tap
      if (selectionTimeoutRef.current) return;
      selectionTimeoutRef.current = setTimeout(() => {
        selectionTimeoutRef.current = null;
        setTick((t) => t + 1);
      }, 100);
    },
    // onTransaction RETIRÉ : il déclenchait un setState à chaque frappe,
    // ce qui causait sur iOS Safari l'écrasement de la lettre en cours
    // d'écriture par la suivante.
  });

  // Snapshot du contenu courant dans chapter_versions
  // kind: "auto" → +0.0.1, "manual" → +0.1.1, "status" → +1.0.0
  const createSnapshot = useCallback(
    async (
      chapterId: string,
      content: string,
      wordCount: number,
      kind: "auto" | "manual" | "status",
      name?: string
    ) => {
      if (!content || content === "<p></p>") return;
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Dedupe + fetch version précédente
      const { data: previous } = await supabase
        .from("chapter_versions")
        .select("content, version")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Dedupe : uniquement pour les auto-save (changement de chapitre).
      // Les versions manuelles et les changements de statut sont toujours créées.
      if (kind === "auto" && previous && previous.content === content) return;

      // Calcul du prochain numéro de version
      const parse = (v: string | null | undefined): [number, number, number] => {
        if (!v) return [0, 0, 0];
        const parts = v.split(".").map((n) => parseInt(n, 10));
        return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
      };
      const [maj, min, pat] = parse(previous?.version);
      const next: [number, number, number] =
        kind === "auto"
          ? [maj, min, pat + 1]
          : kind === "manual"
            ? [maj, min + 1, pat + 1]
            : [maj + 1, 0, 0];
      const nextVersion = next.join(".");

      const label =
        kind === "auto"
          ? "Auto"
          : kind === "manual"
            ? "Manuelle"
            : "Changement de statut";

      await supabase.from("chapter_versions").insert({
        chapter_id: chapterId,
        user_id: user.id,
        content,
        word_count: wordCount,
        label,
        version: nextVersion,
        name: name?.trim() || null,
      });
    },
    []
  );

  const saveChapter = useCallback(
    async (chapterId: string, content: string, wordCount: number) => {
      try {
        const { error } = await supabaseRef.current
          .from("chapters")
          .update({ content, word_count: wordCount, updated_at: new Date().toISOString() })
          .eq("id", chapterId);
        setSyncStatus(error ? "error" : "saved");
      } catch {
        setSyncStatus("error");
      }
    },
    []
  );

  function handleChapterSelect(chapterId: string) {
    if (activeChapterId && editor) {
      const html = editor.getHTML();
      const words = countWords(editor.getText());
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveChapter(activeChapterId, html, words);
      }
      // Snapshot auto en quittant le chapitre (dedupe si inchangé)
      createSnapshot(activeChapterId, html, words, "auto");
    }
    const chapter = localChapters.find((c) => c.id === chapterId);
    if (chapter && editor) {
      activeChapterIdRef.current = chapterId;
      setActiveChapterId(chapterId);
      editor.commands.setContent(chapter.content || "", { emitUpdate: false });
      setSyncStatus("saved");
    }
  }

  function handleRestoreVersion(content: string, wordCount: number) {
    if (!activeChapterId || !editor) return;
    // Snapshot pré-restauration pour pouvoir revenir en arrière
    const currentHtml = editor.getHTML();
    const currentWords = countWords(editor.getText());
    createSnapshot(activeChapterId, currentHtml, currentWords, "auto");
    editor.commands.setContent(content, { emitUpdate: false });
    setLocalChapters((prev) =>
      prev.map((c) =>
        c.id === activeChapterId ? { ...c, content, word_count: wordCount } : c
      )
    );
    saveChapter(activeChapterId, content, wordCount);
  }

  function handleManualSnapshot(name?: string) {
    if (!activeChapterId || !editor) return;
    const html = editor.getHTML();
    const words = countWords(editor.getText());
    createSnapshot(activeChapterId, html, words, "manual", name);
  }

  async function handleAddChapter() {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const maxPosition = localChapters.reduce((max, c) => Math.max(max, c.position), -1);
    const newPosition = maxPosition + 1;
    const newTitle = `Chapitre ${localChapters.length + 1}`;

    const { data, error } = await supabase
      .from("chapters")
      .insert({
        novel_id: novelId,
        user_id: user.id,
        title: newTitle,
        position: newPosition,
        status: "a_ecrire",
        content: "",
        word_count: 0,
      })
      .select("id, title, content, word_count, position, status, synopsis")
      .single();

    if (error || !data) return;
    setLocalChapters((prev) => [...prev, data]);
    handleChapterSelect(data.id);
  }

  async function handleRenameChapter(chapterId: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setLocalChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, title: trimmed } : c))
    );

    await supabaseRef.current
      .from("chapters")
      .update({ title: trimmed })
      .eq("id", chapterId);
  }

  async function handleDeleteChapter(chapterId: string) {
    if (localChapters.length <= 1) return;

    const { error } = await supabaseRef.current
      .from("chapters")
      .delete()
      .eq("id", chapterId);

    if (error) return;

    const remaining = localChapters.filter((c) => c.id !== chapterId);
    setLocalChapters(remaining);

    if (activeChapterId === chapterId) {
      const sorted = [...remaining].sort((a, b) => a.position - b.position);
      const next = sorted[0];
      if (next && editor) {
        activeChapterIdRef.current = next.id;
        setActiveChapterId(next.id);
        editor.commands.setContent(next.content || "", { emitUpdate: false });
      } else {
        activeChapterIdRef.current = null;
        setActiveChapterId(null);
      }
    }
  }

  const STATUS_ORDER = ["a_ecrire", "premier_jet", "revision", "reecriture", "correction", "termine"];

  async function handleStatusChange(chapterId: string) {
    const chapter = localChapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const currentIdx = STATUS_ORDER.indexOf(chapter.status);
    const nextIdx = (currentIdx + 1) % STATUS_ORDER.length;
    const nextStatus = STATUS_ORDER[nextIdx];

    // Snapshot +1.0.0 si passage à un statut supérieur (pas au rollover termine→a_ecrire)
    if (nextIdx > currentIdx && editor && chapterId === activeChapterId) {
      const html = editor.getHTML();
      const words = countWords(editor.getText());
      createSnapshot(chapterId, html, words, "status");
    }

    setLocalChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, status: nextStatus } : c))
    );

    await supabaseRef.current
      .from("chapters")
      .update({ status: nextStatus })
      .eq("id", chapterId);
  }

  async function handleMoveChapter(chapterId: string, toIndex: number) {
    const sorted = [...localChapters].sort((a, b) => a.position - b.position);
    const fromIndex = sorted.findIndex((c) => c.id === chapterId);
    if (fromIndex < 0 || fromIndex === toIndex) return;

    // Reorder array
    const item = sorted[fromIndex];
    sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, item);

    // Reassign positions
    const updated = sorted.map((c, i) => ({ ...c, position: i }));
    setLocalChapters(updated);

    const supabase = supabaseRef.current;
    await Promise.all(
      updated.map((c) =>
        supabase.from("chapters").update({ position: c.position }).eq("id", c.id)
      )
    );
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Resize handlers
  const handleResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev: MouseEvent) => setLeftWidth(Math.max(100, Math.min(300, startW + ev.clientX - startX)));
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [leftWidth]);

  const handleResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev: MouseEvent) => setRightWidth(Math.max(290, Math.min(640, startW - (ev.clientX - startX))));
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [rightWidth]);

  const totalWords = localChapters.reduce((sum, c) => sum + c.word_count, 0);

  const editorText = editor ? editor.getText() : "";
  const paragraphCount = editorText
    ? editorText.split(/\n\n+/).filter((p) => p.trim()).length
    : 0;
  const charCount = editor
    ? editor.storage.characterCount.characters()
    : 0;
  const charCountNoSpaces = editorText.replace(/\s/g, "").length;

  const canNavigateHome = syncStatus === "saved";

  // Status → couleur pastille affichée dans le fil d'Ariane
  const STATUS_BADGE: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
    a_ecrire:    { label: "À écrire",    dot: "#7a7163", text: "#a89e8d", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" },
    premier_jet: { label: "Premier jet", dot: "#7B6FDE", text: "#b5acef", bg: "rgba(123,111,222,0.10)", border: "rgba(123,111,222,0.28)" },
    revision:    { label: "Révision",    dot: "#EF9F27", text: "#f0b254", bg: "rgba(239,159,39,0.10)",   border: "rgba(239,159,39,0.28)" },
    reecriture:  { label: "Réécriture",  dot: "#e4b48c", text: "#eec19b", bg: "rgba(228,180,140,0.10)",  border: "rgba(228,180,140,0.28)" },
    correction:  { label: "Correction",  dot: "#5DCAA5", text: "#7ed8b7", bg: "rgba(93,202,165,0.10)",   border: "rgba(93,202,165,0.28)" },
    termine:     { label: "Terminé",     dot: "#1D9E75", text: "#5cc2a0", bg: "rgba(29,158,117,0.10)",   border: "rgba(29,158,117,0.28)" },
  };
  const statusBadge = STATUS_BADGE[activeChapter?.status ?? "a_ecrire"] ?? STATUS_BADGE.a_ecrire;

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb top bar */}
      {!focusMode ? (
        <div className="h-10 bg-bg-primary border-b border-white/[0.04] flex items-center px-4 gap-2 shrink-0">
          <Link
            href="/"
            onClick={(e) => { if (!canNavigateHome) e.preventDefault(); }}
            title={canNavigateHome ? "Retour à l'accueil" : "Sauvegarde en cours…"}
            className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
              canNavigateHome
                ? "text-text-tertiary hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)] cursor-pointer"
                : "text-text-quaternary cursor-not-allowed opacity-50 pointer-events-none"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l4-4 4 4M3 5.5V10h2.5V7.5h1V10H9V5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link href="/" className={`text-[12.5px] no-underline ${canNavigateHome ? "text-text-tertiary hover:text-[var(--color-accent)]" : "text-text-quaternary pointer-events-none"}`}>
            {projectTitle}
          </Link>
          <span className="mx-1 text-text-quaternary/60 text-[11px]">/</span>
          <span className="text-[12.5px] text-text-tertiary">{novelTitle}</span>
          {activeChapter && (
            <>
              <span className="mx-1 text-text-quaternary/60 text-[11px]">/</span>
              <span className="text-[12.5px] text-text-primary font-medium">
                {activeChapter.title}
              </span>
              <button
                onClick={() => activeChapterId && handleStatusChange(activeChapterId)}
                title="Cliquer pour changer le statut"
                className="ml-2 inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full cursor-pointer transition-colors"
                style={{ background: statusBadge.bg, border: `1px solid ${statusBadge.border}`, color: statusBadge.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusBadge.dot }} />
                <span className="text-[11px] font-medium">{statusBadge.label}</span>
              </button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Pomodoro defaultDuration={pomoDuration} />
            <span className="w-px h-4 bg-white/[0.08]" />
            {syncStatus === "saved" && (
              <span className="text-[11px] font-medium text-teal-dark bg-teal-bg px-1.5 py-0.5 rounded">sauvegardé</span>
            )}
            {syncStatus === "saving" && (
              <span className="text-[11px] font-medium text-primary bg-primary-bg px-1.5 py-0.5 rounded">sauvegarde…</span>
            )}
            <button
              onClick={() => setFocusMode(true)}
              className="text-[12px] text-primary border border-primary-border rounded-[var(--radius-sm)] px-1.5 py-0.5 bg-transparent cursor-pointer hover:bg-primary-bg transition-colors"
            >
              ⤢ Focus
            </button>
          </div>
        </div>
      ) : (
        <div className="h-9 bg-bg-primary border-b border-border flex items-center px-3 shrink-0">
          <span className="text-[13px] text-text-tertiary">{novelTitle}</span>
          {activeChapter && (
            <>
              <span className="text-[12px] text-border mx-1.5">/</span>
              <span className="text-[13px] font-medium text-text-primary">
                {activeChapter.title}
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Pomodoro defaultDuration={pomoDuration} />
            <span className="w-px h-4 bg-white/[0.08]" />
            {syncStatus === "saved" && (
              <span className="text-[11px] font-medium text-teal-dark bg-teal-bg px-1.5 py-0.5 rounded">sauvegardé</span>
            )}
            {syncStatus === "saving" && (
              <span className="text-[11px] font-medium text-primary bg-primary-bg px-1.5 py-0.5 rounded">sauvegarde…</span>
            )}
            <button
              onClick={() => setFocusMode(false)}
              className="text-[12px] text-primary border border-primary-border rounded-[var(--radius-sm)] px-1.5 py-0.5 bg-transparent cursor-pointer hover:bg-primary-bg transition-colors"
            >
              ↙ Quitter
            </button>
          </div>
        </div>
      )}

      {/* Toolbar — always visible */}
      <Toolbar
        editor={editor}
        wordCount={activeChapter?.word_count ?? 0}
        totalChars={charCount}
        totalCharsNoSpaces={charCountNoSpaces}
        paragraphCount={paragraphCount}
        onToggleLeft={() => setShowLeftPanel(!showLeftPanel)}
        onToggleRight={() => setShowRightPanel(!showRightPanel)}
        hidePanelToggles={focusMode}
      />

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Structure panel — hidden in focus mode */}
        {!focusMode && showLeftPanel && (
          <>
            <div style={{ width: leftWidth }} className="shrink-0">
              <StructurePanel
                novelTitle={novelTitle}
                chapters={localChapters}
                activeChapterId={activeChapterId}
                onChapterSelect={handleChapterSelect}
                onAddChapter={handleAddChapter}
                onRenameChapter={handleRenameChapter}
                onDeleteChapter={handleDeleteChapter}
                onMoveChapter={handleMoveChapter}
              />
            </div>
            <div
              onMouseDown={handleResizeLeft}
              className="w-1 cursor-col-resize hover:bg-primary-border/30 transition-colors shrink-0"
            />
          </>
        )}

        {/* Editor area — feuille blanche pleine hauteur */}
        <div
          className="flex-1 overflow-y-auto flex justify-center items-start"
          style={{ background: "var(--color-bg-primary)" }}
        >
          <div
            className="w-full chapter-card"
            style={{
              maxWidth: "760px",
              margin: "24px 0 24px",
              padding: "48px 64px 72px",
            }}
          >
            {activeChapter ? (
              <div className="chapter-prose">
                <EditorContent editor={editor} />
              </div>
            ) : (
              <div className="text-center mt-20" style={{ fontFamily: "var(--font-sans)" }}>
                <div className="text-text-tertiary text-[14px] mb-3 italic" style={{ fontFamily: "var(--font-serif)" }}>
                  {localChapters.length === 0
                    ? "La page est blanche. À votre plume."
                    : "Choisissez un chapitre pour reprendre l'écriture."}
                </div>
                {localChapters.length === 0 && (
                  <button
                    onClick={handleAddChapter}
                    className="text-[13px] text-primary border border-primary-border rounded-[var(--radius-sm)] px-3 py-1.5 bg-transparent cursor-pointer hover:bg-primary-bg transition-colors"
                  >
                    + Créer un chapitre
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Context panel — hidden in focus mode */}
        {!focusMode && showRightPanel && (
          <>
            <div
              onMouseDown={handleResizeRight}
              className="w-1 cursor-col-resize hover:bg-primary-border/30 transition-colors shrink-0"
            />
            <div style={{ width: rightWidth }} className="shrink-0">
              <ContextPanel
                wordCount={activeChapter?.word_count ?? 0}
                paragraphCount={paragraphCount}
                charCount={charCount}
                charCountNoSpaces={charCountNoSpaces}
                chapterStatus={activeChapter?.status ?? "a_ecrire"}
                chapterId={activeChapterId}
                novelId={novelId}
                onStatusChange={() => activeChapterId && handleStatusChange(activeChapterId)}
                wbEntries={wbEntries}
                projectId={projectId}
                onSnapshot={handleManualSnapshot}
                onRestoreVersion={handleRestoreVersion}
              />
            </div>
          </>
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        wordCount={totalWords}
        wordGoal={wordGoal}
        syncStatus={syncStatus}
      />
    </div>
  );
}

