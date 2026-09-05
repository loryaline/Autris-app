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

## [0.10.1] — 2026-09-05

### Ajouts

- **Le chapitrage répond au doigt.** C'est la seule autre vue qu'une tablette utilise vraiment, et elle restait aveugle au tactile : ni sélection d'une plage de cases, ni redimensionnement de colonne. Elle passe aux Pointer Events, comme le plateau.
- **La poignée de redimensionnement s'élargit là où le doigt sert** — 4 px se visent à la souris, jamais au doigt. Elle passe à 18 px sur écran tactile, en débordant vers l'intérieur pour ne pas décaler la colonne voisine.

### Changements

- **Au doigt, un glisser dans le tableau le fait défiler** au lieu de tracer un rectangle de sélection. Les deux gestes se disputaient le même mouvement, et sur un tableau plus large que l'écran c'est le défilement qui compte. La souris et le stylet tracent toujours.
- Le panneau « chercher et trier » du plateau se ferme dès qu'on touche à côté : il attendait un `mousedown`, qu'iOS ne synthétise qu'après le relâchement.

---

## [0.10.0] — 2026-09-05

### Ajouts

- **Le plateau répond au doigt.** Il n'écoutait que la souris — vingt gestionnaires `mousedown`, `mousemove`, `mouseup` — des événements qui ne se déclenchent pas au doigt sur iOS, ou avec du retard et sans les gestes à plusieurs doigts. Il était donc inutilisable sur iPad, y compris sur un iPad Pro en paysage, plus large qu'un ordinateur portable. Tout passe désormais par les Pointer Events, qui unifient souris, doigt et stylet.
- **Pincer pour zoomer, deux doigts pour déplacer.** Le zoom est ancré sur le milieu des deux doigts, et ce milieu se déplace : les deux gestes se composent en un seul.
- Un glisser interrompu par le système — balayage depuis le bord, appel entrant — se termine proprement. Sans ça, le plateau serait resté collé au doigt.

### Corrections

- La mini-carte répond elle aussi au doigt : son clic pour se déplacer ne se déclenchait pas.

---

## [0.9.5] — 2026-09-05

### Ajouts

- **Les écrans qui demandent de la place le disent.** Le chapitrage et les scènes ne se réduisent pas à 375 px — l'un est un tableau de colonnes larges à sélection multiple, l'autre une mise en page en colonnes. Les rétrécir n'en ferait pas des versions mobiles, seulement des versions inutilisables portant le même nom. Sur téléphone ils affichent désormais ce qu'ils sont, où les retrouver, et proposent le synopsis — qui, lui, est du texte et passe très bien.

### Changements

- **Le World Building ouvre sur sa bibliothèque sur téléphone**, plus sur le plateau. Une surface infinie qu'on manipule à la souris n'a rien à offrir sur un écran de téléphone, alors que les fiches s'y lisent sans peine. Le mode choisi au bureau reste intact : c'est un affichage dérivé, pas un réglage écrasé.

---

## [0.9.4] — 2026-09-05

### Changements

- **L'en-tête de l'éditeur est dimensionnée pour le doigt.** Elle faisait 40 px de haut et le retour à l'accueil 20 px de côté — une cible de la taille d'un timbre. La barre passe à 56 px, la maison à 44 px de cible pour 18 px de dessin, et le fil d'Ariane à 15 px.
- **Le titre du chapitre cesse d'être écrasé.** Le libellé du statut prenait 70 px sur un écran de 375, autant que le titre du chapitre — qui dit lui où l'on écrit et se retrouvait réduit à trois lettres. Sur petit écran la pastille se réduit à son point ; son nom reste en infobulle et pour la synthèse vocale, et l'appui continue de le changer.
- **L'indicateur d'enregistrement perd son fond coloré sur téléphone** : un ✓ dans une pastille verte ressemble à un bouton à presser, alors que c'est un constat. Au bureau, rien ne change.

---

## [0.9.3] — 2026-09-05

### Changements

