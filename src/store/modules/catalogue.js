import api from '../../services/api'

export default {
  namespaced: true,
  state: () => ({
    produits: [],
    formes: [],
    filtres: { recherche: '', etat: '', actif: 'true', formeId: '' },
    chargement: false,
  }),
  mutations: {
    produits: (s, v) => (s.produits = v),
    formes: (s, v) => (s.formes = v),
    filtres: (s, v) => (s.filtres = { ...s.filtres, ...v }),
    chargement: (s, v) => (s.chargement = v),
  },
  actions: {
    async chargerProduits({ commit, state }) {
      commit('chargement', true)
      try {
        const { data } = await api.get('/produits', { params: state.filtres })
        commit('produits', data)
      } finally {
        commit('chargement', false)
      }
    },
    async chargerFormes({ commit }) {
      const { data } = await api.get('/formes')
      commit('formes', data)
    },
    /** Liste des produits actifs pour les écrans de saisie (sans modifier les filtres de la liste). */
    async rechercherProduits(_, recherche) {
      const { data } = await api.get('/produits', { params: { recherche, actif: true } })
      return data
    },
  },
}
