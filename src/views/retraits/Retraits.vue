<!--
  =============================================================================
  MODULE — RETRAITS DE LOTS (§ 10.2)
  =============================================================================
  Rapport des retraits (période, motif) avec valeur au prix d'achat, export PDF.
  « Nouveau retrait » : lot, quantité, motif obligatoire (précision pour AUTRE).
  « Retirer les périmés » : retire tout de suite les lots périmés (sinon fait
  automatiquement chaque nuit à l'heure réglée dans les Paramètres généraux).
  =============================================================================
-->
<template>
  <div class="page">
    <EnteteModule
      icone="corbeille"
      titre="Retraits de lots"
      description="Retour fournisseur, périmé, casse, perte : chaque retrait diminue le stock du lot et reste tracé avec son motif."
    />

    <section class="bloc">
      <div class="barre-outils">
        <label class="champ-date">Du <ChampDate v-model="filtres.du" @change="charger" /></label>
        <label class="champ-date">Au <ChampDate v-model="filtres.au" @change="charger" /></label>
        <div class="filtre">
          <ListeDeroulante v-model="filtres.motif" :options="motifs" placeholder="Tous les motifs" @update:model-value="charger" />
        </div>
        <span class="espace"></span>
        <ImportExportTableau titre="Rapport des retraits" :sous-titre="sousTitre" nom-fichier="retraits" :colonnes-pdf="COLONNES_PDF" :lignes="lignesTriees" />
        <button v-si-modif class="bouton-secondaire" @click="retirerPerimes">Retirer les périmés</button>
        <button v-si-modif @click="fenetre = true">+ Nouveau retrait</button>
      </div>

      <div class="totaux">
        <span class="total">{{ retraits.length }} retrait(s)</span>
        <span v-if="voitValeur" class="total">Valeur retirée : <strong>{{ montant(totalValeur) }}</strong></span>
        <span v-for="(n, motif) in parMotif" :key="motif" class="total gris">{{ motif }} : {{ n }}</span>
      </div>

      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-model="tri" cle="numero">N°</ColonneTri>
              <ColonneTri v-model="tri" cle="date">Date</ColonneTri>
              <ColonneTri v-model="tri" cle="produit">Médicament</ColonneTri>
              <ColonneTri v-model="tri" cle="lot">Lot</ColonneTri>
              <ColonneTri v-model="tri" cle="quantite" class="nombre">Quantité</ColonneTri>
              <ColonneTri v-if="voitValeur" v-model="tri" cle="valeur" class="nombre">Valeur</ColonneTri>
              <ColonneTri v-model="tri" cle="motif">Motif</ColonneTri>
              <ColonneTri v-model="tri" cle="agent">Agent</ColonneTri>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in lignesPage" :key="r.id">
              <td class="code">{{ r.numero }}</td>
              <td>{{ dateHeure(r.date) }}</td>
              <td><strong>{{ r.produit.designation }}</strong></td>
              <td>
                <span class="code">{{ r.lot.numeroLot }}</span>
                <div class="detail">Péremption {{ date(r.lot.datePeremption) }}</div>
              </td>
              <td class="nombre">{{ quantite(r.quantite, r.produit.plaquesParBoite) }}</td>
              <td v-if="voitValeur" class="nombre">{{ montant(r.valeur) }}</td>
              <td>
                <span class="badge" :class="r.motif === 'PÉRIMÉ' ? 'badge-rouge' : 'badge-orange'">{{ r.motif }}</span>
                <span v-if="r.automatique" class="badge badge-gris auto" title="Retrait automatique de nuit">Auto</span>
                <div v-if="r.precision" class="detail">{{ r.precision }}</div>
              </td>
              <td>{{ r.utilisateur.nom }}</td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model:page="page" v-model:taille="taille" :total="retraits.length" />
        <p v-if="!chargement && retraits.length === 0" class="tableau-vide">Aucun retrait sur la période.</p>
        <p v-if="chargement" class="tableau-vide">Chargement…</p>
      </div>
    </section>

    <FenetreRetrait v-if="fenetre" @fermer="fenetre = false" @enregistre="apresRetrait" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import EnteteModule from '@/components/EnteteModule.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import FenetreRetrait from '@/components/FenetreRetrait.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { PRIX_ACHAT } from '@/utils/roles'
import { aujourdhui, date, dateHeure, montant, quantite } from '@/utils/format'

const store = useStore()

const filtres = ref({ du: aujourdhui().slice(0, 8) + '01', au: aujourdhui(), motif: null })
const chargement = ref(false)
const fenetre = ref(false)

const retraits = computed(() => store.state.sorties.retraits)
const motifs = computed(() => store.state.sorties.motifs)
const voitValeur = computed(() => store.getters['auth/peut'](PRIX_ACHAT))
const totalValeur = computed(() => retraits.value.reduce((s, r) => s + Number(r.valeur), 0))
const parMotif = computed(() => {
  const n = {}
  for (const r of retraits.value) n[r.motif] = (n[r.motif] ?? 0) + 1
  return n
})
const sousTitre = computed(() =>
  [`Du ${date(filtres.value.du)} au ${date(filtres.value.au)}`, filtres.value.motif && `Motif : ${filtres.value.motif}`].filter(Boolean).join(' — '),
)

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('sorties/chargerRetraits', filtres.value)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}

async function apresRetrait() {
  fenetre.value = false
  await charger()
}

async function retirerPerimes() {
  const ok = await confirmer({
    titre: 'Retirer tous les lots périmés ?',
    texte: 'Chaque lot périmé encore en stock est retiré entièrement, avec le motif « PÉRIMÉ ».',
    boutonConfirmer: 'Oui, retirer',
    danger: true,
  })
  if (!ok) return
  try {
    const r = await store.dispatch('sorties/retirerPerimes')
    store.dispatch(
      'notifications/succes',
      r.lots ? `${r.lots} lot(s) périmé(s) retiré(s) — valeur ${montant(r.valeur)}.` : 'Aucun lot périmé en stock.',
    )
    await charger()
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
}

const COLONNES_PDF = [
  { titre: 'N°', valeur: (r) => r.numero },
  { titre: 'Date', valeur: (r) => dateHeure(r.date) },
  { titre: 'Médicament', valeur: (r) => r.produit.designation },
  { titre: 'Lot', valeur: (r) => r.lot.numeroLot },
  { titre: 'Péremption', valeur: (r) => date(r.lot.datePeremption) },
  { titre: 'Quantité', valeur: (r) => quantite(r.quantite, r.produit.plaquesParBoite), droite: true },
  { titre: 'Valeur', valeur: (r) => montant(r.valeur), droite: true, somme: (r) => Number(r.valeur), formatTotal: montant },
  { titre: 'Motif', valeur: (r) => (r.precision ? `${r.motif} : ${r.precision}` : r.motif) },
  { titre: 'Agent', valeur: (r) => r.utilisateur.nom },
]

const VALEURS_TRI = {
  numero: (r) => r.numero,
  date: (r) => r.date,
  produit: (r) => r.produit.designation,
  lot: (r) => r.lot.numeroLot,
  quantite: (r) => r.quantite,
  valeur: (r) => Number(r.valeur),
  motif: (r) => r.motif,
  agent: (r) => r.utilisateur.nom,
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(retraits, [filtres], VALEURS_TRI)

onMounted(() => {
  charger()
  store.dispatch('sorties/chargerMotifs').catch(() => {})
})
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
.total.gris {
  background: #eef0f2;
  color: var(--muted);
}
.detail {
  font-size: 0.78rem;
  color: var(--muted);
}
.auto {
  margin-left: 0.3rem;
}
</style>
