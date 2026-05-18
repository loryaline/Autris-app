"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";

type Dock = "top" | "bottom" | "left" | "right" | "free";

const IconList = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M4 3.5H12M4 7H12M4 10.5H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="1.6" cy="3.5" r="1" fill="currentColor" />
    <circle cx="1.6" cy="7" r="1" fill="currentColor" />
    <circle cx="1.6" cy="10.5" r="1" fill="currentColor" />
  </svg>
);

/**
 * Barre d'outils flottante de l'éditeur — redesign phase 4.
 *
 * Quatre ancres (haut / bas / gauche / droite) + position libre par
 * glisser-déposer. Câblée sur l'instance TipTap fournie. Les boutons
 * utilisent onMouseDown + preventDefault pour ne pas perdre la sélection.
 */
export function FloatingToolbar({ editor }: { editor: Editor | null }) {
  const [dock, setDock] = useState<Dock>("left");
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [minimized, setMinimized] = useState(false);
  // Orientation conservée lors du glisser-déposer : déplacer la barre
  // ne change plus sa direction (une barre verticale reste verticale).
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "vertical",
  );

  const horizontal = orientation === "horizontal";

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = pos.x;
    const oy = pos.y;
    const onMove = (ev: PointerEvent) => {
      setDock("free");
      setPos({ x: ox + (ev.clientX - startX), y: oy + (ev.clientY - startY) });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (!editor) return null;

  // Réduite : une pastille flottante près du bouton de feedback (bug).
  if (minimized) {
    return (
      <button
        type="button"
        className="ft-mini"
        title="Afficher la barre d'outils"
        aria-label="Afficher la barre d'outils"
        onClick={() => setMinimized(false)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="6" width="14" height="6" rx="3" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5.5" cy="9" r="1" fill="currentColor" />
          <circle cx="9" cy="9" r="1" fill="currentColor" />
          <circle cx="12.5" cy="9" r="1" fill="currentColor" />
        </svg>
      </button>
    );
  }

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };

  const tools: {
    id: string;
    title: string;
    active?: boolean;
    onClick: () => void;
    render: React.ReactNode;
  }[][] = [
    [
      {
        id: "bold",
        title: "Gras (Ctrl+B)",
        active: editor.isActive("bold"),
        onClick: () => editor.chain().focus().toggleBold().run(),
        render: <span style={{ fontWeight: 800 }}>G</span>,
      },
      {
        id: "italic",
        title: "Italique (Ctrl+I)",
        active: editor.isActive("italic"),
        onClick: () => editor.chain().focus().toggleItalic().run(),
        render: <span style={{ fontStyle: "italic", fontFamily: "var(--font-display)" }}>I</span>,
      },
      {
        id: "underline",
        title: "Souligné (Ctrl+U)",
        active: editor.isActive("underline"),
        onClick: () => editor.chain().focus().toggleUnderline().run(),
        render: <span style={{ textDecoration: "underline" }}>S</span>,
      },
      {
        id: "strike",
        title: "Barré",
        active: editor.isActive("strike"),
        onClick: () => editor.chain().focus().toggleStrike().run(),
        render: <span style={{ textDecoration: "line-through" }}>S</span>,
      },
    ],
    [
      {
        id: "h1",
        title: "Titre 1",
        active: editor.isActive("heading", { level: 1 }),
        onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        render: <span className="tool-h">H1</span>,
      },
      {
        id: "h2",
        title: "Titre 2",
        active: editor.isActive("heading", { level: 2 }),
        onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        render: <span className="tool-h">H2</span>,
      },
      {
        id: "h3",
        title: "Titre 3",
        active: editor.isActive("heading", { level: 3 }),
        onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        render: <span className="tool-h">H3</span>,
      },
    ],
    [
      {
        id: "quote",
        title: "Citation",
        active: editor.isActive("blockquote"),
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
        render: <span className="tool-q">&ldquo;&rdquo;</span>,
      },
      {
        id: "ul",
        title: "Liste à puces",
        active: editor.isActive("bulletList"),
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        render: <IconList />,
      },
      {
        id: "hr",
        title: "Séparateur",
        onClick: () => editor.chain().focus().setHorizontalRule().run(),
        render: <span style={{ letterSpacing: 1 }}>━</span>,
      },
      {
        id: "ornament",
        title: "Ornement",
        onClick: () =>
          editor.chain().focus().insertContent("<p>◆ ◆ ◆</p>").run(),
        render: <span>◆</span>,
      },
    ],
  ];

  const dockOptions: { id: Dock; label: string }[] = [
    { id: "top", label: "↑" },
    { id: "left", label: "←" },
    { id: "right", label: "→" },
    { id: "bottom", label: "↓" },
  ];

  return (
    <div
      className={`float-toolbar dock-${dock} ${horizontal ? "horizontal" : "vertical"}`}
      style={dock === "free" ? { left: pos.x, top: pos.y } : undefined}
    >
      <div className="ft-handle" onPointerDown={onPointerDown} title="Glisser">
        <span className="ft-grip">⋮⋮</span>
      </div>
      {tools.map((group, gi) => (
        <span key={gi} style={{ display: "contents" }}>
          {gi > 0 && <span className="ft-sep" />}
          <div className="ft-group">
            {group.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ft-btn${t.active ? " active" : ""}`}
                title={t.title}
                onMouseDown={run(t.onClick)}
              >
                {t.render}
              </button>
            ))}
          </div>
        </span>
      ))}
      <span className="ft-sep" />
      <div className="ft-dock-row" title="Ancrer">
        {dockOptions.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`ft-dockbtn${dock === d.id ? " active" : ""}`}
            onClick={() => {
              setDock(d.id);
              setOrientation(
                d.id === "top" || d.id === "bottom" ? "horizontal" : "vertical",
              );
            }}
            title={`Ancrer : ${d.id}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <span className="ft-sep" />
      <button
        type="button"
        className="ft-dockbtn"
        title="Réduire la barre d'outils"
        aria-label="Réduire la barre d'outils"
        onClick={() => setMinimized(true)}
      >
        −
      </button>
    </div>
  );
}
