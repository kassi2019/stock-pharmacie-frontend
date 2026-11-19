<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import api from '../../services/api'
import EtatBadge from '../../components/EtatBadge.vue'
import { GESTION_STOCK, PRIX_ACHAT } from '../../utils/roles'
import { date, montant, quantite } from '../../utils/format'
import { erreur } from '../../utils/alertes'

const props = defineProps({ id: { type: String, required: true } })
const store = useStore()

const produit = ref(null)
const peutGerer = computed(() => store.getters['auth/peut'](GESTION_STOCK))
const voitPrixAchat = computed(() => store.getters['auth/peut'](PRIX_ACHAT))

const valeurStock = computed(() =>
  (produit.value?.lots ?? [])
    .filter((l) => !l.perime)
    .reduce((s, l) => s + l.quantiteRestante * Number(l.prixAchatPlaque ?? 0), 0),
)
const couverture = computed(() => {
  const qs = Number(produit.value?.consoJournaliere ?? 0)
  return qs > 0 ? Math.floor(produit.value.stockDisponible / qs) : null
})

async function charger() {
  try {
    const { data } = await api.get(`/produits/${props.id}`)
    produit.value = data
  } catch (e) {
    erreur(e)
  }
}
watch(() => props.id, charger, { immediate: true })

</script>

<template>
  <div v-if="produit">
    <div class="entete-page">
      <div>
        <router-link :to="{ name: 'produits' }">← Produits</router-link>
        <h1>
          {{ produit.designation }}
          <EtatBadge :etat="produit.etatStock" />
          <span v-if="!produit.actif" class="pastille">Inactif</span>
        </h1>
      </div>
      <div v-if="peutGerer" class="actions">
        <router-link class="btn" :to="{ name: 'produits' }">
          Retour au catalogue
        </router-link>
      </div>
    </div>

    <div class="carte grille">
      <div><small>Forme</small><br />{{ produit.forme?.libelle ?? '—' }}</div>
      <div>
        <small>Vente</small><br />
        {{ [produit.venteBoite && 'Boîte', produit.ventePlaque && 'Plaque'].filter(Boolean).join(' / ') }}
        — {{ produit.plaquesParBoite }} plaque(s) / boîte
      </div>
      <div v-if="produit.stockDisponible !== undefined">
        <small>Stock disponible</small><br />
        <strong>{{ quantite(produit.stockDisponible, produit.plaquesParBoite) }}</strong>
        ({{ produit.stockDisponible }} plaques)
      </div>
      <div v-if="produit.consoJournaliere !== undefined">
        <small>Consommation / jour (Qs)</small><br />
        {{ Number(produit.consoJournaliere).toFixed(2) }} plaque(s)
        <span v-if="couverture !== null">— couverture {{ couverture }} j</span>
      </div>
      <div v-if="produit.prixVenteBoite !== undefined">
        <small>Prix de vente</small><br />
        <span v-if="produit.consommable">0 F (consommable)</span>
        <span v-else>
          <span v-if="produit.venteBoite">{{ montant(produit.prixVenteBoite) }} / boîte</span>
          <span v-if="produit.venteBoite && produit.ventePlaque"> — </span>
          <span v-if="produit.ventePlaque">{{ montant(produit.prixVentePlaque) }} / plaque</span>
        </span>
      </div>
      <div v-if="voitPrixAchat">
        <small>Prix d'achat (dernier lot)</small><br />
        {{ montant(produit.prixAchatPlaque) }} / plaque
      </div>
      <div v-if="voitPrixAchat">
        <small>Valeur du stock</small><br />
        <strong>{{ montant(valeurStock) }}</strong>
      </div>
    </div>

    <template v-if="produit.lots">
      <h2>Lots en stock (par date de péremption)</h2>
      <div class="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th>N° de lot</th>
              <th>Péremption</th>
              <th>Fournisseur</th>
              <th class="num">Quantité</th>
              <th v-if="voitPrixAchat" class="num">Prix achat plaque</th>
              <th v-if="voitPrixAchat" class="num">Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in produit.lots" :key="l.id">
              <td><strong>{{ l.numeroLot }}</strong></td>
              <td>
                {{ date(l.datePeremption) }}
                <span v-if="l.perime" class="pastille danger">Périmé</span>
                <span v-else-if="l.prochePeremption" class="pastille alerte">≤ 30 j</span>
              </td>
              <td>{{ l.fournisseur?.nom ?? '—' }}</td>
              <td class="num">
                {{ quantite(l.quantiteRestante, produit.plaquesParBoite) }}
                <small>({{ l.quantiteRestante }} plq)</small>
              </td>
              <td v-if="voitPrixAchat" class="num">{{ montant(l.prixAchatPlaque) }}</td>
              <td v-if="voitPrixAchat" class="num">
                {{ montant(l.quantiteRestante * Number(l.prixAchatPlaque)) }}
              </td>
            </tr>
            <tr v-if="!produit.lots.length">
              <td colspan="6" class="vide">Aucun lot en stock.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

  </div>
</template>

<style scoped>
h1 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.25rem;
}
small {
  color: var(--gris);
}
</style>
