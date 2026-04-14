"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WbEntry } from "@/types/database";
import { getCategoryDef, UNIVERS_SUBTYPES } from "@/lib/wb-constants";

export function WbCommandPalette({
  open,
  entries,
  onClose,
  onSelectEntry,
}: {
  open: boolean;
  entries: WbEntry[];
  onClose: () => void;
  onSelectEntry: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = entries.filter((e) => e.status !== "archive");
    if (!q) {
      // Aucune recherche : on montre les 8 plus récentes
      return visible.slice(0, 8);
    }
    const scored: { e: WbEntry; score: number }[] = [];
    for (const e of visible) {
      const title = (e.title ?? "").toLowerCase();
      const subtitle = (e.subtitle ?? "").toLowerCase();
      const desc = (e.description ?? "").toLowerCase();
      const tags = (e.tags ?? []).join(" ").toLowerCase();
      const tplValues = Object.values(e.template_data ?? {})
        .filter((v): v is string => typeof v === "string")
        .join(" ")
        .toLowerCase();

      let score = 0;
      if (title.startsWith(q)) score += 100;
      else if (title.includes(q)) score += 60;
      if (subtitle.includes(q)) score += 20;
      if (tags.includes(q)) score += 15;
      if (desc.includes(q)) score += 8;
      if (tplValues.includes(q)) score += 5;

      if (score > 0) scored.push({ e, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 15).map((s) => s.e);
  }, [query, entries]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onClose();
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        const picked = results[cursor];
        if (picked) {
          onSelectEntry(picked.id);
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, cursor, onClose, onSelectEntry]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[580px] bg-bg-primary border border-border rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="text-text-tertiary">🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans les fiches, tags, contenu..."
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
          <kbd className="text-[10px] text-text-quaternary border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-text-tertiary">
              Aucun résultat
            </div>
          ) : (
            results.map((e, i) => {
              const cat = getCategoryDef(e.category);
              const sub =
                e.category === "univers_monde" && e.subcategory
                  ? UNIVERS_SUBTYPES.find((s) => s.key === e.subcategory)?.label
                  : null;
              return (
                <button
                  key={e.id}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => {
                    onSelectEntry(e.id);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 cursor-pointer ${
                    i === cursor ? "bg-bg-hover" : ""
                  }`}
                >
                  {e.main_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.main_image_url}
                      alt=""
                      className="w-8 h-8 rounded object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded bg-bg-secondary border border-border flex items-center justify-center text-[14px] flex-shrink-0">
                      {cat?.icon}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text-primary truncate">
                      {e.title || "Sans titre"}
                    </div>
                    <div className="text-[10px] text-text-tertiary truncate">
                      {cat?.label}
                      {sub ? ` · ${sub}` : ""}
                      {e.subtitle ? ` · ${e.subtitle}` : ""}
                    </div>
                  </div>
                  {e.status === "valide" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1D9E75]/20 text-[#1D9E75]">
                      Validé
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-text-quaternary">
          <span>
            <kbd className="border border-border rounded px-1">↑↓</kbd> naviguer
          </span>
          <span>
            <kbd className="border border-border rounded px-1">↵</kbd> ouvrir
          </span>
          <span>
            <kbd className="border border-border rounded px-1">Ctrl+K</kbd> rouvrir
          </span>
        </div>
      </div>
    </div>
  );
}
