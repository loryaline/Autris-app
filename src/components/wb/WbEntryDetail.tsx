"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WbEntry, WbStatus } from "@/types/database";
import { WB_STATUSES } from "@/lib/wb-constants";
import { getTemplate } from "@/lib/wb-templates";
import { DynamicTemplate } from "./DynamicTemplate";

export function WbEntryDetail({
  entry,
  onUpdate,
  onDelete,
  onClose,
}: {
  entry: WbEntry;
  onUpdate: (entry: WbEntry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<WbEntry>(entry);
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setLocal(entry);
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
    <div className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <input
            value={local.title}
            onChange={(e) => scheduleSave({ ...local, title: e.target.value })}
            className="flex-1 text-[22px] font-semibold bg-transparent border-none focus:outline-none text-text-primary"
            placeholder="Titre de la fiche"
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
          className="w-full text-[13px] text-text-secondary bg-transparent border-none focus:outline-none mb-5"
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
      </div>
    </div>
  );
}
