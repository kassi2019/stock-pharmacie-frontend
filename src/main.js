import { createApp } from 'vue'
import { enregistrerServiceWorker } from './utils/mobile'
// Police Inter, installée dans le projet (fonctionne sans Internet, en intranet)
import '@fontsource-variable/inter'
import 'sweetalert2/dist/sweetalert2.min.css'
import './style.css'
import App from './App.vue'
import ChampDate from './components/ChampDate.vue'
import router from './router'
import store from './store'
import { definirDeconnexion } from './services/api'
import { siImprimer, siModif } from './utils/droits'

// Session expirée : retour à l'écran de connexion
definirDeconnexion(() => {
  store.dispatch('auth/deconnexion')
  router.push({ name: 'connexion' })
})

createApp(App)
  // Champ date JJ/MM/AAAA avec calendrier, utilisé partout à la place de <input type="date">
  .component('ChampDate', ChampDate)
  .use(store)
  .use(router)
  // v-si-modif / v-si-imprimer : cachent un bouton selon les droits (voir utils/droits.js)
  .directive('si-modif', siModif)
  .directive('si-imprimer', siImprimer)
  .mount('#app')

// Application installable sur téléphone et ordinateur (§ 17)
enregistrerServiceWorker()
