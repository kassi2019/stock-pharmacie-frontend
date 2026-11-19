import api from '../../services/api'
import { aujourdhui } from '../../utils/format'

const debutMois = () => aujourdhui().slice(0, 8) + '01'

export default {
  namespaced: true,
  state: () => ({
    liste: [],
    filtres: { du: debutMois(), au: aujourdhui(), fournisseurId: '' },
    chargement: false,
  }),
  mutations: {
    liste: (s, v) => (s.liste = v),
    filtres: (s, v) => (s.filtres = { ...s.filtres, ...v }),
    chargement: (s, v) => (s.chargement = v),
  },
  actions: {
    async charger({ commit, state }) {
      commit('chargement', true)
      try {
        const { data } = await api.get('/receptions', { params: state.filtres })
        commit('liste', data)
      } finally {
        commit('chargement', false)
      }
    },
    async trouver(_, id) {
      const { data } = await api.get(`/receptions/${id}`)
      return data
    },
    async verifier(_, reception) {
      const { data } = await api.post('/receptions/verifier', reception)
      return data
    },
    async creer(_, reception) {
      const { data } = await api.post('/receptions', reception)
      return data
    },
  },
}
