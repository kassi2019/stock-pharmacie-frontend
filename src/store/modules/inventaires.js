/**
 * Store « inventaires » (lot 3, § 12) : liste, inventaire en cours de comptage,
 * ouverture, comptage, lots trouvés, validation et annulation.
 */
import api from '@/services/api'

const parametres = (filtres) =>
  Object.fromEntries(Object.entries(filtres ?? {}).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export default {
  namespaced: true,

  state: () => ({
    liste: [],
    /** Inventaire affiché dans la fiche */
    courant: null,
    /** Inventaire au fil de l'eau : médicaments et leurs lots */
    stock: [],
  }),

  mutations: {
    liste(state, valeur) {
      state.liste = valeur
    },
    courant(state, valeur) {
      state.courant = valeur
    },
    stock(state, valeur) {
      state.stock = valeur
    },
  },

  actions: {
    // ---------- Inventaire par lot au fil de l'eau (présentation du district) ----------
    async chargerStock({ commit }) {
      commit('stock', (await api.get('/inventaire/stock')).data)
    },
    async validerComptage({ dispatch }, lignes) {
      const { data } = await api.post('/inventaire/comptage', { lignes })
      await dispatch('chargerStock')
      return data
    },
    async ajouterLotStock({ dispatch }, lot) {
      const { data } = await api.post('/inventaire/lots', lot)
      await dispatch('chargerStock')
      return data
    },
    async fiche(_c, { du, au }) {
      return (await api.get('/inventaire/fiche', { params: { du, au } })).data
    },

    // ---------- Documents d'inventaire ----------
    async charger({ commit }, filtres) {
      commit('liste', (await api.get('/inventaires', { params: parametres(filtres) })).data)
    },
    async ouvrir(_c, inventaire) {
      return (await api.post('/inventaires', inventaire)).data
    },
    async chargerCourant({ commit }, id) {
      commit('courant', (await api.get(`/inventaires/${id}`)).data)
    },
    async compter({ commit, state }, lignes) {
      commit('courant', (await api.patch(`/inventaires/${state.courant.id}/comptage`, { lignes })).data)
    },
    async ajouterLot({ commit, state }, lot) {
      commit('courant', (await api.post(`/inventaires/${state.courant.id}/lots`, lot)).data)
    },
    async supprimerLigne({ commit, state }, ligneId) {
      commit('courant', (await api.delete(`/inventaires/${state.courant.id}/lignes/${ligneId}`)).data)
    },
    async valider({ commit, state }) {
      commit('courant', (await api.post(`/inventaires/${state.courant.id}/valider`)).data)
    },
    async annuler({ commit, state }, motif) {
      commit('courant', (await api.post(`/inventaires/${state.courant.id}/annuler`, { motif })).data)
    },
  },
}
