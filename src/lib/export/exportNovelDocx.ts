/**
 * Export d'un manuscrit Autris en DOCX (Word) prêt à être ouvert dans Word,
 * Pages, LibreOffice ou Google Docs.
 *
 * Conversion : on parcourt l'HTML stocké côté chapitres (TipTap) et on
 * transforme chaque paragraphe en `Paragraph` de la lib `docx`. On gère
 * gras / italique / souligné / barré ; on ignore les couleurs et highlights
 * (rendu Word peu fiable, non standard inter-éditeurs).
 *
 * Conventions manuscrit français :
 *  - police par défaut : Garamond 12 (proche du serif éditorial)
 *  - interligne 1.5 (= 360 twips × 1, mais on encode 360 pour Word)
 *  - retrait première ligne 0.5cm
 *  - chaque chapitre commence sur une nouvelle page
 *  - le titre du chapitre est centré, en petites capitales gras
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  type IRunOptions,
} from "docx";

export interface ExportChapter {
  title: string;
  /** HTML produit par TipTap. */
  contentHtml: string;
  position: number;
}

export interface ExportNovelInput {
  novelTitle: string;
  authorName: string;
  chapters: ExportChapter[];
}

/* ---------- HTML → docx ---------- */

type Mark = "bold" | "italic" | "underline" | "strike";

interface InlineRun {
  text: string;
  marks: Set<Mark>;
}

function htmlToParagraphs(html: string): Paragraph[] {
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [];

  const paragraphs: Paragraph[] = [];

  for (const node of Array.from(root.childNodes)) {
    paragraphs.push(...nodeToParagraphs(node));
  }

  // Si le corps ne contenait que du texte sans <p>, on l'enveloppe en un para.
  if (paragraphs.length === 0 && (root.textContent ?? "").trim()) {
    paragraphs.push(buildParagraph([{ text: root.textContent ?? "", marks: new Set() }]));
  }

  return paragraphs;
}

function nodeToParagraphs(node: ChildNode): Paragraph[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? "";
    if (!t.trim()) return [];
    return [buildParagraph([{ text: t, marks: new Set() }])];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "p": {
      const runs = collectRuns(el, new Set());
      return [buildParagraph(runs)];
    }
    case "h1":
    case "h2":
    case "h3": {
      const runs = collectRuns(el, new Set(["bold"]));
      return [
        new Paragraph({
          heading:
            tag === "h1"
              ? HeadingLevel.HEADING_2
              : tag === "h2"
                ? HeadingLevel.HEADING_3
                : HeadingLevel.HEADING_4,
          spacing: { before: 240, after: 120 },
          children: runs.flatMap(runToTextRuns),
        }),
      ];
    }
    case "blockquote": {
      const runs = collectRuns(el, new Set(["italic"]));
      return [
        new Paragraph({
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
          children: runs.flatMap(runToTextRuns),
        }),
      ];
    }
    case "ul":
    case "ol": {
      const items: Paragraph[] = [];
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() === "li") {
          const runs = collectRuns(li as HTMLElement, new Set());
          items.push(
            new Paragraph({
              bullet: tag === "ul" ? { level: 0 } : undefined,
              numbering: tag === "ol" ? { reference: "decimal", level: 0 } : undefined,
              children: runs.flatMap(runToTextRuns),
            }),
          );
        }
      }
      return items;
    }
    case "br":
      return [new Paragraph({ children: [] })];
    default: {
      // Inline rendu hors d'un <p> — on l'embarque dans un para basique.
      const runs = collectRuns(el, new Set());
      if (runs.length === 0) return [];
      return [buildParagraph(runs)];
    }
  }
}

