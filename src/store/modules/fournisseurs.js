import api from '../../services/api'

export default {
  namespaced: true,
  state: () => ({ liste: [], chargement: false }),
  getters: {
    actifs: (s) => s.liste.filter((f) => f.actif),
  },
  mutations: {
    liste: (s, v) => (s.liste = v),
    chargement: (s, v) => (s.chargement = v),
  },
  actions: {
    async charger({ commit }) {
      commit('chargement', true)
      try {
        const { data } = await api.get('/fournisseurs')
        commit('liste', data)
      } finally {
        commit('chargement', false)
      }
    },
    async historique(_, { id, du, au }) {
      const { data } = await api.get(`/fournisseurs/${id}/historique`, { params: { du, au } })
      return data
    },
  },
}
