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
      {/* En-tête : Vos univers + Nouveau projet */}
      <div className="rd-boards-head">
        <div className="rd-boards-title">
          Vos <em>univers</em>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rd-btn rd-btn-sm rd-btn-pill"
          style={{ color: "var(--accent)", borderColor: "var(--accent-border)" }}
        >
          + Nouveau projet
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="rd-board-stack">
          {projects.map((project) => {
            const genreInfo = GENRES.find((g) => g.value === project.genre);
            const totalWords = project.novels.reduce((s, n) => s + n.current_words, 0);
            // Roman ACTIF de ce projet (flag is_active global).
            const activeNovel = project.novels.find((n) => n.is_active);
            // Romans avec un word_goal défini → progression cumulée.
            const seriesGoal = project.novels.reduce((s, n) => s + (n.word_goal ?? 0), 0);
            const seriesWords = project.novels.reduce(
              (s, n) => s + (n.word_goal ? n.current_words : 0),
              0,
            );
            // Jauge affichée : roman actif prioritaire, sinon série cumulée.
            const bar = (() => {
              if (activeNovel && (activeNovel.word_goal ?? 0) > 0) {
                const g = activeNovel.word_goal ?? 0;
                return {
                  label: activeNovel.title,
                  words: activeNovel.current_words,
                  goal: g,
                  pct: Math.min(100, Math.round((activeNovel.current_words / g) * 100)),
                };
              }
              if (seriesGoal > 0) {
                return {
                  label: project.novels.length > 1 ? "Série" : project.novels[0]?.title ?? "",
                  words: seriesWords,
                  goal: seriesGoal,
                  pct: Math.min(100, Math.round((seriesWords / seriesGoal) * 100)),
                };
              }
              return null;
            })();

            return (
              <div key={project.id} className="rd-board-card">
                {/* Couverture */}
                <div
                  className="rd-board-cover"
                  style={
                    project.cover_image_url
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.8) 100%), url(${project.cover_image_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {!project.cover_image_url && <div className="rd-board-orb" />}
                  <div className="rd-board-meta">
                    <div className="rd-board-row">
                      <div className="rd-board-name">{project.title}</div>
                      <div className="rd-board-words">
                        <div className="rd-board-words-num">{formatCompact(totalWords)}</div>
                        <div className="rd-board-words-cap">mots · total</div>
                      </div>
                    </div>
                    <div className="rd-board-tags">
                      <span className="rd-board-tag accent">◆ {genreInfo?.label ?? project.genre}</span>
                      <span className="rd-board-tag">
                        · {project.novels.length} roman{project.novels.length > 1 ? "s" : ""}
                      </span>
                      <a
                        href={`/project/${project.id}`}
                        title="Paramètres du projet"
                        className="rd-board-tag"
                        style={{ marginLeft: "auto" }}
                      >
                        Gérer
                      </a>
                    </div>
                  </div>
                </div>

                {/* Jauge de progression */}
                {bar && (
                  <div className="rd-board-progress">
                    <div className="rd-board-progress-row">
                      <span className="num">{bar.label}</span>
                      <span>
                        <span className="num">{bar.words.toLocaleString("fr-FR")}</span> /{" "}
                        {bar.goal.toLocaleString("fr-FR")}{" "}
                        <span className="pct">{bar.pct}%</span>
                      </span>
                    </div>
                    <div className="rd-board-progress-bar">
                      <div className="rd-board-progress-fill" style={{ width: `${bar.pct}%` }} />
                    </div>
                  </div>
                )}

                {/* Liste des romans */}
                <div className="rd-board-novels">
                  {project.novels.length > 0 ? (
                    project.novels.map((novel) => {
                      const status: NovelStatus = novel.status ?? "a_ecrire";
                      const statusInfo = NOVEL_STATUS_LABELS[status];
                      const statusClass =
                        status === "termine" || status === "publie"
                          ? "done"
                          : status === "a_ecrire"
                            ? ""
                            : "writing";
                      return (
                        <div key={novel.id} className="rd-novel-card-row">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (novel.is_active) return;
                              handleActivateNovel(novel.id, novel.current_words);
                            }}
                            title={
                              novel.is_active
                                ? "Roman actif — pilote le calendrier"
                                : "Activer ce roman"
                            }
                            className={`rd-novel-card-marker${novel.is_active ? " active" : ""}`}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: novel.is_active ? "default" : "pointer",
                              padding: 0,
                              fontSize: 13,
                            }}
                          >
                            {novel.is_active ? "✦" : "›"}
                          </button>
                          <a
                            href={`/project/${project.id}#novel-${novel.id}`}
                            className="rd-novel-card-title"
                            title="Paramètres du roman"
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
                            className={`rd-novel-card-status${statusClass ? ` ${statusClass}` : ""}`}
                            style={{ cursor: "pointer" }}
                          >
                            {statusInfo.label}
                          </button>
                          <span className="rd-novel-card-words">
                            {novel.current_words.toLocaleString("fr-FR")}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      className="rd-novel-card-title"
                      style={{ padding: "6px 8px", fontStyle: "italic", color: "var(--text-4)" }}
                    >
                      Aucun roman
                    </div>
                  )}

                  {/* Ajouter un roman */}
                  {addNovelToProjectId === project.id ? (
                    <div style={{ display: "flex", gap: 6, padding: "6px 8px" }}>
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
                        className="rd-search"
                        style={{
                          flex: 1,
                          height: 28,
                          padding: "0 8px",
                          fontSize: 12,
                          background: "var(--bg-2)",
                          border: "1px solid var(--border-soft)",
                          borderRadius: "var(--r-sm)",
                          color: "var(--text)",
                        }}
                      />
                      <button
                        onClick={() => handleAddNovel(project.id)}
                        disabled={addingNovel || !newNovelTitle.trim()}
                        className="rd-btn rd-btn-sm rd-btn-primary"
                      >
                        {addingNovel ? "…" : "Ajouter"}
                      </button>
                      <button
                        onClick={() => {
                          setAddNovelToProjectId(null);
                          setNewNovelTitle("");
                        }}
                        className="rd-btn rd-btn-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddNovelToProjectId(project.id)}
                      className="rd-novel-card-row"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-4)",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      <span className="rd-novel-card-marker">+</span>
                      <span className="rd-novel-card-title">Ajouter un roman</span>
                    </button>
                  )}

                  {/* Supprimer le projet */}
                  {deletingId === project.id ? (
                    <div style={{ padding: "6px 8px", display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--danger)", flex: 1 }}>
                        Supprimer ce projet ?
                      </span>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="rd-btn rd-btn-sm"
                        style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                      >
                        Supprimer
                      </button>
                      <button onClick={() => setDeletingId(null)} className="rd-btn rd-btn-sm">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(project.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-4)",
                        fontSize: 10.5,
                        padding: "4px 8px",
                        textAlign: "left",
                      }}
                    >
                      Supprimer le projet
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--border-soft)",
            background: "var(--bg-3)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, color: "var(--accent)", marginBottom: 8 }}>◆</div>
          <div
            style={{
              fontSize: 15,
              color: "var(--text)",
              marginBottom: 4,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
            }}
          >
            La page est blanche.
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
            Créez votre premier projet et commencez à écrire votre roman.
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rd-btn rd-btn-sm rd-btn-pill"
            style={{ color: "var(--accent)", borderColor: "var(--accent-border)" }}
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
