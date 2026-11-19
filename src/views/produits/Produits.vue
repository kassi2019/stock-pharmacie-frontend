<!--
  =============================================================================
  MODULE — PRODUITS ET MÉDICAMENTS (§ 7)
  =============================================================================
  Deux onglets (même présentation que le Paramétrage) :
    - Médicaments (CatalogueMedicaments.vue) : catalogue des médicaments et
      consommables, stock disponible, état du stock ; « Fiche » = lots du produit ;
    - Prix (OngletPrix.vue) : prix de vente (historique, nouveau prix, correction)
      et prix d'achat (repris des réceptions). Masqué pour le médecin (§ 6).
  Le bouton « Prix » d'une ligne du catalogue ouvre l'onglet Prix sur ce médicament.
  L'onglet affiché est écrit dans l'adresse (ex. /produits?onglet=prix&medicament=12).
  Les listes de référence (familles, formes, unités de vente) restent dans le Paramétrage.
  =============================================================================
-->
<template>
  <div class="page-produits">
    <EnteteModule
      icone="pilule"
      titre="Produits et médicaments"
      description="Catalogue des médicaments et consommables, prix de vente et d'achat, stock et lots par produit."
    />

    <nav v-if="ongletsVisibles.length > 1" class="onglets">
      <button
        v-for="onglet in ongletsVisibles"
        :key="onglet.code"
        class="onglet"
        :class="{ actif: ongletActif === onglet.code }"
        @click="ongletActif = onglet.code"
      >
        <Icone :nom="onglet.icone" :taille="18" />
        {{ onglet.titre }}
        <span v-if="nombres[onglet.code] !== undefined" class="nombre-onglet" :title="onglet.aide">
          {{ nombres[onglet.code] }}
        </span>
      </button>
    </nav>

    <section class="bloc">
      <CatalogueMedicaments v-if="ongletActif === 'medicaments'" @voir-prix="voirPrix" />
      <OngletPrix v-else-if="ongletActif === 'prix'" />
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import Icone from '@/components/Icone.vue'
import EnteteModule from '@/components/EnteteModule.vue'
import CatalogueMedicaments from './CatalogueMedicaments.vue'
import OngletPrix from './OngletPrix.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

/** Le médecin ne voit ni prix ni quantités (§ 6) : pas d'onglet Prix. */
const voitPrix = computed(() => store.getters['auth/role'] !== 'MEDECIN')

const ONGLETS = [
  { code: 'medicaments', titre: 'Médicaments', icone: 'carton', aide: 'Nombre de médicaments (actifs et inactifs)' },
  { code: 'prix', titre: 'Prix', icone: 'portefeuille', prix: true, aide: 'Médicaments qui ont un prix de vente' },
]
const ongletsVisibles = computed(() => ONGLETS.filter((o) => !o.prix || voitPrix.value))

/** Nombre par onglet (listes du store, mises à jour automatiquement). */
const nombres = computed(() => {
  const m = store.state.referentiel.medicaments
  return {
    medicaments: m.length,
    prix: m.filter((x) => x.consommable || Number(x.prixVenteBoite) > 0 || Number(x.prixVentePlaque) > 0).length,
  }
})

const ongletActif = ref(
  ongletsVisibles.value.some((o) => o.code === route.query.onglet) ? route.query.onglet : 'medicaments',
)
watch(ongletActif, (code) => {
  // Le médicament choisi n'est gardé dans l'adresse que pour l'onglet Prix
  const medicament = code === 'prix' ? route.query.medicament : undefined
  router.replace({ query: { onglet: code, ...(medicament ? { medicament } : {}) } })
})

/** Bouton « Prix » d'une ligne du catalogue : onglet Prix ouvert sur ce médicament. */
async function voirPrix(med) {
  await router.replace({ query: { onglet: 'prix', medicament: med.id } })
  ongletActif.value = 'prix'
}
</script>

<style scoped>
.page-produits {
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
</style>
