# Changelog

Toutes les modifications notables d'Autris sont consignées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionné selon [SemVer](https://semver.org/lang/fr/).

> **Workflow** : les changements en cours s'accumulent dans la section
> `[À venir]`. Au moment d'une release, on bouge le bloc dans une nouvelle
> version datée, et on merge `dev` → `main`.

---

## [À venir]

### Ajouts


### Changements


### Corrections


### Retraits


---

## [0.6.5] — 2026-08-31

### Ajouts

- **Les pannes se voient enfin.** Jusqu'ici, un enregistrement raté s'arrêtait sans rien dire : l'image ne s'affichait pas, le lien n'apparaissait pas, et rien ne permettait de distinguer une panne de réseau d'un refus délibéré. Sept endroits parlent désormais, par un message éphémère en bas de l'écran — ajout d'un lien, image de fiche, moodboard, galerie, suppression de chapitre, largeur de colonne, import de manuscrit.
- **Un filet de tests.** 47 tests unitaires sur la logique du World Building, lancés par `npm test`. Ils couvrent la réciprocité des relations, les décalages de génération, les types personnalisés, les noms de fichiers d'export et les filtres du plateau — c'est-à-dire précisément le raisonnement dont une erreur ne se voit pas à l'œil.

### Corrections

- **Un chapitre dont la suppression échoue revient dans le tableau.** Il disparaissait de l'écran sans attendre le serveur et n'était jamais remis : le chapitre restait en base et réapparaissait au chargement suivant, sans explication.
- **52 boutons à icône ont un nom.** Ils ne portaient qu'une infobulle, qui ne s'affiche jamais au toucher et n'est pas lue de façon fiable par un lecteur d'écran.
- **Le retour au tableau de bord depuis les paramètres d'un projet ne recharge plus l'application.**
- L'échec de lecture d'un manuscrit importé n'invite plus à « regarder la console du navigateur » : il dit quels formats sont lus et quoi tenter.

---

## [0.6.4] — 2026-08-31

### Corrections

- **L'onglet « Gantt » est rétabli.** Seul « Post-its » devait quitter la Planification : les post-its ont un ailleurs, sur le plateau du World Building, alors qu'une frise des jalons dans le temps n'existe nulle part dans Autris. L'onglet, son écran d'attente et l'adresse `?view=gantt` reviennent à l'identique.

---

## [0.6.3] — 2026-08-31

### Retraits

