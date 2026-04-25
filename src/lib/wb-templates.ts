// Templates de fiches pour chaque catégorie/sous-type World Building

export type FieldType = "textarea" | "input" | "quad" | "table";

export interface TemplateField {
  key: string;
  label: string;
  placeholder?: string;
  type?: FieldType; // default textarea
  rows?: number;
  /** Note affichée sous le label (italique, aide rédactionnelle). */
  note?: string;
  // pour quad: 4 colonnes
  columns?: [string, string, string, string];
  // pour table: colonnes dynamiques
  tableColumns?: string[];
  /** Nombre minimum de lignes affichées en édition (rempli de cellules vides). */
  minRows?: number;
}

export interface TemplateSection {
  group: string;
  icon: string;
  fields: TemplateField[];
  /** Note optionnelle affichée sous l'en-tête de la section (italique). */
  note?: string;
}

export interface Template {
  sections: TemplateSection[];
}

// ---------- UNIVERS & MONDE / PAYS ----------
export const COUNTRY_TEMPLATE: Template = {
  sections: [
    {
      group: "Gouvernement",
      icon: "🗺️",
      fields: [
        { key: "gouvernement", label: "Type de gouvernement", placeholder: "Royauté / Pharaonie / État militaire..." },
        { key: "dirigeant", label: "Dirigeant actuel", placeholder: "Nom + titre" },
        { key: "alliances", label: "Alliances / conflits / particularités", placeholder: "Résumé géopolitique, tensions, traités..." },
      ],
    },
    {
      group: "Faune / Flore",
      icon: "🌿",
      fields: [
        { key: "environnement", label: "Type d'environnement", placeholder: "Montagne, mer, jungle..." },
        { key: "faune", label: "Faune spécifique", placeholder: "Créatures, montures, bêtes sacrées..." },
        { key: "flore", label: "Flore notable", placeholder: "Arbres, plantes symboliques ou magiques" },
      ],
    },
    {
      group: "Mœurs",
      icon: "🧬",
      fields: [
        { key: "moeurs", label: "Religion, magie, famille", placeholder: "Rapport à la magie, place de l'individu, rôle de la famille" },
        { key: "style_vie", label: "Style de vie, lois sociales", placeholder: "Lois sociales ou familiales" },
      ],
    },
    {
      group: "Traditions & Rites",
      icon: "🔮",
      fields: [
        { key: "celebrations", label: "Célébrations", placeholder: "Nom : explication (une par ligne)" },
        { key: "rites_sociaux", label: "Rites sociaux (mariage/mort/naissance)", placeholder: "Comment sont-ils célébrés ou codifiés ?" },
      ],
    },
    {
      group: "Saisons & Climat",
      icon: "🌦️",
      fields: [
        { key: "climat", label: "Climat", placeholder: "Aride, tropical, inversé..." },
        { key: "phenomenes_naturels", label: "Phénomènes naturels", placeholder: "Marée chantante, hiver éternel..." },
      ],
    },
    {
      group: "Phénomènes magiques",
      icon: "🕯️",
      fields: [
        { key: "sanctuaires", label: "Sanctuaires / lieux sacrés", placeholder: "Nom + effet magique / lien divin" },
        { key: "effets_etranges", label: "Effets étranges", placeholder: "Plantes sensibles, brumes altérant la mémoire..." },
      ],
    },
    {
      group: "Liens utiles",
      icon: "🧭",
      fields: [
        { key: "langue_locale", label: "Langue locale", placeholder: "Nom de la langue parlée", type: "input" },
        { key: "dieu_associe", label: "Dieu ou divinité associée", placeholder: "Nom de la divinité / panthéon", type: "input" },
        { key: "personnages_notables", label: "Personnages notables", placeholder: "Noms" },
      ],
    },
  ],
};

