<!--
  =============================================================================
  ONGLET « HISTORIQUE PAR AGENT »
  =============================================================================
  Bulletins d'un membre du personnel sur une année : base, primes, retenues,
  net, statut et date de paiement ; totaux de l'année ; PDF / Excel ;
  « Ouvrir » et bulletin PDF de chaque mois.
  =============================================================================
-->
<template>
  <div class="onglet-contenu">
    <div class="barre-outils">
      <div class="filtre large">
        <ListeDeroulante
          v-model="personnelId"
          :options="personnel"
          :champ-libelle="(p) => `${p.matricule} — ${p.prenoms || ''} ${p.nom}${p.actif ? '' : ' (inactif)'}`"
          placeholder="Choisir un membre du personnel…"
          @update:model-value="charger"
        />
      </div>
      <label class="champ-annee">Année <input v-model="annee" type="number" min="2000" max="2100" @change="charger" /></label>
      <span class="espace"></span>
      <ImportExportTableau
        v-if="personneChoisie"
        :titre="`Paie de ${personneChoisie.prenoms || ''} ${personneChoisie.nom} — ${annee}`"
        :sous-titre="`Matricule ${personneChoisie.matricule}`"
        :nom-fichier="`paie_${personneChoisie.matricule}_${annee}`"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="bulletins"
      />
    </div>

    <div v-if="personneChoisie" class="totaux">
      <span>{{ bulletins.length }} bulletin(s)</span>
      <span>Primes : <strong>{{ montant(somme('totalPrimes')) }}</strong></span>
      <span>Retenues : <strong>{{ montant(somme('totalRetenues')) }}</strong></span>
      <span class="net">Net de l'année : <strong>{{ montant(somme('netAPayer')) }}</strong></span>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <th>Mois</th>
            <th>N°</th>
            <th class="nombre">Base</th>
            <th class="nombre">Primes</th>
            <th class="nombre">Retenues</th>
            <th class="nombre">Net à payer</th>
            <th>Statut</th>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in bulletins" :key="b.id">
            <td><strong>{{ libelleMois(b.mois) }}</strong></td>
            <td class="code">{{ b.numero }}</td>
            <td class="nombre">{{ montant(b.salaireBase) }}</td>
            <td class="nombre">{{ montant(b.totalPrimes) }}</td>
            <td class="nombre">{{ montant(b.totalRetenues) }}</td>
            <td class="nombre"><strong>{{ montant(b.netAPayer) }}</strong></td>
            <td>
              <span class="badge" :class="STATUTS_BULLETIN[b.statut].badge">{{ STATUTS_BULLETIN[b.statut].libelle }}</span>
              <div v-if="b.datePaiement" class="detail">le {{ date(b.datePaiement) }}</div>
            </td>
            <td class="actions">
              <button class="bouton-lien" @click="ouvert = b">Ouvrir</button>
              <button v-si-imprimer="'paie'" class="bouton-lien" @click="imprimerBulletin(b)">PDF</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!personneChoisie" class="tableau-vide">Choisissez un membre du personnel.</p>
      <p v-else-if="!chargement && bulletins.length === 0" class="tableau-vide">Aucun bulletin en {{ annee }}.</p>
    </div>

    <FenetreBulletin v-if="ouvert" :key="ouvert.id + ouvert.statut" :bulletin="ouvert" @fermer="ouvert = null" @modifie="apresModification" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import FenetreBulletin from './FenetreBulletin.vue'
import { date, montant } from '@/utils/format'
import { imprimerBulletin } from '@/utils/bulletinPdf'
import { STATUTS_BULLETIN, libelleMois, listerBulletins, listerSalaires } from '@/api/paie'

const store = useStore()
const personnel = ref([])
const personnelId = ref(null)
const annee = ref(new Date().getFullYear())
const bulletins = ref([])
const chargement = ref(false)
const ouvert = ref(null)

const personneChoisie = computed(() => personnel.value.find((p) => p.id === personnelId.value))
const somme = (champ) => bulletins.value.reduce((s, b) => s + Number(b[champ]), 0)

onMounted(async () => {
  try {
    personnel.value = await listerSalaires()
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
})

async function charger() {
  if (!personnelId.value) return (bulletins.value = [])
  chargement.value = true
  try {
    bulletins.value = (await listerBulletins({ personnelId: personnelId.value, annee: annee.value })).sort((a, b) =>
      a.mois.localeCompare(b.mois),
    )
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}

function apresModification(b) {
  ouvert.value = b
  const i = bulletins.value.findIndex((x) => x.id === b.id)
  if (i >= 0) bulletins.value[i] = b
}

const total = (champ) => (b) => Number(b[champ])
const COLONNES_PDF = [
  { titre: 'Mois', valeur: (b) => libelleMois(b.mois) },
  { titre: 'N°', valeur: (b) => b.numero },
  { titre: 'Base', valeur: (b) => montant(b.salaireBase), droite: true, somme: total('salaireBase'), formatTotal: montant },
  { titre: 'Primes', valeur: (b) => montant(b.totalPrimes), droite: true, somme: total('totalPrimes'), formatTotal: montant },
  { titre: 'Retenues', valeur: (b) => montant(b.totalRetenues), droite: true, somme: total('totalRetenues'), formatTotal: montant },
  { titre: 'Net', valeur: (b) => montant(b.netAPayer), droite: true, somme: total('netAPayer'), formatTotal: montant },
  { titre: 'Statut', valeur: (b) => STATUTS_BULLETIN[b.statut].libelle + (b.datePaiement ? ` (${date(b.datePaiement)})` : '') },
]
</script>

<style scoped>
.onglet-contenu { display: flex; flex-direction: column; gap: 1rem; }
.champ-annee { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; color: var(--muted); }
.champ-annee input { width: 90px; }
.totaux {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.2rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: var(--fond-pale);
  font-size: 0.9rem;
}
.totaux .net { margin-left: auto; color: var(--primary-dark); }
.detail { font-size: 0.75rem; color: var(--muted); }
</style>