- **Les onglets « Post-its » et « Gantt » quittent la Planification.** Ni l'un ni l'autre n'existait autrement que sous la forme d'un écran « arrive bientôt ». Les post-its ont trouvé leur place sur le plateau du World Building, sur une surface libre, à côté des fiches et des liens — en garder un second ici obligerait à choisir où l'on brainstorme. Un favori pointant vers l'un de ces onglets rouvre désormais le chapitrage. *(Gantt est rétabli en 0.6.4 : son retrait n'était pas voulu.)*

---

## [0.6.2] — 2026-08-31

### Corrections

- **La carte « Projets actifs » ne promet plus un tri qui n'existe pas.** Un projet n'a pas d'état d'activité dans Autris — seuls les romans en ont un. Elle s'appelle désormais « Projets », et signale en légende les projets terminés, c'est-à-dire ceux dont tous les romans sont au statut *terminé* ou *publié*.
- **La répartition des romans par étape était fausse.** Elle filtrait sur trois statuts inexistants (`en_cours`, `redaction`, `relecture`) et laissait donc la plupart des romans hors de tout décompte. Elle s'appuie maintenant sur les vraies valeurs : rédaction (*à écrire*, *premier jet*) et réécriture (*révision*, *réécriture*, *correction*).

---

## [0.6.1] — 2026-08-31

### Corrections

- **Les flèches s'arrêtent à nouveau au bord des vignettes** au lieu de venir se planter au milieu du portrait. La hauteur réelle des vignettes n'était jamais mesurée : l'observateur était créé trop tard pour les fiches déjà posées au chargement, et toute la géométrie retombait sur la hauteur stockée — moitié moins qu'une fiche à portrait.
- **Le cadre de la mini-carte tombe juste.** Il souffrait de la même mesure absente : la miniature cadrait sur des vignettes deux fois trop courtes, ce qui faussait l'échelle et la position de la fenêtre.

---

## [0.6.0] — 2026-08-31

### Ajouts

- **Trouver et filtrer sur un plateau.** Un champ de recherche retrouve une fiche par son nom, un cadre par son titre, un post-it par son contenu — et amène la vue dessus. Les filtres isolent une catégorie ou une couleur : ce qui ne correspond pas est **estompé, jamais retiré**, pour que les flèches qui traversent le plateau restent lisibles.
- **Mini-carte** en bas à droite : tout le plateau d'un coup d'œil, avec la fenêtre courante en clair sur un fond assombri. Un clic s'y rend.
- **Export d'un plateau en image** (PNG, densité double). C'est un redessin fidèle — mêmes positions, mêmes couleurs, mêmes courbes — et non une capture d'écran.
- **Couleur des vignettes fiches**, avec la palette des cadres. Applicable à toute une sélection d'un coup : une teinte par maison, par arc, par ce qu'on veut.
- **« Les liens manquants »** dans le menu Déplier : trace les relations entre fiches déjà posées, sans rien ajouter au plateau. Sous la main, jamais automatique.
- **Portrait carré** sur les vignettes de personnages illustrés : un personnage se reconnaît à son visage.
- **Relations et plateaux dans l'export du projet** : `Univers/Relations.md` (toutes les relations, orientées, groupées par sujet) et `Univers/Plateaux.md` (la composition de chaque plateau).
- **Types de liens personnalisés mémorisés.** Un type inventé une fois — « amoureux », « suzerain » — est reproposé ensuite sous « Vos types », au lieu d'être ressaisi à chaque flèche.

### Changements

- **Vocabulaire familial neutre.** Le genre appartient au personnage, pas au lien qui l'unit à un autre : père/mère deviennent **parent**, fils/fille **enfant**, frère/sœur **adelphe**, époux/épouse **mariés** (avec **conjoint** pour l'union sans mariage). Les mots retirés restent lus — réciprocité, dépliage généalogique et arbre généalogique fonctionnent sur les univers déjà écrits. Migration facultative : `migration-wb-links-adelphe.sql`.
- **Flèches à deux pointes uniquement pour les relations symétriques.** « adelphe » se lit pareil des deux bords, « parent » non — son inverse est un autre fait, la filiation. Une double pointe sur un lien asymétrique empêchait de savoir qui était le parent.
- **Un ajout de lien refusé s'explique** au lieu d'échouer en silence : poser « adelphe » alors que la relation existe déjà dans l'autre sens dit maintenant pourquoi.
- **Poignées de lien et de redimensionnement distinctes**, de taille constante quel que soit le zoom, avec un point de liaison sur chacun des quatre bords.
- Les cadres se déplacent à nouveau en cliquant n'importe où dans leur surface.

### Corrections

- **Le total des mots ne passe plus pour la production de la semaine** sur le tableau de bord : le chiffre porte désormais « au total », et l'absence d'écriture se dit en toutes lettres.
- **Le texte libre du plateau se modifie au double-clic**, comme le titre d'un cadre. Le contenu riche avalait l'événement avant qu'il n'atteigne l'objet.
- **Plus de flèche en double** entre deux mêmes vignettes : une relation n'est tracée qu'une fois, et le rendu masque les doublons hérités. Nettoyage facultatif : `migration-wb-board-edges-dedupe.sql`.
- **Le dépliage espace les vignettes selon leur hauteur réelle** — les portraits se chevauchaient.

### Retraits

- **Parenté indirecte retirée du sélecteur de liens** : cousin, oncle, tante, neveu, nièce, grand-parent, belle-famille. Toutes passent par une tierce personne et se déduisent des liens directs, et toutes obligeaient à choisir entre deux mots genrés. « famille (autre) » reste ouvert pour le reste. Les liens déjà écrits avec ces mots continuent d'être lus.

---

## [0.5.0] — 2026-08-26

### Ajouts

