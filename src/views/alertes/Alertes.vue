<!--
  =============================================================================
  MODULE — SEUILS ET ALERTES (§ 13)
  =============================================================================
  Trois onglets (adresse : /alertes?onglet=stock-bas | peremptions | etats) :
    - Stock bas : produits en rupture ou sous stock (alerte permanente d'en-tête),
      avec la quantité conseillée à commander ;
    - Péremptions : lots qui périment dans le délai d'alerte (périmés compris) ;
    - États du stock : tous les produits avec SD, Qs, couverture, seuil et état.
  Les règles de calcul en vigueur (Paramètres généraux) sont rappelées en haut.
  Listes imprimables (PDF). Actualisation automatique (30 s par défaut).
  =============================================================================
-->
<template>
  <div class="page">
    <EnteteModule
      icone="cloche"
      titre="Seuils et alertes"
      description="Seuil dynamique par produit : couverture = stock disponible ÷ consommation journalière."
    >
      <template #actions>
        <button v-si-modif class="bouton-entete" :disabled="recalcul" @click="recalculer">
          {{ recalcul ? 'Recalcul…' : 'Recalculer maintenant' }}
        </button>
      </template>
    </EnteteModule>

    <!-- Règles de calcul (§ 13.1) -->
    <section v-if="regles" class="regles">
      <div class="regle-titre">
        <strong>Règles en vigueur</strong>
        <span>Qs = sorties des {{ regles.periodeConsoJours }} derniers jours ÷ {{ regles.periodeConsoJours }} · recalcul à chaque mouvement et chaque nuit à {{ regles.heureRecalcul }}</span>
      </div>
      <div class="etats">
        <span><EtatBadge etat="RUPTURE" /> SD = 0</span>
        <span><EtatBadge etat="SANS_CONSO" /> Qs = 0 et SD &gt; 0</span>
        <span><EtatBadge etat="SOUS_STOCK" /> couverture &lt; {{ regles.limiteSousStockJours }} j (ou stock ≤ seuil saisi)</span>
        <span><EtatBadge etat="BIEN_STOCKE" /> {{ regles.limiteSousStockJours }} à {{ regles.limiteSurstockJours }} j</span>
        <span><EtatBadge etat="SURSTOCK" /> couverture &gt; {{ regles.limiteSurstockJours }} j</span>
      </div>
    </section>

    <nav class="onglets">
      <button v-for="o in ONGLETS" :key="o.code" class="onglet" :class="{ actif: onglet === o.code, [o.couleur]: true }" @click="onglet = o.code">
        <Icone :nom="o.icone" :taille="18" />
        {{ o.code === 'peremptions' ? `Péremption ≤ ${regles?.delaiAlertePeremptionJours ?? 30} j` : o.titre }}
        <span class="nombre-onglet">{{ nombres[o.code] }}</span>
      </button>
    </nav>

    <section class="bloc">
      <!-- ===================== STOCK BAS ===================== -->
      <template v-if="onglet === 'stock-bas'">
        <div class="barre-outils">
          <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher un médicament…" />
          <span class="espace"></span>
          <ImportExportTableau titre="Alerte « Stock bas »" sous-titre="Produits en rupture ou sous stock" nom-fichier="stock_bas" :colonnes-pdf="COLONNES_STOCK_BAS" :lignes="stockBasTries" />
        </div>
        <div class="tableau-conteneur">
          <table class="tableau">
            <thead>
              <tr>
                <ColonneTri v-model="triBas" cle="produit">Médicament</ColonneTri>
                <ColonneTri v-model="triBas" cle="etat">État</ColonneTri>
                <ColonneTri v-model="triBas" cle="sd" class="nombre">Stock disponible</ColonneTri>
                <ColonneTri v-model="triBas" cle="qs" class="nombre">Conso / jour</ColonneTri>
                <ColonneTri v-model="triBas" cle="couverture" class="nombre">Couverture</ColonneTri>
                <ColonneTri v-model="triBas" cle="seuil" class="nombre">Seuil</ColonneTri>
                <ColonneTri v-model="triBas" cle="commander" class="nombre">À commander</ColonneTri>
                <th class="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pageBas" :key="p.id">
                <td><strong>{{ p.designation }}</strong><div class="detail code">{{ p.code }}</div></td>
                <td><EtatBadge :etat="p.etatStock" /></td>
                <td class="nombre"><strong>{{ quantite(p.stockDisponible, p.plaquesParBoite) }}</strong></td>
                <td class="nombre">{{ conso(p) }}</td>
                <td class="nombre">{{ couverture(p) }}</td>
                <td class="nombre">{{ p.seuilAlerte || '—' }}</td>
                <td class="nombre">{{ p.aCommander ? quantite(p.aCommander, p.plaquesParBoite) : '—' }}</td>
                <td class="actions">
                  <router-link class="bouton-lien" :to="{ name: 'produit', params: { id: p.id } }">Fiche</router-link>
                </td>
              </tr>
            </tbody>
          </table>
          <Pagination v-model:page="pBas" v-model:taille="tBas" :total="stockBas.length" />
          <p v-if="!chargement && stockBas.length === 0" class="tableau-vide">Aucun produit en rupture ni sous stock.</p>
        </div>
        <p class="note">« À commander » : quantité pour revenir à {{ regles?.limiteSurstockJours }} jours de couverture, d'après la consommation des {{ regles?.periodeConsoJours }} derniers jours.</p>
      </template>

      <!-- ===================== PÉREMPTIONS ===================== -->
      <template v-else-if="onglet === 'peremptions'">
        <div class="barre-outils">
          <input v-model="recherche" class="recherche" type="search" placeholder="Médicament ou n° de lot…" />
          <span class="espace"></span>
          <ImportExportTableau
            :titre="`Alerte « Péremption ≤ ${regles?.delaiAlertePeremptionJours} j »`"
            sous-titre="Lots en stock (périmés compris)"
            nom-fichier="alerte_peremption"
            :colonnes-pdf="COLONNES_LOTS"
            :lignes="lotsTries"
          />
          <router-link class="btn bouton-secondaire" :to="{ name: 'peremptions' }">Gérer les retraits →</router-link>
        </div>
        <div class="tableau-conteneur">
          <table class="tableau">
            <thead>
              <tr>
                <ColonneTri v-model="triLots" cle="produit">Médicament</ColonneTri>
                <ColonneTri v-model="triLots" cle="lot">N° de lot</ColonneTri>
                <ColonneTri v-model="triLots" cle="date">Péremption</ColonneTri>
                <ColonneTri v-model="triLots" cle="jours" class="nombre">Délai</ColonneTri>
                <ColonneTri v-model="triLots" cle="quantite" class="nombre">Quantité</ColonneTri>
                <ColonneTri v-if="voitValeur" v-model="triLots" cle="valeur" class="nombre">Valeur</ColonneTri>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in pageLots" :key="l.id">
                <td><strong>{{ l.produit.designation }}</strong></td>
                <td class="code">{{ l.numeroLot }}</td>
                <td>{{ date(l.datePeremption) }}</td>
                <td class="nombre">
                  <span class="badge" :class="l.perime ? 'badge-rouge' : l.joursRestants <= 7 ? 'badge-orange' : 'badge-bleu'">
                    {{ l.perime ? 'Périmé' : `${l.joursRestants} j` }}
                  </span>
                </td>
                <td class="nombre">{{ quantite(l.quantiteRestante, l.produit.plaquesParBoite) }}</td>
                <td v-if="voitValeur" class="nombre">{{ montant(l.valeur) }}</td>
              </tr>
            </tbody>
          </table>
          <Pagination v-model:page="pLots" v-model:taille="tLots" :total="lotsFiltres.length" />
          <p v-if="!chargement && lotsFiltres.length === 0" class="tableau-vide">Aucun lot ne périme dans le délai d'alerte.</p>
        </div>
      </template>

      <!-- ===================== TOUS LES ÉTATS ===================== -->
      <template v-else>
        <div class="barre-outils">
          <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher un médicament…" />
          <span class="espace"></span>
          <ImportExportTableau titre="États du stock" :sous-titre="etatFiltre ? ETATS[etatFiltre].libelle : 'Tous les produits actifs'" nom-fichier="etats_stock" :colonnes-pdf="COLONNES_ETATS" :lignes="etatsTries" />
        </div>
        <div class="compteurs">
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
        </div>
        <div class="tableau-conteneur">
          <table class="tableau">
            <thead>
              <tr>
                <ColonneTri v-model="triEtats" cle="produit">Médicament</ColonneTri>
                <ColonneTri v-model="triEtats" cle="famille">Famille</ColonneTri>
                <ColonneTri v-model="triEtats" cle="sd" class="nombre">Stock disponible</ColonneTri>
                <ColonneTri v-model="triEtats" cle="qs" class="nombre">Conso / jour</ColonneTri>
                <ColonneTri v-model="triEtats" cle="couverture" class="nombre">Couverture</ColonneTri>
                <ColonneTri v-model="triEtats" cle="seuil" class="nombre">Seuil</ColonneTri>
                <ColonneTri v-if="voitValeur" v-model="triEtats" cle="valeur" class="nombre">Valeur</ColonneTri>
                <ColonneTri v-model="triEtats" cle="etat">État</ColonneTri>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pageEtats" :key="p.id">
                <td><strong>{{ p.designation }}</strong><div class="detail code">{{ p.code }}</div></td>
                <td>{{ p.famille?.libelle || '—' }}</td>
                <td class="nombre"><strong>{{ quantite(p.stockDisponible, p.plaquesParBoite) }}</strong></td>
                <td class="nombre">{{ conso(p) }}</td>
                <td class="nombre">{{ couverture(p) }}</td>
                <td class="nombre">{{ p.seuilAlerte || '—' }}</td>
                <td v-if="voitValeur" class="nombre">{{ montant(p.valeurStock) }}</td>
                <td><EtatBadge :etat="p.etatStock" /></td>
              </tr>
            </tbody>
          </table>
          <Pagination v-model:page="pEtats" v-model:taille="tEtats" :total="etatsFiltres.length" />
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import EnteteModule from '@/components/EnteteModule.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import EtatBadge from '@/components/EtatBadge.vue'
import Icone from '@/components/Icone.vue'
import { utiliserTableau } from '@/utils/pagination'
import { utiliserActualisation } from '@/utils/actualisation'
import { ETATS } from '@/utils/etats'
import { PRIX_ACHAT } from '@/utils/roles'
import { date, montant, nombre, quantite } from '@/utils/format'

const store = useStore()
const route = useRoute()
const router = useRouter()

const ONGLETS = [
  { code: 'stock-bas', titre: 'Stock bas', icone: 'attention', couleur: 'rouge' },
  { code: 'peremptions', titre: 'Péremptions', icone: 'calendrier', couleur: 'orange' },
  { code: 'etats', titre: 'États du stock', icone: 'liste', couleur: '' },
]
const onglet = ref(ONGLETS.some((o) => o.code === route.query.onglet) ? route.query.onglet : 'stock-bas')
watch(onglet, (code) => {
  router.replace({ query: { onglet: code } })
  recherche.value = ''
})
watch(
  () => route.query.onglet,
  (code) => {
    if (code && code !== onglet.value && ONGLETS.some((o) => o.code === code)) onglet.value = code
  },
)

const recherche = ref('')
const etatFiltre = ref(null)
const chargement = ref(false)
const recalcul = ref(false)

const detail = computed(() => store.state.alertes.detail)
const regles = computed(() => detail.value.regles)
const voitValeur = computed(() => store.getters['auth/peut'](PRIX_ACHAT))
const texte = computed(() => recherche.value.toLowerCase())
const correspond = (...valeurs) => !texte.value || valeurs.some((v) => (v || '').toLowerCase().includes(texte.value))

const stockBas = computed(() =>
  detail.value.produits.filter((p) => ['RUPTURE', 'SOUS_STOCK'].includes(p.etatStock) && correspond(p.designation, p.code)),
)
const lotsFiltres = computed(() => detail.value.lots.filter((l) => correspond(l.produit.designation, l.numeroLot)))
const etatsFiltres = computed(() =>
  detail.value.produits.filter((p) => (!etatFiltre.value || p.etatStock === etatFiltre.value) && correspond(p.designation, p.code)),
)
const parEtat = computed(() => {
  const n = {}
  for (const p of detail.value.produits) n[p.etatStock] = (n[p.etatStock] ?? 0) + 1
  return n
})
const nombres = computed(() => ({
  'stock-bas': detail.value.produits.filter((p) => ['RUPTURE', 'SOUS_STOCK'].includes(p.etatStock)).length,
  peremptions: detail.value.lots.length,
  etats: detail.value.produits.length,
}))

const conso = (p) => (p.consoJournaliere > 0 ? nombre(Math.round(p.consoJournaliere * 100) / 100) : '0')
const couverture = (p) => (p.couvertureJours === null ? '—' : `${nombre(p.couvertureJours)} j`)

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('alertes/chargerDetail')
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}
utiliserActualisation(charger)

