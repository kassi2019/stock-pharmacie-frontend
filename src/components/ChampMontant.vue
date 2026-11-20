<!--
  =============================================================================
  CHAMP DE SAISIE D'UN MONTANT (avec séparateur de milliers)
  =============================================================================
  Remplace <input type="number"> pour les montants et les prix : pendant la
  saisie, l'utilisateur voit « 1 250 000 » au lieu de « 1250000 ».
  La valeur renvoyée (v-model) reste un NOMBRE (ou null si le champ est vide).

  Utilisation :
      <ChampMontant v-model="formulaire.montant" required />
      <ChampMontant v-model="ligne.prixUnitaire" decimales />   (prix avec centimes)

  Propriétés :
    - modelValue : le montant (nombre ou null) ;
    - decimales  : autorise une virgule (ex. 12,50). Par défaut : entiers.
  Événements :
    - update:modelValue (pour v-model) ;
    - input : émis APRÈS la mise à jour du v-model, seulement quand
      l'utilisateur tape (pratique pour réagir à sa saisie).
  Les autres attributs (required, placeholder, class, disabled…) vont
  directement sur le champ.
  =============================================================================
-->
<template>
  <input ref="champ" :value="texte" type="text" :inputmode="decimales ? 'decimal' : 'numeric'" autocomplete="off" class="champ-montant" @input="saisie" />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  decimales: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'input'])

const champ = ref(null)
const texte = ref(formater(props.modelValue))

/** Nombre -> texte affiché (« 1250000.5 » -> « 1 250 000,5 »). */
function formater(valeur) {
  if (valeur === null || valeur === undefined || valeur === '' || Number.isNaN(Number(valeur))) return ''
  const [entier, decimal] = String(Number(valeur)).split('.')
  return grouper(entier) + (decimal ? `,${decimal}` : '')
}

/** Ajoute un espace tous les 3 chiffres : « 1250000 » -> « 1 250 000 ». */
function grouper(chiffres) {
  return chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Texte tapé -> texte nettoyé et regroupé + nombre correspondant. */
function analyser(brut) {
  let propre = brut.replace(props.decimales ? /[^\d,.]/g : /\D/g, '').replace('.', ',')
  if (props.decimales) {
    // Une seule virgule, 2 chiffres maximum après
    const [entier, ...reste] = propre.split(',')
    propre = reste.length ? `${entier},${reste.join('').slice(0, 2)}` : entier
  }
  const [entier, decimal] = propre.split(',')
  const entierSansZeros = entier.replace(/^0+(?=\d)/, '')
  const affiche = grouper(entierSansZeros) + (decimal !== undefined ? `,${decimal}` : '')
  const nombre = propre === '' || propre === ',' ? null : Number(`${entierSansZeros || 0}.${decimal || 0}`)
  return { affiche, nombre }
}

/** À chaque frappe : on regroupe les chiffres et on garde le curseur au bon endroit. */
function saisie(evenement) {
  const element = evenement.target
  const curseur = element.selectionStart ?? element.value.length
  // Nombre de chiffres (et virgule) avant le curseur, pour le replacer ensuite
  const significatifsAvant = element.value.slice(0, curseur).replace(/[^\d,.]/g, '').length

  const { affiche, nombre } = analyser(element.value)
  texte.value = affiche
  element.value = affiche

  let position = 0
  let vus = 0
  while (position < affiche.length && vus < significatifsAvant) {
    if (affiche[position] !== ' ') vus++
    position++
  }
  element.setSelectionRange(position, position)

  emit('update:modelValue', nombre)
  emit('input', nombre)
}

// Valeur changée par le programme (ex. répartition automatique) : on réaffiche
watch(
  () => props.modelValue,
  (valeur) => {
    const actuel = analyser(texte.value).nombre
    const nouveau = valeur === '' || valeur === null || valeur === undefined ? null : Number(valeur)
    if (actuel !== nouveau) texte.value = formater(valeur)
  },
)
</script>

<style scoped>
.champ-montant { text-align: right; font-variant-numeric: tabular-nums; }
</style>
