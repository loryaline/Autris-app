# Checklist QA — Autris

Session de QA complète. Cocher au fur et à mesure.
Les points visuels sont à vérifier idéalement sur les **6 thèmes** : fantasy / sf / corporate × light / dark.

---

## 0. Transverse (à vérifier partout)

- [x] Aucun flash de thème au chargement (anti-flash) sur rechargement dur
- [x] Changement de thème via ThemeBar : les 6 combinaisons s'appliquent instantanément
- [x] Choix de thème persisté après rechargement et navigation
- [x] Contraste lisible du texte sur chaque thème (titres, texte secondaire, boutons accent)
- [x] Responsive : largeur réduite / tablette — pas de débordement horizontal
- [x] Bouton feedback flottant présent et fonctionnel sur toutes les pages app
- [ ] ThemeBar : bouton « − » → réduit en pastille près du bouton bug ; clic → rétablit
- [ ] État réduit/déplié de la ThemeBar persisté après rechargement
- [ ] Italique (Cormorant, thème fantasy) à taille cohérente avec le texte sans

## 1. Authentification

- [ ] Inscription nouveau compte → redirige vers onboarding
- [ ] Connexion compte existant → redirige vers l'accueil
- [ ] Mauvais identifiants → message d'erreur clair
- [ ] Déconnexion (menu engrenage Topbar) → retour login
- [ ] Accès à une page app sans être connecté → redirection login

## 2. Onboarding

- [ ] Parcours complet des 6 étapes (accueil → persona → projet → template → objectifs → final)
- [ ] Halo thémé visible en fond (sauf corporate)
- [ ] Boutons « Continuer » désactivés tant que l'étape est incomplète
- [ ] Bouton « Retour » fonctionne
- [ ] « Je connais déjà → éditeur » saute l'onboarding
- [ ] Contraste du texte des boutons accent correct sur les 6 thèmes
- [ ] Mots en italique des titres bien espacés (pas de « structurepour »)
- [ ] Étape finale : carte « Recommandé » mise en avant selon le persona choisi
- [ ] Étape finale : les 3 destinations (Écrire / Personnages / Planifier) créent bien projet + roman + chapitre et redirigent

## 3. Sidebar & Topbar

- [ ] Arbre projets : 3 niveaux (projet → romans → feuilles Planif/Rédaction)
- [ ] Chevron replie/déplie un projet
- [ ] Filtre de recherche projets/romans + bouton ×
- [ ] Lien World Building (globe) par projet
- [ ] Marqueurs de statut des romans (todo / writing / done) corrects
- [ ] Roman actif marqué ✦
- [ ] Item actif surligné selon la route courante
- [ ] Survol d'un roman → icônes Planif / Rédaction (vaut pour les romans inactifs)
- [ ] Carte utilisateur → /settings
- [ ] Topbar : fil d'Ariane correct selon la page
- [ ] Menu engrenage : Paramètres + Se déconnecter

## 4. Dashboard (accueil)

