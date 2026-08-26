export const metadata = {
  title: "Conditions Générales d'Utilisation — Autris",
};

export default function CguPage() {
  return (
    <>
      <h1>Conditions Générales d&apos;Utilisation</h1>
      <p className="lead">
        En utilisant Autris, vous acceptez les conditions ci-dessous. Lisez-les
        attentivement.
      </p>

      <h2>1. Présentation du service</h2>
      <p>
        Autris est un logiciel d&apos;écriture en ligne destiné aux romanciers
        francophones. Il permet de rédiger, organiser et exporter des
        manuscrits, des fiches de worldbuilding, des plannings narratifs et
        des notes.
      </p>
      <p>
        Le service est édité par un particulier, à titre non professionnel et
        sans but lucratif. Le concept, l&apos;expérience et les fonctionnalités
        sont le fait de cette personne ; l&apos;écriture du code est assistée
        par <strong>Claude</strong> (Anthropic) — c&apos;est cette absence de
        coût de développement qui permet de proposer le service gratuitement.
      </p>

      <h2>2. Inscription et compte</h2>
      <p>
        L&apos;accès au service nécessite la création d&apos;un compte. Vous
        vous engagez à fournir des informations exactes (email valide) et à
        protéger votre mot de passe. Vous êtes seule responsable des actions
        effectuées depuis votre compte.
      </p>

      <h2>3. Gratuité</h2>
      <p>
        Autris est <strong>entièrement gratuit</strong> : aucune carte
        bancaire n&apos;est demandée à l&apos;inscription, il n&apos;y a aucun
        engagement, aucune publicité et aucune revente de données. Vous pouvez
        à tout moment exporter vos données et fermer votre compte.
      </p>
      <p>
        Cette gratuité tient à deux choses : le service est développé avec
        l&apos;assistance d&apos;une intelligence artificielle, ce qui en
        supprime le coût de développement ; et il tient aujourd&apos;hui dans
        les offres gratuites des services d&apos;hébergement qui le font
        tourner.
      </p>
      <p>
        Le jour où le volume de données hébergées dépassera ces offres, une
        participation sera demandée, dans le seul but de couvrir{" "}
        <strong>l&apos;hébergement du site et des données</strong> — jamais de
        dégager un bénéfice. Ce changement serait annoncé à l&apos;avance et
        accepté explicitement : rien ne sera jamais prélevé sans votre
        consentement, et vos données resteront exportables gratuitement en
        toute circonstance.
      </p>

      <h2>4. Vos contenus</h2>
      <p>
        Vous restez l&apos;unique propriétaire de tous les textes, fiches et
        documents que vous créez sur Autris. Nous ne revendiquons aucun droit
        sur vos écrits. Nous nous engageons à :
      </p>
      <ul>
        <li>ne jamais utiliser vos contenus à des fins commerciales ou d&apos;entraînement d&apos;IA ;</li>
        <li>ne jamais les partager avec des tiers sans votre accord explicite ;</li>
        <li>vous permettre d&apos;exporter et de supprimer vos données à tout moment.</li>
      </ul>

      <h2>5. Comportements interdits</h2>
      <p>L&apos;utilisation d&apos;Autris à des fins illégales est interdite, notamment :</p>
      <ul>
        <li>publication de contenus pédopornographiques, racistes, négationnistes ou incitant à la haine ;</li>
        <li>tentative d&apos;intrusion, de surcharge ou de contournement des mécanismes de sécurité ;</li>
        <li>revente, sous-licence ou détournement du service.</li>
      </ul>

      <h2>6. Vos données vous suivent — exportez-les</h2>
      <p>
        <strong>Rien de ce que vous créez sur Autris n&apos;y est
        prisonnier.</strong> Le système n&apos;est pas fermé et ne le sera
        jamais : des outils d&apos;export ont été développés à chaque étape du
        travail, dans des formats ouverts.
      </p>
      <ul>
        <li>Romans et chapitres — .docx</li>
        <li>Chapitrage — .csv</li>
        <li>Synopsis — .docx</li>
        <li>
          World Building — .zip de fiches Markdown, importable dans Notion
        </li>
      </ul>
      <p>
        Autris s&apos;appuie sur des prestataires tiers pour conserver vos
        données, et aucune plateforme ne peut garantir une conservation
        absolue.{" "}
        <strong>
          Exportez votre travail régulièrement et gardez-en des copies chez
          vous
        </strong>{" "}
        : c&apos;est la meilleure protection, et ces fonctions sont là pour ça.
      </p>

      <h2>6 bis. Disponibilité du service</h2>
      <p>
        Nous faisons de notre mieux pour assurer la disponibilité d&apos;Autris,
        mais ne pouvons garantir un service ininterrompu. Des opérations de
        maintenance, mises à jour ou incidents chez nos prestataires peuvent
        occasionner des indisponibilités temporaires.
      </p>

      <h2>7. Suppression de compte</h2>
      <p>
        Vous pouvez supprimer votre compte à tout moment depuis la page{" "}
        Paramètres. Une période de grâce de 30 jours vous permet d&apos;annuler
        cette demande. Au-delà, toutes vos données sont définitivement
        effacées.
      </p>

      <h2>8. Modification des CGU</h2>
      <p>
        Les présentes CGU peuvent être modifiées. Tout changement substantiel
        vous sera notifié par email avec un délai de préavis raisonnable. La
        poursuite de l&apos;utilisation du service après modification vaut
        acceptation.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit suisse. Tout litige ne
        pouvant être réglé à l&apos;amiable sera porté devant les tribunaux
        suisses compétents, sous réserve des règles impératives applicables
        aux consommateurs européens (RGPD).
      </p>

      <h2>10. Contact</h2>
      <p>
        Pour toute question :{" "}
        <a href="mailto:aline@autris.app">aline@autris.app</a>.
      </p>

      <p className="meta">Dernière mise à jour : <em>26.08.2026</em></p>
    </>
  );
}
