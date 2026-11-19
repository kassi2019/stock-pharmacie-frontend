<script setup>
import { reactive, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { aujourdhui, date, montant } from '../../utils/format'
import { erreur } from '../../utils/alertes'

const props = defineProps({ id: { type: String, required: true } })
const store = useStore()
const router = useRouter()

const periode = reactive({ du: `${aujourdhui().slice(0, 4)}-01-01`, au: aujourdhui() })
const donnees = ref(null)

async function charger() {
  try {
    donnees.value = await store.dispatch('fournisseurs/historique', { id: props.id, ...periode })
  } catch (e) {
    erreur(e)
  }
}
watch(() => props.id, charger, { immediate: true })
</script>

<template>
  <div>
    <div class="entete-page">
      <div>
        <router-link :to="{ name: 'parametres', query: { onglet: 'fournisseurs' } }">← Fournisseurs</router-link>
        <h1>Historique — {{ donnees?.fournisseur.nom }}</h1>
      </div>
    </div>

    <div class="filtres">
      <label>Du <ChampDate v-model="periode.du" /></label>
      <label>Au <ChampDate v-model="periode.au" /></label>
      <button class="btn" @click="charger">Afficher</button>
    </div>

    <h2>Réceptions</h2>
    <div class="tableau-conteneur">
      <table>
        <thead>
          <tr>
            <th>N°</th>
            <th>Date</th>
            <th class="num">Lignes</th>
            <th>Saisie par</th>
            <th class="num">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in donnees?.receptions ?? []"
            :key="r.id"
            class="cliquable"
            @click="router.push({ name: 'reception', params: { id: r.id } })"
          >
            <td><strong>{{ r.numero }}</strong></td>
            <td>{{ date(r.dateReception) }}</td>
            <td class="num">{{ r._count.lignes }}</td>
            <td>{{ r.utilisateur.nom }} {{ r.utilisateur.prenoms ?? '' }}</td>
            <td class="num">{{ montant(r.montantTotal) }}</td>
          </tr>
          <tr v-if="donnees && !donnees.receptions.length">
            <td colspan="5" class="vide">Aucune réception sur la période.</td>
          </tr>
        </tbody>
        <tfoot v-if="donnees?.receptions.length">
          <tr>
            <td colspan="4">Total</td>
            <td class="num">{{ montant(donnees.total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="aide">Les retours fournisseur apparaîtront ici avec les retraits de lots (lot 2).</p>
  </div>
</template>

<style scoped>
.aide {
  color: var(--gris);
  font-size: 0.85rem;
}
</style>
