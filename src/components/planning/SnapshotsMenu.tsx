"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ChapterData,
  CustomColumn,
  CellValue,
} from "@/app/(app)/planning/[novelId]/planning-client";

/**
 * Versions du tableau de planification.
 *
 * « Sauvegarder une version » fige l'état complet du chapitrage
 * (chapitres + colonnes custom + valeurs + couleurs + préférences)
 * dans planning_snapshots. On peut consulter une version en lecture
 * seule, la restaurer (un snapshot de sécurité de l'état courant est
 * créé automatiquement avant), ou la supprimer.
 *
 * Restauration — règles :
 * - Les chapitres existants (même id) sont remis à l'état snapshoté.
 * - Les chapitres supprimés depuis sont recréés (champs de planif
 *   seulement — le texte écrit dans la Rédaction n'est pas ressuscité).
 * - Les chapitres créés depuis le snapshot ne sont PAS supprimés (ils
 *   peuvent contenir du texte) : ils passent en fin de tableau.
 * - Les colonnes custom et leurs valeurs sont remises à l'état snapshoté.
 */

interface SnapshotData {
  chapters: ChapterData[];
  customColumns: CustomColumn[];
  cellValues: Pick<CellValue, "column_id" | "chapter_id" | "value" | "color">[];
  columnOrder: string[] | null;
  columnColors: Record<string, string>;
  columnWidths: Record<string, number>;
}

