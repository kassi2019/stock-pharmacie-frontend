<!--
  =============================================================================
  ONGLET « MOUVEMENTS » du module Inventaires et mouvements (traçabilité, § 14)
  =============================================================================
  Toutes les entrées, sorties, retraits, annulations et correctifs, filtrables
  par période, médicament, type et agent. Chaque ligne garde l'auteur, la date,
  le lot, la quantité avant / après et le document d'origine (lien).
  =============================================================================
-->
<template>
  <div class="onglet-contenu">
    <div>
      <div class="barre-outils">
        <label class="champ-date">Du <ChampDate v-model="filtres.du" @change="charger" /></label>
        <label class="champ-date">Au <ChampDate v-model="filtres.au" @change="charger" /></label>
        <div class="filtre large">
          <ListeDeroulante
            v-model="filtres.produitId"
            :options="medicaments"
            :champ-libelle="(m) => `${m.code} — ${m.designation}`"
            placeholder="Tous les médicaments"
            @update:model-value="charger"
          />
        </div>
        <div class="filtre">
          <ListeDeroulante v-model="filtres.type" :options="TYPES_LISTE" placeholder="Tous les types" @update:model-value="charger" />
        </div>
        <div class="filtre">
          <ListeDeroulante v-model="agent" :options="agents" placeholder="Tous les agents" />
        </div>
        <span class="espace"></span>
        <ImportExportTableau titre="Mouvements de stock" :sous-titre="sousTitre" nom-fichier="mouvements" :colonnes-pdf="COLONNES_PDF" :lignes="lignesTriees" />
      </div>

      <div class="totaux">
        <span class="total">{{ mouvementsAffiches.length }} mouvement(s)</span>
        <span v-for="(n, type) in parType" :key="type" class="badge" :class="TYPES[type]?.classe">{{ TYPES[type]?.libelle ?? type }} : {{ n }}</span>
      </div>

      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-model="tri" cle="date">Date</ColonneTri>
              <ColonneTri v-model="tri" cle="type">Type</ColonneTri>
              <ColonneTri v-model="tri" cle="produit">Médicament</ColonneTri>
              <ColonneTri v-model="tri" cle="lot">Lot</ColonneTri>
              <ColonneTri v-model="tri" cle="quantite" class="nombre">Quantité</ColonneTri>
              <th class="nombre">Avant → après</th>
              <ColonneTri v-model="tri" cle="valeur" class="nombre">Valeur</ColonneTri>
              <ColonneTri v-model="tri" cle="document">Document</ColonneTri>
              <ColonneTri v-model="tri" cle="agent">Agent</ColonneTri>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in lignesPage" :key="m.id">
              <td>{{ dateHeure(m.date) }}</td>
              <td><span class="badge" :class="TYPES[m.type]?.classe">{{ TYPES[m.type]?.libelle ?? m.type }}</span></td>
              <td><strong>{{ m.produit.designation }}</strong></td>
              <td class="code">{{ m.lot.numeroLot }}</td>
              <td class="nombre" :class="m.quantite < 0 ? 'negatif' : 'positif'">{{ m.quantite > 0 ? '+' : '' }}{{ m.quantite }}</td>
              <td class="nombre">{{ m.quantiteAvant }} → {{ m.quantiteApres }}</td>
              <td class="nombre">{{ montant(m.valeur) }}</td>
              <td>
                <router-link v-if="lienDocument(m)" :to="lienDocument(m)" class="code">{{ m.documentNumero }}</router-link>
                <span v-else class="code">{{ m.documentNumero || '—' }}</span>
                <div class="detail" :title="m.motif">{{ m.motif }}</div>
              </td>
              <td>{{ m.utilisateur.nom }}</td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model:page="page" v-model:taille="taille" :total="mouvementsAffiches.length" />
        <p v-if="!chargement && mouvementsAffiches.length === 0" class="tableau-vide">Aucun mouvement pour ces critères.</p>
        <p v-if="chargement" class="tableau-vide">Chargement…</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import { utiliserTableau } from '@/utils/pagination'
import { aujourdhui, date, dateHeure, montant } from '@/utils/format'

const store = useStore()

