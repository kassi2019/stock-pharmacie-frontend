/**
 * Appels API : module GESTION DE LA PAIE (salaires de base, bulletins).
 */
import api from '@/services/api'

export const listerSalaires = async () => (await api.get('/paie/salaires')).data
export const modifierSalaire = async (personnelId, salaireBase) =>
  (await api.patch(`/paie/salaires/${personnelId}`, { salaireBase })).data

/** filtres : { mois: 'AAAA-MM' } ou { personnelId, annee } */
export const listerBulletins = async (filtres) => (await api.get('/paie/bulletins', { params: filtres })).data

/** Bulletins brouillons pour tout le personnel actif : { crees, existants } */
export const preparerMois = async (mois) => (await api.post('/paie/preparer', { mois })).data
export const nouveauBulletin = async (personnelId, mois) => (await api.post('/paie/bulletins', { personnelId, mois })).data

/** { salaireBase?, lignes?: [{ type: 'PRIME'|'RETENUE', libelle, montant }], observation? } */
export const modifierBulletin = async (id, donnees) => (await api.patch(`/paie/bulletins/${id}`, donnees)).data
export const supprimerBulletin = async (id) => (await api.delete(`/paie/bulletins/${id}`)).data
export const validerBulletin = async (id) => (await api.post(`/paie/bulletins/${id}/valider`)).data
export const remettreEnBrouillon = async (id) => (await api.post(`/paie/bulletins/${id}/brouillon`)).data
/** { datePaiement: 'AAAA-MM-JJ', modePaiement } */
export const payerBulletin = async (id, paiement) => (await api.post(`/paie/bulletins/${id}/payer`, paiement)).data
export const validerMois = async (mois) => (await api.post('/paie/valider', { mois })).data

export const MODES_PAIEMENT = [
  { id: 'ESPECES', libelle: 'Espèces' },
  { id: 'VIREMENT', libelle: 'Virement bancaire' },
  { id: 'MOBILE_MONEY', libelle: 'Mobile money' },
  { id: 'CHEQUE', libelle: 'Chèque' },
]
export const STATUTS_BULLETIN = {
  BROUILLON: { libelle: 'Brouillon', badge: 'badge-gris' },
  VALIDE: { libelle: 'Validé', badge: 'badge-orange' },
  PAYE: { libelle: 'Payé', badge: 'badge-vert' },
}
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
/** « 2026-11 » -> « novembre 2026 » */
export const libelleMois = (mois) => (mois ? `${NOMS_MOIS[Number(mois.slice(5, 7)) - 1]} ${mois.slice(0, 4)}` : '')
