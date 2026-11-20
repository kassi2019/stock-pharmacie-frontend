<!--
  =============================================================================
  MODULE 01 — PARAMÉTRAGE (page principale avec onglets, comme le district)
  =============================================================================
  Chaque onglet est un composant séparé, dans ce même dossier :
    - OngletFournisseurs.vue  fournisseurs (§ 8)
    - OngletReferentiel.vue   familles, formes, unités de comptage, fonctions (listes code + libellé)
  Le catalogue des médicaments et les prix sont dans le module « Produits et médicaments ».
    - OngletUtilisateurs.vue  comptes utilisateurs et rôles (§ 5) — administrateur
    - OngletParametres.vue    fiche de la pharmacie et réglages (§ 13.2) — administrateur
    - OngletSauvegardes.vue   sauvegardes de la base et copies sur le PC (§ 18) — administrateur

  Chaque onglet affiche le NOMBRE d'éléments de sa liste (voir « nombres »).
  L'onglet affiché est écrit dans l'adresse (ex. /parametres?onglet=formes).
  =============================================================================
-->
<template>
  <div class="page-parametrage">
    <EnteteModule
      icone="reglages"
      titre="Paramétrage"
      description="Données de référence utilisées par tous les modules : fournisseurs, familles, formes, unités de comptage, utilisateurs et réglages."
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
        <span v-if="nombres[onglet.code] !== undefined" class="nombre-onglet" :title="titresNombres[onglet.code]">
          {{ nombres[onglet.code] }}
        </span>
      </button>
    </nav>

    <section class="bloc">
      <OngletFournisseurs v-if="ongletActif === 'fournisseurs'" />
      <OngletReferentiel v-else-if="LISTES_SIMPLES[ongletActif]" :key="ongletActif" :config="LISTES_SIMPLES[ongletActif]" />
      <OngletUtilisateurs v-else-if="ongletActif === 'utilisateurs'" />
      <OngletParametres v-else-if="ongletActif === 'parametres'" />
      <OngletSauvegardes v-else-if="ongletActif === 'sauvegardes'" />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import Icone from '@/components/Icone.vue'
import EnteteModule from '@/components/EnteteModule.vue'
import OngletFournisseurs from './OngletFournisseurs.vue'
import OngletReferentiel from './OngletReferentiel.vue'
import OngletUtilisateurs from './OngletUtilisateurs.vue'
import OngletParametres from './OngletParametres.vue'
import OngletSauvegardes from './OngletSauvegardes.vue'

/** Liste des onglets (dans l'ordre d'affichage) ; « admin » = réservé à l'administrateur. */
const ONGLETS = [
  { code: 'fournisseurs', titre: 'Fournisseurs', icone: 'camion' },
  { code: 'familles', titre: 'Familles de médicaments', icone: 'presse-papier' },
  { code: 'formes', titre: 'Formes de médicaments', icone: 'gelule' },
  { code: 'unites-vente', titre: 'Unités de comptage', icone: 'carton' },
  { code: 'fonctions', titre: 'Fonctions', icone: 'utilisateurs' },
  { code: 'utilisateurs', titre: 'Utilisateurs', icone: 'cle', admin: true },
  { code: 'parametres', titre: 'Paramètres généraux', icone: 'reglages', admin: true },
  { code: 'sauvegardes', titre: 'Sauvegardes', icone: 'carton', admin: true },
]