function collectRuns(el: HTMLElement, inheritedMarks: Set<Mark>): InlineRun[] {
  const out: InlineRun[] = [];

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent ?? "";
      if (t) out.push({ text: t, marks: new Set(inheritedMarks) });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const c = child as HTMLElement;
    const tag = c.tagName.toLowerCase();
    const childMarks = new Set(inheritedMarks);

    if (tag === "strong" || tag === "b") childMarks.add("bold");
    if (tag === "em" || tag === "i") childMarks.add("italic");
    if (tag === "u") childMarks.add("underline");
    if (tag === "s" || tag === "strike" || tag === "del") childMarks.add("strike");

    // <br /> à l'intérieur d'un para
    if (tag === "br") {
      out.push({ text: "\n", marks: new Set(inheritedMarks) });
      continue;
    }

    out.push(...collectRuns(c, childMarks));
  }

  return out;
}

function runToTextRuns(r: InlineRun): TextRun[] {
  // Un \n à l'intérieur d'un run inline → on coupe en plusieurs TextRuns
  // dont le premier porte un saut de ligne en suffixe via l'option `break`.
  const segments = r.text.split("\n");
  const baseOpts: Omit<IRunOptions, "text" | "break"> = {
    bold: r.marks.has("bold"),
    italics: r.marks.has("italic"),
    underline: r.marks.has("underline") ? {} : undefined,
    strike: r.marks.has("strike"),
    font: "Garamond",
    size: 24, // 12pt (size = half-points)
  };

  return segments.map((seg, idx) =>
    new TextRun({
      ...baseOpts,
      text: seg,
      // `break` ajoute N sauts de ligne *après* le texte de ce run.
      // On en met 1 sauf sur le dernier segment.
      break: idx < segments.length - 1 ? 1 : undefined,
    }),
  );
}

function buildParagraph(runs: InlineRun[]): Paragraph {
  return new Paragraph({
    spacing: { line: 360 }, // ~1.5 line height
    indent: { firstLine: 283 }, // ~0.5 cm
    alignment: AlignmentType.JUSTIFIED,
    children: runs.flatMap(runToTextRuns),
  });
}

/* ---------- Document complet ---------- */

function buildChapterTitleParagraph(title: string, isFirst: boolean): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: isFirst ? 0 : 480, after: 480 },
    children: [
      ...(isFirst ? [] : [new TextRun({ children: [new PageBreak()] })]),
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        font: "Garamond",
        size: 28, // 14pt
        characterSpacing: 40,
      }),
    ],
  });
}

function buildTitlePage(novelTitle: string, authorName: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2880, after: 360 }, // 2 pouces du haut
      children: [
        new TextRun({
          text: novelTitle.toUpperCase(),
          bold: true,
          font: "Garamond",
          size: 48, // 24pt
          characterSpacing: 60,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: "—",
          font: "Garamond",
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 0 },
      children: [
        new TextRun({
          text: authorName,
          italics: true,
          font: "Garamond",
          size: 28,
        }),
      ],
    }),
    // Saut de page après la page de titre
    new Paragraph({ children: [new TextRun({ children: [new PageBreak()] })] }),
  ];
}

export async function exportNovelToDocxBlob(input: ExportNovelInput): Promise<Blob> {
  const sortedChapters = [...input.chapters].sort((a, b) => a.position - b.position);

  const children: Paragraph[] = [];

  // Page de titre
  children.push(...buildTitlePage(input.novelTitle, input.authorName));

  // Chapitres
  sortedChapters.forEach((ch, idx) => {
    children.push(buildChapterTitleParagraph(ch.title || `Chapitre ${idx + 1}`, idx === 0));
    const paras = htmlToParagraphs(ch.contentHtml || "");
    if (paras.length === 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "(chapitre vide)",
              italics: true,
              color: "888888",
              font: "Garamond",
              size: 22,
            }),
          ],
        }),
      );
    } else {
      children.push(...paras);
    }
  });

  const doc = new Document({
    creator: "Autris",
    title: input.novelTitle,
    description: `Manuscrit exporté depuis Autris — ${input.authorName}`,
    numbering: {
      config: [
        {
          reference: "decimal",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 pouce
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadNovelDocx(input: ExportNovelInput, filename?: string) {
  const blob = await exportNovelToDocxBlob(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    `${slugify(input.novelTitle)}-${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "manuscrit";
}
