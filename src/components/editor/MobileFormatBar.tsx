"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { editorTools } from "./FloatingToolbar";

/**
 * La mise en forme, sur téléphone.
 *
 * La barre du bureau flotte, se déplace au glisser, s'ancre à quatre
 * bords et se réduit en pastille. Aucun de ces gestes n'a de sens au
 * doigt : on ne saisit pas une barre de 28 px de haut, et elle se
 * battrait de toute façon avec le clavier pour la même place.
 *
 * Ici, une barre fixe, non déplaçable, posée **juste au-dessus du
 * clavier** — la seule position qui ne demande pas de viser. Elle ne
 * paraît que pendant la frappe : au repos, elle laisserait le rail des
 * panneaux inaccessible.
 *
 * Les outils sont les mêmes qu'au bureau, dans le même ordre, et défilent
 * horizontalement plutôt que d'être triés : décider ici lesquels sont
 * « essentiels » créerait deux vocabulaires pour une seule fonction.
 */
export function MobileFormatBar({ editor }: { editor: Editor | null }) {
  const [visible, setVisible] = useState(false);
  // Hauteur occupée par le clavier logiciel, en pixels.
  const [keyboard, setKeyboard] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  // La frappe seule fait apparaître la barre.
  useEffect(() => {
    if (!editor) return;
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    editor.on("focus", show);
    editor.on("blur", hide);
    return () => {
      editor.off("focus", show);
      editor.off("blur", hide);
    };
  }, [editor]);

  /**
   * Le clavier d'iOS ne prévient pas le code qu'il s'ouvre, et ne réduit
   * pas la fenêtre de mise en page : une barre `fixed bottom: 0` se
   * retrouve dessous. Seule la VisualViewport API dit la hauteur
   * réellement visible — d'où le calcul plutôt qu'une valeur devinée.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const hidden = window.innerHeight - (vv.height + vv.offsetTop);
      setKeyboard((prev) => {
        const next = Math.max(0, Math.round(hidden));
        return Math.abs(prev - next) < 2 ? prev : next;
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  if (!editor || !visible) return null;

  const groups = editorTools(editor);

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Mise en forme"
      className="fixed inset-x-0 z-[80] flex items-center gap-1 pl-2 py-1.5"
      style={{
        bottom: keyboard,
        background: "var(--bg-2)",
        borderTop: "1px solid var(--border-soft)",
        // Sans clavier ouvert (clavier matériel branché), la barre se pose
        // au-dessus de la zone sûre plutôt qu'à ras du bord.
        paddingBottom: keyboard === 0
          ? "calc(6px + env(safe-area-inset-bottom, 0px))"
          : undefined,
      }}
    >
      {/* Les outils défilent, la sortie non : elle doit rester atteignable
          quel que soit le défilement. */}
      <div
        className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1 shrink-0">
          {gi > 0 && (
            <span
              className="w-px h-5 mx-1 shrink-0"
              style={{ background: "var(--border-soft)" }}
            />
          )}
          {group.map((t) => (
            <button
              key={t.id}
              type="button"
              // mousedown + preventDefault : sans ça, toucher la barre
              // retire le focus de l'éditeur et la sélection est perdue
              // avant que l'action ne s'applique.
              onMouseDown={(e) => {
                e.preventDefault();
                t.onClick();
              }}
              title={t.title}
              aria-label={t.title}
              aria-pressed={t.active ?? undefined}
              className="shrink-0 rounded-[var(--radius-sm)] flex items-center justify-center text-[14px] cursor-pointer border-none"
              style={{
                minWidth: 44,
                minHeight: 44,
                background: t.active ? "var(--accent-bg)" : "transparent",
                color: t.active ? "var(--accent)" : "var(--text-2)",
              }}
            >
              {t.render}
            </button>
          ))}
        </div>
      ))}
      </div>

      {/* Sortie explicite.
          Sans elle, quitter l'écriture demanderait de toucher « à côté »
          du texte pour perdre le focus — or dès que le chapitre remplit
          l'écran, il n'y a plus de « à côté » : tout est du texte, et le
          toucher garde le clavier. Le rail des panneaux, qui vit sous
          cette barre, deviendrait alors inatteignable. */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.commands.blur();
        }}
        title="Fermer le clavier"
        aria-label="Fermer le clavier et revenir aux panneaux"
        className="shrink-0 flex items-center justify-center cursor-pointer border-none"
        style={{
          minWidth: 48,
          minHeight: 44,
          background: "transparent",
          color: "var(--text-2)",
          borderLeft: "1px solid var(--border-soft)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="2.5" y="4" width="15" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 7h1M9.5 7h1M13.5 7h1M6.5 9.8h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M7.5 15.2L10 17.5l2.5-2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
