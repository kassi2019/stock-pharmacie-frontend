import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'
import { MODULES, moduleParRoute } from '../utils/modules'

/*
 * meta.module : module de la page ; on ne l'ouvre qu'avec le droit VOIR du profil
 * (meta.droit pour exiger un autre droit, ex. MODIFIER pour une saisie).
 */

/** Pages des modules déjà développés. */
const pagesModules = [
  {
    path: 'parametres',
    name: 'parametres',
    component: () => import('../views/parametrage/ParametrageView.vue'),
    // Ouvert avec le droit VOIR du Paramétrage OU des Médicaments et prix ;
    // les onglets Médicaments / Prix utilisent les droits « produits »
    meta: { module: 'parametres', modulesAcces: ['parametres', 'produits'], modulesParOnglet: { medicaments: 'produits', prix: 'produits' } },
  },
  // Produits et médicaments : onglets « Médicaments » et « Prix » du Paramétrage
  { path: 'produits', name: 'produits', redirect: (to) => ({ name: 'parametres', query: { onglet: to.query.onglet === 'prix' ? 'prix' : 'medicaments', ...(to.query.medicament ? { medicament: to.query.medicament } : {}) } }) },
  {
    path: 'produits/:id',
    name: 'produit',
    component: () => import('../views/produits/ProduitFiche.vue'),
    props: true,
    meta: { module: 'produits', titre: 'Fiche produit' },
  },
  {
    path: 'fournisseurs/:id',
    name: 'fournisseur',
    component: () => import('../views/fournisseurs/FournisseurHistorique.vue'),
    props: true,
    meta: { module: 'parametres', titre: 'Historique fournisseur' },
  },
  { path: 'receptions', name: 'receptions', component: () => import('../views/receptions/Receptions.vue') },
  // Saisie et consultation dans la fenêtre de la liste (comme le district)
  { path: 'receptions/nouvelle', name: 'reception-nouvelle', redirect: { name: 'receptions', query: { nouvelle: 1 } } },
  { path: 'receptions/:id', name: 'reception', redirect: (to) => ({ name: 'receptions', query: { voir: to.params.id } }) },
  // ---------- Lot 2 : sorties de stock ----------
  { path: 'dispensation', name: 'dispensation', component: () => import('../views/dispensation/Dispensations.vue') },
  {
    path: 'dispensation/nouvelle',
    name: 'dispensation-nouvelle',
    component: () => import('../views/dispensation/DispensationNouvelle.vue'),
    meta: { module: 'dispensation', droit: 'MODIFIER', titre: 'Nouvelle dispensation' },
  },
  {
    path: 'dispensation/:id',
    name: 'dispensation-fiche',
    component: () => import('../views/dispensation/DispensationFiche.vue'),
    props: true,
    meta: { module: 'dispensation', titre: 'Fiche dispensation' },
  },
  // Lots, péremptions et retraits : un seul module à deux onglets
  { path: 'retraits', name: 'retraits', component: () => import('../views/retraits/LotsRetraits.vue') },
  { path: 'peremptions', name: 'peremptions', redirect: { name: 'retraits', query: { onglet: 'peremptions' } } },
  { path: 'mouvements', name: 'mouvements', redirect: { name: 'inventaires', query: { onglet: 'mouvements' } } },
  // ---------- Lot 5 : rapports et points financiers ----------
  { path: 'rapports', name: 'rapports', component: () => import('../views/rapports/Rapports.vue') },
  // ---------- Lot 4 : seuils et alertes ----------
  { path: 'alertes', name: 'alertes', redirect: (to) => ({ name: 'retraits', query: { onglet: to.query.onglet || 'stock-bas' } }) },
  // ---------- Lot 3 : inventaires ----------
  // ---------- Utilisateurs (personnel, comptes, profils) et gestion de la paie ----------
  { path: 'utilisateurs', name: 'utilisateurs', component: () => import('../views/utilisateurs/UtilisateursView.vue') },
  { path: 'paie', name: 'paie', component: () => import('../views/paie/PaieView.vue') },
  // Inventaires et mouvements : un seul module à deux onglets
  { path: 'inventaires', name: 'inventaires', component: () => import('../views/inventaires/InventairesMouvements.vue') },
  {
    path: 'inventaires/:id',
    name: 'inventaire',
    component: () => import('../views/inventaires/InventaireFiche.vue'),
    props: true,
    meta: { module: 'inventaires', titre: 'Fiche inventaire' },
  },
]
// Page principale de chaque module
for (const p of pagesModules) {
  if (!p.meta && moduleParRoute(p.name)) p.meta = { module: p.name }
}

/** Modules prévus dans un lot ultérieur : page « en préparation ». */
const pagesAVenir = MODULES.filter((m) => !m.disponible).map((m) => ({
  path: m.route,
  name: m.route,
  component: () => import('../views/ModuleAVenir.vue'),
  meta: { module: m.route },
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

/** Droits relus au serveur une fois par ouverture de l'application. */
let droitsRelus = false

router.beforeEach(async (to) => {
  const connecte = store.getters['auth/estConnecte']
  if (!to.meta.public && !connecte) return { name: 'connexion' }
  if (to.name === 'connexion' && connecte) return { name: 'accueil' }
  if (connecte && !droitsRelus) {
    droitsRelus = true
    try {
      await store.dispatch('auth/rafraichir')
    } catch {
      // Session expirée : l'intercepteur de services/api.js a fermé la session
      if (!store.getters['auth/estConnecte']) return { name: 'connexion' }
    }
  }
  const module = to.matched.map((r) => r.meta.module).filter(Boolean).pop()
  const modules = to.meta.modulesAcces ?? (module ? [module] : [])
  if (modules.length && !modules.some((m) => store.getters['auth/aDroit'](m, to.meta.droit ?? 'VOIR'))) return { name: 'accueil' }
})

export default router
