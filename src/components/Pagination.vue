<!--
  =============================================================================
  BARRE DE PAGINATION (sous un tableau)
  =============================================================================
  Affiche : « 11–20 sur 57 », le choix du nombre de lignes par page,
  et les boutons de pages  ‹ 1 … 4 5 6 … 12 ›

  Utilisation (avec utiliserPagination, voir src/utils/pagination.js) :
      <Pagination v-model:page="page" v-model:taille="taille" :total="liste.length" />

  La barre est cachée quand le tableau est vide.
  =============================================================================
-->
<template>
  <div v-if="total > 0" class="pagination">
    <!-- Lignes affichées -->
    <span class="resume">
      <strong>{{ premiere }}–{{ derniere }}</strong> sur <strong>{{ total }}</strong>
    </span>

    <!-- Nombre de lignes par page -->
    <div class="taille">
      <span>Lignes par page</span>
      <div class="choix-taille">
        <ListeDeroulante
          :model-value="taille"
          :options="TAILLES"
          :effacable="false"
          @update:model-value="(valeur) => emit('update:taille', valeur)"
        />
      </div>
    </div>

    <!-- Boutons de pages (seulement s'il y a plusieurs pages) -->
    <nav v-if="nombrePages > 1" class="pages" aria-label="Pages">
      <button class="bouton-page" :disabled="page === 1" title="Page précédente" @click="allerA(page - 1)">‹</button>
      <template v-for="(numero, index) in numeros" :key="index">
        <span v-if="numero === '…'" class="points">…</span>
        <button v-else class="bouton-page" :class="{ actif: numero === page }" @click="allerA(numero)">
          {{ numero }}
        </button>
      </template>
      <button class="bouton-page" :disabled="page === nombrePages" title="Page suivante" @click="allerA(page + 1)">›</button>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'

const props = defineProps({
  /** Page en cours (commence à 1) */
  page: { type: Number, required: true },
  /** Nombre de lignes par page */
  taille: { type: Number, required: true },
  /** Nombre total de lignes */
  total: { type: Number, required: true },
})
const emit = defineEmits(['update:page', 'update:taille'])

/** Choix possibles du nombre de lignes par page. */
const TAILLES = [10, 25, 50, 100]

const nombrePages = computed(() => Math.max(1, Math.ceil(props.total / props.taille)))
const premiere = computed(() => (props.page - 1) * props.taille + 1)
const derniere = computed(() => Math.min(props.page * props.taille, props.total))

/**
 * Numéros de pages à afficher : toujours la 1re et la dernière,
 * plus les pages autour de la page en cours ; « … » pour les trous.
 * Ex. page 6 sur 12 -> 1 … 5 6 7 … 12
 */
const numeros = computed(() => {
  const total = nombrePages.value
  const actuelle = props.page
  const liste = []
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - actuelle) <= 1) liste.push(n)
    else if (liste[liste.length - 1] !== '…') liste.push('…')
  }
  return liste
})

function allerA(numero) {
  if (numero >= 1 && numero <= nombrePages.value) emit('update:page', numero)
}
</script>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding: 0.85rem 0.25rem 0.25rem;
  font-size: 0.85rem;
  color: var(--muted);
}
.resume strong { color: var(--texte-sur-fond); }

.taille { display: flex; align-items: center; gap: 0.5rem; }
.choix-taille { width: 90px; }

/* Les boutons de pages sont poussés à droite */
.pages { display: flex; align-items: center; gap: 0.3rem; margin-left: auto; }
.bouton-page {
  min-width: 34px;
  height: 34px;
  padding: 0 0.5rem;
  border-radius: 8px;
  background: #fff;
  color: var(--texte-sur-fond);
  border: 1px solid var(--border);
  font-weight: 600;
}
.bouton-page:hover:not(:disabled) { background: var(--primary-light); border-color: var(--primary); }
.bouton-page.actif {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.points { padding: 0 0.2rem; }
</style>
