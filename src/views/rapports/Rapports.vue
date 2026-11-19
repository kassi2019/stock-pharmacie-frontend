<!--
  =============================================================================
  MODULE — RAPPORTS ET POINTS FINANCIERS (§ 15)
  =============================================================================
  Onglets (adresse : /rapports?onglet=point | etat | autres) :
   - Point financier d'une période : stock initial, entrées, ventes (chiffre
     d'affaires, coût d'achat, marge), pertes, correctifs d'inventaire, stock
     final, avec contrôle de cohérence. CHAQUE MONTANT OUVRE LE DÉTAIL de ses
     lignes, exportable en Excel et en PDF avec l'en-tête de la pharmacie ;
   - État du stock à une date, par produit ou par lot, avec l'état de couleur
     (recalculé à cette date) et la valeur ;
   - Autres rapports : retraits, péremptions, stock bas, mouvements, inventaires.
  Montants au prix d'achat, sauf le chiffre d'affaires (prix de vente).
  =============================================================================
-->
<template>
  <div class="page">
    <EnteteModule icone="graphique" titre="Rapports et points financiers" description="Valorisation du stock et points financiers — exports Excel et PDF avec l'en-tête de la pharmacie." />

    <nav class="onglets">
      <button v-for="o in ONGLETS" :key="o.code" class="onglet" :class="{ actif: onglet === o.code }" @click="onglet = o.code">
        <Icone :nom="o.icone" :taille="18" /> {{ o.titre }}
      </button>
    </nav>

    <!-- ======================== POINT FINANCIER ======================== -->
    <template v-if="onglet === 'point'">
      <section class="bloc">
        <div class="barre-outils">
          <label class="champ-date">Du <ChampDate v-model="periode.du" /></label>
          <label class="champ-date">Au <ChampDate v-model="periode.au" /></label>
          <div class="raccourcis">
            <button v-for="r in RACCOURCIS" :key="r.code" type="button" class="bouton-secondaire petit" @click="choisirPeriode(r.code)">{{ r.libelle }}</button>
          </div>
          <span class="espace"></span>
          <button :disabled="chargement" @click="chargerPoint">{{ chargement ? 'Calcul…' : 'Afficher' }}</button>
        </div>

        <template v-if="point">
          <div class="cartes-financieres">
            <button class="carte-fin neutre" :class="{ choisie: detail === 'stock-initial' }" @click="ouvrirDetail('stock-initial')">
              <small>Stock initial au {{ date(point.du) }}</small>
              <strong>{{ montant(point.stockInitial) }}</strong>
            </button>
            <button class="carte-fin vert" :class="{ choisie: detail === 'entrees' }" @click="ouvrirDetail('entrees')">
              <small>+ Produits reçus</small>
              <strong>{{ montant(point.entrees.valeur) }}</strong>
              <span>{{ point.entrees.nombre }} entrée(s) de lot</span>
            </button>
            <button class="carte-fin bleu" :class="{ choisie: detail === 'ventes' }" @click="ouvrirDetail('ventes')">
              <small>− Produits vendus (coût d'achat)</small>
              <strong>{{ montant(point.ventes.coutAchat) }}</strong>
              <span>CA {{ montant(point.ventes.chiffreAffaires) }} · marge {{ montant(point.ventes.marge) }}</span>
            </button>
            <button class="carte-fin rouge" :class="{ choisie: detail === 'pertes' }" @click="ouvrirDetail('pertes')">
              <small>− Produits perdus (retraits)</small>
              <strong>{{ montant(point.pertes.valeur) }}</strong>
              <span>{{ point.pertes.nombre }} retrait(s)</span>
            </button>
            <button class="carte-fin orange" :class="{ choisie: detail === 'correctifs' }" @click="ouvrirDetail('correctifs')">
              <small>± Correctifs d'inventaire</small>
              <strong>{{ signe(point.correctifs.net) }}{{ montant(point.correctifs.net) }}</strong>
              <span>+{{ montant(point.correctifs.plus) }} / −{{ montant(point.correctifs.moins) }}</span>
            </button>
            <button class="carte-fin fonce" :class="{ choisie: detail === 'stock-final' }" @click="ouvrirDetail('stock-final')">
              <small>= Stock restant au {{ date(point.au) }}</small>
              <strong>{{ montant(point.stockFinal) }}</strong>
            </button>
          </div>

          <div class="controle" :class="{ ok: !point.controle.ecart }">
            <span>
              Contrôle : {{ montant(point.stockInitial) }} + {{ montant(point.entrees.valeur) }} − {{ montant(point.ventes.coutAchat) }}
              − {{ montant(point.pertes.valeur) }} {{ point.correctifs.net < 0 ? '−' : '+' }} {{ montant(Math.abs(point.correctifs.net)) }}
              = <strong>{{ montant(point.controle.calcule) }}</strong>
            </span>
            <span v-if="!point.controle.ecart">✔ identique au stock restant</span>
            <span v-else>écart {{ montant(point.controle.ecart) }} (variation du prix d'achat moyen des lots)</span>
            <span class="espace"></span>
            <ImportExportTableau
              titre="Point financier"
              :sous-titre="sousTitrePeriode"
              :nom-fichier="`point_financier_${point.du}_${point.au}`"
              :colonnes-pdf="COLONNES_SYNTHESE"
              :lignes="synthese"
            />
          </div>
        </template>
        <p v-else-if="!chargement" class="tableau-vide">Choisissez une période puis « Afficher ».</p>
      </section>

      <!-- Détail du montant choisi -->
      <section v-if="point && detail" class="bloc">
        <div class="barre-outils">
          <h3 class="titre-detail">{{ DETAILS[detail].titre }}</h3>
          <input v-model="rechercheDetail" class="recherche" type="search" placeholder="Rechercher…" />
          <span class="espace"></span>
          <ImportExportTableau
            :titre="DETAILS[detail].titre"
            :sous-titre="detail === 'stock-initial' || detail === 'stock-final' ? `Au ${date(detail === 'stock-initial' ? point.du : point.au)}` : sousTitrePeriode"
            :nom-fichier="`${detail}_${point.du}_${point.au}`"
            :colonnes-pdf="colonnesDetail"
            :lignes="lignesDetailTriees"
          />
        </div>
        <div class="tableau-conteneur">
          <table class="tableau">
            <thead>
              <tr>
                <ColonneTri v-for="(c, i) in colonnesDetail" :key="c.titre" v-model="triDetail" :cle="String(i)" :class="{ nombre: c.droite }">{{ c.titre }}</ColonneTri>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, n) in pageDetail" :key="n">
                <td v-for="c in colonnesDetail" :key="c.titre" :class="{ nombre: c.droite }">{{ c.valeur(l) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="lignesDetail.length && colonnesDetail.some((c) => c.somme)">
              <tr>
                <td v-for="(c, i) in colonnesDetail" :key="c.titre" :class="{ nombre: c.droite }">
                  <strong v-if="c.somme">{{ (c.formatTotal ?? nombre)(lignesDetail.reduce((s, l) => s + (Number(c.somme(l)) || 0), 0)) }}</strong>
                  <strong v-else-if="i === 0">Total</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          <Pagination v-model:page="pDetail" v-model:taille="tDetail" :total="lignesDetail.length" />
          <p v-if="!lignesDetail.length" class="tableau-vide">Aucune ligne.</p>
        </div>
      </section>
    </template>

    <!-- ======================== ÉTAT DU STOCK À DATE ======================== -->
    <section v-else-if="onglet === 'etat'" class="bloc">
      <div class="barre-outils">
        <label class="champ-date">Au <ChampDate v-model="dateEtat" :max="aujourdhui()" @change="chargerEtat" /></label>
        <div class="filtre">
          <ListeDeroulante v-model="vueEtat" :options="VUES_ETAT" :effacable="false" />
        </div>
        <input v-model="rechercheEtat" class="recherche" type="search" placeholder="Médicament ou n° de lot…" />
        <label class="case-a-cocher"><input v-model="avecStockSeul" type="checkbox" /> Produits en stock seulement</label>
        <span class="espace"></span>
        <ImportExportTableau
          :titre="vueEtat === 'LOT' ? 'État du stock par lot' : 'État du stock par produit'"
          :sous-titre="`Au ${date(dateEtat)}${etatFiltre ? ' — ' + ETATS[etatFiltre].libelle : ''}`"
          :nom-fichier="`etat_stock_${vueEtat === 'LOT' ? 'lots' : 'produits'}_${dateEtat}`"
          :colonnes-pdf="vueEtat === 'LOT' ? COLONNES_LOTS : COLONNES_PRODUITS"
          :lignes="lignesEtatTriees"
        />
      </div>

      <div class="totaux-etat">
        <button
          v-for="(e, cle) in ETATS"
          :key="cle"
          type="button"
          class="compteur"
          :class="{ choisi: etatFiltre === cle }"
          @click="etatFiltre = etatFiltre === cle ? null : cle"
        >
          <EtatBadge :etat="cle" /> <strong>{{ parEtat[cle] ?? 0 }}</strong>
        </button>
        <span class="espace"></span>
        <span class="valeur-totale">Valeur du stock : <strong>{{ montant(valeurEtat) }}</strong></span>
      </div>

      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-for="(c, i) in colonnesEtat" :key="c.titre" v-model="triEtat" :cle="String(i)" :class="{ nombre: c.droite }">{{ c.titre }}</ColonneTri>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, n) in pageEtat" :key="n" :class="{ 'ligne-inactive': l.perime }">
              <td v-for="c in colonnesEtat" :key="c.titre" :class="{ nombre: c.droite }">
                <EtatBadge v-if="c.titre === 'État'" :etat="l.etat" />
                <template v-else>{{ c.valeur(l) }}</template>
              </td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model:page="pEtat" v-model:taille="tEtat" :total="lignesEtat.length" />
        <p v-if="!chargement && !lignesEtat.length" class="tableau-vide">Aucun produit pour ces critères.</p>
        <p v-if="chargement" class="tableau-vide">Calcul…</p>
      </div>
      <p class="note">
        Stock reconstitué à la fin de la journée choisie à partir des mouvements. État recalculé à cette date
        (consommation des {{ etat?.regles.periodeConsoJours }} jours précédents) ; les lots déjà périmés à cette date sont grisés et ne
        comptent pas dans le stock disponible.
      </p>
    </section>

    <!-- ======================== AUTRES RAPPORTS ======================== -->
    <section v-else class="autres">
      <router-link v-for="r in AUTRES" :key="r.titre" :to="r.lien" class="carte-rapport">
        <span class="icone-rapport"><Icone :nom="r.icone" :taille="24" /></span>
        <span>
          <strong>{{ r.titre }}</strong>
          <small>{{ r.texte }}</small>
        </span>
      </router-link>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import EnteteModule from '@/components/EnteteModule.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import EtatBadge from '@/components/EtatBadge.vue'
import Icone from '@/components/Icone.vue'
import { utiliserTableau } from '@/utils/pagination'
import { ETATS } from '@/utils/etats'
import { aujourdhui, date, dateHeure, montant, nombre, quantite } from '@/utils/format'

const store = useStore()
const route = useRoute()
const router = useRouter()

const ONGLETS = [
  { code: 'point', titre: 'Point financier', icone: 'portefeuille' },
  { code: 'etat', titre: 'État du stock à date', icone: 'carton' },
  { code: 'autres', titre: 'Autres rapports', icone: 'liste' },
]
const onglet = ref(ONGLETS.some((o) => o.code === route.query.onglet) ? route.query.onglet : 'point')
watch(onglet, (code) => {
  router.replace({ query: { onglet: code } })
  if (code === 'etat' && !etat.value) chargerEtat()
})

const chargement = ref(false)
const signe = (n) => (n > 0 ? '+' : '')

// =============================================================================
// POINT FINANCIER
// =============================================================================
const RACCOURCIS = [
  { code: 'mois', libelle: 'Ce mois' },
  { code: 'mois-precedent', libelle: 'Mois précédent' },
  { code: 'annee', libelle: 'Cette année' },
]
const iso = (d) => d.toLocaleDateString('fr-CA')
function choisirPeriode(code) {
  const j = new Date()
  if (code === 'mois') periode.value = { du: iso(new Date(j.getFullYear(), j.getMonth(), 1)), au: iso(j) }
  if (code === 'mois-precedent') {
    periode.value = { du: iso(new Date(j.getFullYear(), j.getMonth() - 1, 1)), au: iso(new Date(j.getFullYear(), j.getMonth(), 0)) }
  }
  if (code === 'annee') periode.value = { du: iso(new Date(j.getFullYear(), 0, 1)), au: iso(j) }
  chargerPoint()
}
const periode = ref({ du: aujourdhui().slice(0, 8) + '01', au: aujourdhui() })
const point = ref(null)
const detail = ref(null)
const rechercheDetail = ref('')
const sousTitrePeriode = computed(() => (point.value ? `Du ${date(point.value.du)} au ${date(point.value.au)}` : ''))

async function chargerPoint() {
  chargement.value = true
  try {
    point.value = (await api.get('/rapports/point-financier', { params: periode.value })).data
    if (detail.value?.startsWith('stock')) await chargerStocksPoint()
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}

/** Détail du stock initial / final : état du stock à la veille du début / à la fin. */
const stocksPoint = ref({ initial: [], final: [] })
async function chargerStocksPoint() {
  const veille = iso(new Date(new Date(point.value.du).getTime() - 86_400_000))
  const [initial, final] = await Promise.all([
    api.get('/rapports/etat-stock', { params: { date: veille } }),
    api.get('/rapports/etat-stock', { params: { date: point.value.au } }),
  ])
  const enLots = (r) => r.data.produits.flatMap((p) => p.lots.map((l) => ({ ...l, produit: p })))
  stocksPoint.value = { initial: enLots(initial), final: enLots(final) }
}
async function ouvrirDetail(code) {
  detail.value = detail.value === code ? null : code
  rechercheDetail.value = ''
  if (detail.value?.startsWith('stock')) {
    try {
      await chargerStocksPoint()
    } catch (e) {
      store.dispatch('notifications/erreurApi', e)
    }
  }
}

const COL_MOUVEMENT = [
  { titre: 'Date', valeur: (m) => dateHeure(m.date) },
  { titre: 'Document', valeur: (m) => m.documentNumero ?? '' },
  { titre: 'Médicament', valeur: (m) => m.produit.designation },
  { titre: 'Lot', valeur: (m) => m.lot.numeroLot },
  { titre: 'Quantité', valeur: (m) => (m.quantite > 0 ? `+${m.quantite}` : m.quantite), droite: true },
  { titre: 'Prix unitaire', valeur: (m) => montant(m.prixUnitaire), droite: true },
]
const COL_LOTS_STOCK = [
  { titre: 'Médicament', valeur: (l) => l.produit.designation },
  { titre: 'Lot', valeur: (l) => l.numeroLot },
  { titre: 'Péremption', valeur: (l) => date(l.datePeremption) },
  { titre: 'Quantité', valeur: (l) => quantite(l.quantite, l.produit.plaquesParBoite), droite: true },
  { titre: 'Prix unitaire', valeur: (l) => montant(l.prixAchatPlaque), droite: true },
  { titre: 'Valeur', valeur: (l) => montant(l.valeur), droite: true, somme: (l) => l.valeur, formatTotal: montant },
]
const DETAILS = {
  'stock-initial': {
    titre: 'Stock initial (par lot)',
    lignes: () => stocksPoint.value.initial,
    colonnes: COL_LOTS_STOCK,
  },
  entrees: {
    titre: 'Produits reçus',
    lignes: () => point.value.entrees.lignes,
    colonnes: [...COL_MOUVEMENT, { titre: 'Valeur', valeur: (m) => montant(m.valeur), droite: true, somme: (m) => m.valeur, formatTotal: montant }],
  },
  ventes: {
    titre: 'Produits vendus (dispensations)',
    lignes: () => point.value.ventes.lignes,
    colonnes: [
      { titre: 'Date', valeur: (d) => dateHeure(d.date) },
      { titre: 'N°', valeur: (d) => d.numero },
      { titre: 'Patient', valeur: (d) => d.patient },
      { titre: 'Statut', valeur: (d) => (d.statut === 'ANNULEE' ? 'Annulée' : 'Validée') },
      { titre: "Chiffre d'affaires", valeur: (d) => montant(d.montant), droite: true, somme: (d) => d.montant, formatTotal: montant },
      { titre: "Coût d'achat", valeur: (d) => montant(d.cout), droite: true, somme: (d) => d.cout, formatTotal: montant },
      { titre: 'Marge', valeur: (d) => montant(d.marge), droite: true, somme: (d) => d.marge, formatTotal: montant },
    ],
  },
  pertes: {
    titre: 'Produits perdus (retraits)',
    lignes: () => point.value.pertes.lignes,
    colonnes: [
      { titre: 'Date', valeur: (r) => dateHeure(r.date) },
      { titre: 'N°', valeur: (r) => r.numero },
      { titre: 'Médicament', valeur: (r) => r.produit.designation },
      { titre: 'Lot', valeur: (r) => r.lot.numeroLot },
      { titre: 'Quantité', valeur: (r) => quantite(r.quantite, r.produit.plaquesParBoite), droite: true },
      { titre: 'Motif', valeur: (r) => (r.precision ? `${r.motif} : ${r.precision}` : r.motif) },
      { titre: 'Valeur', valeur: (r) => montant(r.valeur), droite: true, somme: (r) => Number(r.valeur), formatTotal: montant },
    ],
  },
  correctifs: {
    titre: "Correctifs d'inventaire",
    lignes: () => point.value.correctifs.lignes,
    colonnes: [
      ...COL_MOUVEMENT,
      { titre: 'Valeur', valeur: (m) => montant(m.quantite * Number(m.prixUnitaire)), droite: true, somme: (m) => m.quantite * Number(m.prixUnitaire), formatTotal: montant },
      { titre: 'Justification', valeur: (m) => m.motif },
    ],
  },
  'stock-final': {
    titre: 'Stock restant (par lot)',
    lignes: () => stocksPoint.value.final,
    colonnes: COL_LOTS_STOCK,
  },
}
const colonnesDetail = computed(() => (detail.value ? DETAILS[detail.value].colonnes : []))
const lignesDetail = computed(() => {
  if (!detail.value || !point.value) return []
  const texte = rechercheDetail.value.toLowerCase()
  const lignes = DETAILS[detail.value].lignes()
  if (!texte) return lignes
  return lignes.filter((l) => colonnesDetail.value.some((c) => String(c.valeur(l) ?? '').toLowerCase().includes(texte)))
})
/** Tri par colonne : valeur numérique si la colonne a une somme, sinon le texte affiché. */
const triPar = (colonnes) =>
  new Proxy(
    {},
    {
      get: (_o, cle) => {
        const c = colonnes.value[Number(cle)]
        return c ? (l) => (c.somme ?? c.valeur)(l) : undefined
      },
    },
  )
const {
  tri: triDetail,
  lignesTriees: lignesDetailTriees,
  page: pDetail,
  taille: tDetail,
  lignesPage: pageDetail,
} = utiliserTableau(lignesDetail, [detail, rechercheDetail], triPar(colonnesDetail))

/** Synthèse du point financier (PDF / Excel). */
const synthese = computed(() =>
  point.value
    ? [
        { poste: `Stock initial au ${date(point.value.du)}`, valeur: point.value.stockInitial },
        { poste: 'Produits reçus (entrées)', valeur: point.value.entrees.valeur },
        { poste: "Produits vendus (coût d'achat)", valeur: -point.value.ventes.coutAchat },
        { poste: 'Produits perdus (retraits)', valeur: -point.value.pertes.valeur },
        { poste: "Correctifs d'inventaire (net)", valeur: point.value.correctifs.net },
        { poste: `Stock restant au ${date(point.value.au)}`, valeur: point.value.stockFinal },
        { poste: "Chiffre d'affaires des ventes (prix de vente)", valeur: point.value.ventes.chiffreAffaires },
        { poste: 'Marge sur les ventes', valeur: point.value.ventes.marge },
      ]
    : [],
)
const COLONNES_SYNTHESE = [
  { titre: 'Poste', valeur: (l) => l.poste },
  { titre: 'Montant (FCFA)', valeur: (l) => montant(l.valeur), droite: true },
]

// =============================================================================
// ÉTAT DU STOCK À DATE
// =============================================================================
const VUES_ETAT = [
  { id: 'PRODUIT', libelle: 'Par produit' },
  { id: 'LOT', libelle: 'Par lot' },
]
const dateEtat = ref(aujourdhui())
const vueEtat = ref('PRODUIT')
const rechercheEtat = ref('')
const avecStockSeul = ref(true)
const etatFiltre = ref(null)
const etat = ref(null)

async function chargerEtat() {
  chargement.value = true
  try {
    etat.value = (await api.get('/rapports/etat-stock', { params: { date: dateEtat.value } })).data
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}

const produitsEtat = computed(() =>
  (etat.value?.produits ?? []).filter((p) => {
    if (avecStockSeul.value && !p.stock) return false
    if (etatFiltre.value && p.etat !== etatFiltre.value) return false
    const t = rechercheEtat.value.toLowerCase()
    return !t || [p.designation, p.code, ...p.lots.map((l) => l.numeroLot)].some((v) => (v || '').toLowerCase().includes(t))
  }),
)
const lignesEtat = computed(() =>
  vueEtat.value === 'LOT' ? produitsEtat.value.flatMap((p) => p.lots.map((l) => ({ ...l, produit: p, etat: p.etat }))) : produitsEtat.value,
)
const parEtat = computed(() => {
  const n = {}
  for (const p of etat.value?.produits ?? []) if (!avecStockSeul.value || p.stock) n[p.etat] = (n[p.etat] ?? 0) + 1
  return n
})
const valeurEtat = computed(() => produitsEtat.value.reduce((s, p) => s + p.valeur, 0))

const COLONNES_PRODUITS = [
  { titre: 'Code', valeur: (p) => p.code },
  { titre: 'Médicament', valeur: (p) => p.designation },
  { titre: 'Famille', valeur: (p) => p.famille?.libelle ?? '' },
  { titre: 'Lots', valeur: (p) => p.lots.length, droite: true },
  { titre: 'Stock', valeur: (p) => quantite(p.stock, p.plaquesParBoite), droite: true },
  { titre: 'Disponible', valeur: (p) => quantite(p.stockDisponible, p.plaquesParBoite), droite: true },
  { titre: 'Conso / jour', valeur: (p) => nombre(p.consoJournaliere), droite: true },
  { titre: 'Couverture', valeur: (p) => (p.couvertureJours === null ? '—' : `${nombre(p.couvertureJours)} j`), droite: true },
  { titre: 'État', valeur: (p) => ETATS[p.etat]?.libelle },
  { titre: 'Valeur', valeur: (p) => montant(p.valeur), droite: true, somme: (p) => p.valeur, formatTotal: montant },
]
const COLONNES_LOTS = [
  { titre: 'Médicament', valeur: (l) => l.produit.designation },
  { titre: 'Lot', valeur: (l) => l.numeroLot },
  { titre: 'Fournisseur', valeur: (l) => l.fournisseur ?? '' },
  { titre: 'Péremption', valeur: (l) => date(l.datePeremption) + (l.perime ? ' (périmé)' : '') },
  { titre: 'Quantité', valeur: (l) => quantite(l.quantite, l.produit.plaquesParBoite), droite: true },
  { titre: 'Prix unitaire', valeur: (l) => montant(l.prixAchatPlaque), droite: true },
  { titre: 'État', valeur: (l) => ETATS[l.etat]?.libelle },
  { titre: 'Valeur', valeur: (l) => montant(l.valeur), droite: true, somme: (l) => l.valeur, formatTotal: montant },
]
const colonnesEtat = computed(() => (vueEtat.value === 'LOT' ? COLONNES_LOTS : COLONNES_PRODUITS))
const {
  tri: triEtat,
  lignesTriees: lignesEtatTriees,
  page: pEtat,
  taille: tEtat,
  lignesPage: pageEtat,
} = utiliserTableau(lignesEtat, [vueEtat, rechercheEtat, avecStockSeul, etatFiltre], triPar(colonnesEtat))

// =============================================================================
// AUTRES RAPPORTS (déjà dans leurs modules)
// =============================================================================
const AUTRES = [
  { titre: 'Rapport des retraits', texte: 'Retours, casse, pertes, périmés — par période et par motif', icone: 'corbeille', lien: { name: 'retraits' } },
  { titre: 'Péremptions proches', texte: 'Lots qui périment dans le délai d’alerte, valorisés', icone: 'calendrier', lien: { name: 'peremptions' } },
  { titre: 'Ruptures et sous stock', texte: 'Produits en stock bas et quantité conseillée à commander', icone: 'attention', lien: { name: 'alertes', query: { onglet: 'stock-bas' } } },
  { titre: 'Mouvements', texte: 'Toutes les entrées, sorties, retraits et correctifs', icone: 'fleches', lien: { name: 'mouvements' } },
  { titre: "Écarts d'inventaire", texte: 'Inventaires validés et rapport des écarts valorisés', icone: 'liste', lien: { name: 'inventaires' } },
  { titre: 'Dispensations', texte: 'Ventes par période, annulations, montants', icone: 'sortie', lien: { name: 'dispensation' } },
]

// Chargement initial
if (onglet.value === 'etat') chargerEtat()
else if (onglet.value === 'point') chargerPoint()
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.onglets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.onglet {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  background: #fff;
  color: var(--texte-sur-fond);
  font-weight: 600;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.05);
}
.onglet:hover {
  background: var(--primary-light);
}
.onglet.actif {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 6px 16px rgba(2, 136, 209, 0.35);
}
.raccourcis {
  display: flex;
  gap: 0.4rem;
}
.petit {
  padding: 0.35rem 0.7rem;
  font-size: 0.82rem;
}
/* Cartes du point financier : chaque montant ouvre son détail */
.cartes-financieres {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.85rem;
}
.carte-fin {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.95rem 1.1rem;
  border: 1px solid var(--border);
  border-left: 5px solid;
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.carte-fin:hover,
.carte-fin.choisie {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgb(2 136 209 / 0.18);
}
.carte-fin.choisie {
  background: var(--fond-pale);
}
.carte-fin small {
  font-size: 0.8rem;
  color: var(--muted);
}
.carte-fin strong {
  font-size: 1.35rem;
  color: var(--primary-dark);
}
.carte-fin span {
  font-size: 0.78rem;
  color: var(--muted);
}
.carte-fin.neutre {
  border-left-color: #90a4ae;
}
.carte-fin.vert {
  border-left-color: #2e7d32;
}
.carte-fin.bleu {
  border-left-color: var(--primary);
}
.carte-fin.rouge {
  border-left-color: var(--danger);
}
.carte-fin.orange {
  border-left-color: #ef6c00;
}
.carte-fin.fonce {
  border-left-color: var(--primary-dark);
  background: linear-gradient(120deg, #fff, var(--fond-pale));
}
.controle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-top: 1rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: #fff8ec;
  color: #8a4b00;
  font-size: 0.85rem;
}
.controle.ok {
  background: var(--primary-light);
  color: var(--primary-dark);
}
.espace {
  flex: 1;
}
.titre-detail {
  margin: 0;
  color: var(--primary-dark);
  font-size: 1.05rem;
}
.totaux-etat {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}
.compteur {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
}
.compteur:hover,
.compteur.choisi {
  border-color: var(--primary);
  background: var(--fond-pale);
}
.valeur-totale {
  font-size: 0.95rem;
}
.valeur-totale strong {
  color: var(--primary-dark);
}
.note {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}
/* Téléphone : cartes du point financier sur 2 colonnes */
@media (max-width: 600px) {
  .cartes-financieres {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .carte-fin {
    padding: 0.7rem 0.8rem;
  }
  .carte-fin strong {
    font-size: 1.05rem;
  }
}
/* Autres rapports : cartes-liens */
.autres {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
.carte-rapport {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-radius: 14px;
  background: #fff;
  color: var(--text);
  text-decoration: none;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
}
.carte-rapport:hover {
  box-shadow: 0 8px 22px rgb(2 136 209 / 0.18);
}
.carte-rapport > span:last-child {
  display: flex;
  flex-direction: column;
}
.carte-rapport small {
  color: var(--muted);
}
.icone-rapport {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--primary-light);
  color: var(--primary-dark);
}
</style>
