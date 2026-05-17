"use client";

import { useEffect, useState } from "react";

/**
 * Sélecteur de thème flottant — redesign phase 1.
 *
 * Trois univers (fantasy / sf / corporate) × deux modes (light / dark),
 * appliqués sur <html> via les attributs data-theme / data-mode. Le
 * choix est persisté dans localStorage et ré-appliqué avant le premier
 * paint par le script inline du RootLayout (anti-flash).
 *
 * Phase 1 : on ne touche à aucun composant — la couche d'alias CSS
 * (--color-* → tokens de thème) rend toute l'app theme-réactive.
 */

type ThemeId = "fantasy" | "sf" | "corporate";
type ModeId = "light" | "dark";

const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "fantasy", label: "Fantasy", swatch: "#e4b48c" },
  { id: "sf", label: "SF", swatch: "#62e6ff" },
  { id: "corporate", label: "Corporate", swatch: "#7c8aff" },
];

function readAttr(name: "theme" | "mode"): string | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.dataset[name] ?? null;
}

export function ThemeBar() {
  // null tant que non-hydraté → on ne rend rien côté serveur pour
  // éviter un mismatch (le vrai état vit sur <html>, pas dans React).
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [mode, setMode] = useState<ModeId | null>(null);

  // Hydratation : on lit l'état réel posé sur <html> (par le script
  // anti-flash du RootLayout) une seule fois au montage. setState
  // différé hors de la phase synchrone de l'effet.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const t = readAttr("theme");
      const m = readAttr("mode");
      setTheme(
        t === "fantasy" || t === "sf" || t === "corporate" ? t : "fantasy",
      );
      setMode(m === "light" || m === "dark" ? m : "dark");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Synchronisation état React → DOM + localStorage. Effet séparé des
  // handlers de clic pour rester conforme aux règles de pureté React
  // (pas de mutation du DOM hors effet).
  useEffect(() => {
    if (theme === null) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("autris.theme", theme);
    } catch {
      /* localStorage indisponible — non bloquant */
    }
  }, [theme]);

  useEffect(() => {
    if (mode === null) return;
    document.documentElement.dataset.mode = mode;
    try {
      localStorage.setItem("autris.mode", mode);
    } catch {
      /* idem */
    }
  }, [mode]);

  if (theme === null || mode === null) return null;

  return (
    <div className="theme-bar" role="group" aria-label="Choix du thème">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-pill-btn${theme === t.id ? " active" : ""}`}
          onClick={() => setTheme(t.id)}
        >
          <span className="swatch" style={{ background: t.swatch }} />
          {t.label}
        </button>
      ))}
      <div className="theme-divider" />
      <button
        type="button"
        className={`theme-pill-btn${mode === "light" ? " active" : ""}`}
        onClick={() => setMode("light")}
        title="Mode clair"
        aria-label="Mode clair"
      >
        ☀
      </button>
      <button
        type="button"
        className={`theme-pill-btn${mode === "dark" ? " active" : ""}`}
        onClick={() => setMode("dark")}
        title="Mode sombre"
        aria-label="Mode sombre"
      >
        ☾
      </button>
    </div>
  );
}
