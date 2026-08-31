"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { appToast } from "@/lib/app-toast";
import type { WbEntry, WbLink } from "@/types/database";
import {
  LINK_TYPES,
  LINK_TYPE_GROUPS,
  customLinkTypes,
  areReciprocal,
  getCategoryDef,
} from "@/lib/wb-constants";

export function WbLinksEditor({
  entry,
  allEntries,
  links,
  onSelectEntry,
  onLinkAdded,
  onLinkRemoved,
  embedded = false,
}: {
  entry: WbEntry;
  allEntries: WbEntry[];
  links: WbLink[];
  onSelectEntry: (id: string) => void;
  onLinkAdded: (link: WbLink) => void;
  onLinkRemoved: (id: string) => void;
  embedded?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pickedType, setPickedType] = useState<string>(LINK_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [focused, setFocused] = useState(false);
  // Pourquoi un ajout a été refusé — sans ça le clic ne fait « rien ».
  const [notice, setNotice] = useState<string | null>(null);
  // Les types inventés sur cette fiche, à reproposer plutôt qu'à ressaisir.
  const ownTypes = useMemo(() => customLinkTypes(links), [links]);
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

    // La relation est-elle déjà enregistrée, ici ou depuis l'autre fiche ?
    // « frère » posé alors que « sœur » existe dans l'autre sens, c'est le
    // même fait : on ne le réécrit pas.
    const already = links.some((l) => {
      const sameWay = l.from_entry_id === entry.id && l.to_entry_id === target.id;
      const otherWay = l.from_entry_id === target.id && l.to_entry_id === entry.id;
      if (!sameWay && !otherWay) return false;
      if (l.link_type === type) return true;
      return otherWay && areReciprocal(l.link_type, type);
    });
    if (already) {
      setNotice(
        `${target.title} est déjà relié — « ${type} » dans un sens et son ` +
          `complément dans l'autre disent le même fait, une seule ` +
          `relation suffit. La fiche d'en face l'affiche à sa manière.`,
      );
      setQuery("");
      setCustomType("");
      return;
    }
    setNotice(null);

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
      appToast(
        `Le lien vers ${target.title || "cette fiche"} n'a pas pu être ` +
          `enregistré. Vérifie ta connexion et réessaie.`,
        { danger: true },
      );
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
    // « Alina sœur de Set » + « Set frère d'Alina » : un seul fait, énoncé
    // de chaque bord. On les réunit en une seule pastille « sœur / frère »
    // au lieu d'afficher deux fois la même parenté.
    type Item = { links: WbLink[]; other: WbEntry };
    const dirOf = (l: WbLink) => (l.from_entry_id === entry.id ? "out" : "in");

    const items: Item[] = [];
    for (const l of links) {
      const otherId = l.from_entry_id === entry.id ? l.to_entry_id : l.from_entry_id;
      const other = allEntries.find((e) => e.id === otherId);
      if (!other) continue;
      const twin = items.find(
        (it) =>
          it.other.id === other.id &&
          it.links.length === 1 &&
          dirOf(it.links[0]) !== dirOf(l) &&
          areReciprocal(it.links[0].link_type, l.link_type),
      );
      if (twin) twin.links.push(l);
      else items.push({ links: [l], other });
    }

    const map = new Map<string, Item[]>();
    for (const it of items) {
      const key = it.other.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [links, allEntries, entry.id]);

  return (
    <div className={embedded ? "" : "mt-6 border-t border-border pt-4"}>
      {!embedded && (
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
          🔗 Liens avec d&apos;autres fiches
        </label>
      )}

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
          {ownTypes.length > 0 && (
            <optgroup label="Vos types">
              {ownTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </optgroup>
          )}
          {LINK_TYPE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </optgroup>
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

      {/* Refus expliqué : sans ça, cliquer semblait ne rien faire. */}
      {notice && (
        <div className="text-[11px] leading-snug text-text-secondary bg-bg-secondary border border-border rounded px-2 py-1.5 mb-3 flex items-start gap-2">
          <span className="flex-1">{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-text-tertiary hover:text-text-primary cursor-pointer shrink-0"
            title="Fermer" aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}

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
                  {items.map(({ links: pair, other }) => {
                    const types = Array.from(
                      new Set(pair.map((l) => l.link_type).filter(Boolean)),
                    ) as string[];
                    const label = types.join(" / ");
                    const me = entry.title || "Cette fiche";
                    const them = other.title || "Sans titre";

                    // Le SENS porte le fait : « Eliot est amoureux d'Alina »
                    // ne dit rien des sentiments d'Alina. Une relation
                    // réciproque (sœur / frère) se lit dans les deux sens ;
                    // une relation à sens unique doit dire lequel.
                    const outgoing = pair[0].from_entry_id === entry.id;
                    // Deux liens en base pour un seul fait (héritage) :
                    // les retirer tous les deux d'un coup.
                    const paired = pair.length > 1;
                    // Symétrique = le même mot des deux bords, pas « il
                    // existe un lien en face ». Une paire père/fils est
                    // réciproque sans l'être : sans ce distinguo elle
                    // s'afficherait « père / fils » sans dire qui est qui.
                    const symmetric = areReciprocal(types[0] ?? null, types[0] ?? null);

                    const sentence = symmetric
                      ? `${me} — ${label} — ${them}`
                      : outgoing
                        ? `${me} est ${label} de ${them}`
                        : `${them} est ${label} de ${me}`;

                    const badge = (
                      <span
                        className="text-[9px] uppercase tracking-wider text-primary-dark bg-primary-bg px-1 rounded whitespace-nowrap"
                        title={sentence}
                      >
                        {symmetric ? label : outgoing ? `${label} de` : `est ${label}`}
                      </span>
                    );
                    const name = (
                      <button
                        onClick={() => onSelectEntry(other.id)}
                        className="text-text-primary hover:text-primary cursor-pointer"
                        title="Ouvrir cette fiche"
                      >
                        {them}
                      </button>
                    );

                    return (
                      <span
                        key={pair[0].id}
                        title={sentence}
                        className="inline-flex items-center gap-1.5 text-[11px] pl-2 pr-1 py-0.5 bg-bg-secondary border border-border rounded group hover:border-primary transition-colors"
                      >
                        {/* « amoureux de Eliot » vs « Eliot est amoureux » :
                            l'ordre des mots dit qui aime qui. */}
                        {!symmetric && outgoing ? (
                          <>
                            {label && badge}
                            {name}
                          </>
                        ) : (
                          <>
                            {name}
                            {label && badge}
                          </>
                        )}
                        <button
                          onClick={() => pair.forEach((l) => removeLink(l.id))}
                          className="text-text-quaternary hover:text-red-500 cursor-pointer leading-none opacity-0 group-hover:opacity-100 transition-opacity px-1"
                          title={
                            paired
                              ? "Retirer la relation (des deux côtés)"
                              : "Retirer le lien"
                          } aria-label={
                            paired
                              ? "Retirer la relation (des deux côtés)"
                              : "Retirer le lien"
                          }
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