- **La boîte à idées est enfin composée pour un téléphone, pas rétrécie depuis un bureau.** Le texte d'une note faisait 14 px et sa date 11 px — de la densité d'écran large posée sur 375 px. Les corps passent à 16,5 px pour les notes, 17 px dans l'écran d'écriture, 12,5 px pour les dates, avec des interlignes plus généreux et des lignes plus hautes. On voit six notes au lieu de neuf : c'est le bon échange.
- Le bouton d'écriture passe à 60 px, les entrées de menu à 15 px, et le va-et-vient « à trier / rangées » à 40 px de haut. Au bureau, rien ne change.

---

## [0.9.2] — 2026-09-05

### Corrections

- **La coche qui rangeait la note a disparu.** Dans un écran où l'on écrit, une coche veut dire « valider » — on rangeait donc ses notes en croyant les enregistrer, et l'écran renvoyait à une liste qui les disait ensuite absentes. Or il n'y a rien à valider : le texte s'enregistre seul. Ranger et supprimer passent derrière un menu, avec des mots. L'état d'écriture se dit lui aussi en toutes lettres — « enregistré » plutôt qu'un signe.
- **Les idées rangées redeviennent atteignables.** Le va-et-vient « à trier / rangées » est une navigation, pas un filtre : replié derrière la loupe en 0.8.4, il rendait les idées rangées introuvables. Il est à l'écran dès qu'il y a quelque chose de rangé.
- **La liste ne prétend plus être vide quand tout est rangé.** Elle dit « Rien à trier : tout est rangé » et propose de voir les idées concernées.

---

## [0.9.1] — 2026-09-05

### Corrections

- **La liste des idées se recharge en revenant d'une note.** Le routeur la resservait depuis son cache : le texte qu'on venait d'écrire n'apparaissait pas, un rangement fait dans la note était ignoré, et une note toute neuve restait invisible. Tous les retours rafraîchissent désormais.
- **Le « + » est centré dans son disque.** C'était le caractère « + » lui-même : son centre optique n'est pas son centre géométrique. Un trait dessiné règle ça.

---

## [0.9.0] — 2026-08-31

### Changements

- **La boîte à idées passe au modèle des applications de notes : deux écrans, pas un.** Elle était bâtie comme un formulaire web — un champ de saisie posé en haut, une liste en dessous. Les corrections successives déplaçaient les filtres et aplatissaient les cartes sans jamais toucher à cette structure.
- **La liste occupe l'écran**, et un bouton « + » flottant ouvre une note **en plein écran**, clavier déjà ouvert.
- **Toucher une note l'ouvre**, en plein écran et modifiable. C'est la vraie conséquence du changement : une idée n'était pas corrigeable une fois écrite, la question ne se pose plus.
- **Plus rien à valider.** Le texte s'enregistre tout seul, et une note neuve n'est créée en base qu'à la première frappe — ouvrir puis revenir ne laisse aucune note vide derrière soi.
- **Une seule action reste sur la ligne : ranger.** C'est le geste répété de cet écran, dont la raison d'être est le tri ; ouvrir la note pour ça demanderait trois gestes au lieu d'un. Rattacher un projet et supprimer vivent dans la note.
- La barre de navigation s'efface sur l'écran de note, comme dans l'éditeur de roman : on en sort par sa propre flèche de retour.

---

## [0.8.4] — 2026-08-31

### Changements

- **La boîte à idées devient une liste, pas une pile de cartes.** Chaque idée était encadrée : une bordure, un fond, deux rembourrages et une marge — près de 50 px par note pour ne rien dire de plus. En lignes séparées d'un filet, on voit **huit notes au lieu de quatre**, et la liste coule au lieu de s'empiler.
- **Chercher et trier montent dans l'en-tête, repliés.** Ils vivaient entre la saisie et la liste, c'est-à-dire sur le chemin qu'on emprunte dix fois par jour pour noter en dix secondes — alors qu'on ne trie qu'à l'occasion. Un bouton loupe les déplie, et signale d'un liseré doré qu'un filtre est actif.
- Les notes longues sont repliées à **trois lignes** plutôt que six : l'aperçu sert à reconnaître une idée, pas à la relire.

