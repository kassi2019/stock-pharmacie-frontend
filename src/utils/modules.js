/**
 * Modules de l'application (un par chapitre du cahier des charges).
 * Source unique pour le menu latéral, les tuiles de l'accueil et les routes.
 *
 * - route : nom de la route Vue Router de la page du module
 * - lot : lot de livraison (§ 19) ; disponible = déjà développé
 * - roles : rôles qui voient le module (vide = tous)
 * - rolesModif : rôles qui peuvent modifier (boutons v-si-modif) ; par défaut ADMIN et RESPONSABLE
 * - mobile : proposé sur l'application mobile (§ 17 : stock et états, alertes, retraits, points financiers)
 */
const GESTION = ['ADMIN', 'RESPONSABLE']
const PHARMACIE = ['ADMIN', 'RESPONSABLE', 'AGENT']
const LECTURE_STOCK = ['ADMIN', 'RESPONSABLE', 'AGENT', 'CAISSIER', 'DIRECTION']

export const MODULES = [
  {
    route: 'parametres',
    titre: 'Paramétrage',
    court: 'Paramétrage',
    icone: 'reglages',
    description: 'Fournisseurs, familles, formes, unités de vente, utilisateurs et réglages',
    chapitre: '§ 5, § 7, § 8, § 13.2',
    lot: 1,
    disponible: true,
    roles: GESTION,
    rolesModif: GESTION,
  },
  {
    route: 'produits',
    mobile: true,
    titre: 'Produits et médicaments',
    court: 'Produits',
    icone: 'pilule',
    description: 'Catalogue des médicaments, prix de vente et d’achat, stock et lots par produit.',
    chapitre: '§ 7',
    lot: 1,
    disponible: true,
    roles: [],
  },
  {
    route: 'receptions',
    titre: 'Entrées en stock',
    court: 'Entrées',
    icone: 'entree',
    description: 'Réceptions par lot : N° de lot, péremption, quantité et prix d’achat.',
    chapitre: '§ 9',
    lot: 1,
    disponible: true,
    roles: [...GESTION, 'DIRECTION'],
  },
  {
    route: 'dispensation',
    titre: 'Dispensation',
    court: 'Dispensation',
    icone: 'sortie',
    description: 'Délivrance des ordonnances : sortie de stock en FEFO, annulation avec motif.',
    chapitre: '§ 10.1',
    lot: 2,
    disponible: true,
    roles: [...PHARMACIE, 'CAISSIER', 'DIRECTION'],
    rolesModif: PHARMACIE,
  },
  {
    route: 'retraits',
    mobile: true,
    titre: 'Retraits de lots',
    court: 'Retraits',
    icone: 'corbeille',
    description: 'Retour fournisseur, casse, perte, périmé : retrait tracé avec motif.',
    chapitre: '§ 10.2',
    lot: 2,
    disponible: true,
    roles: [...PHARMACIE, 'DIRECTION'],
    rolesModif: GESTION,
  },
  {
    route: 'peremptions',
    mobile: true,
    titre: 'Lots et péremptions',
    court: 'Péremptions',
    icone: 'calendrier',
    description: 'Lots proches de la péremption, retrait automatique des périmés.',
    chapitre: '§ 11',
    lot: 2,
    disponible: true,
    roles: LECTURE_STOCK,
    rolesModif: GESTION,
  },
  {
    route: 'inventaires',
    titre: 'Inventaires',
    court: 'Inventaires',
    icone: 'liste',
    description: 'Comptage par lot, écarts justifiés, validation et correctifs.',
    chapitre: '§ 12',
    lot: 3,
    disponible: true,
    roles: [...PHARMACIE, 'DIRECTION'],
    rolesModif: GESTION,
  },
  {
    route: 'alertes',
    mobile: true,
    titre: 'Seuils et alertes',
    court: 'Alertes',
    icone: 'cloche',
    description: 'États de stock en couleur, stock bas, ruptures et surstocks.',
    chapitre: '§ 13',
    lot: 4,
    disponible: true,
    rolesModif: GESTION,
    roles: LECTURE_STOCK,
  },
  {
    route: 'mouvements',
    titre: 'Mouvements',
    court: 'Mouvements',
    icone: 'fleches',
    description: 'Toutes les entrées, sorties, retraits et correctifs, avec leur auteur.',
    chapitre: '§ 14',
    lot: 2,
    disponible: true,
    roles: [...GESTION, 'AGENT', 'DIRECTION'],
  },
  {
    route: 'rapports',
    mobile: true,
    titre: 'Rapports et points financiers',
    court: 'Rapports',
    icone: 'graphique',
    description: 'Valorisation du stock, points financiers, exports Excel et PDF.',
    chapitre: '§ 15',
    lot: 5,
    disponible: true,
    roles: [...GESTION, 'DIRECTION'],
  },
]

export const moduleParRoute = (nom) => MODULES.find((m) => m.route === nom)
