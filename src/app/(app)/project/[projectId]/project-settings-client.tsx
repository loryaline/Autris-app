"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GENRES } from "@/lib/constants";
import type { Genre } from "@/types/database";

interface NovelData {
  id: string;
  title: string;
  current_words: number;
  word_goal: number | null;
}

interface ProjectData {
  id: string;
  title: string;
  genre: string;
  created_at: string;
  novels: NovelData[];
}

export function ProjectSettings({ project }: { project: ProjectData }) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [genre, setGenre] = useState<Genre>(project.genre as Genre);
  const [novels, setNovels] = useState(project.novels);
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

  async function handleSaveNovel(novelId: string, updates: { title?: string; word_goal?: number | null }) {
    const supabase = createClient();
    await supabase
      .from("novels")
      .update(updates)
      .eq("id", novelId);

    setNovels((prev) =>
      prev.map((n) => (n.id === novelId ? { ...n, ...updates } : n))
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
        ui_theme: "blanc",
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
}: {
  novel: NovelData;
  onSave: (updates: { title?: string; word_goal?: number | null }) => void;
}) {
  const [title, setTitle] = useState(novel.title);
  const [wordGoal, setWordGoal] = useState(novel.word_goal?.toString() ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave({
      title: title.trim(),
      word_goal: wordGoal ? parseInt(wordGoal, 10) : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-medium text-text-primary">{novel.title}</h2>
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
          Objectif de mots
        </label>
        <input
          type="number"
          value={wordGoal}
          onChange={(e) => setWordGoal(e.target.value)}
          placeholder="Ex : 80000"
          className="w-full h-9 px-3 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!title.trim()}>
          Enregistrer
        </Button>
        {saved && (
          <span className="text-[12px] text-teal-dark">Sauvegardé</span>
        )}
      </div>
    </Card>
  );
}