---

## [0.8.3] — 2026-08-31

### Corrections

- **Écrire une idée de plus d'une ligne redevient possible sur téléphone.** Entrée envoyait la note, et le retour à la ligne demandait Maj+Entrée — une combinaison qui n'existe pas sur un clavier tactile. Entrée n'envoie désormais qu'au clavier physique ; au doigt, elle fait ce qu'elle dit, et c'est le bouton qui envoie.

### Ajouts

- **Une recherche dans les idées**, à partir de neuf notes. En dessous, elle occuperait une rangée au-dessus d'une liste qu'on lit d'un coup d'œil.
- **Annuler après coup, au lieu de confirmer avant.** Ranger et supprimer se font sans question, et la pastille propose « Annuler » — huit secondes pour la suppression. Une idée supprimée puis rétablie retrouve son identifiant d'origine. Une confirmation modale à chaque geste était un obstacle permanent pour couvrir l'erreur rare.
- **Les notes longues sont repliées à six lignes**, avec « Lire la suite ». Une idée de vingt lignes occupait tout l'écran et cachait les suivantes, alors que la valeur de cette page est de voir d'un coup ce qu'on a noté.

---

## [0.8.2] — 2026-08-31

### Corrections

- **La boîte à idées cesse d'être surtout du mobilier sur petit écran.** Avant la première note : un titre, un sous-titre, un champ de trois lignes, une rangée de bouton et deux rangées de filtres — environ 320 px des 812 d'un iPhone, pour une page dont l'objet est la liste. Le champ tient maintenant sur une ligne qui grandit avec le texte, le bouton se met à côté, les filtres tiennent sur une rangée, et le sous-titre ne s'affiche qu'au bureau. On voit trois notes au lieu d'une et demie.
- **La tablette reçoit le même traitement que le téléphone.** Le correctif de 0.8.1 ne visait que le téléphone : sur iPad en portrait, chaque note gardait son menu déroulant et ses deux boutons. Le seuil n'est pas « petit écran » mais « écran où la ligne d'actions ne tient pas ».
- **Le filtre par projet n'apparaît qu'à partir de deux projets.** En dessous, il occupait une rangée entière pour ne rien trier.

---

## [0.8.1] — 2026-08-31

### Corrections

- **La boîte à idées tient enfin sur un téléphone.** Chaque note portait un menu de projet et deux boutons poussés à droite : à 44 px la cible tactile, ça dépassait la largeur d'un écran et repartait à la ligne en escalier — le projet s'affichant deux fois au passage, en pastille puis en menu. Sur téléphone, la note ne montre plus que son texte, sa date et son projet ; les actions passent derrière un bouton unique qui les déplie sur place, avec des libellés plutôt que des glyphes.
- **La barre de filtres passe sur deux rangées** sur petit écran au lieu de déborder : le menu des projets prend la largeur, les deux états se partagent la ligne suivante.

---

## [0.8.0] — 2026-08-31

### Ajouts

- **La boîte à idées.** Une idée arrive rarement à son heure : dans le métro, sous la douche, à deux heures du matin. Elle finissait dans les notes du téléphone, dans un carnet, ou nulle part. Un champ, un bouton — pas de titre, pas de catégorie, pas de projet obligatoire : une idée qu'il faut classer avant de l'écrire est une idée perdue. Entrée pour noter, Maj+Entrée pour une nouvelle ligne. Nécessite la migration `migration-ideas.sql`.
- **Une idée sans projet se consulte de partout.** La boîte se lit par utilisatrice, jamais par projet : rattacher un projet sert à s'y retrouver quand la boîte grossit, jamais à cloisonner. Une idée notée sans savoir à quel roman elle appartient reste visible où qu'on aille.
- **Ranger n'est pas supprimer.** Une idée rangée sort de la boîte à trier sans quitter Autris, et se remet à trier d'un geste. La suppression définitive existe, séparément, avec confirmation.
- **« Idées » devient la première entrée de la barre du téléphone**, avant « Écrire » et « Projets » — c'est la raison d'être de cette surface. Elle rejoint aussi la barre latérale au bureau.

