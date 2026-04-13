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
  onToggleLeft,
  onToggleRight,
  hidePanelToggles,
}: {
  editor: Editor | null;
  wordCount: number;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  hidePanelToggles?: boolean;
}) {
  if (!editor) return null;

  return (
    <div className="h-6 bg-bg-primary border-b border-border flex items-center px-2.5 gap-0.5 shrink-0">
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

      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-[12px] text-text-tertiary mr-1">
          {wordCount.toLocaleString("fr-FR")} mots
        </span>
        {!hidePanelToggles && (
          <>
            <div className="w-px h-3.5 bg-border" />
            <PanelToggleButton title="Masquer la structure" onClick={onToggleLeft} side="left" />
            <PanelToggleButton title="Masquer le contexte" onClick={onToggleRight} side="right" />
          </>
        )}
      </div>
    </div>
  );
}
