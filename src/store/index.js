import { createStore } from 'vuex'
import auth from './modules/auth'
import catalogue from './modules/catalogue'
import fournisseurs from './modules/fournisseurs'
import receptions from './modules/receptions'
import notifications from './modules/notifications'
import referentiel from './modules/referentiel'
import sorties from './modules/sorties'
import inventaires from './modules/inventaires'
import alertes from './modules/alertes'

export default createStore({
  strict: import.meta.env.DEV,
  modules: { auth, catalogue, fournisseurs, receptions, notifications, referentiel, sorties, inventaires, alertes },
})
