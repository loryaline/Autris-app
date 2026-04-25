"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  if (success) {
    return (
      <div className="min-h-full flex items-center justify-center bg-bg-secondary">
        <div className="w-full max-w-[360px] mx-4">
          <div className="bg-bg-primary border border-border rounded-[var(--radius-lg)] p-5 text-center">
            <h2 className="text-[20px] text-text-primary mb-2" style={{ fontFamily: "var(--font-serif)" }}>
              Vérifiez votre <span className="italic text-[var(--color-accent)]">email</span>
            </h2>
            <p className="text-[13px] text-text-secondary">
              Un lien de confirmation a été envoyé à <strong>{email}</strong>.
              Cliquez dessus pour activer votre compte Autris.
            </p>
            <a
              href="/login"
              className="inline-block mt-4 text-[13px] text-primary font-medium"
            >
              Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-bg-secondary">
      <div className="w-full max-w-[360px] mx-4">
        <div className="text-center mb-6">
          <h1 className="text-[24px] text-text-primary" style={{ fontFamily: "var(--font-serif)" }}>
            <span className="italic text-[var(--color-accent)]">Autris</span>
          </h1>
          <p className="text-[13px] text-text-tertiary mt-1">
            L&apos;espace d&apos;écriture des romanciers francophones
          </p>
        </div>

        <div className="bg-bg-primary border border-border rounded-[var(--radius-lg)] p-5">
          <h2 className="text-[16px] font-medium text-text-primary mb-4">
            Créer un compte
          </h2>

          {error && (
            <div className="mb-3 p-2 rounded-[var(--radius-sm)] bg-red-bg text-red text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Nom d&apos;auteur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre pseudonyme"
                required
                className="w-full h-8 px-2.5 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                className="w-full h-8 px-2.5 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
                className="w-full h-8 px-2.5 text-[14px] border border-border rounded-[var(--radius-sm)] bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-primary-border focus:ring-1 focus:ring-primary-border"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-1"
              disabled={loading}
            >
              {loading ? "Création…" : "Créer mon compte"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-bg-primary px-2 text-[12px] text-text-tertiary">
                ou
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleSignup}
          >
            S&apos;inscrire avec Google
          </Button>

          <p className="text-center text-[12px] text-text-tertiary mt-4">
            Déjà un compte ?{" "}
            <a href="/login" className="text-primary font-medium">
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
