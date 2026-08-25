"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { appConfirm } from "@/lib/app-confirm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ImportManuscriptDialog } from "@/components/import/ImportManuscriptDialog";
import { GENRES } from "@/lib/constants";
import type { Genre } from "@/types/database";

interface NovelData {
  id: string;
  title: string;
  current_words: number;
  word_goal: number | null;
  is_active: boolean;
  words_per_session: number | null;
  sessions_per_week: number | null;
  chapter_count: number;
}

interface ProjectData {
  id: string;
  title: string;
  genre: string;
  created_at: string;
  cover_image_url: string | null;
  novels: NovelData[];
}

export function ProjectSettings({ project }: { project: ProjectData }) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [genre, setGenre] = useState<Genre>(project.genre as Genre);
  const [novels, setNovels] = useState(project.novels);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(project.cover_image_url);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddNovel, setShowAddNovel] = useState(false);
  const [newNovelTitle, setNewNovelTitle] = useState("");
  const [addingNovel, setAddingNovel] = useState(false);

  async function handleSaveProject() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("projects")
      .update({ title: title.trim(), genre })
      .eq("id", project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function handleSaveNovel(
    novelId: string,
    updates: {
      title?: string;
      word_goal?: number | null;
      words_per_session?: number | null;
      sessions_per_week?: number | null;
    }
  ) {
    const supabase = createClient();
    await supabase.from("novels").update(updates).eq("id", novelId);

    setNovels((prev) =>
      prev.map((n) => (n.id === novelId ? { ...n, ...updates } : n))
    );
    router.refresh();
  }

  async function handleActivateNovel(novelId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Lire le current_words du roman pour figer le mot-base d'activation
    const target = novels.find((n) => n.id === novelId);
    const baseWords = target?.current_words ?? 0;
    const nowIso = new Date().toISOString();

    // Désactiver tous les romans de l'utilisateur, puis activer celui-ci
    // avec activated_at + activation_word_count fraîchement posés.
    await supabase.from("novels").update({ is_active: false }).eq("user_id", user.id);
    await supabase
      .from("novels")
      .update({
        is_active: true,
        activated_at: nowIso,
        activation_word_count: baseWords,
      })
      .eq("id", novelId);

    setNovels((prev) =>
      prev.map((n) => ({ ...n, is_active: n.id === novelId }))
    );
    router.refresh();
  }

  async function handleAddNovel(e: React.FormEvent) {
    e.preventDefault();
    if (!newNovelTitle.trim()) return;
    setAddingNovel(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: novel, error: novelError } = await supabase
      .from("novels")
      .insert({
        project_id: project.id,
        user_id: user.id,
        title: newNovelTitle.trim(),
      })
      .select()
      .single();

    if (novelError) {
      setAddingNovel(false);
      return;
    }

    // Create first chapter
    await supabase
      .from("chapters")
      .insert({
        novel_id: novel.id,
        user_id: user.id,
        title: "Chapitre 1",
        position: 0,
      });

    setNovels((prev) => [...prev, { ...novel, current_words: 0, word_goal: null }]);
    setNewNovelTitle("");
    setShowAddNovel(false);
    setAddingNovel(false);
    router.refresh();
  }

  async function handleUploadCover(file: File) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploadingCover(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/projects/${project.id}/cover-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("wb-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { setUploadingCover(false); return; }
    const { data: pub } = supabase.storage.from("wb-images").getPublicUrl(path);
    if (coverImageUrl) {
      const marker = "/wb-images/";
      const idx = coverImageUrl.indexOf(marker);
      if (idx >= 0) await supabase.storage.from("wb-images").remove([coverImageUrl.slice(idx + marker.length)]);
    }
    await supabase.from("projects").update({ cover_image_url: pub.publicUrl }).eq("id", project.id);
    setCoverImageUrl(pub.publicUrl);
    setUploadingCover(false);
  }

  async function handleRemoveCover() {
    if (!coverImageUrl) return;
    if (!(await appConfirm("Retirer l'image de couverture ?", { confirmLabel: "Retirer" }))) return;
    const supabase = createClient();
    const marker = "/wb-images/";
    const idx = coverImageUrl.indexOf(marker);
    if (idx >= 0) await supabase.storage.from("wb-images").remove([coverImageUrl.slice(idx + marker.length)]);
    await supabase.from("projects").update({ cover_image_url: null }).eq("id", project.id);
    setCoverImageUrl(null);
  }

  async function handleDeleteProject() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", project.id);
    router.push("/");
  }

  const genreInfo = GENRES.find((g) => g.value === genre);

  return (
    <div className="max-w-[600px] mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <a
          href="/"
          className="text-text-tertiary hover:text-primary transition-colors"
          title="Retour au dashboard"
        >
          <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        <div>
          <h1 className="text-[18px] font-semibold text-text-primary">{project.title}</h1>
          <div className="text-[13px] text-text-tertiary">Paramètres du projet</div>
        </div>
      </div>

      {/* Project settings */}
      <Card className="p-4 mb-4">
        <h2 className="text-[15px] font-medium text-text-primary mb-3">Projet</h2>

        {/* Cover image */}
        <div className="mb-4">
          <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
            Image de couverture
          </label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadCover(f);
              if (coverInputRef.current) coverInputRef.current.value = "";
            }}
          />
          {coverImageUrl ? (
            <div className="relative group rounded-[var(--radius-sm)] overflow-hidden border border-border">
              <Image
                src={coverImageUrl}
                alt="Couverture"
                width={600}
                height={200}
                className="w-full h-[120px] object-cover"
                unoptimized
              />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="text-[11px] px-2 py-1 bg-bg-primary/90 border border-border rounded hover:border-primary cursor-pointer disabled:opacity-50"
                >
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={uploadingCover}
                  className="text-[11px] px-2 py-1 bg-bg-primary/90 border border-border rounded hover:text-red cursor-pointer disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="w-full py-5 border border-dashed border-border rounded-[var(--radius-sm)] text-[12px] text-text-tertiary hover:border-primary hover:text-primary cursor-pointer disabled:opacity-50 transition-colors"
            >
              {uploadingCover ? "Upload en cours…" : "+ Ajouter une image de couverture"}
            </button>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
            Titre
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-9 px-3 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
            Genre
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGenre(g.value)}
                className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-[var(--radius-sm)] border text-[12px] whitespace-nowrap cursor-pointer transition-colors ${
                  genre === g.value
                    ? "bg-primary-bg border-primary-border text-primary-dark font-medium"
                    : "bg-bg-primary border-border text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <span>{g.emoji}</span>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveProject}
            disabled={saving || !title.trim()}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {saved && (
            <span className="text-[12px] text-teal-dark">Sauvegardé</span>
          )}
        </div>
      </Card>

      {/* Novels */}
      {novels.map((novel) => (
        <NovelSettings
          key={novel.id}
          novel={novel}
          onSave={(updates) => handleSaveNovel(novel.id, updates)}
          onActivate={() => handleActivateNovel(novel.id)}
        />
      ))}

      {/* Add novel */}
      {showAddNovel ? (
        <Card className="p-4 mb-3">
          <h2 className="text-[15px] font-medium text-text-primary mb-3">Nouveau roman</h2>
          <form onSubmit={handleAddNovel}>
            <div className="mb-3">
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Titre du roman
              </label>
              <input
                type="text"
                value={newNovelTitle}
                onChange={(e) => setNewNovelTitle(e.target.value)}
                placeholder="Ex : Tome 2 — L'Éveil des Ombres"
                required
                autoFocus
                className="w-full h-9 px-3 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowAddNovel(false); setNewNovelTitle(""); }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={addingNovel || !newNovelTitle.trim()}
              >
                {addingNovel ? "Création…" : "Créer le roman"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <button
          onClick={() => setShowAddNovel(true)}
          className="w-full mb-3 py-2.5 border border-dashed border-border rounded-[var(--radius-md)] text-[13px] text-text-tertiary hover:text-primary hover:border-primary-border cursor-pointer transition-colors"
        >
          + Nouveau roman
        </button>
      )}

      {/* Danger zone */}
      <Card className="p-4 mt-4 border-red/20">
        <h2 className="text-[15px] font-medium text-red mb-2">Zone dangereuse</h2>
        {showDeleteConfirm ? (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Supprimer le projet « {project.title} » et tous ses romans ? Cette action est irréversible.
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteProject}
                disabled={deleting}
                className="!bg-red !border-red hover:!bg-red/90"
              >
                {deleting ? "Suppression…" : "Confirmer la suppression"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            Supprimer ce projet
          </Button>
        )}
      </Card>
    </div>
  );
}

function NovelSettings({
  novel,
  onSave,
  onActivate,
}: {
  novel: NovelData;
  onSave: (updates: {
    title?: string;
    word_goal?: number | null;
    words_per_session?: number | null;
    sessions_per_week?: number | null;
  }) => void;
  onActivate: () => void;
}) {
  const [title, setTitle] = useState(novel.title);
  const [wordGoal, setWordGoal] = useState(novel.word_goal?.toString() ?? "");
  const [wordsPerSession, setWordsPerSession] = useState(
    novel.words_per_session?.toString() ?? ""
  );
  const [sessionsPerWeek, setSessionsPerWeek] = useState(
    novel.sessions_per_week?.toString() ?? ""
  );
  const [saved, setSaved] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const wps = parseInt(wordsPerSession, 10) || 0;
  const spw = parseInt(sessionsPerWeek, 10) || 0;
  const dailyGoal = wps > 0 && spw > 0 ? Math.round((wps * spw) / 7) : 0;
  const totalGoal = parseInt(wordGoal, 10) || 0;
  const remaining = Math.max(0, totalGoal - novel.current_words);

  // Estimation temps de rédaction basée sur wps × spw
  const wordsPerWeek = wps * spw;
  const weeksToFinish =
    totalGoal > 0 && wordsPerWeek > 0 ? Math.ceil(remaining / wordsPerWeek) : 0;
  const estimatedEndDate =
    weeksToFinish > 0
      ? new Date(Date.now() + weeksToFinish * 7 * 86_400_000)
      : null;

  function handleSave() {
    onSave({
      title: title.trim(),
      word_goal: wordGoal ? parseInt(wordGoal, 10) : null,
      words_per_session: wps > 0 ? wps : null,
      sessions_per_week: spw > 0 ? spw : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleActivateClick() {
    if (novel.is_active) return;
    if (
      await appConfirm(
        "⚠️ Un seul roman peut être actif à la fois.\n\n" +
          "Activer « " +
          novel.title +
          " » désactivera les autres romans (tous projets confondus). " +
          "Ils continueront d'exister et de compter leurs mots — seul le roman actif " +
          "servira de référence pour l'objectif quotidien du calendrier.",
        { confirmLabel: "Activer", danger: false },
      )
    ) {
      onActivate();
    }
  }

  return (
    <Card
      id={`novel-${novel.id}`}
      className={`p-4 mb-3 scroll-mt-4 ${novel.is_active ? "border-primary-border" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-medium text-text-primary">{novel.title}</h2>
          {novel.is_active && <Badge variant="primary">✦ Actif</Badge>}
        </div>
        <Badge variant="muted">{novel.current_words.toLocaleString("fr-FR")} mots</Badge>
      </div>

      <div className="mb-3">
        <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
          Titre du roman
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-9 px-3 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
        />
      </div>

      <div className="mb-3">
        <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
          Objectif de mots (total)
        </label>
        <input
          type="number"
          value={wordGoal}
          onChange={(e) => setWordGoal(e.target.value)}
          placeholder="Ex : 80000"
          className="w-full h-9 px-3 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
        />
      </div>

      {/* Rythme d'écriture — utilisé pour l'objectif journalier si roman actif */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
            Mots par jour
          </label>
          <input
            type="number"
            value={wordsPerSession}
            onChange={(e) => setWordsPerSession(e.target.value)}
            placeholder="Ex : 500"
            className="w-full h-9 px-3 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
            Jours / semaine
          </label>
          <input
            type="number"
            min="1"
            max="7"
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(e.target.value)}
            placeholder="Ex : 5"
            className="w-full h-9 px-3 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
          />
        </div>
      </div>

      {/* Estimation live — style onboarding. Fallback sur 80 000 mots si pas d'objectif. */}
      {!(wps > 0 && spw > 0) && (
        <div className="mb-3 bg-bg-tertiary rounded-[var(--radius-md)] p-3">
          <div className="text-[12px] text-text-tertiary">
            Renseignez <span className="text-text-primary font-medium">mots par jour</span>{" "}
            et <span className="text-text-primary font-medium">jours / semaine</span>{" "}
            pour voir l&apos;estimation de durée d&apos;écriture du premier jet.
          </div>
        </div>
      )}
      {wps > 0 && spw > 0 && (() => {
        const target = totalGoal > 0 ? totalGoal : 80000;
        const remainingEst = Math.max(0, target - novel.current_words);
        const weeks = wordsPerWeek > 0 ? Math.ceil(remainingEst / wordsPerWeek) : 0;
        const endDate =
          weeks > 0 ? new Date(Date.now() + weeks * 7 * 86_400_000) : null;
        const usingFallback = totalGoal === 0;
        return (
          <div className="mb-3 bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <div className="text-[11px] text-text-tertiary mb-1">
              {usingFallback
                ? "À ce rythme, un roman de 80 000 mots prendrait environ"
                : remainingEst > 0
                  ? "À ce rythme, il reste environ"
                  : "Objectif atteint 🎉"}
            </div>
            {remainingEst > 0 && (
              <div className="text-[20px] font-bold text-primary leading-tight">
                {weeks} semaine{weeks > 1 ? "s" : ""}
              </div>
            )}
            <div className="text-[11px] text-text-quaternary mt-0.5">
              {wps.toLocaleString("fr-FR")} mots × {spw} jour{spw > 1 ? "s" : ""}/semaine ={" "}
              {wordsPerWeek.toLocaleString("fr-FR")} mots/semaine
              {" · "}
              objectif quotidien moyen{" "}
              <span className="text-primary font-medium">
                {dailyGoal.toLocaleString("fr-FR")} mots/j
              </span>
            </div>
            {!usingFallback && remainingEst > 0 && (
              <div className="text-[11px] text-text-tertiary mt-1">
                Soit <span className="text-text-primary font-medium">
                  {remainingEst.toLocaleString("fr-FR")} mots
                </span>{" "}
                à écrire
                {endDate && (
                  <>
                    {" "}— fin estimée du premier jet le{" "}
                    <span className="text-text-primary font-medium">
                      {endDate.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </>
                )}
                .
              </div>
            )}
            {usingFallback && (
              <div className="text-[10px] text-amber mt-1">
                Astuce : renseignez un objectif de mots pour obtenir une estimation sur votre roman.
              </div>
            )}
            <div className="text-[10px] text-text-quaternary mt-1">
              {novel.is_active
                ? "✦ Roman actif : ces chiffres pilotent le calendrier de la page d'accueil."
                : "Activez ce roman pour piloter le calendrier de la page d'accueil."}
            </div>
          </div>
        );
      })()}

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!title.trim()}>
          Enregistrer
        </Button>
        {!novel.is_active && (
          <Button variant="outline" size="sm" onClick={handleActivateClick}>
            ✦ Activer ce roman
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          📄 Importer un manuscrit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setExporting(true);
            setExportError(null);
            try {
              const supabase = createClient();
              const { data: chapters, error } = await supabase
                .from("chapters")
                .select("title, content, position")
                .eq("novel_id", novel.id)
                .order("position", { ascending: true });
              if (error) throw error;
              const { data: { user } } = await supabase.auth.getUser();
              const { data: profile } = user
                ? await supabase
                    .from("profiles")
                    .select("username")
                    .eq("id", user.id)
                    .maybeSingle()
                : { data: null };
              // Import dynamique : `docx` reste hors du bundle de la page,
              // chargé seulement au déclenchement de l'export.
              const { downloadNovelDocx } = await import(
                "@/lib/export/exportNovelDocx"
              );
              await downloadNovelDocx({
                novelTitle: novel.title,
                authorName: profile?.username ?? "Auteur",
                chapters: (chapters ?? []).map((c, i) => ({
                  title: c.title || `Chapitre ${i + 1}`,
                  contentHtml: c.content ?? "",
                  position: c.position ?? i,
                })),
              });
            } catch (e) {
              setExportError(e instanceof Error ? e.message : "Export échoué.");
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting || novel.chapter_count === 0}
          title={novel.chapter_count === 0 ? "Aucun chapitre à exporter" : undefined}
        >
          {exporting ? "Export…" : "↓ Exporter en DOCX"}
        </Button>
        {saved && <span className="text-[12px] text-teal-dark">Sauvegardé</span>}
        {exportError && <span className="text-[12px] text-red">{exportError}</span>}
      </div>

      {showImport && (
        <ImportManuscriptDialog
          novelId={novel.id}
          novelTitle={novel.title}
          existingChapterCount={novel.chapter_count}
          onClose={() => setShowImport(false)}
        />
      )}
    </Card>
  );
}
