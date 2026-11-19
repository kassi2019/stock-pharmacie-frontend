/**
 * =============================================================================
 * MODULE VUEX "notifications" : messages en HAUT À DROITE de l'écran
 * =============================================================================
 * Utilisation depuis n'importe quel écran :
 *
 *     store.dispatch('notifications/succes', 'Centre enregistré.')
 *     store.dispatch('notifications/erreur', 'Impossible d\'enregistrer.')
 *
 *     // Pour une erreur venant de l'API, le message du backend est affiché :
 *     store.dispatch('notifications/erreurApi', erreur)
 *
 * L'affichage est fait par SweetAlert2 (voir src/utils/alertes.js) :
 * le message apparaît en haut à droite et disparaît tout seul.
 * =============================================================================
 */
import { notifier } from '@/utils/alertes'

export default {
  namespaced: true,

  actions: {
    /** Message de réussite (vert). */
    succes(_contexte, texte) {
      notifier('succes', texte)
    },

    /** Message d'erreur (rouge). */
    erreur(_contexte, texte) {
      notifier('erreur', texte)
    },

    /** Message d'information (bleu). */
    info(_contexte, texte) {
      notifier('info', texte)
    },

    /**
     * Affiche le message d'erreur renvoyé par le backend.
     * (Le backend peut renvoyer un texte, ou une liste de textes pour les
     *  erreurs de validation : on les réunit.)
     */
    erreurApi(_contexte, erreur) {
      const message = erreur?.response?.data?.message
      const texte = Array.isArray(message)
        ? message.join(' · ')
        : message || 'Une erreur est survenue. Vérifiez la connexion au serveur.'
      notifier('erreur', texte)
    },
  },
}
