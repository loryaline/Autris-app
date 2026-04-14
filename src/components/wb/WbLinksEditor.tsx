"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WbEntry, WbLink } from "@/types/database";
import { LINK_TYPES, getCategoryDef } from "@/lib/wb-constants";

export function WbLinksEditor({
  entry,
  allEntries,
  links,
  onSelectEntry,
  onLinkAdded,
  onLinkRemoved,
}: {
  entry: WbEntry;
  allEntries: WbEntry[];
  links: WbLink[];
  onSelectEntry: (id: string) => void;
  onLinkAdded: (link: WbLink) => void;
  onLinkRemoved: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [pickedType, setPickedType] = useState<string>(LINK_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [focused, setFocused] = useState(false);
  const supabase = createClient();

  const linkedEntryIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of links) {
      s.add(l.from_entry_id === entry.id ? l.to_entry_id : l.from_entry_id);
    }
    return s;
  }, [links, entry.id]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allEntries
      .filter(
        (e) =>
          e.id !== entry.id &&
          !linkedEntryIds.has(e.id) &&
          e.status !== "archive" &&
          ((e.title ?? "").toLowerCase().includes(q) ||
            (e.subtitle ?? "").toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [query, allEntries, entry.id, linkedEntryIds]);

  async function addLink(target: WbEntry) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const type =
      pickedType === "autre" && customType.trim() ? customType.trim() : pickedType;
    const { data, error } = await supabase
      .from("wb_links")
      .insert({
        from_entry_id: entry.id,
        to_entry_id: target.id,
        link_type: type,
        user_id: userData.user.id,
      })
      .select()
      .single();
    if (error || !data) {
      console.error(error);
      return;
    }
    onLinkAdded(data as WbLink);
    setQuery("");
    setCustomType("");
  }

  async function removeLink(linkId: string) {
    await supabase.from("wb_links").delete().eq("id", linkId);
    onLinkRemoved(linkId);
  }

  // Groupement par catégorie de la fiche liée
  const grouped = useMemo(() => {
    const map = new Map<string, { link: WbLink; other: WbEntry }[]>();
    for (const l of links) {
      const otherId = l.from_entry_id === entry.id ? l.to_entry_id : l.from_entry_id;
      const other = allEntries.find((e) => e.id === otherId);
      if (!other) continue;
      const key = other.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ link: l, other });
    }
    return Array.from(map.entries());
  }, [links, allEntries, entry.id]);

  return (
    <div className="mt-6 border-t border-border pt-4">
      <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
        🔗 Liens avec d&apos;autres fiches
      </label>

      {/* Form d'ajout */}
      <div className="flex gap-2 items-start mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Rechercher une fiche à lier..."
            className="w-full text-[12px] px-2 py-1.5 bg-bg-secondary border border-border rounded focus:outline-none focus:border-primary"
          />
          {focused && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-bg-primary border border-border rounded shadow-lg z-10 py-1 max-h-[220px] overflow-y-auto">
              {suggestions.map((s) => {
                const cat = getCategoryDef(s.category);
                return (
                  <button
                    key={s.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addLink(s)}
                    className="w-full text-left px-2 py-1.5 hover:bg-bg-hover cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-[13px]">{cat?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-text-primary truncate">
                        {s.title || "Sans titre"}
                      </div>
                      <div className="text-[10px] text-text-tertiary truncate">
                        {cat?.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <select
          value={pickedType}
          onChange={(e) => setPickedType(e.target.value)}
          className="text-[11px] px-2 py-1.5 bg-bg-secondary border border-border rounded cursor-pointer"
        >
          {LINK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {pickedType === "autre" && (
          <input
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Type personnalisé"
            className="text-[11px] px-2 py-1.5 bg-bg-secondary border border-border rounded focus:outline-none focus:border-primary w-[140px]"
          />
        )}
      </div>

      {/* Liste groupée */}
      {grouped.length === 0 ? (
        <div className="text-[11px] text-text-quaternary italic">
          Aucun lien pour le moment.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {grouped.map(([cat, items]) => {
            const def = getCategoryDef(cat);
            return (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1 flex items-center gap-1">
                  <span>{def?.icon}</span>
                  <span>{def?.label ?? cat}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {items.map(({ link, other }) => (
                    <span
                      key={link.id}
                      className="inline-flex items-center gap-1.5 text-[11px] pl-2 pr-1 py-0.5 bg-bg-secondary border border-border rounded group hover:border-primary transition-colors"
                    >
                      <button
                        onClick={() => onSelectEntry(other.id)}
                        className="text-text-primary hover:text-primary cursor-pointer"
                        title="Ouvrir cette fiche"
                      >
                        {other.title || "Sans titre"}
                      </button>
                      {link.link_type && (
                        <span className="text-[9px] uppercase tracking-wider text-primary-dark bg-primary-bg px-1 rounded">
                          {link.link_type}
                        </span>
                      )}
                      <button
                        onClick={() => removeLink(link.id)}
                        className="text-text-quaternary hover:text-red-500 cursor-pointer leading-none opacity-0 group-hover:opacity-100 transition-opacity px-1"
                        title="Retirer le lien"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