async function recalculer() {
  recalcul.value = true
  try {
    await store.dispatch('alertes/recalculer')
    store.dispatch('notifications/succes', 'États de stock recalculés.')
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    recalcul.value = false
  }
}

// ---------- Tri, pagination, PDF ----------
const triProduits = {
  produit: (p) => p.designation,
  famille: (p) => p.famille?.libelle,
  etat: (p) => ETATS[p.etatStock]?.libelle,
  sd: (p) => p.stockDisponible,
  qs: (p) => p.consoJournaliere,
  couverture: (p) => p.couvertureJours ?? -1,
  seuil: (p) => p.seuilAlerte,
  commander: (p) => p.aCommander ?? 0,
  valeur: (p) => p.valeurStock ?? 0,
}
const { tri: triBas, lignesTriees: stockBasTries, page: pBas, taille: tBas, lignesPage: pageBas } = utiliserTableau(stockBas, [recherche], triProduits)
const { tri: triEtats, lignesTriees: etatsTries, page: pEtats, taille: tEtats, lignesPage: pageEtats } = utiliserTableau(
  etatsFiltres,
  [recherche, etatFiltre],
  triProduits,
)
const { tri: triLots, lignesTriees: lotsTries, page: pLots, taille: tLots, lignesPage: pageLots } = utiliserTableau(lotsFiltres, [recherche], {
  produit: (l) => l.produit.designation,
  lot: (l) => l.numeroLot,
  date: (l) => l.datePeremption,
  jours: (l) => l.joursRestants,
  quantite: (l) => l.quantiteRestante,
  valeur: (l) => l.valeur ?? 0,
})