interface SnapshotRow {
  id: string;
  name: string;
  auto: boolean;
  created_at: string;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SnapshotsMenu({
  novelId,
  chapters,
  customColumns,
  cellValues,
  columnOrder,
  columnColors,
  columnWidths,
}: {
  novelId: string;
  chapters: ChapterData[];
  customColumns: CustomColumn[];
  cellValues: CellValue[];
  columnOrder: string[] | null;
  columnColors: Record<string, string>;
  columnWidths: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SnapshotRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // id en cours de restauration/suppression
  const [viewing, setViewing] = useState<{ name: string; data: SnapshotData } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<SnapshotRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("planning_snapshots")
        .select("id, name, auto, created_at")
        .eq("novel_id", novelId)
        .order("created_at", { ascending: false });
      if (!cancelled) setList((data ?? []) as SnapshotRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, novelId]);

  function currentData(): SnapshotData {
    return {
      chapters,
      customColumns,
      cellValues: cellValues.map(({ column_id, chapter_id, value, color }) => ({
        column_id,
        chapter_id,
        value,
        color: color ?? null,
      })),
      columnOrder,
      columnColors,
      columnWidths,
    };
  }

  async function saveSnapshot(name: string, auto = false): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error: e } = await supabase.from("planning_snapshots").insert({
      novel_id: novelId,
      user_id: user.id,
      name,
      auto,
      data: currentData(),
    });
    return !e;
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const name =
      newName.trim() ||
      `Version du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`;
    const ok = await saveSnapshot(name);
    if (ok) {
      setNewName("");
      // Recharge la liste
      const supabase = createClient();
      const { data } = await supabase
        .from("planning_snapshots")
        .select("id, name, auto, created_at")
        .eq("novel_id", novelId)
        .order("created_at", { ascending: false });
      setList((data ?? []) as SnapshotRow[]);
    } else {
      setError("La sauvegarde a échoué. La table planning_snapshots existe-t-elle ? (migration à exécuter)");
    }
    setSaving(false);
  }

  async function fetchSnapshotData(id: string): Promise<SnapshotData | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from("planning_snapshots")
      .select("data")
      .eq("id", id)
      .single();
    return (data?.data as SnapshotData) ?? null;
  }

  async function handleView(snap: SnapshotRow) {
    setBusy(snap.id);
    const data = await fetchSnapshotData(snap.id);
    setBusy(null);
    if (data) setViewing({ name: snap.name, data });
  }

  async function handleDelete(snap: SnapshotRow) {
    setBusy(snap.id);
    const supabase = createClient();
    await supabase.from("planning_snapshots").delete().eq("id", snap.id);
    setList((prev) => (prev ?? []).filter((s) => s.id !== snap.id));
    setBusy(null);
  }

  async function handleRestore(snap: SnapshotRow) {
    setBusy(snap.id);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("non connectée");

      const snapData = await fetchSnapshotData(snap.id);
      if (!snapData) throw new Error("snapshot introuvable");

      // 0. Snapshot de sécurité de l'état courant
      await saveSnapshot(
        `Avant restauration de « ${snap.name} »`,
        true,
      );

      const currentIds = new Set(chapters.map((c) => c.id));
      const snapChapters = snapData.chapters ?? [];

      // 1. Chapitres : update les existants, recrée les manquants
      const chapterIdMap = new Map<string, string>(); // id snapshot → id réel
      for (const sc of snapChapters) {
        const fields = {
          title: sc.title,
          position: sc.position,
          status: sc.status,
          synopsis: sc.synopsis,
          themes: sc.themes ?? [],
          plot_elements: sc.plot_elements,
          minor_elements: sc.minor_elements,
          observations: sc.observations,
          tension_indices: sc.tension_indices,
          pivot: sc.pivot,
          narrative_knot: sc.narrative_knot,
          row_color: sc.row_color ?? null,
          cell_colors: sc.cell_colors ?? {},
        };
        if (currentIds.has(sc.id)) {
          await supabase.from("chapters").update(fields).eq("id", sc.id);
          chapterIdMap.set(sc.id, sc.id);
        } else {
          const { data: created } = await supabase
            .from("chapters")
            .insert({ ...fields, novel_id: novelId, user_id: user.id })
            .select("id")
            .single();
          if (created) chapterIdMap.set(sc.id, created.id);
        }
      }

      // Les chapitres créés depuis le snapshot passent en fin de tableau
      const snapIds = new Set(snapChapters.map((c) => c.id));
      const extra = chapters.filter((c) => !snapIds.has(c.id));
      let tailPos = snapChapters.reduce((m, c) => Math.max(m, c.position), -1);
      for (const c of extra) {
        tailPos += 1;
        await supabase.from("chapters").update({ position: tailPos }).eq("id", c.id);
      }

      // 2. Colonnes custom : update les existantes, recrée les manquantes
      const currentColIds = new Set(customColumns.map((c) => c.id));
      const colIdMap = new Map<string, string>();
      for (const scol of snapData.customColumns ?? []) {
        if (currentColIds.has(scol.id)) {
          await supabase
            .from("planning_columns")
            .update({ name: scol.name, position: scol.position })
            .eq("id", scol.id);
          colIdMap.set(scol.id, scol.id);
        } else {
          const { data: created } = await supabase
            .from("planning_columns")
            .insert({
              novel_id: novelId,
              user_id: user.id,
              name: scol.name,
              position: scol.position,
            })
            .select("id")
            .single();
          if (created) colIdMap.set(scol.id, created.id);
        }
      }

      // 3. Valeurs de cases : purge des colonnes restaurées, puis réinsertion
      const restoredColIds = [...colIdMap.values()];
      if (restoredColIds.length > 0) {
        await supabase
          .from("planning_cell_values")
          .delete()
          .in("column_id", restoredColIds);
      }
      const cellPayloads = (snapData.cellValues ?? [])
        .map((cv) => {
          const columnId = colIdMap.get(cv.column_id);
          const chapterId = chapterIdMap.get(cv.chapter_id);
          if (!columnId || !chapterId) return null;
          return {
            column_id: columnId,
            chapter_id: chapterId,
            user_id: user.id,
            value: cv.value ?? "",
            color: cv.color ?? null,
          };
        })
        .filter(Boolean) as {
        column_id: string;
        chapter_id: string;
        user_id: string;
        value: string;
        color: string | null;
      }[];
      if (cellPayloads.length > 0) {
        await supabase
          .from("planning_cell_values")
          .upsert(cellPayloads, { onConflict: "column_id,chapter_id" });
      }

      // 4. Préférences d'affichage
      await supabase
        .from("novels")
        .update({
          column_order: snapData.columnOrder ?? null,
          column_colors: snapData.columnColors ?? {},
          column_widths: snapData.columnWidths ?? {},
        })
        .eq("id", novelId);

      // 5. Recharge tout depuis le serveur — plus simple et plus sûr que
      // de resynchroniser l'état client morceau par morceau.
      window.location.reload();
    } catch (e) {
      setError(
        `La restauration a échoué (${e instanceof Error ? e.message : "erreur inconnue"}). Un snapshot de sécurité a été créé avant toute modification.`,
      );
      setBusy(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Versions du tableau : sauvegarder, consulter, restaurer"
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.08] text-[12.5px] text-text-secondary hover:text-text-primary hover:border-white/[0.15] cursor-pointer transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7 4.2V7L8.8 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Versions
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-[65] w-[340px] rounded-[var(--radius-lg)] border border-white/[0.10] bg-bg-secondary shadow-2xl overflow-hidden">
            {/* Sauvegarde */}
            <div className="px-3.5 py-3 border-b border-white/[0.06]">
              <div className="text-[11px] font-medium text-text-quaternary uppercase mb-2" style={{ letterSpacing: "0.14em" }}>
                Sauvegarder une version
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Nom (facultatif)…"
                  className="flex-1 h-8 px-2.5 rounded bg-bg-primary border border-white/[0.10] text-[12.5px] text-text-primary placeholder:text-text-quaternary"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-3 rounded text-[12px] font-medium cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast, #1a1408)" }}
                >
                  {saving ? "…" : "Figer"}
                </button>
              </div>
            </div>

            {/* Liste */}
            <div className="max-h-[300px] overflow-y-auto">
              {list === null ? (
                <div className="px-3.5 py-4 text-[12px] text-text-quaternary">Chargement…</div>
              ) : list.length === 0 ? (
                <div className="px-3.5 py-4 text-[12px] text-text-quaternary">
                  Aucune version sauvegardée pour l&apos;instant.
                </div>
              ) : (
                list.map((s) => (
                  <div
                    key={s.id}
                    className="px-3.5 py-2.5 border-b border-white/[0.04] last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-text-primary truncate" title={s.name}>
                          {s.auto && (
                            <span className="text-[10px] text-text-quaternary mr-1.5 uppercase">auto</span>
                          )}
                          {s.name}
                        </div>
                        <div className="text-[11px] text-text-quaternary">{fmtDate(s.created_at)}</div>
                      </div>
                      <button
                        onClick={() => handleView(s)}
                        disabled={busy === s.id}
                        title="Consulter (lecture seule)" aria-label="Consulter (lecture seule)"
                        className="rd-icon-btn"
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M1.5 7C3 4.2 5 2.8 7 2.8C9 2.8 11 4.2 12.5 7C11 9.8 9 11.2 7 11.2C5 11.2 3 9.8 1.5 7Z" stroke="currentColor" strokeWidth="1.1" />
                          <circle cx="7" cy="7" r="1.7" stroke="currentColor" strokeWidth="1.1" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmRestore(s)}
                        disabled={busy === s.id}
                        title="Restaurer cette version" aria-label="Restaurer cette version"
                        className="rd-icon-btn"
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 5.5A5 5 0 1 1 2 8.5M2.5 2.5v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={busy === s.id}
                        title="Supprimer cette version" aria-label="Supprimer cette version"
                        className="rd-icon-btn"
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M3 4H11M5.5 4V3H8.5V4M4 4L4.5 11.5H9.5L10 4M6 6V9.5M8 6V9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {error && (
              <div className="px-3.5 py-2.5 text-[11.5px] border-t border-white/[0.06]" style={{ color: "var(--danger)" }}>
                {error}
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation restauration */}
      {confirmRestore && (
        <>
          <div className="fixed inset-0 z-[85] bg-black/50" onClick={() => setConfirmRestore(null)} />
          <div className="fixed z-[90] inset-x-0 top-[26vh] mx-auto w-[min(460px,92vw)] rounded-[var(--radius-lg)] border border-white/[0.10] bg-bg-secondary shadow-2xl p-5">
            <div className="text-[14px] font-medium text-text-primary mb-2">
              Restaurer « {confirmRestore.name} » ?
            </div>
            <div className="text-[12.5px] text-text-tertiary leading-relaxed mb-4">
              Le tableau reprendra l&apos;état de cette version. Une sauvegarde
              automatique de l&apos;état actuel sera créée juste avant — tu ne
              perds rien. Les chapitres créés depuis cette version ne sont pas
              supprimés (ils passent en fin de tableau).
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRestore(null)}
                className="h-9 px-4 rounded-[var(--radius-md)] text-[12.5px] text-text-secondary bg-bg-primary border border-white/[0.08] hover:border-white/[0.15] cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const s = confirmRestore;
                  setConfirmRestore(null);
                  handleRestore(s);
                }}
                className="h-9 px-4 rounded-[var(--radius-md)] text-[12.5px] font-medium cursor-pointer"
                style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast, #1a1408)" }}
              >
                Restaurer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Vue lecture seule */}
      {viewing && (
        <>
          <div className="fixed inset-0 z-[85] bg-black/50" onClick={() => setViewing(null)} />
          <div className="fixed z-[90] inset-x-0 top-[6vh] mx-auto w-[min(1000px,94vw)] max-h-[88vh] flex flex-col rounded-[var(--radius-lg)] border border-white/[0.10] bg-bg-secondary shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] shrink-0">
              <div>
                <div className="text-[14px] font-medium text-text-primary">{viewing.name}</div>
                <div className="text-[11.5px] text-text-tertiary mt-0.5">Lecture seule</div>
              </div>
              <button onClick={() => setViewing(null)} className="rd-icon-btn" title="Fermer" aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4">
              <SnapshotPreview data={viewing.data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* Aperçu simplifié en lecture seule d'un snapshot. */
function SnapshotPreview({ data }: { data: SnapshotData }) {
  const chapters = [...(data.chapters ?? [])].sort((a, b) => a.position - b.position);
  const customSorted = [...(data.customColumns ?? [])].sort((a, b) => a.position - b.position);
  const cellIndex = new Map<string, string>();
  for (const cv of data.cellValues ?? []) {
    cellIndex.set(`${cv.column_id}::${cv.chapter_id}`, cv.value ?? "");
  }

  const defaultCols: { label: string; get: (c: ChapterData) => string }[] = [
    { label: "Chapitre", get: (c) => c.title ?? "" },
    { label: "Thème", get: (c) => (c.themes ?? []).join(" · ") },
    { label: "Résumé", get: (c) => c.synopsis ?? "" },
    { label: "Intrigue globale", get: (c) => c.plot_elements ?? "" },
    { label: "Mineurs/ambiances", get: (c) => c.minor_elements ?? "" },
    { label: "Observations", get: (c) => c.observations ?? "" },
    { label: "Tension", get: (c) => c.tension_indices ?? "" },
    { label: "Bascule", get: (c) => c.pivot ?? "" },
    { label: "Nœud", get: (c) => c.narrative_knot ?? "" },
  ];

  return (
    <table className="w-full text-[11.5px] border-collapse">
      <thead>
        <tr className="bg-bg-tertiary">
          {defaultCols.map((c) => (
            <th key={c.label} className="px-2 py-1.5 text-left font-medium text-text-secondary whitespace-nowrap">
              {c.label}
            </th>
          ))}
          {customSorted.map((c) => (
            <th key={c.id} className="px-2 py-1.5 text-left font-medium text-text-secondary whitespace-nowrap">
              {c.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {chapters.map((ch) => (
          <tr key={ch.id} className="border-t border-white/[0.05] align-top">
            {defaultCols.map((c) => (
              <td
                key={c.label}
                className="px-2 py-1.5 text-text-secondary max-w-[240px]"
                dangerouslySetInnerHTML={{ __html: c.get(ch) }}
              />
            ))}
            {customSorted.map((col) => (
              <td
                key={col.id}
                className="px-2 py-1.5 text-text-secondary max-w-[240px]"
                dangerouslySetInnerHTML={{ __html: cellIndex.get(`${col.id}::${ch.id}`) ?? "" }}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
