"use client";

import { useEffect, useRef, useState } from "react";
import { LINK_TYPE_GROUPS } from "@/lib/wb-constants";

/**
 * Choix du type de relation, au lâcher d'une flèche entre deux vignettes.
 *
 * Le vocabulaire est celui de l'éditeur de liens des fiches — c'est la
 * même relation qu'on écrit, il n'y a qu'une seule liste au monde.
 */
export function LinkTypePicker({
  fromTitle,
  toTitle,
  anchor,
  onPick,
  onCancel,
}: {
  fromTitle: string;
  toTitle: string;
  anchor: { top: number; left: number };
  onPick: (type: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const q = query.trim().toLowerCase();
  const groups = LINK_TYPE_GROUPS.map((g) => ({
    label: g.label,
    types: g.types.filter((t) => !q || t.toLowerCase().includes(q)),
  })).filter((g) => g.types.length > 0);

  const custom = q && !groups.some((g) => g.types.some((t) => t.toLowerCase() === q));

  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={onCancel} />
      <div
        className="fixed z-[85] w-[280px] rounded-[var(--radius-md)] shadow-2xl flex flex-col"
        style={{
          top: Math.min(anchor.top, window.innerHeight - 380),
          left: Math.max(8, Math.min(anchor.left, window.innerWidth - 300)),
          background: "var(--bg-3)",
          border: "1px solid var(--border-soft)",
          maxHeight: 360,
        }}
      >
        <div
          className="px-3 py-2.5 shrink-0"
          style={{ borderBottom: "1px solid var(--border-soft)" }}
        >
          <div
            className="text-[10px] uppercase mb-1"
            style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
          >
            Quelle relation ?
          </div>
          <div className="text-[12px] leading-snug" style={{ color: "var(--text-2)" }}>
            <b style={{ color: "var(--text-1)" }}>{fromTitle}</b> est le/la …{" "}
            de <b style={{ color: "var(--text-1)" }}>{toTitle}</b>
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const first = groups[0]?.types[0];
                if (custom) onPick(query.trim());
                else if (first) onPick(first);
              }
            }}
            placeholder="Filtrer ou saisir un type…"
            className="mt-2 h-7 px-2 rounded text-[12px] w-full"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border-soft)",
              color: "var(--text-1)",
            }}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
          {custom && (
            <button
              onClick={() => onPick(query.trim())}
              className="w-full text-left px-3 py-1.5 text-[12.5px] cursor-pointer bg-transparent border-none hover:bg-white/[0.05]"
              style={{ color: "var(--accent)" }}
            >
              Créer « {query.trim()} »
            </button>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <div
                className="px-3 pt-2 pb-1 text-[9.5px] uppercase"
                style={{ letterSpacing: "0.13em", color: "var(--text-4)" }}
              >
                {g.label}
              </div>
              <div className="flex flex-wrap gap-1 px-2.5 pb-1">
                {g.types.map((t) => (
                  <button
                    key={t}
                    onClick={() => onPick(t)}
                    className="px-2 py-1 rounded-full text-[11.5px] cursor-pointer transition-colors"
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border-soft)",
                      color: "var(--text-2)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
