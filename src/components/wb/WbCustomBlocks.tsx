"use client";

import { useState } from "react";
import { appConfirm } from "@/lib/app-confirm";

/**
 * Blocs personnalisés sur une fiche WB.
 *
 * Persistés dans `wb_entries.template_data.__custom_blocks` (tableau).
 * Trois types V1 :
 *   - `text`  : un titre + N champs texte (N choisi à la création, ajustable).
 *   - `notes` : titre + un textarea long en serif italique (style « note »).
 *   - `table` : titre + colonnes nommables + lignes éditables.
 *
 * On reste volontairement frugal côté UI : pas de drag de blocs, pas de
 * styles partagés avec DynamicTemplate. Si un projet a besoin d'aller plus
 * loin, on pourra promouvoir un bloc en template officiel.
 */

export type CustomBlock =
  | TextBlock
  | NotesBlock
  | TableBlock;

interface BlockBase {
  id: string;
  title: string;
}

export interface TextBlock extends BlockBase {
  type: "text";
  /** Étiquettes des sous-champs. La longueur définit le nombre d'entrées. */
  labels: string[];
  /** Valeurs alignées sur `labels`. */
  values: string[];
}

export interface NotesBlock extends BlockBase {
  type: "notes";
  value: string;
}

export interface TableBlock extends BlockBase {
  type: "table";
  columns: string[];
  rows: string[][];
}

const BLOCK_TYPES: { value: CustomBlock["type"]; label: string; desc: string; icon: string }[] = [
  { value: "text",  label: "Bloc texte",   desc: "Titre + une ou plusieurs entrées", icon: "✎" },
  { value: "notes", label: "Notes",        desc: "Un long champ en italique",        icon: "✦" },
  { value: "table", label: "Tableau",      desc: "Colonnes nommables + lignes",      icon: "▦" },
];

function newId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlock(type: CustomBlock["type"]): CustomBlock {
  if (type === "text") {
    return { id: newId(), type, title: "Nouveau bloc", labels: ["Entrée"], values: [""] };
  }
  if (type === "notes") {
    return { id: newId(), type, title: "Nouvelle note", value: "" };
  }
  return {
    id: newId(),
    type: "table",
    title: "Nouveau tableau",
    columns: ["Colonne 1", "Colonne 2"],
    rows: [["", ""]],
  };
}

export function WbCustomBlocks({
  blocks,
  onChange,
  readOnly = false,
}: {
  blocks: CustomBlock[];
  onChange: (next: CustomBlock[]) => void;
  readOnly?: boolean;
}) {
  const [adding, setAdding] = useState(false);

  function update(id: string, patch: Partial<CustomBlock>) {
    onChange(
      blocks.map((b) =>
        b.id === id
          ? // patch est typé large mais on s'assure de garder le type intact
            ({ ...b, ...patch } as CustomBlock)
          : b,
      ),
    );
  }

  function remove(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function add(type: CustomBlock["type"]) {
    onChange([...blocks, makeBlock(type)]);
    setAdding(false);
  }

  // ----- Mode lecture seule -----
  if (readOnly) {
    if (blocks.length === 0) return null;
    return (
      <div className="flex flex-col gap-4">
        {blocks.map((b) => (
          <ReadOnlyBlock key={b.id} block={b} />
        ))}
      </div>
    );
  }

  // ----- Mode édition -----
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b, idx) => (
        <BlockEditor
          key={b.id}
          block={b}
          isFirst={idx === 0}
          isLast={idx === blocks.length - 1}
          onChange={(patch) => update(b.id, patch)}
          onDelete={() => remove(b.id)}
          onMoveUp={() => move(b.id, -1)}
          onMoveDown={() => move(b.id, 1)}
        />
      ))}

      {/* Bouton + dropdown ajout */}
      <div className="relative">
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full py-2.5 border border-dashed border-white/[0.10] rounded-[var(--radius-md)] text-[12.5px] text-text-tertiary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] cursor-pointer transition-colors"
          >
            + Ajouter un bloc personnalisé
          </button>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-accent-border)] bg-bg-tertiary/60 p-3">
            <div className="text-[10px] uppercase text-text-quaternary tracking-wider mb-2">
              Quel type de bloc&nbsp;?
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BLOCK_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => add(t.value)}
                  className="flex flex-col items-start gap-1 p-2.5 rounded-[var(--radius-sm)] border border-white/[0.08] bg-bg-primary hover:bg-bg-hover hover:border-[var(--color-accent-border)] cursor-pointer transition-colors text-left"
                >
                  <span className="text-[16px] text-[var(--color-accent)] leading-none">{t.icon}</span>
                  <span className="text-[12.5px] text-text-primary font-medium">{t.label}</span>
                  <span className="text-[10.5px] text-text-tertiary leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setAdding(false)}
              className="mt-2 text-[11px] text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Block editor                                                  */
