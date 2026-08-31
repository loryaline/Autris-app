import type { WbBoardEdge, WbBoardNode, WbEntry, WbLink } from "@/types/database";

/**
 * Export d'un plateau en image PNG.
 *
 * C'est un REDESSIN, pas une capture d'écran : le plateau est du HTML,
 * et aucun navigateur ne sait rendre du HTML dans un canvas sans passer
 * par une bibliothèque tierce. On retrace donc la même géométrie —
 * mêmes positions, mêmes couleurs, mêmes flèches — sur un canvas.
 *
 * Conséquence assumée : le résultat est plus sobre que l'écran (pas de
 * texte riche dans les post-its, pas d'ombres). En échange il est net à
 * n'importe quelle échelle, sans dépendance, et sans capture d'écran à
 * recadrer à la main.
 */

/** Marge autour du contenu, en unités plateau. */
const MARGIN = 60;

/** Couleurs de secours quand le thème n'est pas lisible depuis le canvas. */
const INK = {
  bg: "#12151C",
  text: "#E8E6E1",
  faint: "#8A91A1",
  line: "#D9A25F",
  border: "rgba(255,255,255,0.14)",
  card: "#1A1E27",
};

/**
 * Une couleur du thème (`var(--accent)`) n'existe pas pour un canvas :
 * on la résout via la page avant de dessiner.
 */
function resolveColor(c: string, host: HTMLElement): string {
  const m = /^var\((--[\w-]+)\)$/.exec(c.trim());
  if (!m) return c;
  const v = getComputedStyle(host).getPropertyValue(m[1]).trim();
  return v || INK.line;
}

/** Charge une image en autorisant le canvas à rester exportable. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Texte tronqué à la largeur disponible, avec une ellipse. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

/** Même découpe qu'à l'écran : le trait s'arrête au bord des vignettes. */
function clipToBoxes(
  a: WbBoardNode,
  b: WbBoardNode,
  hOf: (n: WbBoardNode) => number,
) {
  const ax = a.x + a.w / 2;
  const ay = a.y + hOf(a) / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + hOf(b) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const clip = (n: WbBoardNode, sx: number, sy: number) => {
    if (dx === 0 && dy === 0) return { x: sx, y: sy };
    const t = Math.min(
      dx === 0 ? Infinity : n.w / 2 / Math.abs(dx),
      dy === 0 ? Infinity : hOf(n) / 2 / Math.abs(dy),
    );
    return { x: sx + dx * t, y: sy + dy * t };
  };
  const p1 = clip(a, ax, ay);
  const c = clip(b, bx, by);
  return { x1: p1.x, y1: p1.y, x2: bx - (c.x - bx), y2: by - (c.y - by) };
}

