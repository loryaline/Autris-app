"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ChapterData,
  CustomColumn,
  CellValue,
} from "@/app/(app)/planning/[novelId]/planning-client";
import type { ChapterStatus } from "@/types/database";

/**
 * Import CSV dans le chapitrage.
 *
 * - Aperçu du fichier, choix de la ligne de départ (les lignes au-dessus
 *   sont ignorées) et du mode « première ligne = en-têtes ».
 * - Les en-têtes sont mappés sur les colonnes existantes (par libellé,
 *   insensible à la casse / aux accents). Les en-têtes inconnus créent
 *   automatiquement une colonne personnalisée.
 * - Les lignes importées s'ajoutent À LA SUITE des chapitres existants.
 */

/* Libellés des colonnes par défaut — doit rester aligné avec
   DEFAULT_COL_MAP (planning-client) / DEFAULT_COLUMNS (ChapterTable). */
const FIELD_BY_LABEL: Record<string, { field: keyof ChapterData; kind: "text" | "themes" | "title" | "status" }> = {
  "chapitre":                   { field: "title",           kind: "title" },
  "theme":                      { field: "themes",          kind: "themes" },
  "resume du chapitre":         { field: "synopsis",        kind: "text" },
  "resume":                     { field: "synopsis",        kind: "text" },
  "elements intrigue globale":  { field: "plot_elements",   kind: "text" },
  "elements mineurs/ambiances": { field: "minor_elements",  kind: "text" },
  "observations / remarques":   { field: "observations",    kind: "text" },
  "observations":               { field: "observations",    kind: "text" },
  "indices/tension relative":   { field: "tension_indices", kind: "text" },
  "bascule":                    { field: "pivot",           kind: "text" },
  "noeud narratif":             { field: "narrative_knot",  kind: "text" },
  "statut":                     { field: "status",          kind: "status" },
};

/* Colonnes techniques de notre export : ignorées à l'import. */
const IGNORED_LABELS = new Set(["position", "mots"]);

const STATUS_BY_LABEL: Record<string, ChapterStatus> = {
  "a ecrire": "a_ecrire",
  "premier jet": "premier_jet",
  "revision": "revision",
  "reecriture": "reecriture",
  "correction": "correction",
  "termine": "termine",
};

/** Normalisation agressive pour comparer des libellés : minuscules,
 * sans accents (œ→oe, æ→ae), et sans AUCUN caractère non alphanumérique.
 * « Éléments mineurs / ambiances » ≡ « elements mineurs/ambiances »,
 * « Nœud narratif » ≡ « noeud narratif », etc. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/* Index de FIELD_BY_LABEL / IGNORED / STATUS avec clés normalisées. */
const FIELD_LOOKUP = new Map(
  Object.entries(FIELD_BY_LABEL).map(([k, v]) => [norm(k), v]),
);
const IGNORED_LOOKUP = new Set([...IGNORED_LABELS].map((l) => norm(l)));
const STATUS_LOOKUP = new Map(
  Object.entries(STATUS_BY_LABEL).map(([k, v]) => [norm(k), v]),
);

/** Parse un CSV (séparateur ; ou , auto-détecté, guillemets RFC 4180). */
function parseCsv(text: string): string[][] {
  // Retire le BOM éventuel
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // Détection du séparateur sur la première ligne non vide
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      // Ignore les lignes entièrement vides
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim().length > 0)) rows.push(row);
  return rows;
}