// ---------- PERSONNAGES ----------
export const CHARACTER_TEMPLATE: Template = {
  sections: [
    {
      group: "Identité",
      icon: "👤",
      fields: [
        { key: "age", label: "Âge", placeholder: "Ex. 27 ans, « environ trente »…", type: "input" },
        { key: "etat_civil", label: "État civil", placeholder: "Sexe, origine, statut…", type: "input" },
        { key: "role_famille", label: "Rôle de famille", placeholder: "Mère, sœur, fondatrice...", type: "input" },
        { key: "role_narratif", label: "Rôle narratif", placeholder: "Principal / secondaire / antagoniste", type: "input" },
      ],
    },
    {
      group: "Voie de développement",
      icon: "📈",
      fields: [
        { key: "voie_developpement", label: "Arc narratif condensé", placeholder: "Comment ce personnage évolue dans l'histoire" },
      ],
    },
    {
      group: "Psychologie",
      icon: "🧠",
      fields: [
        { key: "morale", label: "Morale", placeholder: "Ses valeurs, sa vision du monde" },
        { key: "particularites", label: "Particularités", placeholder: "Une par ligne : tics, manies, traits uniques..." },
      ],
    },
    {
      group: "Aspirations",
      icon: "✨",
      fields: [
        { key: "ce_qu_il_cherche", label: "Ce qu'il cherche", placeholder: "Objectifs conscients, quête extérieure" },
        { key: "ce_qui_lui_manque", label: "Ce qui lui manque", placeholder: "Besoin intérieur, manque profond" },
      ],
    },
    {
      group: "Arc narratif",
      icon: "🎬",
      fields: [
        { key: "situation_depart", label: "Situation de départ", placeholder: "Où en est-il au début ?" },
        { key: "ce_qu_il_va_trouver", label: "Ce qu'il va trouver", placeholder: "Découvertes, transformations, rencontres clés" },
        { key: "situation_arrivee", label: "Situation d'arrivée", placeholder: "Où en est-il à la fin ?" },
        { key: "objectifs", label: "Objectifs", placeholder: "Ce qu'il veut accomplir" },
      ],
    },
    {
      group: "Relations",
      icon: "🔗",
      fields: [
        { key: "relations_texte", label: "Relations (texte libre)", placeholder: "Ami/ennemi/famille/compagnon... À compléter avec des liens vers d'autres fiches" },
      ],
    },
    {
      group: "Qualités / Défauts / Forces / Faiblesses",
      icon: "⚖️",
      note: "Remplis les quatre lignes et les quatre colonnes : c'est la grille qui donne le personnage le plus cohérent possible.",
      fields: [
        {
          key: "qdfp_table",
          label: "",
          type: "table",
          tableColumns: ["Qualités", "Défauts", "Forces", "Faiblesses"],
          minRows: 4,
        },
      ],
    },
    {
      group: "Observations / Remarques",
      icon: "📝",
      fields: [
        { key: "observations", label: "", placeholder: "Notes d'écriture, points de vigilance..." },
      ],
    },
  ],
};

// ---------- BESTIAIRE ----------
export const BESTIARY_TEMPLATE: Template = {
  sections: [
    {
      group: "Identité",
      icon: "🐾",
      fields: [
        { key: "classification", label: "Classification", placeholder: "Mammifère, reptile, magique, hybride...", type: "input" },
        { key: "taille", label: "Taille moyenne", placeholder: "Ex: 2m au garrot", type: "input" },
      ],
    },
    {
      group: "Habitat & Apparence",
      icon: "🌄",
      fields: [
        { key: "habitat", label: "Habitat", placeholder: "Où vit cette créature ?" },
        { key: "apparence", label: "Apparence physique", placeholder: "Description visuelle détaillée" },
      ],
    },
    {
      group: "Comportement",
      icon: "🧭",
      fields: [
        { key: "comportement", label: "Comportement", placeholder: "Social, solitaire, agressif..." },
        { key: "alimentation", label: "Alimentation", placeholder: "Carnivore, herbivore, omnivore, magique..." },
      ],
    },
    {
      group: "Capacités & Dangerosité",
      icon: "⚔️",
      fields: [
        { key: "dangerosite", label: "Dangerosité", placeholder: "Niveau de menace, type de danger" },
        { key: "capacites_speciales", label: "Capacités spéciales", placeholder: "Pouvoirs, particularités magiques..." },
      ],
    },
    {
      group: "Lien avec les humains",
      icon: "🤝",
      fields: [
        { key: "lien_humains", label: "Rapport aux humains", placeholder: "Domestiquée ? Vénérée ? Chassée ?" },
      ],
    },
  ],
};

