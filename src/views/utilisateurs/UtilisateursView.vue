<!--
  =============================================================================
  MODULE — UTILISATEURS (même présentation que le module Utilisateurs du district)
  =============================================================================
  Trois onglets (un composant chacun, dans ce même dossier) :
    - OngletPersonnel.vue  fiches du personnel (photo, matricule, fonction, contacts) ;
                           création du COMPTE de connexion en même temps (facultatif) ;
    - OngletComptes.vue    comptes : identifiant (= matricule), profil, mot de passe, activation ;
    - OngletProfils.vue    profils et droits par module (administrateur seulement).

  Les listes (personnel, comptes, profils) sont chargées ICI une seule fois et
  passées aux onglets ; après une modification, l'onglet émet « modifie » et la
  page recharge tout (les compteurs des onglets restent justes).
  Droits : module « utilisateurs » du profil (VOIR / IMPRIMER / MODIFIER).
  =============================================================================
-->
<template>
  <div class="page-utilisateurs">
    <EnteteModule
      icone="utilisateurs"
      titre="Utilisateurs"
      description="Personnel de la pharmacie, comptes de connexion, profils et droits d'accès aux modules."
    />

    <nav class="onglets">
      <button
        v-for="onglet in ongletsVisibles"
        :key="onglet.code"
        class="onglet"
        :class="{ actif: ongletActif === onglet.code }"
        @click="ongletActif = onglet.code"
      >
        <Icone :nom="onglet.icone" :taille="18" />
        {{ onglet.titre }}
        <span v-if="nombres[onglet.code] !== undefined" class="nombre-onglet" :title="onglet.aide">{{ nombres[onglet.code] }}</span>
      </button>
    </nav>

    <section class="bloc">
      <p v-if="chargement && !charge" class="tableau-vide">Chargement…</p>
      <template v-else>
        <OngletPersonnel v-if="ongletActif === 'personnel'" :personnel="personnel" :profils="profils" @modifie="charger" />
        <OngletComptes
          v-else-if="ongletActif === 'comptes'"
          :comptes="comptes"
          :personnel="personnel"
          :profils="profils"
          @modifie="charger"
        />
        <OngletProfils v-else-if="ongletActif === 'profils'" />
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import EnteteModule from '@/components/EnteteModule.vue'
import Icone from '@/components/Icone.vue'
import OngletPersonnel from './OngletPersonnel.vue'
import OngletComptes from './OngletComptes.vue'
import OngletProfils from './OngletProfils.vue'
import { listerComptes, listerPersonnel, listerProfilsComptes } from '@/api/utilisateurs'

const ONGLETS = [
  { code: 'personnel', titre: 'Personnel', icone: 'utilisateurs', aide: 'Membres du personnel actifs' },
  { code: 'comptes', titre: 'Comptes utilisateurs', icone: 'cle', aide: 'Comptes actifs' },
  { code: 'profils', titre: 'Profils & droits', icone: 'bouclier', admin: true, aide: 'Profils' },
]

const store = useStore()
const route = useRoute()
const router = useRouter()

const estAdmin = computed(() => store.getters['auth/estAdmin'])
const ongletsVisibles = computed(() => ONGLETS.filter((o) => !o.admin || estAdmin.value))

const personnel = ref([])
const comptes = ref([])
const profils = ref([])
const chargement = ref(false)
const charge = ref(false)

const nombres = computed(() => ({
  personnel: personnel.value.filter((p) => p.actif).length,
  comptes: comptes.value.filter((c) => c.actif).length,
  profils: profils.value.length,
}))

async function charger() {
  chargement.value = true
  try {
    ;[personnel.value, comptes.value, profils.value] = await Promise.all([
      listerPersonnel(),
      listerComptes(),
      listerProfilsComptes(),
    ])
    charge.value = true
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}
onMounted(() => {
  charger()
  store.dispatch('referentiel/charger', { liste: 'fonctions' }).catch(() => {})
})

const ongletActif = ref(ongletsVisibles.value.some((o) => o.code === route.query.onglet) ? route.query.onglet : 'personnel')
watch(ongletActif, (code) => {
  router.replace({ query: { onglet: code } })
  if (code !== 'profils') charger()
})
</script>

<style scoped>
.page-utilisateurs {
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
