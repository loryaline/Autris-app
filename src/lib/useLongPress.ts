"use client";

import { useCallback, useRef } from "react";

/**
 * L'appui long, équivalent tactile du clic droit.
 *
 * Il n'y a pas de second bouton sur un doigt. Partout où Autris ouvre un
 * menu au clic droit, l'écran tactile n'a donc aucun moyen d'y accéder —
 * la fonctionnalité existe mais reste hors d'atteinte.
 *
 * Deux garde-fous, qui font toute la différence entre un appui long utile
 * et un menu qui surgit sans qu'on l'ait demandé :
 *
 *   - le doigt doit rester à peu près immobile ; s'il glisse, c'est un
 *     défilement ou un déplacement, pas une intention d'ouvrir un menu ;
 *   - seul le tactile déclenche. À la souris, le clic droit existe déjà,
 *     et transformer un clic maintenu en menu contextuel serait une
 *     surprise désagréable.
 */

const DELAI_MS = 500;
/** Au-delà, le doigt a glissé : ce n'était pas un appui. */
const TOLERANCE_PX = 10;

export function useLongPress(
  onLongPress: (e: { clientX: number; clientY: number }) => void,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const annuler = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const { clientX, clientY } = e;
      origin.current = { x: clientX, y: clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        onLongPress({ clientX, clientY });
      }, DELAI_MS);
    },
    [onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!origin.current || !timer.current) return;
      const dx = Math.abs(e.clientX - origin.current.x);
      const dy = Math.abs(e.clientY - origin.current.y);
      if (dx > TOLERANCE_PX || dy > TOLERANCE_PX) annuler();
    },
    [annuler],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: annuler,
    onPointerCancel: annuler,
  };
}
