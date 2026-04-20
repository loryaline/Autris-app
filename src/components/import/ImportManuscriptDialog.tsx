"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  parseManuscript,
  type ParsedChapter,
} from "@/lib/import/parseManuscript";

interface Props {
  novelId: string;
  novelTitle: string;
  existingChapterCount: number;
  onClose: () => void;
}

export function ImportManuscriptDialog({
  novelId,
  novelTitle,
  existingChapterCount,
  onClose,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ParsedChapter[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setParsing(true);
    try {
      const result = await parseManuscript(file);
      setChapters(result.chapters);
      setFileName(file.name);
    } catch (e) {
      console.error("[import manuscript] parse failed", e);
      setError(
        (e instanceof Error ? e.message : "Erreur de lecture du fichier.") +
          " Regardez la console du navigateur pour plus de détails."
      );
    } finally {
      setParsing(false);
    }
  }

  function updateChapterTitle(idx: number, title: string) {
    setChapters((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, title } : c))
    );
  }

  function removeChapter(idx: number) {
    setChapters((prev) => prev.filter((_, i) => i !== idx));
  }

  function mergeIntoPrevious(idx: number) {
    if (idx === 0) return;
    setChapters((prev) => {
      const next = [...prev];
      const cur = next[idx];
      const prevCh = next[idx - 1];
      const mergedHtml = `${prevCh.contentHtml}<p><strong>${escape(
        cur.title
      )}</strong></p>${cur.contentHtml}`;
      const mergedPlain = `${prevCh.plainText}\n\n${cur.title}\n\n${cur.plainText}`;
      next[idx - 1] = {
        title: prevCh.title,
        contentHtml: mergedHtml,
        plainText: mergedPlain,
        wordCount: prevCh.wordCount + cur.wordCount,
      };
      next.splice(idx, 1);
      return next;
    });
  }

  async function handleConfirm() {
    setImporting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expirée.");
      setImporting(false);
      return;
    }

    const rows = chapters.map((c, i) => ({
      novel_id: novelId,
      user_id: user.id,
      title: c.title,
      content: c.contentHtml,
      word_count: c.wordCount,
      position: existingChapterCount + i,
    }));

    const { error: insertErr } = await supabase.from("chapters").insert(rows);
    if (insertErr) {
      setError("Import échoué : " + insertErr.message);
      setImporting(false);
      return;
    }

    // Met à jour le total de mots du roman
    const addedWords = chapters.reduce((s, c) => s + c.wordCount, 0);
    const { data: novelRow } = await supabase
      .from("novels")
      .select("current_words")
      .eq("id", novelId)
      .single();
    if (novelRow) {
      await supabase
        .from("novels")
        .update({ current_words: (novelRow.current_words ?? 0) + addedWords })
        .eq("id", novelId);
    }

    setImporting(false);
    router.refresh();
    onClose();
  }

  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary rounded-[var(--radius-md)] border border-border w-full max-w-[640px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h3 className="text-[15px] font-medium text-text-primary">
            Importer un manuscrit
          </h3>
          <p className="text-[12px] text-text-tertiary mt-0.5">
            Roman : {novelTitle}
            {existingChapterCount > 0 && (
              <>
                {" · "}
                <span className="text-amber">
                  {existingChapterCount} chapitre
                  {existingChapterCount > 1 ? "s" : ""} déjà présent
                  {existingChapterCount > 1 ? "s" : ""}. Les nouveaux seront
                  ajoutés à la suite.
                </span>
              </>
            )}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {chapters.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="text-[13px] text-text-tertiary text-center max-w-[420px]">
                Déposez un fichier <strong>.docx</strong> ou <strong>.pdf</strong>.
                Les chapitres seront détectés à partir des titres (Titre 1/2/3
                dans Word, ou lignes « Chapitre N » dans un PDF).
              </div>
              <div className="text-[11px] text-text-quaternary text-center max-w-[420px]">
                Pour un Google Doc : Fichier → Télécharger → Microsoft Word (.docx).
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // Reset pour permettre de re-choisir le même fichier après une erreur
                  e.target.value = "";
                  if (f) handleFile(f);
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
              >
                {parsing ? "Analyse…" : "Choisir un fichier"}
              </Button>
              {error && (
                <div className="text-[12px] text-red-600 text-center max-w-[420px]">
                  {error}
                </div>
              )}
            </div>
          )}

          {chapters.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[12px] text-text-tertiary">
                  <span className="text-text-primary font-medium">
                    {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}
                  </span>{" "}
                  détecté{chapters.length > 1 ? "s" : ""} dans{" "}
                  <span className="text-text-primary">{fileName}</span> ·{" "}
                  {totalWords.toLocaleString("fr-FR")} mots
                </div>
                <button
                  className="text-[11px] text-text-tertiary hover:text-text-primary underline"
                  onClick={() => {
                    setChapters([]);
                    setFileName(null);
                  }}
                >
                  Recommencer
                </button>
              </div>

              <div className="space-y-1.5">
                {chapters.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 border border-border rounded-[var(--radius-sm)] bg-bg-tertiary"
                  >
                    <span className="text-[11px] text-text-quaternary w-6 text-right">
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      value={c.title}
                      onChange={(e) => updateChapterTitle(i, e.target.value)}
                      className="flex-1 h-7 px-2 text-[13px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary focus:outline-none focus:border-primary-border"
                    />
                    <span className="text-[11px] text-text-tertiary w-20 text-right">
                      {c.wordCount.toLocaleString("fr-FR")} mots
                    </span>
                    {i > 0 && (
                      <button
                        onClick={() => mergeIntoPrevious(i)}
                        title="Fusionner avec le chapitre précédent"
                        className="text-[11px] text-text-tertiary hover:text-text-primary px-1"
                      >
                        ↑
                      </button>
                    )}
                    <button
                      onClick={() => removeChapter(i)}
                      title="Supprimer"
                      className="text-[11px] text-text-tertiary hover:text-red-600 px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-3 text-[12px] text-red-600">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={importing}>
            Annuler
          </Button>
          {chapters.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={importing || chapters.length === 0}
            >
              {importing
                ? "Import en cours…"
                : `Importer ${chapters.length} chapitre${chapters.length > 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