---

## [0.7.5] — 2026-08-31

### Corrections

- **Changer de panneau depuis le rail marche enfin du premier coup.** Le panneau restant monté, l'onglet demandé n'était lu qu'à la première ouverture : passer d'« Infos » à « Univers » ne changeait rien, il fallait refermer puis rouvrir. Le rail pilote désormais l'onglet plutôt que de suggérer une valeur de départ.
- **Les onglets du panneau disparaissent sur téléphone.** Le rail du bas *est* la barre d'onglets : la doubler juste au-dessus faisait deux rangées pour le même choix, sur l'écran où la place manque le plus.

---

## [0.7.4] — 2026-08-31

### Corrections

- **La barre de l'éditeur ne se déforme plus sur téléphone.** Le fil d'Ariane comptait trois niveaux — projet, roman, chapitre — qui enroulaient la ligne dans une barre de hauteur fixe : le titre du chapitre, seul à dire où l'on écrit, passait hors champ. Seul le projet en sort ; le roman et le chapitre restent et se tronquent, le roman en premier. La pastille de statut et le bloc de droite ne se laissent plus comprimer.

---

## [0.7.3] — 2026-08-31

### Ajouts

- **Un bouton pour fermer le clavier**, épinglé à droite de la barre de mise en forme. Sans lui, quitter l'écriture demandait de toucher « à côté » du texte — or dès que le chapitre remplit l'écran, il n'y a plus de « à côté » : tout est du texte, et le toucher garde le clavier. Le rail des panneaux devenait inatteignable. Les outils défilent, cette sortie non.

### Changements

- **Le pomodoro disparaît de l'éditeur sur téléphone.** Il occupe la largeur d'un titre de chapitre, sur un écran où le fil d'Ariane n'a déjà pas la place de se lire. C'est un outil de séance de travail, pas de mobilité.
- **« sauvegardé » devient une coche sur téléphone**, et « sauvegarde… » trois points. Même information, cinq fois moins de place — le mot complet reste au bureau, et l'intitulé reste lisible par une synthèse vocale.

---

## [0.7.2] — 2026-08-31

### Changements

- **La barre de mise en forme change de nature sur téléphone.** Celle du bureau flotte, se déplace au glisser, s'ancre à quatre bords et se réduit en pastille — aucun de ces gestes n'existe au doigt, et elle se disputerait la place avec le clavier. Sur téléphone, une barre fixe se pose **juste au-dessus du clavier**, la seule position qui ne demande pas de viser. Elle n'apparaît que pendant la frappe : au repos, elle rendrait le rail des panneaux inaccessible.
- Les deux barres montrent **exactement les mêmes outils**, dans le même ordre, depuis une source unique — deux listes parallèles auraient divergé à la première addition. Sur téléphone elles défilent horizontalement plutôt que d'être triées : décider lesquelles sont « essentielles » créerait deux vocabulaires pour une seule fonction.

---

## [0.7.1] — 2026-08-31

### Ajouts

- **L'éditeur devient utilisable sur téléphone.** Ses deux panneaux — la structure du roman à gauche, le contexte du chapitre à droite — n'avaient pas de place en colonnes sur 375 px : ils disparaissaient, et l'on ne pouvait même plus changer de chapitre. Ils reviennent par un **rail en bas de l'écran** : Chapitres, Infos, Scènes, Univers.
- **Une entrée touchée déplie la page entière.** Un panneau de 280 px superposé à un écran de 375 serait illisible, alors qu'une liste de chapitres ou de scènes se lit très bien en pleine page. On consulte, on ferme, on retourne au texte — et choisir un chapitre referme tout seul.

### Changements

- **Trois boutons de la barre de l'éditeur disparaissent sur téléphone.** Deux pilotaient les panneaux latéraux, qui n'existent pas à cette largeur — le rail les remplace. Le troisième exportait le roman en Word : on le récupère sur l'ordinateur où on l'ouvrira.
- La feuille d'écriture se colle aux bords sur téléphone : 64 px de marge sur 375 px de large, c'était un tiers de la largeur perdu.

