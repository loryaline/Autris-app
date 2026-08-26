import { createClient } from "@/lib/supabase/client";
import { entryMarkdown, safeName, slugify } from "@/lib/wb-export";

/**
 * Export complet d'un projet vers Notion.
 *
 * Un seul .zip, TOUT en Markdown : c'est le format que Notion importe le
 * mieux (une page par fichier, l'arborescence des dossiers devient une
 * arborescence de pages). Les exports par fonctionnalité restent à leur
 * place pour les autres usages — .docx pour envoyer un manuscrit,
 * .csv pour ouvrir le chapitrage dans un tableur.
 *
 * Arborescence produite :
 *
 *   <Projet>/
 *   ├── README.md
 *   ├── Univers/<Catégorie>/<Fiche>.md
 *   └── Romans/<Roman>/
 *       ├── Chapitrage.md
 *       ├── Synopsis/<Titre>.md
 *       └── Manuscrit/<NN — Chapitre>.md
 */

/* ---------- HTML (TipTap) → Markdown ---------- */

/** Échappe ce qui serait interprété comme du Markdown. */
function escapeMd(s: string): string {
  return s.replace(/([\\`*_[\]])/g, "\\$1");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Contenu inline d'un élément, avec ses marques de mise en forme. */
function inlineToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMd(decodeEntities(node.textContent ?? ""));
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const inner = Array.from(el.childNodes).map(inlineToMd).join("");
  if (!inner.trim() && el.tagName !== "BR") return inner;

  switch (el.tagName) {
    case "BR":
      return "  \n";
    case "STRONG":
    case "B":
      return `**${inner}**`;
    case "EM":
    case "I":
      return `*${inner}*`;
    case "S":
    case "STRIKE":
    case "DEL":
      return `~~${inner}~~`;
    case "U":
      // Markdown n'a pas de souligné ; Notion accepte l'HTML inline.
      return `<u>${inner}</u>`;
    case "CODE":
      return `\`${inner}\``;
    case "A": {
      const href = el.getAttribute("href");
      return href ? `[${inner}](${href})` : inner;
    }
    default:
      return inner;
  }
}

/** Bloc de haut niveau → lignes Markdown. */
function blockToMd(node: Node): string[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = (node.textContent ?? "").trim();
    return t ? [escapeMd(decodeEntities(t))] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  switch (el.tagName) {
    case "H1":
      return [`# ${inlineToMd(el)}`];
    case "H2":
      return [`## ${inlineToMd(el)}`];
    case "H3":
      return [`### ${inlineToMd(el)}`];
    case "H4":
    case "H5":
    case "H6":
      return [`#### ${inlineToMd(el)}`];
    case "BLOCKQUOTE":
      return Array.from(el.childNodes)
        .flatMap(blockToMd)
        .map((l) => `> ${l}`);
    case "HR":
      return ["---"];
    case "UL":
      return Array.from(el.children).map((li) => `- ${inlineToMd(li)}`);
    case "OL":
      return Array.from(el.children).map(
        (li, i) => `${i + 1}. ${inlineToMd(li)}`,
      );
    case "P":
    case "DIV": {
      const t = inlineToMd(el).trim();
      return t ? [t] : [];
    }
    default: {
      const t = inlineToMd(el).trim();
      return t ? [t] : [];
    }
  }
}

/** HTML produit par TipTap → Markdown lisible par Notion. */
export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  return Array.from(root.childNodes)
    .flatMap(blockToMd)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------- Types locaux ---------- */

interface NovelRow {
  id: string;
  title: string;
}
interface ChapterRow {
  id: string;
  title: string | null;
  content: string | null;
  position: number;
  synopsis: string | null;
  themes: string[] | null;
  plot_elements: string | null;
  minor_elements: string | null;
  observations: string | null;
  tension_indices: string | null;
  pivot: string | null;
  narrative_knot: string | null;
  status: string;
  word_count: number;
}

/** Cellule Markdown : pas de retour ligne ni de pipe dans un tableau. */
function cell(html: string | null | undefined): string {
  return htmlToMarkdown(html).replace(/\n+/g, " ").replace(/\|/g, "\\|").trim();
}

/* ---------- Export ---------- */

export interface ProjectExportProgress {
  (step: string): void;
}

/**
 * Construit le .zip complet d'un projet. Toutes les requêtes sont faites
 * ici : l'appelant n'a qu'un identifiant de projet à fournir.
 */
export async function buildProjectNotionZip(
  projectId: string,
  onProgress?: ProjectExportProgress,
): Promise<{ blob: Blob; filename: string; counts: Record<string, number> }> {
  const supabase = createClient();
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const counts = { fiches: 0, romans: 0, chapitres: 0, synopsis: 0 };

  onProgress?.("Lecture du projet…");
  const { data: project } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .single();
  const projectTitle = (project as { title: string } | null)?.title ?? "Projet";

  /* ---- Univers (World Building) ---- */
  onProgress?.("Export de l'univers…");
  const { data: entries } = await supabase
    .from("wb_entries")
    .select(
      "id, title, subtitle, description, category, tags, template_data, personal_notes, main_image_url, status",
    )
    .eq("project_id", projectId);

  const usableEntries = (entries ?? []).filter(
    (e) => e.status !== "archive" && e.category !== "moodboard",
  );
  const usedEntryNames = new Map<string, number>();
  for (const e of usableEntries) {
    const { getCategoryDef } = await import("@/lib/wb-constants");
    const folder = safeName(getCategoryDef(e.category)?.label ?? e.category);
    let name = safeName(e.title?.trim() || "Sans titre");
    const key = `${folder}/${name}`;
    const n = (usedEntryNames.get(key) ?? 0) + 1;
    usedEntryNames.set(key, n);
    if (n > 1) name = `${name} (${n})`;
    zip.file(`Univers/${folder}/${name}.md`, entryMarkdown(e));
    counts.fiches += 1;
  }

  /* ---- Romans ---- */
  const { data: novels } = await supabase
    .from("novels")
    .select("id, title")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  for (const novel of (novels ?? []) as NovelRow[]) {
    counts.romans += 1;
    const novelFolder = `Romans/${safeName(novel.title || "Sans titre")}`;
    onProgress?.(`Export de « ${novel.title} »…`);

    const { data: chapters } = await supabase
      .from("chapters")
      .select(
        "id, title, content, position, synopsis, themes, plot_elements, minor_elements, observations, tension_indices, pivot, narrative_knot, status, word_count",
      )
      .eq("novel_id", novel.id)
      .order("position", { ascending: true });

    const chapterRows = (chapters ?? []) as ChapterRow[];

    // Manuscrit : un fichier par chapitre, numéroté pour garder l'ordre
    // (Notion classe les pages importées par nom de fichier).
    const usedChapterNames = new Map<string, number>();
    chapterRows.forEach((c, i) => {
      const num = String(i + 1).padStart(2, "0");
      let base = safeName(c.title?.trim() || "Sans titre");
      const n = (usedChapterNames.get(base) ?? 0) + 1;
      usedChapterNames.set(base, n);
      if (n > 1) base = `${base} (${n})`;

      let md = `# ${c.title?.trim() || "Sans titre"}\n\n`;
      const resume = htmlToMarkdown(c.synopsis);
      if (resume) md += `> ${resume.replace(/\n+/g, " ")}\n\n`;
      const body = htmlToMarkdown(c.content);
      md += body || "*Chapitre vide.*";
      zip.file(`${novelFolder}/Manuscrit/${num} — ${base}.md`, md.trimEnd() + "\n");
      counts.chapitres += 1;
    });

    // Chapitrage : un tableau Markdown, colonnes par défaut + colonnes
    // personnalisées du roman.
    const { data: customCols } = await supabase
      .from("planning_columns")
      .select("id, name, position")
      .eq("novel_id", novel.id)
      .order("position", { ascending: true });
    const cols = (customCols ?? []) as { id: string; name: string }[];

    const colIds = cols.map((c) => c.id);
    let cellValues: { column_id: string; chapter_id: string; value: string | null }[] =
      [];
    if (colIds.length > 0) {
      const { data: cv } = await supabase
        .from("planning_cell_values")
        .select("column_id, chapter_id, value")
        .in("column_id", colIds);
      cellValues = cv ?? [];
    }
    const cellIndex = new Map(
      cellValues.map((v) => [`${v.column_id}::${v.chapter_id}`, v.value ?? ""]),
    );

    if (chapterRows.length > 0) {
      const headers = [
        "Chapitre",
        "Thème",
        "Résumé",
        "Éléments intrigue globale",
        "Éléments mineurs/ambiances",
        "Observations",
        "Indices/tension",
        "Bascule",
        "Nœud narratif",
        ...cols.map((c) => c.name),
        "Statut",
        "Mots",
      ];
      const rows = chapterRows.map((c) =>
        [
          cell(c.title),
          (c.themes ?? []).join(" · "),
          cell(c.synopsis),
          cell(c.plot_elements),
          cell(c.minor_elements),
          cell(c.observations),
          cell(c.tension_indices),
          cell(c.pivot),
          cell(c.narrative_knot),
          ...cols.map((col) => cell(cellIndex.get(`${col.id}::${c.id}`))),
          c.status,
          String(c.word_count ?? 0),
        ].join(" | "),
      );
      const table = [
        `| ${headers.join(" | ")} |`,
        `| ${headers.map(() => "---").join(" | ")} |`,
        ...rows.map((r) => `| ${r} |`),
      ].join("\n");
      zip.file(
        `${novelFolder}/Chapitrage.md`,
        `# Chapitrage — ${novel.title}\n\n${table}\n`,
      );
    }

    // Synopsis (documents multiples)
    const { data: synopses } = await supabase
      .from("synopses")
      .select("title, content, position")
      .eq("novel_id", novel.id)
      .order("position", { ascending: true });

    const usedSynopsisNames = new Map<string, number>();
    for (const s of (synopses ?? []) as {
      title: string | null;
      content: string | null;
    }[]) {
      let base = safeName(s.title?.trim() || "Synopsis");
      const n = (usedSynopsisNames.get(base) ?? 0) + 1;
      usedSynopsisNames.set(base, n);
      if (n > 1) base = `${base} (${n})`;
      const body = htmlToMarkdown(s.content);
      zip.file(
        `${novelFolder}/Synopsis/${base}.md`,
        `# ${s.title?.trim() || "Synopsis"}\n\n${body || "*Vide.*"}\n`,
      );
      counts.synopsis += 1;
    }
  }

  /* ---- Page d'accueil ---- */
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const readme = [
    `# ${projectTitle}`,
    "",
    `> Export complet · ${today}`,
    "",
    "## Ce que contient cette archive",
    "",
    `- **Univers** — ${counts.fiches} fiche${counts.fiches > 1 ? "s" : ""} de World Building, une page par fiche`,
    `- **Romans** — ${counts.romans} roman${counts.romans > 1 ? "s" : ""}, avec pour chacun :`,
    "  - `Manuscrit/` — un fichier par chapitre, numéroté dans l'ordre",
    "  - `Chapitrage.md` — le tableau de planification",
    "  - `Synopsis/` — les documents de synopsis",
    "",
    "## Importer dans Notion",
    "",
    "1. Décompressez l'archive.",
    "2. Dans Notion : **Paramètres → Importer → Markdown & CSV**.",
    "3. Sélectionnez le dossier décompressé.",
    "",
    "Notion recrée l'arborescence : chaque dossier devient une page, chaque",
    "fichier une sous-page.",
    "",
    "## Autres formats",
    "",
    "Cette archive est en Markdown, le format qu'importe Notion. Pour",
    "d'autres usages, Autris propose des exports dédiés :",
    "",
    "- **.docx** (Word, Pages, LibreOffice) — depuis un roman ou l'éditeur",
    "- **.csv** (Excel, Numbers, Sheets) — depuis le chapitrage",
    "",
    "---",
    "",
    "*Pensez à exporter régulièrement : une copie chez vous vaut toutes les",
    "promesses d'un hébergeur.*",
    "",
  ].join("\n");
  zip.file("README.md", readme);

  onProgress?.("Compression…");
  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    filename: `${slugify(projectTitle)}-projet-complet.zip`,
    counts,
  };
}
