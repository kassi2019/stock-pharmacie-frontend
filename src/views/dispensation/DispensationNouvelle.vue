<!--
  =============================================================================
  NOUVELLE DISPENSATION (§ 10.1)
  =============================================================================
  Patient, n° de passage, prescripteur, puis une ligne par médicament :
  unité (boîte / plaque si le produit se vend au détail), quantité, prix.
  Chaque ligne montre le stock disponible et l'état de couleur (§ 13.3) ;
  une quantité supérieure au stock est signalée et refusée par le serveur.
  À la validation, le serveur sort le stock en FEFO (lot le plus proche de la
  péremption d'abord, jamais un lot périmé) puis ouvre la fiche de la dispensation.
  =============================================================================
-->
<template>
  <div class="page">
    <EnteteModule icone="sortie" titre="Nouvelle dispensation" description="Sortie de stock en FEFO : premier périmé, premier sorti." />

    <form class="bloc" @submit.prevent="valider">
      <h4 class="section">Patient</h4>
      <div class="grille-formulaire trois-colonnes">
        <div>
          <label class="obligatoire">Patient</label>
          <input v-model.trim="f.patient" class="maj" required maxlength="150" placeholder="Nom et prénoms" />
        </div>
        <div>
          <label>N° de passage</label>
          <input v-model.trim="f.numeroPassage" class="maj" maxlength="50" placeholder="ex. P-2026-0012" />
        </div>
        <div>
          <label>Prescripteur</label>
          <input v-model.trim="f.prescripteur" class="maj" maxlength="150" placeholder="Médecin, sage-femme…" />
        </div>
      </div>

      <h4 class="section">Médicaments</h4>
      <div class="tableau-conteneur">
        <table class="tableau lignes">
          <thead>
            <tr>
              <th class="col-produit">Médicament</th>
              <th>Disponible</th>
              <th class="col-unite">Unité</th>
              <th class="col-quantite">Quantité</th>
              <th class="nombre">Prix unitaire</th>
              <th class="nombre">Montant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in f.lignes" :key="l.cle">
              <td>
                <ListeDeroulante
                  v-model="l.produitId"
                  :options="medicaments"
                  :champ-libelle="(m) => `${m.code} — ${m.designation}`"
                  placeholder="Tapez le code ou le nom…"
                  @update:model-value="choisirProduit(l)"
                />
              </td>
              <td>
                <template v-if="produit(l)">
                  <EtatBadge :etat="produit(l).etatStock" />
                  <div class="detail">{{ quantite(produit(l).stockDisponible ?? 0, produit(l).plaquesParBoite) }}</div>
                </template>
              </td>
              <td>
                <ListeDeroulante
                  v-if="produit(l) && unites(produit(l)).length > 1"
                  v-model="l.unite"
                  :options="unites(produit(l))"
                  :effacable="false"
                />
                <span v-else-if="produit(l)">{{ unites(produit(l))[0]?.libelle }}</span>
              </td>
              <td>
                <input v-model="l.quantite" type="number" min="1" step="1" required :class="{ 'trop': depasse(l) }" />
                <div v-if="depasse(l)" class="erreur-ligne">Stock insuffisant</div>
              </td>
              <td class="nombre">{{ produit(l) ? montant(prix(l)) : '' }}</td>
              <td class="nombre"><strong>{{ produit(l) ? montant(prix(l) * (Number(l.quantite) || 0)) : '' }}</strong></td>
              <td class="actions">
                <button type="button" class="bouton-lien danger" :disabled="f.lignes.length === 1" title="Retirer la ligne" @click="f.lignes.splice(i, 1)">
                  Retirer
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5">
                <button type="button" class="bouton-secondaire" @click="ajouterLigne">+ Ajouter un médicament</button>
              </td>
              <td class="nombre total-general">{{ montant(total) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="pied">
        <button type="button" class="bouton-secondaire" @click="router.push({ name: 'dispensation' })">Annuler</button>
        <button type="submit" :disabled="enregistrement || !valide">
          {{ enregistrement ? 'Enregistrement…' : 'Valider la dispensation' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import EnteteModule from '@/components/EnteteModule.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import EtatBadge from '@/components/EtatBadge.vue'
import { montant, quantite } from '@/utils/format'
import { utiliserActualisation } from '@/utils/actualisation'

const store = useStore()
const router = useRouter()

let compteur = 0
const nouvelleLigne = () => ({ cle: ++compteur, produitId: null, unite: 'BOITE', quantite: 1 })
const f = ref({ patient: '', numeroPassage: '', prescripteur: '', lignes: [nouvelleLigne()] })
const enregistrement = ref(false)

/** Médicaments actifs (le stock et l'état sont affichés sur chaque ligne). */
const medicaments = computed(() => store.state.referentiel.medicaments.filter((m) => m.actif))
const produit = (l) => medicaments.value.find((m) => m.id === l.produitId) ?? null

/** Unités vendables du produit : unité de vente (boîte, flacon…) et/ou plaque. */
function unites(p) {
  return [
    p.venteBoite && { id: 'BOITE', libelle: p.uniteVente?.libelle ?? 'BOÎTE' },
    p.ventePlaque && { id: 'PLAQUE', libelle: 'PLAQUE' },
  ].filter(Boolean)
}
function choisirProduit(l) {
  const p = produit(l)
  if (p) l.unite = unites(p)[0]?.id ?? 'BOITE'
}
const prix = (l) => {
  const p = produit(l)
  if (!p || p.consommable) return 0
  return Number(l.unite === 'PLAQUE' ? p.prixVentePlaque : p.prixVenteBoite)
}
/** Plaques demandées pour un produit, toutes lignes confondues. */
const plaquesDemandees = (produitId) =>
  f.value.lignes
    .filter((l) => l.produitId === produitId)
    .reduce((s, l) => s + (Number(l.quantite) || 0) * (l.unite === 'BOITE' ? produit(l).plaquesParBoite || 1 : 1), 0)
const depasse = (l) => !!produit(l) && plaquesDemandees(l.produitId) > (produit(l).stockDisponible ?? 0)

const total = computed(() => f.value.lignes.reduce((s, l) => s + prix(l) * (Number(l.quantite) || 0), 0))
const valide = computed(() => f.value.patient && f.value.lignes.every((l) => l.produitId && Number(l.quantite) > 0))

function ajouterLigne() {
  f.value.lignes.push(nouvelleLigne())
}

async function valider() {
  enregistrement.value = true
  try {
    const d = await store.dispatch('sorties/creerDispensation', {
      patient: f.value.patient,
      numeroPassage: f.value.numeroPassage || null,
      prescripteur: f.value.prescripteur || null,
      lignes: f.value.lignes.map((l) => ({ produitId: l.produitId, unite: l.unite, quantite: Number(l.quantite) })),
    })
    store.dispatch('notifications/succes', `Dispensation ${d.numero} validée.`)
    router.push({ name: 'dispensation-fiche', params: { id: d.id } })
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    enregistrement.value = false
  }
}

onMounted(() => {
  store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch((e) => store.dispatch('notifications/erreurApi', e))
})
// Stock disponible et couleur d'état à jour pendant la saisie (§ 13.3)
utiliserActualisation(() => store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch(() => {}))
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.section {
  margin: 0.25rem 0 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
}
.section:not(:first-child) {
  margin-top: 1.5rem;
}
.grille-formulaire.trois-colonnes {
  grid-template-columns: repeat(3, 1fr);
}
.lignes td {
  vertical-align: top;
}
.col-produit {
  width: 38%;
}
.col-unite {
  width: 150px;
}
.col-quantite {
  width: 120px;
}
.detail {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: var(--muted);
}
.trop {
  border-color: var(--danger);
}
.erreur-ligne {
  font-size: 0.75rem;
  color: var(--danger);
}
.total-general {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--primary-dark);
}
.pied {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
@media (max-width: 900px) {
  .grille-formulaire.trois-colonnes {
    grid-template-columns: 1fr;
  }
}
</style>
