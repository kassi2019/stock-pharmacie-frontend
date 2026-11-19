import api from '../../services/api'
import { moduleParRoute } from '../../utils/modules'

const ROLES_MODIF_PAR_DEFAUT = ['ADMIN', 'RESPONSABLE']

const lire = () => {
  try {
    return JSON.parse(localStorage.getItem('utilisateur'))
  } catch {
    return null
  }
}

export default {
  namespaced: true,
  state: () => ({
    jeton: localStorage.getItem('jeton'),
    utilisateur: lire(),
  }),
  getters: {
    estConnecte: (s) => !!s.jeton,
    role: (s) => s.utilisateur?.role,
    /** true si l'utilisateur a l'un des rôles donnés (ou si aucun rôle n'est exigé). */
    peut: (s) => (roles) => !roles?.length || roles.includes(s.utilisateur?.role),
    /** Droit MODIFIER sur un module (v-si-modif). */
    peutModifier: (s) => (code) => {
      const roles = moduleParRoute(code)?.rolesModif ?? ROLES_MODIF_PAR_DEFAUT
      return roles.includes(s.utilisateur?.role)
    },
    /** Droit IMPRIMER sur un module (v-si-imprimer) : tous ceux qui le voient. */
    peutImprimer: (s) => (code) => {
      const roles = moduleParRoute(code)?.roles ?? []
      return !roles.length || roles.includes(s.utilisateur?.role)
    },
  },
  mutations: {
    session(s, { jeton, utilisateur }) {
      s.jeton = jeton
      s.utilisateur = utilisateur
      if (jeton) {
        localStorage.setItem('jeton', jeton)
        localStorage.setItem('utilisateur', JSON.stringify(utilisateur))
      } else {
        localStorage.removeItem('jeton')
        localStorage.removeItem('utilisateur')
      }
    },
  },
  actions: {
    async connexion({ commit }, { matricule, motDePasse }) {
      const { data } = await api.post('/auth/connexion', { matricule, motDePasse })
      commit('session', { jeton: data.jeton, utilisateur: data.utilisateur })
    },
    deconnexion({ commit }) {
      commit('session', { jeton: null, utilisateur: null })
    },
  },
}
