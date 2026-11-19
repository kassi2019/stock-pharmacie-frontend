<!--
  =============================================================================
  EN-TÊTE DE COLONNE TRIABLE (« data table »)
  =============================================================================
  Remplace un <th> : un clic trie le tableau sur cette colonne.
    1er clic : ordre croissant ▲   2e clic : décroissant ▼   3e clic : sans tri

  Utilisation (avec utiliserTableau, voir src/utils/pagination.js) :
      <ColonneTri v-model="tri" cle="code">Code</ColonneTri>
      <ColonneTri v-model="tri" cle="stock" class="nombre">Stock</ColonneTri>

  "cle" doit exister dans l'objet VALEURS_TRI de l'écran (valeur à comparer).
  =============================================================================
-->
<template>
  <th
    class="colonne-tri"
    :class="{ active: actif }"
    :aria-sort="actif ? (modelValue.sens === 'asc' ? 'ascending' : 'descending') : 'none'"
    title="Cliquer pour trier"
    @click="changer"
  >
    <span class="contenu">
      <slot />
      <span class="fleches" aria-hidden="true">
        <span :class="{ allumee: actif && modelValue.sens === 'asc' }">▲</span>
        <span :class="{ allumee: actif && modelValue.sens === 'desc' }">▼</span>
      </span>
    </span>
  </th>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Tri en cours : { cle: 'code', sens: 'asc' | 'desc' } (cle null = pas de tri) */
  modelValue: { type: Object, required: true },
  /** Clé de cette colonne (dans VALEURS_TRI) */
  cle: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const actif = computed(() => props.modelValue.cle === props.cle)

/** Croissant -> décroissant -> sans tri. */
function changer() {
  if (!actif.value) emit('update:modelValue', { cle: props.cle, sens: 'asc' })
  else if (props.modelValue.sens === 'asc') emit('update:modelValue', { cle: props.cle, sens: 'desc' })
  else emit('update:modelValue', { cle: null, sens: 'asc' })
}
</script>

<style scoped>
.colonne-tri { cursor: pointer; user-select: none; }
.colonne-tri:hover { background: var(--primary-light); }
.contenu { display: inline-flex; align-items: center; gap: 0.4rem; }
.fleches {
  display: inline-flex;
  flex-direction: column;
  font-size: 0.5rem;
  line-height: 0.75;
  color: #b0c4d4;
}
.fleches .allumee { color: var(--primary); }
.colonne-tri.active { color: var(--primary-dark); }
</style>
