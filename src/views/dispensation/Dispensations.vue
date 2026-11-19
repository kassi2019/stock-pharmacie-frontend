<!--
  =============================================================================
  MODULE — DISPENSATION (§ 10.1)
  =============================================================================
  Liste des ordonnances délivrées : période, recherche (n°, patient, n° de passage),
  statut (validée / annulée), total de la période, export PDF.
  « Nouvelle dispensation » : sortie de stock en FEFO.
  =============================================================================
-->
<template>
  <div class="page">
    <EnteteModule
      icone="sortie"
      titre="Dispensation"
      description="Délivrance des ordonnances : chaque médicament sort du lot le plus proche de la péremption (FEFO)."
    />

    <section class="bloc">
      <div class="barre-outils">
        <input v-model="filtres.recherche" class="recherche" type="search" placeholder="N°, patient, n° de passage…" @search="charger" @keyup.enter="charger" />
        <label class="champ-date">Du <ChampDate v-model="filtres.du" @change="charger" /></label>
        <label class="champ-date">Au <ChampDate v-model="filtres.au" @change="charger" /></label>
        <div class="filtre">
          <ListeDeroulante v-model="filtres.statut" :options="STATUTS" placeholder="Tous les statuts" @update:model-value="charger" />
        </div>
        <span class="espace"></span>
        <ImportExportTableau
          titre="Dispensations"
          :sous-titre="sousTitre"
          nom-fichier="dispensations"
          :colonnes-pdf="COLONNES_PDF"
          :lignes="lignesTriees"
        />
        <button v-si-modif @click="router.push({ name: 'dispensation-nouvelle' })">+ Nouvelle dispensation</button>
      </div>

      <div class="totaux">
        <span class="total">{{ validees.length }} dispensation(s) validée(s)</span>
        <span class="total">Montant : <strong>{{ montant(totalPeriode) }}</strong></span>
        <span v-if="annulees" class="total rouge">{{ annulees }} annulée(s)</span>
      </div>

      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-model="tri" cle="numero">N°</ColonneTri>
              <ColonneTri v-model="tri" cle="date">Date</ColonneTri>
              <ColonneTri v-model="tri" cle="patient">Patient</ColonneTri>
              <ColonneTri v-model="tri" cle="passage">N° de passage</ColonneTri>
              <ColonneTri v-model="tri" cle="lignes" class="nombre">Médicaments</ColonneTri>
              <ColonneTri v-model="tri" cle="montant" class="nombre">Montant</ColonneTri>
              <ColonneTri v-model="tri" cle="statut">Statut</ColonneTri>
              <ColonneTri v-model="tri" cle="agent">Agent</ColonneTri>
              <th class="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in lignesPage" :key="d.id" :class="{ 'ligne-inactive': d.statut === 'ANNULEE' }">
              <td class="code">{{ d.numero }}</td>
              <td>{{ dateHeure(d.date) }}</td>
              <td><strong>{{ d.patient }}</strong></td>
              <td>{{ d.numeroPassage || '—' }}</td>
              <td class="nombre">{{ d._count.lignes }}</td>
              <td class="nombre"><strong>{{ montant(d.montantTotal) }}</strong></td>
              <td>
                <span class="badge" :class="d.statut === 'ANNULEE' ? 'badge-rouge' : 'badge-vert'">
                  {{ d.statut === 'ANNULEE' ? 'Annulée' : 'Validée' }}
                </span>
              </td>
              <td>{{ d.utilisateur.nom }}</td>
              <td class="actions">
                <button class="bouton-lien" @click="router.push({ name: 'dispensation-fiche', params: { id: d.id } })">Voir</button>
              </td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model:page="page" v-model:taille="taille" :total="dispensations.length" />
        <p v-if="!chargement && dispensations.length === 0" class="tableau-vide">Aucune dispensation sur la période.</p>
        <p v-if="chargement" class="tableau-vide">Chargement…</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import EnteteModule from '@/components/EnteteModule.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import { utiliserTableau } from '@/utils/pagination'
import { utiliserActualisation } from '@/utils/actualisation'
import { aujourdhui, date, dateHeure, montant } from '@/utils/format'

const store = useStore()
const router = useRouter()

const STATUTS = [
  { id: 'VALIDEE', libelle: 'Validées' },
  { id: 'ANNULEE', libelle: 'Annulées' },
]
// Par défaut : le mois en cours
const filtres = ref({ du: aujourdhui().slice(0, 8) + '01', au: aujourdhui(), statut: null, recherche: '' })
const chargement = ref(false)

const dispensations = computed(() => store.state.sorties.dispensations)
const validees = computed(() => dispensations.value.filter((d) => d.statut !== 'ANNULEE'))
const annulees = computed(() => dispensations.value.length - validees.value.length)
const totalPeriode = computed(() => validees.value.reduce((s, d) => s + Number(d.montantTotal), 0))
const sousTitre = computed(() => `Du ${date(filtres.value.du)} au ${date(filtres.value.au)}`)

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('sorties/chargerDispensations', filtres.value)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}

const COLONNES_PDF = [
  { titre: 'N°', valeur: (d) => d.numero },
  { titre: 'Date', valeur: (d) => dateHeure(d.date) },
  { titre: 'Patient', valeur: (d) => d.patient },
  { titre: 'N° de passage', valeur: (d) => d.numeroPassage },
  { titre: 'Montant', valeur: (d) => montant(d.montantTotal), droite: true, somme: (d) => (d.statut === 'ANNULEE' ? 0 : Number(d.montantTotal)), formatTotal: montant },
  { titre: 'Statut', valeur: (d) => (d.statut === 'ANNULEE' ? 'Annulée' : 'Validée') },
  { titre: 'Agent', valeur: (d) => d.utilisateur.nom },
]

const VALEURS_TRI = {
  numero: (d) => d.numero,
  date: (d) => d.date,
  patient: (d) => d.patient,
  passage: (d) => d.numeroPassage,
  lignes: (d) => d._count.lignes,
  montant: (d) => Number(d.montantTotal),
  statut: (d) => d.statut,
  agent: (d) => d.utilisateur.nom,
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(dispensations, [filtres], VALEURS_TRI)

onMounted(charger)
utiliserActualisation(charger)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.champ-date {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--muted);
}
.champ-date input {
  width: auto;
}
.totaux {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}
.total {
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 0.85rem;
}
.total.rouge {
  background: #fdecec;
  color: var(--danger);
}
</style>
