/**
 * BOUTON « ← RETOUR » : revient à la page précédente de l'application.
 * S'il n'y en a pas (page ouverte directement, nouvel onglet, application
 * installée sur le téléphone), on remonte à la page du module, sinon à l'accueil.
 * Les changements d'onglet ne comptent pas (ils remplacent l'adresse) :
 * « Retour » ramène donc à la page d'avant, pas à l'onglet d'avant.
 */
import router from '@/router'
import { moduleParRoute } from '@/utils/modules'

export function retour() {
  // Vue Router garde l'adresse précédente dans l'historique du navigateur
  if (window.history.state?.back) {
    router.back()
    return
  }
  const route = router.currentRoute.value
  const module = route.meta?.module
  // Sous-page d'un module (fiche…) : page principale du module ; sinon accueil
  if (module && route.name !== module && moduleParRoute(module)?.tuile !== false) router.push({ name: module })
  else router.push({ name: 'accueil' })
}
