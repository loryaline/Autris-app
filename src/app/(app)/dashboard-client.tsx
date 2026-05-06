"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GENRES } from "@/lib/constants";
import type { Genre, NovelStatus } from "@/types/database";
import {
  NOVEL_STATUS_LABELS,
  nextNovelStatus,
} from "@/lib/novel-status";

interface ProjectWithNovels {
  id: string;
  title: string;
  genre: Genre;
  created_at: string;
  cover_image_url: string | null;
  novels: {
    id: string;
    title: string;
    current_words: number;
    word_goal: number | null;
    is_active?: boolean;
    status?: NovelStatus;
  }[];
}

export function DashboardClient({
  projects,
  lastProjectTitle: _lastProjectTitle,
}: {
  projects: ProjectWithNovels[];
  lastProjectTitle?: string | null;
}) {
  // Prefix unused var with _ to silence lint while keeping the API stable
  void _lastProjectTitle;

  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [novelTitle, setNovelTitle] = useState("");
  const [genre, setGenre] = useState<Genre>("contemporain");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Ajout inline d'un roman dans une carte projet
  const [addNovelToProjectId, setAddNovelToProjectId] = useState<string | null>(null);
  const [newNovelTitle, setNewNovelTitle] = useState("");
  const [addingNovel, setAddingNovel] = useState(false);

  async function handleCycleNovelStatus(novelId: string, current: NovelStatus) {
    const next = nextNovelStatus(current);
    const supabase = createClient();
    await supabase.from("novels").update({ status: next }).eq("id", novelId);
    router.refresh();
  }

  async function handleActivateNovel(novelId: string, currentWords: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Désactiver tous les romans de l'utilisatrice, puis activer celui-ci
    // avec activated_at + activation_word_count fraîchement posés (cf.
    // dashboard estimations scopées au roman actif depuis activation).
    await supabase.from("novels").update({ is_active: false }).eq("user_id", user.id);
    await supabase
      .from("novels")
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        activation_word_count: currentWords ?? 0,
      })
      .eq("id", novelId);
    router.refresh();
  }

  async function handleAddNovel(projectId: string) {
    if (!newNovelTitle.trim()) return;
    setAddingNovel(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAddingNovel(false);
      return;
    }

    const { data: novel, error: novelErr } = await supabase
      .from("novels")
      .insert({
        project_id: projectId,
        user_id: user.id,
        title: newNovelTitle.trim(),
      })
      .select("id")
      .single();

    if (novelErr || !novel) {
      setAddingNovel(false);
      return;
    }

    // Premier chapitre vide pour démarrer
    await supabase
      .from("chapters")
      .insert({
        novel_id: novel.id,
        user_id: user.id,
        title: "Chapitre 1",
        position: 0,
      });

    setNewNovelTitle("");
    setAddNovelToProjectId(null);
    setAddingNovel(false);
    router.refresh();
  }

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

    const { data: novel, error: novelError } = await supabase
      .from("novels")
      .insert({
        project_id: project.id,
        user_id: user.id,
        title: novelTitle.trim(),
      })
      .select()
      .single();

    if (novelError) {
      setError(novelError.message);
      setLoading(false);
      return;
    }

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
      {/* Header : Vos univers + Nouveau projet */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[18px] text-text-primary">
          Vos <span className="font-serif italic text-[var(--color-accent)]">univers</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--color-accent-border)] text-[var(--color-accent)] text-[12px] hover:bg-[var(--color-accent-bg)] transition-colors cursor-pointer"
        >
          + Nouveau projet
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="flex flex-col gap-3">
          {projects.map((project) => {
            const genreInfo = GENRES.find((g) => g.value === project.genre);
            const totalWords = project.novels.reduce((s, n) => s + n.current_words, 0);
            const activeNovel =
              project.novels.find((n) => n.is_active) ??
              project.novels.find((n) => n.word_goal) ??
              project.novels[0];
            const activeGoal = activeNovel?.word_goal ?? 0;
            const activeWords = activeNovel?.current_words ?? 0;
            const activeProgress =
              activeGoal > 0 ? Math.min((activeWords / activeGoal) * 100, 100) : 0;

            return (
              <div
                key={project.id}
                className="relative overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.06]"
              >
                {/* Hero / cover */}
                <div
                  className={`relative h-[110px] univers-glow flex items-end ${
                    project.cover_image_url ? "" : ""
                  }`}
                  style={
                    project.cover_image_url
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(26,26,43,0.15) 0%, rgba(26,26,43,0.85) 100%), url(${project.cover_image_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {/* Moon */}
                  {!project.cover_image_url && (
                    <div
                      className="absolute top-5 right-6 w-12 h-12 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle at 35% 35%, #d9a57c 0%, #a86a44 60%, #5a3322 100%)",
                        boxShadow: "0 0 40px rgba(228,180,140,0.25)",
                      }}
                    />
                  )}
                  <div className="relative p-4 w-full">
                    <div className="flex items-end justify-between">
                      <div className="font-serif italic text-[22px] text-text-primary leading-tight">
                        {project.title}
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-[22px] text-text-primary leading-none">
                          {formatCompact(totalWords)}
                        </div>
                        <div className="text-[9.5px] text-text-quaternary uppercase mt-0.5" style={{ letterSpacing: "0.14em" }}>
                          mots au total
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-[var(--color-accent)] uppercase" style={{ letterSpacing: "0.16em" }}>
                        ◆ {genreInfo?.label}
                      </span>
                      <span className="text-[10px] text-text-quaternary uppercase" style={{ letterSpacing: "0.16em" }}>
                        · {project.novels.length} roman{project.novels.length > 1 ? "s" : ""}
                      </span>
                      <div className="flex-1" />
                      <a
                        href={`/project/${project.id}`}
                        title="Paramètres"
                        className="text-text-quaternary hover:text-[var(--color-accent)] transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M11.4 8.6a1 1 0 00.2 1.1l.04.04a1.2 1.2 0 11-1.7 1.7l-.04-.04a1 1 0 00-1.1-.2 1 1 0 00-.6.92v.11a1.2 1.2 0 11-2.4 0v-.06a1 1 0 00-.66-.92 1 1 0 00-1.1.2l-.04.04a1.2 1.2 0 11-1.7-1.7l.04-.04a1 1 0 00.2-1.1 1 1 0 00-.92-.6h-.11a1.2 1.2 0 110-2.4h.06a1 1 0 00.92-.66 1 1 0 00-.2-1.1l-.04-.04a1.2 1.2 0 111.7-1.7l.04.04a1 1 0 001.1.2h.05a1 1 0 00.6-.92v-.11a1.2 1.2 0 112.4 0v.06a1 1 0 00.6.92 1 1 0 001.1-.2l.04-.04a1.2 1.2 0 111.7 1.7l-.04.04a1 1 0 00-.2 1.1v.05a1 1 0 00.92.6h.11a1.2 1.2 0 110 2.4h-.06a1 1 0 00-.92.6z" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Active novel progress strip */}
                {activeNovel && activeGoal > 0 && (
                  <div className="px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.015]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-text-tertiary truncate mr-2">
                        {activeNovel.title} · <span className="text-text-quaternary">en cours</span>
                      </span>
                      <span className="text-text-secondary shrink-0">
                        {activeWords.toLocaleString("fr-FR")} / {activeGoal.toLocaleString("fr-FR")} ·{" "}
                        <span className="text-[var(--color-accent)] font-medium">{Math.round(activeProgress)} %</span>
                      </span>
                    </div>
                    <div className="h-[2px] rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent)] rounded-full"
                        style={{ width: `${activeProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Novels list */}
                <div className="px-2 py-2 bg-white/[0.01]">
                  {project.novels.length > 0 ? (
                    <div className="flex flex-col">
                      {project.novels.map((novel) => {
                        const status: NovelStatus = novel.status ?? "a_ecrire";
                        const statusInfo = NOVEL_STATUS_LABELS[status];
                        return (
                          <div
                            key={novel.id}
                            className="group flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-white/[0.03] transition-colors"
                          >
                            {/* ✦ activable : roman actif → accent rempli ;
                                inactif → étoile creuse, hover invite à
                                l'activer. Click change l'actif global. */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (novel.is_active) return; // déjà actif
                                handleActivateNovel(novel.id, novel.current_words);
                              }}
                              title={
                                novel.is_active
                                  ? "Roman actif — pilote le calendrier"
                                  : "Activer ce roman — pilotera le calendrier de l'accueil"
                              }
                              className={`text-[13px] leading-none w-5 h-5 flex items-center justify-center rounded transition-colors ${
                                novel.is_active
                                  ? "text-[var(--color-accent)] cursor-default"
                                  : "text-text-quaternary hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)]/40 cursor-pointer"
                              }`}
                            >
                              {novel.is_active ? "✦" : "☆"}
                            </button>
                            <a
                              href={`/project/${project.id}#novel-${novel.id}`}
                              title="Paramètres du roman"
                              className="flex-1 min-w-0 text-[12.5px] text-text-secondary hover:text-text-primary truncate no-underline"
                            >
                              {novel.title}
                            </a>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCycleNovelStatus(novel.id, status);
                              }}
                              title={`Statut : ${statusInfo.label} (clic pour changer)`}
                              className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-80 ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </button>
                            <span className="text-[11px] text-text-tertiary tabular-nums w-[82px] text-right">
                              {novel.current_words.toLocaleString("fr-FR")} mots
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-2 py-1 text-[12px] text-text-quaternary italic">Aucun roman</div>
                  )}

                  {/* Ajouter un roman — formulaire inline */}
                  {addNovelToProjectId === project.id ? (
                    <div className="mt-1 px-2 py-2 border-t border-white/[0.05]">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newNovelTitle}
                          onChange={(e) => setNewNovelTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddNovel(project.id);
                            if (e.key === "Escape") {
                              setAddNovelToProjectId(null);
                              setNewNovelTitle("");
                            }
                          }}
                          placeholder="Titre du roman"
                          autoFocus
                          className="flex-1 h-7 px-2 text-[12px] bg-bg-primary border border-white/[0.08] rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-[var(--color-accent-border)]"
                        />
                        <button
                          onClick={() => handleAddNovel(project.id)}
                          disabled={addingNovel || !newNovelTitle.trim()}
                          className={`h-7 px-2.5 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors ${
                            newNovelTitle.trim() && !addingNovel
                              ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] cursor-pointer"
                              : "bg-white/[0.05] text-text-quaternary cursor-not-allowed"
                          }`}
                        >
                          {addingNovel ? "…" : "Ajouter"}
                        </button>
                        <button
                          onClick={() => {
                            setAddNovelToProjectId(null);
                            setNewNovelTitle("");
                          }}
                          className="h-7 px-2 text-[11px] text-text-tertiary hover:text-text-primary cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddNovelToProjectId(project.id)}
                      className="mt-1 w-full px-2 py-1 text-[11.5px] text-text-quaternary hover:text-[var(--color-accent)] cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <span className="text-[12px]">+</span>
                      <span>Ajouter un roman</span>
                    </button>
                  )}

                  {/* Supprimer */}
                  {deletingId === project.id ? (
                    <div className="mt-1.5 px-2 pt-2 border-t border-white/[0.05]">
                      <div className="text-[11px] text-red mb-1.5">Supprimer ce projet et tous ses romans ?</div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleDeleteProject(project.id)} className="text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-red text-white cursor-pointer hover:bg-red/90 transition-colors">
                          Supprimer
                        </button>
                        <button onClick={() => setDeletingId(null)} className="text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary cursor-pointer transition-colors">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(project.id)}
                      className="mt-1 px-2 text-[10.5px] text-text-quaternary hover:text-red cursor-pointer transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-white/[0.06] bg-bg-tertiary/40 p-6 text-center">
          <div className="text-[20px] text-[var(--color-accent)] mb-2">◆</div>
          <div className="text-[14px] text-text-primary mb-1" style={{ fontFamily: "var(--font-serif)" }}>
            <span className="italic">La page est blanche.</span>
          </div>
          <div className="text-[12px] text-text-tertiary mb-3">
            Créez votre premier projet et commencez à écrire votre roman.
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--color-accent-border)] text-[var(--color-accent)] text-[12px] hover:bg-[var(--color-accent-bg)] transition-colors cursor-pointer"
          >
            + Nouveau projet
          </button>
        </div>
      )}

      {/* Create project modal (unchanged functionality, restyled shell) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-xl)] p-5 w-full max-w-[440px] mx-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[14px] text-[var(--color-accent)]">◆</span>
              <h2 className="text-[16px] text-text-primary">
                Nouveau <span className="font-serif italic text-[var(--color-accent)]">projet</span>
              </h2>
            </div>

            {error && (
              <div className="mb-3 p-2 rounded-[var(--radius-sm)] bg-red-bg text-red text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-medium text-text-quaternary uppercase mb-1.5" style={{ letterSpacing: "0.16em" }}>
                  Nom du projet (saga / univers)
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Ex : Les Chroniques d'Aldara"
                  required
                  autoFocus
                  className="w-full h-9 px-3 text-[13px] border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-[var(--color-accent-border)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-text-quaternary uppercase mb-1.5" style={{ letterSpacing: "0.16em" }}>
                  Titre du premier roman
                </label>
                <input
                  type="text"
                  value={novelTitle}
                  onChange={(e) => setNovelTitle(e.target.value)}
                  placeholder="Ex : Tome 1 — La Mémoire des Dieux"
                  required
                  className="w-full h-9 px-3 text-[13px] border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-[var(--color-accent-border)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-text-quaternary uppercase mb-1.5" style={{ letterSpacing: "0.16em" }}>
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
                          ? "bg-[var(--color-accent-bg)] border-[var(--color-accent-border)] text-[var(--color-accent)]"
                          : "bg-bg-primary border-white/[0.06] text-text-secondary hover:bg-bg-hover"
                      }`}
                    >
                      <span>{g.emoji}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="flex-1 h-9 px-3 rounded-[var(--radius-sm)] border border-white/[0.08] text-[13px] text-text-secondary hover:bg-bg-hover cursor-pointer"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] font-medium text-[13px] transition-colors cursor-pointer disabled:opacity-50"
                  disabled={loading || !projectTitle.trim() || !novelTitle.trim()}
                >
                  {loading ? "Création…" : "Créer le projet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
  return n.toLocaleString("fr-FR");
}