const COLONNES_STOCK_BAS = [
  { titre: 'Code', valeur: (p) => p.code },
  { titre: 'Médicament', valeur: (p) => p.designation },
  { titre: 'État', valeur: (p) => ETATS[p.etatStock]?.libelle },
  { titre: 'Stock', valeur: (p) => quantite(p.stockDisponible, p.plaquesParBoite), droite: true },
  { titre: 'Conso / jour', valeur: (p) => conso(p), droite: true },
  { titre: 'Couverture', valeur: (p) => couverture(p), droite: true },
  { titre: 'Seuil', valeur: (p) => p.seuilAlerte || '', droite: true },
  { titre: 'À commander', valeur: (p) => (p.aCommander ? quantite(p.aCommander, p.plaquesParBoite) : ''), droite: true },
]
const COLONNES_LOTS = [
  { titre: 'Médicament', valeur: (l) => l.produit.designation },
  { titre: 'N° de lot', valeur: (l) => l.numeroLot },
  { titre: 'Péremption', valeur: (l) => date(l.datePeremption) },
  { titre: 'Délai', valeur: (l) => (l.perime ? 'Périmé' : `${l.joursRestants} j`), droite: true },
  { titre: 'Quantité', valeur: (l) => quantite(l.quantiteRestante, l.produit.plaquesParBoite), droite: true },
  { titre: 'Valeur', valeur: (l) => montant(l.valeur), droite: true, somme: (l) => Number(l.valeur ?? 0), formatTotal: montant },
]
const COLONNES_ETATS = [
  { titre: 'Code', valeur: (p) => p.code },
  { titre: 'Médicament', valeur: (p) => p.designation },
  { titre: 'Famille', valeur: (p) => p.famille?.libelle },
  { titre: 'Stock', valeur: (p) => quantite(p.stockDisponible, p.plaquesParBoite), droite: true },
  { titre: 'Conso / jour', valeur: (p) => conso(p), droite: true },
  { titre: 'Couverture', valeur: (p) => couverture(p), droite: true },
  { titre: 'Valeur', valeur: (p) => montant(p.valeurStock), droite: true, somme: (p) => Number(p.valeurStock ?? 0), formatTotal: montant },
  { titre: 'État', valeur: (p) => ETATS[p.etatStock]?.libelle },
]

onMounted(charger)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.bouton-entete {
  background: #fff;
  color: var(--primary-dark);
}
.bouton-entete:hover {
  background: var(--primary-light);
}
.regles {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem 1.2rem;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
}
.regle-titre {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  align-items: baseline;
}
.regle-titre span {
  font-size: 0.85rem;
  color: var(--muted);
}
.etats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  font-size: 0.85rem;
}
.etats span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
/* Onglets en pilules (comme le Paramétrage) */
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
.nombre-onglet {
  min-width: 22px;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 0.72rem;
  font-weight: 800;
  text-align: center;
}
.onglet.rouge .nombre-onglet {
  background: #fdecec;
  color: var(--danger);
}
.onglet.orange .nombre-onglet {
  background: #fff1e0;
  color: #b35c00;
}
.onglet.actif .nombre-onglet {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.compteurs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 0.9rem;
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
.detail {
  font-size: 0.78rem;
  color: var(--muted);
}
.note {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}
</style>
