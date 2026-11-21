<!--
  =============================================================================
  CHAMP « SCANNER OU SAISIR LE CODE-BARRES »
  =============================================================================
  Trois façons d'entrer un code, toutes envoyées par l'événement « code » :
    - taper le code au clavier puis Entrée (ou le bouton ✓) ;
    - bouton 📷 : caméra du téléphone / de la tablette (ScannerCamera.vue) ;
    - DOUCHETTE USB (plus tard) : elle tape le code + Entrée dans ce champ,
      aucun réglage à faire.
  Le champ se vide après chaque code et garde le curseur (scans à la suite).

      <ChampCodeBarre autofocus @code="ajouterParCode" />
      <ChampCodeBarre continu @code="..." />   (caméra : boîtes l'une après l'autre)
  =============================================================================
-->
<template>
  <div class="champ-code-barre">
    <span class="icone-code" aria-hidden="true">▥</span>
    <input
      ref="champ"
      v-model.trim="saisie"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :placeholder="placeholder"
      :autofocus="autofocus"
      @keydown.enter.prevent="valider"
    />
    <button v-if="saisie" type="button" class="bouton-ok" title="Valider le code" @click="valider">✓</button>
    <button type="button" class="bouton-camera" title="Scanner avec la caméra" @click="camera = true">
      📷 <span class="libelle-camera">Scanner</span>
    </button>
    <ScannerCamera v-if="camera" :continu="continu" :titre="titreCamera" @lu="envoyer" @fermer="fermerCamera" />
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import ScannerCamera from './ScannerCamera.vue'
import { normaliserCode } from '@/utils/codeBarre'

const props = defineProps({
  placeholder: { type: String, default: 'Scanner ou saisir le code-barres…' },
  autofocus: { type: Boolean, default: false },
  /** Caméra : la fenêtre reste ouverte pour scanner plusieurs boîtes */
  continu: { type: Boolean, default: false },
  titreCamera: { type: String, default: 'Scanner un code-barres' },
})
const emit = defineEmits(['code'])

const champ = ref(null)
const saisie = ref('')
const camera = ref(false)

function envoyer(code) {
  if (code) emit('code', code)
}

function valider() {
  const code = normaliserCode(saisie.value)
  saisie.value = ''
  envoyer(code)
  champ.value?.focus()
}

async function fermerCamera() {
  camera.value = false
  await nextTick()
  champ.value?.focus()
}

/** Remet le curseur dans le champ (après une vente, une erreur…). */
function focus() {
  champ.value?.focus()
}
defineExpose({ focus })

onMounted(() => {
  if (props.autofocus) champ.value?.focus()
})
</script>

<style scoped>
.champ-code-barre {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.3rem 0.3rem 0.75rem;
  border: 2px solid var(--primary);
  border-radius: 12px;
  background: #fff;
}
.champ-code-barre:focus-within { box-shadow: 0 0 0 4px var(--primary-light); }
.icone-code { font-size: 1.2rem; color: var(--primary); }
.champ-code-barre input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  box-shadow: none;
  font-size: 1rem;
  letter-spacing: 0.04em;
  background: transparent;
}
.bouton-ok { padding: 0.45rem 0.7rem; background: #16a34a; }
.bouton-camera { padding: 0.45rem 0.8rem; white-space: nowrap; }
@media (max-width: 420px) {
  .libelle-camera { display: none; }
}
</style>
