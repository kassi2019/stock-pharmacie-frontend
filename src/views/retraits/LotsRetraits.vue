<!--
  =============================================================================
  MODULE — ALERTES, LOTS ET RETRAITS (§ 10.2, § 11 et § 13)
  =============================================================================
  Quatre onglets (même présentation que le Paramétrage et les Produits) :
    - Stock bas (OngletSeuils.vue) : ruptures et sous stock, quantité à commander ;
    - Péremptions (OngletPeremptions.vue) : lots périmés ou qui périment bientôt,
      « Retirer » sur un lot, « Retirer les périmés » ;
    - Retraits (OngletRetraits.vue) : historique des retraits, « Nouveau retrait » ;
    - États du stock (OngletSeuils.vue) : SD, Qs, couverture, seuil et état de tous les produits.
  BADGES des onglets : rouge = urgent (ruptures, lots périmés), orange = à surveiller.
  Actualisation automatique (30 s par défaut).
  L'onglet affiché est écrit dans l'adresse (ex. /retraits?onglet=stock-bas) ;
  les anciennes adresses /alertes et /peremptions ouvrent le bon onglet.
  Droits : module « retraits » du profil (VOIR / IMPRIMER / MODIFIER).
  =============================================================================
-->
<template>
  <div class="page-lots">
    <EnteteModule
      icone="cloche"
      titre="Alertes, lots et retraits"
      description="Seuils et alertes de stock, lots proches de la péremption, retraits tracés avec leur motif. Les périmés sont retirés automatiquement chaque nuit."
    />

    <nav class="onglets">
      <button
        v-for="onglet in ONGLETS"
        :key="onglet.code"
        class="onglet"
        :class="[{ actif: ongletActif === onglet.code }, badges[onglet.code]?.couleur]"
        @click="ongletActif = onglet.code"
      >
        <Icone :nom="onglet.icone" :taille="18" />
        {{ onglet.code === 'peremptions' ? `Péremptions ≤ ${delai} j` : onglet.titre }}
        <span v-if="badges[onglet.code]" class="nombre-onglet" :title="badges[onglet.code].aide">
          {{ badges[onglet.code].nombre }}
        </span>
      </button>
    </nav>

    <section class="bloc">
      <OngletSeuils v-if="ongletActif === 'stock-bas'" vue="stock-bas" />
      <OngletPeremptions v-else-if="ongletActif === 'peremptions'" />
      <OngletRetraits v-else-if="ongletActif === 'historique'" />
      <OngletSeuils v-else vue="etats" />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import Icone from '@/components/Icone.vue'
import EnteteModule from '@/components/EnteteModule.vue'
import { utiliserActualisation } from '@/utils/actualisation'
import OngletSeuils from './OngletSeuils.vue'
import OngletPeremptions from './OngletPeremptions.vue'
import OngletRetraits from './OngletRetraits.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

const ONGLETS = [
  { code: 'stock-bas', titre: 'Stock bas', icone: 'attention' },
  { code: 'peremptions', titre: 'Péremptions', icone: 'calendrier' },
  { code: 'historique', titre: 'Retraits', icone: 'corbeille' },
  { code: 'etats', titre: 'États du stock', icone: 'liste' },
]

/** Alertes du module (détail des seuils : produits et lots à péremption). */
const detail = computed(() => store.state.alertes.detail)
const delai = computed(() => detail.value.regles?.delaiAlertePeremptionJours ?? store.state.alertes.enTete.delai)

/** Badges des onglets : { nombre, couleur ('rouge' urgent, 'orange' à surveiller), aide }. */
const badges = computed(() => {
  const produits = detail.value.produits
  const ruptures = produits.filter((p) => p.etatStock === 'RUPTURE').length
  const sousStock = produits.filter((p) => p.etatStock === 'SOUS_STOCK').length
  const perimes = detail.value.lots.filter((l) => l.perime).length
  const proches = detail.value.lots.length - perimes
  const retraits = store.state.sorties.retraits.length
  const b = {}
  if (ruptures + sousStock) {
    b['stock-bas'] = {
      nombre: ruptures + sousStock,
      couleur: ruptures ? 'rouge' : 'orange',
      aide: `${ruptures} rupture(s), ${sousStock} sous stock`,
    }
  }
  if (perimes + proches) {
    b.peremptions = {
      nombre: perimes + proches,
      couleur: perimes ? 'rouge' : 'orange',
      aide: `${perimes} lot(s) périmé(s), ${proches} lot(s) qui périment dans ${delai.value} jours`,
    }
  }
  if (retraits) b.historique = { nombre: retraits, aide: 'Retraits sur la période affichée' }
  if (produits.length) b.etats = { nombre: produits.length, aide: 'Produits actifs' }
  return b
})

function chargerAlertes() {
  store.dispatch('alertes/chargerDetail').catch(() => {})
}
onMounted(chargerAlertes)
utiliserActualisation(chargerAlertes)

const ongletActif = ref(ONGLETS.some((o) => o.code === route.query.onglet) ? route.query.onglet : 'stock-bas')
watch(ongletActif, (code) => router.replace({ query: { onglet: code } }))
// Lien d'en-tête (Stock bas / Péremption) alors que la page est déjà ouverte
watch(
  () => route.query.onglet,
  (code) => {
    if (code && code !== ongletActif.value && ONGLETS.some((o) => o.code === code)) ongletActif.value = code
  },
)
</script>

<style scoped>
.page-lots {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Onglets en « pilules » (comme le Paramétrage) */
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
.onglet.actif .nombre-onglet {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.onglet.rouge .nombre-onglet {
  background: #fdecec;
  color: var(--danger);
}
.onglet.orange .nombre-onglet {
  background: #fff1e0;
  color: #b35c00;
}
.onglet.actif.rouge .nombre-onglet {
  background: var(--danger);
  color: #fff;
}
.onglet.actif.orange .nombre-onglet {
  background: #f57c00;
  color: #fff;
}
</style>
