"use client";

import { useState, useEffect } from "react";
import type { Template, TemplateField } from "@/lib/wb-templates";

export function DynamicTemplate({
  template,
  data,
  onChange,
  renderAsCards = false,
}: {
  template: Template;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  /**
   * Quand vrai, chaque section est rendue dans sa propre Card (bordée, padée)
   * avec les champs disposés en grille 2 colonnes. Sinon, rendu stack vertical.
   */
  renderAsCards?: boolean;
}) {
  const [local, setLocal] = useState<Record<string, unknown>>(data);

  useEffect(() => {
    setLocal(data);
  }, [data]);

  function update(key: string, value: unknown) {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  }

  function renderField(f: TemplateField) {
    if (f.type === "quad") {
      const quadData = (local[f.key] as Record<string, string>) ?? {};
      const cols = f.columns ?? ["A", "B", "C", "D"];
      return (
        <div key={f.key} className={fieldSpan(f, true)}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cols.map((col, idx) => {
              const colKey = `col${idx}`;
              return (
                <div key={colKey}>
                  <FieldLabel>{col}</FieldLabel>
                  <textarea
                    value={quadData[colKey] ?? ""}
                    onChange={(e) =>
                      update(f.key, { ...quadData, [colKey]: e.target.value })
                    }
                    rows={4}
                    placeholder="Une entrée par ligne"
                    className={FIELD_TEXTAREA}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (f.type === "input") {
      return (
        <div key={f.key} className={fieldSpan(f, renderAsCards)}>
          <FieldLabel>{f.label}</FieldLabel>
          <input
            value={(local[f.key] as string) ?? ""}
            onChange={(e) => update(f.key, e.target.value)}
            placeholder={f.placeholder}
            className={FIELD_INPUT}
          />
        </div>
      );
    }

    // Textarea par défaut
    return (
      <div key={f.key} className={fieldSpan(f, renderAsCards)}>
        {f.label && <FieldLabel>{f.label}</FieldLabel>}
        <textarea
          value={(local[f.key] as string) ?? ""}
          onChange={(e) => update(f.key, e.target.value)}
          placeholder={f.placeholder}
          rows={f.rows ?? 2}
          className={FIELD_TEXTAREA}
        />
      </div>
    );
  }

  if (renderAsCards) {
    return (
      <div className="flex flex-col gap-4">
        {template.sections.map((section) => (
          <section
            key={section.group}
            className="rounded-[var(--radius-lg)] border border-white/[0.06] bg-bg-tertiary/50 p-4"
          >
            <header className="flex items-center gap-2.5 mb-4">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-white/[0.04] border border-white/[0.05] text-[13px]"
                aria-hidden
              >
                {section.icon}
              </span>
              <h4 className="text-[14px] text-text-primary font-medium">
                {section.group}
              </h4>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.fields.map((f) => renderField(f))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Mode stack par défaut (rétro-compatible)
  return (
    <div className="flex flex-col gap-5">
      {template.sections.map((section, sIdx) => (
        <section
          key={section.group}
          className={sIdx === 0 ? "" : "pt-5 border-t border-white/[0.05]"}
        >
          <header className="flex items-center gap-2.5 mb-3">
            <span
              className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-white/[0.04] border border-white/[0.05] text-[13px]"
              aria-hidden
            >
              {section.icon}
            </span>
            <h4 className="text-[13px] text-text-primary font-medium">
              {section.group}
            </h4>
          </header>
          <div className="flex flex-col gap-3">
            {section.fields.map((f) => renderField(f))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ========== Helpers ========== */

/**
 * Détermine si un champ doit occuper toute la largeur (span 2) en mode grille.
 * Règles :
 *  - type "quad" : toujours full-width
 *  - textarea avec rows >= 4 : full-width
 *  - sinon : demi-largeur
 */
function fieldSpan(f: TemplateField, grid: boolean): string {
  if (!grid) return "";
  if (f.type === "quad") return "md:col-span-2";
  if (f.type !== "input" && (f.rows ?? 2) >= 4) return "md:col-span-2";
  return "";
}

const FIELD_INPUT =
  "w-full text-[12.5px] px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-accent-border)] focus:bg-white/[0.03] text-text-primary placeholder:text-text-quaternary transition-colors";

const FIELD_TEXTAREA =
  "w-full text-[12.5px] leading-relaxed px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-md)] resize-none focus:outline-none focus:border-[var(--color-accent-border)] focus:bg-white/[0.03] text-text-primary placeholder:text-text-quaternary transition-colors";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[10px] font-medium text-text-quaternary uppercase mb-1.5"
      style={{ letterSpacing: "0.14em" }}
    >
      {children}
    </label>
  );
}
