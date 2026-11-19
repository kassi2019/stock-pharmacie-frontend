<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { aujourdhui, montant } from '../../utils/format'
import { confirmer, echapper, erreur, succes } from '../../utils/alertes'

const DELAI_ALERTE_JOURS = 30

const store = useStore()
const router = useRouter()

const fournisseurs = computed(() => store.getters['fournisseurs/actifs'])
const produits = ref([])
const parDesignation = computed(() => new Map(produits.value.map((p) => [p.designation, p])))

const entete = reactive({ fournisseurId: '', dateReception: aujourdhui(), observation: '' })
let compteurLignes = 0
const nouvelleLigne = () => ({
  cle: ++compteurLignes,
  designation: '',
  numeroLot: '',
  datePeremption: '',
  quantite: 1,
  unite: 'BOITE',
  prixAchatUnitaire: 0,
})
const lignes = ref([nouvelleLigne()])
const enCours = ref(false)

const jour = aujourdhui()
const limite = (() => {
  const d = new Date(`${jour}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + DELAI_ALERTE_JOURS)
  return d.toISOString().slice(0, 10)
})()

const produitDe = (l) => parDesignation.value.get(l.designation.trim().toUpperCase())

function unites(l) {
  const p = produitDe(l)
  if (!p) return ['BOITE', 'PLAQUE']
  return p.plaquesParBoite > 1 || p.venteBoite ? ['BOITE', 'PLAQUE'] : ['PLAQUE']
}

function choisirProduit(l) {
  const p = produitDe(l)
  if (!p) return
  if (!unites(l).includes(l.unite)) l.unite = unites(l)[0]
  // Proposition : dernier prix d'achat connu
  if (!l.prixAchatUnitaire && Number(p.prixAchatPlaque)) {
    l.prixAchatUnitaire =
      Number(p.prixAchatPlaque) * (l.unite === 'BOITE' ? p.plaquesParBoite : 1)
  }
}

function etatPeremption(l) {
  if (!l.datePeremption) return null
  if (l.datePeremption < jour) return 'perime'
  if (l.datePeremption <= limite) return 'proche'
  return null
}

const plaques = (l) => {
  const p = produitDe(l)
  return l.quantite * (l.unite === 'BOITE' ? (p?.plaquesParBoite ?? 1) : 1)
}
const total = computed(() =>
  lignes.value.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixAchatUnitaire) || 0), 0),
)

function supprimer(i) {
  lignes.value.splice(i, 1)
  if (!lignes.value.length) lignes.value.push(nouvelleLigne())
}

function construire() {
  const inconnues = lignes.value
    .map((l, i) => (!produitDe(l) ? i + 1 : null))
    .filter(Boolean)
  if (inconnues.length) {
    throw new Error(`Produit inconnu ou inactif à la ligne ${inconnues.join(', ')}. Choisissez-le dans la liste.`)
  }
  return {
    fournisseurId: Number(entete.fournisseurId),
    dateReception: entete.dateReception,
    observation: entete.observation.trim().toUpperCase() || null,
    lignes: lignes.value.map((l) => ({
      produitId: produitDe(l).id,
      numeroLot: l.numeroLot.trim().toUpperCase(),
      datePeremption: l.datePeremption,
      quantite: Number(l.quantite),
      unite: l.unite,
      prixAchatUnitaire: Number(l.prixAchatUnitaire),
    })),
  }
}

async function enregistrer() {
  let dto
  try {
    dto = construire()
  } catch (e) {
    return erreur(e)
  }
  enCours.value = true
  try {
    const { erreurs, avertissements } = await store.dispatch('receptions/verifier', dto)
    if (erreurs.length) return erreur({ message: erreurs.join('\n') }, 'Réception refusée')
    if (avertissements.length) {
      const ok = await confirmer(
        'Péremption proche',
        `<ul style="text-align:left">${avertissements.map((a) => `<li>${echapper(a)}</li>`).join('')}</ul>Enregistrer quand même ?`,
        'Enregistrer',
      )
      if (!ok) return
    }
    const { reception } = await store.dispatch('receptions/creer', dto)
    succes('Réception enregistrée', reception.numero)
    router.replace({ name: 'reception', params: { id: reception.id } })
  } catch (e) {
    erreur(e)
  } finally {
    enCours.value = false
  }
}

onMounted(async () => {
  try {
    const [p] = await Promise.all([
      store.dispatch('catalogue/rechercherProduits', ''),
      store.dispatch('fournisseurs/charger'),
    ])
    produits.value = p
  } catch (e) {
    erreur(e)
  }
})
</script>

<template>
  <form @submit.prevent="enregistrer">
    <div class="entete-page">
      <div>
        <router-link :to="{ name: 'receptions' }">← Entrées en stock</router-link>
        <h1>Nouvelle réception</h1>
      </div>
      <div class="actions">
        <strong>Total : {{ montant(total) }}</strong>
        <button class="btn btn-primaire" :disabled="enCours">
          {{ enCours ? 'Enregistrement…' : 'Enregistrer la réception' }}
        </button>
      </div>
    </div>

    <div class="carte grille">
      <label>
        <span class="obligatoire">Fournisseur</span>
        <select v-model="entete.fournisseurId" required>
          <option value="" disabled>— Choisir —</option>
          <option v-for="f in fournisseurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
        </select>
      </label>
      <label>
        <span class="obligatoire">Date de réception</span>
        <ChampDate v-model="entete.dateReception" :max="jour" required />
      </label>
      <label class="observation">
        Observation
        <input v-model="entete.observation" class="maj" maxlength="500" placeholder="N° de facture, bon de livraison…" />
      </label>
    </div>

    <datalist id="liste-produits">
      <option v-for="p in produits" :key="p.id" :value="p.designation" />
    </datalist>

    <div class="tableau-conteneur">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th class="obligatoire">Produit</th>
            <th class="obligatoire">N° de lot</th>
            <th class="obligatoire">Péremption</th>
            <th class="obligatoire">Quantité</th>
            <th>Unité</th>
            <th class="obligatoire">Prix d'achat unitaire</th>
            <th class="num">Plaques</th>
            <th class="num">Montant</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(l, i) in lignes" :key="l.cle">
            <td>{{ i + 1 }}</td>
            <td class="col-produit">
              <input
                v-model="l.designation"
                class="maj"
                list="liste-produits"
                required
                placeholder="Rechercher…"
                :class="{ invalide: l.designation && !produitDe(l) }"
                @change="choisirProduit(l)"
              />
            </td>
            <td><input v-model="l.numeroLot" class="maj court" required maxlength="60" /></td>
            <td>
              <ChampDate
                v-model="l.datePeremption"
                required
                :class="{ invalide: etatPeremption(l) === 'perime', alerte: etatPeremption(l) === 'proche' }"
              />
              <div v-if="etatPeremption(l) === 'perime'" class="note danger">Lot périmé : refusé</div>
              <div v-else-if="etatPeremption(l) === 'proche'" class="note alerte">≤ {{ DELAI_ALERTE_JOURS }} jours</div>
            </td>
            <td><input v-model.number="l.quantite" type="number" min="1" step="1" required class="tres-court" /></td>
            <td>
              <select v-model="l.unite">
                <option v-for="u in unites(l)" :key="u" :value="u">{{ u === 'BOITE' ? (produitDe(l)?.uniteVente?.libelle ?? 'BOÎTE') : 'PLAQUE' }}</option>
              </select>
            </td>
            <td><input v-model.number="l.prixAchatUnitaire" type="number" min="0" step="any" required class="court" /></td>
            <td class="num">{{ produitDe(l) ? plaques(l) : '—' }}</td>
            <td class="num">{{ montant((l.quantite || 0) * (l.prixAchatUnitaire || 0)) }}</td>
            <td>
              <button type="button" class="btn btn-petit btn-danger" title="Supprimer la ligne" @click="supprimer(i)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      <button type="button" class="btn" @click="lignes.push(nouvelleLigne())">+ Ajouter une ligne</button>
    </p>
    <p class="aide">
      Une ligne par lot. Un lot déjà en stock (même produit et même N° de lot) est complété. Les lots
      périmés sont refusés ; une péremption à moins de {{ DELAI_ALERTE_JOURS }} jours demande une
      confirmation.
    </p>
  </form>
</template>

<style scoped>
.observation {
  grid-column: span 2;
}
.col-produit input {
  min-width: 260px;
  width: 100%;
}
.court {
  width: 120px;
}
.tres-court {
  width: 80px;
}
input.invalide,
:deep(.champ-date-perso input.invalide) {
  border-color: var(--danger);
  background: #fff5f5;
}
input.alerte,
:deep(.champ-date-perso input.alerte) {
  border-color: var(--attention);
  background: #fffaf0;
}
.note {
  font-size: 0.75rem;
  font-weight: 600;
}
.note.danger {
  color: var(--danger);
}
.note.alerte {
  color: var(--attention);
}
td {
  vertical-align: top;
}
.aide {
  color: var(--gris);
  font-size: 0.85rem;
}
</style>
