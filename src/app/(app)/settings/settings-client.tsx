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
        <EmailField currentEmail={email} />
      </Section>

      {/* Sécurité */}
      <Section title="Sécurité">
        <PasswordField />
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

      {/* Contact / support */}
      <Section title="Aide & contact" subtitle="Une question, un bug, une demande ? On lit chaque message.">
        <a
          href="mailto:aline@autris.app?subject=Question%20support%20Autris&body=Bonjour%2C%0A%0A"
          className="inline-flex items-center gap-2 h-9 px-3 rounded-[var(--radius-sm)] border border-white/[0.08] bg-bg-primary text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer transition-colors no-underline self-start"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
            <path d="M1.5 4L7 8L12.5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Écrire à l&apos;équipe Autris
        </a>
        <p className="text-[11px] text-text-quaternary">
          Le bouton ouvre votre client mail (ou Gmail web, Outlook…) sur l&apos;adresse <span className="font-mono">aline@autris.app</span>.
        </p>
      </Section>

      {/* Liens légaux */}
      <Section title="Informations légales">
        <div className="flex items-center gap-3 text-[12.5px]">
          <a href="/legal/mentions" target="_blank" className="text-text-secondary hover:text-[var(--color-accent)] underline underline-offset-2">
            Mentions légales
          </a>
          <span className="text-text-quaternary">·</span>
          <a href="/legal/cgu" target="_blank" className="text-text-secondary hover:text-[var(--color-accent)] underline underline-offset-2">
            CGU
          </a>
          <span className="text-text-quaternary">·</span>
          <a href="/legal/confidentialite" target="_blank" className="text-text-secondary hover:text-[var(--color-accent)] underline underline-offset-2">
            Politique de confidentialité
          </a>
        </div>
      </Section>

      {/* Zone dangereuse */}
      <DangerZone username={profile.username} />

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

/* ============================================================ */
/*  Email change                                                  */
/* ============================================================ */

function EmailField({ currentEmail }: { currentEmail: string | null }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }
    setPending(true);
    setEditing(false);
    setSubmitting(false);
  }

  return (
    <Field label="Email">
      {!editing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 px-3 flex items-center text-[13px] text-text-tertiary border border-white/[0.06] rounded-[var(--radius-sm)] bg-white/[0.015]">
            {currentEmail ?? "—"}
          </div>
          <button
            onClick={() => {
              setEditing(true);
              setNewEmail(currentEmail ?? "");
            }}
            className="h-9 px-3 text-[12px] text-text-secondary border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary hover:bg-bg-hover cursor-pointer transition-colors"
          >
            Changer
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nouveau@email.fr"
            className="w-full h-9 px-3 text-[13px] border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary text-text-primary focus:outline-none focus:border-[var(--color-accent-border)]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !newEmail.trim() || newEmail === currentEmail}
              className={`h-8 px-3 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${
                submitting || !newEmail.trim() || newEmail === currentEmail
                  ? "bg-white/[0.05] text-text-quaternary cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-dark cursor-pointer"
              }`}
            >
              {submitting ? "Envoi…" : "Envoyer le lien"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="h-8 px-3 rounded-[var(--radius-sm)] text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              Annuler
            </button>
          </div>
          {error && <p className="text-[11px] text-red">{error}</p>}
        </div>
      )}
      {pending && (
        <p className="text-[11px] text-teal-dark mt-1.5">
          ✓ Un lien de confirmation vous a été envoyé. Cliquez dessus pour valider le nouvel email.
        </p>
      )}
      {!pending && !editing && (
        <p className="text-[11px] text-text-quaternary mt-1">
          Le changement passe par un lien de confirmation envoyé à la nouvelle adresse.
        </p>
      )}
    </Field>
  );
}

/* ============================================================ */
/*  Password change                                               */
/* ============================================================ */

