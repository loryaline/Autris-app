/**
 * Conversion HTML (TipTap) → document Word .docx.
 *
 * Sert à l'export du synopsis (un seul document) comme à l'export du
 * roman complet (un chapitre par section, saut de page entre chapitres).
 * Le paquet `docx` est chargé dynamiquement : il n'alourdit le bundle
 * que lorsqu'un export est réellement déclenché.
 */

type DocxModule = typeof import("docx");

/** Style inline accumulé en descendant l'arbre HTML. */
interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
}

/** Convertit un fragment HTML en tableau de Paragraph docx. */
function htmlToParagraphs(docx: DocxModule, html: string) {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
  type ParagraphInstance = InstanceType<typeof Paragraph>;
  type TextRunInstance = InstanceType<typeof TextRun>;

  function collectRuns(node: Node, style: RunStyle, out: TextRunInstance[]) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const text = child.textContent ?? "";
        if (text) {
          out.push(
            new TextRun({
              text,
              bold: style.bold,
              italics: style.italics,
              strike: style.strike,
              ...(style.underline ? { underline: {} } : {}),
            }),
          );
        }
        return;
      }
      if (child.nodeType !== 1) return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === "br") {
        out.push(new TextRun({ text: "", break: 1 }));
        return;
      }
      const next: RunStyle = { ...style };
      if (tag === "strong" || tag === "b") next.bold = true;
      if (tag === "em" || tag === "i") next.italics = true;
      if (tag === "u") next.underline = true;
      if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
      collectRuns(el, next, out);
    });
  }

  function runsOf(el: Element): TextRunInstance[] {
    const out: TextRunInstance[] = [];
    collectRuns(el, {}, out);
    return out;
  }

  const paragraphs: ParagraphInstance[] = [];
  const doc = new DOMParser().parseFromString(html || "<p></p>", "text/html");

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType !== 1) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === "h1") {
      paragraphs.push(new Paragraph({ children: runsOf(el), heading: HeadingLevel.HEADING_2 }));
    } else if (tag === "h2") {
      paragraphs.push(new Paragraph({ children: runsOf(el), heading: HeadingLevel.HEADING_3 }));
    } else if (tag === "h3") {
      paragraphs.push(new Paragraph({ children: runsOf(el), heading: HeadingLevel.HEADING_4 }));
    } else if (tag === "blockquote") {
      paragraphs.push(
        new Paragraph({
          children: runsOf(el),
          indent: { left: 480 },
          spacing: { before: 80, after: 80 },
        }),
      );
    } else if (tag === "hr") {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "* * *" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
        }),
      );
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === "li",
      );
      items.forEach((li, i) => {
        if (tag === "ul") {
          paragraphs.push(new Paragraph({ children: runsOf(li), bullet: { level: 0 } }));
        } else {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ` }), ...runsOf(li)],
            }),
          );
        }
      });
    } else {
      paragraphs.push(new Paragraph({ children: runsOf(el) }));
    }
  });

  return paragraphs;
}

/** Exporte un seul document HTML (ex. un synopsis) en .docx. */
export async function htmlToDocxBlob(html: string, title: string): Promise<Blob> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, HeadingLevel } = docx;
  const children = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    ...htmlToParagraphs(docx, html),
  ];
  return Packer.toBlob(
    new Document({ sections: [{ properties: {}, children }] }),
  );
}

/** Exporte un roman complet : un chapitre par section, saut de page entre eux. */
export async function novelToDocxBlob(
  chapters: { title: string; content: string }[],
  novelTitle: string,
): Promise<Blob> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, HeadingLevel } = docx;
  type ParagraphInstance = InstanceType<typeof Paragraph>;

  const children: ParagraphInstance[] = [
    new Paragraph({ text: novelTitle, heading: HeadingLevel.TITLE }),
  ];

  chapters.forEach((ch, i) => {
    children.push(
      new Paragraph({
        text: ch.title?.trim() || `Chapitre ${i + 1}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: i > 0,
        spacing: { after: 240 },
      }),
    );
    children.push(...htmlToParagraphs(docx, ch.content));
  });

  return Packer.toBlob(
    new Document({ sections: [{ properties: {}, children }] }),
  );
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
