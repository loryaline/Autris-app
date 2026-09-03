"use client";

import { useEffect, useState } from "react";

/**
 * La surface sur laquelle Autris est en train de tourner.
 *
 * Deux questions, pas une :
 *
 * 1. **Combien de place ?** — pour décider ce qui tient à l'écran.
 * 2. **Le doigt est-il disponible ?** — pour décider comment on vise.
 *
 * Elles sont indépendantes, et les confondre est l'erreur classique. Un
 * iPad avec Magic Keyboard a un trackpad : il se déclare `pointer: fine`
 * comme un ordinateur, alors que l'écran reste tactile à tout moment.
 * D'où `any-pointer: coarse` — « le tactile existe-t-il ? » — et non
 * `pointer: coarse` — « est-il le moyen principal ? ».
 *
 * Les seuils : le téléphone s'arrête où l'iPad Mini commence (744 px en
 * portrait), et le bureau commence au-delà de l'iPad Pro 11 pouces en
 * paysage. Un iPad Pro 13 en paysage fait 1366 px : il reçoit la mise en
 * page bureau, ce qui est bien — avec le tactile en plus, que `hasTouch`
 * signale.
 */

export const PHONE_MAX = 767;
export const TABLET_MAX = 1279;

export interface Viewport {
  width: number;
  /** Téléphone : la navigation passe en bas, le plateau n'est pas proposé. */
  isPhone: boolean;
  /** Tablette : tout est disponible, les panneaux se superposent. */
  isTablet: boolean;
  isDesktop: boolean;
  /** L'écran accepte le doigt — même si une souris est branchée. */
  hasTouch: boolean;
}

/** Valeur avant hydratation : le bureau, cas le plus courant. */
const SSR: Viewport = {
  width: 1440,
  isPhone: false,
  isTablet: false,
  isDesktop: true,
  hasTouch: false,
};

function read(): Viewport {
  const width = window.innerWidth;
  return {
    width,
    isPhone: width <= PHONE_MAX,
    isTablet: width > PHONE_MAX && width <= TABLET_MAX,
    isDesktop: width > TABLET_MAX,
    hasTouch: window.matchMedia("(any-pointer: coarse)").matches,
  };
}

export function useViewport(): Viewport {
  // Pas de mesure au premier rendu : le serveur ne connaît pas l'écran, et
  // lire `window` ici produirait une différence d'hydratation.
  const [vp, setVp] = useState<Viewport>(SSR);

  useEffect(() => {
    const update = () =>
      setVp((prev) => {
        const next = read();
        // Comparaison champ à champ : sans ça, chaque pixel de
        // redimensionnement crée un objet neuf et refait rendre l'arbre.
        return prev.width === next.width && prev.hasTouch === next.hasTouch
          ? prev
          : next;
      });

    update();
    window.addEventListener("resize", update);
    const coarse = window.matchMedia("(any-pointer: coarse)");
    coarse.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      coarse.removeEventListener("change", update);
    };
  }, []);

  return vp;
}
