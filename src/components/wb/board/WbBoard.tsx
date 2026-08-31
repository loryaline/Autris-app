"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WbBoardEdge, WbBoardNode, WbEntry, WbLink } from "@/types/database";
import { useBoard } from "./useBoard";
import {
  WbBoardCanvas,
  defaultNodeBox,
  LAYOUT_STEP,
  type Viewport,
} from "./WbBoardCanvas";
import { LinkTypePicker } from "./LinkTypePicker";
import { BoardMiniMap } from "./BoardMiniMap";
import { BoardHelp } from "./BoardHelp";
import {
  BoardFinder,
  EMPTY_FILTER,
  dimmedByFilter,
  type BoardFilter,
} from "./BoardFinder";
import { RichEditableCell } from "@/components/planning/RichEditableCell";
import { createClient } from "@/lib/supabase/client";
import { appConfirm } from "@/lib/app-confirm";
import { customLinkTypes, generationGap, isFamilyType } from "@/lib/wb-constants";

/**
 * Le plateau complet : surface + barre d'outils + création de liens.
 *
 * Assemble useBoard (données) et WbBoardCanvas (rendu / gestes).
 */

/** Hauteur de la barre d'outils, à retrancher pour cadrer le plateau. */
const TOOLBAR_H = 44;

/** Petit bouton icône de la barre contextuelle (alignement, distribution). */
function IconButton({
  onClick,
  title,
  path,
  disabled = false,
}: {
  onClick: () => void;
  title: string;
  path: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors bg-transparent border-none text-text-tertiary hover:text-[var(--color-accent)] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-tertiary disabled:hover:bg-transparent"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d={path}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** Bouton d'ordre d'empilement (arrière-plan / reculer / avancer / premier plan). */
function OrderButton({
  onClick,
  title,
  dir,
  toEnd = false,
}: {
  onClick: () => void;
  title: string;
  /** "up" = vers le premier plan, "down" = vers l'arrière-plan. */
  dir: "up" | "down";
  /** true = jusqu'au bout de la pile (trait de butée dessiné). */
  toEnd?: boolean;
}) {
  const arrow =
    dir === "up" ? "M7 10.5V4M7 4L4.5 6.5M7 4L9.5 6.5" : "M7 3.5V10M7 10L4.5 7.5M7 10L9.5 7.5";
  const stop = dir === "up" ? "M3 2H11" : "M3 12H11";
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors bg-transparent border-none text-text-tertiary hover:text-[var(--color-accent)] hover:bg-white/[0.05]"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d={arrow}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {toEnd && (
          <path d={stop} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

/** Une option du menu « Déplier » : un titre, une explication. */
function ExpandOption({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3.5 py-2 cursor-pointer bg-transparent border-none hover:bg-white/[0.05] transition-colors"
    >
      <div className="text-[13px]" style={{ color: "var(--text-1)" }}>
        {title}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-4)" }}>
        {desc}
      </div>
    </button>
  );
}

/** Bouton de la barre du haut (créer un objet). */
function ToolButton({
  onClick,
  title,
  children,
  active = false,
  disabled = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-sm)] text-[12px] cursor-pointer transition-colors disabled:opacity-50"
      style={{
        background: active ? "var(--accent-bg)" : "var(--bg-3)",
        border: `1px solid ${active ? "var(--accent-border)" : "var(--border-soft)"}`,
        color: active ? "var(--accent)" : "var(--text-2)",
      }}
    >
      {children}
    </button>
  );
}

/** Une entrée du menu « Ajouter » : une icône, un nom, ce que ça fait. */
function AddItem({
  label,
  hint,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer bg-transparent border-none hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-default"
    >
      <span
        className="w-5 flex items-center justify-center shrink-0"
        style={{ color: "var(--text-3)" }}
      >
        {children}
      </span>
      <span className="min-w-0">
        <span
          className="block text-[12.5px] leading-tight"
          style={{ color: "var(--text-1)" }}
        >
          {label}
        </span>
        <span
          className="block text-[10.5px] leading-tight mt-0.5"
          style={{ color: "var(--text-4)" }}
        >
          {hint}
        </span>
      </span>
    </button>
  );
}

const POSTIT_COLORS = [
  "#E8C77A",
  "#E8A87C",
  "#C7E8A0",
  "#A0D2E8",
  "#D6BCE8",
  "#E8E0C0",
];

/** Couleurs des formes : un fond très pâle, un contour franc. */
const SHAPE_COLORS = [
  { label: "Or", fill: "rgba(217,162,95,0.12)", stroke: "#D9A25F" },
  { label: "Menthe", fill: "rgba(93,202,165,0.12)", stroke: "#5DCAA5" },
  { label: "Bleu", fill: "rgba(96,165,250,0.12)", stroke: "#60A5FA" },
  { label: "Lavande", fill: "rgba(192,132,252,0.12)", stroke: "#C084FC" },
  { label: "Rouge", fill: "rgba(224,85,85,0.12)", stroke: "#E05555" },
  { label: "Neutre", fill: "rgba(255,255,255,0.05)", stroke: "#8A91A1" },
];

