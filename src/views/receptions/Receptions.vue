<script setup>
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { GESTION_STOCK } from '../../utils/roles'
import { date, montant } from '../../utils/format'
import { erreur } from '../../utils/alertes'

const store = useStore()
const router = useRouter()

const liste = computed(() => store.state.receptions.liste)
const filtres = computed(() => store.state.receptions.filtres)
const chargement = computed(() => store.state.receptions.chargement)
const fournisseurs = computed(() => store.state.fournisseurs.liste)
const peutGerer = computed(() => store.getters['auth/peut'](GESTION_STOCK))
const total = computed(() => liste.value.reduce((s, r) => s + Number(r.montantTotal), 0))

const filtrer = (champ, valeur) => store.commit('receptions/filtres', { [champ]: valeur })
const charger = () => store.dispatch('receptions/charger').catch(erreur)

onMounted(() => {
  charger()
  store.dispatch('fournisseurs/charger').catch(() => {})
})
</script>

<template>
  <div>
    <div class="entete-page">
      <h1>Entrées en stock</h1>
      <div v-if="peutGerer" class="actions">
        <router-link class="btn btn-primaire" :to="{ name: 'reception-nouvelle' }">
          + Nouvelle réception
        </router-link>
      </div>
    </div>

    <form class="filtres" @submit.prevent="charger">
      <label>Du <ChampDate :model-value="filtres.du" @change="(v) => filtrer('du', v)" /></label>
      <label>Au <ChampDate :model-value="filtres.au" @change="(v) => filtrer('au', v)" /></label>
      <label>
        Fournisseur
        <select :value="filtres.fournisseurId" @change="filtrer('fournisseurId', $event.target.value)">
          <option value="">Tous</option>
          <option v-for="f in fournisseurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
        </select>
      </label>
      <button class="btn">Afficher</button>
    </form>

    <div class="tableau-conteneur">
      <table>
        <thead>
          <tr>
            <th>N°</th>
            <th>Date</th>
            <th>Fournisseur</th>
            <th class="num">Lignes</th>
            <th>Saisie par</th>
            <th class="num">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in liste"
            :key="r.id"
            class="cliquable"
            @click="router.push({ name: 'reception', params: { id: r.id } })"
          >
            <td><strong>{{ r.numero }}</strong></td>
            <td>{{ date(r.dateReception) }}</td>
            <td>{{ r.fournisseur.nom }}</td>
            <td class="num">{{ r._count.lignes }}</td>
            <td>{{ r.utilisateur.nom }} {{ r.utilisateur.prenoms ?? '' }}</td>
            <td class="num">{{ montant(r.montantTotal) }}</td>
          </tr>
          <tr v-if="!liste.length">
            <td colspan="6" class="vide">
              {{ chargement ? 'Chargement…' : 'Aucune réception sur la période.' }}
            </td>
          </tr>
        </tbody>
        <tfoot v-if="liste.length">
          <tr>
            <td colspan="5">Total ({{ liste.length }} réception(s))</td>
            <td class="num">{{ montant(total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
