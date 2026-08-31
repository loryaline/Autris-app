"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function WbTagsEditor({
  entryId,
  value,
  onChange,
  projectTags,
  embedded = false,
}: {
  entryId: string;
  value: string[];
  onChange: (tags: string[]) => void;
  projectTags: string[];
  embedded?: boolean;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const supabase = createClient();

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return [];
    return projectTags
      .filter((t) => !value.includes(t) && t.toLowerCase().includes(q))
      .slice(0, 6);
  }, [input, projectTags, value]);

  async function persist(next: string[]) {
    onChange(next);
    await supabase.from("wb_entries").update({ tags: next }).eq("id", entryId);
  }

  async function add(tag: string) {
    const clean = tag.trim().replace(/,$/, "").trim();
    if (!clean || value.includes(clean)) return;
    await persist([...value, clean]);
    setInput("");
  }

  async function remove(tag: string) {
    await persist(value.filter((t) => t !== tag));
  }

  return (
    <div className={embedded ? "" : "mt-6 border-t border-border pt-4"}>
      {!embedded && (
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
          🏷 Tags
        </label>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-primary-bg text-primary-dark rounded"
          >
            {t}
            <button
              onClick={() => remove(t)}
              className="text-[11px] hover:text-red-500 cursor-pointer leading-none"
              title="Retirer" aria-label="Retirer"
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
            placeholder={value.length === 0 ? "Ajouter un tag..." : "+ tag"}
            className="text-[11px] px-2 py-0.5 bg-bg-secondary border border-border rounded focus:outline-none focus:border-primary min-w-[110px]"
          />
          {focused && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-[180px] bg-bg-primary border border-border rounded shadow-lg z-10 py-1">
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
