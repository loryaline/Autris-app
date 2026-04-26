export const metadata = {
  title: "Mentions légales — Autris",
};

export default function MentionsPage() {
  return (
    <>
      <h1>Mentions légales</h1>
      <p className="lead">
        Informations sur l&apos;éditrice du service Autris, conformément à la
        loi suisse et au RGPD.
      </p>

      <h2>Éditrice</h2>
      <p>
        <strong>Chênerêve Éditions</strong> — raison individuelle (en cours d&apos;immatriculation).
        <br />
        Autrice et illustratrice indépendante, basée en Suisse.
      </p>

      <h2>Coordonnées</h2>
      <ul>
        <li>
          Email :{" "}
          <a href="mailto:contact@autris.app">contact@autris.app</a>
        </li>
        <li>Adresse postale : <em>(à compléter)</em></li>
        <li>N° AVS / IDE : <em>(à compléter)</em></li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Le site Autris est hébergé par{" "}
        <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA
        91723, États-Unis. Site :{" "}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
          vercel.com
        </a>
        .
      </p>
      <p>
        La base de données et le stockage de fichiers sont fournis par{" "}
        <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapour
        318992. Site :{" "}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
          supabase.com
        </a>
        .
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du code source, du design, des illustrations et des
        textes du site Autris est la propriété de Chênerêve Éditions, sauf
        mention contraire. Toute reproduction, totale ou partielle, est
        interdite sans autorisation écrite.
      </p>
      <p>
        <strong>Vos écrits restent votre propriété pleine et entière.</strong>{" "}
        Autris se contente de les héberger pour vous permettre de les
        consulter, modifier et exporter à tout moment. Aucun usage n&apos;en
        est fait sans votre accord explicite.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative au site, à la propriété intellectuelle
        ou pour signaler un contenu illicite :{" "}
        <a href="mailto:contact@autris.app">contact@autris.app</a>.
      </p>

      <p className="meta">Dernière mise à jour : <em>(à compléter)</em></p>
    </>
  );
}
