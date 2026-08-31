"use client";

import { useMemo, useState } from "react";
import type { WbEntry } from "@/types/database";
import { WB_CATEGORIES, getCategoryDef } from "@/lib/wb-constants";

/**
 * Palette : le panneau de droite à sa largeur moyenne.
 *
 * Liste compacte des fiches, filtrable, dont chaque ligne se glisse sur
 * le plateau. C'est la source du geste « poser les personnages ».
 */
export function FichePalette({
  entries,
  onOpenEntry,
  onExpand,
  onClose,
  placedEntryIds,
}: {
  entries: WbEntry[];
  onOpenEntry: (id: string) => void;
  onExpand: () => void;
  onClose: () => void;
  /** Fiches déjà posées au moins une fois — repérage visuel, pas un blocage. */
  placedEntryIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Le Moodboard est exclu : ses « fiches » sont des images dont le titre
  // est un nom de fichier — rien à cartographier. Même règle que le
  // panneau World Building de l'éditeur.
  const usable = useMemo(
    () => entries.filter((e) => e.category !== "moodboard" && e.status !== "archive"),
    [entries],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return usable
      .filter((e) => category === "all" || e.category === category)
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          (e.subtitle ?? "").toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      );
  }, [usable, query, category]);

  // Regroupement par catégorie, comme le panneau de l'éditeur.
  const groups = useMemo(() => {
    const byCat = new Map<string, WbEntry[]>();
    for (const e of visible) {
      if (!byCat.has(e.category)) byCat.set(e.category, []);
      byCat.get(e.category)!.push(e);
    }
    return WB_CATEGORIES.filter((c) => byCat.has(c.key)).map((c) => ({
      key: c.key,
      label: c.label,
      icon: c.icon,
      items: byCat
        .get(c.key)!
        .sort((a, b) => a.title.localeCompare(b.title, "fr")),
    }));
  }, [visible]);

  // Catégories réellement peuplées : inutile de proposer les vides.
  const usedCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of usable) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return WB_CATEGORIES.filter((c) => counts.has(c.key)).map((c) => ({
      ...c,
      count: counts.get(c.key)!,
    }));
  }, [usable]);

  return (
    <aside
      className="w-[320px] shrink-0 flex flex-col h-full"
      style={{
        background: "var(--bg-2)",
        borderLeft: "1px solid var(--border-soft)",
      }}
    >
      {/* En-tête */}
      <div
        className="flex items-center gap-1.5 px-3 h-11 shrink-0"
        style={{ borderBottom: "1px solid var(--border-soft)" }}
      >
        <span
          className="text-[10px] font-medium uppercase flex-1"
          style={{ letterSpacing: "0.16em", color: "var(--text-4)" }}
          title="Les éléments de votre univers, à glisser sur le plateau"
        >
          Palette
        </span>
        <button
          onClick={onExpand}
          title="Ouvrir la bibliothèque (plein écran)"
          aria-label="Ouvrir la bibliothèque"
          className="rd-icon-btn"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path
              d="M8.5 2H12V5.5M5.5 12H2V8.5M12 2L8 6M2 12L6 8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={onClose}
          title="Masquer le panneau"
          aria-label="Masquer le panneau"
          className="rd-icon-btn"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path
              d="M5.5 3L9.5 7L5.5 11"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Recherche */}
      <div className="px-3 pt-2.5 pb-2 shrink-0 flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une fiche…"
          className="h-8 px-2.5 rounded text-[12.5px] w-full"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-1)",
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-7 px-1.5 rounded text-[11.5px] w-full cursor-pointer"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-2)",
          }}
        >
            <option value="all">Toutes les catégories ({usable.length})</option>
          {usedCategories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.icon} {c.label} ({c.count})
            </option>
          ))}
        </select>
      </div>

      <div
        className="px-3 pb-1.5 text-[10.5px] shrink-0"
        style={{ color: "var(--text-4)" }}
      >
        Cliquez pour ouvrir · glissez sur le plateau pour poser
      </div>

      {/* Liste groupée par catégorie */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 flex flex-col">
        {groups.length === 0 ? (
          <div
            className="px-2 py-6 text-[12px] text-center"
            style={{ color: "var(--text-4)" }}
          >
            {usable.length === 0
              ? "Aucune fiche pour l'instant. Élargissez le panneau jusqu'à la bibliothèque pour en créer une."
              : "Aucune fiche ne correspond."}
          </div>
        ) : (
          groups.map((g) => {
            const isCollapsed = collapsed[g.key];
            return (
              <section key={g.key} className="flex flex-col">
                <button
                  onClick={() =>
                    setCollapsed((s) => ({ ...s, [g.key]: !s[g.key] }))
                  }
                  className="flex items-center gap-1.5 px-1.5 pt-2.5 pb-1 text-left bg-transparent border-none cursor-pointer sticky top-0 z-10"
                  style={{ background: "var(--bg-2)" }}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="none"
                    style={{
                      transform: isCollapsed ? "rotate(-90deg)" : "none",
                      transition: "transform .15s",
                      color: "var(--text-4)",
                    }}
                  >
                    <path
                      d="M1.5 2.5L4 5.5L6.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[11px]">{g.icon}</span>
                  <span
                    className="text-[10px] font-medium uppercase flex-1 truncate"
                    style={{ letterSpacing: "0.12em", color: "var(--text-4)" }}
                  >
                    {g.label}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-4)" }}>
                    {g.items.length}
                  </span>
                </button>

                {!isCollapsed &&
                  g.items.map((e) => {
                    const cat = getCategoryDef(e.category);
                    const placed = placedEntryIds.has(e.id);
                    return (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={(ev) => {
                          ev.dataTransfer.setData("application/x-autris-entry", e.id);
                          ev.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onOpenEntry(e.id)}
                        title={`${e.title} — cliquer pour ouvrir, glisser pour poser sur le plateau`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing transition-colors hover:bg-white/[0.05]"
                      >
                        <div
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] overflow-hidden"
                          style={{
                            background: "var(--bg-3)",
                            border: "1px solid var(--border-soft)",
                          }}
                        >
                          {e.main_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={e.main_image_url}
                              alt=""
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <span>{cat?.icon ?? "📄"}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[12.5px] truncate"
                            style={{ color: "var(--text-1)" }}
                          >
                            {e.title}
                          </div>
                          {e.subtitle && (
                            <div
                              className="text-[10px] truncate italic"
                              style={{ color: "var(--text-4)" }}
                            >
                              {e.subtitle}
                            </div>
                          )}
                        </div>
                        {placed && (
                          <span
                            title="Déjà posée sur le plateau"
                            className="shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{ background: "var(--accent)" }}
                          />
                        )}
                      </div>
                    );
                  })}
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
