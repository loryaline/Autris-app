import { getCategoryDef } from "@/lib/wb-constants";

/**
 * Export du World Building.
 *
 * Génère un .zip contenant un fichier Markdown par fiche, rangé dans un
 * dossier par catégorie. Importé dans Notion, le zip recrée une
 * arborescence : une page par catégorie, une sous-page par fiche.
 */

interface ExportableEntry {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  category: string;
  tags: string[] | null;
  template_data: Record<string, unknown> | null;
  personal_notes: string | null;
  main_image_url: string | null;
  status: string;
}

/** HTML TipTap → texte brut (sauts de ligne entre blocs). */
function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)\s*>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return htmlToText(v).replace(/\n+/g, " ").trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : ""))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "univers"
  );
}

/** Nom de fichier/dossier sûr (sans caractères interdits). */
function safeName(s: string): string {
  return (
    s
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 80) || "Sans titre"
  );
}

/** Markdown autonome d'une fiche (titre en #, prêt pour une page Notion). */
function entryMarkdown(e: ExportableEntry): string {
  const cat = getCategoryDef(e.category);
  let md = `# ${e.title?.trim() || "Sans titre"}\n\n`;
  md += `> ${cat?.label ?? e.category}\n\n`;
  if (e.subtitle?.trim()) md += `*${e.subtitle.trim()}*\n\n`;
  if (e.main_image_url) md += `![${e.title ?? ""}](${e.main_image_url})\n\n`;

  const desc = htmlToText(e.description);
  if (desc) md += `${desc}\n\n`;

  if (e.template_data && typeof e.template_data === "object") {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(e.template_data)) {
      const val = renderValue(v);
      if (val) lines.push(`- **${humanize(k)}** : ${val}`);
    }
    if (lines.length > 0) md += lines.join("\n") + "\n\n";
  }

  if (e.tags && e.tags.length > 0) {
    md += `**Tags** : ${e.tags.join(", ")}\n\n`;
  }

  const notes = htmlToText(e.personal_notes);
  if (notes) md += `**Notes** : ${notes}\n\n`;

  return md.trimEnd() + "\n";
}

/**
 * Construit un .zip : un .md par fiche, dans un dossier par catégorie.
 * Le paquet jszip est chargé dynamiquement (hors bundle initial).
 */
export async function buildWbZip(
  entries: ExportableEntry[],
  projectTitle: string,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Moodboard + archives exclus.
  const active = entries.filter(
    (e) => e.status !== "archive" && e.category !== "moodboard",
  );

  // Compteur de noms par dossier pour dédoublonner les fiches homonymes.
  const used = new Map<string, number>();
  const byCat = new Map<string, number>();

  for (const e of active) {
    const cat = getCategoryDef(e.category);
    const folder = safeName(cat?.label ?? e.category);
    let name = safeName(e.title?.trim() || "Sans titre");
    const key = `${folder}/${name}`;
    const n = (used.get(key) ?? 0) + 1;
    used.set(key, n);
    if (n > 1) name = `${name} (${n})`;
    byCat.set(folder, (byCat.get(folder) ?? 0) + 1);
    zip.file(`${folder}/${name}.md`, entryMarkdown(e));
  }

  // Index racine.
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  let index = `# Univers — ${projectTitle}\n\n`;
  index += `> Export du World Building · ${today} · ${active.length} fiche${active.length > 1 ? "s" : ""}\n\n`;
  for (const [folder, count] of byCat) {
    index += `- **${folder}** — ${count} fiche${count > 1 ? "s" : ""}\n`;
  }
  zip.file("README.md", index);

  return zip.generateAsync({ type: "blob" });
}

/** Télécharge un Blob sous un nom de fichier donné. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
