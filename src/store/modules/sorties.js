/**
 * Store « sorties » (lot 2) : dispensations, retraits, péremptions et mouvements.
 * Les pages lisent les listes ici et appellent les actions ; tous les appels API
 * du lot 2 passent par ce module.
 */
import api from '@/services/api'

/** Paramètres de requête sans les valeurs vides. */
const parametres = (filtres) =>
  Object.fromEntries(Object.entries(filtres ?? {}).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export default {
  namespaced: true,

  state: () => ({
    dispensations: [],
    retraits: [],
    motifs: [],
    lotsRetrait: [],
    peremptions: { delai: 30, lots: [] },
    mouvements: [],
  }),

  mutations: {
    remplir(state, { liste, valeur }) {
      state[liste] = valeur
    },
  },

  actions: {
    // ---------- Dispensation (§ 10.1) ----------
    async chargerDispensations({ commit }, filtres) {
      const { data } = await api.get('/dispensations', { params: parametres(filtres) })
      commit('remplir', { liste: 'dispensations', valeur: data })
    },
    async dispensation(_c, id) {
      return (await api.get(`/dispensations/${id}`)).data
    },
    async creerDispensation(_c, dispensation) {
      return (await api.post('/dispensations', dispensation)).data
    },
    async annulerDispensation(_c, { id, motif }) {
      return (await api.post(`/dispensations/${id}/annuler`, { motif })).data
    },

    // ---------- Retraits (§ 10.2) et périmés (§ 11) ----------
    async chargerRetraits({ commit }, filtres) {
      const { data } = await api.get('/retraits', { params: parametres(filtres) })
      commit('remplir', { liste: 'retraits', valeur: data })
    },
    async chargerMotifs({ commit }) {
      const { data } = await api.get('/retraits/motifs')
      commit('remplir', { liste: 'motifs', valeur: data })
    },
    async chargerLotsRetrait({ commit }, produitId) {
      const { data } = await api.get('/retraits/lots', { params: parametres({ produitId }) })
      commit('remplir', { liste: 'lotsRetrait', valeur: data })
    },
    async creerRetrait(_c, retrait) {
      return (await api.post('/retraits', retrait)).data
    },
    async retirerPerimes() {
      return (await api.post('/retraits/perimes')).data
    },
    async chargerPeremptions({ commit }, jours) {
      const { data } = await api.get('/peremptions', { params: parametres({ jours }) })
      commit('remplir', { liste: 'peremptions', valeur: data })
    },

    // ---------- Mouvements (§ 14) ----------
    async chargerMouvements({ commit }, filtres) {
      const { data } = await api.get('/mouvements', { params: parametres(filtres) })
      commit('remplir', { liste: 'mouvements', valeur: data })
    },
  },
}
