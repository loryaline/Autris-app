"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { areReciprocal } from "@/lib/wb-constants";
import type {
  WbBoard,
  WbBoardEdge,
  WbBoardNode,
  WbLink,
  WbNodeKind,
} from "@/types/database";

/**
 * Données d'un plateau : chargement, création à la volée du plateau
 * principal, et écritures optimistes.
 *
 * Règle de vérité (cf. PRD) : le plateau ne stocke que la géométrie.
 * Supprimer un nœud ou une arête ne touche jamais wb_entries ni wb_links.
 * Créer un lien typé écrit en revanche dans wb_links — asymétrie voulue.
 */

/** Post-it d'accueil du tout premier plateau. */
const WELCOME_POSTIT = {
  html: "<p>Commence à brainstormer ton univers ici !</p>",
  color: "#E8C77A",
};

export interface BoardState {
  loading: boolean;
  /** Plateau actuellement ouvert. */
  board: WbBoard | null;
  /** Tous les plateaux du projet, pour le sélecteur. */
  boards: WbBoard[];
  nodes: WbBoardNode[];
  edges: WbBoardEdge[];
  error: string | null;
}

export function useBoard(projectId: string) {
  const [state, setState] = useState<BoardState>({
    loading: true,
    board: null,
    boards: [],
    nodes: [],
    edges: [],
    error: null,
  });
  const supabaseRef = useRef(createClient());

  /* ---- Chargement (+ création du plateau principal si absent) ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: boards, error: boardErr } = await supabase
        .from("wb_boards")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_main", true)
        .limit(1);

      if (boardErr) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error:
              "Le plateau n'a pas pu être chargé. La migration wb_boards a-t-elle été exécutée ?",
          }));
        }
        return;
      }

      let board = (boards?.[0] as WbBoard) ?? null;

      // Premier passage : on crée le plateau principal avec son post-it
      // d'accueil, pour ne jamais tomber sur une surface vide.
      if (!board) {
        const { data: created, error: createErr } = await supabase
          .from("wb_boards")
          .insert({
            project_id: projectId,
            user_id: user.id,
            title: "Plateau principal",
            is_main: true,
          })
          .select()
          .single();
        if (createErr || !created) {
          if (!cancelled) {
            setState((s) => ({
              ...s,
              loading: false,
              error: "Impossible de créer le plateau principal.",
            }));
          }
          return;
        }
        board = created as WbBoard;
        await supabase.from("wb_board_nodes").insert({
          board_id: board.id,
          user_id: user.id,
          kind: "postit",
          x: -110,
          y: -70,
          w: 220,
          h: 140,
          content: { html: WELCOME_POSTIT.html },
          style: { color: WELCOME_POSTIT.color },
        });
      }

      const [nodesRes, edgesRes, allBoardsRes] = await Promise.all([
        supabase.from("wb_board_nodes").select("*").eq("board_id", board.id),
        supabase.from("wb_board_edges").select("*").eq("board_id", board.id),
        supabase
          .from("wb_boards")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;
      setState({
        loading: false,
        board,
        boards: (allBoardsRes.data ?? [board]) as WbBoard[],
        nodes: (nodesRes.data ?? []) as WbBoardNode[],
        edges: (edgesRes.data ?? []) as WbBoardEdge[],
        error: null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /* ---- Changer de plateau ---- */
  const openBoard = useCallback(async (target: WbBoard) => {
    const supabase = supabaseRef.current;
    setState((s) => ({ ...s, loading: true }));
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from("wb_board_nodes").select("*").eq("board_id", target.id),
      supabase.from("wb_board_edges").select("*").eq("board_id", target.id),
    ]);
    setState((s) => ({
      ...s,
      loading: false,
      board: target,
      nodes: (nodesRes.data ?? []) as WbBoardNode[],
      edges: (edgesRes.data ?? []) as WbBoardEdge[],
    }));
  }, []);

  /** Crée un plateau vide (jamais principal) et l'ouvre. */
  const createBoard = useCallback(
    async (title: string) => {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("wb_boards")
        .insert({
          project_id: projectId,
          user_id: user.id,
          title: title.trim() || "Nouveau plateau",
          is_main: false,
        })
        .select()
        .single();
      if (error || !data) return null;
      const created = data as WbBoard;
      setState((s) => ({
        ...s,
        boards: [...s.boards, created],
        board: created,
        nodes: [],
        edges: [],
      }));
      return created;
    },
    [projectId],
  );

  const renameBoard = useCallback(async (id: string, title: string) => {
    setState((s) => ({
      ...s,
      boards: s.boards.map((b) => (b.id === id ? { ...b, title } : b)),
      board: s.board?.id === id ? { ...s.board, title } : s.board,
    }));
    await supabaseRef.current.from("wb_boards").update({ title }).eq("id", id);
  }, []);

  /** Supprime un plateau et bascule sur le principal. Le plateau
   * principal, lui, ne se supprime pas : c'est l'accueil du World
   * Building, il doit toujours exister. */
  const deleteBoard = useCallback(
    async (id: string) => {
      const target = state.boards.find((b) => b.id === id);
      if (!target || target.is_main) return;
      const remaining = state.boards.filter((b) => b.id !== id);
      const fallback = remaining.find((b) => b.is_main) ?? remaining[0];
      await supabaseRef.current.from("wb_boards").delete().eq("id", id);
      setState((s) => ({ ...s, boards: remaining }));
      if (fallback) await openBoard(fallback);
    },
    [state.boards, openBoard],
  );

  /* ============================================================
   * Annuler / refaire
   *
   * Par INSTANTANÉS plutôt que par inverse de commande : une seule
   * mécanique couvre tout (déplacer, créer, supprimer, empiler,
   * relier, étiqueter…) au lieu d'un inverse à écrire — et à oublier —
   * pour chaque action. Un plateau tient dans quelques centaines de
   * lignes : la mémoire n'est pas un problème.
   *
   * La restauration calcule la différence avec l'état courant et ne
   * touche en base que ce qui a réellement changé. Les objets recréés
   * le sont avec LEUR identifiant d'origine, sinon les flèches
   * perdraient leurs extrémités.
   * ============================================================ */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  interface Snapshot {
    nodes: WbBoardNode[];
    edges: WbBoardEdge[];
  }
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  // Profondeurs des piles, tenues en state : lire une ref pendant le
  // rendu est interdit, et l'UI a besoin de savoir si Annuler est actif.
  const [historyDepth, setHistoryDepth] = useState({ undo: 0, redo: 0 });
  const MAX_HISTORY = 60;
  const syncDepth = useCallback(() => {
    setHistoryDepth({
      undo: undoStack.current.length,
      redo: redoStack.current.length,
    });
  }, []);

  /** À appeler AVANT toute action modifiant le plateau. */
  const beginHistory = useCallback(() => {
    const s = stateRef.current;
    if (!s.board) return;
    undoStack.current.push({ nodes: s.nodes, edges: s.edges });
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    syncDepth();
  }, [syncDepth]);

  /** Remet le plateau dans l'état donné, en base comme à l'écran. */
  const applySnapshot = useCallback(async (snap: Snapshot) => {
    const supabase = supabaseRef.current;
    const cur = stateRef.current;
    const board = cur.board;
    if (!board) return;

    setState((s) => ({ ...s, nodes: snap.nodes, edges: snap.edges }));

    const curNodes = new Map(cur.nodes.map((n) => [n.id, n]));
    const snapNodes = new Map(snap.nodes.map((n) => [n.id, n]));
    const curEdges = new Map(cur.edges.map((e) => [e.id, e]));
    const snapEdges = new Map(snap.edges.map((e) => [e.id, e]));

    const ops: PromiseLike<unknown>[] = [];

    // Arêtes d'abord en suppression (elles dépendent des nœuds)…
    const edgesToDelete = [...curEdges.keys()].filter((id) => !snapEdges.has(id));
    if (edgesToDelete.length > 0) {
      await supabase.from("wb_board_edges").delete().in("id", edgesToDelete);
    }

    const nodesToDelete = [...curNodes.keys()].filter((id) => !snapNodes.has(id));
    if (nodesToDelete.length > 0) {
      await supabase.from("wb_board_nodes").delete().in("id", nodesToDelete);
    }

    // …puis les nœuds en création, avant les arêtes qui les relient.
    const nodesToInsert = [...snapNodes.values()].filter((n) => !curNodes.has(n.id));
    if (nodesToInsert.length > 0) {
      await supabase.from("wb_board_nodes").insert(nodesToInsert);
    }
    const edgesToInsert = [...snapEdges.values()].filter((e) => !curEdges.has(e.id));
    if (edgesToInsert.length > 0) {
      await supabase.from("wb_board_edges").insert(edgesToInsert);
    }

    for (const n of snapNodes.values()) {
      const before = curNodes.get(n.id);
      if (!before || JSON.stringify(before) === JSON.stringify(n)) continue;
      ops.push(supabase.from("wb_board_nodes").update(n).eq("id", n.id));
    }
    for (const e of snapEdges.values()) {
      const before = curEdges.get(e.id);
      if (!before || JSON.stringify(before) === JSON.stringify(e)) continue;
      ops.push(supabase.from("wb_board_edges").update(e).eq("id", e.id));
    }
    await Promise.all(ops);
  }, []);

  const undo = useCallback(async () => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    const cur = stateRef.current;
    redoStack.current.push({ nodes: cur.nodes, edges: cur.edges });
    syncDepth();
    await applySnapshot(snap);
  }, [applySnapshot, syncDepth]);

  const redo = useCallback(async () => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    const cur = stateRef.current;
    undoStack.current.push({ nodes: cur.nodes, edges: cur.edges });
    syncDepth();
    await applySnapshot(snap);
  }, [applySnapshot, syncDepth]);

  /* ---- Position : optimiste en mémoire, écriture différée ---- */
  const pendingMoves = useRef(new Map<string, { x: number; y: number }>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushMoves = useCallback(() => {
    const supabase = supabaseRef.current;
    const batch = [...pendingMoves.current.entries()];
    pendingMoves.current.clear();
    for (const [id, pos] of batch) {
      supabase.from("wb_board_nodes").update(pos).eq("id", id).then(
        () => {},
        () => {},
      );
    }
  }, []);

  const moveNode = useCallback(
    (id: string, x: number, y: number) => {
      setState((s) => ({
        ...s,
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      }));
      pendingMoves.current.set(id, { x, y });
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flushMoves, 600);
    },
    [flushMoves],
  );

  // Ne pas perdre les derniers déplacements en quittant la page.
  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushMoves();
    };
  }, [flushMoves]);

  /* ---- Ajout d'un nœud ---- */
  const addNode = useCallback(
    async (
      kind: WbNodeKind,
      x: number,
      y: number,
      opts?: {
        entryId?: string;
        content?: Record<string, unknown>;
        style?: Record<string, unknown>;
        w?: number;
        h?: number;
        z?: number;
      },
    ): Promise<WbBoardNode | null> => {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const board = state.board;
      if (!user || !board) return null;
      beginHistory();

      const { data, error } = await supabase
        .from("wb_board_nodes")
        .insert({
          board_id: board.id,
          user_id: user.id,
          kind,
          entry_id: opts?.entryId ?? null,
          x,
          y,
          w: opts?.w ?? 200,
          h: opts?.h ?? (kind === "fiche" ? 116 : 140),
          z: opts?.z ?? 0,
          content: opts?.content ?? {},
          style: opts?.style ?? {},
        })
        .select()
        .single();
      if (error || !data) return null;
      const node = data as WbBoardNode;
      setState((s) => ({ ...s, nodes: [...s.nodes, node] }));
      return node;
    },
    [state.board, beginHistory],
  );

  /* ---- Redimensionnement : optimiste, écriture différée ---- */
  const pendingSizes = useRef(new Map<string, { w: number; h: number }>());
  const sizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSizes = useCallback(() => {
    const supabase = supabaseRef.current;
    const batch = [...pendingSizes.current.entries()];
    pendingSizes.current.clear();
    for (const [id, size] of batch) {
      supabase.from("wb_board_nodes").update(size).eq("id", id).then(
        () => {},
        () => {},
      );
    }
  }, []);

  const resizeNode = useCallback(
    (id: string, w: number, h: number) => {
      setState((s) => ({
        ...s,
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, w, h } : n)),
      }));
      pendingSizes.current.set(id, { w, h });
      if (sizeTimer.current) clearTimeout(sizeTimer.current);
      sizeTimer.current = setTimeout(flushSizes, 600);
    },
    [flushSizes],
  );

  useEffect(() => {
    return () => {
      if (sizeTimer.current) clearTimeout(sizeTimer.current);
      flushSizes();
    };
  }, [flushSizes]);

  /* ---- Mise à jour d'un nœud (contenu, style, taille) ---- */
  const updateNode = useCallback(
    async (id: string, patch: Partial<WbBoardNode>) => {
      beginHistory();
      setState((s) => ({
        ...s,
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }));
      await supabaseRef.current.from("wb_board_nodes").update(patch).eq("id", id);
    },
    [beginHistory],
  );

  /* ---- Suppression de nœuds ----
   * Ne touche QUE le plateau : les fiches et les relations restent intactes.
   * Les arêtes rattachées disparaissent (cascade DB), on les retire aussi
   * de l'état local. */
  const removeNodes = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    beginHistory();
    const idSet = new Set(ids);
    setState((s) => ({
      ...s,
      nodes: s.nodes.filter((n) => !idSet.has(n.id)),
      edges: s.edges.filter(
        (e) => !idSet.has(e.from_node_id) && !idSet.has(e.to_node_id),
      ),
    }));
    await supabaseRef.current.from("wb_board_nodes").delete().in("id", ids);
  }, [beginHistory]);

  /* ---- Création d'un lien typé ----
   * Écrit une vraie relation dans wb_links, puis l'arête qui l'affiche.
   * Si la relation existe déjà entre ces deux fiches, on la réutilise
   * au lieu d'en créer une seconde. */
  const addTypedLink = useCallback(
    async (
      fromNode: WbBoardNode,
      toNode: WbBoardNode,
      linkType: string,
      existingLinks: WbLink[],
    ): Promise<{ edge: WbBoardEdge; link: WbLink | null } | null> => {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const board = state.board;
      if (!user || !board) return null;
      if (!fromNode.entry_id || !toNode.entry_id) return null;

      // Réutilise une relation identique déjà saisie — DANS LES DEUX
      // SENS. « A ami B » et « B ami A » énoncent le même fait : les
      // stocker toutes les deux créerait un doublon, et deux flèches
      // qui se répondent bêtement sur le plateau.
      const a = fromNode.entry_id;
      const b = toNode.entry_id;
      let link =
        existingLinks.find((l) => {
          const sameWay = l.from_entry_id === a && l.to_entry_id === b;
          const otherWay = l.from_entry_id === b && l.to_entry_id === a;
          if (!sameWay && !otherWay) return false;
          if (l.link_type === linkType) return true;
          // « sœur » posé alors que « frère » existe déjà dans l'autre
          // sens : c'est le même fait, on ne le réécrit pas.
          return otherWay && areReciprocal(l.link_type, linkType);
        }) ?? null;

      if (!link) {
        const { data: created, error } = await supabase
          .from("wb_links")
          .insert({
            from_entry_id: a,
            to_entry_id: b,
            link_type: linkType,
            user_id: user.id,
          })
          .select()
          .single();
        if (error || !created) return null;
        link = created as WbLink;
      }

      // La flèche suit le sens RÉEL de la relation, pas celui du geste :
      // si on réutilise « A père de B » en tirant de B vers A, la pointe
      // doit rester sur B.
      const startNode = link.from_entry_id === a ? fromNode : toNode;
      const endNode = startNode.id === fromNode.id ? toNode : fromNode;

      // Cette flèche est-elle déjà tracée entre ces deux vignettes ?
      const already = state.edges.find(
        (e) =>
          e.wb_link_id === link!.id &&
          e.from_node_id === startNode.id &&
          e.to_node_id === endNode.id,
      );
      if (already) return { edge: already, link };

      const { data: edgeData, error: edgeErr } = await supabase
        .from("wb_board_edges")
        .insert({
          board_id: board.id,
          user_id: user.id,
          from_node_id: startNode.id,
          to_node_id: endNode.id,
          wb_link_id: link.id,
        })
        .select()
        .single();
      if (edgeErr || !edgeData) return null;

      const edge = edgeData as WbBoardEdge;
      setState((s) => ({ ...s, edges: [...s.edges, edge] }));
      return { edge, link };
    },
    [state.board, state.edges],
  );

  /* ---- Profondeur (ordre d'empilement) ----
   * On renumérote toute la pile de 0 à n-1 et on n'écrit que les nœuds
   * dont la profondeur a réellement bougé. Cela répare au passage les
   * égalités de profondeur héritées (tout le monde à 0 au départ). */
  const applyOrder = useCallback(async (ordered: WbBoardNode[]) => {
    beginHistory();
    const changed = ordered
      .map((n, i) => ({ id: n.id, z: i, was: n.z }))
      .filter((u) => u.z !== u.was);
    if (changed.length === 0) return;
    const byId = new Map(changed.map((u) => [u.id, u.z]));
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) =>
        byId.has(n.id) ? { ...n, z: byId.get(n.id)! } : n,
      ),
    }));
    const supabase = supabaseRef.current;
    await Promise.all(
      changed.map((u) =>
        supabase.from("wb_board_nodes").update({ z: u.z }).eq("id", u.id),
      ),
    );
  }, [beginHistory]);

  /* ---- Relations déjà connues, affichées à la dépose ----
   * Poser une fiche fait venir avec elle les relations qu'elle entretient
   * déjà avec les fiches présentes sur le plateau : on ne redessine pas à
   * la main ce que le World Building sait déjà. Rien n'est écrit dans
   * wb_links — on ne fait qu'afficher l'existant. */
  const materializeLinks = useCallback(
    async (node: WbBoardNode, allLinks: WbLink[]) => {
      const board = state.board;
      if (!node.entry_id || !board) return;
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const others = state.nodes.filter((n) => n.entry_id && n.id !== node.id);
      const already = new Set(
        state.edges
          .filter((e) => e.wb_link_id)
          .map((e) => `${e.wb_link_id}::${e.from_node_id}::${e.to_node_id}`),
      );

      const payloads: {
        board_id: string;
        user_id: string;
        from_node_id: string;
        to_node_id: string;
        wb_link_id: string;
      }[] = [];

      for (const link of allLinks) {
        const otherEntryId =
          link.from_entry_id === node.entry_id
            ? link.to_entry_id
            : link.to_entry_id === node.entry_id
              ? link.from_entry_id
              : null;
        if (!otherEntryId) continue;

        for (const other of others) {
          if (other.entry_id !== otherEntryId) continue;
          // Le sens de la flèche suit celui de la relation.
          const fromNode = link.from_entry_id === node.entry_id ? node : other;
          const toNode = fromNode.id === node.id ? other : node;
          const key = `${link.id}::${fromNode.id}::${toNode.id}`;
          if (already.has(key)) continue;
          already.add(key);
          payloads.push({
            board_id: board.id,
            user_id: user.id,
            from_node_id: fromNode.id,
            to_node_id: toNode.id,
            wb_link_id: link.id,
          });
        }
      }

      if (payloads.length === 0) return;
      const { data } = await supabase
        .from("wb_board_edges")
        .insert(payloads)
        .select();
      if (data) {
        setState((s) => ({ ...s, edges: [...s.edges, ...(data as WbBoardEdge[])] }));
      }
    },
    [state.board, state.nodes, state.edges],
  );

  /* ---- Flèche libre ----
   * Entre deux objets quelconques (post-it, forme, image, cadre…), ou
   * entre deux fiches quand on ne veut pas énoncer une relation
   * d'univers. N'écrit rien dans wb_links : c'est du raisonnement
   * visuel, pas de la donnée d'univers. */
  const addFreeEdge = useCallback(
    async (
      fromNode: WbBoardNode,
      toNode: WbBoardNode,
      label = "",
    ): Promise<WbBoardEdge | null> => {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const board = state.board;
      if (!user || !board) return null;
      beginHistory();

      const { data, error } = await supabase
        .from("wb_board_edges")
        .insert({
          board_id: board.id,
          user_id: user.id,
          from_node_id: fromNode.id,
          to_node_id: toNode.id,
          wb_link_id: null,
          label,
        })
        .select()
        .single();
      if (error || !data) return null;
      const edge = data as WbBoardEdge;
      setState((s) => ({ ...s, edges: [...s.edges, edge] }));
      return edge;
    },
    [state.board, beginHistory],
  );

  /** Étiquette d'une flèche libre (sans effet sur les liens typés). */
  const setEdgeLabel = useCallback(async (id: string, label: string) => {
    beginHistory();
    setState((s) => ({
      ...s,
      edges: s.edges.map((e) => (e.id === id ? { ...e, label } : e)),
    }));
    await supabaseRef.current
      .from("wb_board_edges")
      .update({ label })
      .eq("id", id);
  }, [beginHistory]);

  /* ---- Tracé d'une flèche : point de courbe déplaçable ----
   * Optimiste + écriture différée, comme les déplacements de nœuds. */
  const pendingWp = useRef(new Map<string, { t: number; o: number }[]>());
  const wpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushWaypoints = useCallback(() => {
    const supabase = supabaseRef.current;
    const batch = [...pendingWp.current.entries()];
    pendingWp.current.clear();
    for (const [id, waypoints] of batch) {
      supabase.from("wb_board_edges").update({ waypoints }).eq("id", id).then(
        () => {},
        () => {},
      );
    }
  }, []);

  const setEdgeWaypoint = useCallback(
    (id: string, point: { t: number; o: number } | null) => {
      const waypoints = point ? [point] : [];
      setState((s) => ({
        ...s,
        edges: s.edges.map((e) => (e.id === id ? { ...e, waypoints } : e)),
      }));
      pendingWp.current.set(id, waypoints);
      if (wpTimer.current) clearTimeout(wpTimer.current);
      wpTimer.current = setTimeout(flushWaypoints, 600);
    },
    [flushWaypoints],
  );

  useEffect(() => {
    return () => {
      if (wpTimer.current) clearTimeout(wpTimer.current);
      flushWaypoints();
    };
  }, [flushWaypoints]);

  /* ---- Suppression d'une arête ----
   * Ne retire QUE la flèche. La relation reste dans les deux fiches —
   * pour la rompre, il faut passer par l'éditeur de liens de la fiche.
   * C'est ce qui permet de ne demander aucune confirmation ici. */
  const removeEdge = useCallback(async (id: string) => {
    beginHistory();
    setState((s) => ({ ...s, edges: s.edges.filter((e) => e.id !== id) }));
    await supabaseRef.current.from("wb_board_edges").delete().eq("id", id);
  }, [beginHistory]);

  /* ---- Viewport ---- */
  const saveViewport = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      const board = state.board;
      if (!board) return;
      supabaseRef.current
        .from("wb_boards")
        .update({ viewport })
        .eq("id", board.id)
        .then(
          () => {},
          () => {},
        );
    },
    // Déplacer la vue n'est pas une modification du plateau : pas
    // d'entrée d'historique, on n'annule pas un cadrage.
    [state.board],
  );

  return {
    ...state,
    beginHistory,
    undo,
    redo,
    canUndo: historyDepth.undo > 0,
    canRedo: historyDepth.redo > 0,
    openBoard,
    createBoard,
    renameBoard,
    deleteBoard,
    moveNode,
    resizeNode,
    addNode,
    updateNode,
    removeNodes,
    applyOrder,
    materializeLinks,
    addTypedLink,
    addFreeEdge,
    setEdgeLabel,
    setEdgeWaypoint,
    removeEdge,
    saveViewport,
  };
}