- [ ] Espacement vertical correct entre hero / stats / objectif-univers
- [ ] Hero « Reprendre l'écriture » → dernier chapitre/roman corrects
- [ ] Hero alternatif « Esquissez votre univers » → persona Explorateur sans fiche WB
- [ ] 4 stat-cards : valeurs correctes (mots, romans, projets, jours d'écriture)
- [ ] Effet glint au survol des stat-cards
- [ ] GoalCard : roman actif, progression depuis activation, métriques (fin estimée, rythme, restant, statut)
- [ ] Calendrier : clic sur un jour → panneau de détail se met à jour
- [ ] Jours futurs non cliquables
- [ ] Détail du jour : mots / fiches WB / planif corrects
- [ ] Faits marquants : meilleur jour, moyenne, activité dominante
- [ ] Jalons affichés sur les bonnes dates du calendrier
- [ ] Cartes projets (board) : titre + orbe sans chevauchement, jauge, liste romans, activation ✦, cycle de statut
- [ ] Bandeau « Premiers pas » visible pour le persona Explorateur uniquement
- [ ] Bouton « + Nouveau projet » → modal → création OK
- [ ] Ajout / suppression de roman, suppression de projet
- [ ] État vide (aucun projet) affiché correctement
- [ ] Alertes jalons + nudge WB masqués pour le persona Autonome

## 5. Éditeur

- [ ] Ouverture d'un roman charge le bon chapitre
- [ ] Frappe fluide, pas d'écrasement de lettres (test iOS Safari si possible)
- [ ] Sauvegarde auto (statut « sauvegarde… » → « sauvegardé »)
- [ ] FloatingToolbar : gras / italique / souligné / barré, H1-H3, citation, liste, séparateur, ornement appliquent bien le format
- [ ] 4 ancres (haut / bas / gauche / droite) repositionnent la barre
- [ ] Glisser-déposer (poignée ⋮⋮) → position libre, l'orientation est conservée
- [ ] La barre reste visible quand on scrolle le texte
- [ ] Bouton « − » → barre réduite en pastille près du bouton bug ; clic → rétablit
- [ ] Feuille de papier : rendu thémé (parchemin / near-white / blanc) + police par thème
- [ ] Mode focus : bouton sur le papier, panneaux masqués, sortie par Échap
- [ ] Bascules panneaux structure / contexte dans le fil d'Ariane
- [ ] Conseil contextuel sous le fil d'Ariane (persona Explorateur uniquement)
- [ ] Structure : ajout / renommage / suppression / réordonnancement de chapitres
- [ ] Changement de statut de chapitre
- [ ] Versions : création manuelle, auto (3 min), restauration, version créée même avec 1 seul chapitre
- [ ] Pomodoro : démarrage / pause / reset
- [ ] Bouton d'export → télécharge le roman complet en .docx (page de titre, un chapitre par section)
- [ ] Retour accueil bloqué pendant une sauvegarde en cours

## 6. Onglet Univers (éditeur)

- [ ] Pills « Liées » / « Toutes » avec compteurs corrects
- [ ] Recherche (scope Toutes) + filtre catégorie
- [ ] Sections de catégories repliables — chevrons bien visibles
- [ ] Cartes : image ou glyphe (initiale perso / icône catégorie), badge catégorie
- [ ] Personnages en format carré, autres en 16/9
- [ ] 2 vignettes par ligne en largeur normale, 3 quand le panneau est élargi
- [ ] Bouton de liaison rond : lier / délier une fiche au chapitre
- [ ] Clic sur une carte → ouvre la fiche en aperçu
- [ ] « + Fiche » → menu de création par catégorie
- [ ] « Bibliothèque ↗ » ouvre le WB complet

## 7. World Building

- [ ] Sous-sidebar : catégories groupées (style wb-cat), état actif accent, compteurs
- [ ] Accueil WB : groupes, compteurs, fiches récentes
- [ ] Création / édition / suppression de fiche par catégorie
- [ ] Grille de fiches + carte « + Nouvelle fiche »
- [ ] Image principale, galerie (upload, réordonnancement, suppression, max 10)
- [ ] Liens entre fiches
- [ ] Moodboard
- [ ] Vue tableau (mœurs) pour Univers & Monde
- [ ] Bouton « Exporter l'univers » → télécharge un .zip (un .md par fiche, dossier par catégorie)
- [ ] Le .zip s'importe dans Notion et recrée l'arborescence des fiches

## 8. Planification

- [ ] Sous-sidebar : 5 vues (Chapitrage, Outline, Synopsis, Post-its, Gantt)
- [ ] Onglet actif conservé après rechargement de la page (URL ?view=…)
- [ ] Titre du roman ne chevauche pas le compteur de chapitres
- [ ] ChapterTable : édition des cellules, synopsis, thèmes
- [ ] Badges de beats affichés sur les chapitres rattachés
- [ ] Export CSV du chapitrage
- [ ] Milestones : ajout, édition, suppression, toggle 3 états (à faire / en cours / terminé)
- [ ] OutlineView fonctionne

## 9. Méthodes narratives (bande Structure)

- [ ] Bande « Structure narrative » au-dessus du Chapitrage
- [ ] Bouton « Méthode narrative » (sous Exporter/Nouveau chapitre) → modal
- [ ] Changement de méthode : avertissement clair, chapitres/colonnes/scènes conservés
- [ ] 3 actes / Voyage du héros / Save the Cat : cartes-beats ordonnées par acte
- [ ] Rattacher un beat à un chapitre via le select → badge sur le chapitre
- [ ] Détacher un beat (option vide du select)
- [ ] Compteur de complétion (« N/M beats placés »)
- [ ] Snowflake : checklist en panneau latéral (ne masque pas le tableau)
- [ ] Snowflake : cases à cocher, étapes avec notes (1, 2)
- [ ] Snowflake : boutons d'action — perso/fiches → WB, page/synopsis → onglet Synopsis, chapitres → Chapitrage, scènes → Outline
- [ ] Seeding : un roman créé via l'onboarding avec une méthode a ses beats au 1er passage sur la planif

## 10. Onglet Synopsis (planification)

- [ ] Démarre avec un synopsis (créé automatiquement)
- [ ] Sous-onglets : ajouter (+), dupliquer, supprimer (désactivé si un seul)
- [ ] Renommer un synopsis (double-clic sur l'onglet actif)
- [ ] Éditeur de texte riche + barre flottante, sauvegarde auto
- [ ] Barre flottante alignée sous les sous-onglets (pas de chevauchement)
- [ ] Bouton « Exporter » → télécharge le synopsis actif en .docx

## 11. Adaptation par persona

- [ ] Explorateur : nudges, bandeau Premiers pas, conseils contextuels visibles
- [ ] Autonome : aucun nudge ni conseil
- [ ] Planificateur / Marathonien : nudges oui, conseils non
- [ ] Changer de persona dans les Paramètres → l'interface se reconfigure au chargement suivant

## 12. Paramètres & projet

- [ ] /settings : modification username, préférences
- [ ] Sélecteur de persona + durée pomodoro
- [ ] « Refaire la configuration » → onboarding en mode redo (parcours réduit, aucun projet créé)
- [ ] Paramètres projet : titre, genre, cover, objectifs du roman
- [ ] Export DOCX du roman depuis les paramètres projet
- [ ] Activation d'un roman pose bien `activated_at` / `activation_word_count`

## 13. Pages légales & divers

- [ ] /legal, CGU, confidentialité, mentions s'affichent
- [ ] Page 404 (not-found)
- [ ] Page d'erreur (error boundary)

---

## Anomalies relevées

| # | Zone | Description | Sévérité | Statut |
|---|------|-------------|----------|--------|
|   |      |             |          |        |