/** Texte brut → HTML de cellule (échappé, sauts de ligne préservés). */
function textToCellHtml(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const esc = t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${esc.replace(/\r?\n/g, "<br>")}</p>`;
}

type ColTarget =
  | { kind: "field"; field: keyof ChapterData; fieldKind: "text" | "themes" | "title" | "status" }
  | { kind: "existing-custom"; columnId: string }
  | { kind: "new-custom"; name: string }
  | { kind: "ignore" };

/* Colonnes de base proposées dans le sélecteur de destination. */
const BASE_FIELD_OPTIONS: { token: string; label: string; field: keyof ChapterData; fieldKind: "text" | "themes" | "title" | "status" }[] = [
  { token: "field:title",           label: "Chapitre (titre)",            field: "title",           fieldKind: "title" },
  { token: "field:themes",          label: "Thème",                       field: "themes",          fieldKind: "themes" },
  { token: "field:synopsis",        label: "Résumé du chapitre",          field: "synopsis",        fieldKind: "text" },
  { token: "field:plot_elements",   label: "Éléments intrigue globale",   field: "plot_elements",   fieldKind: "text" },
  { token: "field:minor_elements",  label: "Éléments mineurs/ambiances",  field: "minor_elements",  fieldKind: "text" },
  { token: "field:observations",    label: "Observations / remarques",    field: "observations",    fieldKind: "text" },
  { token: "field:tension_indices", label: "Indices/tension relative",    field: "tension_indices", fieldKind: "text" },
  { token: "field:pivot",           label: "Bascule",                     field: "pivot",           fieldKind: "text" },
  { token: "field:narrative_knot",  label: "Nœud narratif",               field: "narrative_knot",  fieldKind: "text" },
  { token: "field:status",          label: "Statut",                      field: "status",          fieldKind: "status" },
];

/** Token de sélecteur correspondant à une cible auto-détectée. */
function targetToToken(t: ColTarget): string {
  if (t.kind === "ignore") return "ignore";
  if (t.kind === "new-custom") return "new";
  if (t.kind === "existing-custom") return `custom:${t.columnId}`;
  return BASE_FIELD_OPTIONS.find((o) => o.field === t.field)?.token ?? "ignore";
}

export function CsvImportModal({
  novelId,
  chapters,
  customColumns,
  setChapters,
  setCustomColumns,
  setCellValues,
  onClose,
}: {
  novelId: string;
  chapters: ChapterData[];
  customColumns: CustomColumn[];
  setChapters: React.Dispatch<React.SetStateAction<ChapterData[]>>;
  setCustomColumns: React.Dispatch<React.SetStateAction<CustomColumn[]>>;
  setCellValues: React.Dispatch<React.SetStateAction<CellValue[]>>;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [startLine, setStartLine] = useState(1); // 1-based, dans les lignes de données
  // Remappage manuel : index de colonne CSV → token de destination
  // ("auto" | "ignore" | "new" | "field:<champ>" | "custom:<id>")
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(f: File) {
    setError(null);
    try {
      const text = await f.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError("Le fichier semble vide.");
        return;
      }
      setRows(parsed);
      setFileName(f.name);
      // Auto-détection en-têtes : au moins un libellé connu sur la 1ère ligne
      const known = parsed[0].some((c) => {
        const n = norm(c);
        return FIELD_LOOKUP.has(n) || IGNORED_LOOKUP.has(n);
      });
      setHasHeader(known);
      setStartLine(1);
      setOverrides({});
    } catch {
      setError("Impossible de lire ce fichier.");
    }
  }

  const headerRow = rows && hasHeader ? rows[0] : null;
  const dataRows = useMemo(
    () => (rows ? (hasHeader ? rows.slice(1) : rows) : []),
    [rows, hasHeader],
  );

  const csvWidth = rows ? Math.max(...rows.map((r) => r.length)) : 0;

  /* Cible AUTO-détectée de chaque colonne du CSV. Sans en-têtes : les
     colonnes sont mappées dans l'ordre par défaut du tableau. */
  const autoTargets: ColTarget[] = useMemo(() => {
    if (!rows) return [];
    const targets: ColTarget[] = [];
    if (headerRow) {
      const customByName = new Map(customColumns.map((c) => [norm(c.name), c.id]));
      for (let i = 0; i < csvWidth; i++) {
        const raw = (headerRow[i] ?? "").trim();
        const n = norm(raw);
        if (!raw || IGNORED_LOOKUP.has(n)) {
          targets.push({ kind: "ignore" });
        } else if (FIELD_LOOKUP.has(n)) {
          const def = FIELD_LOOKUP.get(n)!;
          targets.push({ kind: "field", field: def.field, fieldKind: def.kind });
        } else if (customByName.has(n)) {
          targets.push({ kind: "existing-custom", columnId: customByName.get(n)! });
        } else {
          targets.push({ kind: "new-custom", name: raw });
        }
      }
    } else {
      // Sans en-têtes : ordre des colonnes par défaut de l'export
      const defaultOrder: ColTarget[] = [
        { kind: "field", field: "title", fieldKind: "title" },
        { kind: "field", field: "themes", fieldKind: "themes" },
        { kind: "field", field: "synopsis", fieldKind: "text" },
        { kind: "field", field: "plot_elements", fieldKind: "text" },
        { kind: "field", field: "minor_elements", fieldKind: "text" },
        { kind: "field", field: "observations", fieldKind: "text" },
        { kind: "field", field: "tension_indices", fieldKind: "text" },
        { kind: "field", field: "pivot", fieldKind: "text" },
        { kind: "field", field: "narrative_knot", fieldKind: "text" },
      ];
      for (let i = 0; i < csvWidth; i++) {
        targets.push(defaultOrder[i] ?? { kind: "ignore" });
      }
    }
    return targets;
  }, [rows, headerRow, customColumns, csvWidth]);

  /* Cible effective = choix manuel (override) sinon auto-détection. */
  const colTargets: ColTarget[] = useMemo(() => {
    return autoTargets.map((auto, i) => {
      const token = overrides[i];
      if (!token || token === targetToToken(auto)) return auto;
      if (token === "ignore") return { kind: "ignore" } as ColTarget;
      if (token === "new") {
        const name =
          (headerRow?.[i] ?? "").trim() || `Colonne ${i + 1}`;
        return { kind: "new-custom", name } as ColTarget;
      }
      if (token.startsWith("custom:")) {
        return { kind: "existing-custom", columnId: token.slice(7) } as ColTarget;
      }
      const opt = BASE_FIELD_OPTIONS.find((o) => o.token === token);
      if (opt) {
        return { kind: "field", field: opt.field, fieldKind: opt.fieldKind } as ColTarget;
      }
      return auto;
    });
  }, [autoTargets, overrides, headerRow]);

  const newColumnNames = colTargets
    .filter((t): t is Extract<ColTarget, { kind: "new-custom" }> => t.kind === "new-custom")
    .map((t) => t.name);

  const importedCount = Math.max(0, dataRows.length - (startLine - 1));

  async function handleImport() {
    if (!rows || importing) return;
    setImporting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("non connectée");

      const toImport = dataRows.slice(startLine - 1);
      if (toImport.length === 0) {
        setError("Aucune ligne à importer avec ce point de départ.");
        setImporting(false);
        return;
      }

      // 1. Crée les colonnes custom manquantes
      const createdCols: CustomColumn[] = [];
      let maxColPos = customColumns.reduce((m, c) => Math.max(m, c.position), -1);
      const newColIdByName = new Map<string, string>();
      for (const name of newColumnNames) {
        const { data, error: e } = await supabase
          .from("planning_columns")
          .insert({ novel_id: novelId, user_id: user.id, name, position: ++maxColPos })
          .select("id, name, type, position")
          .single();
        if (e || !data)
          throw new Error(`création de la colonne « ${name} » : ${e?.message ?? "?"}`);
        createdCols.push(data as CustomColumn);
        newColIdByName.set(name, data.id);
      }

      // 2. Construit et insère les chapitres
      let maxChapPos = chapters.reduce((m, c) => Math.max(m, c.position), -1);
      const chapterPayloads = toImport.map((r) => {
        // Défauts explicites pour toutes les colonnes not-null : dans un
        // insert groupé, les clés absentes d'une ligne sont envoyées
        // comme null dès qu'une autre ligne du lot les définit.
        const payload: Record<string, unknown> = {
          novel_id: novelId,
          user_id: user.id,
          title: "À nommer",
          position: ++maxChapPos,
          status: "a_ecrire",
          themes: [] as string[],
        };
        colTargets.forEach((t, i) => {
          if (t.kind !== "field") return;
          const raw = (r[i] ?? "").trim();
          if (!raw) return;
          if (t.fieldKind === "title") payload.title = raw;
          else if (t.fieldKind === "themes")
            payload.themes = raw.split(/\s*[·,]\s*/).filter(Boolean);
          else if (t.fieldKind === "status")
            payload.status = STATUS_LOOKUP.get(norm(raw)) ?? "a_ecrire";
          else payload[t.field as string] = textToCellHtml(raw);
        });
        return payload;
      });

      const { data: inserted, error: insErr } = await supabase
        .from("chapters")
        .insert(chapterPayloads)
        .select("id, title, position, status, synopsis, word_count, themes, plot_elements, minor_elements, observations, tension_indices, pivot, narrative_knot, row_color, cell_colors");
      if (insErr || !inserted)
        throw new Error(`insertion des chapitres : ${insErr?.message ?? "?"}`);

      // 3. Valeurs des colonnes custom (existantes + créées)
      const cellPayloads: { column_id: string; chapter_id: string; user_id: string; value: string }[] = [];
      // L'ordre renvoyé par insert() suit l'ordre du payload
      toImport.forEach((r, rowIdx) => {
        const chapterId = inserted[rowIdx]?.id;
        if (!chapterId) return;
        colTargets.forEach((t, i) => {
          const raw = (r[i] ?? "").trim();
          if (!raw) return;
          const columnId =
            t.kind === "existing-custom"
              ? t.columnId
              : t.kind === "new-custom"
                ? newColIdByName.get(t.name)
                : null;
          if (!columnId) return;
          cellPayloads.push({
            column_id: columnId,
            chapter_id: chapterId,
            user_id: user.id,
            value: textToCellHtml(raw),
          });
        });
      });
      // Dédoublonnage (column_id, chapter_id) : si deux colonnes du CSV
      // pointent vers la même destination, Postgres refuse un upsert qui
      // touche deux fois la même ligne. La dernière valeur gagne.
      const dedupedCells = [
        ...new Map(
          cellPayloads.map((p) => [`${p.column_id}::${p.chapter_id}`, p]),
        ).values(),
      ];
      const insertedCells: CellValue[] = [];
      if (dedupedCells.length > 0) {
        const { data: cells, error: cellErr } = await supabase
          .from("planning_cell_values")
          .upsert(dedupedCells, { onConflict: "column_id,chapter_id" })
          .select("id, column_id, chapter_id, value, color");
        if (cellErr)
          throw new Error(`insertion des valeurs de cases : ${cellErr.message}`);
        insertedCells.push(...((cells ?? []) as CellValue[]));
      }

      // 4. Met à jour l'état local
      if (createdCols.length > 0) setCustomColumns((prev) => [...prev, ...createdCols]);
      setChapters((prev) => [...prev, ...(inserted as ChapterData[])]);
      if (insertedCells.length > 0) setCellValues((prev) => [...prev, ...insertedCells]);

      onClose();
    } catch (e) {
      setError(
        `L'import a échoué (${e instanceof Error ? e.message : "erreur inconnue"}). Rien n'a peut-être été importé — vérifie ton tableau avant de réessayer.`,
      );
      setImporting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />
      <div className="fixed z-[80] inset-x-0 top-[8vh] mx-auto w-[min(880px,92vw)] max-h-[84vh] flex flex-col rounded-[var(--radius-lg)] border border-white/[0.10] bg-bg-secondary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] shrink-0">
          <div>
            <div className="text-[14px] font-medium text-text-primary">Importer un CSV</div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">
              Les lignes importées s&apos;ajoutent à la suite du tableau actuel.
            </div>
          </div>
          <button
            onClick={onClose}
            className="rd-icon-btn"
            title="Fermer"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {!rows ? (
            <div
              className="border-2 border-dashed border-white/[0.10] rounded-[var(--radius-lg)] py-14 text-center cursor-pointer hover:border-[var(--color-accent-border)] transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
            >
              <div className="text-[28px] mb-2">📄</div>
              <div className="text-[13px] text-text-secondary">
                Glisse ton fichier .csv ici, ou clique pour le choisir
              </div>
              <div className="text-[11.5px] text-text-quaternary mt-1">
                Séparateur ; ou , — l&apos;export Autris se réimporte tel quel
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <>
              {/* Options */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3">
                <span className="text-[12px] text-text-tertiary">{fileName}</span>
                <label className="flex items-center gap-1.5 text-[12.5px] text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => {
                      setHasHeader(e.target.checked);
                      setStartLine(1);
                      setOverrides({});
                    }}
                  />
                  Première ligne = en-têtes
                </label>
                <label className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
                  Importer à partir de la ligne
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, dataRows.length)}
                    value={startLine}
                    onChange={(e) =>
                      setStartLine(
                        Math.min(
                          Math.max(1, Number(e.target.value) || 1),
                          Math.max(1, dataRows.length),
                        ),
                      )
                    }
                    className="w-16 h-7 px-2 rounded bg-bg-primary border border-white/[0.10] text-[12.5px] text-text-primary"
                  />
                </label>
                <button
                  onClick={() => {
                    setRows(null);
                    setFileName("");
                  }}
                  className="text-[12px] text-text-quaternary hover:text-text-secondary underline cursor-pointer bg-transparent border-none"
                >
                  Changer de fichier
                </button>
              </div>

              {newColumnNames.length > 0 && (
                <div className="mb-3 text-[12px] text-text-tertiary">
                  Nouvelles colonnes créées à l&apos;import :{" "}
                  {newColumnNames.map((n) => (
                    <span
                      key={n}
                      className="inline-block mx-0.5 px-1.5 py-0.5 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-[11px]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Aperçu */}
              <div className="border border-white/[0.08] rounded-[var(--radius-md)] overflow-auto max-h-[38vh]">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    {headerRow && (
                      <tr className="bg-bg-tertiary">
                        <th className="px-2 py-1.5 text-left text-text-quaternary font-medium w-10">#</th>
                        {headerRow.map((h, i) => (
                          <th
                            key={i}
                            className={`px-2 py-1.5 text-left font-medium whitespace-nowrap ${
                              colTargets[i]?.kind === "ignore"
                                ? "text-text-quaternary line-through"
                                : "text-text-secondary"
                            }`}
                          >
                            {h || "—"}
                          </th>
                        ))}
                      </tr>
                    )}
                    {/* Destination de chaque colonne — modifiable si
                        l'auto-détection se trompe (ex. « Synthèse de
                        chapitre » → Résumé du chapitre). */}
                    <tr className="bg-bg-tertiary/60">
                      <td className="px-2 pb-1.5 text-[10px] text-text-quaternary">→</td>
                      {Array.from({ length: csvWidth }, (_, i) => {
                        const t = colTargets[i];
                        const autoToken = autoTargets[i] ? targetToToken(autoTargets[i]) : "ignore";
                        const currentToken = overrides[i] ?? autoToken;
                        const isOverridden = currentToken !== autoToken;
                        return (
                          <td key={i} className="px-1 pb-1.5">
                            <select
                              value={currentToken}
                              onChange={(e) =>
                                setOverrides((prev) => ({
                                  ...prev,
                                  [i]: e.target.value,
                                }))
                              }
                              title="Destination de cette colonne"
                              className={`w-full max-w-[180px] h-6 px-1 rounded text-[10.5px] bg-bg-primary border cursor-pointer ${
                                isOverridden
                                  ? "border-[var(--color-accent-border)] text-[var(--color-accent)]"
                                  : t?.kind === "ignore"
                                    ? "border-white/[0.06] text-text-quaternary"
                                    : "border-white/[0.10] text-text-secondary"
                              }`}
                            >
                              <option value="ignore">Ignorer</option>
                              {BASE_FIELD_OPTIONS.map((o) => (
                                <option key={o.token} value={o.token}>
                                  {o.label}
                                </option>
                              ))}
                              {customColumns.map((c) => (
                                <option key={c.id} value={`custom:${c.id}`}>
                                  {c.name} (colonne perso)
                                </option>
                              ))}
                              <option value="new">
                                Nouvelle colonne{headerRow?.[i]?.trim() ? ` « ${headerRow[i].trim()} »` : ""}
                              </option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((r, idx) => {
                      const lineNo = idx + 1;
                      const skipped = lineNo < startLine;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setStartLine(lineNo)}
                          title={`Importer à partir de la ligne ${lineNo}`}
                          className={`border-t border-white/[0.05] cursor-pointer ${
                            skipped
                              ? "opacity-35"
                              : "hover:bg-[var(--color-accent-bg)]/30"
                          }`}
                        >
                          <td className="px-2 py-1 text-text-quaternary">{lineNo}</td>
                          {r.map((c, i) => (
                            <td
                              key={i}
                              className="px-2 py-1 text-text-secondary max-w-[220px] truncate"
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[11.5px] text-text-quaternary">
                Clique sur une ligne pour définir le point de départ — les lignes
                grisées au-dessus seront ignorées.
              </div>
            </>
          )}

          {error && (
            <div className="mt-3 text-[12.5px]" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {rows && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/[0.06] shrink-0">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-[var(--radius-md)] text-[12.5px] text-text-secondary bg-bg-primary border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={importing || importedCount === 0}
              className="h-9 px-4 rounded-[var(--radius-md)] text-[12.5px] font-medium cursor-pointer transition-colors disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast, #1a1408)" }}
            >
              {importing
                ? "Import en cours…"
                : `Importer ${importedCount} ligne${importedCount > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
