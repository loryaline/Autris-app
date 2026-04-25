"use client";

import type { Editor } from "@tiptap/react";

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`h-[18px] min-w-[24px] px-1.5 border rounded-[3px] text-[12px] cursor-pointer transition-colors ${
        active
          ? "bg-primary-bg border-primary-border text-primary-dark font-medium"
          : "bg-transparent border-border text-text-primary hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

function PanelToggleButton({
  title,
  onClick,
  side,
}: {
  title: string;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-[18px] w-[18px] border border-border rounded-[3px] bg-transparent cursor-pointer flex items-center justify-center hover:bg-bg-hover transition-colors"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        {side === "left" ? (
          <>
            <rect x="1" y="1" width="3" height="8" rx="1" stroke="#888780" strokeWidth=".8" />
            <rect x="5" y="1" width="4" height="8" rx="1" stroke="#888780" strokeWidth=".8" />
          </>
        ) : (
          <>
            <rect x="2" y="1" width="4" height="8" rx="1" stroke="#888780" strokeWidth=".8" />
            <rect x="7" y="1" width="3" height="8" rx="1" stroke="#888780" strokeWidth=".8" />
          </>
        )}
      </svg>
    </button>
  );
}

export function Toolbar({
  editor,
  wordCount,
  totalChars,
  totalCharsNoSpaces,
  paragraphCount,
  onToggleLeft,
  onToggleRight,
  hidePanelToggles,
}: {
  editor: Editor | null;
  wordCount: number;
  totalChars: number;
  totalCharsNoSpaces: number;
  paragraphCount: number;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  hidePanelToggles?: boolean;
}) {
  if (!editor) return null;

  const readingTime = Math.max(1, Math.round(wordCount / 250));

  return (
    <div className="h-9 bg-bg-primary border-b border-white/[0.04] flex items-center px-4 gap-1.5 shrink-0">
      {/* Formatage — outils existants uniquement */}
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Gras (Ctrl+B)"
      >
        <span className="font-bold">G</span>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italique (Ctrl+I)"
      >
        <span className="italic">I</span>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Souligné (Ctrl+U)"
      >
        <span className="underline">S</span>
      </ToolbarButton>

      {/* Stats — à droite */}
      <div className="ml-auto flex items-center gap-3 text-[12px] text-text-tertiary">
        <span className="flex items-center gap-1">
          <span className="font-mono tabular-nums text-text-secondary">
            {wordCount.toLocaleString("fr-FR")}
          </span>
          <span className="text-text-quaternary">mots</span>
        </span>
        <span className="text-text-quaternary/50">·</span>
        <span className="flex items-center gap-1" title="Signes sans espaces">
          <span className="font-mono tabular-nums text-text-secondary">
            {totalCharsNoSpaces.toLocaleString("fr-FR")}
          </span>
          <span className="text-text-quaternary">s</span>
        </span>
        <span className="text-text-quaternary/50">·</span>
        <span className="flex items-center gap-1" title="Signes espaces compris">
          <span className="font-mono tabular-nums text-text-secondary">
            {totalChars.toLocaleString("fr-FR")}
          </span>
          <span className="text-text-quaternary">c</span>
        </span>
        <span className="text-text-quaternary/50">·</span>
        <span className="flex items-center gap-1" title="Paragraphes">
          <span className="font-mono tabular-nums text-text-secondary">{paragraphCount}</span>
          <span className="text-text-quaternary">§</span>
        </span>
        <span className="text-text-quaternary/50">·</span>
        <span className="flex items-center gap-1" title="Temps de lecture estimé">
          <span className="text-text-quaternary">≈</span>
          <span className="font-mono tabular-nums text-text-secondary">{readingTime} min</span>
          <span className="text-text-quaternary">lecture</span>
        </span>

        {!hidePanelToggles && (
          <>
            <span className="w-px h-4 bg-white/[0.08] mx-1" />
            <PanelToggleButton title="Masquer la structure" onClick={onToggleLeft} side="left" />
            <PanelToggleButton title="Masquer le contexte" onClick={onToggleRight} side="right" />
          </>
        )}
      </div>
    </div>
  );
}
