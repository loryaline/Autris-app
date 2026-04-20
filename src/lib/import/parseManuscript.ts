/**
 * Parseur de manuscrit : docx (mammoth) + pdf (pdfjs-dist).
 * Découpe en chapitres d'après les titres.
 *
 * Stratégie :
 *  - docx → HTML via mammoth, on coupe à chaque <h1>/<h2>/<h3>.
 *  - pdf  → texte brut, on coupe sur les lignes qui ressemblent à
 *           "Chapitre N", "Chapter N", "Prologue", "Épilogue",
 *           "Partie/Part N", ou une ligne courte en MAJUSCULES isolée.
 */

export interface ParsedChapter {
  title: string;
  /** HTML prêt pour TipTap (paragraphes <p>…</p>). */
  contentHtml: string;
  /** Texte brut pour compter les mots. */
  plainText: string;
  wordCount: number;
}

export interface ParsedManuscript {
  chapters: ParsedChapter[];
  /** Source brute (debug / fallback si aucun titre détecté). */
  rawText: string;
}

function countWords(text: string): number {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return 0;
  return clean.split(" ").length;
}

function textToHtml(text: string): string {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 0) return "";
  return paras
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ---------------------------------------------------------------- */
/* DOCX                                                               */
/* ---------------------------------------------------------------- */

async function parseDocx(file: File): Promise<ParsedManuscript> {
  const mod = (await import("mammoth/mammoth.browser")) as unknown as {
    default?: { convertToHtml: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    convertToHtml?: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };
  const convertToHtml = mod.convertToHtml ?? mod.default?.convertToHtml;
  if (!convertToHtml) {
    throw new Error("Impossible de charger mammoth (parseur .docx).");
  }
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await convertToHtml({ arrayBuffer });

  // Parse HTML client-side
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.childNodes);

  const chapters: ParsedChapter[] = [];
  let current: { title: string; nodes: ChildNode[] } | null = null;

  const isHeading = (n: ChildNode): n is HTMLElement =>
    n.nodeType === 1 && /^H[1-3]$/i.test((n as HTMLElement).tagName);

  for (const node of nodes) {
    if (isHeading(node)) {
      // Commit le chapitre courant
      if (current) chapters.push(finalizeChapter(current));
      current = { title: (node.textContent ?? "").trim() || "Sans titre", nodes: [] };
    } else {
      if (!current) current = { title: "Introduction", nodes: [] };
      current.nodes.push(node);
    }
  }
  if (current) chapters.push(finalizeChapter(current));

  // Si aucun titre détecté : un seul "chapitre" avec tout
  if (chapters.length === 0 || (chapters.length === 1 && chapters[0].wordCount === 0)) {
    const plain = (doc.body.textContent ?? "").trim();
    return {
      chapters: [
        {
          title: "Chapitre 1",
          contentHtml: html,
          plainText: plain,
          wordCount: countWords(plain),
        },
      ],
      rawText: plain,
    };
  }

  const rawText = chapters.map((c) => c.plainText).join("\n\n");
  return { chapters, rawText };
}

function finalizeChapter(c: { title: string; nodes: ChildNode[] }): ParsedChapter {
  const wrap = document.createElement("div");
  for (const n of c.nodes) wrap.appendChild(n.cloneNode(true));
  const html = wrap.innerHTML.trim();
  const plain = (wrap.textContent ?? "").trim();
  return {
    title: c.title,
    contentHtml: html,
    plainText: plain,
    wordCount: countWords(plain),
  };
}

/* ---------------------------------------------------------------- */
/* PDF                                                                */
/* ---------------------------------------------------------------- */

async function parsePdf(file: File): Promise<ParsedManuscript> {
  // Legacy build = compatible plus large. Worker servi via CDN pour éviter
  // les soucis de bundling du worker avec Next/Turbopack.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const version = (pdfjs as unknown as { version: string }).version;
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Regroupe par ligne d'après la coord Y
    const byY = new Map<number, string[]>();
    for (const item of content.items) {
      // @ts-expect-error - pdfjs typing
      const y = Math.round(item.transform[5]);
      // @ts-expect-error - pdfjs typing
      const str: string = item.str;
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push(str);
    }
    const ys = Array.from(byY.keys()).sort((a, b) => b - a); // top-down
    for (const y of ys) {
      const line = byY.get(y)!.join(" ").replace(/\s+/g, " ").trim();
      if (line) lines.push(line);
    }
    lines.push(""); // séparateur de page
  }

  const rawText = lines.join("\n");
  const chapters = splitTextIntoChapters(rawText);
  return { chapters, rawText };
}

const CHAPTER_RE =
  /^\s*(chapitre|chapter|prologue|épilogue|epilogue|partie|part)\b[\s.:–—-]*([ivxlcdm]+|\d+)?\s*[:.–—-]?\s*(.*)$/i;

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (CHAPTER_RE.test(trimmed)) return true;
  // Ligne courte tout en MAJUSCULES (≥ 3 caractères lettre)
  const letters = trimmed.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase() && trimmed.length <= 60) {
    return true;
  }
  return false;
}

function splitTextIntoChapters(raw: string): ParsedChapter[] {
  const lines = raw.split("\n");
  const chapters: ParsedChapter[] = [];
  let currentTitle: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentTitle && buffer.every((l) => !l.trim())) return;
    const title = currentTitle ?? "Chapitre 1";
    const text = buffer.join("\n").trim();
    chapters.push({
      title,
      contentHtml: textToHtml(text),
      plainText: text,
      wordCount: countWords(text),
    });
    buffer = [];
  };

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      flush();
      currentTitle = line.trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  // Aucun titre détecté ? Un seul chapitre avec tout
  if (chapters.length === 0) {
    const text = raw.trim();
    return [
      {
        title: "Chapitre 1",
        contentHtml: textToHtml(text),
        plainText: text,
        wordCount: countWords(text),
      },
    ];
  }

  return chapters;
}

/* ---------------------------------------------------------------- */
/* Entrée publique                                                    */
/* ---------------------------------------------------------------- */

export async function parseManuscript(file: File): Promise<ParsedManuscript> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return parseDocx(file);
  if (name.endsWith(".pdf")) return parsePdf(file);
  if (name.endsWith(".doc")) {
    throw new Error(
      ".doc (ancien format Word) non pris en charge. Enregistrez en .docx depuis Word."
    );
  }
  if (name.endsWith(".gdoc") || name.endsWith(".odt")) {
    throw new Error(
      "Format non pris en charge. Exportez en .docx (Fichier → Télécharger → Microsoft Word)."
    );
  }
  throw new Error("Format non reconnu. Utilisez .docx ou .pdf.");
}
