<!--
  Mise en page principale (sans menu latéral, pleine largeur), comme l'application de district :
    - barre du haut : logo (retour à l'accueil), fil d'Ariane « Accueil › Module › Page »,
      alertes permanentes « Stock bas » et « Péremption ≤ N j » (§ 13.3, actualisées
      automatiquement), bouton Accueil, utilisateur connecté, « Mon mot de passe », déconnexion ;
    - en dessous : la page en cours sur toute la largeur.
  On choisit un module depuis les tuiles de l'accueil.
-->
<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import Icone from './Icone.vue'
import MonMotDePasse from './MonMotDePasse.vue'
import { moduleParRoute } from '../utils/modules'
import { ROLES } from '../utils/roles'
import { utiliserDeconnexionAuto } from '../utils/deconnexionAuto'
import { utiliserActualisation } from '../utils/actualisation'

const store = useStore()
const router = useRouter()
const route = useRoute()

const utilisateur = computed(() => store.state.auth.utilisateur)
const initiales = computed(() =>
  (utilisateur.value?.nom ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((m) => m[0])
    .join(''),
)
const surAccueil = computed(() => route.name === 'accueil')

/** Module de la page en cours (meta.module sur les sous-pages, sinon le nom de la route). */
const module = computed(() => moduleParRoute(route.meta.module ?? route.name))
/** Titre d'une sous-page (ex. « Nouvelle réception »). */
const sousPage = computed(() => route.meta.titre)

const fenetreMotDePasse = ref(false)

// Déconnexion automatique après inactivité (délai : Paramètres généraux)
utiliserDeconnexionAuto()

// Alertes permanentes d'en-tête (§ 13.3) : pas pour le médecin (ni quantités ni stock)
const voitAlertes = computed(() => store.getters['auth/role'] !== 'MEDECIN')
const alertes = computed(() => store.state.alertes.enTete)
function chargerAlertes() {
  if (voitAlertes.value) store.dispatch('alertes/chargerEnTete').catch(() => {})
}
chargerAlertes()
utiliserActualisation(chargerAlertes)

function deconnexion() {
  store.dispatch('auth/deconnexion')
  router.push({ name: 'connexion' })
}
</script>

<template>
  <div class="layout">
    <header class="barre-haut">
      <router-link :to="{ name: 'accueil' }" class="logo" title="Retour à l'accueil">
        <span class="logo-croix">✚</span>
        <span>
          <span class="logo-titre">PHARMASTOCK</span>
          <span class="logo-sous-titre">Gestion de stock de la pharmacie</span>
        </span>
      </router-link>

      <nav v-if="!surAccueil" class="fil-ariane" aria-label="Fil d'Ariane">
        <router-link :to="{ name: 'accueil' }">Accueil</router-link>
        <template v-if="module">
          <span class="separateur">›</span>
          <router-link v-if="sousPage" :to="{ name: module.route }">{{ module.titre }}</router-link>
          <span v-else class="page-courante">{{ module.titre }}</span>
        </template>
        <template v-if="sousPage">
          <span class="separateur">›</span>
          <span class="page-courante">{{ sousPage }}</span>
        </template>
      </nav>

      <div class="droite">
        <div v-if="voitAlertes" class="alertes-entete">
          <router-link
            :to="{ name: 'alertes', query: { onglet: 'stock-bas' } }"
            class="alerte-entete rouge"
            :class="{ zero: !alertes.stockBas }"
            title="Produits en rupture ou sous stock"
          >
            <Icone nom="attention" :taille="16" />
            <span>Stock bas</span>
            <strong>{{ alertes.stockBas }}</strong>
          </router-link>
          <router-link
            :to="{ name: 'alertes', query: { onglet: 'peremptions' } }"
            class="alerte-entete orange"
            :class="{ zero: !alertes.peremption }"
            :title="alertes.perimes ? `${alertes.perimes} lot(s) déjà périmé(s)` : 'Lots qui périment bientôt'"
          >
            <Icone nom="calendrier" :taille="16" />
            <span>Péremption ≤ {{ alertes.delai }} j</span>
            <strong>{{ alertes.peremption }}</strong>
          </router-link>
        </div>

        <router-link v-if="!surAccueil" :to="{ name: 'accueil' }" class="bouton-accueil">
          <Icone nom="accueil" :taille="18" />
          <span>Accueil</span>
        </router-link>

        <div class="utilisateur">
          <!-- Sur téléphone, toucher l'avatar ouvre « Mon mot de passe » -->
          <button type="button" class="avatar" title="Mon mot de passe" @click="fenetreMotDePasse = true">{{ initiales }}</button>
          <span class="utilisateur-infos">
            <span class="utilisateur-nom">{{ utilisateur?.nom }}</span>
            <span class="utilisateur-role">{{ ROLES[utilisateur?.role] ?? utilisateur?.role }}</span>
          </span>
        </div>

        <button class="bouton-mdp" title="Changer mon mot de passe" @click="fenetreMotDePasse = true">
          <Icone nom="cle" :taille="18" />
          <span>Mon mot de passe</span>
        </button>

        <button class="bouton-deconnexion" title="Se déconnecter" aria-label="Se déconnecter" @click="deconnexion">
          <Icone nom="deconnexion" :taille="18" />
        </button>
      </div>
    </header>

    <main class="contenu">
      <router-view />
    </main>

    <MonMotDePasse v-if="fenetreMotDePasse" @fermer="fenetreMotDePasse = false" />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ─── Barre du haut (blanche, collée en haut) ─── */
.barre-haut {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.7rem 2rem;
  background: #fff;
  box-shadow: 0 2px 12px rgb(2 136 209 / 0.08);
}
/* Liseré dégradé bleu sous la barre */
.barre-haut::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primaire), var(--ciel));
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--texte);
  text-decoration: none;
  flex-shrink: 0;
}
.logo > span:last-child {
  display: flex;
  flex-direction: column;
}
.logo-croix {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  color: #fff;
  background: linear-gradient(135deg, var(--ciel), var(--primaire));
  box-shadow: 0 4px 10px rgb(2 136 209 / 0.35);
}
.logo-titre {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--primaire-fonce);
  letter-spacing: 0.02em;
}
.logo-sous-titre {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--gris);
}

