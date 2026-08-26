export const metadata = {
  title: "Mentions légales — Autris",
};

export default function MentionsPage() {
  return (
    <>
      <h1>Mentions légales</h1>
      <p className="lead">
        Informations sur l&apos;édition du service Autris, conformément à la
        loi suisse et au RGPD.
      </p>

      <h2>Édition</h2>
      <p>
        Autris est édité et maintenu par un particulier, à titre non
        professionnel et sans structure commerciale. Le service ne
        poursuit aucun but lucratif : il n&apos;y a ni publicité, ni revente
        de données, ni investisseur.
      </p>
      <p>
        L&apos;identité de la personne responsable de la publication est
        déposée auprès de l&apos;hébergeur, qui peut la communiquer aux
        autorités judiciaires sur réquisition.
      </p>

      <h2>Contact</h2>
      <ul>
        <li>
          Email : <a href="mailto:aline@autris.app">aline@autris.app</a>
        </li>
      </ul>
      <p>
        C&apos;est l&apos;adresse à utiliser pour toute question relative au
        site, à la propriété intellectuelle, à vos données personnelles, ou
        pour signaler un contenu illicite.
      </p>

      <h2>Conception et développement</h2>
      <p>
        Le concept d&apos;Autris, son expérience utilisateur et l&apos;ensemble
        de ses fonctionnalités sont imaginés et décidés par la personne qui
        édite le service.
      </p>
      <p>
        L&apos;<em>écriture du code</em>, elle, est assistée par{" "}
        <strong>Claude</strong> (Anthropic). C&apos;est ce qui rend le projet
        possible : sans coût de développement, une seule personne peut
        construire et maintenir un outil de cette ampleur, et le proposer
        gratuitement.
      </p>

      <h2>Gratuité</h2>
      <p>
        Autris est <strong>entièrement gratuit</strong>, et le restera aussi
        longtemps que les services tiers qui le font tourner le permettront.
        Le jour où le volume de données hébergées dépassera ce que ces offres
        gratuites autorisent, une participation sera demandée — dans le seul
        but de couvrir <strong>l&apos;hébergement du site et des données</strong>,
        jamais de dégager un bénéfice. Ce changement serait annoncé à
        l&apos;avance, et rien ne serait jamais prélevé sans votre accord
        explicite.
      </p>

      <h2>Rien n&apos;est prisonnier d&apos;Autris</h2>
      <p>
        Le système n&apos;est pas fermé, et ne le sera jamais. Des outils
        d&apos;export ont été développés <strong>à chaque étape</strong> du
        travail, pour que tout ce que vous créez ici puisse en sortir à tout
        moment, dans des formats ouverts :
      </p>
      <ul>
        <li>
          <strong>Vos romans et chapitres</strong> — export .docx, lisible par
          Word, LibreOffice, Pages ou Google Docs.
        </li>
        <li>
          <strong>Votre chapitrage</strong> — export .csv, ouvrable dans Excel,
          Numbers, LibreOffice ou Google Sheets.
        </li>
        <li>
          <strong>Vos synopsis</strong> — export .docx.
        </li>
        <li>
          <strong>Votre World Building</strong> — export .zip contenant une
          fiche par page en Markdown, directement importable dans{" "}
          <strong>Notion</strong>.
        </li>
      </ul>

      <h2>Sauvegardez votre travail</h2>
      <p>
        Autris s&apos;appuie sur des prestataires tiers pour conserver vos
        données. Malgré le soin apporté à leur sécurité, aucune plateforme —
        celle-ci comprise — ne peut garantir une conservation absolue.
      </p>
      <p>
        <strong>
          Nous vous encourageons vivement à exporter vos données régulièrement
        </strong>{" "}
        et à en conserver des copies chez vous. C&apos;est la raison
        d&apos;être des fonctions d&apos;export listées ci-dessus : elles ne
        sont pas une porte de sortie, mais un filet de sécurité à utiliser
        souvent.
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site Autris est hébergé par <strong>Vercel Inc.</strong>, 440 N
        Barranca Ave #4133, Covina, CA 91723, États-Unis. Site :{" "}
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
        Le code source, le design, les illustrations et les textes du site
        Autris sont protégés. Toute reproduction, totale ou partielle, est
        interdite sans autorisation écrite.
      </p>
      <p>
        <strong>Vos écrits restent votre propriété pleine et entière.</strong>{" "}
        Autris se contente de les héberger pour vous permettre de les
        consulter, modifier et exporter à tout moment. Aucun usage n&apos;en
        est fait sans votre accord explicite.
      </p>

      <p className="meta">Dernière mise à jour : <em>26.08.2026</em></p>
    </>
  );
}