- **Les plateaux du World Building.** Ouvrir le World Building donne désormais sur un plateau : une surface infinie où l'on dispose son univers. Les fiches y sont posées par glisser-déposer depuis le panneau de droite, et les liens tracés à la souris **sont** de vraies relations — écrites dans les fiches, visibles partout. Poser une fiche fait apparaître d'elle-même les relations qu'elle entretient déjà avec ce qui est sur le plateau. Nécessite la migration `migration-wb-boards.sql`.
- **Panneau à trois largeurs** : fermé, palette (les fiches à glisser) ou bibliothèque (le World Building tel qu'il a toujours été, au pixel près). Double-clic sur le fond du plateau pour revenir à la vue initiale.
- **Objets du plateau** : post-its à texte riche, textes libres, formes (rectangle, arrondi, ellipse), images, cadres nommés qui emportent leur contenu, et flèches libres entre objets quelconques. Une fiche « Carte » s'affiche en grand, telle quelle, sous les autres — un vrai fond de carte sur lequel poser les lieux.
- **Manipulation** : sélection au lasso (Maj + glisser) et au Maj/Ctrl+clic, alignement et espacement régulier, ordre d'empilement, redimensionnement, copier/coller/dupliquer, **annuler/refaire**. Les outils apparaissent dans une barre flottante collée à la sélection.
- **Plusieurs plateaux par projet** — un plateau principal, plus autant de plateaux thématiques qu'on veut (les familles régnantes, la carte des factions…).
- **Export complet du projet** (Paramètres du projet) : une archive .zip contenant tout — univers, manuscrits, chapitrages et synopsis — en Markdown, directement importable dans Notion.

### Changements

- **Pages légales réécrites.** L'édition du service est anonyme (aucune raison sociale, aucun nom). Une mention explique que le code est écrit avec l'assistance de Claude — la conception, l'expérience et les fonctionnalités restant le fait de l'éditrice — et que c'est cette absence de coût de développement qui permet la gratuité. Nouvelle section « Rien n'est prisonnier d'Autris » : le système n'est pas fermé, les exports existent à chaque étape, et l'export régulier est vivement encouragé.
- Le panneau de fiche est devenu un composant partagé entre l'éditeur de roman et le plateau : une seule mise en page pour un affichage en colonne étroite, avec image, statut, tags et liens modifiables.
- **Relations réciproques.** « Alina sœur de Set » et « Set frère d'Alina » énoncent un seul fait : ils sont désormais reconnus comme tels, fusionnés en une seule flèche à deux pointes sur le plateau et en une seule pastille dans les fiches. Tracer le réciproque d'une relation existante ne crée plus de doublon.
- **Le sens des relations est enfin lisible dans les fiches.** « Eliot est amoureux d'Alina » ne dit rien des sentiments d'Alina : la liste des liens dit maintenant qui est le sujet (« amoureux de Eliot » ou « Eliot De Grace · est amoureux »), avec la phrase complète en infobulle.

### Corrections

- Chapitrage : cliquer sur le **texte** d'une case la sélectionne à nouveau (le contenu riche avalait l'événement avant qu'il n'atteigne la case).
- Chapitrage : la poignée de ligne, trop fine pour être visée, est devenue une vraie prise avec un **menu d'options** — insérer un chapitre au-dessus ou en dessous, colorer la ligne, supprimer le chapitre. La pastille de statut a été décalée et agrandie pour ne plus se superposer à elle.

---

## [0.4.0] — 2026-08-25

### Ajouts

- **Import CSV dans le chapitrage** : bouton « Importer » avec aperçu du fichier, choix de la ligne de départ (clic sur une ligne), détection automatique des en-têtes (tolérante aux accents, majuscules, ponctuation, ligatures) et sélecteur de destination par colonne — chaque colonne du CSV peut être envoyée vers une colonne de base, une colonne perso existante, une nouvelle colonne, ou ignorée. Les lignes s'ajoutent à la suite du tableau.
- **Versions du tableau de planification** : bouton « Versions » pour figer un instantané complet du chapitrage (chapitres, colonnes, cases, couleurs), le consulter en lecture seule, le restaurer (avec sauvegarde automatique de sécurité avant), ou le supprimer. Nécessite la migration `migration-planning-snapshots.sql`.
- **Bouton « Vider » le tableau** : vide le contenu des cases (en gardant les chapitres) ou supprime tous les chapitres — toujours précédé d'une version de sécurité automatique.

### Changements

- **Sélection des cases façon Google Sheets** : clic = sélection, double-clic ou Entrée = édition, cliquer-glisser = sélection rectangulaire, Shift+clic/flèches = étendre, Ctrl+clic = ajouter, flèches = déplacer, Suppr = vider les cases sélectionnées, Échap = désélectionner, clic droit = couleurs. Nouveau visuel : remplissage léger + bordure sur le périmètre de la plage.
- **Tous les dialogues de confirmation sont désormais intégrés à l'app** (suppression de colonnes, chapitres, fiches, images, synopsis, dates butoirs, versions…) : plus aucun `confirm()` natif du navigateur, qui pouvait être bloqué définitivement par « ne plus autoriser ce site à afficher des boîtes de dialogue ».

