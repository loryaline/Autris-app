"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

/**
 * Cellule éditable type Notion / Excel :
 *
 * - Pas de mode édition séparé : la cellule se comporte comme une zone
 *   de texte permanente. Au click, le curseur se positionne là où on
 *   clique et on tape directement.
 * - Pas de toolbar interne : les options de formatage (gras / italique /
 *   souligné / barré / couleur / surlignage) apparaissent dans une
 *   toolbar flottante au-dessus de la sélection, comme Notion. Elle
 *   disparaît dès qu'on désélectionne.
 * - Pour économiser la mémoire, le ProseMirror n'est instancié que sur
 *   la cellule actuellement focalisée — les autres cellules rendent
 *   leur contenu en HTML statique.
 */

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
  // La cellule est "focalisée" (= ProseMirror monté) uniquement quand on
  // a cliqué dedans. Sinon on rend juste le HTML statique pour économiser
  // les instances ProseMirror sur un tableau qui peut compter 50+ cases.
  // On stocke la position de click dans le state lui-même pour rester
  // stable d'un render à l'autre (et satisfaire react-hooks/refs).
  const [focused, setFocused] = useState<{ pos: number | null } | null>(null);

  if (!focused) {
    const empty = isEmptyHtml(value || "");
    return (
      <div
        onMouseDown={(e) => {
          const pos = computeClickOffset(
            e.currentTarget as HTMLElement,
            e.clientX,
            e.clientY,
          );
          setFocused({ pos });
        }}
        className={`px-2 py-1.5 text-[12px] cursor-text min-h-[28px] whitespace-pre-wrap break-words rich-cell-display ${className ?? ""}`}
      >
        {empty ? (
          <span className="text-text-quaternary">{placeholder ?? ""}</span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: value }} />
        )}
      </div>
    );
  }

  return (
    <FocusedCell
      value={value}
      onSave={onSave}
      onLeave={() => setFocused(null)}
      initialClickPos={focused.pos}
      className={className}
      placeholder={placeholder}
    />
  );
}

/* ============================================================ */
/*  Cell en mode focus — contient le ProseMirror + bubble menu    */
/* ============================================================ */

function FocusedCell({
  value,
  onSave,
  onLeave,
  initialClickPos,
  className,
  placeholder,
}: {
  value: string;
  onSave: (val: string) => void;
  onLeave: () => void;
  initialClickPos: number | null;
  className?: string;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: value || "",
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class:
          "tiptap-cell outline-none min-h-[28px] px-2 py-1.5 text-[12px] text-text-primary whitespace-pre-wrap break-words",
      },
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      const selecting = from !== to;
      setHasSelection(selecting);
      if (selecting) {
        // Positionne le bubble menu au-dessus du début de la sélection
        try {
          const start = ed.view.coordsAtPos(from);
          const end = ed.view.coordsAtPos(to);
          const top = Math.min(start.top, end.top) - 44; // 44px au-dessus
          const left = (start.left + end.left) / 2;
          setBubblePos({ top, left });
        } catch {
          setBubblePos(null);
        }
      } else {
        setBubblePos(null);
      }
    },
  });

  // Focus initial : place le curseur à la position du click
  useEffect(() => {
    if (!editor) return;
    const pos = initialClickPos;
    requestAnimationFrame(() => {
      if (pos !== null && pos >= 0 && pos <= editor.state.doc.content.size) {
        editor.commands.focus(pos);
      } else {
        editor.commands.focus("end");
      }
    });
  }, [editor, initialClickPos]);

  const commit = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    const clean = isEmptyHtml(html) ? "" : html;
    if (clean !== value) onSave(clean);
    onLeave();
  }, [editor, value, onSave, onLeave]);

  // Blur handling : si le focus quitte le conteneur (cellule + bubble menu),
  // on commit et on repasse en mode statique. relatedTarget peut être le
  // bubble menu — on l'ignore via la classe sur le wrapper.
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next) {
      // Si on clique dans le bubble menu, on garde le focus
      const inBubble = (next as Element).closest?.("[data-bubble-menu]");
      if (inBubble) return;
      if (containerRef.current?.contains(next)) return;
    }
    commit();
  }

  if (!editor) {
    return (
      <div className={`px-2 py-1.5 text-[12px] min-h-[28px] ${className ?? ""}`}>
        <span className="text-text-quaternary">…</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className={`cell-focused ${className ?? ""}`}
    >
      <EditorContent
        editor={editor}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            commit();
          }
        }}
        data-placeholder={placeholder ?? ""}
      />
      {hasSelection && bubblePos && (
        <BubbleMenu editor={editor} pos={bubblePos} />
      )}
    </div>
  );
}

