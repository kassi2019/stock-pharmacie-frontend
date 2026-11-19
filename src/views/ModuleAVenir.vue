<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icone from '../components/Icone.vue'
import { moduleParRoute } from '../utils/modules'

/** Page d'un module prévu dans un lot ultérieur (§ 19). */
const route = useRoute()
const m = computed(() => moduleParRoute(route.name))
</script>

<template>
  <div v-if="m" class="page">
    <div class="carte bloc">
      <span class="icone"><Icone :nom="m.icone" :taille="40" /></span>
      <h1>{{ m.titre }}</h1>
      <p class="description">{{ m.description }}</p>
      <p class="statut">
        Module prévu au <strong>lot {{ m.lot }}</strong> du planning
        <span class="chapitre">(cahier des charges {{ m.chapitre }})</span>
      </p>
      <router-link :to="{ name: 'accueil' }" class="btn btn-primaire">Retour à l'accueil</router-link>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  place-items: center;
  min-height: 70vh;
}
.bloc {
  max-width: 520px;
  text-align: center;
  padding: 2.5rem 2rem;
  border-radius: 20px;
  box-shadow:
    0 1px 2px rgb(2 136 209 / 0.06),
    0 8px 16px rgb(2 136 209 / 0.08),
    0 24px 48px rgb(2 136 209 / 0.12);
}
.icone {
  width: 80px;
  height: 80px;
  border-radius: 22px;
  display: inline-grid;
  place-items: center;
  color: var(--primaire);
  background: var(--ciel-pale);
  margin-bottom: 1rem;
}
h1 {
  color: var(--primaire-fonce);
}
.description {
  color: var(--gris);
  margin: 0.6rem 0 1.25rem;
}
.statut {
  background: #fff8e1;
  color: #8d6e00;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
}
.chapitre {
  display: block;
  font-size: 0.8rem;
  opacity: 0.8;
}
</style>
