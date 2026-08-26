"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCategoryDef,
  UNIVERS_SUBTYPES,
  MAGIC_SUBTYPES,
  MONEY_SUBTYPES,
  WB_STATUSES,
} from "@/lib/wb-constants";
import { getTemplate } from "@/lib/wb-templates";
import { DynamicTemplate } from "@/components/wb/DynamicTemplate";
import { WbMainImage } from "@/components/wb/WbMainImage";
import { WbTagsEditor } from "@/components/wb/WbTagsEditor";
import { WbLinksEditor } from "@/components/wb/WbLinksEditor";
import type { WbEntry, WbLink } from "@/types/database";

/**
 * Fiche du World Building affichée dans un PANNEAU ÉTROIT.
 *
 * Pensée pour une colonne de 320 à 500 px : une seule colonne, titres
 * compacts, template en lecture soignée. À ne pas confondre avec
 * WbEntryDetail, qui est la mise en page pleine largeur de la
 * bibliothèque (grilles 12 colonnes).
 *
 * Deux modes : consultation (par défaut) et édition en place, avec
 * enregistrement différé. Partagé par le panneau de contexte de
 * l'éditeur et par le panneau du plateau.
 */

/** Sous-ensemble de champs nécessaire — WbEntry le satisfait. */
export interface WbEntryPanelData {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  subcategory: string | null;
  main_image_url: string | null;
  template_data: Record<string, unknown> | null;
  tags: string[] | null;
  personal_notes: string | null;
  /** Jamais modifié par ce panneau, mais présent chez les deux appelants. */
  status?: string;
}

function formatRelativeDate(d: Date): string {
  const now = Date.now();
  const diff = Math.round((now - d.getTime()) / 1000);
  if (diff < 45) return "à l'instant";
  if (diff < 90) return "il y a 1 min";
  const mins = Math.round(diff / 60);
  if (mins < 45) return `il y a ${mins} min`;
  const hrs = Math.round(diff / 3600);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.round(diff / 86400);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(
    "fr-FR",
    sameYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  );
}

