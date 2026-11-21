<!--
  =============================================================================
  MODULE — GESTION DE LA PAIE (paie simple)
  =============================================================================
  Trois onglets :
    - Paie du mois (OngletBulletins.vue) : préparation, bulletins, primes et
      retenues, validation, paiement, état de la paie (PDF / Excel) ;
    - Salaires de base (OngletSalaires.vue) : salaire mensuel de chaque personne ;
    - Historique par agent (OngletHistorique.vue) : bulletins d'une personne sur un an.
  BADGE de l'onglet « Paie du mois » : bulletins encore à valider ou à payer
  (orange). Pas de calcul automatique des cotisations (CNPS, ITS…).
  Les fiches du personnel se gèrent dans le module Utilisateurs.
  Droits : module « paie » du profil (VOIR / IMPRIMER / MODIFIER / VALIDER).
  =============================================================================
-->
<template>
  <div class="page-paie">
    <EnteteModule
      icone="portefeuille"
      titre="Gestion de la paie"
      description="Salaires de base, bulletins mensuels avec primes et retenues, validation et paiement du personnel."
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
        <span v-if="badges[onglet.code]" class="nombre-onglet" :title="badges[onglet.code].aide">{{ badges[onglet.code].nombre }}</span>
      </button>
    </nav>

    <section class="bloc">
      <OngletSalaires v-if="ongletActif === 'salaires'" />
      <OngletHistorique v-else-if="ongletActif === 'historique'" />
      <OngletBulletins v-else @charge="bulletinsDuMois = $event" />
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import EnteteModule from '@/components/EnteteModule.vue'
import OngletBulletins from './OngletBulletins.vue'
import OngletSalaires from './OngletSalaires.vue'
import OngletHistorique from './OngletHistorique.vue'

const route = useRoute()
const router = useRouter()

const ONGLETS = [
  { code: 'mois', titre: 'Paie du mois', icone: 'facture' },
  { code: 'salaires', titre: 'Salaires de base', icone: 'portefeuille' },
  { code: 'historique', titre: 'Historique par agent', icone: 'horloge' },
]

/** Bulletins du mois affiché (envoyés par l'onglet), pour le badge. */
const bulletinsDuMois = ref([])
const badges = computed(() => {
  const aFinir = bulletinsDuMois.value.filter((b) => b.statut !== 'PAYE').length
  return aFinir ? { mois: { nombre: aFinir, couleur: 'orange', aide: 'Bulletins à valider ou à payer' } } : {}
})

const ongletActif = ref(ONGLETS.some((o) => o.code === route.query.onglet) ? route.query.onglet : 'mois')
watch(ongletActif, (code) => router.replace({ query: { onglet: code } }))
</script>

<style scoped>
.page-paie {
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
.nombre-onglet {
  min-width: 22px;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  text-align: center;
}
.onglet.orange .nombre-onglet {
  background: #fff1e0;
  color: #b35c00;
}
.onglet.actif.orange .nombre-onglet {
  background: #f57c00;
  color: #fff;
}
</style>
