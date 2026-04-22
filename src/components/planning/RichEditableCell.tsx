"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

// Palette Notion-like — 8 couleurs de texte + 8 couleurs de surlignage
const TEXT_COLORS = [
  { name: "Défaut", value: null },
  { name: "Gris", value: "#9b9a93" },
  { name: "Marron", value: "#ba856f" },
  { name: "Orange", value: "#d9730d" },
  { name: "Jaune", value: "#cb912f" },
  { name: "Vert", value: "#448361" },
  { name: "Bleu", value: "#337ea9" },
  { name: "Violet", value: "#9065b0" },
  { name: "Rouge", value: "#d44c47" },
] as const;

const HIGHLIGHT_COLORS = [
  { name: "Aucun", value: null },
  { name: "Gris", value: "#4a4a48" },
  { name: "Marron", value: "#5c4640" },
  { name: "Orange", value: "#7a4c2a" },
  { name: "Jaune", value: "#6b5d28" },
  { name: "Vert", value: "#2f4a3a" },
  { name: "Bleu", value: "#2d4a5c" },
  { name: "Violet", value: "#4a3a5c" },
  { name: "Rouge", value: "#5c2f2f" },
] as const;

function isEmptyHtml(html: string): boolean {
  const stripped = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
  return stripped.length === 0;
}

export function RichEditableCell({
  value,
  onSave,
  className,
  placeholder,
}: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, bulletList: false, orderedList: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap-cell outline-none min-h-[28px] px-2 py-1.5 text-[12px] text-text-primary whitespace-pre-wrap break-words",
      },
    },
  });

  // Sync external value -> editor when not editing
  useEffect(() => {
    if (!editor) return;
    if (!editing) {
      const current = editor.getHTML();
      const next = value || "";
      if (current !== next) editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor, editing]);

  function commit() {
    if (!editor) return;
    setEditing(false);
    setShowTextColor(false);
    setShowHighlight(false);
    const html = editor.getHTML();
    const clean = isEmptyHtml(html) ? "" : html;
    if (clean !== value) onSave(clean);
  }

  // Blur handling: if focus leaves the container, commit
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) return;
    commit();
  }

  if (!editor) {
    return (
      <div className={`px-2 py-1.5 text-[12px] min-h-[28px] ${className ?? ""}`}>
        <span className="text-text-quaternary">…</span>
      </div>
    );
  }

  if (!editing) {
    const empty = isEmptyHtml(value || "");
    return (
      <div
        onClick={() => {
          setEditing(true);
          setTimeout(() => editor.commands.focus("end"), 0);
        }}
        className={`px-2 py-1.5 text-[12px] cursor-text min-h-[28px] whitespace-pre-wrap break-words rich-cell-display ${className ?? ""}`}
      >
        {empty ? (
          <span className="text-text-quaternary">{placeholder ?? "—"}</span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: value }} />
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className="relative rounded border border-primary-border bg-bg-primary"
    >
      <Toolbar
        editor={editor}
        showTextColor={showTextColor}
        setShowTextColor={setShowTextColor}
        showHighlight={showHighlight}
        setShowHighlight={setShowHighlight}
      />
      <EditorContent editor={editor} onKeyDown={(e) => { if (e.key === "Escape") commit(); }} />
    </div>
  );
}

function Toolbar({
  editor,
  showTextColor,
  setShowTextColor,
  showHighlight,
  setShowHighlight,
}: {
  editor: Editor;
  showTextColor: boolean;
  setShowTextColor: (v: boolean) => void;
  showHighlight: boolean;
  setShowHighlight: (v: boolean) => void;
}) {
  const btn = (active: boolean) =>
    `w-6 h-6 flex items-center justify-center rounded text-[11px] cursor-pointer transition-colors ${
      active ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-hover"
    }`;

  // Prevent toolbar mousedown from stealing focus from editor
  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      onMouseDown={preventBlur}
      className="flex items-center gap-0.5 px-1 py-1 border-b border-border bg-bg-secondary"
    >
      <button
        tabIndex={-1}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
        title="Gras (Ctrl+B)"
      >
        <span className="font-bold">B</span>
      </button>
      <button
        tabIndex={-1}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
        title="Italique (Ctrl+I)"
      >
        <span className="italic">I</span>
      </button>
      <button
        tabIndex={-1}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive("underline"))}
        title="Souligné (Ctrl+U)"
      >
        <span className="underline">U</span>
      </button>
      <button
        tabIndex={-1}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}
        title="Barré"
      >
        <span className="line-through">S</span>
      </button>

      <div className="w-px h-4 bg-border mx-0.5" />

      {/* Text color */}
      <div className="relative">
        <button
          tabIndex={-1}
          onClick={() => { setShowTextColor(!showTextColor); setShowHighlight(false); }}
          className={btn(showTextColor)}
          title="Couleur du texte"
        >
          <span style={{ color: editor.getAttributes("textStyle").color ?? "currentColor" }}>A</span>
        </button>
        {showTextColor && (
          <div className="absolute top-full left-0 mt-1 p-1 bg-bg-primary border border-border rounded shadow-lg z-20 grid grid-cols-5 gap-1 w-[140px]">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                tabIndex={-1}
                onClick={() => {
                  if (c.value === null) editor.chain().focus().unsetColor().run();
                  else editor.chain().focus().setColor(c.value).run();
                  setShowTextColor(false);
                }}
                title={c.name}
                className="w-6 h-6 rounded border border-border flex items-center justify-center text-[12px] font-bold cursor-pointer hover:ring-1 hover:ring-primary"
                style={{ color: c.value ?? "var(--text-primary)" }}
              >
                A
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          tabIndex={-1}
          onClick={() => { setShowHighlight(!showHighlight); setShowTextColor(false); }}
          className={btn(showHighlight)}
          title="Surlignage"
        >
          <span
            className="inline-block w-3 h-3 rounded-sm border border-border"
            style={{ background: editor.getAttributes("highlight").color ?? "transparent" }}
          />
        </button>
        {showHighlight && (
          <div className="absolute top-full left-0 mt-1 p-1 bg-bg-primary border border-border rounded shadow-lg z-20 grid grid-cols-5 gap-1 w-[140px]">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.name}
                tabIndex={-1}
                onClick={() => {
                  if (c.value === null) editor.chain().focus().unsetHighlight().run();
                  else editor.chain().focus().setHighlight({ color: c.value }).run();
                  setShowHighlight(false);
                }}
                title={c.name}
                className="w-6 h-6 rounded border border-border cursor-pointer hover:ring-1 hover:ring-primary"
                style={{ background: c.value ?? "transparent" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