export function WbEntryPanel({
  entry,
  loading = false,
  initialEditing = false,
  onBack,
  onOpenFull,
  onLocalUpdate,
  backLabel = "← Retour",
  openFullLabel = "↗ Ouvrir",
  openFullTitle = "Ouvrir la fiche complète",
  projectId,
  projectTags,
  allEntries,
  entryLinks,
  onSelectEntry,
  onLinkAdded,
  onLinkRemoved,
}: {
  entry: WbEntryPanelData;
  loading?: boolean;
  initialEditing?: boolean;
  onBack: () => void;
  onOpenFull: () => void;
  onLocalUpdate: (patch: Partial<WbEntryPanelData>) => void;
  backLabel?: string;
  openFullLabel?: string;
  openFullTitle?: string;
  /** Fourni → l'image principale et le statut deviennent modifiables ici. */
  projectId?: string;
  /** Fourni → les tags deviennent modifiables ici. */
  projectTags?: string[];
  /** Fournis ensemble → les liens de la fiche deviennent éditables ici.
   * C'est bien le lieu prévu pour rompre une relation : le plateau, lui,
   * ne peut qu'en créer (cf. PRD « Plateaux vivants »). */
  allEntries?: WbEntry[];
  entryLinks?: WbLink[];
  onSelectEntry?: (id: string) => void;
  onLinkAdded?: (link: WbLink) => void;
  onLinkRemoved?: (id: string) => void;
}) {
  const cat = getCategoryDef(entry.category);
  const sub =
    entry.category === "univers_monde" && entry.subcategory
      ? UNIVERS_SUBTYPES.find((st) => st.key === entry.subcategory)
      : entry.category === "magie_divinites" && entry.subcategory
        ? MAGIC_SUBTYPES.find((st) => st.key === entry.subcategory)
        : entry.category === "systeme_monetaire" && entry.subcategory
          ? MONEY_SUBTYPES.find((st) => st.key === entry.subcategory)
          : null;
  const template = getTemplate(entry.category, entry.subcategory);

  const supabase = createClient();
  const entryId = entry.id;

  const [editing, setEditing] = useState(initialEditing);

  // État local miroir (uniquement pertinent en édition), resynchronisé
  // à chaque changement de fiche ou à la sortie de l'édition.
  const [title, setTitle] = useState(entry.title ?? "");
  const [subtitle, setSubtitle] = useState(entry.subtitle ?? "");
  const [description, setDescription] = useState(entry.description ?? "");
  const [notes, setNotes] = useState(entry.personal_notes ?? "");
  const [tdata, setTdata] = useState<Record<string, unknown>>(
    entry.template_data ?? {},
  );
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    setTitle(entry.title ?? "");
    setSubtitle(entry.subtitle ?? "");
    setDescription(entry.description ?? "");
    setNotes(entry.personal_notes ?? "");
    setTdata(entry.template_data ?? {});
    setSavedAt(null);
    setEditing(initialEditing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  // Bloc Liens — rendu dans les deux modes : en lecture pour naviguer
  // d'une fiche à l'autre, en édition pour nouer et rompre les relations.
  const linksBlock =
    allEntries && entryLinks && onSelectEntry && onLinkAdded && onLinkRemoved ? (
      <div className="border-t border-white/[0.05] pt-3">
        <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-1.5">
          🔗 Liens
        </div>
        <WbLinksEditor
          entry={entry as unknown as WbEntry}
          allEntries={allEntries}
          links={entryLinks}
          onSelectEntry={onSelectEntry}
          onLinkAdded={onLinkAdded}
          onLinkRemoved={onLinkRemoved}
          embedded
        />
      </div>
    ) : null;

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave(patch: Partial<WbEntryPanelData>) {
    onLocalUpdate(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("wb_entries").update(patch).eq("id", entryId);
      setSavedAt(new Date());
    }, 800);
  }

  // ========= En-tête commune aux deux modes =========
  const header = (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={onBack}
        className="text-[11px] text-text-tertiary hover:text-[var(--color-accent)] cursor-pointer bg-transparent border-none flex items-center gap-1"
      >
        {backLabel}
      </button>
      <div className="flex items-center gap-2">
        {editing && savedAt && (
          <span className="text-[9.5px] text-text-quaternary font-serif italic">
            enregistré · {formatRelativeDate(savedAt)}
          </span>
        )}
        {editing ? (
          <button
            onClick={() => setEditing(false)}
            title="Revenir à la lecture"
            className="text-[10px] text-[var(--color-accent)] border border-[var(--color-accent-border)] rounded px-1.5 py-0.5 bg-[var(--color-accent-bg)] cursor-pointer hover:bg-[var(--color-accent-bg)]/80 transition-colors"
          >
            ✓ Terminé
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Modifier cette fiche sans quitter la vue"
            className="text-[11.5px] font-medium rounded px-2 py-1 cursor-pointer transition-colors"
            style={{
              color: "var(--accent)",
              background: "var(--accent-bg)",
              border: "1px solid var(--accent-border)",
            }}
          >
            ✎ Modifier
          </button>
        )}
        <button
          onClick={onOpenFull}
          title={openFullTitle}
          className="text-[10px] text-text-tertiary border border-white/[0.08] rounded px-1.5 py-0.5 bg-transparent cursor-pointer hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] transition-colors"
        >
          {openFullLabel}
        </button>
      </div>
    </div>
  );

  // ========= Image (identique dans les deux modes) =========
  const image = entry.main_image_url ? (
    entry.category === "univers_monde" ? (
      <div className="w-full rounded-[var(--radius-md)] border border-white/[0.06] bg-bg-primary overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.main_image_url}
          alt=""
          className="w-full h-auto max-h-[45vh] object-contain mx-auto block"
        />
      </div>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.main_image_url}
        alt=""
        className="w-full aspect-video object-cover rounded-[var(--radius-md)] border border-white/[0.06]"
      />
    )
  ) : null;

  // ================== MODE CONSULTATION ==================
  if (!editing) {
    const descText = (entry.description ?? "").trim();
    const notesText = (entry.personal_notes ?? "").trim();
    const hasAnyTemplateData =
      template != null &&
      template.sections.some((s) =>
        s.fields.some((f) => {
          const v = (entry.template_data ?? {})[f.key];
          if (f.type === "quad") {
            const q = (v as Record<string, string>) ?? {};
            return Object.values(q).some((x) => (x ?? "").trim());
          }
          if (f.type === "table") {
            return (
              Array.isArray(v) &&
              (v as unknown[]).some(
                (row) =>
                  Array.isArray(row) &&
                  (row as unknown[]).some(
                    (c) => typeof c === "string" && c.trim(),
                  ),
              )
            );
          }
          return !!((v as string) ?? "").trim();
        }),
      );

    return (
      <div className="flex flex-col gap-4">
        {header}
        {loading && (
          <div className="text-[11px] italic text-text-quaternary">Chargement…</div>
        )}
        {image}

        {/* Titre façon éditorial : eyebrow + titre + sous-titre italique */}
        <div>
          <div
            className="text-[9.5px] font-medium text-text-quaternary uppercase flex items-center gap-1.5"
            style={{ letterSpacing: "0.18em" }}
          >
            <span>{sub?.icon ?? cat?.icon}</span>
            <span>{sub?.label ?? cat?.label}</span>
          </div>
          <h3 className="mt-1.5 text-[17px] leading-tight text-text-primary font-light">
            {entry.title?.trim() ? (
              entry.title
            ) : (
              <span className="italic text-text-quaternary font-serif">Sans titre</span>
            )}
          </h3>
          {entry.subtitle?.trim() && (
            <p className="mt-1 text-[11.5px] text-text-tertiary font-serif italic leading-snug">
              {entry.subtitle}
            </p>
          )}
        </div>

        {/* Description en bloc serif */}
        {descText && (
          <div className="rounded-[var(--radius-md)] bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
            <p className="text-[12px] leading-relaxed text-text-secondary whitespace-pre-wrap font-serif">
              {descText}
            </p>
          </div>
        )}

        {/* Template en lecture soignée */}
        {template ? (
          hasAnyTemplateData ? (
            <DynamicTemplate
              template={template}
              data={entry.template_data ?? {}}
              onChange={() => {}}
              readOnly
            />
          ) : (
            <p className="text-[11.5px] text-text-quaternary font-serif italic">
              Aucun détail renseigné pour cette fiche.
            </p>
          )
        ) : null}

        {/* Notes personnelles — bloc italique avec filet gauche */}
        {notesText && (
          <div className="pl-3 border-l-2 border-[var(--color-accent-border)]">
            <div
              className="text-[9px] font-medium text-text-quaternary uppercase mb-1"
              style={{ letterSpacing: "0.18em" }}
            >
              Notes personnelles
            </div>
            <p className="text-[11.5px] leading-relaxed text-text-secondary whitespace-pre-wrap font-serif italic">
              {notesText}
            </p>
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((t) => (
              <span
                key={t}
                className="text-[9px] px-1.5 py-0.5 bg-[var(--color-accent-bg)] text-[var(--color-accent)] rounded border border-[var(--color-accent-border)]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {linksBlock}
      </div>
    );
  }

  // ================== MODE ÉDITION ==================
  return (
    <div className="flex flex-col gap-3">
      {header}

      {loading && (
        <div className="text-[11px] italic text-text-quaternary">Chargement…</div>
      )}

      {/* Image principale — modifiable quand le projet est connu */}
      {projectId ? (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-1">
            Image principale
          </div>
          <WbMainImage
            entryId={entry.id}
            projectId={projectId}
            value={entry.main_image_url}
            onChange={(url) => onLocalUpdate({ main_image_url: url })}
          />
        </div>
      ) : (
        image
      )}

      {/* En-tête éditable */}
      <div>
        <div className="text-[9px] uppercase tracking-wider text-text-quaternary flex items-center gap-1 mb-1">
          <span>{sub?.icon ?? cat?.icon}</span>
          <span>{sub?.label ?? cat?.label}</span>
        </div>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          placeholder="Titre de la fiche"
          className="w-full bg-transparent border-none outline-none text-[15px] font-semibold text-text-primary leading-tight placeholder:text-text-quaternary focus:bg-white/[0.02] rounded px-1 -mx-1 py-0.5"
        />
        <input
          value={subtitle}
          onChange={(e) => {
            setSubtitle(e.target.value);
            scheduleSave({ subtitle: e.target.value });
          }}
          placeholder="Sous-titre (optionnel)"
          className="w-full bg-transparent border-none outline-none text-[11px] text-text-tertiary italic placeholder:text-text-quaternary focus:bg-white/[0.02] rounded px-1 -mx-1 py-0.5 mt-0.5"
        />
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-1">
          Description
        </div>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            scheduleSave({ description: e.target.value });
          }}
          placeholder="Synopsis court, en une ou deux phrases…"
          rows={3}
          className="w-full text-[11.5px] leading-relaxed px-2 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded resize-none focus:outline-none focus:border-[var(--color-accent-border)] focus:bg-white/[0.03] text-text-secondary placeholder:text-text-quaternary transition-colors"
        />
      </div>

      {template ? (
        <DynamicTemplate
          template={template}
          data={tdata}
          onChange={(next) => {
            setTdata(next);
            scheduleSave({ template_data: next });
          }}
        />
      ) : (
        <div className="text-[11px] italic text-text-quaternary">
          Pas de template pour cette catégorie — édite la description et les notes.
        </div>
      )}

      <div className="border-t border-white/[0.05] pt-3">
        <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-1">
          💬 Notes personnelles
        </div>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            scheduleSave({ personal_notes: e.target.value });
          }}
          placeholder="Pense-bête, pistes, remarques d'auteur…"
          rows={3}
          className="w-full text-[11.5px] leading-relaxed px-2 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded resize-none focus:outline-none focus:border-[var(--color-accent-border)] focus:bg-white/[0.03] text-text-secondary placeholder:text-text-quaternary italic transition-colors"
        />
      </div>

      {/* Statut */}
      {projectId && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-1">
            Statut
          </div>
          <div className="flex flex-wrap gap-1">
            {WB_STATUSES.map((s) => {
              const active = (entry.status ?? "brouillon") === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => scheduleSave({ status: s.key })}
                  className="text-[10.5px] px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                  style={{
                    background: active ? "var(--accent-bg)" : "transparent",
                    border: `1px solid ${active ? "var(--accent-border)" : "var(--border-soft)"}`,
                    color: active ? "var(--accent)" : "var(--text-3)",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags — modifiables quand la liste du projet est connue */}
      {projectTags ? (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-1">
            Tags
          </div>
          <WbTagsEditor
            entryId={entry.id}
            value={entry.tags ?? []}
            onChange={(tags) => onLocalUpdate({ tags })}
            projectTags={projectTags}
            embedded
          />
        </div>
      ) : (
        entry.tags &&
        entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((t) => (
              <span
                key={t}
                className="text-[9px] px-1.5 py-0.5 bg-[var(--color-accent-bg)] text-[var(--color-accent)] rounded border border-[var(--color-accent-border)]"
              >
                #{t}
              </span>
            ))}
          </div>
        )
      )}

      {linksBlock}
    </div>
  );
}
