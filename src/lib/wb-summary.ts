// Résumé condensé du contenu d'une fiche WB pour l'affichage des vignettes

import type { WbEntry } from "@/types/database";
import { getTemplate } from "./wb-templates";

export interface EntrySnippet {
  label: string;
  value: string;
}

const MAX_SNIPPETS = 3;
const MAX_VALUE_LEN = 100;

function truncate(s: string, n = MAX_VALUE_LEN): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

/**
 * Extrait les premiers champs remplis d'une fiche pour aperçu compact.
 * - Si un template existe : parcourt les sections dans l'ordre et prend
 *   les premiers champs textuels non vides.
 * - Sinon : fallback sur la description libre.
 */
export function summarizeEntry(entry: WbEntry): EntrySnippet[] {
  const snippets: EntrySnippet[] = [];
  const tpl = getTemplate(entry.category, entry.subcategory);

  if (tpl) {
    outer: for (const section of tpl.sections) {
      for (const field of section.fields) {
        if (field.type === "quad") continue;
        const raw = entry.template_data?.[field.key];
        if (typeof raw === "string" && raw.trim()) {
          snippets.push({
            label: field.label?.trim() || section.group,
            value: truncate(raw),
          });
          if (snippets.length >= MAX_SNIPPETS) break outer;
        }
      }
    }
  }

  if (snippets.length === 0 && entry.description?.trim()) {
    snippets.push({ label: "Description", value: truncate(entry.description) });
  }

  return snippets;
}