export async function exportBoardImage({
  title,
  nodes,
  edges,
  entriesById,
  linksById,
  heights,
  host,
  scale = 2,
}: {
  title: string;
  nodes: WbBoardNode[];
  edges: WbBoardEdge[];
  entriesById: Map<string, WbEntry>;
  linksById: Map<string, WbLink>;
  /**
   * Hauteurs réellement rendues. Une fiche épouse son contenu : dessiner
   * sa hauteur stockée décalerait les flèches et le cadrage.
   */
  heights?: Record<string, number>;
  /** Élément de la page dont on lit les couleurs du thème. */
  host: HTMLElement;
  /** Densité de pixels — 2 donne une image nette à l'impression. */
  scale?: number;
}): Promise<void> {
  if (nodes.length === 0) throw new Error("Ce plateau est vide.");

  const hOf = (n: WbBoardNode) => heights?.[n.id] ?? n.h;

  const minX = Math.min(...nodes.map((n) => n.x)) - MARGIN;
  const minY = Math.min(...nodes.map((n) => n.y)) - MARGIN;
  const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + MARGIN;
  const maxY = Math.max(...nodes.map((n) => n.y + hOf(n))) + MARGIN;
  const w = maxX - minX;
  const h = maxY - minY;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le navigateur n'a pas fourni de canvas.");

  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);

  const themed = (c: string) => resolveColor(c, host);
  const bg = themed("var(--bg)") || INK.bg;
  ctx.fillStyle = bg;
  ctx.fillRect(minX, minY, w, h);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const byZ = [...nodes].sort((a, b) => a.z - b.z);

  // 1. Les cadres, tout au fond — ce sont des contenants.
  for (const n of byZ) {
    if (n.kind !== "cadre") continue;
    const color = themed((n.style.color as string) ?? "var(--accent)");
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    roundRect(ctx, n.x, n.y, n.w, hOf(n), 8);
    ctx.stroke();
    ctx.restore();
    const label = (n.content.title as string) ?? "";
    if (label) {
      ctx.fillStyle = color;
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(label, n.x + 4, n.y - 6);
    }
  }

  // 2. Les flèches.
  ctx.lineWidth = 1.4;
  for (const e of edges) {
    const a = nodeById.get(e.from_node_id);
    const b = nodeById.get(e.to_node_id);
    if (!a || !b) continue;
    const g = clipToBoxes(a, b, hOf);
    const vx = g.x2 - g.x1;
    const vy = g.y2 - g.y1;
    const len = Math.hypot(vx, vy) || 1;
    const wp = e.waypoints?.[0] as { t?: number; o?: number } | undefined;
    const ok = wp && Number.isFinite(wp.t) && Number.isFinite(wp.o);
    const ux = vx / len;
    const uy = vy / len;
    const nx = -uy;
    const ny = ux;
    const mx = g.x1 + ux * (ok ? (wp!.t as number) * len : len / 2) +
      nx * (ok ? (wp!.o as number) : 0);
    const my = g.y1 + uy * (ok ? (wp!.t as number) * len : len / 2) +
      ny * (ok ? (wp!.o as number) : 0);
    const cx = 2 * mx - (g.x1 + g.x2) / 2;
    const cy = 2 * my - (g.y1 + g.y2) / 2;

    ctx.strokeStyle = themed("var(--accent)") || INK.line;
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.quadraticCurveTo(cx, cy, g.x2, g.y2);
    ctx.stroke();

    // Pointe, orientée par la tangente d'arrivée.
    const tx = g.x2 - cx;
    const ty = g.y2 - cy;
    const tl = Math.hypot(tx, ty) || 1;
    const a1 = Math.atan2(ty / tl, tx / tl);
    ctx.fillStyle = themed("var(--accent)") || INK.line;
    ctx.beginPath();
    ctx.moveTo(g.x2, g.y2);
    ctx.lineTo(
      g.x2 - 9 * Math.cos(a1 - 0.4),
      g.y2 - 9 * Math.sin(a1 - 0.4),
    );
    ctx.lineTo(
      g.x2 - 9 * Math.cos(a1 + 0.4),
      g.y2 - 9 * Math.sin(a1 + 0.4),
    );
    ctx.closePath();
    ctx.fill();

    // Étiquette : le type de relation, ou le texte d'une flèche libre.
    const label = e.wb_link_id
      ? (linksById.get(e.wb_link_id)?.link_type ?? "")
      : (e.label ?? "");
    if (label) {
      ctx.font = "10px ui-monospace, monospace";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = bg;
      roundRect(ctx, mx - tw / 2 - 4, my - 8, tw + 8, 15, 4);
      ctx.fill();
      ctx.strokeStyle = themed("var(--border-soft)") || INK.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = themed("var(--text-2)") || INK.faint;
      ctx.fillText(label, mx - tw / 2, my + 3);
      ctx.lineWidth = 1.4;
    }
  }

  // 3. Les objets, par-dessus.
  for (const n of byZ) {
    if (n.kind === "cadre") continue;
    const entry = n.entry_id ? entriesById.get(n.entry_id) : null;
    const color = themed((n.style.color as string) ?? "var(--accent)");

    if (n.kind === "postit") {
      ctx.fillStyle = (n.style.color as string) ?? "#E8C77A";
      roundRect(ctx, n.x, n.y, n.w, hOf(n), 6);
      ctx.fill();
      const text = ((n.content.html as string) ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      ctx.fillStyle = "#1A1A1A";
      ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(ellipsize(ctx, text, n.w - 16), n.x + 8, n.y + 20);
      continue;
    }

    if (n.kind === "texte") {
      const text = ((n.content.html as string) ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      ctx.fillStyle = themed((n.style.color as string) ?? "var(--text-1)");
      ctx.font = `${(n.style.size as number) ?? 16}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(text, n.x, n.y + 16);
      continue;
    }

    // Fiches, cartes, formes, images : une boîte.
    ctx.fillStyle = themed("var(--bg-3)") || INK.card;
    roundRect(ctx, n.x, n.y, n.w, hOf(n), 8);
    ctx.fill();
    ctx.strokeStyle = themed("var(--border-soft)") || INK.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const img = entry?.main_image_url ? await loadImage(entry.main_image_url) : null;
    let textY = n.y + 22;
    if (img) {
      // Portrait carré en haut, comme à l'écran.
      const side = Math.min(n.w, hOf(n) - 40);
      ctx.save();
      roundRect(ctx, n.x, n.y, n.w, side, 8);
      ctx.clip();
      ctx.drawImage(img, n.x, n.y, n.w, side);
      ctx.restore();
      textY = n.y + side + 20;
    } else {
      // Bandeau de couleur, seul repère quand il n'y a pas d'image.
      ctx.fillStyle = color;
      ctx.fillRect(n.x, n.y, n.w, 3);
    }

    if (entry) {
      ctx.fillStyle = themed("var(--text-1)") || INK.text;
      ctx.font = "15px ui-serif, Georgia, serif";
      ctx.fillText(ellipsize(ctx, entry.title, n.w - 16), n.x + 8, textY);
    }
  }

  // Signature discrète : une image sortie d'Autris doit savoir d'où elle vient.
  ctx.fillStyle = themed("var(--text-4)") || INK.faint;
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(title, minX + 12, maxY - 14);

  // Un canvas contaminé par une image d'une autre origine refuse de
  // s'exporter : on le dit plutôt que de laisser une erreur brute.
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, "image/png");
    } catch {
      resolve(null);
    }
  });
  if (!blob) {
    throw new Error(
      "L'image n'a pas pu être produite : une illustration du plateau " +
        "interdit son export. Réessaie après avoir retiré les images.",
    );
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w\s-]/g, "").trim() || "plateau"}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
