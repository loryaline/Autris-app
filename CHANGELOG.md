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