---

## [0.7.0] — 2026-08-31

### Ajouts

- **Le socle des versions mobile et tablette.** Autris ne suppose plus un grand écran et une souris. Rien ne change au bureau ; ce qui change, c'est ce qui devient possible ensuite.
- **Une barre de navigation en bas sur téléphone** — Accueil, Écrire, Projets — plutôt qu'une barre latérale de 240 px qui ne laisserait rien à lire, et plutôt qu'un tiroir qui mettrait chaque destination à deux gestes. Elle tient compte de la barre d'accueil des iPhone récents.
- **Un anneau de focus au clavier.** Il n'en existait aucun : au Tab, on ne voyait pas où l'on était. Vrai au bureau, et vrai sur un iPad avec clavier.
- **Des cibles de 44 px là où le doigt sert.** Les boutons à icône font 28 px — sous le seuil où l'on vise juste au doigt. Le bureau garde sa densité : la règle ne s'applique que si l'écran est tactile.

### Changements

- **Le sélecteur de thème ne s'affiche plus sur téléphone.** Ses deux variantes sont posées en bas de l'écran, exactement où vit la barre de navigation — et sur 375 px, une pastille flottante de plus mange une place qu'il n'y a pas. Le thème choisi ailleurs continue de s'appliquer.
- **Le bouton de retour bêta remonte au-dessus de la barre de navigation** sur téléphone, où il se serait retrouvé dessous.
- **La barre latérale se superpose au contenu sur tablette** au lieu de le comprimer, et démarre repliée sur toute largeur de tablette. À 834 px, lui céder 240 px mettait la lecture à l'étroit pour un arbre qu'on ne consulte que par intermittence.
- La hauteur de la barre latérale passe de `100vh` à `100dvh` : sur iOS, `100vh` compte une barre d'adresse qui n'est pas là, et le bas de la colonne passait hors écran.

---

## [0.6.7] — 2026-08-31

### Retraits

- Le panneau des gestes n'explique plus ce que dit une flèche : une flèche se lit sans mode d'emploi. Il ne liste que les gestes, qui eux ne se devinent pas.

---

## [0.6.6] — 2026-08-31

### Ajouts

- **Les gestes du plateau sont écrits quelque part.** Un bouton « ? » ouvre la liste : déplacer, zoomer, lasso, double-clic pour ouvrir une fiche, tirer un lien depuis un bord, annuler. Ces gestes existaient depuis le début sans que rien ne les signale — celle qui ne les connaissait pas ne pouvait pas les découvrir.
- **Un plateau créé s'ouvre avec un mot d'accueil.** Seul le tout premier en recevait un ; les suivants s'ouvraient sur une surface infinie et muette.

### Changements

- **La barre du plateau tient en deux familles.** Les cinq boutons de création — post-it, cadre, texte, forme, image — sont réunis derrière un seul « Ajouter », avec ce que chacun fait écrit à côté. Le reste de la barre sert désormais uniquement à regarder le plateau : chercher, filtrer, recentrer, exporter.
- **« Les liens manquants » quitte le menu « Déplier ».** Elle ne dépliait rien : elle ne pose aucune fiche et agit sur le plateau entier. Elle rejoint la barre, avec le recentrage et l'export.
- **Onze états vides disent quoi faire.** « Aucune fiche », « Aucun projet », « Aucun chapitre » s'arrêtaient au constat, au moment précis où l'on a le plus besoin d'être guidée.
- **L'application ne tutoie plus par endroits.** Quatre textes disaient « tu » quand tout le reste vouvoie. Seule exception, volontaire : « Qu'est-ce que tu ne m'as dit sur toi ? » s'adresse au personnage, pas à l'autrice.

### Corrections

- **La palette de couleurs ne sort plus de l'écran.** La barre contextuelle se calait en supposant une largeur fixe ; les sept pastilles ajoutées en 0.6.0 l'avaient fait plus que doubler. Elle se mesure désormais.

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
