/**
 * Le squelette d'une page en cours de chargement.
 *
 * Chaque page d'Autris est un composant serveur qui interroge Supabase
 * avant de rendre quoi que ce soit. Sans frontière de chargement, le
 * routeur garde l'ancienne page à l'écran, figée, jusqu'à ce que la
 * nouvelle soit entièrement prête : on clique, et pendant une seconde
 * rien ne prouve que le clic a été reçu. On reclique.
 *
 * Un `loading.tsx` par route change cela du tout au tout : la transition
 * démarre à l'instant du clic. La page n'arrive pas plus vite, mais elle
 * cesse de donner l'impression de ne pas arriver.
 *
 * Le squelette n'apparaît qu'après 150 ms (cf. `.rd-skel-page`) : en
 * dessous, un affichage qui surgit et disparaît aussitôt se lit comme un
 * clignotement, plus désagréable que l'attente qu'il masque.
 */

export function PageSkeleton({
  /** Hauteur du bandeau de titre, 0 pour l'omettre. */
  titleWidth = 260,
  /** Nombre de blocs sous le titre. */
  blocks = 3,
}: {
  titleWidth?: number;
  blocks?: number;
}) {
  return (
    <div
      className="rd-skel-page"
      style={{ padding: "28px 0" }}
      role="status"
      aria-label="Chargement de la page"
    >
      {titleWidth > 0 && (
        <div
          className="rd-skel"
          style={{ height: 26, width: titleWidth, marginBottom: 10 }}
        />
      )}
      <div
        className="rd-skel"
        style={{ height: 13, width: Math.round(titleWidth * 0.62), marginBottom: 26 }}
      />
      {Array.from({ length: blocks }).map((_, i) => (
        <div
          key={i}
          className="rd-skel"
          style={{
            height: i === 0 ? 150 : 86,
            marginBottom: 14,
            borderRadius: "var(--r-md)",
          }}
        />
      ))}
    </div>
  );
}
