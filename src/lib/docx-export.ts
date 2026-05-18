/**
 * Conversion HTML (TipTap) → document Word .docx.
 *
 * Réutilisable pour l'export du synopsis et, plus tard, du roman.
 * Le paquet `docx` est chargé dynamiquement : il n'alourdit le bundle
 * que lorsqu'un export est réellement déclenché.
 */

/** Style inline accumulé en descendant l'arbre HTML. */
interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
}

export async function htmlToDocxBlob(html: string, title: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } =
    await import("docx");

  /** Construit les TextRun d'un bloc en parcourant ses nœuds inline. */
  function collectRuns(
    node: Node,
    style: RunStyle,
    out: InstanceType<typeof TextRun>[],
  ) {
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

  function runsOf(el: Element): InstanceType<typeof TextRun>[] {
    const out: InstanceType<typeof TextRun>[] = [];
    collectRuns(el, {}, out);
    return out;
  }

  const paragraphs: InstanceType<typeof Paragraph>[] = [];

  // Titre du document.
  paragraphs.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }));

  const doc = new DOMParser().parseFromString(html || "<p></p>", "text/html");

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType !== 1) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === "h1") {
      paragraphs.push(new Paragraph({ children: runsOf(el), heading: HeadingLevel.HEADING_1 }));
    } else if (tag === "h2") {
      paragraphs.push(new Paragraph({ children: runsOf(el), heading: HeadingLevel.HEADING_2 }));
    } else if (tag === "h3") {
      paragraphs.push(new Paragraph({ children: runsOf(el), heading: HeadingLevel.HEADING_3 }));
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
          // Liste ordonnée : préfixe numérique explicite (pas de config
          // de numérotation Word à maintenir).
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ` }), ...runsOf(li)],
            }),
          );
        }
      });
    } else {
      // p, div, et tout le reste → paragraphe normal.
      paragraphs.push(new Paragraph({ children: runsOf(el) }));
    }
  });

  const out = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });
  return Packer.toBlob(out);
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