/** Configuration des listes simples (code + libellé), affichées par OngletReferentiel.vue. */
const LISTES_SIMPLES = {
  familles: {
    liste: 'familles',
    compte: 'produits',
    titre: 'Familles de médicaments',
    fichier: 'familles_medicaments',
    recherche: 'Rechercher une famille…',
    boutonNouveau: '+ Nouvelle famille',
    titreNouveau: 'Nouvelle famille de médicaments',
    titreModifier: 'Modifier la famille',
    colonneCompte: 'Médicaments',
    messageUtilise: 'Famille utilisée par des médicaments',
    exempleCode: 'ANTIPALU',
    exempleLibelle: 'Antipaludiques',
    nomElement: 'Famille',
    avecCategorie: true,
  },
  formes: {
    liste: 'formes',
    compte: 'produits',
    titre: 'Formes de médicaments',
    fichier: 'formes_medicaments',
    recherche: 'Rechercher une forme…',
    boutonNouveau: '+ Nouvelle forme',
    titreNouveau: 'Nouvelle forme de médicament',
    titreModifier: 'Modifier la forme',
    colonneCompte: 'Médicaments',
    messageUtilise: 'Forme utilisée par des médicaments',
    exempleCode: 'COMPRIME',
    exempleLibelle: 'Comprimé',
    nomElement: 'Forme',
  },
  'unites-vente': {
    liste: 'unitesVente',
    compte: 'produits',
    titre: 'Unités de comptage',
    fichier: 'unites_comptage',
    recherche: 'Rechercher une unité…',
    boutonNouveau: '+ Nouvelle unité',
    titreNouveau: 'Nouvelle unité de comptage',
    titreModifier: "Modifier l'unité de comptage",
    colonneCompte: 'Médicaments',
    messageUtilise: 'Unité utilisée par des médicaments',
    exempleCode: 'FLACON',
    exempleLibelle: 'Flacon',
    nomElement: 'Unité de comptage',
  },
  fonctions: {
    liste: 'fonctions',
    compte: 'utilisateurs',
    titre: 'Fonctions du personnel',
    fichier: 'fonctions_personnel',
    recherche: 'Rechercher une fonction…',
    boutonNouveau: '+ Nouvelle fonction',
    titreNouveau: 'Nouvelle fonction',
    titreModifier: 'Modifier la fonction',
    colonneCompte: 'Utilisateurs',
    messageUtilise: 'Fonction occupée par des utilisateurs',
    exempleCode: 'PHARMACIEN',
    exempleLibelle: 'Pharmacien',
    nomElement: 'Fonction',
  },
}

const route = useRoute()
const router = useRouter()
const store = useStore()

const estAdmin = computed(() => store.getters['auth/role'] === 'ADMIN')
const ongletsVisibles = computed(() => ONGLETS.filter((o) => !o.admin || estAdmin.value))

/** Nombre par onglet (calculé depuis les listes du store : mis à jour automatiquement). */
const nombres = computed(() => {
  const r = store.state.referentiel
  const n = {
    fournisseurs: r.fournisseurs.length,
    familles: r.familles.length,
    formes: r.formes.length,
    'unites-vente': r.unitesVente.length,
    fonctions: r.fonctions.length,
  }
  if (estAdmin.value) n.utilisateurs = r.utilisateurs.length
  return n
})

const titresNombres = {
  fournisseurs: 'Nombre de fournisseurs (actifs et inactifs)',
  familles: 'Nombre de familles',
  formes: 'Nombre de formes',
  'unites-vente': "Nombre d'unités de comptage",
  fonctions: 'Nombre de fonctions du personnel',
  utilisateurs: 'Nombre de comptes (actifs et inactifs)',
}

/** Charge les listes une fois, pour afficher les compteurs dès l'ouverture. */
onMounted(async () => {
  const listes = ['fournisseurs', 'familles', 'formes', 'unitesVente', 'fonctions', ...(estAdmin.value ? ['utilisateurs'] : [])]
  try {
    await Promise.all(listes.map((liste) => store.dispatch('referentiel/charger', { liste })))
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
})

const ongletActif = ref(
  ongletsVisibles.value.some((o) => o.code === route.query.onglet) ? route.query.onglet : ONGLETS[0].code,
)
watch(ongletActif, (code) => router.replace({ query: { onglet: code } }))
</script>

<style scoped>
.page-parametrage {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Onglets en « pilules » */
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
