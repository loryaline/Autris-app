import { getCategoryDef } from "@/lib/wb-constants";

/**
 * Export du World Building en Markdown — importable tel quel dans Notion
 * (glisser le fichier .md → Notion crée une page structurée).
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

/** Clé technique (snake_case) → libellé lisible. */
function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Valeur d'un champ template_data → texte, ou "" si non rendable. */
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

/** Construit le document Markdown de tout l'univers. */
export function buildWbMarkdown(
  entries: ExportableEntry[],
  projectTitle: string,
): string {
  // On exclut le moodboard (pas du contenu rédactionnel) et les archives.
  const active = entries.filter(
    (e) => e.status !== "archive" && e.category !== "moodboard",
  );

  // Regroupement par catégorie.
  const byCat = new Map<string, ExportableEntry[]>();
  for (const e of active) {
    const list = byCat.get(e.category) ?? [];
    list.push(e);
    byCat.set(e.category, list);
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let md = `# Univers — ${projectTitle}\n\n`;
  md += `> Export du World Building · ${today} · ${active.length} fiche${active.length > 1 ? "s" : ""}\n\n`;

  if (active.length === 0) {
    md += "_Aucune fiche à exporter._\n";
    return md;
  }

  for (const [catKey, list] of byCat) {
    const cat = getCategoryDef(catKey);
    md += `## ${cat?.label ?? catKey}\n\n`;

    list.sort((a, b) =>
      (a.title ?? "").localeCompare(b.title ?? "", "fr", { sensitivity: "base" }),
    );

    for (const e of list) {
      md += `### ${e.title?.trim() || "Sans titre"}\n\n`;
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

      md += `---\n\n`;
    }
  }

  return md;
}

/** Télécharge une chaîne dans un fichier. */
export function downloadTextFile(filename: string, content: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
