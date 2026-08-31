"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WbBoardEdge, WbBoardNode, WbEntry, WbLink } from "@/types/database";
import { areReciprocal, getCategoryDef } from "@/lib/wb-constants";

/**
 * Le plateau : surface infinie, déplacement, zoom, vignettes, post-its et liens.
 *
 * Rendu HTML pour les objets, SVG pour les liens, le tout sur un plan
 * transformé (translate + scale). Voir PRD « Plateaux vivants ».
 *
 * Gestes (contrat du lot 1) :
 *   - clic sur une vignette   → sélection + aperçu compact déplié dessus
 *   - double-clic vignette    → ouvre la fiche dans le panneau
 *   - double-clic sur le fond → ramène le panneau à sa vue initiale
 *   - glisser une vignette    → déplace
 *   - glisser le fond         → déplace le plateau
 *   - glisser depuis le bord  → tire un lien vers une autre vignette
 *
 * « Vignette » et non « carte » : dans Autris, une carte est une fiche
 * géographique (sous-catégorie d'Univers & Monde).
 */

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;

/**
 * Une fiche « Carte » (Univers & Monde → Carte) n'est pas une fiche comme
 * les autres : c'est une image. Sur le plateau elle s'affiche en grand,
 * telle quelle, pour servir de fond sur lequel poser les lieux.
 */
export function isMapEntry(entry: WbEntry | null | undefined): boolean {
  return (
    !!entry &&
    entry.category === "univers_monde" &&
    entry.subcategory === "geographie" &&
    !!entry.main_image_url
  );
}

/**
 * Une fiche personnage illustrée montre son portrait en grand, carré,
 * au-dessus du nom : c'est le visage qui la fait reconnaître.
 */
export function isPortraitEntry(entry: WbEntry | null | undefined): boolean {
  return entry?.category === "personnages" && !!entry.main_image_url;
}

/** Taille et profondeur par défaut d'une vignette à la dépose. */
export function defaultNodeBox(entry: WbEntry | null | undefined) {
  // Les cartes arrivent grandes et EN DESSOUS du reste (z négatif),
  // pour qu'on puisse poser des vignettes par-dessus sans se battre.
  if (isMapEntry(entry)) return { w: 460, h: 320, z: -10 };
  // Portrait : le carré fait toute la largeur, plus le bandeau du nom.
  if (isPortraitEntry(entry)) return { w: 200, h: 252, z: 0 };
  return { w: 200, h: 116, z: 0 };
}

/** Pas de grille du dépliage — plus large que la plus haute vignette. */
export const LAYOUT_STEP = { x: 260, y: 320 };

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** Les quatre bords depuis lesquels on peut tirer un lien. */
const LINK_PORTS = [
  { side: "top", label: "haut", x: "50%", y: "0%" },
  { side: "right", label: "droit", x: "100%", y: "50%" },
  { side: "bottom", label: "bas", x: "50%", y: "100%" },
  { side: "left", label: "gauche", x: "0%", y: "50%" },
] as const;

/**
 * Taille à l'écran des poignées, en pixels — constante quel que soit le
 * zoom. Elles vivent dans le plan transformé : sans compensation, elles
 * deviendraient minuscules de loin et énormes de près. On divise donc
 * leurs dimensions par le facteur de zoom.
 */
const PORT_PX = 12;
const RESIZE_PX = 20;

