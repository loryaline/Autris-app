"use client";

import { useState, useRef, useEffect } from "react";
import { WB_TONE_PALETTE } from "@/lib/wb-tones";

const THEME_PALETTE_KEYS = [
  "teal",
  "purple",
  "amber",
  "blue",
  "violet",
  "rose",
  "green",
] as const;

export function themeToneFor(text: string) {
  let h = 0;
  const t = (text ?? "").toLowerCase();
  for (let i = 0; i < t.length; i++) {
    h = (h * 31 + t.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % THEME_PALETTE_KEYS.length;
  return WB_TONE_PALETTE[THEME_PALETTE_KEYS[idx]];
}

/**
 * ThemePills : affiche N pastilles de thème éditables.
 * - Clic sur une pastille → édition inline (Enter pour valider, vide = supprimer)
 * - Bouton "+" trailing → ajoute un nouveau thème
 *
 * Persistance : on appelle `onChange(nextThemes)` à chaque mutation.
 */
export function ThemePills({
  themes,
  onChange,
  placeholder = "+ ajouter",
  compact = false,
}: {
  themes: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  function commitEdit(idx: number, raw: string) {
    const v = raw.trim();
    setEditingIdx(null);
    if (!v) {
      // suppression
      onChange(themes.filter((_, i) => i !== idx));
      return;
    }
    if (v === themes[idx]) return;
    const next = [...themes];
    next[idx] = v;
    onChange(next);
  }

  function commitAdd(raw: string) {
    const v = raw.trim();
    setAdding(false);
    if (!v) return;
    if (themes.includes(v)) return;
    onChange([...themes, v]);
  }

  const pillPad = compact ? "px-2 py-[1px]" : "px-2.5 py-[2px]";
  const pillText = compact ? "text-[10.5px]" : "text-[11px]";

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 min-h-[28px]">
      {themes.map((theme, idx) => {
        const tone = themeToneFor(theme);
        if (editingIdx === idx) {
          return (
            <PillInput
              key={`edit-${idx}`}
              initial={theme}
              tone={tone}
              onCommit={(v) => commitEdit(idx, v)}
              onCancel={() => setEditingIdx(null)}
              pillPad={pillPad}
              pillText={pillText}
            />
          );
        }
        return (
          <button
            key={`${theme}-${idx}`}
            type="button"
            onClick={() => setEditingIdx(idx)}
            className={`inline-flex items-center rounded-full italic cursor-pointer hover:brightness-110 transition ${pillPad} ${pillText}`}
            style={{
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              color: tone.text,
            }}
            title="Cliquer pour modifier (vide = supprimer)"
          >
            {theme}
          </button>
        );
      })}

      {adding ? (
        <PillInput
          initial=""
          tone={null}
          onCommit={commitAdd}
          onCancel={() => setAdding(false)}
          pillPad={pillPad}
          pillText={pillText}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`inline-flex items-center rounded-full italic border border-dashed cursor-pointer text-text-quaternary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] transition ${pillPad} ${pillText}`}
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {themes.length === 0 ? placeholder : "+"}
        </button>
      )}
    </div>
  );
}

function PillInput({
  initial,
  tone,
  onCommit,
  onCancel,
  pillPad,
  pillText,
}: {
  initial: string;
  tone: { bg: string; border: string; text: string } | null;
  onCommit: (v: string) => void;
  onCancel: () => void;
  pillPad: string;
  pillText: string;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(v);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      className={`inline-flex items-center rounded-full italic outline-none min-w-[60px] max-w-[160px] ${pillPad} ${pillText}`}
      style={{
        background: tone?.bg ?? "rgba(255,255,255,0.04)",
        border: `1px solid ${tone?.border ?? "var(--color-accent-border)"}`,
        color: tone?.text ?? "var(--color-text-primary)",
      }}
    />
  );
}