/* ============================================================ */
/*  Bubble menu — toolbar flottante au-dessus de la sélection     */
/* ============================================================ */

function BubbleMenu({
  editor,
  pos,
}: {
  editor: Editor;
  pos: { top: number; left: number };
}) {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  const btn = (active: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded-sm text-[12px] cursor-pointer transition-colors ${
      active ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-hover"
    }`;

  // Empêche le mousedown de voler le focus à l'éditeur
  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      data-bubble-menu
      onMouseDown={preventBlur}
      className="fixed z-[60] flex items-center gap-0.5 px-1 py-1 bg-bg-tertiary border border-white/[0.10] rounded-md shadow-xl"
      style={{
        top: Math.max(8, pos.top),
        left: Math.max(8, pos.left - 110), // approximative center anchor
      }}
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

      <div className="w-px h-4 bg-white/[0.10] mx-0.5" />

      {/* Text color */}
      <div className="relative">
        <button
          tabIndex={-1}
          onClick={() => {
            setShowTextColor(!showTextColor);
            setShowHighlight(false);
          }}
          className={btn(showTextColor)}
          title="Couleur du texte"
        >
          <span style={{ color: editor.getAttributes("textStyle").color ?? "currentColor" }}>A</span>
        </button>
        {showTextColor && (
          <div className="absolute top-full left-0 mt-1 p-1 bg-bg-primary border border-white/[0.10] rounded-md shadow-lg z-20 grid grid-cols-5 gap-1 w-[140px]">
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
                className="w-6 h-6 rounded border border-white/[0.08] flex items-center justify-center text-[12px] font-bold cursor-pointer hover:ring-1 hover:ring-primary"
                style={{ color: c.value ?? "var(--color-text-primary)" }}
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
          onClick={() => {
            setShowHighlight(!showHighlight);
            setShowTextColor(false);
          }}
          className={btn(showHighlight)}
          title="Surlignage"
        >
          <span
            className="inline-block w-3 h-3 rounded-sm border border-white/[0.10]"
            style={{ background: editor.getAttributes("highlight").color ?? "transparent" }}
          />
        </button>
        {showHighlight && (
          <div className="absolute top-full left-0 mt-1 p-1 bg-bg-primary border border-white/[0.10] rounded-md shadow-lg z-20 grid grid-cols-5 gap-1 w-[140px]">
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
                className="w-6 h-6 rounded border border-white/[0.08] cursor-pointer hover:ring-1 hover:ring-primary"
                style={{ background: c.value ?? "transparent" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Helpers                                                       */
/* ============================================================ */

/**
 * Approxime la position de caret correspondant à un click {x,y} dans un
 * conteneur HTML. Utilise les API navigateur (caretRangeFromPoint /
 * caretPositionFromPoint), avec un fallback sur "fin du document" si
 * indisponibles.
 *
 * Renvoie un offset à passer à editor.commands.focus(N). On n'a pas
 * accès à la map ProseMirror ici, mais ProseMirror est tolérant à un
 * offset DOM qui dépasse — il clamp automatiquement.
 */
function computeClickOffset(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  if (typeof document === "undefined") return null;

  // Si la cellule est vide, on commence forcément à 0
  if (!el.textContent?.trim()) return 0;

  type DocWithCaret = Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const doc = document as DocWithCaret;

  let textOffset = 0;
  if (doc.caretPositionFromPoint) {
    const cp = doc.caretPositionFromPoint(clientX, clientY);
    if (cp) textOffset = computeAbsoluteOffset(el, cp.offsetNode, cp.offset);
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (range) textOffset = computeAbsoluteOffset(el, range.startContainer, range.startOffset);
  }
  // Tiptap accepte un offset 1-based à peu près. Pour le DOM-text-offset
  // simple ci-dessus, +1 donne en général le bon caret dans la doc PM.
  return textOffset + 1;
}

function computeAbsoluteOffset(root: Node, node: Node, offsetInNode: number): number {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n === node) {
      total += offsetInNode;
      return total;
    }
    total += (n.textContent ?? "").length;
    n = walker.nextNode();
  }
  return total;
}
