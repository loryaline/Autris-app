import type { Persona } from "@/types/database";

/**
 * Préférences d'interface dérivées du persona choisi à l'onboarding.
 *
 * Le persona n'est pas une donnée métier : c'est un curseur d'aide.
 * On le traduit ici en flags consommés par l'UI — jamais l'inverse.
 */
export interface PersonaPrefs {
  /** Niveau d'accompagnement global. */
  helpLevel: "high" | "normal" | "low";
  /** Afficher les incitations (nudges WB, alertes jalons). */
  showNudges: boolean;
  /** Afficher les conseils contextuels sous les titres d'écran. */
  showTips: boolean;
  /** Domaine mis en avant (étape finale de l'onboarding). */
  emphasis: "writing" | "planning" | "stats";
}

export function personaPrefs(
  persona: Persona | string | null | undefined,
): PersonaPrefs {
  switch (persona) {
    case "debutant":
      return { helpLevel: "high", showNudges: true, showTips: true, emphasis: "writing" };
    case "intermediaire_plan":
      return { helpLevel: "normal", showNudges: true, showTips: false, emphasis: "planning" };
    case "intermediaire_suivi":
      return { helpLevel: "normal", showNudges: true, showTips: false, emphasis: "stats" };
    case "avance":
      return { helpLevel: "low", showNudges: false, showTips: false, emphasis: "writing" };
    default:
      return { helpLevel: "normal", showNudges: true, showTips: false, emphasis: "writing" };
  }
}

/** Conseils contextuels par écran (affichés si `showTips`). */
export const PERSONA_TIPS = {
  dashboard:
    "Astuce : activez un roman avec ✦ pour qu'il pilote votre calendrier et vos objectifs.",
  editor:
    "Astuce : la barre d'outils flotte — glissez-la où vous voulez, ou ancrez-la sur un bord.",
  planning:
    "Astuce : cliquez sur la pastille de statut d'un chapitre pour le faire évoluer.",
  wb:
    "Astuce : commencez par une catégorie, créez quelques fiches, puis liez-les entre elles.",
} as const;
