<!--
  Petit tableau d'HISTORIQUE DES PRIX DE VENTE (même présentation que le district).

  Propriétés :
    - lignes : liste des prix (renvoyée par l'API).
  Événement :
    - @corriger(ligne) : clic sur « Corriger » (seulement sur le prix EN COURS).
-->
<template>
  <div class="tableau-conteneur">
    <h4>Historique</h4>
    <p v-if="lignes.length === 0" class="tableau-vide">Aucun prix enregistré.</p>

    <table v-else class="tableau">
      <thead>
        <tr>
          <ColonneTri v-model="tri" cle="prix" class="nombre">Prix de vente</ColonneTri>
          <ColonneTri v-model="tri" cle="du">Du</ColonneTri>
          <ColonneTri v-model="tri" cle="au">Au</ColonneTri>
          <ColonneTri v-model="tri" cle="statut">Statut</ColonneTri>
          <th class="actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ligne in lignesPage" :key="ligne.id">
          <td class="nombre"><strong>{{ montant(prix(ligne)) }}</strong></td>
          <td>{{ date(ligne.dateEffet) }}</td>
          <td>{{ ligne.dateFin ? date(ligne.dateFin) : '—' }}</td>
          <td>
            <span class="badge" :class="ligne.dateFin ? 'badge-gris' : 'badge-vert'">
              {{ ligne.dateFin ? 'Clôturé' : 'En cours' }}
            </span>
            <span v-if="ligne.motifCorrection" class="badge badge-orange corrige" :title="`Corrigé : ${ligne.motifCorrection}`">
              Corrigé
            </span>
          </td>
          <td class="actions">
            <!-- Seul le prix EN COURS peut être corrigé (erreur de saisie) -->
            <button v-if="!ligne.dateFin" v-si-modif class="bouton-lien" title="Corriger une erreur de saisie" @click="emit('corriger', ligne)">
              Corriger
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <Pagination v-model:page="page" v-model:taille="taille" :total="lignes.length" />
  </div>
</template>

<script setup>
import { toRef } from 'vue'
import { date, montant } from '@/utils/format'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import { utiliserTableau } from '@/utils/pagination'

const emit = defineEmits(['corriger'])
const props = defineProps({ lignes: { type: Array, required: true } })

const lignes = toRef(props, 'lignes')
/** Un seul prix de vente par unité (prix plaque pour un ancien produit vendu à la plaque seule). */
const prix = (p) => Number(p.prixBoite) || Number(p.prixPlaque)
const VALEURS_TRI = {
  prix,
  du: (p) => p.dateEffet,
  au: (p) => p.dateFin,
  statut: (p) => (p.dateFin ? 'Clôturé' : 'En cours'),
}
const { tri, page, taille, lignesPage } = utiliserTableau(lignes, [lignes], VALEURS_TRI)
</script>

<style scoped>
h4 {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: var(--texte-sur-fond);
}
.corrige {
  margin-left: 0.3rem;
}
</style>
