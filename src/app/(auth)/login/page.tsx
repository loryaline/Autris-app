"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect."
        : error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
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
            Connexion
          </h2>

          {error && (
            <div className="mb-3 p-2 rounded-[var(--radius-sm)] bg-red-bg text-red text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
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
                placeholder="••••••••"
                required
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
              {loading ? "Connexion…" : "Se connecter"}
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
            onClick={handleGoogleLogin}
          >
            Continuer avec Google
          </Button>

          <p className="text-center text-[12px] text-text-tertiary mt-4">
            Pas encore de compte ?{" "}
            <a href="/signup" className="text-primary font-medium">
              S&apos;inscrire
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
