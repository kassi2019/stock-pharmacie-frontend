/**
 * =============================================================================
 * DROITS PAR MODULE (côté écran) — même principe que l'application de district
 * =============================================================================
 * Les droits viennent du PROFIL de l'utilisateur (Paramétrage > Profils & droits) :
 * pour chaque module, VOIR / IMPRIMER / MODIFIER (et VALIDER pour certains).
 *
 * Sur un bouton qui MODIFIE des données (Nouveau, Modifier, Importer…) :
 *     <button v-si-modif @click="...">+ Nouveau</button>
 * Sur un bouton d'IMPRESSION (PDF) :
 *     <button v-si-imprimer @click="...">PDF</button>
 * Variante pour un autre module : v-si-modif="'produits'"
 * (Le serveur refuse de toute façon une modification non autorisée.)
 * =============================================================================
 */
import store from '@/store'
import router from '@/router'

/** Module de la page affichée (ex. 'parametres'), ou null sur l'accueil. */
function moduleCourant() {
  const route = router.currentRoute.value
  // Page à onglets dont certains onglets ont leurs propres droits (ex. Paramétrage > Médicaments)
  const parOnglet = route.meta?.modulesParOnglet?.[route.query?.onglet]
  return parOnglet || route.meta?.module || route.name || null
}

function directiveDeDroit(getter) {
  const appliquer = (el, binding) => {
    const module = binding.value || moduleCourant()
    const autorise = !module || store.getters[getter](module)
    el.style.display = autorise ? '' : 'none'
  }
  return { mounted: appliquer, updated: appliquer }
}

/** v-si-modif : bouton visible seulement avec le droit MODIFIER. */
export const siModif = directiveDeDroit('auth/peutModifier')

/** v-si-imprimer : bouton visible seulement avec le droit IMPRIMER. */
export const siImprimer = directiveDeDroit('auth/peutImprimer')
