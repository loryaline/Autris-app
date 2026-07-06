"use client";

import { useRouter, usePathname } from "next/navigation";

/**
 * Bandeau de démarrage — affiché au persona « Explorateur ». Rendu
 * côté client pour que le bouton « Créer mon premier projet » puisse
 * émettre l'événement autris:new-project quand on est déjà sur le
 * dashboard (sinon le DashboardClient ne se remonte pas et rien
 * n'ouvrirait le modal).
 */
export function FirstStepsBanner({ hasProjects }: { hasProjects: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  function openNewProject() {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("autris:new-project"));
    } else {
      router.push("/?new=project");
    }
  }

  return (
    <div
      className="rd-fade-in"
      style={{
        padding: "14px 18px",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--accent-border)",
        background: "var(--accent-bg)",
      }}
    >
      <div className="rd-eyebrow" style={{ color: "var(--accent)", marginBottom: 6 }}>
        Premiers pas
      </div>
      <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
        Bienvenue sur Autris. Trois étapes pour démarrer : <strong>1.</strong> créez un
        projet · <strong>2.</strong> esquissez votre univers · <strong>3.</strong>{" "}
        planifiez vos chapitres, puis lancez-vous dans l&apos;écriture.
      </div>
      {!hasProjects && (
        <button
          type="button"
          onClick={openNewProject}
          className="rd-btn rd-btn-sm rd-btn-primary"
          style={{ marginTop: 10 }}
        >
          Créer mon premier projet
        </button>
      )}
    </div>
  );
}
