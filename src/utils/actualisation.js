/**
 * Actualisation automatique des écrans (§ 13.2 et § 18) : la fonction donnée est
 * rappelée à intervalle régulier (paramètre « ACTUALISATION_ECRANS_SECONDES »,
 * 30 s par défaut), seulement quand l'onglet du navigateur est visible.
 * L'intervalle suit le paramètre s'il est modifié.
 *
 * Utilisation dans une page :
 *     utiliserActualisation(charger)
 */
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'

export function utiliserActualisation(fonction) {
  const store = useStore()
  const intervalle = computed(() => store.getters['alertes/actualisationMs'])
  let minuterie = null

  const relancer = () => {
    clearInterval(minuterie)
    minuterie = setInterval(() => {
      if (document.visibilityState === 'visible') fonction()
    }, intervalle.value)
  }
  // Retour sur l'onglet : actualisation immédiate
  const auRetour = () => {
    if (document.visibilityState === 'visible') fonction()
  }

  onMounted(() => {
    relancer()
    document.addEventListener('visibilitychange', auRetour)
  })
  onUnmounted(() => {
    clearInterval(minuterie)
    document.removeEventListener('visibilitychange', auRetour)
  })
  watch(intervalle, relancer)
}