// ---------- HISTOIRE & MYTHES ----------
export const HISTORY_TEMPLATE: Template = {
  sections: [
    {
      group: "Époque",
      icon: "📅",
      fields: [
        { key: "date_epoque", label: "Date / Époque", placeholder: "Ex: An 342 de la 3e ère", type: "input" },
        { key: "lieu", label: "Lieu", placeholder: "Où cela s'est-il passé ?", type: "input" },
      ],
    },
    {
      group: "Récit",
      icon: "📖",
      fields: [
        { key: "recit", label: "Récit", placeholder: "Que s'est-il passé ?", rows: 5 },
      ],
    },
    {
      group: "Conséquences",
      icon: "💥",
      fields: [
        { key: "consequences", label: "Conséquences", placeholder: "Impact sur le monde, héritage..." },
        { key: "personnages_impliques", label: "Personnages impliqués", placeholder: "Noms, rôles" },
      ],
    },
  ],
};

// ---------- SOCIÉTÉ & CULTURE ----------
export const SOCIETY_TEMPLATE: Template = {
  sections: [
    {
      group: "Peuple",
      icon: "👥",
      fields: [
        { key: "nom_peuple", label: "Nom du peuple", placeholder: "Ex: Les Dryalis", type: "input" },
        { key: "origine", label: "Origine", placeholder: "D'où vient ce peuple ?" },
        { key: "langue", label: "Langue parlée", placeholder: "Nom de la langue principale", type: "input" },
      ],
    },
    {
      group: "Structure sociale",
      icon: "🏛️",
      fields: [
        { key: "hierarchie", label: "Hiérarchie sociale", placeholder: "Castes, classes, rôles" },
        { key: "religion", label: "Religion dominante", placeholder: "Croyances, pratiques" },
      ],
    },
    {
      group: "Calendrier & Cosmologie",
      icon: "🌌",
      fields: [
        { key: "calendrier", label: "Calendrier", placeholder: "Mois, années, cycles, fêtes" },
        { key: "cosmologie", label: "Cosmologie", placeholder: "Vision du cosmos, astres, mythes fondateurs" },
        { key: "cycles", label: "Cycles (lunaires/solaires/saisonniers)", placeholder: "Rythmes qui structurent la vie du peuple" },
      ],
    },
    {
      group: "Culture",
      icon: "🎨",
      fields: [
        { key: "arts", label: "Arts", placeholder: "Musique, littérature, artisanat" },
        { key: "cuisine", label: "Cuisine", placeholder: "Plats typiques, ingrédients rituels" },
        { key: "vetements", label: "Vêtements & apparences", placeholder: "Style vestimentaire, parures" },
      ],
    },
  ],
};

// ---------- MAGIE & DIVINITÉS ----------

