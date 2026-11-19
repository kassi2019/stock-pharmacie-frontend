<script setup>
import { computed, reactive, ref } from 'vue'
import FenetreModale from './FenetreModale.vue'
import api from '../services/api'
import { erreur, succes } from '../utils/alertes'

const emit = defineEmits(['fermer'])

const f = reactive({ ancien: '', nouveau: '', confirmation: '' })
const enCours = ref(false)

const regles = computed(() => [
  { ok: f.nouveau.length >= 8, texte: 'Au moins 8 caractères' },
  { ok: /[A-Za-z]/.test(f.nouveau) && /\d/.test(f.nouveau), texte: 'Au moins une lettre et un chiffre' },
  { ok: !!f.nouveau && f.nouveau === f.confirmation, texte: 'Confirmation identique' },
])
const valide = computed(() => f.ancien && regles.value.every((r) => r.ok))

async function enregistrer() {
  if (!valide.value) return
  enCours.value = true
  try {
    await api.patch('/auth/mot-de-passe', { ancien: f.ancien, nouveau: f.nouveau })
    succes('Mot de passe modifié')
    emit('fermer')
  } catch (e) {
    erreur(e)
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <FenetreModale titre="Changer mon mot de passe" @fermer="emit('fermer')">
    <form id="form-mdp" class="champs" @submit.prevent="enregistrer">
      <label>
        Mot de passe actuel
        <input v-model="f.ancien" type="password" autocomplete="current-password" required autofocus />
      </label>
      <label>
        Nouveau mot de passe
        <input v-model="f.nouveau" type="password" autocomplete="new-password" required />
      </label>
      <label>
        Confirmer le nouveau mot de passe
        <input v-model="f.confirmation" type="password" autocomplete="new-password" required />
      </label>
      <ul class="regles">
        <li v-for="r in regles" :key="r.texte" :class="{ ok: r.ok }">
          {{ r.ok ? '✔' : '○' }} {{ r.texte }}
        </li>
      </ul>
    </form>
    <template #pied>
      <button class="btn" @click="emit('fermer')">Annuler</button>
      <button form="form-mdp" class="btn btn-primaire" :disabled="!valide || enCours">Enregistrer</button>
    </template>
  </FenetreModale>
</template>

<style scoped>
.champs {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.regles {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
  color: var(--gris);
}
.regles li.ok {
  color: #2e7d32;
}
</style>
