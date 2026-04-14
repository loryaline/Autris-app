"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WbEntry, WbLink, WbStatus } from "@/types/database";
import { WB_STATUSES } from "@/lib/wb-constants";
import { getTemplate } from "@/lib/wb-templates";
import { DynamicTemplate } from "./DynamicTemplate";
import { WbMainImage } from "./WbMainImage";
import { WbGallery } from "./WbGallery";
import { WbTagsEditor } from "./WbTagsEditor";
import { WbLinksEditor } from "./WbLinksEditor";

export function WbEntryDetail({
  entry,
  projectId,
  allEntries,
  projectTags,
  entryLinks,
  onSelectEntry,
  onLinkAdded,
  onLinkRemoved,
  onUpdate,
  onDelete,
  onClose,
}: {
  entry: WbEntry;
  projectId: string;
  allEntries: WbEntry[];
  projectTags: string[];
  entryLinks: WbLink[];
  onSelectEntry: (id: string) => void;
  onLinkAdded: (link: WbLink) => void;
  onLinkRemoved: (id: string) => void;
  onUpdate: (entry: WbEntry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<WbEntry>(entry);
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setLocal(entry);
    // Remonte en haut à chaque changement de fiche pour que le lecteur
    // voie bien qu'il a navigué vers une autre entrée
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // Auto-focus le champ titre si la fiche n'a pas encore de nom
    if (!entry.title?.trim()) {
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
  }, [entry]);

  function scheduleSave(next: WbEntry) {
    setLocal(next);
    onUpdate(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await supabase
        .from("wb_entries")
        .update({
          title: next.title,
          subtitle: next.subtitle,
          description: next.description,
          template_data: next.template_data,
          personal_notes: next.personal_notes,
          status: next.status,
        })
        .eq("id", next.id);
      setSaving(false);
    }, 800);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement "${local.title}" ?`)) return;
    await supabase.from("wb_entries").delete().eq("id", local.id);
    onDelete(local.id);
  }

  const template = getTemplate(local.category, local.subcategory);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <input
            ref={titleInputRef}
            value={local.title}
            onChange={(e) => scheduleSave({ ...local, title: e.target.value })}
            className="flex-1 text-[22px] font-semibold bg-transparent border-none focus:outline-none text-text-primary placeholder:text-text-quaternary placeholder:italic"
            placeholder="Nomme cette fiche…"
          />
          <div className="flex items-center gap-2">
            {saving && <span className="text-[11px] text-text-quaternary">Sauvegarde...</span>}
            <select
              value={local.status}
              onChange={(e) => scheduleSave({ ...local, status: e.target.value as WbStatus })}
              className="text-[11px] px-2 py-1 bg-bg-secondary border border-border rounded cursor-pointer"
            >
              {WB_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleDelete}
              className="text-[11px] px-2 py-1 text-text-tertiary hover:text-red-500 cursor-pointer"
              title="Supprimer"
            >
              🗑
            </button>
            <button
              onClick={onClose}
              className="text-[16px] text-text-tertiary hover:text-text-primary cursor-pointer leading-none"
              title="Fermer"
            >
              ×
            </button>
          </div>
        </div>

        <input
          value={local.subtitle ?? ""}
          onChange={(e) => scheduleSave({ ...local, subtitle: e.target.value })}
          placeholder="Sous-titre / surnom (optionnel)"
          className="w-full text-[13px] text-text-secondary bg-transparent border-none focus:outline-none mb-3"
        />

        {/* Image principale */}
        <WbMainImage
          entryId={local.id}
          projectId={projectId}
          value={local.main_image_url}
          onChange={(url) => {
            const next = { ...local, main_image_url: url };
            setLocal(next);
            onUpdate(next);
          }}
        />

        {/* Template fields */}
        {template ? (
          <DynamicTemplate
            template={template}
            data={local.template_data ?? {}}
            onChange={(data) => scheduleSave({ ...local, template_data: data })}
          />
        ) : (
          <div>
            <label className="block text-[11px] text-text-tertiary mb-1">Description</label>
            <textarea
              value={local.description}
              onChange={(e) => scheduleSave({ ...local, description: e.target.value })}
              rows={10}
              placeholder="Décris cette fiche..."
              className="w-full text-[13px] px-3 py-2 bg-bg-secondary border border-border rounded resize-none focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Notes personnelles */}
        <div className="mt-6 border-t border-border pt-4">
          <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
            💬 Notes personnelles (hors worldbuilding)
          </label>
          <textarea
            value={local.personal_notes}
            onChange={(e) => scheduleSave({ ...local, personal_notes: e.target.value })}
            rows={4}
            placeholder="Idées narratives, scènes à écrire, intrigues potentielles..."
            className="w-full text-[12.5px] px-3 py-2 bg-bg-secondary border border-border rounded resize-none focus:outline-none focus:border-primary"
          />
        </div>

        {/* Tags */}
        <WbTagsEditor
          entryId={local.id}
          value={local.tags}
          onChange={(tags) => {
            const next = { ...local, tags };
            setLocal(next);
            onUpdate(next);
          }}
          projectTags={projectTags}
        />

        {/* Liens bidirectionnels */}
        <WbLinksEditor
          entry={local}
          allEntries={allEntries}
          links={entryLinks}
          onSelectEntry={onSelectEntry}
          onLinkAdded={onLinkAdded}
          onLinkRemoved={onLinkRemoved}
        />

        {/* Galerie secondaire */}
        <WbGallery
          entryId={local.id}
          projectId={projectId}
          value={local.gallery}
          onChange={(gallery) => {
            const next = { ...local, gallery };
            setLocal(next);
            onUpdate(next);
          }}
        />
      </div>
    </div>
  );
}