// 📄 Les Dieux (panthéon)
export const DEITY_TEMPLATE: Template = {
  sections: [
    {
      group: "Identité",
      icon: "🔱",
      fields: [
        { key: "nom_humain", label: "Nom humain", placeholder: "Nom usité par les mortels", type: "input" },
        { key: "nom_estenien", label: "Nom sacré (estenien)", placeholder: "Nom révélé / estenien", type: "input" },
        { key: "symbole", label: "Symbole", placeholder: "Sceau, glyphe, animal sacré…", type: "input" },
        { key: "alignement", label: "Alignement", placeholder: "Lumineux / sombre / neutre / ambigu…", type: "input" },
      ],
    },
    {
      group: "Domaine & Rôle",
      icon: "🌌",
      fields: [
        { key: "domaine", label: "Domaine", placeholder: "Éléments, vertus, sphères d'influence" },
        { key: "role_cosmique", label: "Rôle cosmique", placeholder: "Place du dieu dans l'ordre du monde" },
      ],
    },
    {
      group: "Statut actuel",
      icon: "⏳",
      fields: [
        { key: "statut", label: "Statut", placeholder: "Vivant / disparu / divisé / dormant / déchu…", type: "input" },
        { key: "histoire_statut", label: "Histoire du statut", placeholder: "Comment en est-il arrivé là ?" },
      ],
    },
    {
      group: "Culte & Fidèles",
      icon: "🙏",
      fields: [
        { key: "fideles", label: "Fidèles / adeptes", placeholder: "Qui le vénère ? Rites, prêtrise" },
        { key: "artefacts_lies", label: "Artefacts associés", placeholder: "Noms d'artefacts divins liés à ce dieu" },
      ],
    },
  ],
};

// 📄 Les Artefacts Divins
export const DIVINE_ARTIFACT_TEMPLATE: Template = {
  sections: [
    {
      group: "Identification",
      icon: "🏺",
      fields: [
        { key: "numero", label: "Numéro (1–24)", placeholder: "Ex. 07", type: "input" },
        { key: "dieu_source", label: "Dieu d'origine", placeholder: "Nom du dieu qui l'a forgé / incarné", type: "input" },
        { key: "vertu", label: "Vertu associée", placeholder: "Courage, mémoire, vérité…", type: "input" },
        { key: "type_effet", label: "Type d'effet", placeholder: "Protection / révélation / destruction / lien…", type: "input" },
      ],
    },
    {
      group: "Description",
      icon: "⚔️",
      fields: [
        { key: "apparence", label: "Apparence", placeholder: "Matière, forme, aura visible" },
        { key: "pouvoirs", label: "Pouvoirs", placeholder: "Ce qu'il permet de faire" },
        { key: "limites", label: "Limites / conditions d'usage", placeholder: "Ne s'active qu'à X, coût, contrepartie…" },
      ],
    },
    {
      group: "État actuel",
      icon: "🗝️",
      fields: [
        { key: "etat", label: "État", placeholder: "Actif / perdu / scellé / utilisé / détruit…", type: "input" },
        { key: "porteur", label: "Porteur actuel", placeholder: "Nom, lieu de garde" },
        { key: "histoire", label: "Histoire connue", placeholder: "Parcours, légendes, derniers porteurs" },
      ],
    },
  ],
};

// 📄 Les Mages
export const MAGE_TEMPLATE: Template = {
  sections: [
    {
      group: "Origine des dons",
      icon: "🧬",
      fields: [
        { key: "origine_dons", label: "Origine du don", placeholder: "Don divin, sang d'Estar, éveil, mutation…" },
        { key: "transmission", label: "Transmission", placeholder: "Héréditaire / apprise / offerte ? Étude, initiation, sang…" },
      ],
    },
    {
      group: "Organisation",
      icon: "🏛️",
      fields: [
        { key: "organisation", label: "Caste, clan, ordre, isolé ?", placeholder: "Structure sociale des mages" },
        { key: "perception", label: "Perception par les peuples", placeholder: "Craints ? Vénérés ? Chassés ? Tolérés ?" },
      ],
    },
    {
      group: "Types de pouvoirs",
      icon: "✨",
      note: "Coche / décris les familles maîtrisées par ce mage. Chaque ligne du tableau est une famille, la seconde colonne précise le niveau ou la nuance.",
      fields: [
        {
          key: "pouvoirs",
          label: "",
          type: "table",
          tableColumns: ["Famille de pouvoir", "Nuance / niveau"],
          minRows: 9,
          placeholder: "Ex. Lecture des Auras",
        },
      ],
    },
    {
      group: "Profil individuel",
      icon: "👤",
      fields: [
        { key: "nom", label: "Nom du mage", placeholder: "Si la fiche décrit un individu précis", type: "input" },
        { key: "particularites", label: "Particularités", placeholder: "Traits propres à ce mage (rituels, faiblesses, limites personnelles)" },
      ],
    },
  ],
};

