"use client";

import { useEffect, useState } from "react";
import { useViewport } from "@/lib/useViewport";

/**
 * Sélecteur de thème flottant — redesign phase 1.
 *
 * Trois univers (fantasy / sf / corporate) × deux modes (light / dark),
 * appliqués sur <html> via les attributs data-theme / data-mode. Le
 * choix est persisté dans localStorage et ré-appliqué avant le premier
 * paint par le script inline du RootLayout (anti-flash).
 *
 * La barre peut être réduite en une pastille flottante près du bouton
 * de feedback (état persisté dans localStorage).
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
  const { isPhone } = useViewport();
  // null tant que non-hydraté → on ne rend rien côté serveur pour
  // éviter un mismatch (le vrai état vit sur <html>, pas dans React).
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [mode, setMode] = useState<ModeId | null>(null);
  const [minimized, setMinimized] = useState<boolean | null>(null);

  // Hydratation : on lit l'état réel posé sur <html> (par le script
  // anti-flash du RootLayout) + l'état réduit/déplié depuis localStorage.
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
      let min = false;
      try {
        min = localStorage.getItem("autris.themebar") === "min";
      } catch {
        /* localStorage indisponible */
      }
      setMinimized(min);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Synchronisation état React → DOM + localStorage.
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

  useEffect(() => {
    if (minimized === null) return;
    try {
      localStorage.setItem("autris.themebar", minimized ? "min" : "open");
    } catch {
      /* idem */
    }
  }, [minimized]);

  if (theme === null || mode === null || minimized === null) return null;

  // Pas sur téléphone : les deux variantes sont posées en bas de l'écran,
  // exactement où vit la barre de navigation. Et sur 375 px, une pastille
  // flottante de plus mange une place qu'il n'y a pas.
  if (isPhone) return null;

  // Réduite : pastille flottante près du bouton de feedback.
  if (minimized) {
    return (
      <button
        type="button"
        className="theme-bar-mini"
        title="Choix du thème"
        aria-label="Afficher le sélecteur de thème"
        onClick={() => setMinimized(false)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9 2a7 7 0 000 14z" fill="currentColor" />
        </svg>
      </button>
    );
  }

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
      <div className="theme-divider" />
      <button
        type="button"
        className="theme-min-btn"
        onClick={() => setMinimized(true)}
        title="Réduire"
        aria-label="Réduire le sélecteur de thème"
      >
        −
      </button>
    </div>
  );
}
