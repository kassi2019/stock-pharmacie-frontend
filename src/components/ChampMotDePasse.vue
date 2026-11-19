<!--
  Champ de saisie d'un MOT DE PASSE avec bouton « Afficher / Masquer ».

  Utilisation :
      <ChampMotDePasse v-model="formulaire.motDePasse" placeholder="8 caractères minimum" />

  - autocomplete : "new-password" (par défaut, nouveau mot de passe) ou
                   "current-password" (mot de passe actuel)
  - obligatoire  : champ requis dans le formulaire
-->
<template>
  <div class="champ-mdp">
    <input
      :value="modelValue"
      :type="visible ? 'text' : 'password'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="obligatoire"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <button type="button" class="bouton-oeil" @click="visible = !visible">
      {{ visible ? 'Masquer' : 'Afficher' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'new-password' },
  obligatoire: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

// true = mot de passe affiché en clair
const visible = ref(false)
</script>

<style scoped>
.champ-mdp { position: relative; }
.champ-mdp input { padding-right: 5.5rem; }
.bouton-oeil {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.3rem 0.6rem;
  background: transparent;
  color: var(--primary);
  font-size: 0.8rem;
}
.bouton-oeil:hover { background: var(--primary-light); }
</style>