/* ============================================================ */

function BlockEditor({
  block,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: CustomBlock;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<CustomBlock>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-white/[0.06] bg-bg-tertiary/50 p-4">
      <header className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-white/[0.04] border border-white/[0.05] text-[13px] text-[var(--color-accent)]">
          {block.type === "text" ? "✎" : block.type === "notes" ? "✦" : "▦"}
        </span>
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ title: e.target.value } as Partial<CustomBlock>)}
          placeholder="Titre du bloc"
          className="flex-1 text-[14px] font-medium text-text-primary bg-transparent border-0 focus:outline-none focus:bg-white/[0.03] rounded px-1.5 py-0.5"
        />
        <BlockToolbar
          isFirst={isFirst}
          isLast={isLast}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
        />
      </header>

      {block.type === "text" && (
        <TextBlockBody
          block={block}
          onChange={(patch) => onChange(patch as Partial<CustomBlock>)}
        />
      )}
      {block.type === "notes" && (
        <NotesBlockBody
          block={block}
          onChange={(patch) => onChange(patch as Partial<CustomBlock>)}
        />
      )}
      {block.type === "table" && (
        <TableBlockBody
          block={block}
          onChange={(patch) => onChange(patch as Partial<CustomBlock>)}
        />
      )}
    </section>
  );
}