// 📄 Système magique
export const MAGIC_SYSTEM_TEMPLATE: Template = {
  sections: [
    {
      group: "Source",
      icon: "🌠",
      fields: [
        { key: "source", label: "Source de la magie", placeholder: "Linguistique / divine / artefactuelle / autre" },
        { key: "mecanique", label: "Mécanique générale", placeholder: "Comment la magie se manifeste-t-elle ?" },
      ],
    },
    {
      group: "Règles & Coûts",
      icon: "📜",
      fields: [
        { key: "regles", label: "Règles", placeholder: "Lois qui encadrent la magie" },
        { key: "limites", label: "Limites", placeholder: "Ce qui reste impossible" },
        { key: "couts", label: "Coûts", placeholder: "Prix à payer : énergie, vie, mémoire, serment…" },
        { key: "derives", label: "Dérives possibles", placeholder: "Effets secondaires, corruptions, cas limites" },
      ],
    },
    {
      group: "Croyances",
      icon: "🕯️",
      fields: [
        { key: "croyances", label: "Croyances liées à la magie", placeholder: "Ce que les peuples pensent de la magie et de son usage" },
      ],
    },
  ],
};

// ---------- SYSTÈME MONÉTAIRE ----------

// 📄 Monnaie
export const MONEY_TEMPLATE: Template = {
  sections: [
    {
      group: "Monnaie",
      icon: "💰",
      fields: [
        { key: "nom", label: "Nom de la monnaie", placeholder: "Pièce d'or, krône, souffle...", type: "input" },
        { key: "valeur", label: "Valeur & dénominations", placeholder: "1 or = 10 argent = 100 cuivre" },
        { key: "origine", label: "Origine & histoire", placeholder: "Qui a créé cette monnaie ?" },
        { key: "usage", label: "Usage & circulation", placeholder: "Où est-elle acceptée ?" },
      ],
    },
  ],
};

// 📄 Terme / vocabulaire économique
// Sert à noter un mot de jargon marchand, une unité de mesure, une
// institution financière… à la manière d'un lexique.
export const MONEY_TERM_TEMPLATE: Template = {
  sections: [
    {
      group: "Terme",
      icon: "📘",
      fields: [
        { key: "terme", label: "Terme", placeholder: "Ex. dîme, écu, taxe d'ombre…", type: "input" },
        { key: "categorie", label: "Catégorie", placeholder: "Unité / impôt / institution / jargon / contrat…", type: "input" },
        { key: "synonymes", label: "Synonymes & variantes", placeholder: "Autres noms, formes régionales", type: "input" },
      ],
    },
    {
      group: "Définition",
      icon: "✍️",
      fields: [
        { key: "definition", label: "Définition", placeholder: "Sens précis du terme dans ton monde", rows: 4 },
        { key: "usage", label: "Usage & contexte", placeholder: "Qui l'emploie ? Dans quelles circonstances ?" },
      ],
    },
    {
      group: "Exemples",
      icon: "💬",
      fields: [
        { key: "exemples", label: "Exemples d'emploi", placeholder: "Une phrase par ligne — contexte réaliste.", rows: 4 },
      ],
    },
  ],
};

// ---------- OBJETS LÉGENDAIRES ----------
export const ARTIFACT_TEMPLATE: Template = {
  sections: [
    {
      group: "Objet",
      icon: "⚔️",
      fields: [
        { key: "apparence", label: "Apparence", placeholder: "Description visuelle" },
        { key: "pouvoirs", label: "Pouvoirs", placeholder: "Ce qu'il permet de faire" },
        { key: "origine", label: "Origine", placeholder: "Qui l'a créé ? Comment ?" },
        { key: "possesseurs", label: "Possesseurs connus", placeholder: "Histoire des propriétaires" },
      ],
    },
  ],
};

