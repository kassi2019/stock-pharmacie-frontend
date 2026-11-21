/**
 * =============================================================================
 * APPELS API : MODULE UTILISATEURS (comme le district)
 * =============================================================================
 *   - PERSONNEL : fiches du personnel (+ compte de connexion en même temps) ;
 *   - COMPTES   : profil, activation, mot de passe (identifiant = matricule) ;
 *   - PROFILS   : liste pour les listes déroulantes (gestion : store « referentiel »).
 * =============================================================================
 */
import api from '@/services/api'

export const listerPersonnel = async () => (await api.get('/personnel')).data

/** Nouvelle fiche ; « compte: { role, motDePasse } » crée aussi le compte. */
export const creerPersonnel = async (donnees) => (await api.post('/personnel', donnees)).data

/** Modification d'une fiche, ou activation : { actif: false } (le compte suit). */
export const modifierPersonnel = async (id, donnees) => (await api.patch(`/personnel/${id}`, donnees)).data

/** Compte pour une personne qui n'en a pas : { role, motDePasse }. */
export const creerComptePersonnel = async (id, compte) => (await api.post(`/personnel/${id}/compte`, compte)).data

export const listerComptes = async () => (await api.get('/utilisateurs')).data
export const listerProfilsComptes = async () => (await api.get('/utilisateurs/profils')).data

/** Compte pour une personne existante : { personnelId, role, motDePasse }. */
export const creerCompte = async (donnees) => (await api.post('/utilisateurs', donnees)).data

/** { role } ou { actif } */
export const modifierCompte = async (id, donnees) => (await api.patch(`/utilisateurs/${id}`, donnees)).data

export const reinitialiserMotDePasse = async (id, motDePasse) =>
  (await api.patch(`/utilisateurs/${id}/mot-de-passe`, { motDePasse })).data

/**
 * Règle des mots de passe (la même que le serveur) : au moins 8 caractères,
 * une lettre et un chiffre. Renvoie le message d'erreur, ou '' si correct.
 */
export function verifierMotDePasse(motDePasse, confirmation) {
  if (!motDePasse || motDePasse.length < 8 || !/[A-Za-z]/.test(motDePasse) || !/\d/.test(motDePasse)) {
    return 'Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.'
  }
  if (confirmation !== undefined && motDePasse !== confirmation) return 'La confirmation ne correspond pas au mot de passe.'
  return ''
}
