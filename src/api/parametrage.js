/**
 * Appels API : paramètres généraux et mots de passe (module Paramétrage).
 * Les listes (fournisseurs, formes, médicaments, utilisateurs) passent par le store « referentiel ».
 */
import api from '@/services/api'

/** Liste des paramètres généraux. */
export async function listerParametres() {
  const { data } = await api.get('/parametres')
  return data
}

/** Change la valeur d'un paramètre. */
export async function modifierParametre(cle, valeur) {
  const { data } = await api.patch(`/parametres/${cle}`, { valeur })
  return data
}

/** Réinitialise le mot de passe d'un utilisateur (administrateur). */
export async function reinitialiserMotDePasse(id, motDePasse) {
  const { data } = await api.patch(`/utilisateurs/${id}/mot-de-passe`, { motDePasse })
  return data
}

// ----------------------------------------------------------------------------
// PRIX (onglet Prix)
// ----------------------------------------------------------------------------

/** Historique des prix de vente d'un médicament. */
export async function historiquePrixVente(produitId) {
  const { data } = await api.get('/prix/vente', { params: { produitId } })
  return data
}

/** Historique des prix d'achat (lignes de réception). */
export async function historiquePrixAchat(produitId) {
  const { data } = await api.get('/prix/achat', { params: { produitId } })
  return data
}

/** Nouveau prix de vente (à partir d'aujourd'hui). */
export async function creerPrixVente(donnees) {
  const { data } = await api.post('/prix/vente', donnees)
  return data
}

/** Corrige le prix de vente EN COURS (erreur de saisie) : { prixBoite, prixPlaque, motif }. */
export async function corrigerPrixVente(id, donnees) {
  const { data } = await api.patch(`/prix/vente/${id}/corriger`, donnees)
  return data
}
