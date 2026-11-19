import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'
import { MODULES, moduleParRoute } from '../utils/modules'

/** Rôles d'un module (définis une seule fois dans utils/modules.js). */
const roles = (nom) => moduleParRoute(nom)?.roles ?? []
const GESTION = ['ADMIN', 'RESPONSABLE']

/** Pages des modules déjà développés. */
const pagesModules = [
  {
    path: 'parametres',
    name: 'parametres',
    component: () => import('../views/parametrage/ParametrageView.vue'),
  },
  { path: 'produits', name: 'produits', component: () => import('../views/produits/Produits.vue') },
  {
    path: 'produits/:id',
    name: 'produit',
    component: () => import('../views/produits/ProduitFiche.vue'),
    props: true,
    meta: { roles: roles('produits'), module: 'produits', titre: 'Fiche produit' },
  },
  {
    path: 'fournisseurs/:id',
    name: 'fournisseur',
    component: () => import('../views/fournisseurs/FournisseurHistorique.vue'),
    props: true,
    meta: { roles: roles('parametres'), module: 'parametres', titre: 'Historique fournisseur' },
  },
  { path: 'receptions', name: 'receptions', component: () => import('../views/receptions/Receptions.vue') },
  {
    path: 'receptions/nouvelle',
    name: 'reception-nouvelle',
    component: () => import('../views/receptions/ReceptionNouvelle.vue'),
    meta: { roles: GESTION, module: 'receptions', titre: 'Nouvelle réception' },
  },
  {
    path: 'receptions/:id',
    name: 'reception',
    component: () => import('../views/receptions/ReceptionFiche.vue'),
    props: true,
    meta: { roles: roles('receptions'), module: 'receptions', titre: 'Fiche réception' },
  },
  // ---------- Lot 2 : sorties de stock ----------
  { path: 'dispensation', name: 'dispensation', component: () => import('../views/dispensation/Dispensations.vue') },
  {
    path: 'dispensation/nouvelle',
    name: 'dispensation-nouvelle',
    component: () => import('../views/dispensation/DispensationNouvelle.vue'),
    meta: { roles: moduleParRoute('dispensation').rolesModif, module: 'dispensation', titre: 'Nouvelle dispensation' },
  },
  {
    path: 'dispensation/:id',
    name: 'dispensation-fiche',
    component: () => import('../views/dispensation/DispensationFiche.vue'),
    props: true,
    meta: { roles: roles('dispensation'), module: 'dispensation', titre: 'Fiche dispensation' },
  },
  { path: 'retraits', name: 'retraits', component: () => import('../views/retraits/Retraits.vue') },
  { path: 'peremptions', name: 'peremptions', component: () => import('../views/peremptions/Peremptions.vue') },
  { path: 'mouvements', name: 'mouvements', component: () => import('../views/mouvements/Mouvements.vue') },
  // ---------- Lot 5 : rapports et points financiers ----------
  { path: 'rapports', name: 'rapports', component: () => import('../views/rapports/Rapports.vue') },
  // ---------- Lot 4 : seuils et alertes ----------
  { path: 'alertes', name: 'alertes', component: () => import('../views/alertes/Alertes.vue') },
  // ---------- Lot 3 : inventaires ----------
  { path: 'inventaires', name: 'inventaires', component: () => import('../views/inventaires/Inventaires.vue') },
  {
    path: 'inventaires/:id',
    name: 'inventaire',
    component: () => import('../views/inventaires/InventaireFiche.vue'),
    props: true,
    meta: { roles: roles('inventaires'), module: 'inventaires', titre: 'Fiche inventaire' },
  },
]
// Rôles de la page principale de chaque module
for (const p of pagesModules) {
  if (!p.meta && moduleParRoute(p.name)) p.meta = { roles: roles(p.name) }
}

/** Modules prévus dans un lot ultérieur : page « en préparation ». */
const pagesAVenir = MODULES.filter((m) => !m.disponible).map((m) => ({
  path: m.route,
  name: m.route,
  component: () => import('../views/ModuleAVenir.vue'),
  meta: { roles: m.roles },
}))

const routes = [
  {
    path: '/connexion',
    name: 'connexion',
    component: () => import('../views/Connexion.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../components/MiseEnPage.vue'),
    children: [
      { path: '', name: 'accueil', component: () => import('../views/Accueil.vue') },
      ...pagesModules,
      ...pagesAVenir,
    ],
  },
  { path: '/:chemin(.*)*', redirect: '/' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const connecte = store.getters['auth/estConnecte']
  if (!to.meta.public && !connecte) return { name: 'connexion' }
  if (to.name === 'connexion' && connecte) return { name: 'accueil' }
  const requis = to.matched.flatMap((r) => r.meta.roles ?? [])
  if (requis.length && !store.getters['auth/peut'](requis)) return { name: 'accueil' }
})

export default router
