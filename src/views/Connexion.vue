<script setup>
import { ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { messageErreur } from '../services/api'
import illustration from '../assets/illustration-pharmacie.svg'

const store = useStore()
const router = useRouter()

const matricule = ref('')
const motDePasse = ref('')
const voirMotDePasse = ref(false)
const message = ref('')
const enCours = ref(false)

async function connexion() {
  message.value = ''
  enCours.value = true
  try {
    await store.dispatch('auth/connexion', {
      matricule: matricule.value.trim().toUpperCase(),
      motDePasse: motDePasse.value,
    })
    // Après la connexion : toujours la page d'accueil des modules
    router.replace({ name: 'accueil' })
  } catch (e) {
    message.value = messageErreur(e)
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div class="page">
    <!-- Côté gauche : illustration -->
    <section class="visuel" aria-hidden="true">
      <div class="bulle bulle-1"></div>
      <div class="bulle bulle-2"></div>
      <div class="bulle bulle-3"></div>
      <div class="visuel-contenu">
        <img :src="illustration" alt="" />
        <h2>Votre stock, toujours sous contrôle</h2>
        <p>Suivi par lot, péremptions, seuils et traçabilité de chaque mouvement.</p>
      </div>
    </section>

    <!-- Côté droit : formulaire -->
    <section class="cote-formulaire">
      <form @submit.prevent="connexion">
        <div class="logo">
          <span class="croix">✚</span>
        </div>
        <h1>Bienvenue</h1>
        <p class="sous-titre">Connectez-vous à la gestion de stock de la pharmacie</p>

        <label>
          Matricule
          <input
            v-model="matricule"
            class="maj"
            autocomplete="username"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="Votre matricule"
            required
            autofocus
          />
        </label>

        <label>
          Mot de passe
          <span class="champ-mdp">
            <input
              v-model="motDePasse"
              :type="voirMotDePasse ? 'text' : 'password'"
              autocomplete="current-password"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              placeholder="Votre mot de passe"
              required
            />
            <button
              type="button"
              class="oeil"
              :aria-label="voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              @click="voirMotDePasse = !voirMotDePasse"
            >
              {{ voirMotDePasse ? 'Masquer' : 'Afficher' }}
            </button>
          </span>
        </label>

        <p v-if="message" class="erreur" role="alert">{{ message }}</p>

        <button class="valider" :disabled="enCours">
          {{ enCours ? 'Connexion…' : 'Se connecter' }}
        </button>

        <p class="pied">Clinique — Module Gestion de stock</p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.page {
  --ciel: #4fc3f7;
  --ciel-fonce: #0288d1;
  --ciel-pale: #e1f5fe;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: #fff;
}

/* ─── Gauche ─── */
.visuel {
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 3rem;
  background: linear-gradient(160deg, #e1f5fe 0%, #b3e5fc 55%, #81d4fa 100%);
}
.visuel-contenu {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 520px;
}
.visuel img {
  width: 100%;
  max-width: 460px;
  filter: drop-shadow(0 18px 30px rgb(2 136 209 / 0.18));
  animation: flotter 6s ease-in-out infinite;
}
.visuel h2 {
  font-size: 1.6rem;
  color: #01579b;
  margin: 1.5rem 0 0.5rem;
}
.visuel p {
  color: #0277bd;
  margin: 0;
  font-size: 1rem;
}
.bulle {
  position: absolute;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.35);
}
.bulle-1 {
  width: 320px;
  height: 320px;
  top: -90px;
  left: -90px;
}
.bulle-2 {
  width: 220px;
  height: 220px;
  bottom: -60px;
  right: 8%;
}
.bulle-3 {
  width: 90px;
  height: 90px;
  top: 18%;
  right: 12%;
  background: rgb(255 255 255 / 0.5);
}

@keyframes flotter {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* ─── Droite ─── */
.cote-formulaire {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  padding: 2rem;
  background: linear-gradient(180deg, #f5fbff 0%, #eaf6fd 100%);
}
form {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 2.5rem 2.25rem 2rem;
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgb(79 195 247 / 0.18);
  /* Ombre douce en plusieurs couches, teintée de bleu */
  box-shadow:
    0 1px 2px rgb(2 136 209 / 0.06),
    0 8px 16px rgb(2 136 209 / 0.08),
    0 24px 48px rgb(2 136 209 / 0.14);
}
.logo {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--ciel-pale);
  margin-bottom: 0.25rem;
}
.croix {
  color: var(--ciel-fonce);
  font-size: 1.8rem;
  line-height: 1;
}
h1 {
  font-size: 1.9rem;
  color: #01579b;
}
.sous-titre {
  margin: -0.6rem 0 0.75rem;
  color: #607d8b;
}
label {
  color: #455a64;
  font-size: 0.9rem;
}
input {
  padding: 0.75rem 0.9rem;
  border: 1.5px solid #cfe9f7;
  border-radius: 10px;
  background: #f7fcff;
  font-size: 1rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
input:focus {
  outline: none;
  border-color: var(--ciel);
  background: #fff;
  box-shadow: 0 0 0 4px rgb(79 195 247 / 0.2);
}
.champ-mdp {
  position: relative;
  display: flex;
}
.champ-mdp input {
  flex: 1;
  padding-right: 5.5rem;
}
.oeil {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--ciel-fonce);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
}
.valider {
  margin-top: 0.4rem;
  padding: 0.85rem;
  border: none;
  border-radius: 10px;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--ciel), var(--ciel-fonce));
  box-shadow: 0 8px 20px rgb(2 136 209 / 0.25);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.valider:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgb(2 136 209 / 0.32);
}
.valider:disabled {
  opacity: 0.6;
  cursor: wait;
}
.erreur {
  margin: 0;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: #ffebee;
  color: #c62828;
  font-size: 0.9rem;
}
.pied {
  margin: 1rem 0 0;
  text-align: center;
  color: #90a4ae;
  font-size: 0.8rem;
}

/* ─── Petits écrans : formulaire seul ─── */
@media (max-width: 860px) {
  .page {
    grid-template-columns: minmax(0, 1fr);
  }
  .visuel {
    display: none;
  }
  .cote-formulaire {
    background: linear-gradient(160deg, #e1f5fe, #f5fbff 60%);
    padding: 1rem;
  }
  form {
    padding: 2rem 1.5rem 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .visuel img {
    animation: none;
  }
}
</style>
