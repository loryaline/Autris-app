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
