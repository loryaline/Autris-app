"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [rightWidth, setRightWidth] = useState(240);
  const [localChapters, setLocalChapters] = useState(chapters);
  const [, setTick] = useState(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef(createClient());

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
      }),
      CharacterCount,
      Typography,
    ],
    content: activeChapter?.content || "",
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
    onUpdate: ({ editor }) => {
      const currentId = activeChapterIdRef.current;
      if (!currentId) return;

      const html = editor.getHTML();
      const text = editor.getText();
      const words = countWords(text);

      setLocalChapters((prev) =>
        prev.map((c) =>
          c.id === currentId
            ? { ...c, content: html, word_count: words }
            : c
        )
      );

      setSyncStatus("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveChapter(currentId, html, words);
      }, 2000);
    },
    onSelectionUpdate: () => setTick((t) => t + 1),
    onTransaction: () => setTick((t) => t + 1),
  });

  // Snapshot du contenu courant dans chapter_versions
  const createSnapshot = useCallback(
    async (chapterId: string, content: string, wordCount: number, label: string) => {
      if (!content || content === "<p></p>") return;
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("chapter_versions").insert({
        chapter_id: chapterId,
        user_id: user.id,
        content,
        word_count: wordCount,
        label,
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
      // Snapshot auto en quittant le chapitre si du contenu réel y est saisi
      createSnapshot(activeChapterId, html, words, "Auto (changement de chapitre)");
    }
    const chapter = localChapters.find((c) => c.id === chapterId);
    if (chapter && editor) {
      activeChapterIdRef.current = chapterId;
      setActiveChapterId(chapterId);
      editor.commands.setContent(chapter.content || "", false);
      setSyncStatus("saved");
    }
  }

  function handleRestoreVersion(content: string, wordCount: number) {
    if (!activeChapterId || !editor) return;
    // Snapshot pré-restauration pour pouvoir revenir en arrière
    const currentHtml = editor.getHTML();
    const currentWords = countWords(editor.getText());
    createSnapshot(
      activeChapterId,
      currentHtml,
      currentWords,
      "Auto (avant restauration)"
    );
    editor.commands.setContent(content, false);
    setLocalChapters((prev) =>
      prev.map((c) =>
        c.id === activeChapterId ? { ...c, content, word_count: wordCount } : c
      )
    );
    saveChapter(activeChapterId, content, wordCount);
  }

  function handleManualSnapshot() {
    if (!activeChapterId || !editor) return;
    const html = editor.getHTML();
    const words = countWords(editor.getText());
    createSnapshot(activeChapterId, html, words, "Manuelle");
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
        editor.commands.setContent(next.content || "", false);
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
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];

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
    const onMove = (ev: MouseEvent) => setRightWidth(Math.max(140, Math.min(640, startW - (ev.clientX - startX))));
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [rightWidth]);

  const totalWords = localChapters.reduce((sum, c) => sum + c.word_count, 0);

  const paragraphCount = editor
    ? editor.getText().split(/\n\n+/).filter((p) => p.trim()).length
    : 0;

  const canNavigateHome = syncStatus === "saved";

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb top bar */}
      {!focusMode ? (
        <div className="h-9 bg-bg-primary border-b border-border flex items-center px-3 gap-2 shrink-0">
          <a
            href={canNavigateHome ? "/" : undefined}
            onClick={(e) => { if (!canNavigateHome) e.preventDefault(); }}
            title={canNavigateHome ? "Retour à l'accueil" : "Sauvegarde en cours…"}
            className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
              canNavigateHome
                ? "text-text-tertiary hover:text-primary hover:bg-primary-bg cursor-pointer"
                : "text-text-quaternary cursor-not-allowed opacity-50"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l4-4 4 4M3 5.5V10h2.5V7.5h1V10H9V5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <span className="text-[12px] text-border">/</span>
          <a href="/" className={`text-[13px] no-underline ${canNavigateHome ? "text-text-tertiary hover:text-primary" : "text-text-quaternary pointer-events-none"}`}>
            {projectTitle}
          </a>
          <span className="text-[12px] text-border">/</span>
          <span className="text-[13px] text-text-tertiary">{novelTitle}</span>
          <span className="text-[12px] text-border">/</span>
          <span className="text-[13px] text-text-tertiary">Rédaction</span>
          {activeChapter && (
            <>
              <span className="text-[12px] text-border">/</span>
              <span className="text-[13px] font-medium text-text-primary">
                {activeChapter.title}
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
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
          <div className="ml-auto flex items-center gap-1.5">
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
        wordCount={totalWords}
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

        {/* Editor area — Google Docs style */}
        <div
          className="flex-1 overflow-y-auto flex justify-center"
          style={{ background: "var(--color-bg-tertiary)" }}
        >
          <div
            className="w-full"
            style={{
              maxWidth: "780px",
              background: "#ffffff",
              color: "#1a1918",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              padding: "32px 48px",
              minHeight: "100%",
            }}
          >
            {activeChapter ? (
              <>
                {!focusMode && (
                  <div className="text-[12px] mb-4 opacity-60" style={{ fontFamily: "var(--font-sans)", color: "#9b9a96" }}>
                    {activeChapter.title}
                  </div>
                )}
                <EditorContent editor={editor} />
              </>
            ) : (
              <div className="text-center mt-20" style={{ fontFamily: "var(--font-sans)" }}>
                <div className="text-[24px] mb-3">🦭</div>
                <div className="text-text-tertiary text-[14px] mb-3">
                  {localChapters.length === 0
                    ? "Aucun chapitre pour l'instant."
                    : "Sélectionnez un chapitre pour commencer à écrire."}
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
                chapterTitle={activeChapter?.title ?? "—"}
                chapterStatus={activeChapter?.status ?? "a_ecrire"}
                chapterId={activeChapterId}
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
