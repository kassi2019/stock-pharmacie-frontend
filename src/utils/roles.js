/** Libellés des rôles (cahier des charges § 5). */
export const ROLES = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable de pharmacie',
  AGENT: 'Agent de pharmacie',
  CAISSIER: 'Caissier',
  MEDECIN: 'Médecin / sage-femme',
  DIRECTION: 'Direction',
}

/** Droits de chaque rôle sur le module stock (§ 5), affichés dans le formulaire des comptes. */
export const DESCRIPTIONS_ROLES = {
  ADMIN: 'Tous les droits, dont le paramétrage, les utilisateurs et les réglages du module.',
  RESPONSABLE: 'Catalogue, fournisseurs, entrées, retraits, inventaires (validation), rapports et points financiers.',
  AGENT: 'Consultation du stock et des alertes, dispensation, comptage d’inventaire (sans validation).',
  CAISSIER: 'Lecture du stock et des prix de vente ; aucun mouvement de stock.',
  MEDECIN: 'Lecture du catalogue pour la prescription (sans prix ni quantités).',
  DIRECTION: 'Lecture des états de stock, des rapports et des points financiers.',
}

/** Liste pour les listes déroulantes : [{ id: 'ADMIN', libelle: 'Administrateur' }, …] */
export const LISTE_ROLES = Object.entries(ROLES).map(([id, libelle]) => ({ id, libelle }))

export const GESTION_STOCK = ['ADMIN', 'RESPONSABLE']
export const PRIX_ACHAT = ['ADMIN', 'RESPONSABLE', 'AGENT', 'DIRECTION']
