<!--
  =============================================================================
  ONGLET « SALAIRES DE BASE »
  =============================================================================
  Salaire de base mensuel de chaque membre du personnel (repris dans les
  bulletins préparés ensuite ; un bulletin déjà créé garde son montant).
  Droit MODIFIER : le montant se saisit dans la ligne, puis « Enregistrer ».
  Les fiches du personnel se créent dans le module Utilisateurs > Personnel.
  =============================================================================
-->
<template>
  <div class="onglet-contenu">
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (matricule, nom, fonction)…" />
      <label class="case-a-cocher"><input v-model="afficherInactifs" type="checkbox" /> Afficher les inactifs</label>
      <span class="espace"></span>
      <span class="total">Masse salariale de base : <strong>{{ montant(total) }}</strong> / mois</span>
      <ImportExportTableau titre="Salaires de base" nom-fichier="salaires_base" :colonnes-pdf="COLONNES_PDF" :lignes="lignesTriees" />
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="matricule">Matricule</ColonneTri>
            <ColonneTri v-model="tri" cle="nom">Nom et prénoms</ColonneTri>
            <ColonneTri v-model="tri" cle="fonction">Fonction</ColonneTri>
            <ColonneTri v-model="tri" cle="embauche">Embauche</ColonneTri>
            <ColonneTri v-model="tri" cle="salaire" class="nombre">Salaire de base</ColonneTri>
            <th v-if="peutModifier" class="actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in lignesPage" :key="p.id" :class="{ 'ligne-inactive': !p.actif }">
            <td class="code">{{ p.matricule }}</td>
            <td>
              <div class="personne">
                <Avatar :photo="p.photo" :nom="p.nom" :prenoms="p.prenoms" :taille="32" />
                <strong>{{ p.prenoms }} {{ p.nom }}</strong>
              </div>
            </td>
            <td>{{ p.fonction?.libelle || '—' }}</td>
            <td>{{ p.dateEmbauche ? date(p.dateEmbauche) : '—' }}</td>
            <td class="nombre">
              <ChampMontant v-if="peutModifier" v-model="saisies[p.id]" class="champ-salaire" />
              <template v-else>{{ montant(p.salaireBase) }}</template>
            </td>
            <td v-if="peutModifier" class="actions">
              <button :disabled="!modifie(p) || enCours === p.id" @click="enregistrer(p)">Enregistrer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="affiches.length" />
      <p v-if="!chargement && affiches.length === 0" class="tableau-vide">
        Aucun membre du personnel : créez les fiches dans Utilisateurs > Personnel.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ChampMontant from '@/components/ChampMontant.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import Avatar from '@/components/Avatar.vue'
import { utiliserTableau } from '@/utils/pagination'
import { date, montant } from '@/utils/format'
import { listerSalaires, modifierSalaire } from '@/api/paie'

const store = useStore()
const peutModifier = computed(() => store.getters['auth/peutModifier']('paie'))

const personnel = ref([])
const saisies = ref({})
const recherche = ref('')
const afficherInactifs = ref(false)
const chargement = ref(false)
const enCours = ref(null)

async function charger() {
  chargement.value = true
  try {
    personnel.value = await listerSalaires()
    saisies.value = Object.fromEntries(personnel.value.map((p) => [p.id, Number(p.salaireBase)]))
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}
onMounted(charger)

const affiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return personnel.value.filter((p) => {
    if (!afficherInactifs.value && !p.actif) return false
    if (!texte) return true
    return [p.matricule, p.nom, p.prenoms, p.fonction?.libelle].some((v) => (v || '').toLowerCase().includes(texte))
  })
})
const total = computed(() => personnel.value.filter((p) => p.actif).reduce((s, p) => s + Number(p.salaireBase), 0))
const modifie = (p) => Number(saisies.value[p.id] || 0) !== Number(p.salaireBase)

async function enregistrer(p) {
  enCours.value = p.id
  try {
    const valeur = Number(saisies.value[p.id] || 0)
    await modifierSalaire(p.id, valeur)
    p.salaireBase = valeur
    store.dispatch('notifications/succes', `Salaire de ${p.prenoms || ''} ${p.nom} enregistré.`)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    enCours.value = null
  }
}

const VALEURS_TRI = {
  matricule: (p) => p.matricule,
  nom: (p) => `${p.nom} ${p.prenoms || ''}`,
  fonction: (p) => p.fonction?.libelle,
  embauche: (p) => p.dateEmbauche || '',
  salaire: (p) => Number(p.salaireBase),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(affiches, [recherche, afficherInactifs], VALEURS_TRI)

const COLONNES_PDF = [
  { titre: 'Matricule', valeur: (p) => p.matricule },
  { titre: 'Nom et prénoms', valeur: (p) => `${p.nom} ${p.prenoms || ''}`.trim() },
  { titre: 'Fonction', valeur: (p) => p.fonction?.libelle },
  { titre: 'Embauche', valeur: (p) => date(p.dateEmbauche) },
  { titre: 'Salaire de base', valeur: (p) => montant(p.salaireBase), droite: true, somme: (p) => Number(p.salaireBase), formatTotal: montant },
]
</script>

<style scoped>
.onglet-contenu { display: flex; flex-direction: column; gap: 1rem; }
.personne { display: flex; align-items: center; gap: 0.6rem; }
.total { font-size: 0.88rem; color: var(--muted); }
.total strong { color: var(--primary-dark); }
.champ-salaire { max-width: 170px; margin-left: auto; }
.champ-salaire :deep(input) { text-align: right; }
</style>
