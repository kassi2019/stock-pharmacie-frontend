<!--
  =============================================================================
  TABLEAU DE RAPPORT générique (onglets Paie et Personnel des Rapports)
  =============================================================================
  Colonnes au même format que les exports PDF / Excel :
      { titre, valeur: (ligne) => texte, droite?, somme?: (ligne) => nombre, formatTotal?,
        tri?: (ligne) => valeur de tri (ex. date AAAA-MM-JJ, sinon somme puis texte) }
  -> tri par colonne, ligne de TOTAL (colonnes avec « somme »), pagination,
     recherche, boutons Excel / PDF avec l'en-tête de la pharmacie.
  =============================================================================
-->
<template>
  <div class="tableau-rapport">
    <div class="barre-outils">
      <h3 class="titre-rapport">{{ titre }}</h3>
      <input v-if="recherche !== false" v-model="texte" class="recherche" type="search" placeholder="Rechercher…" />
      <span class="espace"></span>
      <ImportExportTableau :titre="titre" :sous-titre="sousTitre" :nom-fichier="nomFichier" :colonnes-pdf="colonnes" :lignes="lignesTriees" />
    </div>
    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-for="(c, i) in colonnes" :key="c.titre" v-model="tri" :cle="String(i)" :class="{ nombre: c.droite }">{{ c.titre }}</ColonneTri>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(l, n) in lignesPage" :key="n">
            <td v-for="c in colonnes" :key="c.titre" :class="{ nombre: c.droite }">{{ c.valeur(l) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="filtrees.length && colonnes.some((c) => c.somme)">
          <tr>
            <td v-for="(c, i) in colonnes" :key="c.titre" :class="{ nombre: c.droite }">
              <strong v-if="c.somme">{{ (c.formatTotal ?? nombre)(filtrees.reduce((s, l) => s + (Number(c.somme(l)) || 0), 0)) }}</strong>
              <strong v-else-if="i === 0">Total</strong>
            </td>
          </tr>
        </tfoot>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="filtrees.length" />
      <p v-if="!filtrees.length" class="tableau-vide">{{ vide }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, toRef } from 'vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import { utiliserTableau } from '@/utils/pagination'
import { nombre } from '@/utils/format'

const props = defineProps({
  titre: { type: String, required: true },
  sousTitre: { type: String, default: '' },
  nomFichier: { type: String, required: true },
  colonnes: { type: Array, required: true },
  lignes: { type: Array, required: true },
  vide: { type: String, default: 'Aucune ligne.' },
  /** false = pas de champ de recherche */
  recherche: { type: Boolean, default: true },
})

const texte = ref('')
const colonnes = toRef(props, 'colonnes')
const filtrees = computed(() => {
  const t = texte.value.toLowerCase()
  if (!t) return props.lignes
  return props.lignes.filter((l) => colonnes.value.some((c) => String(c.valeur(l) ?? '').toLowerCase().includes(t)))
})
/** Tri : la clé est le rang de la colonne ; on trie sur la valeur numérique si elle existe. */
const valeursTri = new Proxy(
  {},
  {
    get: (_o, cle) => {
      const c = colonnes.value[Number(cle)]
      return c ? (l) => (c.tri ?? c.somme ?? c.valeur)(l) : undefined
    },
  },
)
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(filtrees, [texte, colonnes], valeursTri)
</script>

<style scoped>
.tableau-rapport { display: flex; flex-direction: column; gap: 0.6rem; }
.titre-rapport { margin: 0; font-size: 1rem; color: var(--texte-sur-fond); }
</style>