export function WbBoard({
  projectId,
  entries,
  links,
  onOpenEntry,
  onBackgroundDoubleClick,
  onLinkCreated,
  onPlacedEntriesChange,
}: {
  projectId: string;
  entries: WbEntry[];
  links: WbLink[];
  onOpenEntry: (entryId: string) => void;
  onBackgroundDoubleClick: () => void;
  /** Remonte la relation créée depuis le plateau, pour que les fiches l'affichent. */
  onLinkCreated: (link: WbLink) => void;
  /** Remonte les fiches déjà posées, pour que la Palette les signale. */
  onPlacedEntriesChange?: (ids: Set<string>) => void;
}) {
  const board = useBoard(projectId);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [viewportReady, setViewportReady] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // On ne garde QUE l'identifiant : une copie du nœud se périmerait dès
  // la première frappe, et la réinjecter (au clic sur une couleur, par
  // exemple) effacerait le texte en cours de saisie.
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showExpandMenu, setShowExpandMenu] = useState(false);
  // Message fugace : dire ce qui vient de se passer quand le plateau,
  // lui, ne bouge pas — « rien n'est apparu » ne doit jamais rester
  // ambigu entre une panne et un plateau déjà complet.
  const [flash, setFlash] = useState<string | null>(null);
  // Filtrer est un point de vue, jamais une modification : rien n'est écrit.
  const [filter, setFilter] = useState<BoardFilter>(EMPTY_FILTER);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [flash]);
  const [renamingCadre, setRenamingCadre] = useState<
    { node: WbBoardNode; value: string } | null
  >(null);
  const [renamingEdge, setRenamingEdge] = useState<
    { edge: WbBoardEdge; value: string } | null
  >(null);
  // Plateaux multiples : sélecteur, création, renommage
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState<string | null>(null);
  const [renamingBoard, setRenamingBoard] = useState<
    { id: string; value: string } | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingLink, setPendingLink] = useState<
    { from: WbBoardNode; to: WbBoardNode; anchor: { top: number; left: number } } | null
  >(null);
  const hostRef = useRef<HTMLDivElement>(null);

  // Viewport initial : celui enregistré, une seule fois au chargement.
  if (!viewportReady && board.board) {
    const v = board.board.viewport;
    if (v && typeof v.zoom === "number") {
      // Le viewport stocké est en coordonnées écran ; on le reprend tel quel.
      setViewport({ x: v.x, y: v.y, zoom: v.zoom });
    }
    setViewportReady(true);
  }

  const entriesById = useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries],
  );
  const linksById = useMemo(() => new Map(links.map((l) => [l.id, l])), [links]);
  // Le vocabulaire propre au projet, à reproposer au lieu de le réécrire.
  const ownTypes = useMemo(() => customLinkTypes(links), [links]);

  // Signale à la Palette quelles fiches sont déjà posées.
  const placedKey = board.nodes
    .map((n) => n.entry_id)
    .filter(Boolean)
    .sort()
    .join(",");
  useEffect(() => {
    if (!onPlacedEntriesChange) return;
    onPlacedEntriesChange(
      new Set(placedKey ? placedKey.split(",") : []),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedKey]);

  /** Nœud en cours d'édition, lu dans l'état du plateau (jamais copié). */
  const editingPostit = editingNodeId
    ? (board.nodes.find((n) => n.id === editingNodeId) ?? null)
    : null;

  /* ---- Saisie d'un texte / post-it ----
   * Une session d'édition = UNE entrée d'historique, prise à
   * l'ouverture. Les frappes s'enregistrent ensuite en silence, avec un
   * léger différé pour ne pas écrire à chaque lettre. */
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (editingNodeId) board.beginHistory();
    // On ne veut réagir qu'à l'ouverture d'une session d'édition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingNodeId]);

  const saveDraft = useCallback(
    (node: WbBoardNode, html: string) => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        board.updateNodeQuiet(node.id, {
          content: { ...node.content, html },
        });
      }, 350);
    },
    [board],
  );

  // Le dernier jet ne doit pas mourir avec le composant.
  useEffect(() => {
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleViewport = useCallback(
    (v: Viewport, persist: boolean) => {
      setViewport(v);
      if (!persist) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => board.saveViewport(v), 800);
    },
    [board],
  );

  /** Hauteurs réelles des vignettes, mesurées par la surface. */
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({});

  // Taille de la SURFACE, rapportée par elle-même (cf. WbBoardCanvas).
  // La déduire ici — hauteur du conteneur moins TOOLBAR_H — revenait à
  // parier sur la mise en page, et le cadre de la mini-carte payait
  // chaque écart sans que rien ne le signale.
  const [hostSize, setHostSize] = useState({ w: 0, h: 0 });

  const canvasSize = useCallback(() => {
    const r = hostRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 800, h: (r?.height ?? 600) - TOOLBAR_H };
  }, []);

  /** Centre du plateau à l'écran, pour y déposer un nouvel objet. */
  const centerOfView = useCallback(() => {
    const { w, h } = canvasSize();
    return {
      x: (w / 2 - viewport.x) / viewport.zoom,
      y: (h / 2 - viewport.y) / viewport.zoom,
    };
  }, [viewport, canvasSize]);

  /** Recentre la vue sur l'ensemble des objets posés (ou sur l'origine
   * si le plateau est vide). C'est ce qui met le post-it d'accueil
   * pile au milieu de l'écran à la première ouverture. */
  const centerOnContent = useCallback(
    (zoom: number, persist: boolean) => {
      const { w, h } = canvasSize();
      const ns = board.nodes;
      let cx = 0;
      let cy = 0;
      if (ns.length > 0) {
        const minX = Math.min(...ns.map((n) => n.x));
        const maxX = Math.max(...ns.map((n) => n.x + n.w));
        const minY = Math.min(...ns.map((n) => n.y));
        const maxY = Math.max(...ns.map((n) => n.y + n.h));
        cx = (minX + maxX) / 2;
        cy = (minY + maxY) / 2;
      }
      handleViewport({ x: w / 2 - cx * zoom, y: h / 2 - cy * zoom, zoom }, persist);
    },
    [board.nodes, canvasSize, handleViewport],
  );

  /** Enregistre le plateau en PNG. */
  const handleExportImage = useCallback(async () => {
    const host = hostRef.current;
    if (!host) return;
    try {
      const { exportBoardImage } = await import("@/lib/export/exportBoardImage");
      await exportBoardImage({
        title: board.board?.title ?? "Plateau",
        nodes: board.nodes,
        edges: board.edges,
        entriesById,
        linksById,
        heights: nodeHeights,
        host,
      });
      setFlash("Image enregistrée.");
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "L'export a échoué.");
    }
  }, [board.board, board.nodes, board.edges, entriesById, linksById, nodeHeights]);

  /** Objets mis en retrait par le filtre courant. */
  const dimmed = useMemo(
    () => dimmedByFilter(board.nodes, entriesById, filter),
    [board.nodes, entriesById, filter],
  );

  /** Amène un objet au centre de l'écran et le sélectionne. */
  const goToNode = useCallback(
    (node: WbBoardNode) => {
      const { w, h } = canvasSize();
      const zoom = Math.max(viewport.zoom, 0.6);
      handleViewport(
        {
          x: w / 2 - (node.x + node.w / 2) * zoom,
          y: h / 2 - (node.y + node.h / 2) * zoom,
          zoom,
        },
        true,
      );
      setSelectedIds(new Set([node.id]));
    },
    [canvasSize, handleViewport, viewport.zoom],
  );

  // Premier affichage : si le plateau n'a jamais été déplacé, on cadre le
  // contenu au centre plutôt que de laisser l'origine dans le coin.
  const centeredRef = useRef(false);
  useEffect(() => {
    if (centeredRef.current || board.loading || !board.board) return;
    const r = hostRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    centeredRef.current = true;
    const v = board.board.viewport;
    const untouched = !v || (v.x === 0 && v.y === 0 && (v.zoom ?? 1) === 1);
    if (untouched) centerOnContent(1, false);
  }, [board.loading, board.board, board.nodes, centerOnContent]);

  /* ---- Ordre d'empilement ----
   * On raisonne sur la pile ordonnée puis on renumérote : plus robuste
   * que de bricoler des profondeurs à la main, et ça répare les égalités.
   */
  const orderedNodes = useCallback(
    () => [...board.nodes].sort((a, b) => a.z - b.z),
    [board.nodes],
  );

  const bringToFront = useCallback(() => {
    const ordered = orderedNodes();
    const sel = ordered.filter((n) => selectedIds.has(n.id));
    const rest = ordered.filter((n) => !selectedIds.has(n.id));
    board.applyOrder([...rest, ...sel]);
  }, [board, orderedNodes, selectedIds]);

  const sendToBack = useCallback(() => {
    const ordered = orderedNodes();
    const sel = ordered.filter((n) => selectedIds.has(n.id));
    const rest = ordered.filter((n) => !selectedIds.has(n.id));
    board.applyOrder([...sel, ...rest]);
  }, [board, orderedNodes, selectedIds]);

  /** Avance (+1) ou recule (−1) la sélection d'un cran dans la pile. */
  const nudgeOrder = useCallback(
    (dir: 1 | -1) => {
      const arr = orderedNodes();
      if (dir === 1) {
        // De haut en bas, pour que deux voisins sélectionnés ne se doublent pas.
        for (let i = arr.length - 2; i >= 0; i--) {
          if (selectedIds.has(arr[i].id) && !selectedIds.has(arr[i + 1].id)) {
            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          }
        }
      } else {
        for (let i = 1; i < arr.length; i++) {
          if (selectedIds.has(arr[i].id) && !selectedIds.has(arr[i - 1].id)) {
            [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
          }
        }
      }
      board.applyOrder(arr);
    },
    [board, orderedNodes, selectedIds],
  );

  /* ============================================================
   * Déplier — ce qu'aucun tableau blanc ne sait faire
   *
   * Le World Building connaît déjà les relations : on ne redemande pas
   * à l'autrice de les retracer à la main. Déplier pose les fiches
   * manquantes et laisse `materializeLinks` dessiner les flèches.
   * ============================================================ */

  /** Fiches déjà posées, indexées par fiche d'origine. */
  const placedByEntry = useMemo(() => {
    const m = new Map<string, WbBoardNode>();
    for (const n of board.nodes) if (n.entry_id) m.set(n.entry_id, n);
    return m;
  }, [board.nodes]);

  /** Pose une fiche au point voulu et rattache ses relations connues. */
  const placeEntry = useCallback(
    async (entryId: string, x: number, y: number) => {
      const box = defaultNodeBox(entriesById.get(entryId));
      const created = await board.addNode("fiche", x, y, {
        entryId,
        w: box.w,
        h: box.h,
        z: box.z,
      });
      if (created) await board.materializeLinks(created, links);
      return created;
    },
    [board, entriesById, links],
  );

  /**
   * Déplie la parenté d'un personnage : aînés au-dessus, descendance en
   * dessous, fratrie et conjoints au même niveau.
   */
  const expandFamily = useCallback(
    async (node: WbBoardNode) => {
      const me = node.entry_id;
      if (!me) return;

      // Regroupe les fiches à poser par niveau de génération.
      const byLevel = new Map<number, string[]>();
      for (const l of links) {
        const involves = l.from_entry_id === me || l.to_entry_id === me;
        if (!involves || !isFamilyType(l.link_type)) continue;
        const otherId = l.from_entry_id === me ? l.to_entry_id : l.from_entry_id;
        if (placedByEntry.has(otherId) || !entriesById.has(otherId)) continue;

        // Le décalage se lit depuis le sujet : si c'est MOI le sujet,
        // l'autre est du côté opposé.
        const gap = generationGap(l.link_type);
        const level = l.from_entry_id === me ? -gap : gap;
        const arr = byLevel.get(level) ?? [];
        if (!arr.includes(otherId)) arr.push(otherId);
        byLevel.set(level, arr);
      }
      if (byLevel.size === 0) return;

      await board.asSingleAction(async () => {
        for (const [level, ids] of byLevel) {
          // Un niveau au-dessus = plus haut à l'écran, donc y décroissant.
          const y = node.y - level * LAYOUT_STEP.y;
          for (const [i, id] of ids.entries()) {
            const x = node.x + (i - (ids.length - 1) / 2) * LAYOUT_STEP.x;
            await placeEntry(id, x, y);
          }
        }
      });
    },
    [board, links, placedByEntry, entriesById, placeEntry],
  );

  /** Déplie un groupe social : les membres en cercle autour de la fiche. */
  const expandGroup = useCallback(
    async (node: WbBoardNode, group: string) => {
      const me = node.entry_id;
      if (!me) return;
      const members = entries.filter(
        (e) =>
          e.id !== me &&
          (e.groups ?? []).includes(group) &&
          !placedByEntry.has(e.id),
      );
      if (members.length === 0) return;

      await board.asSingleAction(async () => {
        const radius = Math.max(340, members.length * 52);
        for (const [i, e] of members.entries()) {
          const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2;
          await placeEntry(
            e.id,
            node.x + Math.cos(angle) * radius,
            node.y + Math.sin(angle) * radius * 0.75,
          );
        }
      });
    },
    [board, entries, placedByEntry, placeEntry],
  );

  /**
   * Trace les relations existantes entre fiches DÉJÀ posées, sans rien
   * poser de neuf : deux fiches arrivées séparément sur le plateau se
   * retrouvent liées dans l'univers mais sans flèche entre elles.
   */
  const revealExisting = useCallback(async () => {
    let n = 0;
    await board.asSingleAction(async () => {
      n = await board.revealLinks(links);
    });
    setFlash(
      !n
        ? "Aucun lien à afficher : tout ce que l'univers sait est déjà tracé."
        : n === 1
          ? "1 lien affiché."
          : `${n} liens affichés.`,
    );
  }, [board, links]);

  /** Déplie toutes les fiches directement liées, en couronne. */
  const expandRelations = useCallback(
    async (node: WbBoardNode) => {
      const me = node.entry_id;
      if (!me) return;
      const ids: string[] = [];
      for (const l of links) {
        const involves = l.from_entry_id === me || l.to_entry_id === me;
        if (!involves) continue;
        const otherId = l.from_entry_id === me ? l.to_entry_id : l.from_entry_id;
        if (placedByEntry.has(otherId) || !entriesById.has(otherId)) continue;
        if (!ids.includes(otherId)) ids.push(otherId);
      }
      if (ids.length === 0) return;

      await board.asSingleAction(async () => {
        const radius = Math.max(340, ids.length * 52);
        for (const [i, id] of ids.entries()) {
          const angle = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
          await placeEntry(
            id,
            node.x + Math.cos(angle) * radius,
            node.y + Math.sin(angle) * radius * 0.75,
          );
        }
      });
    },
    [board, links, placedByEntry, entriesById, placeEntry],
  );

  /* ---- Copier / coller / dupliquer ----
   * Presse-papiers interne au plateau (on ne touche pas à celui du
   * système : les objets n'ont pas de représentation texte utile). */
  const clipboard = useRef<WbBoardNode[]>([]);

  const duplicateNodes = useCallback(
    async (sources: WbBoardNode[], dx = 24, dy = 24) => {
      if (sources.length === 0) return;
      const created: string[] = [];
      const top = board.nodes.reduce((m, n) => Math.max(m, n.z), 0);
      for (const [i, src] of sources.entries()) {
        const node = await board.addNode(src.kind, src.x + dx, src.y + dy, {
          entryId: src.entry_id ?? undefined,
          content: { ...src.content },
          style: { ...src.style },
          w: src.w,
          h: src.h,
          z: top + 1 + i,
        });
        if (node) created.push(node.id);
      }
      // La copie devient la nouvelle sélection : on enchaîne les collages.
      if (created.length) setSelectedIds(new Set(created));
    },
    [board],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      const key = e.key.toLowerCase();

      if (key === "z") {
        e.preventDefault();
        // Ctrl+Z annule, Ctrl+Maj+Z (ou Ctrl+Y) refait.
        if (e.shiftKey) board.redo();
        else board.undo();
        setSelectedIds(new Set());
        return;
      }
      if (key === "y") {
        e.preventDefault();
        board.redo();
        setSelectedIds(new Set());
        return;
      }
      if (key === "c" && selectedIds.size > 0) {
        clipboard.current = board.nodes.filter((n) => selectedIds.has(n.id));
      } else if (key === "v" && clipboard.current.length > 0) {
        e.preventDefault();
        duplicateNodes(clipboard.current);
      } else if (key === "d" && selectedIds.size > 0) {
        e.preventDefault();
        duplicateNodes(board.nodes.filter((n) => selectedIds.has(n.id)));
      } else if (key === "a" && board.nodes.length > 0) {
        e.preventDefault();
        setSelectedIds(new Set(board.nodes.map((n) => n.id)));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [board, selectedIds, duplicateNodes]);

  /* ---- Alignement et distribution ----
   * Sur la sélection courante. On ne bouge que l'axe concerné : aligner
   * à gauche ne doit pas déranger les hauteurs déjà réglées. */
  const alignSelection = useCallback(
    (how: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
      const sel = board.nodes.filter((n) => selectedIds.has(n.id));
      if (sel.length < 2) return;
      const minX = Math.min(...sel.map((n) => n.x));
      const maxX = Math.max(...sel.map((n) => n.x + n.w));
      const minY = Math.min(...sel.map((n) => n.y));
      const maxY = Math.max(...sel.map((n) => n.y + n.h));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      for (const n of sel) {
        switch (how) {
          case "left":
            board.moveNode(n.id, minX, n.y);
            break;
          case "hcenter":
            board.moveNode(n.id, cx - n.w / 2, n.y);
            break;
          case "right":
            board.moveNode(n.id, maxX - n.w, n.y);
            break;
          case "top":
            board.moveNode(n.id, n.x, minY);
            break;
          case "vcenter":
            board.moveNode(n.id, n.x, cy - n.h / 2);
            break;
          case "bottom":
            board.moveNode(n.id, n.x, maxY - n.h);
            break;
        }
      }
    },
    [board, selectedIds],
  );

  /** Espacement régulier entre les objets, sur l'axe demandé. */
  const distributeSelection = useCallback(
    (axis: "h" | "v") => {
      const sel = board.nodes.filter((n) => selectedIds.has(n.id));
      if (sel.length < 3) return;
      const sorted = [...sel].sort((a, b) =>
        axis === "h" ? a.x - b.x : a.y - b.y,
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      // On répartit l'espace VIDE, pas les positions : des objets de
      // tailles différentes restent alors visuellement réguliers.
      const span =
        axis === "h"
          ? last.x + last.w - first.x
          : last.y + last.h - first.y;
      const totalSize = sorted.reduce(
        (s, n) => s + (axis === "h" ? n.w : n.h),
        0,
      );
      const gap = (span - totalSize) / (sorted.length - 1);
      let cursor = axis === "h" ? first.x : first.y;
      for (const n of sorted) {
        if (axis === "h") board.moveNode(n.id, cursor, n.y);
        else board.moveNode(n.id, n.x, cursor);
        cursor += (axis === "h" ? n.w : n.h) + gap;
      }
    },
    [board, selectedIds],
  );

  /** Profondeurs extrêmes de la pile, pour poser dessus ou dessous. */
  const zBounds = useCallback(() => {
    if (board.nodes.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...board.nodes.map((n) => n.z)),
      max: Math.max(...board.nodes.map((n) => n.z)),
    };
  }, [board.nodes]);

  async function handleAddPostit() {
    const c = centerOfView();
    const node = await board.addNode("postit", c.x - 100, c.y - 70, {
      content: { html: "" },
      style: { color: POSTIT_COLORS[0] },
      w: 200,
      h: 140,
      z: zBounds().max + 1,
    });
    if (node) setEditingNodeId(node.id);
  }

  async function handleAddTexte() {
    const c = centerOfView();
    const node = await board.addNode("texte", c.x - 110, c.y - 16, {
      content: { html: "" },
      style: { fontSize: 22 },
      w: 220,
      h: 32,
      z: zBounds().max + 1,
    });
    if (node) setEditingNodeId(node.id);
  }

  async function handleAddForme(shape: "rect" | "round" | "ellipse") {
    const c = centerOfView();
    await board.addNode("forme", c.x - 90, c.y - 60, {
      style: { shape, fill: "rgba(217,162,95,0.12)", stroke: "#D9A25F" },
      w: 180,
      h: 120,
      // Une forme sert le plus souvent de fond : elle se glisse dessous.
      z: zBounds().min - 1,
    });
  }

  async function handleAddCadre() {
    const c = centerOfView();
    const node = await board.addNode("cadre", c.x - 200, c.y - 140, {
      content: { title: "" },
      style: { color: "#D9A25F" },
      w: 400,
      h: 280,
      // Un cadre est un contenant : il vit sous ce qu'il regroupe.
      z: zBounds().min - 1,
    });
    if (node) setRenamingCadre({ node, value: "" });
  }

  /** Upload d'une image libre dans le bucket existant du World Building. */
  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop() ?? "jpg";
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${user.id}/${projectId}/board/${stamp}.${ext}`;
      const { error } = await supabase.storage
        .from("wb-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) return;
      const { data: pub } = supabase.storage.from("wb-images").getPublicUrl(path);
      const c = centerOfView();
      await board.addNode("image", c.x - 140, c.y - 100, {
        content: { url: pub.publicUrl },
        w: 280,
        h: 200,
        z: zBounds().max + 1,
      });
    } finally {
      setUploading(false);
    }
  }

  function handleStartLink(from: WbBoardNode, to: WbBoardNode) {
    // Entre deux fiches : on demande le type, et ça écrit une relation
    // d'univers. Dès qu'un des deux bouts n'est pas une fiche, il n'y a
    // rien à énoncer : c'est une flèche libre, tracée sans question.
    const bothFiches =
      from.kind === "fiche" && to.kind === "fiche" && from.entry_id && to.entry_id;
    if (!bothFiches) {
      board.addFreeEdge(from, to);
      return;
    }
    // On ancre le sélecteur au milieu de l'écran vertical, près du curseur.
    const r = hostRef.current?.getBoundingClientRect();
    setPendingLink({
      from,
      to,
      anchor: {
        top: (r?.top ?? 0) + 80,
        left: (r?.left ?? 0) + (r?.width ?? 600) / 2 - 140,
      },
    });
  }

  async function confirmLink(type: string) {
    if (!pendingLink) return;
    const res = await board.addTypedLink(
      pendingLink.from,
      pendingLink.to,
      type,
      links,
    );
    if (res?.link) onLinkCreated(res.link);
    setPendingLink(null);
  }

  if (board.loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-[13px]"
        style={{ color: "var(--text-4)" }}
      >
        Chargement du plateau…
      </div>
    );
  }

  if (board.error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="max-w-[420px] text-center text-[13px] leading-relaxed"
          style={{ color: "var(--text-3)" }}
        >
          <div className="text-[26px] mb-2">🗺️</div>
          {board.error}
        </div>
      </div>
    );
  }

  const selectedNode =
    selectedIds.size === 1
      ? board.nodes.find((n) => n.id === [...selectedIds][0]) ?? null
      : null;

  /** Vignettes fiches sélectionnées — colorables même à plusieurs :
   * une teinte par maison ou par arc se pose sur tout un groupe. */
  const selectedFiches = board.nodes.filter(
    (n) => selectedIds.has(n.id) && n.kind === "fiche",
  );
  const allFiches =
    selectedFiches.length > 0 && selectedFiches.length === selectedIds.size;

  return (
    <div ref={hostRef} className="flex-1 min-w-0 flex flex-col relative">
      {/* Barre d'outils */}
      <div
        className="h-11 shrink-0 flex items-center gap-1.5 px-3"
        style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--bg-2)" }}
      >
        {/* Sélecteur de plateau */}
        <div className="relative mr-1">
          <button
            onClick={() => setShowBoardMenu((v) => !v)}
            title="Changer de plateau"
            className="inline-flex items-center gap-1.5 h-7 px-2 rounded-[var(--radius-sm)] cursor-pointer transition-colors bg-transparent border-none hover:bg-white/[0.05]"
          >
            <span className="font-serif text-[14px]" style={{ color: "var(--text-1)" }}>
              {board.board?.title ?? "Plateau"}
            </span>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ color: "var(--text-4)" }}>
              <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showBoardMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowBoardMenu(false)} />
              <div
                className="absolute top-full left-0 mt-1 z-50 w-[260px] py-1 rounded-[var(--radius-md)] shadow-xl"
                style={{ background: "var(--bg-3)", border: "1px solid var(--border-soft)" }}
              >
                {board.boards.map((b) => {
                  const current = b.id === board.board?.id;
                  return (
                    <div
                      key={b.id}
                      className="group flex items-center gap-1 px-1.5 py-0.5"
                    >
                      <button
                        onClick={() => {
                          setShowBoardMenu(false);
                          if (!current) board.openBoard(b);
                        }}
                        className="flex-1 min-w-0 text-left px-2 py-1.5 rounded text-[12.5px] cursor-pointer bg-transparent border-none hover:bg-white/[0.05] flex items-center gap-1.5"
                        style={{ color: current ? "var(--accent)" : "var(--text-2)" }}
                      >
                        <span className="text-[11px]">{b.is_main ? "🗺️" : "▫"}</span>
                        <span className="truncate">{b.title}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowBoardMenu(false);
                          setRenamingBoard({ id: b.id, value: b.title });
                        }}
                        title="Renommer"
                        aria-label="Renommer le plateau"
                        className="rd-icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✎
                      </button>
                      {!b.is_main && (
                        <button
                          onClick={async () => {
                            setShowBoardMenu(false);
                            if (
                              await appConfirm(
                                `Supprimer le plateau « ${b.title} » ?\n\nSes post-its, formes et flèches seront perdus. Les fiches et leurs relations, elles, restent intactes.`,
                                { confirmLabel: "Supprimer" },
                              )
                            ) {
                              board.deleteBoard(b.id);
                            }
                          }}
                          title="Supprimer ce plateau"
                          aria-label="Supprimer le plateau"
                          className="rd-icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                <div className="my-1 border-t border-white/[0.06]" />
                <button
                  onClick={() => {
                    setShowBoardMenu(false);
                    setCreatingBoard("");
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-[12.5px] cursor-pointer bg-transparent border-none hover:bg-white/[0.05]"
                  style={{ color: "var(--accent)" }}
                >
                  + Nouveau plateau
                </button>
              </div>
            </>
          )}
        </div>

        {/* Ajouter — un seul bouton pour les cinq objets qu'on pose.
            Auparavant chacun avait le sien : la barre gagnait une entrée à
            chaque livraison et n'en perdait jamais. Ici, « créer » tient en
            un point d'entrée, et le reste de la barre sert à REGARDER le
            plateau (chercher, filtrer, zoomer, exporter). */}
        <div className="relative">
          <ToolButton
            onClick={() => setShowAddMenu((v) => !v)}
            title="Ajouter un objet sur le plateau"
            active={showAddMenu}
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2.5v9M2.5 7h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Ajouter
          </ToolButton>

          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAddMenu(false)}
              />
              <div
                className="absolute top-full left-0 mt-1 z-50 w-[212px] py-1.5 rounded-[var(--radius-md)] shadow-2xl"
                style={{
                  background: "var(--bg-3)",
                  border: "1px solid var(--border-soft)",
                }}
              >
                <AddItem
                  label="Post-it"
                  hint="Une note libre, en texte riche"
                  onClick={() => {
                    setShowAddMenu(false);
                    handleAddPostit();
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-[2px]"
                    style={{ background: POSTIT_COLORS[0] }}
                  />
                </AddItem>

                <AddItem
                  label="Cadre"
                  hint="Il emporte ce qu'il contient"
                  onClick={() => {
                    setShowAddMenu(false);
                    handleAddCadre();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="2"
                      y="4"
                      width="10"
                      height="8"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeDasharray="2.5 2"
                    />
                    <path
                      d="M2 2.5H7"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </AddItem>

                <AddItem
                  label="Texte"
                  hint="Un titre, une annotation"
                  onClick={() => {
                    setShowAddMenu(false);
                    handleAddTexte();
                  }}
                >
                  <span className="font-serif text-[14px] leading-none">T</span>
                </AddItem>

                <AddItem
                  label="Image"
                  hint={uploading ? "Envoi en cours…" : "Depuis votre ordinateur"}
                  disabled={uploading}
                  onClick={() => {
                    setShowAddMenu(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="3" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <circle cx="5" cy="6" r="1" fill="currentColor" />
                    <path
                      d="M2.5 9.5L5.5 7L8 9L10 7.8L11.5 9"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </AddItem>

                {/* Les formes n'ont plus de sous-menu : trois icônes tiennent
                    sur une ligne, et un menu dans un menu se manque à la souris. */}
                <div className="my-1 border-t border-white/[0.06]" />
                <div
                  className="px-3 pt-1 pb-1 text-[10px] uppercase"
                  style={{ letterSpacing: "0.13em", color: "var(--text-4)" }}
                >
                  Formes
                </div>
                <div className="flex gap-1 px-2.5 pb-1.5">
                  {(
                    [
                      { k: "rect", label: "Rectangle", r: "2" },
                      { k: "round", label: "Rectangle arrondi", r: "5" },
                      { k: "ellipse", label: "Ellipse", r: "999" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.k}
                      onClick={() => {
                        setShowAddMenu(false);
                        handleAddForme(s.k);
                      }}
                      title={s.label}
                      aria-label={s.label}
                      className="w-9 h-9 flex items-center justify-center rounded cursor-pointer bg-transparent border-none hover:bg-white/[0.06] text-text-tertiary hover:text-[var(--color-accent)]"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        {s.k === "ellipse" ? (
                          <ellipse cx="8" cy="8" rx="6" ry="4.5" stroke="currentColor" strokeWidth="1.4" />
                        ) : (
                          <rect x="2" y="3.5" width="12" height="9" rx={s.r} stroke="currentColor" strokeWidth="1.4" />
                        )}
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImageFile(f);
            e.target.value = "";
          }}
        />

        {/* Annuler / refaire */}
        <div
          className="flex items-center gap-0.5 ml-1 pl-1.5"
          style={{ borderLeft: "1px solid var(--border-soft)" }}
        >
          <IconButton
            onClick={() => {
              board.undo();
              setSelectedIds(new Set());
            }}
            title="Annuler (Ctrl+Z)"
            path="M4.5 5.5H9a2.5 2.5 0 0 1 0 5H6M4.5 5.5L7 3M4.5 5.5L7 8"
            disabled={!board.canUndo}
          />
          <IconButton
            onClick={() => {
              board.redo();
              setSelectedIds(new Set());
            }}
            title="Refaire (Ctrl+Maj+Z)"
            path="M9.5 5.5H5a2.5 2.5 0 0 0 0 5h3M9.5 5.5L7 3M9.5 5.5L7 8"
            disabled={!board.canRedo}
          />
        </div>

        {/* Actions du PLATEAU ENTIER — à distinguer de « Déplier », qui
            agit autour d'une fiche. « Les liens manquants » vivait dans ce
            menu-là par commodité alors qu'elle ne déplie rien : sa place
            est ici, avec le recentrage et l'export. */}
        <ToolButton
          onClick={revealExisting}
          title="Tracer les relations entre les fiches déjà posées, sans rien ajouter au plateau"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <circle cx="3.5" cy="3.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="10.5" cy="10.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4.9 4.9L9.1 9.1" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.6 1.4" strokeLinecap="round" />
          </svg>
          Liens manquants
        </ToolButton>

        <div className="ml-auto flex items-center gap-1.5">
          <BoardFinder
            nodes={board.nodes}
            entriesById={entriesById}
            filter={filter}
            onFilterChange={setFilter}
            onGoTo={goToNode}
            palette={[
              { label: "Doré (défaut)", stroke: "var(--accent)" },
              ...SHAPE_COLORS.map((c) => ({ label: c.label, stroke: c.stroke })),
            ]}
          />
          <span className="text-[11px]" style={{ color: "var(--text-4)" }}>
            {Math.round(viewport.zoom * 100)} %
          </span>
          <button
            onClick={() => setShowHelp(true)}
            title="Les gestes du plateau"
            className="rd-icon-btn"
            aria-label="Les gestes du plateau"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.6 5.4a1.5 1.5 0 1 1 1.9 1.7v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="7.4" cy="10" r="0.65" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={handleExportImage}
            title="Enregistrer le plateau en image (PNG)"
            className="rd-icon-btn"
            aria-label="Enregistrer le plateau en image"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2v7M7 9L4.5 6.5M7 9l2.5-2.5M2.5 11.5h9"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={() => centerOnContent(1, true)}
            title="Recentrer la vue sur le centre du plateau (et remettre le zoom à 100 %)"
            className="rd-icon-btn"
            aria-label="Recentrer la vue sur le centre du plateau"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      <WbBoardCanvas
        nodes={board.nodes}
        edges={board.edges}
        entriesById={entriesById}
        linksById={linksById}
        viewport={viewport}
        onViewportChange={handleViewport}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        expandedId={selectedNode?.kind === "fiche" ? selectedNode.id : null}
        dimmedIds={dimmed}
        onHeightsChange={setNodeHeights}
        onCanvasSizeChange={setHostSize}
        onMoveNode={board.moveNode}
        onResizeNode={board.resizeNode}
        onOpenEntry={onOpenEntry}
        onBackgroundDoubleClick={onBackgroundDoubleClick}
        onEditPostit={(n) => setEditingNodeId(n.id)}
        onRenameEdge={(edge) =>
          setRenamingEdge({ edge, value: edge.label ?? "" })
        }
        onRenameCadre={(node) =>
          setRenamingCadre({
            node,
            value: (node.content.title as string) ?? "",
          })
        }
        onDropEntry={async (entryId, x, y) => {
          // Une carte arrive en grand et sous les autres vignettes.
          const box = defaultNodeBox(entriesById.get(entryId));
          const z = zBounds();
          const node = await board.addNode(
            "fiche",
            x - box.w / 2 + 100,
            y - box.h / 2 + 58,
            {
              entryId,
              w: box.w,
              h: box.h,
              // Une carte se glisse sous la pile, le reste arrive dessus.
              z: box.z < 0 ? z.min - 1 : z.max + 1,
            },
          );
          // La fiche arrive avec les relations qu'elle a déjà avec ce qui
          // est posé : on n'a pas à retracer ce que l'univers sait déjà.
          if (node) board.materializeLinks(node, links);
        }}
        onStartLink={handleStartLink}
        onDeleteSelection={() => {
          board.removeNodes([...selectedIds]);
          setSelectedIds(new Set());
        }}
        onDeleteEdge={board.removeEdge}
        onSetEdgeWaypoint={board.setEdgeWaypoint}
        onBeginHistory={board.beginHistory}
        selectionToolbar={
          <>
            {/* Éditer — sur un texte ou un post-it seul */}
            {(selectedNode?.kind === "texte" || selectedNode?.kind === "postit") && (
              <>
                <button
                  onClick={() => setEditingNodeId(selectedNode.id)}
                  title="Modifier le contenu"
                  className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-[11.5px] cursor-pointer transition-colors bg-transparent border-none hover:bg-white/[0.05]"
                  style={{ color: "var(--accent)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2.5 11.5L3 9L9.5 2.5a1.4 1.4 0 0 1 2 2L5 11l-2.5.5Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Éditer
                </button>
                <span
                  className="w-px h-4 mx-1"
                  style={{ background: "var(--border-soft)" }}
                />
              </>
            )}

            {/* Déplier — sur une fiche seule */}
            {selectedNode?.kind === "fiche" && selectedNode.entry_id && (
              <>
                <button
                  onClick={() => setShowExpandMenu((v) => !v)}
                  title="Déplier les fiches liées d'après les relations déjà écrites"
                  className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-[11.5px] cursor-pointer transition-colors bg-transparent border-none hover:bg-white/[0.05]"
                  style={{ color: "var(--accent)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="1.6" fill="currentColor" />
                    <circle cx="2.5" cy="3" r="1.3" stroke="currentColor" strokeWidth="1.1" />
                    <circle cx="11.5" cy="3" r="1.3" stroke="currentColor" strokeWidth="1.1" />
                    <circle cx="2.5" cy="11" r="1.3" stroke="currentColor" strokeWidth="1.1" />
                    <circle cx="11.5" cy="11" r="1.3" stroke="currentColor" strokeWidth="1.1" />
                    <path
                      d="M5.8 5.9L3.4 4M8.2 5.9L10.6 4M5.8 8.1L3.4 10M8.2 8.1L10.6 10"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                  Déplier
                </button>
                <span
                  className="w-px h-4 mx-1"
                  style={{ background: "var(--border-soft)" }}
                />
              </>
            )}

            {/* Alignement — dès qu'il y a plusieurs objets */}
            {selectedIds.size > 1 && (
              <>
                <IconButton
                  onClick={() => alignSelection("left")}
                  title="Aligner à gauche"
                  path="M2.5 2V12M5 4.5H11M5 9.5H8.5"
                />
                <IconButton
                  onClick={() => alignSelection("hcenter")}
                  title="Centrer horizontalement"
                  path="M7 2V12M4 4.5H10M5.5 9.5H8.5"
                />
                <IconButton
                  onClick={() => alignSelection("right")}
                  title="Aligner à droite"
                  path="M11.5 2V12M3 4.5H9M5.5 9.5H9"
                />
                <IconButton
                  onClick={() => alignSelection("top")}
                  title="Aligner en haut"
                  path="M2 2.5H12M4.5 5V11M9.5 5V8.5"
                />
                <IconButton
                  onClick={() => alignSelection("vcenter")}
                  title="Centrer verticalement"
                  path="M2 7H12M4.5 4V10M9.5 5.5V8.5"
                />
                <IconButton
                  onClick={() => alignSelection("bottom")}
                  title="Aligner en bas"
                  path="M2 11.5H12M4.5 3V9M9.5 5.5V9"
                />
                {selectedIds.size > 2 && (
                  <>
                    <IconButton
                      onClick={() => distributeSelection("h")}
                      title="Espacer régulièrement à l'horizontale"
                      path="M2 3V11M7 3V11M12 3V11"
                    />
                    <IconButton
                      onClick={() => distributeSelection("v")}
                      title="Espacer régulièrement à la verticale"
                      path="M3 2H11M3 7H11M3 12H11"
                    />
                  </>
                )}
                <span
                  className="w-px h-4 mx-1"
                  style={{ background: "var(--border-soft)" }}
                />
              </>
            )}

            <OrderButton
              onClick={sendToBack}
              title="Envoyer tout à l'arrière-plan"
              dir="down"
              toEnd
            />
            <OrderButton
              onClick={() => nudgeOrder(-1)}
              title="Reculer d'un cran"
              dir="down"
            />
            <OrderButton
              onClick={() => nudgeOrder(1)}
              title="Avancer d'un cran"
              dir="up"
            />
            <OrderButton
              onClick={bringToFront}
              title="Amener tout au premier plan"
              dir="up"
              toEnd
            />

            {/* Couleurs d'une forme */}
            {selectedNode?.kind === "forme" && (
              <>
                <span
                  className="w-px h-4 mx-1"
                  style={{ background: "var(--border-soft)" }}
                />
                {SHAPE_COLORS.map((c) => (
                  <button
                    key={c.stroke}
                    onClick={() =>
                      board.updateNode(selectedNode.id, {
                        style: { ...selectedNode.style, fill: c.fill, stroke: c.stroke },
                      })
                    }
                    title={c.label}
                    aria-label={c.label}
                    className="w-4 h-4 rounded-[3px] cursor-pointer"
                    style={{
                      background: c.fill,
                      border:
                        selectedNode.style.stroke === c.stroke
                          ? `2px solid ${c.stroke}`
                          : `1px solid ${c.stroke}`,
                    }}
                  />
                ))}
              </>
            )}

            {/* Couleurs — seulement quand un post-it est seul sélectionné */}
            {selectedNode?.kind === "postit" && (
              <>
                <span
                  className="w-px h-4 mx-1"
                  style={{ background: "var(--border-soft)" }}
                />
                {POSTIT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() =>
                      board.updateNode(selectedNode.id, {
                        style: { ...selectedNode.style, color: c },
                      })
                    }
                    title="Couleur du post-it"
                    aria-label={`Couleur ${c}`}
                    className="w-4 h-4 rounded-[3px] cursor-pointer"
                    style={{
                      background: c,
                      border:
                        selectedNode.style.color === c
                          ? "2px solid var(--accent)"
                          : "1px solid var(--border-soft)",
                    }}
                  />
                ))}
              </>
            )}

            {/* Couleur d'une vignette fiche — pour trier l'univers à
                l'œil : une couleur par maison, par arc, par ce qu'on veut. */}
            {allFiches && (
              <>
                <span
                  className="w-px h-4 mx-1"
                  style={{ background: "var(--border-soft)" }}
                />
                {[
                  { label: "Doré (défaut)", stroke: "var(--accent)" },
                  ...SHAPE_COLORS,
                ].map((c) => {
                  const active = selectedFiches.every(
                    (n) => (n.style.color ?? "var(--accent)") === c.stroke,
                  );
                  return (
                    <button
                      key={c.stroke}
                      onClick={() =>
                        board.asSingleAction(async () => {
                          for (const n of selectedFiches) {
                            await board.updateNode(n.id, {
                              style: { ...n.style, color: c.stroke },
                            });
                          }
                        })
                      }
                      title={
                        selectedFiches.length > 1
                          ? `${c.label} — ${selectedFiches.length} fiches`
                          : c.label
                      }
                      aria-label={c.label}
                      className="w-4 h-4 rounded-[3px] cursor-pointer"
                      style={{
                        background: c.stroke,
                        border: active
                          ? "2px solid var(--text-1)"
                          : "1px solid var(--border-soft)",
                      }}
                    />
                  );
                })}
              </>
            )}

            {/* Couleur d'un cadre */}
            {selectedNode?.kind === "cadre" && (
              <>
                <span
                  className="w-px h-4 mx-1"
                  style={{ background: "var(--border-soft)" }}
                />
                {SHAPE_COLORS.map((c) => (
                  <button
                    key={c.stroke}
                    onClick={() =>
                      board.updateNode(selectedNode.id, {
                        style: { ...selectedNode.style, color: c.stroke },
                      })
                    }
                    title={c.label}
                    aria-label={c.label}
                    className="w-4 h-4 rounded-[3px] cursor-pointer"
                    style={{
                      background: c.fill,
                      border:
                        selectedNode.style.color === c.stroke
                          ? `2px solid ${c.stroke}`
                          : `1px solid ${c.stroke}`,
                    }}
                  />
                ))}
              </>
            )}

            <span
              className="w-px h-4 mx-1"
              style={{ background: "var(--border-soft)" }}
            />
            <button
              onClick={() =>
                duplicateNodes(board.nodes.filter((n) => selectedIds.has(n.id)))
              }
              title="Dupliquer (Ctrl+D)"
              aria-label="Dupliquer"
              className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors bg-transparent border-none text-text-tertiary hover:text-[var(--color-accent)] hover:bg-white/[0.05]"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                <rect x="5" y="5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            <button
              onClick={() => {
                board.removeNodes([...selectedIds]);
                setSelectedIds(new Set());
              }}
              title="Retirer du plateau (la fiche et ses relations restent intactes)"
              aria-label="Retirer du plateau"
              className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors bg-transparent border-none hover:bg-white/[0.05]"
              style={{ color: "var(--danger)" }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 4H11M5.5 4V3H8.5V4M4 4L4.5 11.5H9.5L10 4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </>
        }
      />

      <BoardMiniMap
        nodes={board.nodes}
        viewport={viewport}
        canvasW={hostSize.w}
        canvasH={hostSize.h}
        dimmedIds={dimmed}
        heights={nodeHeights}
        onJump={(x, y) =>
          handleViewport(
            {
              x: hostSize.w / 2 - x * viewport.zoom,
              y: hostSize.h / 2 - y * viewport.zoom,
              zoom: viewport.zoom,
            },
            true,
          )
        }
      />

      {/* Aide contextuelle discrète */}
      {board.nodes.length <= 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] pointer-events-none"
          style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-3)",
          }}
        >
          Glissez une fiche depuis le panneau de droite pour commencer
        </div>
      )}

      {/* Édition d'un post-it — hors du plan transformé, donc plein confort */}
      {editingPostit && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/40"
            onClick={() => setEditingNodeId(null)}
          />
          {(() => {
            const isTexte = editingPostit.kind === "texte";
            const ink = isTexte ? "var(--text-1)" : "#3A2E14";
            return (
              <div
                className="fixed z-[85] inset-x-0 top-[24vh] mx-auto w-[min(420px,92vw)] rounded-[var(--radius-md)] p-4 shadow-2xl"
                style={{
                  background: isTexte
                    ? "var(--bg-3)"
                    : ((editingPostit.style.color as string) ?? "#E8C77A"),
                  border: isTexte ? "1px solid var(--border-soft)" : undefined,
                }}
              >
                <div
                  className="text-[10px] uppercase mb-2"
                  style={{ letterSpacing: "0.14em", color: ink, opacity: 0.6 }}
                >
                  {isTexte ? "Texte" : "Post-it"}
                </div>
                <div
                  className="rounded p-2"
                  style={{
                    background: isTexte ? "var(--bg)" : "rgba(255,255,255,0.35)",
                    color: ink,
                    minHeight: isTexte ? 60 : 120,
                  }}
                >
                  <RichEditableCell
                    // Éditeur monté et focalisé dès l'ouverture : sinon
                    // on tape dans le vide, et Entrée actionne le bouton
                    // « Terminé » qui a le focus par défaut.
                    editing
                    onExitEdit={() => {}}
                    value={(editingPostit.content.html as string) ?? ""}
                    // La saisie est enregistrée à la frappe, pas à la
                    // sortie du champ : plus rien ne dépend du focus, donc
                    // plus rien ne se perd en cliquant ailleurs.
                    onChange={(html) => saveDraft(editingPostit, html)}
                    onSave={(html) => saveDraft(editingPostit, html)}
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-3">
                  {isTexte ? (
                    /* Taille du texte */
                    <>
                      <span className="text-[11px]" style={{ color: "var(--text-4)" }}>
                        Taille
                      </span>
                      {[16, 22, 30, 42].map((s) => (
                        <button
                          key={s}
                          // Garde le focus dans l'éditeur : un blur ici
                          // interromprait la saisie en cours.
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => {
                            const style = { ...editingPostit.style, fontSize: s };
                            board.updateNode(editingPostit.id, { style });
                          }}
                          className="w-7 h-7 rounded cursor-pointer font-serif"
                          style={{
                            fontSize: Math.min(s / 2 + 6, 16),
                            background:
                              (editingPostit.style.fontSize ?? 22) === s
                                ? "var(--accent-bg)"
                                : "transparent",
                            border: `1px solid ${
                              (editingPostit.style.fontSize ?? 22) === s
                                ? "var(--accent-border)"
                                : "var(--border-soft)"
                            }`,
                            color:
                              (editingPostit.style.fontSize ?? 22) === s
                                ? "var(--accent)"
                                : "var(--text-3)",
                          }}
                        >
                          A
                        </button>
                      ))}
                    </>
                  ) : (
                    POSTIT_COLORS.map((c) => (
                      <button
                        key={c}
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          const style = { ...editingPostit.style, color: c };
                          board.updateNode(editingPostit.id, { style });
                        }}
                        aria-label={`Couleur ${c}`}
                        className="w-5 h-5 rounded-[3px] cursor-pointer"
                        style={{
                          background: c,
                          border:
                            editingPostit.style.color === c
                              ? "2px solid #3A2E14"
                              : "1px solid rgba(58,46,20,0.25)",
                        }}
                      />
                    ))
                  )}
                  <button
                    onClick={() => setEditingNodeId(null)}
                    className="ml-auto h-8 px-3 rounded text-[12.5px] cursor-pointer border-none"
                    style={
                      isTexte
                        ? { background: "var(--accent)", color: "#1a1410" }
                        : { background: "#3A2E14", color: "#F0E6D2" }
                    }
                  >
                    Terminé
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Message fugace */}
      {flash && (
        <div
          className="fixed left-1/2 bottom-8 -translate-x-1/2 z-[90] px-3.5 py-2 rounded-[var(--radius-md)] text-[12px] shadow-2xl pointer-events-none"
          style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-2)",
          }}
        >
          {flash}
        </div>
      )}

      {showHelp && <BoardHelp onClose={() => setShowHelp(false)} />}

      {/* Menu Déplier */}
      {showExpandMenu && selectedNode?.entry_id && (
        <>
          <div
            className="fixed inset-0 z-[80]"
            onClick={() => setShowExpandMenu(false)}
          />
          <div
            className="fixed z-[85] inset-x-0 top-[24vh] mx-auto w-[min(380px,92vw)] rounded-[var(--radius-md)] py-1.5 shadow-2xl"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border-soft)" }}
          >
            <div
              className="px-3.5 pt-1.5 pb-2 text-[10px] uppercase"
              style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
            >
              Déplier autour de{" "}
              {entriesById.get(selectedNode.entry_id)?.title ?? "cette fiche"}
            </div>

            <ExpandOption
              title="La famille"
              desc="Aînés au-dessus, descendance en dessous, fratrie au même niveau."
              onClick={() => {
                setShowExpandMenu(false);
                expandFamily(selectedNode);
              }}
            />
            <ExpandOption
              title="Toutes les relations"
              desc="Chaque fiche directement liée, disposée en couronne."
              onClick={() => {
                setShowExpandMenu(false);
                expandRelations(selectedNode);
              }}
            />

            {(entriesById.get(selectedNode.entry_id)?.groups ?? []).length > 0 && (
              <>
                <div className="my-1 border-t border-white/[0.06]" />
                <div
                  className="px-3.5 pt-1 pb-1 text-[10px] uppercase"
                  style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
                >
                  Groupes
                </div>
                {(entriesById.get(selectedNode.entry_id)?.groups ?? []).map((g) => (
                  <ExpandOption
                    key={g}
                    title={g}
                    desc="Tous les membres du groupe, en cercle."
                    onClick={() => {
                      setShowExpandMenu(false);
                      expandGroup(selectedNode, g);
                    }}
                  />
                ))}
              </>
            )}

            <p
              className="px-3.5 pt-2 pb-1 text-[10.5px] leading-snug"
              style={{ color: "var(--text-4)" }}
            >
              Seules les fiches absentes du plateau sont posées. Rien n&apos;est
              écrit dans l&apos;univers : on affiche ce qu&apos;il sait déjà.
            </p>
          </div>
        </>
      )}

      {/* Créer / renommer un plateau */}
      {(creatingBoard !== null || renamingBoard) && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/40"
            onClick={() => {
              setCreatingBoard(null);
              setRenamingBoard(null);
            }}
          />
          <div
            className="fixed z-[85] inset-x-0 top-[30vh] mx-auto w-[min(380px,92vw)] rounded-[var(--radius-md)] p-4 shadow-2xl"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border-soft)" }}
          >
            <div
              className="text-[10px] uppercase mb-2"
              style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
            >
              {renamingBoard ? "Renommer le plateau" : "Nouveau plateau"}
            </div>
            <input
              autoFocus
              value={renamingBoard ? renamingBoard.value : (creatingBoard ?? "")}
              onChange={(e) =>
                renamingBoard
                  ? setRenamingBoard({ ...renamingBoard, value: e.target.value })
                  : setCreatingBoard(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setCreatingBoard(null);
                  setRenamingBoard(null);
                }
                if (e.key !== "Enter") return;
                if (renamingBoard) {
                  const t = renamingBoard.value.trim();
                  if (t) board.renameBoard(renamingBoard.id, t);
                  setRenamingBoard(null);
                } else {
                  board.createBoard(creatingBoard ?? "");
                  setCreatingBoard(null);
                }
              }}
              placeholder="Les familles régnantes, La carte des factions…"
              className="w-full h-9 px-2.5 rounded text-[13px]"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-1)",
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setCreatingBoard(null);
                  setRenamingBoard(null);
                }}
                className="h-8 px-3 rounded text-[12.5px] cursor-pointer"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-soft)",
                  color: "var(--text-2)",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (renamingBoard) {
                    const t = renamingBoard.value.trim();
                    if (t) board.renameBoard(renamingBoard.id, t);
                    setRenamingBoard(null);
                  } else {
                    board.createBoard(creatingBoard ?? "");
                    setCreatingBoard(null);
                  }
                }}
                className="h-8 px-3 rounded text-[12.5px] cursor-pointer border-none font-medium"
                style={{ background: "var(--accent)", color: "#1a1410" }}
              >
                {renamingBoard ? "Renommer" : "Créer"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Étiquette d'une flèche libre */}
      {renamingEdge && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/40"
            onClick={() => setRenamingEdge(null)}
          />
          <div
            className="fixed z-[85] inset-x-0 top-[30vh] mx-auto w-[min(360px,92vw)] rounded-[var(--radius-md)] p-4 shadow-2xl"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border-soft)" }}
          >
            <div
              className="text-[10px] uppercase mb-2"
              style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
            >
              Étiquette de la flèche
            </div>
            <input
              autoFocus
              value={renamingEdge.value}
              onChange={(e) =>
                setRenamingEdge({ ...renamingEdge, value: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  board.setEdgeLabel(renamingEdge.edge.id, renamingEdge.value.trim());
                  setRenamingEdge(null);
                }
                if (e.key === "Escape") setRenamingEdge(null);
              }}
              placeholder="mène à, provoque, se souvient de…"
              className="w-full h-9 px-2.5 rounded text-[13px]"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-1)",
              }}
            />
            <p
              className="text-[11px] mt-2 leading-snug"
              style={{ color: "var(--text-4)" }}
            >
              Cette flèche n&apos;existe que sur le plateau : elle ne crée
              aucune relation dans les fiches.
            </p>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => {
                  board.setEdgeLabel(renamingEdge.edge.id, renamingEdge.value.trim());
                  setRenamingEdge(null);
                }}
                className="h-8 px-3 rounded text-[12.5px] cursor-pointer border-none font-medium"
                style={{ background: "var(--accent)", color: "#1a1410" }}
              >
                Terminé
              </button>
            </div>
          </div>
        </>
      )}

      {/* Nom d'un cadre */}
      {renamingCadre && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/40"
            onClick={() => setRenamingCadre(null)}
          />
          <div
            className="fixed z-[85] inset-x-0 top-[28vh] mx-auto w-[min(380px,92vw)] rounded-[var(--radius-md)] p-4 shadow-2xl"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border-soft)" }}
          >
            <div
              className="text-[10px] uppercase mb-2"
              style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
            >
              Nom du cadre
            </div>
            <input
              autoFocus
              value={renamingCadre.value}
              onChange={(e) =>
                setRenamingCadre({ ...renamingCadre, value: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  board.updateNode(renamingCadre.node.id, {
                    content: {
                      ...renamingCadre.node.content,
                      title: renamingCadre.value.trim(),
                    },
                  });
                  setRenamingCadre(null);
                }
                if (e.key === "Escape") setRenamingCadre(null);
              }}
              placeholder="La maison Yorgden, L'équipage du Sorror…"
              className="w-full h-9 px-2.5 rounded text-[13px]"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-1)",
              }}
            />
            <div className="flex items-center gap-1.5 mt-3">
              {SHAPE_COLORS.map((c) => (
                <button
                  key={c.stroke}
                  onClick={() => {
                    const style = { ...renamingCadre.node.style, color: c.stroke };
                    board.updateNode(renamingCadre.node.id, { style });
                    setRenamingCadre({
                      ...renamingCadre,
                      node: { ...renamingCadre.node, style },
                    });
                  }}
                  title={c.label}
                  aria-label={c.label}
                  className="w-5 h-5 rounded-[3px] cursor-pointer"
                  style={{
                    background: c.fill,
                    border:
                      renamingCadre.node.style.color === c.stroke
                        ? `2px solid ${c.stroke}`
                        : `1px solid ${c.stroke}`,
                  }}
                />
              ))}
              <button
                onClick={() => {
                  board.updateNode(renamingCadre.node.id, {
                    content: {
                      ...renamingCadre.node.content,
                      title: renamingCadre.value.trim(),
                    },
                  });
                  setRenamingCadre(null);
                }}
                className="ml-auto h-8 px-3 rounded text-[12.5px] cursor-pointer border-none font-medium"
                style={{ background: "var(--accent)", color: "#1a1410" }}
              >
                Terminé
              </button>
            </div>
          </div>
        </>
      )}

      {/* Choix du type de relation */}
      {pendingLink && (
        <LinkTypePicker
          fromTitle={
            entriesById.get(pendingLink.from.entry_id ?? "")?.title ?? "cette fiche"
          }
          toTitle={entriesById.get(pendingLink.to.entry_id ?? "")?.title ?? "l'autre"}
          anchor={pendingLink.anchor}
          customTypes={ownTypes}
          onPick={confirmLink}
          onCancel={() => setPendingLink(null)}
        />
      )}
    </div>
  );
}
