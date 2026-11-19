<!--
  =============================================================================
  LISTE DÉROULANTE AVEC RECHERCHE
  =============================================================================
  Remplace les <select> de l'application : on peut TAPER quelques lettres pour
  filtrer la liste (la recherche ignore les majuscules et les accents :
  « para » trouve « Paracétamol »).

  Utilisation la plus courante (liste d'objets venant de l'API) :

      <ListeDeroulante
        v-model="formulaire.typeId"
        :options="typesCentre"
        champ-libelle="libelle"          (champ affiché, par défaut "libelle")
        champ-valeur="id"                (champ enregistré, par défaut "id")
        placeholder="— Choisir —"
      />

  Libellé composé (ex. "PARA500 — Paracétamol 500 mg") : passer une fonction
      :champ-libelle="(m) => `${m.code} — ${m.designation}`"

  Liste de textes simples :
      <ListeDeroulante v-model="forme" :options="['Comprimé', 'Sirop']" />

  Autres options :
      :effacable="false"   pas de croix pour vider la valeur (par défaut : vidable)
      obligatoire          champ obligatoire dans un formulaire
      :desactive="true"    liste grisée

  Basé sur la librairie @vueform/multiselect (https://github.com/vueform/multiselect).
  Le style est réglé en bas de src/style.css (section « LISTES DÉROULANTES »).
  =============================================================================
-->
<template>
  <Multiselect
    :model-value="modelValue"
    :options="optionsPreparees"
    value-prop="valeur"
    label="libelle"
    :searchable="true"
    :strict="false"
    :can-clear="effacable"
    :can-deselect="effacable"
    :required="obligatoire"
    :disabled="desactive"
    :placeholder="placeholder"
    :append-to-body="true"
    no-results-text="Aucun résultat"
    no-options-text="Liste vide"
    @update:model-value="(valeur) => emit('update:modelValue', valeur ?? null)"
  />
</template>

<script setup>
import { computed } from 'vue'
import Multiselect from '@vueform/multiselect'

const props = defineProps({
  /** Valeur sélectionnée (v-model) */
  modelValue: { type: [String, Number, Boolean, null], default: null },
  /** Liste des choix : tableau d'objets OU tableau de textes */
  options: { type: Array, default: () => [] },
  /** Champ de l'objet enregistré comme valeur (par défaut "id") */
  champValeur: { type: String, default: 'id' },
  /** Champ affiché (texte) OU fonction qui construit le libellé */
  champLibelle: { type: [String, Function], default: 'libelle' },
  placeholder: { type: String, default: '— Choisir —' },
  effacable: { type: Boolean, default: true },
  obligatoire: { type: Boolean, default: false },
  desactive: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

/**
 * Transforme les options reçues en { valeur, libelle } pour la librairie.
 *   - texte simple  : 'Sirop'  -> { valeur: 'Sirop', libelle: 'Sirop' }
 *   - objet         : { id: 3, libelle: 'CSU' } -> { valeur: 3, libelle: 'CSU' }
 */
const optionsPreparees = computed(() =>
  props.options.map((option) => {
    if (typeof option !== 'object' || option === null) {
      return { valeur: option, libelle: String(option) }
    }
    const libelle =
      typeof props.champLibelle === 'function' ? props.champLibelle(option) : option[props.champLibelle]
    return { valeur: option[props.champValeur], libelle }
  }),
)
</script>

<!-- Style de base de la librairie (le thème vert est dans src/style.css) -->
<style src="@vueform/multiselect/themes/default.css"></style>
