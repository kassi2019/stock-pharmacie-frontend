<!--
  =============================================================================
  MODULE 01 — PARAMÉTRAGE (page principale avec onglets, comme le district)
  =============================================================================
  Chaque onglet est un composant séparé :
    - CatalogueMedicaments.vue (dossier produits) : catalogue des médicaments, stock, état ;
    - OngletPrix.vue (dossier produits) : prix de vente (historique, nouveau prix) et d'achat ;
      ➜ ces deux onglets suivent les droits « Médicaments et prix » du profil (module produits) :
        un profil sans droit sur le Paramétrage (ex. médecin) ne voit qu'eux ;
    - OngletFournisseurs.vue  fournisseurs (§ 8)
    - OngletReferentiel.vue   familles, formes, unités de comptage, fonctions (listes code + libellé)
  (Personnel, comptes et profils : module « Utilisateurs ».)
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
      description="Données de référence utilisées par tous les modules : médicaments et prix, fournisseurs, familles, formes, unités de comptage, fonctions et réglages."
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
      <CatalogueMedicaments v-if="ongletActif === 'medicaments'" @voir-prix="voirPrix" />
      <OngletPrix v-else-if="ongletActif === 'prix'" :key="route.query.medicament || 'prix'" />
      <OngletFournisseurs v-else-if="ongletActif === 'fournisseurs'" />
      <OngletReferentiel v-else-if="LISTES_SIMPLES[ongletActif]" :key="ongletActif" :config="LISTES_SIMPLES[ongletActif]" />
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
import CatalogueMedicaments from '@/views/produits/CatalogueMedicaments.vue'
import OngletPrix from '@/views/produits/OngletPrix.vue'
import OngletFournisseurs from './OngletFournisseurs.vue'
import OngletReferentiel from './OngletReferentiel.vue'
import OngletParametres from './OngletParametres.vue'
import OngletSauvegardes from './OngletSauvegardes.vue'

/**
 * Liste des onglets (dans l'ordre d'affichage) ; « admin » = réservé à l'administrateur ;
 * « module » = droits du profil utilisés (par défaut : parametres) ; « prix » = droit prix de vente.
 */
const ONGLETS = [
  // 1. La pharmacie : nom, coordonnées, réglages (seuils, délais…)
  { code: 'parametres', titre: 'Paramètres généraux', icone: 'reglages', admin: true },
  // 2. Listes qui décrivent un médicament (à remplir avant le catalogue)
  { code: 'familles', titre: 'Familles de médicaments', icone: 'presse-papier' },
  { code: 'formes', titre: 'Formes de médicaments', icone: 'gelule' },
  { code: 'unites-vente', titre: 'Unités de comptage', icone: 'carton' },
  // 3. Le catalogue et ses prix
  { code: 'medicaments', titre: 'Médicaments', icone: 'pilule', module: 'produits' },
  { code: 'prix', titre: 'Prix', icone: 'portefeuille', module: 'produits', prix: true },
  // 4. Partenaires et personnel
  { code: 'fournisseurs', titre: 'Fournisseurs', icone: 'camion' },
  { code: 'fonctions', titre: 'Fonctions du personnel', icone: 'utilisateurs' },
  // 5. Sécurité des données
  { code: 'sauvegardes', titre: 'Sauvegardes', icone: 'telecharger', admin: true },
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
    compte: 'personnel',
    titre: 'Fonctions du personnel',
    fichier: 'fonctions_personnel',
    recherche: 'Rechercher une fonction…',
    boutonNouveau: '+ Nouvelle fonction',
    titreNouveau: 'Nouvelle fonction',
    titreModifier: 'Modifier la fonction',
    colonneCompte: 'Personnel',
    messageUtilise: 'Fonction occupée par des membres du personnel',
    exempleCode: 'PHARMACIEN',
    exempleLibelle: 'Pharmacien',
    nomElement: 'Fonction',
  },
}

const route = useRoute()
const router = useRouter()
const store = useStore()

const estAdmin = computed(() => store.getters['auth/estAdmin'])
const ongletsVisibles = computed(() =>
  ONGLETS.filter(
    (o) =>
      (!o.admin || estAdmin.value) &&
      store.getters['auth/peutVoir'](o.module ?? 'parametres') &&
      (!o.prix || store.getters['auth/voitPrixVente']),
  ),
)

/** Nombre par onglet (calculé depuis les listes du store : mis à jour automatiquement). */
const nombres = computed(() => {
  const r = store.state.referentiel
  const m = r.medicaments
  const n = {
    medicaments: m.length,
    prix: m.filter((x) => x.consommable || Number(x.prixVenteBoite) > 0 || Number(x.prixVentePlaque) > 0).length,
    fournisseurs: r.fournisseurs.length,
    familles: r.familles.length,
    formes: r.formes.length,
    'unites-vente': r.unitesVente.length,
    fonctions: r.fonctions.length,
  }
  return n
})

const titresNombres = {
  medicaments: 'Nombre de médicaments (actifs et inactifs)',
  prix: 'Médicaments qui ont un prix de vente',
  fournisseurs: 'Nombre de fournisseurs (actifs et inactifs)',
  familles: 'Nombre de familles',
  formes: 'Nombre de formes',
  'unites-vente': "Nombre d'unités de comptage",
  fonctions: 'Nombre de fonctions du personnel',
}

/** Charge les listes une fois, pour afficher les compteurs dès l'ouverture. */
onMounted(async () => {
  const listes = [
    ...(store.getters['auth/peutVoir']('produits') ? ['medicaments'] : []),
    ...(store.getters['auth/peutVoir']('parametres') ? ['fournisseurs', 'familles', 'formes', 'unitesVente', 'fonctions'] : []),
  ]
  try {
    await Promise.all(listes.map((liste) => store.dispatch('referentiel/charger', { liste })))
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
})

const ongletActif = ref(
  ongletsVisibles.value.some((o) => o.code === route.query.onglet)
    ? route.query.onglet
    : // Onglet ouvert par défaut : Médicaments (le plus utilisé), sinon le premier autorisé
      (ongletsVisibles.value.find((o) => o.code === 'medicaments') ?? ongletsVisibles.value[0])?.code,
)
watch(ongletActif, (code) => {
  // Le médicament choisi n'est gardé dans l'adresse que pour l'onglet Prix
  const medicament = code === 'prix' ? route.query.medicament : undefined
  router.replace({ query: { onglet: code, ...(medicament ? { medicament } : {}) } })
})
// Lien vers un autre onglet alors que la page est déjà ouverte (ex. /produits?onglet=prix)
watch(
  () => route.query.onglet,
  (code) => {
    if (code && code !== ongletActif.value && ongletsVisibles.value.some((o) => o.code === code)) ongletActif.value = code
  },
)

/** Bouton « Prix » d'une ligne du catalogue : onglet Prix ouvert sur ce médicament. */
async function voirPrix(med) {
  await router.replace({ query: { onglet: 'prix', medicament: med.id } })
  ongletActif.value = 'prix'
}
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