/* ─── Fil d'Ariane ─── */
.fil-ariane {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--bord);
  font-size: 0.95rem;
  min-width: 0;
}
.fil-ariane a {
  color: var(--gris);
  text-decoration: none;
  white-space: nowrap;
}
.fil-ariane a:hover {
  color: var(--primaire);
}
.separateur {
  color: #b0bec5;
  font-size: 1.2rem;
}
.page-courante {
  font-weight: 700;
  color: var(--texte);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Partie droite ─── */
.droite {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.bouton-accueil {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  background: var(--ciel-pale);
  color: var(--primaire-fonce);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
}
.bouton-accueil:hover {
  background: var(--primaire);
  color: #fff;
}
.utilisateur {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.avatar {
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--ciel), var(--primaire));
}
.utilisateur-infos {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.utilisateur-nom {
  font-weight: 600;
  font-size: 0.9rem;
}
.utilisateur-role {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primaire);
}
.bouton-mdp {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.8rem;
  border: none;
  border-radius: 8px;
  background: #f1f6fa;
  color: #455a64;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.bouton-mdp:hover {
  background: var(--ciel-pale);
  color: var(--primaire-fonce);
}
.bouton-deconnexion {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: #fdecec;
  color: var(--danger);
  cursor: pointer;
}
.bouton-deconnexion:hover {
  background: var(--danger);
  color: #fff;
}

/* ─── Alertes permanentes (§ 13.3) ─── */
.alertes-entete {
  display: flex;
  gap: 0.5rem;
}
.alerte-entete {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.alerte-entete strong {
  min-width: 22px;
  padding: 0 0.4rem;
  border-radius: 999px;
  color: #fff;
  text-align: center;
}
.alerte-entete.rouge {
  background: #fdecec;
  color: var(--danger);
}
.alerte-entete.rouge strong {
  background: var(--danger);
}
.alerte-entete.orange {
  background: #fff1e0;
  color: #b35c00;
}
.alerte-entete.orange strong {
  background: #ef6c00;
}
.alerte-entete.zero {
  background: #f1f6fa;
  color: var(--gris);
}
.alerte-entete.zero strong {
  background: #b0bec5;
}
.alerte-entete:hover {
  filter: brightness(0.96);
}

/* ─── Contenu pleine largeur ─── */
.contenu {
  flex: 1;
  padding: 1.75rem 2rem;
}

/* Écran moyen : la barre garde l'essentiel sur une ligne (icônes seules pour le mot de passe) */
.bouton-mdp,
.bouton-accueil {
  white-space: nowrap;
}
@media (max-width: 1500px) {
  .bouton-mdp span,
  .logo-sous-titre {
    display: none;
  }
  .barre-haut {
    gap: 1rem;
  }
}
/* Téléphone (§ 17) : logo seul, alertes en pastilles, avatar et déconnexion */
@media (max-width: 600px) {
  .logo-titre,
  .bouton-accueil,
  .bouton-mdp {
    display: none;
  }
  .barre-haut {
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }
  .droite {
    gap: 0.4rem;
  }
  .alertes-entete {
    gap: 0.3rem;
  }
  .alerte-entete {
    padding: 0.35rem 0.5rem;
  }
  .logo-croix,
  .avatar,
  .bouton-deconnexion {
    width: 34px;
    height: 34px;
  }
  .contenu {
    padding: 0.85rem 0.75rem;
  }
}
@media (max-width: 900px) {
  .barre-haut {
    padding: 0.6rem 1rem;
    gap: 0.75rem;
  }
  .logo-sous-titre,
  .utilisateur-infos,
  .bouton-accueil span,
  .bouton-mdp span,
  .alerte-entete span,
  .fil-ariane {
    display: none;
  }
  .contenu {
    padding: 1.25rem 1rem;
  }
}
</style>
