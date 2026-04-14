"use client";

import { categoriesForGenre, type WbCategory } from "@/lib/wb-constants";
import type { Genre } from "@/types/database";

export function WbSubSidebar({
  genre,
  activeCategory,
  onCategoryChange,
  counts,
}: {
  genre: Genre;
  activeCategory: WbCategory;
  onCategoryChange: (cat: WbCategory) => void;
  counts: Record<string, number>;
}) {
  const cats = categoriesForGenre(genre);
  const grouped = cats.reduce<Record<string, typeof cats>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="w-[180px] shrink-0 border-r border-border bg-bg-secondary p-3 flex flex-col h-full overflow-y-auto">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mb-3">
          <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
            {group}
          </div>
          <div className="flex flex-col gap-0.5">
            {items.map((c) => (
              <button
                key={c.key}
                onClick={() => onCategoryChange(c.key)}
                className={`flex items-center gap-2 px-2 py-1.5 text-[12.5px] rounded cursor-pointer transition-colors text-left ${
                  activeCategory === c.key
                    ? "bg-primary-bg text-primary-dark font-medium"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                <span className="text-[13px]">{c.icon}</span>
                <span className="flex-1 truncate">{c.label}</span>
                {counts[c.key] > 0 && (
                  <span className="text-[10px] text-text-quaternary">
                    {counts[c.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
