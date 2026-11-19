/**
 * =============================================================================
 * MODULE VUEX « referentiel » : données de référence (module Paramétrage)
 * =============================================================================
 * Même fonctionnement que l'application de district :
 *
 *     store.dispatch('referentiel/charger', { liste: 'fournisseurs' })
 *     store.dispatch('referentiel/enregistrer', { liste: 'formes', element: {...} })
 *     store.dispatch('referentiel/changerActif', { liste: 'medicaments', element, actif: false })
 *     store.dispatch('referentiel/supprimer', { liste: 'formes', element })
 *
 *     store.state.referentiel.fournisseurs   -> la liste chargée
 *
 * « enregistrer » fait une CRÉATION si l'élément n'a pas d'id, sinon une MODIFICATION.
 * =============================================================================
 */
import api from '@/services/api'

/** Adresse de l'API pour chaque liste. */
const ADRESSES = {
  fournisseurs: '/fournisseurs',
  formes: '/formes',
  familles: '/familles',
  unitesVente: '/unites-vente',
  fonctions: '/fonctions',
  medicaments: '/produits',
  utilisateurs: '/utilisateurs',
}

export default {
  namespaced: true,

  state: () => ({
    fournisseurs: [],
    formes: [],
    familles: [],
    unitesVente: [],
    fonctions: [],
    medicaments: [],
    utilisateurs: [],
  }),

  mutations: {
    DEFINIR_LISTE(state, { liste, elements }) {
      state[liste] = elements
    },
  },

  actions: {
    async charger({ commit }, { liste, filtres = {} }) {
      const { data } = await api.get(ADRESSES[liste], { params: filtres })
      commit('DEFINIR_LISTE', { liste, elements: data })
      return data
    },

    async enregistrer(_contexte, { liste, element }) {
      const { id, ...donnees } = nettoyer(element, !!element.id)
      const { data } = id
        ? await api.patch(`${ADRESSES[liste]}/${id}`, donnees)
        : await api.post(ADRESSES[liste], donnees)
      return data
    },

    async changerActif(_contexte, { liste, element, actif }) {
      const { data } = await api.patch(`${ADRESSES[liste]}/${element.id}`, { actif })
      return data
    },

    async supprimer(_contexte, { liste, element }) {
      await api.delete(`${ADRESSES[liste]}/${element.id}`)
    },
  },
}

/**
 * Prépare les données avant envoi :
 *   - retire les champs calculés renvoyés par l'API ;
 *   - retire les objets liés (forme, famille…) mais garde leur LIBELLÉ texte
 *     envoyé par l'import Excel (ex. forme: 'COMPRIMÉ', ajoutée à la liste si nouvelle) ;
 *   - champs vides : non envoyés en création, envoyés à null en modification (pour effacer).
 */
const RELATIONS = ['forme', 'famille', 'uniteVente', 'fonction']

function nettoyer(element, modeModification) {
  const champsAIgnorer = [
    '_count',
    'stockDisponible',
    'etatStock',
    'consoJournaliere',
    'prixAchatPlaque',
    'lots',
    'createdAt',
    'updatedAt',
    'derniereConnexion',
  ]
  const resultat = {}
  for (const [cle, valeur] of Object.entries(element)) {
    if (champsAIgnorer.includes(cle)) continue
    // Objet lié renvoyé par l'API (ex. forme: { id, libelle }) : on n'envoie que son identifiant (formeId)
    if (RELATIONS.includes(cle) && typeof valeur !== 'string') continue
    const estVide = valeur === '' || valeur === null || valeur === undefined
    if (estVide) {
      if (modeModification) resultat[cle] = null
      continue
    }
    resultat[cle] = valeur
  }
  return resultat
}