/** Types de mouvement (§ 14) et couleur du badge. */
const TYPES = {
  ENTREE: { libelle: 'Entrée', classe: 'badge-vert' },
  SORTIE: { libelle: 'Sortie', classe: 'badge-bleu' },
  RETRAIT: { libelle: 'Retrait', classe: 'badge-rouge' },
  ANNULATION: { libelle: 'Annulation', classe: 'badge-orange' },
  CORRECTIF: { libelle: 'Correctif', classe: 'badge-gris' },
}
const TYPES_LISTE = Object.entries(TYPES).map(([id, t]) => ({ id, libelle: t.libelle }))

// Par défaut : les 30 derniers jours
const ilYa30Jours = new Date(Date.now() - 30 * 86_400_000).toLocaleDateString('fr-CA')
const filtres = ref({ du: ilYa30Jours, au: aujourdhui(), produitId: null, type: null })
const agent = ref(null)
const chargement = ref(false)

const mouvements = computed(() => store.state.sorties.mouvements)
const medicaments = computed(() => store.state.referentiel.medicaments)
/** Agents présents dans les mouvements chargés. */
const agents = computed(() => {
  const vus = new Map()
  for (const m of mouvements.value) vus.set(m.utilisateur.id, { id: m.utilisateur.id, libelle: m.utilisateur.nom })
  return [...vus.values()]
})
const mouvementsAffiches = computed(() => mouvements.value.filter((m) => !agent.value || m.utilisateur.id === agent.value))
const parType = computed(() => {
  const n = {}
  for (const m of mouvementsAffiches.value) n[m.type] = (n[m.type] ?? 0) + 1
  return n
})
const sousTitre = computed(() => {
  const produit = medicaments.value.find((m) => m.id === filtres.value.produitId)
  return [
    `Du ${date(filtres.value.du)} au ${date(filtres.value.au)}`,
    produit && produit.designation,
    filtres.value.type && TYPES[filtres.value.type]?.libelle,
    agent.value && agents.value.find((a) => a.id === agent.value)?.libelle,
  ]
    .filter(Boolean)
    .join(' — ')
})

/** Lien vers le document d'origine (réception, dispensation ou inventaire). */
function lienDocument(m) {
  if (m.documentType === 'RECEPTION' && m.documentId) return { name: 'reception', params: { id: m.documentId } }
  if (m.documentType === 'ORDONNANCE' && m.documentId) return { name: 'dispensation-fiche', params: { id: m.documentId } }
  if (m.documentType === 'INVENTAIRE' && m.documentId) return { name: 'inventaire', params: { id: m.documentId } }
  return null
}

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('sorties/chargerMouvements', filtres.value)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}

const COLONNES_PDF = [
  { titre: 'Date', valeur: (m) => dateHeure(m.date) },
  { titre: 'Type', valeur: (m) => TYPES[m.type]?.libelle ?? m.type },
  { titre: 'Médicament', valeur: (m) => m.produit.designation },
  { titre: 'Lot', valeur: (m) => m.lot.numeroLot },
  { titre: 'Quantité', valeur: (m) => (m.quantite > 0 ? `+${m.quantite}` : m.quantite), droite: true },
  { titre: 'Avant → après', valeur: (m) => `${m.quantiteAvant} → ${m.quantiteApres}`, droite: true },
  { titre: 'Valeur', valeur: (m) => montant(m.valeur), droite: true },
  { titre: 'Document', valeur: (m) => m.documentNumero ?? m.motif },
  { titre: 'Agent', valeur: (m) => m.utilisateur.nom },
]

const VALEURS_TRI = {
  date: (m) => m.date,
  type: (m) => TYPES[m.type]?.libelle,
  produit: (m) => m.produit.designation,
  lot: (m) => m.lot.numeroLot,
  quantite: (m) => m.quantite,
  valeur: (m) => m.valeur,
  document: (m) => m.documentNumero,
  agent: (m) => m.utilisateur.nom,
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(mouvementsAffiches, [filtres, agent], VALEURS_TRI)

onMounted(() => {
  charger()
  store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch(() => {})
})
</script>

<style scoped>
.onglet-contenu {
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
.filtre.large {
  min-width: 280px;
}
.totaux {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
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
.detail {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  color: var(--muted);
}
.negatif {
  color: var(--danger);
  font-weight: 700;
}
.positif {
  color: #2e7d32;
  font-weight: 700;
}
</style>
