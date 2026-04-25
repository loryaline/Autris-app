"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Éditeur de groupes sociaux pour une fiche WB.
 * Même pattern que WbTagsEditor : array de libellés + autocomplétion sur les
 * groupes déjà utilisés dans le projet. Pensé pour regrouper les personnages
 * par faction, famille, équipage, guilde, etc.
 */
export function WbGroupsEditor({
  entryId,
  value,
  onChange,
  projectGroups,
  embedded = false,
}: {
  entryId: string;
  value: string[];
  onChange: (groups: string[]) => void;
  projectGroups: string[];
  embedded?: boolean;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const supabase = createClient();

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    const base = projectGroups.filter((g) => !value.includes(g));
    if (!q) return base.slice(0, 6);
    return base.filter((g) => g.toLowerCase().includes(q)).slice(0, 6);
  }, [input, projectGroups, value]);

  async function persist(next: string[]) {
    onChange(next);
    await supabase.from("wb_entries").update({ groups: next }).eq("id", entryId);
  }

  async function add(group: string) {
    const clean = group.trim().replace(/,$/, "").trim();
    if (!clean || value.includes(clean)) return;
    await persist([...value, clean]);
    setInput("");
  }

  async function remove(group: string) {
    await persist(value.filter((g) => g !== group));
  }

  return (
    <div className={embedded ? "" : "mt-6 border-t border-border pt-4"}>
      {!embedded && (
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
          👥 Groupes
        </label>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        {value.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded"
            style={{
              background: "rgba(239,159,39,0.10)",
              color: "#f0b254",
              border: "1px solid rgba(239,159,39,0.24)",
            }}
          >
            {g}
            <button
              onClick={() => remove(g)}
              className="text-[11px] hover:text-red-500 cursor-pointer leading-none"
              title="Retirer"
            >
              ×
            </button>
          </span>
        ))}
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(input);
              } else if (e.key === "Backspace" && !input && value.length > 0) {
                remove(value[value.length - 1]);
              }
            }}
            placeholder={value.length === 0 ? "Ajouter un groupe…" : "+ groupe"}
            className="text-[11px] px-2 py-0.5 bg-bg-secondary border border-border rounded focus:outline-none focus:border-primary min-w-[120px]"
          />
          {focused && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-[200px] bg-bg-primary border border-border rounded shadow-lg z-10 py-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                  className="w-full text-left px-2 py-1 text-[11px] text-text-primary hover:bg-bg-hover cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
