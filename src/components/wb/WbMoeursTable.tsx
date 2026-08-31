"use client";

import type { WbEntry } from "@/types/database";

// Colonnes du tableau des mœurs : clé de template + libellé humain.
// Les clés correspondent à COUNTRY_TEMPLATE (wb-templates.ts).
const COLUMNS: { key: string; label: string }[] = [
  { key: "gouvernement", label: "Gouvernement" },
  { key: "dirigeant", label: "Dirigeant" },
  { key: "alliances", label: "Alliances" },
  { key: "moeurs", label: "Mœurs" },
  { key: "celebrations", label: "Traditions" },
  { key: "climat", label: "Saisons / Climat" },
  { key: "sanctuaires", label: "Phénomènes magiques" },
];

function truncate(s: string, n = 140) {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

export function WbMoeursTable({
  entries,
  onSelectEntry,
}: {
  entries: WbEntry[];
  onSelectEntry: (id: string) => void;
}) {
  // Ne garde que les fiches Pays non archivées
  const rows = entries.filter(
    (e) =>
      e.category === "univers_monde" &&
      e.subcategory === "pays" &&
      e.status !== "archive"
  );

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-text-tertiary text-[13px]">
        Aucune fiche Pays à comparer.
        <br />
        <span className="text-text-quaternary">
          Créez au moins deux fiches Pays — catégorie Univers &amp; Monde — pour voir leur comparatif ici.
        </span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-bg-secondary">
            <th className="sticky left-0 bg-bg-secondary text-left px-3 py-2 font-semibold text-text-primary border-b border-border min-w-[160px]">
              Pays
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="text-left px-3 py-2 font-semibold text-text-primary border-b border-l border-border min-w-[180px]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr
              key={e.id}
              onClick={() => onSelectEntry(e.id)}
              className="cursor-pointer hover:bg-bg-hover transition-colors"
            >
              <td className="sticky left-0 bg-bg-primary px-3 py-2 border-b border-border align-top">
                <div className="flex items-start gap-2">
                  {e.main_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.main_image_url}
                      alt=""
                      className="w-10 h-10 rounded object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-bg-secondary border border-border flex items-center justify-center text-[16px] flex-shrink-0">
                      🏛️
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-text-primary">
                      {e.title || (
                        <span className="italic text-text-quaternary">Sans titre</span>
                      )}
                    </div>
                    {e.subtitle && (
                      <div className="text-[10px] text-text-tertiary mt-0.5">
                        {e.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              {COLUMNS.map((col) => {
                const raw = e.template_data?.[col.key];
                const value = typeof raw === "string" ? raw.trim() : "";
                return (
                  <td
                    key={col.key}
                    className="px-3 py-2 border-b border-l border-border align-top text-text-secondary leading-snug"
                  >
                    {value ? (
                      truncate(value)
                    ) : (
                      <span className="text-text-quaternary italic">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
