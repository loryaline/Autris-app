"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GENRES, GENRE_TO_THEME } from "@/lib/constants";
import type { Genre } from "@/types/database";

interface ProjectWithNovels {
  id: string;
  title: string;
  genre: Genre;
  created_at: string;
  novels: { id: string; title: string; current_words: number; word_goal: number | null }[];
}

export function DashboardClient({ projects }: { projects: ProjectWithNovels[] }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [novelTitle, setNovelTitle] = useState("");
  const [genre, setGenre] = useState<Genre>("contemporain");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteProject(projectId: string) {
    setDeletingId(null);
    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", projectId);
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectTitle.trim() || !novelTitle.trim()) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({ user_id: user.id, title: projectTitle.trim(), genre })
      .select()
      .single();

    if (projectError) {
      setError(projectError.message);
      setLoading(false);
      return;
    }

    // Create novel
    const { data: novel, error: novelError } = await supabase
      .from("novels")
      .insert({
        project_id: project.id,
        user_id: user.id,
        title: novelTitle.trim(),
        ui_theme: GENRE_TO_THEME[genre] ?? "blanc",
      })
      .select()
      .single();

    if (novelError) {
      setError(novelError.message);
      setLoading(false);
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

    setShowModal(false);
    setProjectTitle("");
    setNovelTitle("");
    setGenre("contemporain");
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      {/* Projects list */}
      {projects.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] font-medium text-text-primary">
              Mes projets
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              + Nouveau projet
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {projects.map((project) => {
              const genreInfo = GENRES.find((g) => g.value === project.genre);
              const totalWords = project.novels.reduce((s, n) => s + n.current_words, 0);
              const totalGoal = project.novels.reduce((s, n) => s + (n.word_goal ?? 0), 0);
              const hasGoal = totalGoal > 0;
              const progress = hasGoal ? Math.min((totalWords / totalGoal) * 100, 100) : 0;

              return (
                <Card key={project.id} className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[16px]">{genreInfo?.emoji}</span>
                    <div className="text-[14px] font-medium text-text-primary flex-1">
                      {project.title}
                    </div>
                    <a
                      href={`/project/${project.id}`}
                      title="Paramètres du projet"
                      className="text-text-quaternary hover:text-primary transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M11.4 8.6a1 1 0 00.2 1.1l.04.04a1.2 1.2 0 11-1.7 1.7l-.04-.04a1 1 0 00-1.1-.2 1 1 0 00-.6.92v.11a1.2 1.2 0 11-2.4 0v-.06a1 1 0 00-.66-.92 1 1 0 00-1.1.2l-.04.04a1.2 1.2 0 11-1.7-1.7l.04-.04a1 1 0 00.2-1.1 1 1 0 00-.92-.6h-.11a1.2 1.2 0 110-2.4h.06a1 1 0 00.92-.66 1 1 0 00-.2-1.1l-.04-.04a1.2 1.2 0 111.7-1.7l.04.04a1 1 0 001.1.2h.05a1 1 0 00.6-.92v-.11a1.2 1.2 0 112.4 0v.06a1 1 0 00.6.92 1 1 0 001.1-.2l.04-.04a1.2 1.2 0 111.7 1.7l-.04.04a1 1 0 00-.2 1.1v.05a1 1 0 00.92.6h.11a1.2 1.2 0 110 2.4h-.06a1 1 0 00-.92.6z" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                    </a>
                  </div>
                  <Badge variant="primary" className="mb-2">
                    {genreInfo?.label}
                  </Badge>

                  {/* Progress bar */}
                  {hasGoal && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="text-text-tertiary">
                          {totalWords.toLocaleString("fr-FR")} / {totalGoal.toLocaleString("fr-FR")} mots
                        </span>
                        <span className="text-primary font-medium">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {project.novels.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {project.novels.map((novel) => (
                        <a
                          key={novel.id}
                          href={`/editor/${novel.id}`}
                          className="flex items-center justify-between p-1.5 rounded-[var(--radius-sm)] hover:bg-bg-hover transition-colors text-[12px]"
                        >
                          <span className="text-text-secondary">
                            {novel.title}
                          </span>
                          <span className="text-text-tertiary">
                            {novel.current_words.toLocaleString("fr-FR")} mots
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-text-tertiary">
                      Aucun roman
                    </div>
                  )}

                  {/* Delete project */}
                  {deletingId === project.id ? (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="text-[11px] text-red mb-1.5">Supprimer ce projet et tous ses romans ?</div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-red text-white cursor-pointer hover:bg-red/90 transition-colors"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary cursor-pointer transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(project.id)}
                      className="mt-2 text-[11px] text-text-quaternary hover:text-red cursor-pointer transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="p-6 text-center">
          <div className="text-[36px] mb-2">🦭</div>
          <div className="text-[15px] font-medium text-text-primary mb-1">
            Aucun projet pour l&apos;instant
          </div>
          <div className="text-[13px] text-text-tertiary mb-3">
            Créez votre premier projet et commencez à écrire votre roman.
          </div>
          <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
            + Nouveau projet
          </Button>
        </Card>
      )}

      {/* Create project modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-bg-primary border border-border rounded-[var(--radius-lg)] p-5 w-full max-w-[420px] mx-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[20px]">🦭</span>
              <h2 className="text-[16px] font-medium text-text-primary">
                Nouveau projet
              </h2>
            </div>

            {error && (
              <div className="mb-3 p-2 rounded-[var(--radius-sm)] bg-red-bg text-red text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                  Nom du projet (saga / univers)
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Ex : Les Chroniques d'Aldara"
                  required
                  autoFocus
                  className="w-full h-8 px-2.5 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                  Titre du premier roman
                </label>
                <input
                  type="text"
                  value={novelTitle}
                  onChange={(e) => setNovelTitle(e.target.value)}
                  placeholder="Ex : Tome 1 — La Mémoire des Dieux"
                  required
                  className="w-full h-8 px-2.5 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                  Genre
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {GENRES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGenre(g.value)}
                      className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-[var(--radius-sm)] border text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
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

              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  disabled={loading || !projectTitle.trim() || !novelTitle.trim()}
                >
                  {loading ? "Création…" : "Créer le projet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
