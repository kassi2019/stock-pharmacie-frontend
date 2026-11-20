<!--
  =============================================================================
  FICHE D'UNE DISPENSATION (§ 10.1)
  =============================================================================
  En-tête (patient, n° de passage, agent, statut), médicaments délivrés et
  LOTS RÉELLEMENT SORTIS (traçabilité FEFO, quantité avant / après).
  « Annuler » (responsable) : motif obligatoire ; remet chaque quantité dans
  son lot d'origine (mouvement inverse).
  =============================================================================
-->
<template>
  <div v-if="d" class="page">
    <EnteteModule icone="sortie" :titre="`Dispensation ${d.numero}`" :description="[d.patient, dateHeure(d.date)].filter(Boolean).join(' — ')">
      <template #actions>
        <button v-si-imprimer class="bouton-secondaire" :disabled="impression" @click="imprimer">Fiche de dispensation PDF</button>
      </template>
    </EnteteModule>

    <div v-if="d.statut === 'ANNULEE'" class="bandeau-annule">
      <strong>Dispensation annulée</strong> le {{ dateHeure(d.dateAnnulation) }} par {{ d.annulePar?.nom }} — motif : {{ d.motifAnnulation }}.
      Les quantités ont été remises dans leurs lots d'origine.
    </div>

    <section class="bloc">
      <div class="infos">
        <!-- Patient : seulement pour les anciennes dispensations (le formulaire ne le demande plus) -->
        <template v-if="d.patient">
          <span><small>Patient</small><strong>{{ d.patient }}</strong></span>
          <span><small>N° de passage</small><strong>{{ d.numeroPassage || '—' }}</strong></span>
          <span><small>Prescripteur</small><strong>{{ d.prescripteur || '—' }}</strong></span>
        </template>
        <span><small>Date</small><strong>{{ dateHeure(d.date) }}</strong></span>
        <span><small>Agent</small><strong>{{ d.utilisateur.nom }}</strong></span>
        <span>
          <small>Statut</small>
          <span class="badge" :class="d.statut === 'ANNULEE' ? 'badge-rouge' : 'badge-vert'">{{ d.statut === 'ANNULEE' ? 'Annulée' : 'Validée' }}</span>
        </span>
        <span class="espace"></span>
        <button v-if="d.statut !== 'ANNULEE' && peutAnnuler" class="bouton-danger" @click="annuler">Annuler la dispensation</button>
      </div>

      <h4 class="section">Médicaments délivrés</h4>
      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <th>Code</th>
              <th>Médicament</th>
              <th class="nombre">Quantité</th>
              <th class="nombre">Prix unitaire</th>
              <th class="nombre">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in d.lignes" :key="l.id">
              <td class="code">{{ l.produit.code }}</td>
              <td>
                <strong>{{ l.produit.designation }}</strong>
                <span v-if="l.produit.consommable" class="badge badge-orange consommable">Consommable</span>
              </td>
              <td class="nombre">{{ l.quantite }} {{ unite(l).toLowerCase() }}</td>
              <td class="nombre">{{ montant(l.prixUnitaire) }}</td>
              <td class="nombre"><strong>{{ montant(l.montant) }}</strong></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="nombre">Total</td>
              <td class="nombre total-general">{{ montant(d.montantTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h4 class="section">Lots sortis (FEFO)</h4>
      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mouvement</th>
              <th>N° de lot</th>
              <th>Péremption</th>
              <th class="nombre">Quantité</th>
              <th class="nombre">Lot avant → après</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in d.mouvements" :key="m.id">
              <td>{{ dateHeure(m.date) }}</td>
              <td>
                <span class="badge" :class="m.type === 'ANNULATION' ? 'badge-orange' : 'badge-bleu'">
                  {{ m.type === 'ANNULATION' ? 'Annulation' : 'Sortie' }}
                </span>
              </td>
              <td class="code">{{ m.lot.numeroLot }}</td>
              <td>{{ date(m.lot.datePeremption) }}</td>
              <td class="nombre" :class="m.quantite < 0 ? 'negatif' : 'positif'">{{ m.quantite > 0 ? '+' : '' }}{{ m.quantite }}</td>
              <td class="nombre">{{ m.quantiteAvant }} → {{ m.quantiteApres }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pied">
        <button class="bouton-secondaire" @click="router.push({ name: 'dispensation' })">← Retour à la liste</button>
        <button v-si-modif @click="router.push({ name: 'dispensation-nouvelle' })">+ Nouvelle dispensation</button>
      </div>
    </section>
  </div>
  <p v-else class="tableau-vide">Chargement…</p>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import EnteteModule from '@/components/EnteteModule.vue'
import { GESTION_STOCK } from '@/utils/roles'
import { confirmer, demanderTexte } from '@/utils/alertes'
import { date, dateHeure, montant } from '@/utils/format'
import { ficheDispensationPdf, uniteLigne as unite } from './dispensationCommun'

const props = defineProps({ id: { type: [String, Number], required: true } })
const store = useStore()
const router = useRouter()

const d = ref(null)
const peutAnnuler = computed(() => store.getters['auth/peut'](GESTION_STOCK))
const impression = ref(false)

/** Fiche de dispensation en PDF (même présentation que les documents du district). */
async function imprimer() {
  impression.value = true
  try {
    await ficheDispensationPdf(d.value)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    impression.value = false
  }
}

async function charger() {
  try {
    d.value = await store.dispatch('sorties/dispensation', props.id)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
}

async function annuler() {
  const ok = await confirmer({
    titre: `Annuler la dispensation ${d.value.numero} ?`,
    texte: 'Les quantités seront remises dans leurs lots d’origine. Cette annulation est définitive.',
    boutonConfirmer: 'Continuer',
    danger: true,
  })
  if (!ok) return
  const motif = await demanderTexte({ titre: 'Motif de l’annulation', libelle: 'Motif (obligatoire)', boutonConfirmer: 'Annuler la dispensation' })
  if (!motif) return
  try {
    d.value = await store.dispatch('sorties/annulerDispensation', { id: d.value.id, motif })
    store.dispatch('notifications/succes', 'Dispensation annulée : stock remis dans les lots.')
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
}

onMounted(charger)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.bandeau-annule {
  padding: 0.85rem 1.1rem;
  border-radius: 12px;
  background: #fdecec;
  color: var(--danger);
}
.infos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 2.25rem;
  margin-bottom: 0.5rem;
}
.infos > span:not(.espace) {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.infos small {
  font-size: 0.75rem;
  color: var(--muted);
}
.espace {
  flex: 1;
}
.section {
  margin: 1.5rem 0 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
}
.consommable {
  margin-left: 0.4rem;
}
.total-general {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--primary-dark);
}
.negatif {
  color: var(--danger);
  font-weight: 700;
}
.positif {
  color: #2e7d32;
  font-weight: 700;
}
.pied {
  display: flex;
  justify-content: space-between;
  margin-top: 1.25rem;
}
</style>
