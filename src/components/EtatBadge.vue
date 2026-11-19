<script setup>
import { computed } from 'vue'
import { ETATS } from '../utils/etats'

const props = defineProps({ etat: { type: String, default: null } })
const e = computed(() => ETATS[props.etat])
</script>

<template>
  <span
    v-if="e"
    class="etat"
    :style="{ background: e.couleur, color: e.texte }"
    :title="e.libelle"
  >
    {{ e.libelle }}
  </span>
</template>

<style scoped>
.etat {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