export function WbBoardCanvas({
  nodes,
  edges,
  entriesById,
  linksById,
  viewport,
  onViewportChange,
  selectedIds,
  onSelectionChange,
  expandedId,
  onMoveNode,
  onResizeNode,
  onOpenEntry,
  onBackgroundDoubleClick,
  onEditPostit,
  onRenameCadre,
  onRenameEdge,
  onDropEntry,
  onStartLink,
  onDeleteSelection,
  onDeleteEdge,
  onSetEdgeWaypoint,
  onBeginHistory,
  onHeightsChange,
  onCanvasSizeChange,
  dimmedIds,
  selectionToolbar,
}: {
  nodes: WbBoardNode[];
  edges: WbBoardEdge[];
  entriesById: Map<string, WbEntry>;
  linksById: Map<string, WbLink>;
  viewport: Viewport;
  onViewportChange: (v: Viewport, persist: boolean) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  /** Vignette dont l'aperçu compact est déplié (clic simple). */
  expandedId: string | null;
  onMoveNode: (id: string, x: number, y: number) => void;
  onResizeNode: (id: string, w: number, h: number) => void;
  onOpenEntry: (entryId: string) => void;
  onBackgroundDoubleClick: () => void;
  onEditPostit: (node: WbBoardNode) => void;
  onRenameCadre: (node: WbBoardNode) => void;
  /** Étiquette d'une flèche libre (double-clic sur le trait). */
  onRenameEdge: (edge: WbBoardEdge) => void;
  onDropEntry: (entryId: string, x: number, y: number) => void;
  onStartLink: (from: WbBoardNode, to: WbBoardNode) => void;
  onDeleteSelection: () => void;
  onDeleteEdge: (id: string) => void;
  /** Prend un instantané avant une action continue (déplacer, redimensionner). */
  onBeginHistory: () => void;
  /** Déplace le point par lequel passe la flèche (null = la redresser). */
  onSetEdgeWaypoint: (id: string, point: { t: number; o: number } | null) => void;
  /**
   * Hauteurs RÉELLES des vignettes, une fois rendues. Seule cette surface
   * les connaît : une fiche épouse son contenu, sa hauteur stockée n'est
   * qu'un point de départ. La mini-carte et l'export en ont besoin pour
   * cadrer sur les mêmes boîtes que l'écran.
   */
  onHeightsChange?: (heights: Record<string, number>) => void;
  /**
   * Taille en pixels de la surface visible. Le parent ne peut que
   * l'estimer ; ici c'est l'élément lui-même qui la donne.
   */
  onCanvasSizeChange?: (size: { w: number; h: number }) => void;
  /**
   * Objets mis en retrait par un filtre ou une recherche. Estompés, pas
   * cachés : retirer une vignette couperait les flèches qui la traversent
   * et donnerait un plateau faux plutôt qu'un plateau filtré.
   */
  dimmedIds?: Set<string>;
  /** Outils contextuels, posés au plus près de la sélection. */
  selectionToolbar?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [panning, setPanning] = useState(false);
  // Lasso de sélection, en coordonnées plateau
  const [marquee, setMarquee] = useState<
    { x1: number; y1: number; x2: number; y2: number } | null
  >(null);
  // Flèche sélectionnée (Suppr la retire du plateau, jamais de la fiche)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Dernier appui, pour détecter nous-mêmes le double-clic (cf. startNodeDrag).
  const lastDown = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  /* ---- Hauteur RÉELLE des vignettes ----
   * Une vignette fiche s'étire selon son contenu : sa hauteur stockée
   * n'est qu'une valeur de départ. Sans mesure, la boîte resterait plus
   * haute que la carte visible (vide sous la vignette) et les flèches
   * viseraient le centre de ce vide. On observe donc le rendu. */
  const [heights, setHeights] = useState<Record<string, number>>({});
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver((obs) => {
      setHeights((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const o of obs) {
          const id = (o.target as HTMLElement).dataset.nodeId;
          if (!id) continue;
          const h = o.contentRect.height;
          if (h > 0 && Math.abs((prev[id] ?? 0) - h) > 0.5) {
            next[id] = h;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    observerRef.current = ro;
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    onHeightsChange?.(heights);
  }, [heights, onHeightsChange]);

  const observeNode = useCallback((el: HTMLDivElement | null) => {
    if (el) observerRef.current?.observe(el);
  }, []);

  // Taille de la surface — celle qui porte réellement la transformation.
  // Sert à garder la barre contextuelle à l'écran, et à dire à la
  // mini-carte quelle portion du plateau est visible. La mesurer ICI est
  // la seule façon d'être juste : depuis le parent il faudrait retrancher
  // la barre d'outils à l'estime, et toute dérive de mise en page
  // fausserait le cadre de la mini-carte sans rien signaler.
  // ResizeObserver déclenche son rappel dès l'observation : pas besoin
  // d'une mesure initiale synchrone.
  const [hostBox, setHostBox] = useState({ w: 0, h: 0 });
  const hostW = hostBox.w;
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setHostBox((prev) =>
        Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5
          ? prev
          : { w, h },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (hostBox.w > 0) onCanvasSizeChange?.(hostBox);
  }, [hostBox, onCanvasSizeChange]);

  /** Hauteur à utiliser pour la géométrie : mesurée si connue. */
  const nodeH = useCallback(
    (n: WbBoardNode) => heights[n.id] ?? n.h,
    [heights],
  );

  /** Sélectionner des vignettes désélectionne la flèche, et inversement :
   * sans ça, une flèche cliquée une fois détournait Suppr pour toujours. */
  const selectNodes = useCallback(
    (ids: Set<string>) => {
      setSelectedEdgeId(null);
      onSelectionChange(ids);
    },
    [onSelectionChange],
  );
  // Lien en cours de tracé : nœud source + position courante du pointeur
  const [linking, setLinking] = useState<
    { from: WbBoardNode; x: number; y: number } | null
  >(null);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  /* ---- Flèches à afficher ----
   * Deux flèches réciproques (« sœur » d'un côté, « frère » de l'autre)
   * racontent un seul fait : on les fusionne en UNE flèche à deux pointes,
   * étiquetée des deux mots. Sinon le plateau afficherait un doublon. */
  const displayEdges = useMemo(() => {
    const typeOf = (e: WbBoardEdge) =>
      e.wb_link_id ? (linksById.get(e.wb_link_id)?.link_type ?? null) : e.label || null;
    const out: {
      edge: WbBoardEdge;
      twin: WbBoardEdge | null;
      label: string;
      /** Relation vraie dans les deux sens → une pointe à chaque bout. */
      symmetric: boolean;
    }[] = [];
    const used = new Set<string>();
    // Une même relation tracée deux fois entre les deux mêmes vignettes
    // se superpose au pixel près : invisible à l'œil, mais l'étiquette
    // s'affiche en double. On n'en garde qu'une.
    const drawn = new Set<string>();
    for (const e of edges) {
      if (used.has(e.id)) continue;
      if (e.wb_link_id) {
        const key = `${e.wb_link_id}::${e.from_node_id}::${e.to_node_id}`;
        if (drawn.has(key)) continue;
        drawn.add(key);
      }
      used.add(e.id);
      const et = typeOf(e);
      const twin = e.wb_link_id
        ? (edges.find(
            (f) =>
              !used.has(f.id) &&
              f.wb_link_id &&
              f.from_node_id === e.to_node_id &&
              f.to_node_id === e.from_node_id &&
              areReciprocal(et, typeOf(f)),
          ) ?? null)
        : null;
      if (twin) used.add(twin.id);
      const tt = twin ? typeOf(twin) : null;
      out.push({
        edge: e,
        twin,
        label: tt && tt !== et ? `${et} / ${tt}` : (et ?? ""),
        // Deux pointes = le MÊME fait se lit pareil des deux bords, pas
        // « il existe aussi un lien en sens inverse ». « sœur » l'est :
        // Cybèle sœur de Taram dit qu'ils sont frère et sœur. « père »
        // ne l'est pas — son inverse est « fils », un autre fait — donc
        // même fusionné avec son jumeau il garde UNE pointe, sinon on ne
        // sait plus qui est le père.
        symmetric: areReciprocal(et, et),
      });
    }
    return out;
  }, [edges, linksById]);

  /** Écran → coordonnées du plateau. */
  const toBoard = useCallback(
    (clientX: number, clientY: number) => {
      const r = hostRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return {
        x: (clientX - r.left - viewport.x) / viewport.zoom,
        y: (clientY - r.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport],
  );

  /* ---- Molette : zoom centré sur le pointeur (Maj : défilement) ---- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = host.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;

      // La molette zoome, centré sur le pointeur — c'est le geste attendu
      // sur un plateau. Maj + molette fait défiler latéralement.
      if (e.shiftKey) {
        onViewportChange(
          { ...viewport, x: viewport.x - (e.deltaX || e.deltaY) },
          true,
        );
      } else {
        const factor = Math.exp(-e.deltaY * 0.002);
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
        const k = zoom / viewport.zoom;
        onViewportChange(
          { x: px - (px - viewport.x) * k, y: py - (py - viewport.y) * k, zoom },
          true,
        );
      }
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [viewport, onViewportChange]);

  /* ---- Suppr : retire du PLATEAU les objets ou la flèche sélectionnés.
   * Jamais la fiche, jamais la relation — d'où l'absence de confirmation. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEdgeId) {
          e.preventDefault();
          onDeleteEdge(selectedEdgeId);
          // Une flèche réciproque fusionnée est faite de deux arêtes :
          // les deux partent ensemble, sinon il en resterait la moitié.
          const merged = displayEdges.find(
            (d) => d.edge.id === selectedEdgeId || d.twin?.id === selectedEdgeId,
          );
          const other =
            merged?.edge.id === selectedEdgeId ? merged?.twin?.id : merged?.edge.id;
          if (other && other !== selectedEdgeId) onDeleteEdge(other);
          setSelectedEdgeId(null);
        } else if (selectedIds.size > 0) {
          e.preventDefault();
          onDeleteSelection();
        }
      }
      if (e.key === "Escape") {
        selectNodes(new Set());
        setSelectedEdgeId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    selectedIds,
    selectedEdgeId,
    onDeleteSelection,
    onDeleteEdge,
    selectNodes,
    displayEdges,
  ]);

  /* ---- Lasso de sélection (Maj + glisser sur le fond) ---- */
  function startMarquee(e: React.MouseEvent) {
    const origin = toBoard(e.clientX, e.clientY);
    setMarquee({ x1: origin.x, y1: origin.y, x2: origin.x, y2: origin.y });

    const onMove = (ev: MouseEvent) => {
      const p = toBoard(ev.clientX, ev.clientY);
      setMarquee((m) => (m ? { ...m, x2: p.x, y2: p.y } : m));
      const minX = Math.min(origin.x, p.x);
      const maxX = Math.max(origin.x, p.x);
      const minY = Math.min(origin.y, p.y);
      const maxY = Math.max(origin.y, p.y);
      // Tout objet qui intersecte le lasso est pris.
      const hit = nodes
        .filter(
          (n) =>
            n.x < maxX &&
            n.x + n.w > minX &&
            n.y < maxY &&
            n.y + nodeH(n) > minY,
        )
        .map((n) => n.id);
      selectNodes(new Set(hit));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setMarquee(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /* ---- Déplacement du plateau (glisser le fond) ---- */
  function startPan(e: React.MouseEvent) {
    if (e.button !== 0) return;
    // Maj enfoncée → on trace un lasso au lieu de déplacer le plateau.
    if (e.shiftKey) {
      startMarquee(e);
      return;
    }
    const start = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
    let moved = false;
    // Dernière position calculée : c'est ELLE qu'on persiste au relâchement.
    // Repasser `viewport` (figé à l'appui) annulerait tout le déplacement.
    let last: Viewport = viewport;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      last = { zoom: viewport.zoom, x: start.vx + dx, y: start.vy + dy };
      onViewportChange(last, false);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setPanning(false);
      if (!moved) selectNodes(new Set());
      else onViewportChange(last, true);
    };
    setPanning(true);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /* ---- Déplacement d'un nœud (et de la sélection) ---- */
  function startNodeDrag(e: React.MouseEvent, node: WbBoardNode) {
    if (e.button !== 0) return;
    e.stopPropagation();

    // Double-clic détecté à la main, sur le mousedown. L'événement
    // `dblclick` du navigateur exige que les deux clics atteignent le
    // MÊME élément : le contenu riche d'un texte (paragraphes, marques)
    // et les re-rendus entre les deux clics le rendent capricieux. Le
    // mousedown, lui, arrive toujours — c'est déjà lui qui porte le
    // glisser et la sélection.
    // L'horodatage est porté par l'événement lui-même : pas d'appel à
    // une horloge, donc rien d'impur.
    const now = e.timeStamp;
    const isSecond =
      lastDown.current.id === node.id && now - lastDown.current.t < 450;
    lastDown.current = isSecond ? { id: "", t: 0 } : { id: node.id, t: now };
    if (isSecond) {
      e.preventDefault();
      if (node.kind === "fiche" && node.entry_id) onOpenEntry(node.entry_id);
      else if (node.kind === "postit" || node.kind === "texte")
        onEditPostit(node);
      else if (node.kind === "cadre") onRenameCadre(node);
      return; // pas de glisser sur un double-clic
    }

    // Un déplacement = UNE entrée d'historique, prise avant le premier
    // pixel — pas une par position intermédiaire.
    onBeginHistory();

    // Maj / Ctrl : on ne casse pas la sélection, le clic s'en chargera.
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const ids = selectedIds.has(node.id) ? [...selectedIds] : [node.id];
    if (!selectedIds.has(node.id) && !additive) selectNodes(new Set([node.id]));

    // Un cadre emporte ce qu'il contient : on capture son contenu à
    // l'instant du clic, par géométrie (centre de l'objet dans le cadre).
    // Pas de parenté stockée à tenir à jour — ce qui est dedans est dedans.
    const moving = new Set(ids);
    for (const id of ids) {
      const frame = nodeById.get(id);
      if (!frame || frame.kind !== "cadre") continue;
      for (const other of nodes) {
        if (other.id === frame.id || moving.has(other.id)) continue;
        const cx = other.x + other.w / 2;
        const cy = other.y + nodeH(other) / 2;
        if (
          cx > frame.x &&
          cx < frame.x + frame.w &&
          cy > frame.y &&
          cy < frame.y + nodeH(frame)
        ) {
          moving.add(other.id);
        }
      }
    }

    const origins = new Map(
      [...moving]
        .map((id) => nodeById.get(id))
        .filter(Boolean)
        .map((n) => [n!.id, { x: n!.x, y: n!.y }]),
    );
    const start = { x: e.clientX, y: e.clientY };

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - start.x) / viewport.zoom;
      const dy = (ev.clientY - start.y) / viewport.zoom;
      for (const [id, o] of origins) onMoveNode(id, o.x + dx, o.y + dy);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /* ---- Redimensionnement (poignée du coin) ---- */
  function startResize(e: React.MouseEvent, node: WbBoardNode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onBeginHistory();
    const start = { x: e.clientX, y: e.clientY, w: node.w, h: node.h };
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - start.x) / viewport.zoom;
      const dy = (ev.clientY - start.y) / viewport.zoom;
      onResizeNode(
        node.id,
        Math.max(80, start.w + dx),
        Math.max(60, start.h + dy),
      );
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /* ---- Tracé d'un lien depuis la poignée d'une vignette ---- */
  function startLinking(e: React.MouseEvent, from: WbBoardNode) {
    e.stopPropagation();
    e.preventDefault();
    const p = toBoard(e.clientX, e.clientY);
    setLinking({ from, x: p.x, y: p.y });

    const onMove = (ev: MouseEvent) => {
      const q = toBoard(ev.clientX, ev.clientY);
      setLinking((l) => (l ? { ...l, x: q.x, y: q.y } : l));
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const targetEl = (el as HTMLElement | null)?.closest("[data-node-id]");
      const targetId = targetEl?.getAttribute("data-node-id");
      const target = targetId ? nodeById.get(targetId) : null;
      setLinking(null);
      // Tout objet est une cible valide — sauf un cadre, qui est un
      // contenant et non un élément qu'on relie.
      if (target && target.id !== from.id && target.kind !== "cadre") {
        onStartLink(from, target);
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /* ---- Géométrie d'une arête : bord à bord entre deux nœuds ---- */
  function edgeGeometry(a: WbBoardNode, b: WbBoardNode) {
    const ah = nodeH(a);
    const bh = nodeH(b);
    const ax = a.x + a.w / 2;
    const ay = a.y + ah / 2;
    const bx = b.x + b.w / 2;
    const by = b.y + bh / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const clip = (n: WbBoardNode, sx: number, sy: number) => {
      if (dx === 0 && dy === 0) return { x: sx, y: sy };
      const hw = n.w / 2;
      const hh = nodeH(n) / 2;
      const t = Math.min(
        dx === 0 ? Infinity : hw / Math.abs(dx),
        dy === 0 ? Infinity : hh / Math.abs(dy),
      );
      return { x: sx + dx * t, y: sy + dy * t };
    };
    const p1 = clip(a, ax, ay);
    const p2 = (() => {
      const c = clip(b, bx, by);
      return { x: bx - (c.x - bx), y: by - (c.y - by) };
    })();
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }

  return (
    <div
      ref={hostRef}
      onMouseDown={startPan}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.boardBg) {
          onBackgroundDoubleClick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const entryId = e.dataTransfer.getData("application/x-autris-entry");
        if (!entryId) return;
        const p = toBoard(e.clientX, e.clientY);
        onDropEntry(entryId, p.x - 100, p.y - 58);
      }}
      className="relative flex-1 min-w-0 overflow-hidden select-none"
      style={{
        background: "var(--bg)",
        cursor: linking ? "crosshair" : panning ? "grabbing" : "grab",
        outline: dragOver ? "2px dashed var(--accent)" : undefined,
        outlineOffset: "-6px",
      }}
    >
      {/* Grille de points, solidaire du plan */}
      <div
        data-board-bg="1"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--text-4) 45%, transparent) 1px, transparent 1px)",
          backgroundSize: `${28 * viewport.zoom}px ${28 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      {/* Liens — SVG dans le même plan que les objets */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{
          overflow: "visible",
          pointerEvents: "none",
          // Au-dessus des objets : sans cela un cadre, qui couvre toute
          // sa surface, masquait les flèches qu'il contient. Les traits
          // s'arrêtent au bord des vignettes, donc rien ne se dessine
          // par-dessus — seule la capture des clics change.
          zIndex: 2,
        }}
      >
        <defs>
          <marker
            id="board-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
        </defs>
        <g
          transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}
        >
          {displayEdges.map(({ edge, twin, label, symmetric }) => {
            const a = nodeById.get(edge.from_node_id);
            const b = nodeById.get(edge.to_node_id);
            if (!a || !b) return null;
            const g = edgeGeometry(a, b);

            // Plusieurs relations DISTINCTES entre les deux mêmes fiches
            // (« frère » ET « rival »…) se superposeraient trait pour
            // trait. On les écarte en éventail de part et d'autre.
            const pairKey = [edge.from_node_id, edge.to_node_id]
              .slice()
              .sort()
              .join("|");
            const siblings = displayEdges.filter(
              (o) =>
                [o.edge.from_node_id, o.edge.to_node_id]
                  .slice()
                  .sort()
                  .join("|") === pairKey,
            );
            const rank = siblings.findIndex((o) => o.edge.id === edge.id);
            const spread = (rank - (siblings.length - 1) / 2) * 34;
            const isSel =
              selectedEdgeId === edge.id ||
              (!!twin && selectedEdgeId === twin.id);

            // Le tracé passe par un point que l'on peut déplacer à la
            // souris (waypoints). Tant qu'il n'a pas été touché, on écarte
            // automatiquement les flèches qui relient les deux mêmes
            // fiches, pour qu'elles ne se superposent pas d'emblée.
            const vx = g.x2 - g.x1;
            const vy = g.y2 - g.y1;
            const len = Math.hypot(vx, vy) || 1;
            const nx = -vy / len;
            const ny = vx / len;
            const baseX = (g.x1 + g.x2) / 2;
            const baseY = (g.y1 + g.y2) / 2;

            // Le point est relatif aux extrémités : il suit les fiches.
            // On ignore tout tracé illisible (ancien format absolu) plutôt
            // que de produire des coordonnées invalides — auquel cas la
            // flèche entière disparaîtrait du plateau.
            const raw = edge.waypoints?.[0] as
              | { t?: number; o?: number }
              | undefined;
            const wp =
              raw && Number.isFinite(raw.t) && Number.isFinite(raw.o)
                ? { t: raw.t as number, o: raw.o as number }
                : null;
            const ux = vx / len;
            const uy = vy / len;
            const along = wp ? wp.t * len : 0;
            const perp = wp ? wp.o : spread;
            const mx = baseX + ux * along + nx * perp;
            const my = baseY + uy * along + ny * perp;
            // Une quadratique passe à mi-chemin de son contrôle : on
            // remonte donc au contrôle depuis le point voulu.
            const cx = 2 * mx - baseX;
            const cy = 2 * my - baseY;
            // Dernier garde-fou : une seule coordonnée non finie suffirait
            // à rendre le chemin invalide, donc invisible.
            const ok = [g.x1, g.y1, g.x2, g.y2, cx, cy].every(Number.isFinite);
            const d = ok
              ? `M ${g.x1} ${g.y1} Q ${cx} ${cy} ${g.x2} ${g.y2}`
              : `M ${g.x1} ${g.y1} L ${g.x2} ${g.y2}`;

            // Une flèche suit le sort de ses extrémités : reliée à une
            // vignette mise en retrait, elle s'estompe avec elle.
            const dim =
              dimmedIds?.has(edge.from_node_id) || dimmedIds?.has(edge.to_node_id);

            return (
              <g
                key={edge.id}
                style={{
                  opacity: dim ? 0.12 : 1,
                  transition: "opacity 140ms ease",
                }}
              >
                {/* Zone de clic généreuse, invisible */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onMouseDown={(ev) => {
                    ev.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    onSelectionChange(new Set());
                  }}
                  onDoubleClick={(ev) => {
                    ev.stopPropagation();
                    // Seule une flèche libre porte une étiquette qu'on
                    // écrit : celle d'un lien typé vient de la relation.
                    if (!edge.wb_link_id) onRenameEdge(edge);
                  }}
                >
                  <title>
                    {edge.wb_link_id
                      ? `Relation « ${label} » — Suppr retire la flèche du plateau, la relation reste dans les fiches`
                      : "Flèche libre — double-clic pour l'étiqueter, Suppr pour la retirer"}
                  </title>
                </path>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={isSel ? 3 : 1.6}
                  strokeDasharray={edge.wb_link_id ? undefined : "5 4"}
                  markerEnd="url(#board-arrow)"
                  // Relation réciproque : une pointe de chaque côté.
                  markerStart={symmetric ? "url(#board-arrow)" : undefined}
                  style={{ pointerEvents: "none" }}
                />
                {label && (
                  /* L'étiquette est la cible la plus facile à viser : elle
                     doit sélectionner la flèche. Le <svg> parent est en
                     pointer-events:none, il faut donc le rétablir ici. */
                  <g
                    style={{ pointerEvents: "all", cursor: "pointer" }}
                    onMouseDown={(ev) => {
                      ev.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      onSelectionChange(new Set());
                    }}
                  >
                    <rect
                      x={mx - label.length * 3.4 - 6}
                      y={my - 9}
                      width={label.length * 6.8 + 12}
                      height={18}
                      rx={9}
                      fill="var(--bg-3)"
                      stroke={isSel ? "var(--accent)" : "var(--accent-border)"}
                      strokeWidth={isSel ? 1.6 : 1}
                    />
                    <text
                      x={mx}
                      y={my + 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--accent)"
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        userSelect: "none",
                      }}
                    >
                      {label}
                    </text>
                    <title>
                      Relation « {label} » — cliquer pour la sélectionner
                    </title>
                  </g>
                )}

                {/* Poignée de tracé — apparaît sur la flèche sélectionnée.
                    On la glisse pour dessiner la courbe où l'on veut. */}
                {isSel && (
                  <circle
                    cx={mx}
                    cy={my}
                    r={6}
                    fill="var(--accent)"
                    stroke="var(--bg)"
                    strokeWidth={2}
                    style={{ pointerEvents: "all", cursor: "grab" }}
                    onMouseDown={(ev) => {
                      ev.stopPropagation();
                      ev.preventDefault();
                      onBeginHistory();
                      const onMove = (m: MouseEvent) => {
                        const p = toBoard(m.clientX, m.clientY);
                        // On repasse en coordonnées relatives à l'axe.
                        const rx = p.x - baseX;
                        const ry = p.y - baseY;
                        onSetEdgeWaypoint(edge.id, {
                          t: (rx * ux + ry * uy) / len,
                          o: rx * nx + ry * ny,
                        });
                      };
                      const onUp = () => {
                        document.removeEventListener("mousemove", onMove);
                        document.removeEventListener("mouseup", onUp);
                      };
                      document.addEventListener("mousemove", onMove);
                      document.addEventListener("mouseup", onUp);
                    }}
                    onDoubleClick={(ev) => {
                      // Double-clic : la flèche redevient droite.
                      ev.stopPropagation();
                      onSetEdgeWaypoint(edge.id, null);
                    }}
                  >
                    <title>
                      Glisser pour dessiner la flèche · double-clic pour la
                      redresser
                    </title>
                  </circle>
                )}
              </g>
            );
          })}

          {/* Lien en cours de tracé */}
          {linking && (
            <line
              x1={linking.from.x + linking.from.w / 2}
              y1={linking.from.y + linking.from.h / 2}
              x2={linking.x}
              y2={linking.y}
              stroke="var(--accent)"
              strokeWidth={1.6}
              strokeDasharray="4 4"
            />
          )}

          {/* Lasso de sélection */}
          {marquee && (
            <rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill="color-mix(in srgb, var(--accent) 12%, transparent)"
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          )}
        </g>
      </svg>

      {/* Objets — plan transformé */}
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
          zIndex: 1,
        }}
      >
        {/* Tri par profondeur : les cartes (z négatif) passent dessous. */}
        {[...nodes]
          .sort((a, b) => a.z - b.z)
          .map((node) => {
          const selected = selectedIds.has(node.id);
          const entry = node.entry_id ? entriesById.get(node.entry_id) : null;
          const isMap = isMapEntry(entry);
          // Tout ce dont la taille est un choix de mise en page.
          const resizable =
            isMap ||
            node.kind === "forme" ||
            node.kind === "image" ||
            node.kind === "postit" ||
            node.kind === "cadre";
          // Hauteur ferme pour ces mêmes objets ; le texte et les fiches
          // épousent leur contenu.
          const fixedHeight =
            isMap ||
            node.kind === "forme" ||
            node.kind === "image" ||
            node.kind === "cadre";
          const copies = node.entry_id
            ? nodes.filter((n) => n.entry_id === node.entry_id).length
            : 1;
          return (
            <div
              key={node.id}
              data-node-id={node.id}
              onMouseDown={(e) => startNodeDrag(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                // Maj / Ctrl : ajoute ou retire de la sélection.
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                  const next = new Set(selectedIds);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  selectNodes(next);
                } else {
                  selectNodes(new Set([node.id]));
                }
              }}
              // Capture : le contenu d'un texte ou d'un post-it est du
              // HTML riche (paragraphes, marques). En phase de bulle, ces
              // enfants avalent le double-clic et l'objet ne s'ouvre
              // jamais — exactement le piège déjà rencontré sur les cases
              // du chapitrage.
              ref={observeNode}
              className="absolute group"
              style={{
                left: node.x,
                top: node.y,
                width: node.w,
                // Une carte a une hauteur ferme (l'image la remplit) ;
                // une fiche épouse strictement son contenu — sinon la
                // boîte dépasse la vignette visible et laisse un vide.
                ...(fixedHeight ? { height: node.h } : {}),
                cursor: "grab",
                opacity: dimmedIds?.has(node.id) ? 0.16 : 1,
                transition: "opacity 140ms ease",
              }}
            >
              {node.kind === "cadre" ? (
                <CadreBody
                  node={node}
                  selected={selected}
                  onRename={() => onRenameCadre(node)}
                />
              ) : node.kind === "postit" ? (
                <PostitBody node={node} selected={selected} />
              ) : node.kind === "texte" ? (
                <TexteBody node={node} selected={selected} />
              ) : node.kind === "forme" ? (
                <FormeBody node={node} selected={selected} />
              ) : node.kind === "image" ? (
                <ImageBody node={node} selected={selected} />
              ) : isMap && entry ? (
                <MapBody entry={entry} selected={selected} />
              ) : (
                <FicheBody
                  entry={entry ?? null}
                  selected={selected}
                  expanded={expandedId === node.id}
                  copies={copies}
                  color={(node.style.color as string) ?? "var(--accent)"}
                />
              )}

              {/* Poignée de redimensionnement — pour tout ce dont la taille
                  est un choix : cartes, formes, images, post-its. Une
                  vignette fiche, elle, épouse son contenu. */}
              {resizable && (
                <button
                  type="button"
                  onMouseDown={(e) => startResize(e, node)}
                  title="Redimensionner"
                  aria-label="Redimensionner"
                  // Double flèche en diagonale, comme dans Photoshop : le
                  // geste se lit sans légende, et rien ne l'apparente aux
                  // points de liaison, ronds et dorés, posés sur les bords.
                  className="absolute flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none bg-transparent z-10"
                  style={{
                    cursor: "nwse-resize",
                    color: "var(--text-2)",
                    // Même compensation que les points : taille constante
                    // à l'écran quel que soit le zoom du plateau.
                    left: "100%",
                    top: "100%",
                    width: RESIZE_PX / viewport.zoom,
                    height: RESIZE_PX / viewport.zoom,
                    marginLeft: -RESIZE_PX / 2 / viewport.zoom,
                    marginTop: -RESIZE_PX / 2 / viewport.zoom,
                    // Le cadre laisse passer les clics : sa poignée, elle,
                    // doit rester saisissable.
                    pointerEvents: "auto",
                  }}
                >
                  <svg
                    width={RESIZE_PX / viewport.zoom}
                    height={RESIZE_PX / viewport.zoom}
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    {/* Halo sombre : la flèche reste lisible sur une image
                        ou une forme claire. */}
                    <g
                      stroke="var(--bg)"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {/* Diagonale haut-gauche → bas-droite : le même axe
                          que le coin où vit la poignée, et que le curseur
                          nwse-resize. Dans l'autre sens, la flèche
                          contredisait le geste. */}
                      <path d="M4 4L10 10M4 4V7.4M4 4H7.4M10 10V6.6M10 10H6.6" />
                    </g>
                    <g
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {/* Diagonale haut-gauche → bas-droite : le même axe
                          que le coin où vit la poignée, et que le curseur
                          nwse-resize. Dans l'autre sens, la flèche
                          contredisait le geste. */}
                      <path d="M4 4L10 10M4 4V7.4M4 4H7.4M10 10V6.6M10 10H6.6" />
                    </g>
                  </svg>
                </button>
              )}

              {/* Points de liaison — un par côté, pour tirer depuis le
                  bord le plus proche de sa cible. RONDS et dorés : à ne
                  pas confondre avec la poignée de taille, carrée et
                  neutre, qui vit dans le coin. */}
              {node.kind !== "cadre" &&
                LINK_PORTS.map((port) => (
                  <button
                    key={port.side}
                    type="button"
                    onMouseDown={(e) => startLinking(e, node)}
                    title={
                      node.kind === "fiche"
                        ? "Tirer un lien vers un autre objet"
                        : "Tirer une flèche vers un autre objet"
                    }
                    aria-label={`Tirer un lien depuis le bord ${port.label}`}
                    className="absolute rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair border-none"
                    style={{
                      background: "var(--accent)",
                      boxShadow: `0 0 0 ${2 / viewport.zoom}px var(--bg)`,
                      // Dimensions divisées par le zoom : le point garde
                      // la même taille à l'écran, de 20 % à 250 %.
                      left: port.x,
                      top: port.y,
                      width: PORT_PX / viewport.zoom,
                      height: PORT_PX / viewport.zoom,
                      marginLeft: -PORT_PX / 2 / viewport.zoom,
                      marginTop: -PORT_PX / 2 / viewport.zoom,
                    }}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* Outils contextuels — collés à la sélection, au-dessus si la place
          le permet, sinon en dessous. Évite d'aller chercher la barre du
          haut à l'autre bout de l'écran. */}
      {selectionToolbar &&
        selectedIds.size > 0 &&
        (() => {
          const sel = nodes.filter((n) => selectedIds.has(n.id));
          if (sel.length === 0) return null;
          const minX = Math.min(...sel.map((n) => n.x));
          const maxX = Math.max(...sel.map((n) => n.x + n.w));
          const minY = Math.min(...sel.map((n) => n.y));
          const maxY = Math.max(...sel.map((n) => n.y + nodeH(n)));

          // Plateau → écran
          const cx = ((minX + maxX) / 2) * viewport.zoom + viewport.x;
          const top = minY * viewport.zoom + viewport.y;
          const bottom = maxY * viewport.zoom + viewport.y;

          const above = top > 56;

          return (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute z-40 flex items-center gap-0.5 px-1.5 py-1 rounded-[var(--radius-md)] shadow-xl"
              style={{
                left: hostW ? Math.min(Math.max(cx, 90), hostW - 90) : cx,
                top: above ? top - 10 : bottom + 10,
                transform: `translate(-50%, ${above ? "-100%" : "0"})`,
                background: "var(--bg-3)",
                border: "1px solid var(--border-soft)",
              }}
            >
              {selectionToolbar}
            </div>
          );
        })()}
    </div>
  );
}

/* ---------- Corps d'une vignette « Carte » : l'image, en grand ---------- */
function MapBody({
  entry,
  selected,
}: {
  entry: WbEntry;
  selected: boolean;
}) {
  return (
    <div
      className="w-full h-full rounded-[var(--radius-md)] overflow-hidden relative"
      style={{
        border: `1.5px solid ${selected ? "var(--accent)" : "var(--border-soft)"}`,
        boxShadow: selected ? "0 0 0 3px var(--accent-bg)" : "var(--shadow-md)",
        background: "var(--bg-2)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.main_image_url!}
        alt={entry.title}
        draggable={false}
        className="w-full h-full object-contain select-none"
      />
      {/* Titre en cartouche discret, pour ne pas manger la carte */}
      <div
        className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full text-[11px] font-serif pointer-events-none max-w-[80%] truncate"
        style={{
          background: "color-mix(in srgb, var(--bg) 78%, transparent)",
          border: "1px solid var(--border-soft)",
          color: "var(--text-1)",
          backdropFilter: "blur(4px)",
        }}
      >
        🗺️ {entry.title}
      </div>
    </div>
  );
}

/* ---------- Corps d'une vignette fiche ---------- */
function FicheBody({
  entry,
  selected,
  expanded,
  copies,
  color,
}: {
  entry: WbEntry | null;
  selected: boolean;
  expanded: boolean;
  copies: number;
  /** Couleur de la fiche — sert à trier l'univers à l'œil. */
  color: string;
}) {
  const cat = entry ? getCategoryDef(entry.category) : undefined;

  // Un personnage se reconnaît à son visage, pas à son nom : on lui donne
  // son portrait en grand, carré, au-dessus du nom. Les autres fiches
  // gardent la vignette compacte — une pastille suffit à les situer.
  const portrait =
    entry?.category === "personnages" && !!entry.main_image_url;

  const identity = (
    <div className="min-w-0 flex-1">
      <div
        className="font-serif text-[15px] leading-tight truncate"
        style={{ color: "var(--text-1)" }}
        title={entry?.title}
      >
        {entry?.title ?? "Fiche introuvable"}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: "var(--text-4)" }}>
        {cat?.label ?? "—"}
        {copies > 1 && (
          <span
            className="ml-1.5 px-1 rounded"
            style={{
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              color,
            }}
            title={`Cette fiche est posée ${copies} fois sur le plateau`}
          >
            ×{copies}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="w-full rounded-[var(--radius-md)] overflow-hidden"
      style={{
        background: "var(--bg-3)",
        // La sélection garde l'accent : c'est un état de l'interface, pas
        // une propriété de la fiche. Les deux ne doivent pas se confondre.
        border: selected
          ? "1.5px solid var(--accent)"
          : `1.5px solid color-mix(in srgb, ${color} 40%, var(--border-soft))`,
        boxShadow: selected ? "0 0 0 3px var(--accent-bg)" : "var(--shadow-md)",
      }}
    >
      <div style={{ height: 3, background: color }} />

      {portrait ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.main_image_url!}
            alt={entry.title}
            draggable={false}
            className="w-full aspect-square object-cover block select-none"
            style={{ background: "var(--bg-2)" }}
          />
          <div className="px-2.5 py-2">{identity}</div>
        </>
      ) : (
        <div className="flex items-start gap-2 p-2.5">
          <div
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[14px] overflow-hidden"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border-soft)" }}
          >
            {entry?.main_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.main_image_url}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <span>{cat?.icon ?? "📄"}</span>
            )}
          </div>
          {identity}
        </div>
      )}

      {/* Aperçu compact — déplié au clic simple */}
      {expanded && entry && (
        <div
          className="px-2.5 pb-2.5 pt-0 flex flex-col gap-1.5"
          style={{ borderTop: "1px solid var(--border-soft)" }}
        >
          {entry.subtitle && (
            <div
              className="text-[11px] italic pt-1.5"
              style={{ color: "var(--text-3)" }}
            >
              {entry.subtitle}
            </div>
          )}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: `color-mix(in srgb, ${color} 15%, transparent)`,
                    color,
                    border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="text-[9.5px]" style={{ color: "var(--text-4)" }}>
            Double-clic pour ouvrir la fiche
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Corps d'un cadre nommé ---------- */
function CadreBody({
  node,
  selected,
  onRename,
}: {
  node: WbBoardNode;
  selected: boolean;
  onRename: () => void;
}) {
  const color = (node.style.color as string) ?? "#D9A25F";
  const title = (node.content.title as string) ?? "";
  return (
    // L'intérieur laisse passer les clics : sans cela, le cadre — qui est
    // peint par-dessus la couche des liens — avalerait tous les clics sur
    // les flèches et les objets qu'il contient. On l'attrape par son
    // étiquette, comme dans les outils de tableau blanc.
    <div className="w-full h-full relative" style={{ minHeight: node.h }}>
      <button
        onDoubleClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        title="Glisser pour déplacer le cadre et son contenu · double-clic pour renommer"
        className="absolute -top-5 left-0 max-w-full truncate px-2 py-0.5 rounded-t-[4px] text-[11px] font-serif cursor-grab border-none"
        style={{
          background: `color-mix(in srgb, ${color} 22%, transparent)`,
          border: `1px solid ${color}`,
          borderBottom: "none",
          color: "var(--text-1)",
          pointerEvents: "auto",
        }}
      >
        {title || <span style={{ opacity: 0.5 }}>Sans nom</span>}
      </button>
      <div
        className="w-full h-full"
        style={{
          border: `1.5px ${selected ? "solid" : "dashed"} ${color}`,
          borderRadius: 6,
          background: `color-mix(in srgb, ${color} 5%, transparent)`,
          boxShadow: selected ? "0 0 0 2.5px var(--accent-bg)" : undefined,
        }}
      />
    </div>
  );
}

/* ---------- Corps d'un texte libre ---------- */
function TexteBody({ node, selected }: { node: WbBoardNode; selected: boolean }) {
  const size = (node.style.fontSize as number) ?? 20;
  const color = (node.style.color as string) ?? "var(--text-1)";
  const html = (node.content.html as string) ?? "";
  return (
    <div
      className="w-full px-1 py-0.5 font-serif leading-snug break-words"
      style={{
        fontSize: size,
        color,
        outline: selected ? "1.5px solid var(--accent)" : undefined,
        outlineOffset: 2,
        borderRadius: 3,
      }}
      dangerouslySetInnerHTML={{
        __html:
          html ||
          `<span style="opacity:.45">Double-clic pour écrire…</span>`,
      }}
    />
  );
}

/* ---------- Corps d'une forme ---------- */
function FormeBody({ node, selected }: { node: WbBoardNode; selected: boolean }) {
  const shape = (node.style.shape as string) ?? "rect";
  const fill = (node.style.fill as string) ?? "rgba(217,162,95,0.14)";
  const stroke = (node.style.stroke as string) ?? "var(--accent)";
  const radius = shape === "ellipse" ? "50%" : shape === "round" ? 14 : 4;
  return (
    <div
      className="w-full h-full"
      style={{
        background: fill,
        border: `1.5px solid ${stroke}`,
        borderRadius: radius,
        minHeight: node.h,
        boxShadow: selected ? "0 0 0 2.5px var(--accent-bg)" : undefined,
        outline: selected ? "1.5px solid var(--accent)" : undefined,
        outlineOffset: 2,
      }}
    />
  );
}

/* ---------- Corps d'une image libre ---------- */
function ImageBody({ node, selected }: { node: WbBoardNode; selected: boolean }) {
  const url = (node.content.url as string) ?? "";
  return (
    <div
      className="w-full h-full rounded-[var(--radius-md)] overflow-hidden"
      style={{
        border: `1.5px solid ${selected ? "var(--accent)" : "var(--border-soft)"}`,
        boxShadow: selected ? "0 0 0 3px var(--accent-bg)" : "var(--shadow-md)",
        background: "var(--bg-2)",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          draggable={false}
          className="w-full h-full object-contain select-none"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[11px] text-text-quaternary">
          Image
        </div>
      )}
    </div>
  );
}

/* ---------- Corps d'un post-it ---------- */
function PostitBody({ node, selected }: { node: WbBoardNode; selected: boolean }) {
  const color = (node.style.color as string) ?? "#E8C77A";
  const html = (node.content.html as string) ?? "";
  return (
    <div
      className="w-full h-full p-3 text-[12px] leading-snug"
      style={{
        background: color,
        color: "#3A2E14",
        minHeight: node.h,
        boxShadow: selected
          ? `0 0 0 2px var(--accent), var(--shadow-md)`
          : "var(--shadow-md)",
        borderRadius: 3,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
