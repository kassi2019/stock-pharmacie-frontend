<!--
  =============================================================================
  MODULE — INVENTAIRES ET MOUVEMENTS (§ 12 et § 14)
  =============================================================================
  Deux onglets (même présentation que le Paramétrage et les Produits) :
    - Inventaire (OngletInventaire.vue) : inventaire par lot au fil de l'eau,
      stock réel compté, écarts justifiés, fiche d'inventaire ;
    - Mouvements (OngletMouvements.vue) : toutes les entrées, sorties, retraits,
      annulations et correctifs, avec leur auteur et leur document.
  BADGES : lots périmés en stock (rouge) sur l'inventaire, mouvements du jour sur Mouvements.
  L'onglet affiché est écrit dans l'adresse (ex. /inventaires?onglet=mouvements) ;
  l'ancienne adresse /mouvements ouvre l'onglet Mouvements.
  Droits : module « inventaires » du profil (VOIR / IMPRIMER / MODIFIER / VALIDER).
  =============================================================================
-->
<template>
  <div class="page-inventaires">
    <EnteteModule
      icone="liste"
      titre="Inventaires et mouvements"
      description="Inventaire par lot (stock réel compté, écarts justifiés et validés) et historique complet des mouvements de stock."
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
        {{ onglet.titre }}
        <span v-if="badges[onglet.code]" class="nombre-onglet" :title="badges[onglet.code].aide">
          {{ badges[onglet.code].nombre }}
        </span>
      </button>
    </nav>

    <section class="bloc">
      <OngletMouvements v-if="ongletActif === 'mouvements'" />
      <OngletInventaire v-else />
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
import { aujourdhui } from '@/utils/format'
import OngletInventaire from './OngletInventaire.vue'
import OngletMouvements from './OngletMouvements.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

const ONGLETS = [
  { code: 'inventaire', titre: 'Inventaire', icone: 'liste' },
  { code: 'mouvements', titre: 'Mouvements', icone: 'fleches' },
]

/** Badges : lots périmés encore en stock (à compter / retirer), mouvements du jour. */
const badges = computed(() => {
  const b = {}
  const perimes = store.state.alertes.enTete.perimes
  if (perimes) b.inventaire = { nombre: perimes, couleur: 'rouge', aide: `${perimes} lot(s) périmé(s) encore en stock` }
  const jour = aujourdhui()
  const duJour = store.state.sorties.mouvements.filter((m) => String(m.date).slice(0, 10) === jour).length
  if (duJour) b.mouvements = { nombre: duJour, aide: 'Mouvements enregistrés aujourd’hui' }
  return b
})

/** Mouvements du jour (pour le badge, même si l'onglet n'est pas ouvert). */
function chargerBadges() {
  if (ongletActif.value === 'mouvements') return // l'onglet charge lui-même ses filtres
  const jour = aujourdhui()
  store.dispatch('sorties/chargerMouvements', { du: jour, au: jour }).catch(() => {})
}

const ongletActif = ref(ONGLETS.some((o) => o.code === route.query.onglet) ? route.query.onglet : 'inventaire')
watch(ongletActif, (code) => router.replace({ query: { onglet: code } }))
onMounted(chargerBadges)
utiliserActualisation(chargerBadges)
</script>

<style scoped>
.page-inventaires {
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