function BlockToolbar({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
      <button
        onClick={onMoveUp}
        disabled={isFirst}
        title="Monter" aria-label="Monter"
        className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white/[0.04] cursor-pointer"
      >
        ↑
      </button>
      <button
        onClick={onMoveDown}
        disabled={isLast}
        title="Descendre" aria-label="Descendre"
        className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white/[0.04] cursor-pointer"
      >
        ↓
      </button>
      <button
        onClick={async () => {
          if (await appConfirm("Supprimer ce bloc ?", { confirmLabel: "Supprimer" })) onDelete();
        }}
        title="Supprimer le bloc" aria-label="Supprimer le bloc"
        className="w-6 h-6 flex items-center justify-center text-text-quaternary hover:text-red rounded hover:bg-red-bg/40 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}

/* ---- Text block ---- */

function TextBlockBody({
  block,
  onChange,
}: {
  block: TextBlock;
  onChange: (patch: Partial<TextBlock>) => void;
}) {
  function setLabel(idx: number, label: string) {
    const next = [...block.labels];
    next[idx] = label;
    onChange({ labels: next });
  }
  function setValue(idx: number, value: string) {
    const next = [...block.values];
    next[idx] = value;
    onChange({ values: next });
  }
  function addEntry() {
    onChange({
      labels: [...block.labels, `Entrée ${block.labels.length + 1}`],
      values: [...block.values, ""],
    });
  }
  function removeEntry(idx: number) {
    if (block.labels.length <= 1) return;
    onChange({
      labels: block.labels.filter((_, i) => i !== idx),
      values: block.values.filter((_, i) => i !== idx),
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {block.labels.map((label, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <input
              value={label}
              onChange={(e) => setLabel(i, e.target.value)}
              className="flex-1 text-[10px] font-medium text-text-quaternary uppercase bg-transparent border-0 focus:outline-none focus:text-text-secondary px-1"
              style={{ letterSpacing: "0.14em" }}
              placeholder="Étiquette"
            />
            {block.labels.length > 1 && (
              <button
                onClick={() => removeEntry(i)}
                title="Supprimer cette entrée" aria-label="Supprimer cette entrée"
                className="text-[11px] text-text-quaternary hover:text-red px-1 cursor-pointer"
              >
                −
              </button>
            )}
          </div>
          <textarea
            value={block.values[i] ?? ""}
            onChange={(e) => setValue(i, e.target.value)}
            rows={2}
            className="w-full text-[12.5px] leading-relaxed px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-md)] resize-none focus:outline-none focus:border-[var(--color-accent-border)] focus:bg-white/[0.03] text-text-primary placeholder:text-text-quaternary transition-colors"
          />
        </div>
      ))}
      <button
        onClick={addEntry}
        className="self-start text-[11px] text-text-tertiary hover:text-[var(--color-accent)] cursor-pointer mt-1"
      >
        + Ajouter une entrée
      </button>
    </div>
  );
}

/* ---- Notes block ---- */

function NotesBlockBody({
  block,
  onChange,
}: {
  block: NotesBlock;
  onChange: (patch: Partial<NotesBlock>) => void;
}) {
  return (
    <textarea
      value={block.value}
      onChange={(e) => onChange({ value: e.target.value })}
      rows={6}
      placeholder="Note personnelle…"
      className="w-full font-serif italic text-[14px] leading-relaxed px-3 py-2.5 bg-[var(--color-accent-bg)]/30 border border-[var(--color-accent-border)]/40 rounded-[var(--radius-md)] resize-none focus:outline-none focus:border-[var(--color-accent-border)] text-text-primary placeholder:text-text-quaternary"
    />
  );
}

/* ---- Table block ---- */

function TableBlockBody({
  block,
  onChange,
}: {
  block: TableBlock;
  onChange: (patch: Partial<TableBlock>) => void;
}) {
  function setColumn(idx: number, name: string) {
    const next = [...block.columns];
    next[idx] = name;
    onChange({ columns: next });
  }
  function addColumn() {
    onChange({
      columns: [...block.columns, `Colonne ${block.columns.length + 1}`],
      rows: block.rows.map((r) => [...r, ""]),
    });
  }
  function removeColumn(idx: number) {
    if (block.columns.length <= 1) return;
    onChange({
      columns: block.columns.filter((_, i) => i !== idx),
      rows: block.rows.map((r) => r.filter((_, i) => i !== idx)),
    });
  }
  function setCell(ri: number, ci: number, val: string) {
    const next = block.rows.map((r) => [...r]);
    next[ri][ci] = val;
    onChange({ rows: next });
  }
  function addRow() {
    onChange({ rows: [...block.rows, block.columns.map(() => "")] });
  }
  function removeRow(ri: number) {
    if (block.rows.length <= 1) {
      onChange({ rows: [block.columns.map(() => "")] });
      return;
    }
    onChange({ rows: block.rows.filter((_, i) => i !== ri) });
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-white/[0.06]">
        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr className="bg-white/[0.03]">
              {block.columns.map((c, ci) => (
                <th
                  key={ci}
                  className="text-left p-0 border-b border-white/[0.06]"
                >
                  <div className="flex items-center">
                    <input
                      value={c}
                      onChange={(e) => setColumn(ci, e.target.value)}
                      className="flex-1 text-[10px] font-medium text-text-quaternary uppercase bg-transparent border-0 focus:outline-none focus:text-text-secondary px-2.5 py-2"
                      style={{ letterSpacing: "0.14em" }}
                    />
                    {block.columns.length > 1 && (
                      <button
                        onClick={() => removeColumn(ci)}
                        title="Supprimer la colonne" aria-label="Supprimer la colonne"
                        className="text-[11px] text-text-quaternary hover:text-red px-1.5 cursor-pointer"
                      >
                        −
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 border-b border-white/[0.06]" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-white/[0.04] last:border-b-0">
                {block.columns.map((_, ci) => (
                  <td key={ci} className="p-0 align-top">
                    <input
                      value={row[ci] ?? ""}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className="w-full text-[12.5px] px-2.5 py-1.5 bg-transparent border-0 focus:outline-none focus:bg-white/[0.03] text-text-primary placeholder:text-text-quaternary"
                    />
                  </td>
                ))}
                <td className="p-0 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    className="w-7 h-7 text-text-quaternary hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                    title="Supprimer la ligne" aria-label="Supprimer la ligne"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={addRow}
          className="text-[11px] text-text-tertiary hover:text-[var(--color-accent)] cursor-pointer"
        >
          + Ajouter une ligne
        </button>
        <button
          onClick={addColumn}
          className="text-[11px] text-text-tertiary hover:text-[var(--color-accent)] cursor-pointer"
        >
          + Ajouter une colonne
        </button>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Read-only render                                              */
/* ============================================================ */

function ReadOnlyBlock({ block }: { block: CustomBlock }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-white/[0.06] bg-bg-tertiary/50 p-4">
      <header className="flex items-center gap-2.5 mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-white/[0.04] border border-white/[0.05] text-[13px] text-[var(--color-accent)]">
          {block.type === "text" ? "✎" : block.type === "notes" ? "✦" : "▦"}
        </span>
        <h4 className="text-[14px] text-text-primary font-medium">{block.title}</h4>
      </header>

      {block.type === "text" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {block.labels.map((label, i) => {
            const v = (block.values[i] ?? "").trim();
            if (!v) return null;
            return (
              <div key={i}>
                <div
                  className="block text-[10px] font-medium text-text-quaternary uppercase mb-1.5"
                  style={{ letterSpacing: "0.14em" }}
                >
                  {label}
                </div>
                <p className="text-[12.5px] leading-relaxed text-text-secondary whitespace-pre-wrap">
                  {v}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {block.type === "notes" && block.value.trim() && (
        <p className="font-serif italic text-[14px] leading-relaxed text-text-secondary whitespace-pre-wrap">
          {block.value}
        </p>
      )}

      {block.type === "table" && (() => {
        const nonEmpty = block.rows.filter((r) => r.some((c) => (c ?? "").trim()));
        if (nonEmpty.length === 0) return null;
        return (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-white/[0.06]">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr className="bg-white/[0.03]">
                  {block.columns.map((c, ci) => (
                    <th
                      key={ci}
                      className="text-left px-3 py-2 text-[10px] font-medium text-text-quaternary uppercase border-b border-white/[0.06]"
                      style={{ letterSpacing: "0.14em" }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nonEmpty.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/[0.04] last:border-b-0">
                    {block.columns.map((_, ci) => (
                      <td key={ci} className="px-3 py-2 text-text-secondary align-top whitespace-pre-wrap">
                        {(row[ci] ?? "").trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </section>
  );
}

/* ============================================================ */
/*  Helpers                                                       */
/* ============================================================ */

const CUSTOM_BLOCKS_KEY = "__custom_blocks";

export function readCustomBlocks(td: Record<string, unknown> | null | undefined): CustomBlock[] {
  if (!td) return [];
  const raw = td[CUSTOM_BLOCKS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is CustomBlock => {
    if (!b || typeof b !== "object") return false;
    const o = b as Record<string, unknown>;
    return (
      typeof o.id === "string" &&
      typeof o.title === "string" &&
      (o.type === "text" || o.type === "notes" || o.type === "table")
    );
  });
}

export function writeCustomBlocks(
  td: Record<string, unknown> | null | undefined,
  blocks: CustomBlock[],
): Record<string, unknown> {
  return { ...(td ?? {}), [CUSTOM_BLOCKS_KEY]: blocks };
}
