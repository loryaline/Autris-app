"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Persona, Plan } from "@/types/database";

interface ProfileData {
  id: string;
  username: string | null;
  persona: Persona | null;
  plan: Plan;
  pomo_duration: number;
  trial_started_at: string;
  plan_expires_at: string;
  onboarding_done: boolean;
  created_at: string;
}

const PERSONAS: { value: Persona; label: string; desc: string }[] = [
  { value: "debutant",            label: "Explorateur",   desc: "J'ai besoin d'être guidé." },
  { value: "intermediaire_plan",  label: "Planificateur", desc: "J'aime structurer avant d'écrire." },
  { value: "intermediaire_suivi", label: "Marathonien",   desc: "Je veux suivre ma progression." },
  { value: "avance",              label: "Autonome",      desc: "Je sais ce que je fais." },
];

const POMO_DURATIONS = [15, 20, 25, 30, 45, 60];

const PLAN_LABEL: Record<Plan, string> = {
  free:        "Essai gratuit",
  pro_monthly: "Pro · mensuel",
  pro_annual:  "Pro · annuel",
};

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SettingsClient({
  email,
  profile,
}: {
  email: string | null;
  profile: ProfileData;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username ?? "");
  const [persona, setPersona] = useState<Persona>(profile.persona ?? "debutant");
  const [pomoDuration, setPomoDuration] = useState<number>(profile.pomo_duration);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trialDaysLeft = daysUntil(profile.plan_expires_at);
  const trialActive = profile.plan === "free" && trialDaysLeft > 0;
  const trialExpired = profile.plan === "free" && trialDaysLeft <= 0;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: username.trim() || null,
        persona,
        pomo_duration: pomoDuration,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2400);
    router.refresh();
  }

  const dirty =
    username !== (profile.username ?? "") ||
    persona !== (profile.persona ?? "debutant") ||
    pomoDuration !== profile.pomo_duration;

  return (
    <div className="px-6 py-5 max-w-[680px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-medium text-text-quaternary uppercase mb-1" style={{ letterSpacing: "0.18em" }}>
          Compte
        </div>
        <h1 className="text-[24px] text-text-primary leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
          Vos <span className="italic text-[var(--color-accent)]">paramètres</span>
        </h1>
        <p className="text-[13px] text-text-tertiary mt-1">
          Réglez votre identité d&apos;auteur, votre rythme et votre offre.
        </p>
      </div>

      {/* Identité */}
      <Section title="Identité">
        <Field label="Nom d'auteur">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Votre pseudonyme"
            className="w-full h-9 px-3 text-[13px] border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-[var(--color-accent-border)]"
          />
        </Field>
        <Field label="Email">
          <div className="h-9 px-3 flex items-center text-[13px] text-text-tertiary border border-white/[0.06] rounded-[var(--radius-sm)] bg-white/[0.015]">
            {email ?? "—"}
          </div>
          <p className="text-[11px] text-text-quaternary mt-1">
            Le changement d&apos;email passera par un lien de confirmation (à venir).
          </p>
        </Field>
      </Section>

      {/* Profil d'auteur */}
      <Section title="Profil d'auteur" subtitle="Adapte les conseils et l'interface — modifiable à tout moment.">
        <div className="grid grid-cols-2 gap-2">
          {PERSONAS.map((p) => {
            const active = persona === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setPersona(p.value)}
                className={`text-left px-3 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                  active
                    ? "bg-primary-bg border-primary-border"
                    : "bg-bg-primary border-white/[0.08] hover:bg-bg-hover"
                }`}
              >
                <div className={`text-[13px] font-medium ${active ? "text-primary" : "text-text-primary"}`}>
                  {p.label}
                </div>
                <div className="text-[11px] text-text-tertiary mt-0.5">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Rythme */}
      <Section title="Rythme" subtitle="Durée d'un pomodoro dans l'éditeur.">
        <div className="flex gap-1.5">
          {POMO_DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setPomoDuration(d)}
              className={`flex-1 py-2 rounded-[var(--radius-sm)] border text-[13px] cursor-pointer transition-colors ${
                pomoDuration === d
                  ? "bg-primary-bg border-primary-border text-primary font-medium"
                  : "bg-bg-primary border-white/[0.08] text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </Section>

      {/* Abonnement */}
      <Section title="Abonnement">
        <div className="rounded-[var(--radius-md)] border border-white/[0.06] bg-bg-primary p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] text-text-primary font-medium">
              {PLAN_LABEL[profile.plan]}
            </div>
            {trialActive && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent-border)]">
                {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}
              </span>
            )}
            {trialExpired && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-bg text-amber border border-amber/30">
                Essai terminé
              </span>
            )}
          </div>
          <div className="text-[11px] text-text-tertiary">
            Essai démarré le {formatDate(profile.trial_started_at)}
            <br />
            {trialActive
              ? `Fin de l'essai le ${formatDate(profile.plan_expires_at)}.`
              : trialExpired
                ? "Réabonnez-vous pour continuer à publier des chapitres."
                : `Renouvellement le ${formatDate(profile.plan_expires_at)}.`}
          </div>
          <button
            disabled
            className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/[0.08] text-text-quaternary text-[12px] cursor-not-allowed"
            title="Stripe arrive en V1 finale"
          >
            Gérer mon abonnement (bientôt)
          </button>
        </div>
      </Section>

      {/* Sauvegarde */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-gradient-to-t from-bg-secondary via-bg-secondary to-transparent flex items-center justify-end gap-2">
        {error && (
          <span className="mr-auto text-[12px] text-red">{error}</span>
        )}
        {saved && (
          <span className="mr-auto text-[12px] text-teal-dark">✓ enregistré</span>
        )}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`h-9 px-4 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors ${
            dirty && !saving
              ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] cursor-pointer"
              : "bg-white/[0.05] text-text-quaternary cursor-not-allowed"
          }`}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-medium text-text-quaternary uppercase mb-2" style={{ letterSpacing: "0.16em" }}>
        {title}
      </div>
      {subtitle && (
        <div className="text-[12px] text-text-tertiary mb-3">{subtitle}</div>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
