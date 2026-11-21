<!--
  =============================================================================
  ONGLET « PÉREMPTIONS » du module Lots, péremptions et retraits (§ 11)
  =============================================================================
  Lots encore en stock qui périment dans les N prochains jours (par défaut le
  délai d'alerte des Paramètres généraux), lots périmés compris, triés par date.
  Liste imprimable (produit, lot, date, quantité, valeur).
  « Retirer » ouvre la fenêtre de retrait sur ce lot (motif PÉRIMÉ proposé si
  le lot est périmé) ; « Retirer les périmés » retire tous les lots périmés.
  =============================================================================
-->
<template>
  <div class="onglet-contenu">
    <div class="cartes">
      <div class="carte rouge">
        <small>Lots périmés en stock</small>
        <strong>{{ perimes.length }}</strong>
        <span v-if="voitValeur">{{ montant(somme(perimes)) }}</span>
      </div>
      <div class="carte orange">
        <small>Périment dans {{ delai }} jours</small>
        <strong>{{ proches.length }}</strong>
        <span v-if="voitValeur">{{ montant(somme(proches)) }}</span>
      </div>
    </div>

    <div>
      <div class="barre-outils">
        <input v-model="recherche" class="recherche" type="search" placeholder="Médicament ou n° de lot…" />
        <label class="champ-date">
          Périment dans
          <input v-model="jours" type="number" min="0" max="3650" step="1" class="jours" @change="charger" />
          jours
        </label>
        <label class="case-a-cocher"><input v-model="perimesSeulement" type="checkbox" /> Périmés seulement</label>
        <span class="espace"></span>
        <ImportExportTableau titre="Lots proches de la péremption" :sous-titre="sousTitre" nom-fichier="peremptions" :colonnes-pdf="COLONNES_PDF" :lignes="lignesTriees" />
        <button v-si-modif="'retraits'" class="bouton-secondaire" :disabled="!perimes.length" @click="retirerPerimes">Retirer les périmés</button>
      </div>

      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-model="tri" cle="produit">Médicament</ColonneTri>
              <ColonneTri v-model="tri" cle="lot">N° de lot</ColonneTri>
              <ColonneTri v-model="tri" cle="fournisseur">Fournisseur</ColonneTri>
              <ColonneTri v-model="tri" cle="date">Péremption</ColonneTri>
              <ColonneTri v-model="tri" cle="jours" class="nombre">Délai</ColonneTri>
              <ColonneTri v-model="tri" cle="quantite" class="nombre">Quantité</ColonneTri>
              <ColonneTri v-if="voitValeur" v-model="tri" cle="valeur" class="nombre">Valeur</ColonneTri>
              <th class="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in lignesPage" :key="l.id">
              <td>
                <strong>{{ l.produit.designation }}</strong>
                <div class="detail code">{{ l.produit.code }}</div>
              </td>
              <td class="code">{{ l.numeroLot }}</td>
              <td>{{ l.fournisseur?.nom || '—' }}</td>
              <td>{{ date(l.datePeremption) }}</td>
              <td class="nombre">
                <span class="badge" :class="l.perime ? 'badge-rouge' : l.joursRestants <= 7 ? 'badge-orange' : 'badge-bleu'">
                  {{ l.perime ? `Périmé (${-l.joursRestants} j)` : `${l.joursRestants} j` }}
                </span>
              </td>
              <td class="nombre">{{ quantite(l.quantiteRestante, l.produit.plaquesParBoite) }}</td>
              <td v-if="voitValeur" class="nombre">{{ montant(l.valeur) }}</td>
              <td class="actions">
                <router-link class="bouton-lien" :to="{ name: 'produit', params: { id: l.produit.id } }">Fiche</router-link>
                <button v-si-modif="'retraits'" class="bouton-lien danger" @click="lotARetirer = l">Retirer</button>
              </td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model:page="page" v-model:taille="taille" :total="lotsAffiches.length" />
        <p v-if="!chargement && lotsAffiches.length === 0" class="tableau-vide">Aucun lot ne périme dans ce délai.</p>
        <p v-if="chargement" class="tableau-vide">Chargement…</p>
      </div>
    </div>

    <FenetreRetrait
      v-if="lotARetirer"
      :lot="lotARetirer"
      :motif="lotARetirer.perime ? 'PÉRIMÉ' : ''"
      @fermer="lotARetirer = null"
      @enregistre="apresRetrait"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import FenetreRetrait from '@/components/FenetreRetrait.vue'
import { utiliserTableau } from '@/utils/pagination'
import { utiliserActualisation } from '@/utils/actualisation'
import { confirmer } from '@/utils/alertes'
import { date, montant, quantite } from '@/utils/format'

const store = useStore()

const jours = ref('')
const recherche = ref('')
const perimesSeulement = ref(false)
const chargement = ref(false)
const lotARetirer = ref(null)

const donnees = computed(() => store.state.sorties.peremptions)
const delai = computed(() => donnees.value.delai)
const lots = computed(() => donnees.value.lots)
const perimes = computed(() => lots.value.filter((l) => l.perime))
const proches = computed(() => lots.value.filter((l) => !l.perime))
const voitValeur = computed(() => store.getters['auth/voitPrixAchat'])
const somme = (liste) => liste.reduce((s, l) => s + Number(l.valeur ?? 0), 0)

const lotsAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return lots.value.filter((l) => {
    if (perimesSeulement.value && !l.perime) return false
    if (!texte) return true
    return [l.produit.designation, l.produit.code, l.numeroLot].some((v) => (v || '').toLowerCase().includes(texte))
  })
})
const sousTitre = computed(() => (perimesSeulement.value ? 'Lots périmés' : `Lots qui périment dans ${delai.value} jours (périmés compris)`))

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('sorties/chargerPeremptions', jours.value === '' ? undefined : Number(jours.value))
    jours.value = delai.value
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}

