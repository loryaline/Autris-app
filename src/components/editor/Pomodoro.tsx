"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pomodoro minimaliste pour l'éditeur.
 *
 * - Durée lue depuis profiles.pomo_duration (passée en prop), avec fallback
 *   localStorage en cas d'échec de chargement, puis 25 min en dernier recours.
 * - L'état (start timestamp + duration en secondes) est persisté dans
 *   localStorage pour survivre à un refresh ou à un changement de chapitre.
 * - À l'expiration : notification système si l'utilisateur a accordé la
 *   permission, plus un beep court via WebAudio (silencieux si onglet muet).
 * - Pas de boucle de pauses longues — V1 délibérément simple. On verra V2
 *   pour les sessions enchaînées (4 × écriture + pause longue).
 */

const STORAGE_KEY = "autris.pomodoro.session";

type Persisted = {
  /** Epoch ms du démarrage. */
  startedAt: number;
  /** Durée totale (secondes) de la session en cours. */
  durationSec: number;
  /** Si true, le timer est mis en pause — `pausedAt` indique le moment. */
  paused: boolean;
  pausedAt: number | null;
  /** Total cumulé du temps déjà écoulé en pause(s) précédente(s) (ms). */
  pausedAccumMs: number;
};

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(p: Persisted | null) {
  if (typeof window === "undefined") return;
  if (p === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function formatTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function playBeep() {
  try {
    type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
    const w = window as WindowWithWebkit;
    const Ctx = window.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.type = "sine";
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 350);
  } catch {
    /* silent */
  }
}

function notifyDone(duration: number) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("Pomodoro terminé", {
      body: `${duration} minutes d'écriture. Vous pouvez souffler.`,
      silent: false,
    });
  } catch {
    /* silent */
  }
}

export function Pomodoro({ defaultDuration }: { defaultDuration: number }) {
  // durée actuellement sélectionnée (minutes)
  const [duration, setDuration] = useState<number>(() => {
    if (typeof window === "undefined") return defaultDuration;
    const stored = localStorage.getItem("autris.pomodoro.duration");
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 5 && parsed <= 120) return parsed;
    }
    return defaultDuration;
  });

  const [session, setSession] = useState<Persisted | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [showMenu, setShowMenu] = useState(false);
  const [doneFlash, setDoneFlash] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate depuis localStorage au mount (évite l'hydration mismatch SSR).
  // Le setState est différé hors de la phase synchrone de l'effet pour
  // satisfaire react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSession(readPersisted());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick 1s tant qu'une session est active et non en pause
  useEffect(() => {
    if (!session || session.paused) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [session]);

  // Calcul du temps restant
  const remainingMs = session
    ? session.durationSec * 1000
      - ((session.paused ? (session.pausedAt ?? now) : now) - session.startedAt - session.pausedAccumMs)
    : duration * 60 * 1000;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

  // Détection de l'expiration
  const finishSession = useCallback(() => {
    setSession(null);
    writePersisted(null);
    setDoneFlash(true);
    setTimeout(() => setDoneFlash(false), 6000);
    playBeep();
    notifyDone(duration);
  }, [duration]);

  useEffect(() => {
    if (!session || session.paused || remainingMs > 0) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) finishSession();
    });
    return () => {
      cancelled = true;
    };
  }, [session, remainingMs, finishSession]);

  function start() {
    // Si Notification API dispo et statut "default", on demande la permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
    const next: Persisted = {
      startedAt: Date.now(),
      durationSec: duration * 60,
      paused: false,
      pausedAt: null,
      pausedAccumMs: 0,
    };
    setSession(next);
    writePersisted(next);
    setNow(Date.now());
  }

  function pauseOrResume() {
    if (!session) return;
    if (session.paused) {
      // resume : on accumule le temps passé en pause
      const extra = Date.now() - (session.pausedAt ?? Date.now());
      const next: Persisted = {
        ...session,
        paused: false,
        pausedAt: null,
        pausedAccumMs: session.pausedAccumMs + extra,
      };
      setSession(next);
      writePersisted(next);
    } else {
      const next: Persisted = { ...session, paused: true, pausedAt: Date.now() };
      setSession(next);
      writePersisted(next);
    }
  }

  function stop() {
    setSession(null);
    writePersisted(null);
  }

  function pickDuration(d: number) {
    setDuration(d);
    if (typeof window !== "undefined") {
      localStorage.setItem("autris.pomodoro.duration", String(d));
    }
    setShowMenu(false);
    // si une session est active, on l'annule (changer la durée d'une session
    // en cours est ambigu — plus simple de redémarrer manuellement)
    if (session) {
      setSession(null);
      writePersisted(null);
    }
  }

  // Progress ring 14px (idle = vide, running = remplissage)
  const totalSec = session ? session.durationSec : duration * 60;
  const progress = session ? 1 - remainingSec / Math.max(1, totalSec) : 0;
  const C = 2 * Math.PI * 6; // r=6
  const dashOffset = C * (1 - progress);

  const PRESETS = [15, 20, 25, 30, 45, 60];

  const running = !!session && !session.paused;
  const paused = !!session && session.paused;

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => {
          if (!session) start();
          else pauseOrResume();
        }}
        title={
          running
            ? "Mettre en pause"
            : paused
              ? "Reprendre"
              : `Démarrer un pomodoro de ${duration} min`
        }
        className={`inline-flex items-center gap-1.5 h-6 pl-1 pr-2 rounded-full border text-[11px] cursor-pointer transition-colors ${
          running
            ? "bg-[var(--color-accent-bg)] border-[var(--color-accent-border)] text-[var(--color-accent)]"
            : paused
              ? "bg-amber-bg border-amber/30 text-amber"
              : doneFlash
                ? "bg-teal-bg border-teal-border text-teal-dark"
                : "bg-transparent border-border text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
        }`}
      >
        {/* Icône / progress ring */}
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" />
          {session && (
            <circle
              cx="7"
              cy="7"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 7 7)"
            />
          )}
          {!session && (
            // petit triangle play
            <path d="M5.5 4.5L9.5 7L5.5 9.5Z" fill="currentColor" />
          )}
        </svg>

        <span className="font-mono tabular-nums">
          {formatTime(remainingSec)}
        </span>

        {paused && <span className="text-[9px] uppercase tracking-wider">pause</span>}
        {doneFlash && !session && <span className="text-[9px] uppercase tracking-wider">terminé</span>}
      </button>

      {/* Bouton chevron / settings */}
      <button
        onClick={() => setShowMenu((v) => !v)}
        title="Durée du pomodoro" aria-label="Durée du pomodoro"
        className="ml-1 h-6 w-5 flex items-center justify-center rounded text-text-quaternary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Bouton stop si session active */}
      {session && (
        <button
          onClick={stop}
          title="Arrêter le pomodoro" aria-label="Arrêter le pomodoro"
          className="ml-0.5 h-6 w-5 flex items-center justify-center rounded text-text-quaternary hover:text-red hover:bg-red-bg transition-colors cursor-pointer"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <rect x="2" y="2" width="4" height="4" rx="0.5" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Dropdown durées */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-full right-0 mt-1 z-50 min-w-[140px] bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-md)] shadow-xl py-1">
            <div className="px-2.5 py-1 text-[10px] uppercase text-text-quaternary tracking-wider">
              Durée
            </div>
            {PRESETS.map((d) => (
              <button
                key={d}
                onClick={() => pickDuration(d)}
                className={`w-full text-left px-2.5 py-1 text-[12px] cursor-pointer transition-colors ${
                  duration === d
                    ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                    : "text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {d} min{duration === d ? " ✓" : ""}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