// ---------- LEXIQUE & LANGAGE ----------
// Fiche-langue complète : nature, phonétique, grammaire, vocabulaire,
// noms propres, utilisations. Structurée pour accueillir une langue
// inventée entière (type Estenien) aussi bien qu'un simple mot isolé
// (remplir alors seulement la section Vocabulaire).
export const LEXICON_TEMPLATE: Template = {
  sections: [
    {
      group: "Nature de la langue",
      icon: "🌌",
      fields: [
        { key: "nature", label: "Nature & usage", placeholder: "Langue divine, parlée, morte, rituelle… À quoi sert-elle ? Qui la parle ?", rows: 4 },
      ],
    },
    {
      group: "Phonétique & style",
      icon: "🔤",
      fields: [
        {
          key: "phonetique",
          label: "",
          type: "table",
          tableColumns: ["Élément", "Valeur"],
          minRows: 5,
          placeholder: "Ex. Voyelles / a, e, i, o, u…",
        },
      ],
    },
    {
      group: "Grammaire",
      icon: "🧩",
      fields: [
        { key: "grammaire_regles", label: "Règles générales", placeholder: "Ex. Ordre SOV, pas d'article, particules suffixées…", rows: 3 },
        {
          key: "grammaire_particules",
          label: "Particules & fonctions",
          type: "table",
          tableColumns: ["Fonction", "Particule", "Exemple", "Traduction"],
          minRows: 4,
        },
      ],
    },
    {
      group: "Vocabulaire sacré",
      icon: "📚",
      fields: [
        {
          key: "vocabulaire",
          label: "",
          type: "table",
          tableColumns: ["Mot", "Sens", "Notes symboliques"],
          minRows: 6,
        },
      ],
    },
    {
      group: "Noms propres & divinités",
      icon: "🔱",
      fields: [
        {
          key: "noms_propres",
          label: "",
          type: "table",
          tableColumns: ["Nom original", "Nom traduit", "Prononciation", "Sens symbolique"],
          minRows: 4,
        },
      ],
    },
    {
      group: "Utilisations & exemples",
      icon: "✨",
      fields: [
        { key: "utilisations", label: "Formules, invocations, exemples", placeholder: "Une entrée par ligne — citation + traduction entre parenthèses.", rows: 5 },
      ],
    },
    {
      group: "Textes & traductions",
      icon: "📜",
      note: "Colle un texte dans la langue originale à gauche et sa traduction à droite. La colonne phonétique est optionnelle.",
      fields: [
        {
          key: "texte_titre",
          label: "Titre du texte",
          placeholder: "Ex. Astraï Ren — Le Retour des Étoiles",
          type: "input",
        },
        {
          key: "texte_traductions",
          label: "",
          type: "table",
          tableColumns: ["Texte original", "Phonétique", "Traduction"],
          minRows: 4,
        },
      ],
    },
  ],
};

// ---------- CRIMES & ENQUÊTES ----------
export const CRIME_TEMPLATE: Template = {
  sections: [
    {
      group: "Affaire",
      icon: "🔍",
      fields: [
        { key: "date", label: "Date", placeholder: "Quand cela s'est-il passé ?", type: "input" },
        { key: "lieu", label: "Lieu", placeholder: "Où ?", type: "input" },
        { key: "victimes", label: "Victimes", placeholder: "Noms, profils" },
      ],
    },
    {
      group: "Enquête",
      icon: "🗂️",
      fields: [
        { key: "deroule", label: "Déroulé des faits", placeholder: "Ce qui s'est passé", rows: 5 },
        { key: "indices", label: "Indices", placeholder: "Une par ligne" },
        { key: "coupable", label: "Coupable", placeholder: "Identité + mobile" },
      ],
    },
  ],
};