function PasswordField() {
  const [editing, setEditing] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (pwd.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (pwd !== pwdConfirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password: pwd });
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }
    setDone(true);
    setEditing(false);
    setPwd("");
    setPwdConfirm("");
    setSubmitting(false);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <Field label="Mot de passe">
      {!editing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 px-3 flex items-center text-[13px] text-text-tertiary border border-white/[0.06] rounded-[var(--radius-sm)] bg-white/[0.015]">
            ••••••••
          </div>
          <button
            onClick={() => setEditing(true)}
            className="h-9 px-3 text-[12px] text-text-secondary border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary hover:bg-bg-hover cursor-pointer transition-colors"
          >
            Changer
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Nouveau mot de passe (min. 8 caractères)"
            className="w-full h-9 px-3 text-[13px] border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary text-text-primary focus:outline-none focus:border-[var(--color-accent-border)]"
          />
          <input
            type="password"
            value={pwdConfirm}
            onChange={(e) => setPwdConfirm(e.target.value)}
            placeholder="Confirmer"
            className="w-full h-9 px-3 text-[13px] border border-white/[0.08] rounded-[var(--radius-sm)] bg-bg-primary text-text-primary focus:outline-none focus:border-[var(--color-accent-border)]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !pwd}
              className={`h-8 px-3 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${
                submitting || !pwd
                  ? "bg-white/[0.05] text-text-quaternary cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-dark cursor-pointer"
              }`}
            >
              {submitting ? "Mise à jour…" : "Mettre à jour"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setPwd("");
                setPwdConfirm("");
                setError(null);
              }}
              className="h-8 px-3 rounded-[var(--radius-sm)] text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              Annuler
            </button>
          </div>
          {error && <p className="text-[11px] text-red">{error}</p>}
        </div>
      )}
      {done && (
        <p className="text-[11px] text-teal-dark mt-1.5">
          ✓ Mot de passe mis à jour.
        </p>
      )}
    </Field>
  );
}

/* ============================================================ */
/*  Danger zone — soft delete RGPD                                */
/* ============================================================ */

function DangerZone({ username }: { username: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phrase de confirmation : « SUPPRIMER » (volontairement frictionnel)
  const expected = "SUPPRIMER";
  const matches = confirmText.trim().toUpperCase() === expected;

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expirée.");
      setSubmitting(false);
      return;
    }

    // Soft delete : on marque le profil. Une routine côté serveur (cron / edge
    // function) procédera à la purge définitive après 30 jours.
    const { error: err } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", user.id);

    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?deleted=1");
    router.refresh();
  }

  return (
    <div className="mb-6 mt-10 pt-6 border-t border-red/15">
      <div className="text-[10px] font-medium text-red uppercase mb-2" style={{ letterSpacing: "0.16em" }}>
        Zone dangereuse
      </div>
      <div className="rounded-[var(--radius-md)] border border-red/20 bg-red/[0.04] p-4">
        <div className="text-[13px] text-text-primary mb-1 font-medium">
          Supprimer mon compte
        </div>
        <p className="text-[12px] text-text-tertiary mb-3 leading-relaxed">
          Vos romans, fiches univers, planifications et statistiques seront marqués pour suppression.
          Vous avez <span className="font-medium text-text-secondary">30 jours</span> pour annuler en
          écrivant à <a href="mailto:aline@autris.app?subject=Demande%20d%27annulation%20de%20suppression%20de%20compte&body=Bonjour%2C%0A%0AJ%27aimerais%20annuler%20la%20suppression%20de%20mon%20compte%20Autris.%0A%0AEmail%20du%20compte%20%3A%20%0A%0AMerci%20%21" className="text-[var(--color-accent)] underline">l&apos;équipe Autris</a>.
          Au-delà, tout est définitivement effacé.
        </p>

        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="h-8 px-3 rounded-[var(--radius-sm)] text-[12px] text-red border border-red/30 bg-transparent hover:bg-red/10 cursor-pointer transition-colors"
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="text-[12px] text-text-secondary">
              Pour confirmer, tapez <span className="font-mono text-red">{expected}</span> ci-dessous
              {username && (
                <>
                  {" — "}
                  <span className="text-text-tertiary">au revoir, {username}.</span>
                </>
              )}
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expected}
              className="w-full h-9 px-3 text-[13px] border border-red/30 rounded-[var(--radius-sm)] bg-bg-primary text-text-primary focus:outline-none focus:border-red font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={!matches || submitting}
                className={`h-8 px-3 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${
                  matches && !submitting
                    ? "bg-red text-white hover:bg-red/90 cursor-pointer"
                    : "bg-white/[0.05] text-text-quaternary cursor-not-allowed"
                }`}
              >
                {submitting ? "Suppression…" : "Supprimer définitivement"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setError(null);
                }}
                className="h-8 px-3 rounded-[var(--radius-sm)] text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer"
              >
                Annuler
              </button>
            </div>
            {error && <p className="text-[11px] text-red">{error}</p>}
          </div>
        )}
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
