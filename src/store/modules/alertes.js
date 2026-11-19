/**
 * Store « alertes » (lot 4, § 13) :
 *  - enTete : compteurs des alertes permanentes affichées en haut de chaque écran
 *    (stock bas, péremption ≤ N jours) et fréquence d'actualisation des écrans ;
 *  - detail : page « Seuils et alertes » (produits avec SD, Qs, couverture, état ; lots à péremption).
 */
import api from '@/services/api'

export default {
  namespaced: true,

  state: () => ({
    enTete: { delai: 30, stockBas: 0, peremption: 0, perimes: 0, actualisationSecondes: 30 },
    detail: { regles: null, produits: [], lots: [] },
  }),

  getters: {
    /** Fréquence d'actualisation des écrans, en millisecondes (§ 13.2). */
    actualisationMs: (state) => Math.max(5, Number(state.enTete.actualisationSecondes) || 30) * 1000,
  },

  mutations: {
    enTete(state, valeur) {
      state.enTete = valeur
    },
    detail(state, valeur) {
      state.detail = valeur
    },
  },

  actions: {
    async chargerEnTete({ commit }) {
      commit('enTete', (await api.get('/alertes/en-tete')).data)
    },
    async chargerDetail({ commit }) {
      commit('detail', (await api.get('/alertes')).data)
    },
    async recalculer({ dispatch }) {
      await api.post('/alertes/recalculer')
      await Promise.all([dispatch('chargerDetail'), dispatch('chargerEnTete')])
    },
  },
}