// ---------- ORGANISATIONS SECRÈTES ----------
export const ORG_TEMPLATE: Template = {
  sections: [
    {
      group: "Organisation",
      icon: "🕵️",
      fields: [
        { key: "but", label: "But / idéologie", placeholder: "Pourquoi existent-ils ?" },
        { key: "membres", label: "Membres connus", placeholder: "Noms, rôles" },
        { key: "methodes", label: "Méthodes", placeholder: "Comment agissent-ils ?" },
        { key: "ennemis", label: "Ennemis", placeholder: "Qui les combat ?" },
      ],
    },
  ],
};

// ---------- LIEUX MAUDITS ----------
export const CURSED_PLACE_TEMPLATE: Template = {
  sections: [
    {
      group: "Lieu",
      icon: "🏚️",
      fields: [
        { key: "localisation", label: "Localisation", placeholder: "Où se trouve ce lieu ?", type: "input" },
        { key: "histoire", label: "Histoire", placeholder: "Comment ce lieu est-il devenu maudit ?" },
        { key: "manifestations", label: "Manifestations", placeholder: "Ce que l'on y observe" },
        { key: "regles_survie", label: "Règles de survie", placeholder: "Comment y survivre (si possible)" },
      ],
    },
  ],
};

// ---------- ENTITÉS MALÉFIQUES ----------
export const EVIL_ENTITY_TEMPLATE: Template = {
  sections: [
    {
      group: "Entité",
      icon: "👹",
      fields: [
        { key: "apparence", label: "Apparence", placeholder: "Forme, manifestations" },
        { key: "pouvoirs", label: "Pouvoirs", placeholder: "Ce qu'elle peut faire" },
        { key: "origine", label: "Origine", placeholder: "D'où vient-elle ?" },
        { key: "faiblesses", label: "Faiblesses", placeholder: "Comment la vaincre ou la repousser ?" },
      ],
    },
  ],
};

// ---------- CODEX & GLOSSAIRE ----------
export const CODEX_TEMPLATE: Template = {
  sections: [
    {
      group: "Définition",
      icon: "📖",
      fields: [
        { key: "definition", label: "Définition", placeholder: "Explication courte et claire", rows: 4 },
      ],
    },
  ],
};

// ---------- MAPPING ----------
export function getTemplate(
  category: string,
  subcategory?: string | null
): Template | null {
  if (category === "univers_monde") {
    if (subcategory === "pays") return COUNTRY_TEMPLATE;
    return null; // autres sous-types → description libre
  }
  if (category === "magie_divinites") {
    switch (subcategory) {
      case "dieu": return DEITY_TEMPLATE;
      case "artefact_divin": return DIVINE_ARTIFACT_TEMPLATE;
      case "mage": return MAGE_TEMPLATE;
      case "systeme_magique": return MAGIC_SYSTEM_TEMPLATE;
      default: return MAGIC_SYSTEM_TEMPLATE;
    }
  }
  switch (category) {
    case "personnages": return CHARACTER_TEMPLATE;
    case "bestiaire": return BESTIARY_TEMPLATE;
    case "histoire_mythes": return HISTORY_TEMPLATE;
    case "societe_culture": return SOCIETY_TEMPLATE;
    case "systeme_monetaire":
      return subcategory === "terme" ? MONEY_TERM_TEMPLATE : MONEY_TEMPLATE;
    case "objets_legendaires": return ARTIFACT_TEMPLATE;
    case "lexique_langage": return LEXICON_TEMPLATE;
    case "crimes_enquetes": return CRIME_TEMPLATE;
    case "organisations_secretes": return ORG_TEMPLATE;
    case "lieux_maudits": return CURSED_PLACE_TEMPLATE;
    case "entites_malefiques": return EVIL_ENTITY_TEMPLATE;
    case "codex_glossaire": return CODEX_TEMPLATE;
    default: return null;
  }
}
