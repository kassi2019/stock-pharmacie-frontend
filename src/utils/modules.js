/**
 * Modules de l'application, DANS L'ORDRE D'AFFICHAGE (tuiles 01, 02… de l'accueil,
 * grille des profils) : mise en place (Paramétrage, Utilisateurs), circuit du stock
 * (entrées -> dispensation -> alertes et retraits -> inventaires), paie, puis rapports.
 * Source unique pour les tuiles de l'accueil, les routes et la grille des droits
 * des profils (Utilisateurs > Profils & droits).
 *
 * - route : nom de la route Vue Router de la page du module (= code du module dans les droits)
 * - lot : lot de livraison (§ 19) ; disponible = déjà développé
 * - droits : droits qu'on peut donner sur ce module à un profil
 *            (VOIR, IMPRIMER, MODIFIER, et VALIDER pour certains modules)
 * - tuile : false = pas de tuile sur l'accueil (droits seulement : ex. Médicaments et prix,
 *           onglets du Paramétrage)
 * - accesAussi : la tuile s'ouvre aussi avec le droit VOIR de ces modules
 * - mobile : proposé sur l'application mobile (§ 17 : stock et états, alertes, retraits, points financiers)
 *
 * Qui voit / modifie quoi : décidé par le PROFIL de l'utilisateur (store auth).
 * Les mêmes codes et droits sont vérifiés par le serveur (backend src/auth/droits.ts).
 */
const VIM = ['VOIR', 'IMPRIMER', 'MODIFIER']

export const MODULES = [
  {
    route: "parametres",
    droits: VIM,
    accesAussi: ["produits"],
    mobile: true,
    titre: "Paramétrage",
    court: "Paramétrage",
    icone: "reglages",
    description:
      "Médicaments et prix, fournisseurs, familles, formes, unités de comptage, fonctions et réglages",
    chapitre: "§ 5, § 7, § 8, § 13.2",
    lot: 1,
    disponible: true,
  },
  {
    // Onglets « Médicaments » et « Prix » du Paramétrage : droits propres, pas de tuile
    route: "produits",
    droits: VIM,
    tuile: false,
    titre: "Médicaments et prix (Paramétrage)",
    court: "Médicaments",
    icone: "pilule",
    description:
      "Catalogue des médicaments, prix de vente et d’achat, stock et lots par produit.",
    chapitre: "§ 7",
    lot: 1,
    disponible: true,
  },
  {
    route: "utilisateurs",
    droits: VIM,
    titre: "Utilisateurs",
    court: "Utilisateurs",
    icone: "utilisateurs",
    description:
      "Personnel de la pharmacie, comptes de connexion (identifiant = matricule), profils et droits d’accès.",
    chapitre: "§ 5",
    lot: 6,
    disponible: true,
  },
  {
    route: "receptions",
    droits: VIM,
    titre: "Entrées en stock",
    court: "Entrées",
    icone: "entree",
    description:
      "Réceptions par lot : N° de lot, péremption, quantité et prix d’achat.",
    chapitre: "§ 9",
    lot: 1,
    disponible: true,
  },
  {
    route: "dispensation",
    droits: [...VIM, 'VALIDER'],
    titre: "Ventes et dispensations",
    court: "Dispensation",
    icone: "sortie",
    description:
      "Gestion des ventes, délivrance des médicaments et suivi des mouvements de stock.",
    chapitre: "§ 10.1",
    lot: 2,
    disponible: true,
  },
  {
    route: "retraits",
    droits: VIM,
    mobile: true,
    titre: "Alertes, lots et retraits",
    court: "Alertes et retraits",
    icone: "cloche",
    description:
      "Stock bas et états du stock, lots proches de la péremption, retraits tracés avec motif.",
    chapitre: "§ 10.2, § 11, § 13",
    lot: 2,
    disponible: true,
  },
  {
    route: "inventaires",
    droits: [...VIM, 'VALIDER'],
    titre: "Inventaires et mouvements",
    court: "Inventaires",
    icone: "liste",
    description:
      "Comptage par lot, écarts justifiés et validés ; historique de tous les mouvements avec leur auteur.",
    chapitre: "§ 12, § 14",
    lot: 3,
    disponible: true,
  },
  {
    route: "paie",
    droits: [...VIM, 'VALIDER'],
    titre: "Gestion de la paie",
    court: "Paie",
    icone: "portefeuille",
    description:
      "Salaires de base, bulletins mensuels avec primes et retenues, validation et paiement du personnel.",
    chapitre: "Complément",
    lot: 6,
    disponible: true,
  },
  {
    route: "rapports",
    droits: ['VOIR', 'IMPRIMER'],
    mobile: true,
    titre: "Rapports et points financiers",
    court: "Rapports",
    icone: "graphique",
    description:
      "Valorisation du stock, points financiers, exports Excel et PDF.",
    chapitre: "§ 15",
    lot: 5,
    disponible: true,
  },
];

export const moduleParRoute = (nom) => MODULES.find((m) => m.route === nom)

/** Libellés des droits (grille des profils). */
export const LIBELLES_DROITS = { VOIR: 'Voir', IMPRIMER: 'Imprimer', MODIFIER: 'Modifier', VALIDER: 'Valider' }

/** Ce que veut dire VALIDER dans les modules qui l'ont. */
export const SENS_VALIDER = {
  dispensation: 'annuler une dispensation',
  inventaires: 'valider les comptages, ouvrir / annuler un inventaire',
  paie: 'valider les bulletins, les remettre en brouillon, enregistrer leur paiement',
}

/** Droits sur les données (montants et quantités), en plus des modules. */
export const DROITS_DONNEES = [
  {
    route: 'prixVente',
    titre: 'Prix de vente et quantités',
    description: 'Prix de vente, stock disponible, états de stock (sans ce droit : catalogue seul, comme pour le médecin).',
    droits: ['VOIR'],
  },
  {
    route: 'prixAchat',
    titre: "Prix d'achat et valorisation",
    description: "Prix d'achat des lots, valeur des retraits, des péremptions et des inventaires.",
    droits: ['VOIR'],
  },
]
