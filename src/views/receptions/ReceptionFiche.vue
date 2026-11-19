<script setup>
import { ref, watch } from 'vue'
import { useStore } from 'vuex'
import { date, dateHeure, montant } from '../../utils/format'
import { erreur } from '../../utils/alertes'

const props = defineProps({ id: { type: String, required: true } })
const store = useStore()
const r = ref(null)

watch(
  () => props.id,
  async (id) => {
    try {
      r.value = await store.dispatch('receptions/trouver', id)
    } catch (e) {
      erreur(e)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="r">
    <div class="entete-page">
      <div>
        <router-link :to="{ name: 'receptions' }">← Entrées en stock</router-link>
        <h1>Réception {{ r.numero }}</h1>
      </div>
      <div class="actions">
        <button class="btn" onclick="window.print()">Imprimer</button>
      </div>
    </div>

    <div class="carte grille">
      <div><small>Fournisseur</small><br /><strong>{{ r.fournisseur.nom }}</strong></div>
      <div><small>Date de réception</small><br />{{ date(r.dateReception) }}</div>
      <div><small>Saisie par</small><br />{{ r.utilisateur.nom }} {{ r.utilisateur.prenoms ?? '' }} ({{ r.utilisateur.matricule }})</div>
      <div><small>Enregistrée le</small><br />{{ dateHeure(r.createdAt) }}</div>
      <div v-if="r.observation"><small>Observation</small><br />{{ r.observation }}</div>
    </div>

    <div class="tableau-conteneur">
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th>N° de lot</th>
            <th>Péremption</th>
            <th class="num">Quantité</th>
            <th class="num">Plaques</th>
            <th class="num">Prix unitaire</th>
            <th class="num">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in r.lignes" :key="l.id">
            <td>
              <router-link :to="{ name: 'produit', params: { id: l.produit.id } }">
                {{ l.produit.designation }}
              </router-link>
            </td>
            <td>{{ l.numeroLot }}</td>
            <td>{{ date(l.datePeremption) }}</td>
            <td class="num">{{ l.quantite }} {{ l.unite === 'BOITE' ? 'bte' : 'plq' }}</td>
            <td class="num">{{ l.quantitePlaques }}</td>
            <td class="num">{{ montant(l.prixAchatUnitaire) }}</td>
            <td class="num">{{ montant(l.montant) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6">Total</td>
            <td class="num">{{ montant(r.montantTotal) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
small {
  color: var(--gris);
}
@media print {
  .actions,
  a {
    display: none;
  }
}
</style>
