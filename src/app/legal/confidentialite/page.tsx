export const metadata = {
  title: "Politique de confidentialité — Autris",
};

export default function ConfidentialitePage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="lead">
        Comment vos données personnelles sont collectées, utilisées et
        protégées. Conforme à la nLPD (Suisse) et au RGPD (UE).
      </p>
      
      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement de vos données est{" "}
        <strong>Chênerêve Éditions</strong> (Suisse). Contact :{" "}
        <a href="mailto:aline@autris.app">aline@autris.app</a>.
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
      <ul>
        <li>
          <strong>Données de compte</strong> : email, nom d&apos;auteur,
          mot de passe (chiffré), date d&apos;inscription.
        </li>
        <li>
          <strong>Contenus créés</strong> : romans, chapitres, fiches de
          worldbuilding, plannings, notes — tels que vous les saisissez.
        </li>
        <li>
          <strong>Données d&apos;usage</strong> : statistiques d&apos;activité
          quotidienne (mots écrits, fiches créées) pour alimenter votre tableau
          de bord. Pas de tracking publicitaire.
        </li>
        <li>
          <strong>Données techniques</strong> : adresse IP, type de
          navigateur — uniquement le temps d&apos;une session, pour des
          raisons de sécurité (détection d&apos;abus).
        </li>
      </ul>

      <h2>3. Finalités</h2>
      <p>Vos données servent exclusivement à :</p>
      <ul>
        <li>vous fournir le service que vous avez choisi ;</li>
        <li>vous envoyer des emails transactionnels (confirmation de compte, fin de période d&apos;essai, reset de mot de passe) ;</li>
        <li>vous facturer si vous souscrivez à un abonnement Pro (via Stripe) ;</li>
        <li>respecter nos obligations légales suisses et européennes.</li>
      </ul>

      <h2>4. Partage avec des tiers</h2>
      <p>
        Vos données ne sont <strong>jamais vendues</strong>. Elles sont
        partagées uniquement avec les sous-traitants techniques nécessaires
        au fonctionnement du service :
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (États-Unis / Singapour) — hébergement de
          la base de données et stockage de fichiers. Données chiffrées au
          repos et en transit.
        </li>
        <li>
          <strong>Vercel</strong> (États-Unis) — hébergement du site et
          gestion des sessions.
        </li>
        <li>
          <strong>Stripe</strong> (Irlande / États-Unis) — traitement des
          paiements (uniquement si vous souscrivez à un abonnement payant).
          Les coordonnées bancaires ne transitent pas par nos serveurs.
        </li>
        <li>
          <strong>Resend</strong> (États-Unis) — envoi d&apos;emails
          transactionnels.
        </li>
      </ul>
      <p>
        Tous ces sous-traitants sont engagés contractuellement à respecter le
        RGPD et la nLPD (clauses contractuelles types).
      </p>

      <h2>5. Vos écrits, votre propriété</h2>
      <p>
        <strong>Nous ne lisons pas vos textes.</strong> Vos romans et fiches
        sont stockés tels quels et ne sont consultés par aucun membre de
        l&apos;équipe Autris, sauf si vous nous y autorisez explicitement
        (par exemple lors d&apos;une demande d&apos;assistance).
      </p>
      <p>
        <strong>Vos écrits ne sont jamais utilisés pour entraîner des modèles
        d&apos;intelligence artificielle.</strong>
      </p>

      <h2>6. Durée de conservation</h2>
      <ul>
        <li>
          <strong>Compte actif</strong> : tant que votre compte n&apos;est pas
          supprimé.
        </li>
        <li>
          <strong>Compte supprimé</strong> : période de grâce de 30 jours pour
          annuler la suppression, puis effacement définitif.
        </li>
        <li>
          <strong>Données comptables et de facturation</strong> : conservées
          10 ans conformément aux obligations légales suisses.
        </li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>
        Conformément à la nLPD et au RGPD, vous disposez des droits suivants :
      </p>
      <ul>
        <li>
          <strong>Accès</strong> : consulter à tout moment l&apos;ensemble des
          données vous concernant (export depuis votre compte).
        </li>
        <li>
          <strong>Rectification</strong> : modifier vos informations directement
          depuis la page Paramètres.
        </li>
        <li>
          <strong>Suppression</strong> : supprimer votre compte et toutes vos
          données (Paramètres → Zone dangereuse).
        </li>
        <li>
          <strong>Portabilité</strong> : exporter vos manuscrits au format
          DOCX et vos fiches au format CSV à tout moment.
        </li>
        <li>
          <strong>Opposition</strong> : refuser certains traitements (nous
          contacter à{" "}
          <a href="mailto:aline@autris.app">aline@autris.app</a>).
        </li>
      </ul>

      <h2>8. Cookies</h2>
      <p>
        Autris n&apos;utilise <strong>aucun cookie de tracking ni
        publicitaire</strong>. Seuls les cookies strictement nécessaires au
        fonctionnement du service sont déposés (session de connexion). Aucun
        consentement préalable n&apos;est requis pour ces cookies essentiels.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Vos données sont chiffrées en transit (HTTPS / TLS) et au repos. Les
        mots de passe sont stockés sous forme de hachage bcrypt. Les serveurs
        Supabase et Vercel respectent les standards SOC 2 et ISO 27001.
      </p>

      <h2>10. Contact &amp; réclamations</h2>
      <p>
        Pour toute question ou exercice de vos droits :{" "}
        <a href="mailto:aline@autris.app">aline@autris.app</a>.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez
        adresser une réclamation au Préposé fédéral à la protection des
        données et à la transparence (PFPDT, Suisse) ou à l&apos;autorité
        de protection des données de votre pays de résidence si vous êtes
        dans l&apos;Union européenne.
      </p>

      <p className="meta">Dernière mise à jour : <em>(à compléter)</em></p>
    </>
  );
}
