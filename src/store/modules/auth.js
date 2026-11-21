/**
 * =============================================================================
 * MODULE VUEX « auth » : session et DROITS DU PROFIL
 * =============================================================================
 * Les droits viennent du PROFIL de l'utilisateur (Paramétrage > Profils & droits) :
 *     utilisateur.permissions = { produits: ['VOIR', 'IMPRIMER', 'MODIFIER'], prixVente: ['VOIR'] }
 * L'administrateur a tous les droits.
 *
 *     store.getters['auth/peutVoir']('produits')
 *     store.getters['auth/peutModifier']('produits')     (v-si-modif)
 *     store.getters['auth/peutImprimer']('produits')     (v-si-imprimer)
 *     store.getters['auth/peutValider']('inventaires')
 *     store.getters['auth/voitPrixVente'] / ['auth/voitPrixAchat']
 *
 * Les droits sont relus au serveur à l'ouverture de l'application et à chaque
 * actualisation des alertes : un changement fait par l'administrateur
 * s'applique sans reconnexion (le serveur, lui, les vérifie à chaque requête).
 * =============================================================================
 */
import api from '../../services/api'

const lire = () => {
  try {
    return JSON.parse(localStorage.getItem('utilisateur'))
  } catch {
    return null
  }
}

/** Le profil a-t-il ce droit sur ce module ? */
const aDroit = (s, module, droit) =>
  s.utilisateur?.role === 'ADMIN' || !!s.utilisateur?.permissions?.[module]?.includes(droit)

export default {
  namespaced: true,
  state: () => ({
    jeton: localStorage.getItem('jeton'),
    utilisateur: lire(),
  }),
  getters: {
    estConnecte: (s) => !!s.jeton,
    role: (s) => s.utilisateur?.role,
    estAdmin: (s) => s.utilisateur?.role === 'ADMIN',
    /** Droit quelconque : aDroit('inventaires', 'VALIDER'). */
    aDroit: (s) => (module, droit = 'VOIR') => aDroit(s, module, droit),
    /** Droit VOIR sur un module (tuiles de l'accueil, pages). */
    peutVoir: (s) => (module) => !module || aDroit(s, module, 'VOIR'),
    /** Droit MODIFIER sur un module (v-si-modif). */
    peutModifier: (s) => (module) => aDroit(s, module, 'MODIFIER'),
    /** Droit IMPRIMER sur un module (v-si-imprimer). */
    peutImprimer: (s) => (module) => aDroit(s, module, 'IMPRIMER'),
    /** Droit VALIDER (valider un inventaire, annuler une dispensation). */
    peutValider: (s) => (module) => aDroit(s, module, 'VALIDER'),
    /** Prix de vente, quantités et états de stock. */
    voitPrixVente: (s) => aDroit(s, 'prixVente', 'VOIR'),
    /** Prix d'achat et valorisation du stock. */
    voitPrixAchat: (s) => aDroit(s, 'prixAchat', 'VOIR'),
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
    /** Relit le profil et les droits au serveur (sans reconnexion). */
    async rafraichir({ commit, state }) {
      if (!state.jeton) return
      const { data } = await api.get('/auth/moi')
      commit('session', { jeton: state.jeton, utilisateur: data })
    },
    deconnexion({ commit }) {
      commit('session', { jeton: null, utilisateur: null })
    },
  },
}