### Corrections

- Les colonnes personnalisées absentes de l'ordre sauvegardé (créées par l'import, ou orphelines d'anciens imports) apparaissent désormais en fin de tableau au lieu d'être invisibles et insupprimables.
- Import CSV : les inserts groupés n'envoient plus de null dans les colonnes obligatoires (status, themes) ; les messages d'erreur remontent la cause exacte ; deux colonnes CSV pointant vers la même destination ne font plus planter l'écriture.

---

## [0.3.5] — 2026-08-02

### Corrections

- Chapitrage : l'en-tête des colonnes reste visible en haut de l'écran pendant le défilement vertical (elle disparaissait depuis le passage au défilement pleine page de la 0.3.2).

---

## [0.3.4] — 2026-08-02

### Corrections

- Chapitrage : éditer plusieurs cases encore vides d'une colonne personnalisée dans la même session recopiait le contenu de la dernière case éditée dans les autres (visible surtout en collant du texte). Les cases fraîchement créées partageaient un identifiant provisoire commun ; chaque case est désormais identifiée par son couple colonne + chapitre.

---

## [0.3.3] — 2026-07-09

### Changements

- Le statut « ⚠ en retard » du tableau de bord est passé en rouge danger avec halo pulsé (au lieu d'un orange discret qui se fondait dans le décor). L'animation est coupée pour qui préfère les animations réduites.

---

## [0.3.2] — 2026-07-07

### Changements

- **Chapitrage : le tableau respire enfin.** La page de planification défile normalement (le titre et la bande Structure narrative sortent de l'écran au scroll), le tableau prend toute sa hauteur naturelle au lieu d'être enfermé dans une mini-fenêtre.
- **Barre de défilement horizontale custom** pour le tableau : un rail de 16 px toujours visible, collé en bas de l'écran tant que le tableau est affiché. Le pouce se glisse à la souris ou au doigt, un clic sur le rail saute à la position visée — fini la barre Windows fuyante impossible à attraper.
- Barres de défilement globales élargies (14 px) pour être plus faciles à saisir.

### Corrections

- Retrait des dégradés indicateurs de scroll du tableau qui laissaient des bandes verticales fantômes sur toute la hauteur quand on défilait horizontalement.

---

## [0.3.1] — 2026-07-06

### Corrections

- Sidebar : le bouton « + » de « Mes projets » (et le bouton « Créer mon premier projet » du bandeau Premiers pas) ouvre à nouveau le modal de création de projet quand on est déjà sur le dashboard. Il ne faisait plus rien depuis la précédente correction, car cliquer sur un lien vers la même route ne remonte pas le composant — on émet désormais un événement client dédié.

---

## [0.3.0] — 2026-07-06

### Ajouts

- **Sidebar rétractable** (principale + sous-sidebar de planification + sous-sidebar World Building) : bouton bascule persistant dans le Topbar et dans chaque sous-sidebar, état persisté en localStorage, repli automatique sous 900 px de large. Permet de récupérer la largeur d'écran pour visualiser les tableaux du chapitrage.

### Changements

- Barres de défilement thémées (Chrome / Edge / Safari / Firefox) : plus le blanc criard par défaut, elles suivent maintenant les tokens de texte de chaque thème et sont discrètes.

---

## [0.2.0] — 2026-06-23

### Corrections

- Sidebar : le bouton « + » à côté de « Mes projets » ouvre désormais le modal « Nouveau projet » (il ne faisait rien avant — la route `?new=project` n'était pas traitée).

### Retraits

- Toutes les mentions d'abonnement / d'essai gratuit / de Stripe ont été retirées : section « Abonnement » des Paramètres, stats « 3 mois d'essai » de l'onboarding, bandeau du site, paragraphe « Période d'essai » des CGU, sous-traitant Stripe de la politique de confidentialité. Autris est gratuit pendant la bêta.

---

<!-- Modèle pour une release :

## [0.x.y] — AAAA-MM-JJ

### Ajouts
- …

### Changements
- …

### Corrections
- …

### Retraits
- …

-->
