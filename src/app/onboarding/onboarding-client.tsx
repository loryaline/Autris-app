"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GENRES } from "@/lib/constants";
import type { Genre, NarrativeTemplate, Persona } from "@/types/database";

/* ---- Constants ---- */
const PERSONAS: { value: Persona; label: string; desc: string }[] = [
  { value: "debutant", label: "Explorateur", desc: "Je debute et j'ai besoin d'etre guide" },
  { value: "intermediaire_plan", label: "Planificateur", desc: "J'aime structurer avant d'ecrire" },
  { value: "intermediaire_suivi", label: "Marathonien", desc: "Je veux suivre ma progression" },
  { value: "avance", label: "Autonome", desc: "Je sais ce que je fais, allons-y" },
];

const FREQUENCIES = [
  { value: "daily", label: "Tous les jours" },
  { value: "weekdays", label: "En semaine" },
  { value: "weekends", label: "Le week-end" },
  { value: "flexible", label: "Quand je peux" },
];

const POMO_DURATIONS = [15, 20, 25, 30, 45, 60];

type NarrativeOption = {
  value: NarrativeTemplate;
  label: string;
  desc: string;
  badge: string;
};
const NARRATIVE_TEMPLATES: NarrativeOption[] = [
  { value: "libre",      label: "Libre",                 desc: "Pas de structure imposée. Vous écrivez à votre rythme.", badge: "✎" },
  { value: "3actes",     label: "Trois actes",           desc: "Exposition · Confrontation · Résolution. Le classique.", badge: "▦" },
  { value: "heros",      label: "Voyage du héros",       desc: "Campbell · 12 étapes du départ au retour transformé.",   badge: "✦" },
  { value: "savethecat", label: "Save the Cat",          desc: "Snyder · 15 beats narratifs, idéal pour le rythme.",     badge: "◆" },
  { value: "snowflake",  label: "Flocon (Snowflake)",    desc: "Ingermanson · de la phrase au synopsis détaillé.",       badge: "❄" },
];

type Step = "accueil" | "persona" | "projet" | "template" | "objectifs" | "final";
const STEPS: Step[] = ["accueil", "persona", "projet", "template", "objectifs", "final"];

