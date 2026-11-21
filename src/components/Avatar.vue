<!--
  =============================================================================
  AVATAR : photo de la personne, ou ses initiales s'il n'y a pas de photo
  =============================================================================
  Utilisation :
      <Avatar :photo="p.photo" :nom="p.nom" :prenoms="p.prenoms" />
      <Avatar :photo="u.personnel?.photo" :nom="u.nom" :prenoms="u.prenoms" :taille="56" />
  =============================================================================
-->
<template>
  <span class="avatar-rond" :style="{ width: taille + 'px', height: taille + 'px', fontSize: taille * 0.36 + 'px' }">
    <img v-if="photo" :src="photo" :alt="`Photo de ${prenoms || ''} ${nom || ''}`" />
    <template v-else>{{ initiales }}</template>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Photo (texte « data:image/jpeg;base64,... ») ou vide */
  photo: { type: String, default: null },
  nom: { type: String, default: '' },
  prenoms: { type: String, default: '' },
  /** Taille en pixels */
  taille: { type: Number, default: 38 },
})

/** Initiales (ex. « Awa » « Bamba » -> « AB »). */
const initiales = computed(
  () => ((props.prenoms || '').charAt(0) + (props.nom || '').charAt(0)).toUpperCase() || '?',
)
</script>

<style scoped>
.avatar-rond {
  flex-shrink: 0;
  display: inline-grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-dark));
  color: #fff;
  font-weight: 700;
  box-shadow: 0 0 0 2px #fff, 0 1px 4px rgba(0, 0, 0, 0.15);
}
.avatar-rond img { width: 100%; height: 100%; object-fit: cover; }
</style>