async function apresRetrait() {
  lotARetirer.value = null
  await charger()
  store.dispatch('alertes/chargerDetail').catch(() => {})
}

async function retirerPerimes() {
  const ok = await confirmer({
    titre: `Retirer les ${perimes.value.length} lot(s) périmé(s) ?`,
    texte: 'Chaque lot périmé encore en stock est retiré entièrement, avec le motif « PÉRIMÉ ».',
    boutonConfirmer: 'Oui, retirer',
    danger: true,
  })
  if (!ok) return
  try {
    const r = await store.dispatch('sorties/retirerPerimes')
    store.dispatch('notifications/succes', `${r.lots} lot(s) périmé(s) retiré(s) — valeur ${montant(r.valeur)}.`)
    await charger()
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
}

const COLONNES_PDF = [
  { titre: 'Médicament', valeur: (l) => l.produit.designation },
  { titre: 'N° de lot', valeur: (l) => l.numeroLot },
  { titre: 'Fournisseur', valeur: (l) => l.fournisseur?.nom },
  { titre: 'Péremption', valeur: (l) => date(l.datePeremption) },
  { titre: 'Délai', valeur: (l) => (l.perime ? 'Périmé' : `${l.joursRestants} j`), droite: true },
  { titre: 'Quantité', valeur: (l) => quantite(l.quantiteRestante, l.produit.plaquesParBoite), droite: true },
  { titre: 'Valeur', valeur: (l) => montant(l.valeur), droite: true, somme: (l) => Number(l.valeur ?? 0), formatTotal: montant },
]

const VALEURS_TRI = {
  produit: (l) => l.produit.designation,
  lot: (l) => l.numeroLot,
  fournisseur: (l) => l.fournisseur?.nom,
  date: (l) => l.datePeremption,
  jours: (l) => l.joursRestants,
  quantite: (l) => l.quantiteRestante,
  valeur: (l) => Number(l.valeur ?? 0),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(lotsAffiches, [recherche, perimesSeulement], VALEURS_TRI)

onMounted(charger)
utiliserActualisation(charger)
</script>

<style scoped>
.onglet-contenu {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.carte {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: #fff;
  border-left: 5px solid;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
}
.carte small {
  color: var(--muted);
}
.carte strong {
  font-size: 1.8rem;
  line-height: 1.1;
}
.carte.rouge {
  border-color: var(--danger);
}
.carte.rouge strong {
  color: var(--danger);
}
.carte.orange {
  border-color: #f57c00;
}
.carte.orange strong {
  color: #e65100;
}
.champ-date {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--muted);
}
.jours {
  width: 80px;
}
.detail {
  font-size: 0.78rem;
  color: var(--muted);
}
</style>