export function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("accueil");
  const [saving, setSaving] = useState(false);

  // Step data
  const [persona, setPersona] = useState<Persona | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [genre, setGenre] = useState<Genre>("contemporain");
  const [wordGoalPerSession, setWordGoalPerSession] = useState("500");
  const [frequency, setFrequency] = useState("flexible");
  const [pomoDuration, setPomoDuration] = useState(25);
  const [narrativeTemplate, setNarrativeTemplate] = useState<NarrativeTemplate>("libre");

  const stepIndex = STEPS.indexOf(step);

  function next() {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  }

  function prev() {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  }

  async function skipToApp() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ onboarding_done: true, persona: "avance" })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);
    router.push("/");
  }

  const [createdIds, setCreatedIds] = useState<{ projectId: string; novelId: string } | null>(null);

  async function createProjectAndGoFinal() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Update profile (persona + pomo_duration + onboarding_done stays false until final choice)
    await supabase
      .from("profiles")
      .update({ persona: persona ?? "debutant", pomo_duration: pomoDuration })
      .eq("id", user.id);

    // Create project
    const { data: project } = await supabase
      .from("projects")
      .insert({ user_id: user.id, title: projectTitle.trim() || "Mon projet", genre })
      .select("id")
      .single();

    if (!project) { setSaving(false); return; }

    const { data: novel } = await supabase
      .from("novels")
      .insert({
        project_id: project.id,
        user_id: user.id,
        title: "Mon roman",
        narrative_template: narrativeTemplate,
        word_goal: parseInt(wordGoalPerSession) * 120 || 60000,
        is_active: true,
      })
      .select("id")
      .single();

    if (novel) {
      await supabase
        .from("chapters")
        .insert({ novel_id: novel.id, user_id: user.id, title: "Chapitre 1", position: 0 });
      setCreatedIds({ projectId: project.id, novelId: novel.id });
    }

    setSaving(false);
    setStep("final");
  }

  async function finishOnboarding(destination: "editor" | "characters" | "planning") {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark onboarding done — l'achievement « Première ligne » est posé
    // séparément côté gamification (V2). Pour V1 on se contente du flag.
    await supabase
      .from("profiles")
      .update({ onboarding_done: true })
      .eq("id", user.id);

    if (!createdIds) { router.push("/"); return; }

    if (destination === "editor") router.push(`/editor/${createdIds.novelId}`);
    else if (destination === "characters") router.push(`/wb/${createdIds.projectId}`);
    else router.push(`/planning/${createdIds.novelId}`);
  }

  // Calculate estimated time
  const wordsPerSession = parseInt(wordGoalPerSession) || 500;
  const sessionsPerWeek = frequency === "daily" ? 7 : frequency === "weekdays" ? 5 : frequency === "weekends" ? 2 : 3;
  const wordsPerWeek = wordsPerSession * sessionsPerWeek;
  const weeksFor80k = Math.ceil(80000 / wordsPerWeek);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[520px]">

        {/* Progress bar */}
        {step !== "accueil" && step !== "final" && (
          <div className="flex gap-1.5 mb-8">
            {STEPS.slice(1, -1).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= STEPS.slice(1, -1).indexOf(step) ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}

        {/* ===== STEP: ACCUEIL ===== */}
        {step === "accueil" && (
          <div className="text-center">
            <h1 className="text-[28px] text-text-primary mb-3" style={{ fontFamily: "var(--font-serif)" }}>
              Bienvenue sur <span className="italic text-[var(--color-accent)]">Autris</span>
            </h1>
            <p className="text-[14px] text-text-secondary mb-1 leading-relaxed">
              L&apos;espace d&apos;écriture des romanciers francophones.
            </p>
            <p className="text-[14px] text-text-secondary mb-8 leading-relaxed">
              Quelques minutes pour configurer votre univers — vous pourrez tout modifier ensuite.
            </p>

            <button
              onClick={next}
              className="w-full h-11 bg-primary text-white rounded-[var(--radius-md)] text-[15px] font-medium cursor-pointer hover:bg-primary-dark transition-colors border-none mb-4"
            >
              Commencer la configuration
            </button>

            <button
              onClick={skipToApp}
              disabled={saving}
              className="text-[13px] text-text-tertiary hover:text-text-secondary cursor-pointer border-none bg-transparent transition-colors"
            >
              Je connais deja &rarr; aller directement a l&apos;editeur
            </button>

            <div className="flex justify-center gap-8 mt-10 pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-[18px] font-bold text-text-primary">5 min</div>
                <div className="text-[11px] text-text-quaternary">pour configurer</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-bold text-text-primary">3 mois</div>
                <div className="text-[11px] text-text-quaternary">d&apos;essai gratuit</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-bold text-text-primary">0 &euro;</div>
                <div className="text-[11px] text-text-quaternary">sans carte requise</div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP: PERSONA ===== */}
        {step === "persona" && (
          <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-1">
              Quel type d&apos;auteur etes-vous ?
            </h2>
            <p className="text-[13px] text-text-tertiary mb-6">
              Cela nous aide a adapter votre interface.
            </p>

            <div className="flex flex-col gap-2 mb-8">
              {PERSONAS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPersona(p.value)}
                  className={`text-left px-4 py-3.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                    persona === p.value
                      ? "bg-primary-bg border-primary-border"
                      : "bg-bg-secondary border-border hover:bg-bg-hover"
                  }`}
                >
                  <div className={`text-[14px] font-medium ${persona === p.value ? "text-primary" : "text-text-primary"}`}>
                    {p.label}
                  </div>
                  <div className="text-[12px] text-text-tertiary mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={prev}
                className="h-10 px-4 text-[13px] text-text-tertiary border border-border rounded-[var(--radius-md)] cursor-pointer bg-transparent hover:bg-bg-hover transition-colors"
              >
                Retour
              </button>
              <button
                onClick={next}
                disabled={!persona}
                className={`flex-1 h-10 text-[14px] font-medium rounded-[var(--radius-md)] border-none cursor-pointer transition-colors ${
                  persona
                    ? "bg-primary text-white hover:bg-primary-dark"
                    : "bg-border text-text-quaternary cursor-not-allowed"
                }`}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: PROJET ===== */}
        {step === "projet" && (
          <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-1">
              Votre premier projet
            </h2>
            <p className="text-[13px] text-text-tertiary mb-6">
              Un projet regroupe un univers, ses personnages et ses romans.
            </p>

            <div className="mb-4">
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                Titre du projet
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Ex : La Saga des Ombres"
                autoFocus
                className="w-full h-10 px-3 text-[14px] border border-border rounded-[var(--radius-md)] bg-bg-secondary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
              />
            </div>

            <div className="mb-8">
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                Genre principal
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGenre(g.value)}
                    className={`px-3 py-2.5 rounded-[var(--radius-md)] border text-left cursor-pointer transition-colors ${
                      genre === g.value
                        ? "bg-primary-bg border-primary-border"
                        : "bg-bg-secondary border-border hover:bg-bg-hover"
                    }`}
                  >
                    <span className="mr-1.5">{g.emoji}</span>
                    <span className={`text-[13px] ${genre === g.value ? "text-primary font-medium" : "text-text-secondary"}`}>
                      {g.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={prev}
                className="h-10 px-4 text-[13px] text-text-tertiary border border-border rounded-[var(--radius-md)] cursor-pointer bg-transparent hover:bg-bg-hover transition-colors"
              >
                Retour
              </button>
              <button
                onClick={next}
                disabled={!projectTitle.trim()}
                className={`flex-1 h-10 text-[14px] font-medium rounded-[var(--radius-md)] border-none cursor-pointer transition-colors ${
                  projectTitle.trim()
                    ? "bg-primary text-white hover:bg-primary-dark"
                    : "bg-border text-text-quaternary cursor-not-allowed"
                }`}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: TEMPLATE NARRATIF ===== */}
        {step === "template" && (
          <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-1">
              Une <span className="font-serif italic text-[var(--color-accent)]">structure</span> pour vous guider&nbsp;?
            </h2>
            <p className="text-[13px] text-text-tertiary mb-6">
              Choisissez un cadre narratif. Il préremplira votre planification — vous pourrez tout réécrire ou changer plus tard.
            </p>

            <div className="flex flex-col gap-2 mb-8">
              {NARRATIVE_TEMPLATES.map((t) => {
                const active = narrativeTemplate === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setNarrativeTemplate(t.value)}
                    className={`flex items-start gap-3 text-left px-4 py-3.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                      active
                        ? "bg-primary-bg border-primary-border"
                        : "bg-bg-secondary border-border hover:bg-bg-hover"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[14px] ${
                        active
                          ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent-border)]"
                          : "bg-white/[0.04] text-text-tertiary border border-border"
                      }`}
                    >
                      {t.badge}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[14px] font-medium ${active ? "text-primary" : "text-text-primary"}`}>
                        {t.label}
                      </div>
                      <div className="text-[12px] text-text-tertiary mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={prev}
                className="h-10 px-4 text-[13px] text-text-tertiary border border-border rounded-[var(--radius-md)] cursor-pointer bg-transparent hover:bg-bg-hover transition-colors"
              >
                Retour
              </button>
              <button
                onClick={next}
                className="flex-1 h-10 text-[14px] font-medium rounded-[var(--radius-md)] border-none cursor-pointer transition-colors bg-primary text-white hover:bg-primary-dark"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: OBJECTIFS ===== */}
        {step === "objectifs" && (
          <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-1">
              Vos objectifs d&apos;ecriture
            </h2>
            <p className="text-[13px] text-text-tertiary mb-6">
              Definissez votre rythme ideal. Tout est ajustable plus tard.
            </p>

            <div className="mb-4">
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                Mots par session
              </label>
              <input
                type="number"
                value={wordGoalPerSession}
                onChange={(e) => setWordGoalPerSession(e.target.value)}
                placeholder="500"
                className="w-full h-10 px-3 text-[14px] border border-border rounded-[var(--radius-md)] bg-bg-secondary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
              />
            </div>

            <div className="mb-4">
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                Frequence
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFrequency(f.value)}
                    className={`px-3 py-2.5 rounded-[var(--radius-md)] border text-[13px] cursor-pointer transition-colors ${
                      frequency === f.value
                        ? "bg-primary-bg border-primary-border text-primary font-medium"
                        : "bg-bg-secondary border-border text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                Duree Pomodoro
              </label>
              <div className="flex gap-1.5">
                {POMO_DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setPomoDuration(d)}
                    className={`flex-1 py-2 rounded-[var(--radius-md)] border text-[13px] cursor-pointer transition-colors ${
                      pomoDuration === d
                        ? "bg-primary-bg border-primary-border text-primary font-medium"
                        : "bg-bg-secondary border-border text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Estimation */}
            <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-4 mb-8">
              <div className="text-[12px] text-text-tertiary mb-1">A ce rythme, un roman de 80 000 mots prendrait environ</div>
              <div className="text-[20px] font-bold text-primary">
                {weeksFor80k} semaine{weeksFor80k > 1 ? "s" : ""}
              </div>
              <div className="text-[11px] text-text-quaternary mt-0.5">
                {wordsPerSession} mots &times; {sessionsPerWeek} session{sessionsPerWeek > 1 ? "s" : ""}/semaine = {wordsPerWeek.toLocaleString("fr-FR")} mots/semaine
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={prev}
                className="h-10 px-4 text-[13px] text-text-tertiary border border-border rounded-[var(--radius-md)] cursor-pointer bg-transparent hover:bg-bg-hover transition-colors"
              >
                Retour
              </button>
              <button
                onClick={createProjectAndGoFinal}
                disabled={saving}
                className="flex-1 h-10 text-[14px] font-medium rounded-[var(--radius-md)] border-none cursor-pointer transition-colors bg-primary text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Création…" : "Terminer"}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: FINAL ===== */}
        {step === "final" && (
          <div className="text-center">
            <div className="inline-block bg-primary-bg text-primary text-[12px] font-medium px-3 py-1 rounded-full mb-4">
              ◆ Première ligne
            </div>
            <h2 className="text-[24px] text-text-primary mb-2" style={{ fontFamily: "var(--font-serif)" }}>
              Votre espace est <span className="italic text-[var(--color-accent)]">prêt</span>.
            </h2>
            <p className="text-[14px] text-text-secondary mb-8 leading-relaxed">
              Par où commencez-vous ?
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => finishOnboarding("editor")}
                disabled={saving}
                className="flex flex-col items-center gap-2 p-4 bg-primary-bg border border-primary-border rounded-[var(--radius-md)] cursor-pointer hover:bg-primary/10 transition-colors disabled:opacity-60"
              >
                <span className="text-[28px]">✎</span>
                <span className="text-[13px] font-medium text-primary">Écrire</span>
                <span className="text-[11px] text-text-tertiary leading-tight">Démarrer le chapitre 1</span>
              </button>
              <button
                onClick={() => finishOnboarding("characters")}
                disabled={saving}
                className="flex flex-col items-center gap-2 p-4 bg-bg-secondary border border-border rounded-[var(--radius-md)] cursor-pointer hover:bg-bg-hover transition-colors disabled:opacity-60"
              >
                <span className="text-[28px]">◐</span>
                <span className="text-[13px] font-medium text-teal">Personnages</span>
                <span className="text-[11px] text-text-tertiary leading-tight">Bâtir votre univers</span>
              </button>
              <button
                onClick={() => finishOnboarding("planning")}
                disabled={saving}
                className="flex flex-col items-center gap-2 p-4 bg-bg-secondary border border-border rounded-[var(--radius-md)] cursor-pointer hover:bg-bg-hover transition-colors disabled:opacity-60"
              >
                <span className="text-[28px]">▦</span>
                <span className="text-[13px] font-medium text-amber">Planifier</span>
                <span className="text-[11px] text-text-tertiary leading-tight">Poser la structure</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
