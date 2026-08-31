"use client";

import { useMemo, useRef } from "react";
import type { WbBoardNode } from "@/types/database";
import type { Viewport } from "./WbBoardCanvas";

/**
 * Vue d'ensemble d'un plateau, en bas à droite.
 *
 * Sur une surface infinie, on finit par ne plus savoir où l'on est ni ce
 * qu'il y a ailleurs. La mini-carte montre tout le contenu d'un coup et
 * situe la fenêtre courante dedans ; cliquer dessus s'y rend.
 *
 * Les objets estompés par un filtre le sont aussi ici : la mini-carte
 * montre le plateau tel qu'il est affiché, pas tel qu'il est stocké.
 */

const PAD = 8;

export function BoardMiniMap({
  nodes,
  viewport,
  canvasW,
  canvasH,
  dimmedIds,
  heights,
  onJump,
  width = 168,
  height = 118,
}: {
  nodes: WbBoardNode[];
  viewport: Viewport;
  canvasW: number;
  canvasH: number;
  dimmedIds?: Set<string>;
  /**
   * Hauteurs réellement rendues. Une fiche épouse son contenu : cadrer
   * sur sa hauteur stockée décalerait toute la miniature.
   */
  heights?: Record<string, number>;
  /** Centre la vue sur ce point du plateau. */
  onJump: (x: number, y: number) => void;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Cadre englobant : tout le contenu ET la fenêtre courante — sans quoi
   * s'éloigner du contenu ferait sortir le rectangle de la mini-carte,
   * qui cesserait justement de dire où l'on est.
   */
  const nodeH = (n: WbBoardNode) => heights?.[n.id] ?? n.h;

  const box = useMemo(() => {
    // Une mesure absente donnerait une fenêtre de taille nulle ou
    // négative : un <rect> invalide, que le navigateur ignore sans rien
    // signaler. Mieux vaut une estimation qu'un cadre fantôme.
    const cw = canvasW > 1 ? canvasW : 900;
    const ch = canvasH > 1 ? canvasH : 600;
    const viewW = cw / viewport.zoom;
    const viewH = ch / viewport.zoom;
    const viewX = -viewport.x / viewport.zoom;
    const viewY = -viewport.y / viewport.zoom;

    let minX = viewX;
    let minY = viewY;
    let maxX = viewX + viewW;
    let maxY = viewY + viewH;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + nodeH(n));
    }
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    // Une seule échelle pour les deux axes : déformer la carte rendrait
    // les distances mensongères.
    const scale = Math.min((width - PAD * 2) / w, (height - PAD * 2) / h);
    return {
      minX,
      minY,
      scale,
      dx: PAD + ((width - PAD * 2) - w * scale) / 2,
      dy: PAD + ((height - PAD * 2) - h * scale) / 2,
      view: { x: viewX, y: viewY, w: viewW, h: viewH },
    };
    // nodeH ne dépend que de `heights`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, viewport, canvasW, canvasH, width, height, heights]);

  const px = (x: number) => box.dx + (x - box.minX) * box.scale;
  const py = (y: number) => box.dy + (y - box.minY) * box.scale;

  /** Du clic sur la mini-carte vers un point du plateau. */
  const jumpFromEvent = (e: React.MouseEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    onJump(
      box.minX + (mx - box.dx) / box.scale,
      box.minY + (my - box.dy) / box.scale,
    );
  };

  if (nodes.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onMouseDown={(e) => {
        e.stopPropagation();
        jumpFromEvent(e);
      }}
      className="absolute right-3 bottom-3 z-[60] rounded-[var(--radius-md)] cursor-pointer"
      style={{
        background: "var(--bg-3)",
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-md)",
      }}
      aria-label="Vue d'ensemble du plateau"
    >
      {nodes.map((n) => {
        const color = (n.style.color as string) ?? "var(--accent)";
        // Un objet reste visible même minuscule : sans plancher, les
        // vignettes lointaines disparaîtraient de la vue d'ensemble.
        const w = Math.max(2, n.w * box.scale);
        const h = Math.max(2, nodeH(n) * box.scale);
        const faded = dimmedIds?.has(n.id);
        return (
          <rect
            key={n.id}
            x={px(n.x)}
            y={py(n.y)}
            width={w}
            height={h}
            rx={1.5}
            fill={n.kind === "cadre" ? "none" : color}
            stroke={n.kind === "cadre" ? color : "none"}
            strokeWidth={n.kind === "cadre" ? 1 : 0}
            opacity={faded ? 0.15 : n.kind === "fiche" ? 0.85 : 0.5}
          />
        );
      })}

      {/* Fenêtre courante.
          On assombrit le HORS-CHAMP plutôt que de teinter la fenêtre :
          à zoom normal la fenêtre couvre presque toute la miniature, et
          un simple liseré s'y perdait. Ce que l'œil cherche, c'est ce
          qu'il ne voit pas — autant le désigner directement. */}
      {(() => {
        const vx = px(box.view.x);
        const vy = py(box.view.y);
        const vw = box.view.w * box.scale;
        const vh = box.view.h * box.scale;
        return (
          <g pointerEvents="none">
            <path
              d={
                `M0 0 H${width} V${height} H0 Z ` +
                `M${vx} ${vy} H${vx + vw} V${vy + vh} H${vx} Z`
              }
              fillRule="evenodd"
              fill="#000"
              fillOpacity={0.5}
            />
            <rect
              x={vx}
              y={vy}
              width={vw}
              height={vh}
              rx={2}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5}
            />
          </g>
        );
      })()}
    </svg>
  );
}
