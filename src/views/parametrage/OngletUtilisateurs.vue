<!--
  =============================================================================
  ONGLET « UTILISATEURS » (§ 5) — même fonctionnement que l'onglet Comptes du district
  =============================================================================
  - Liste des comptes (recherche, filtre par rôle, inactifs, tri, pagination, PDF) ;
  - « Nouveau compte » : matricule (identifiant de connexion), identité, rôle, mot de passe ;
  - « Modifier » : identité, contact et rôle (le matricule ne change pas) ;
  - « Mot de passe » : réinitialisation ; « Désactiver » / « Réactiver ».
  Règles (vérifiées aussi par le serveur) :
    - mot de passe : 8 caractères minimum, au moins une lettre et un chiffre ;
    - on ne peut pas désactiver son propre compte ;
    - il doit toujours rester au moins un administrateur actif.
  =============================================================================
-->
<template>
  <div>
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (nom, matricule)…" />
      <div class="filtre">
        <ListeDeroulante v-model="roleFiltre" :options="LISTE_ROLES" placeholder="Tous les rôles" />
      </div>
      <label class="case-a-cocher">
        <input v-model="afficherInactifs" type="checkbox" /> Afficher les inactifs
      </label>
      <span class="espace"></span>
      <ImportExportTableau
        titre="Liste des comptes utilisateurs"
        :sous-titre="afficherInactifs ? 'Comptes actifs et inactifs' : 'Comptes actifs'"
        nom-fichier="comptes_utilisateurs"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="lignesTriees"
      />
      <button v-si-modif @click="ouvrirFormulaire()">+ Nouveau compte</button>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="utilisateur">Utilisateur</ColonneTri>
            <ColonneTri v-model="tri" cle="fonction">Fonction</ColonneTri>
            <ColonneTri v-model="tri" cle="role">Rôle</ColonneTri>
            <th>Contact</th>
            <ColonneTri v-model="tri" cle="connexion">Dernière connexion</ColonneTri>
            <ColonneTri v-model="tri" cle="statut">Statut</ColonneTri>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in lignesPage" :key="u.id" :class="{ 'ligne-inactive': !u.actif }">
            <td>
              <div class="personne">
                <span class="avatar">{{ initiales(u) }}</span>
                <div>
                  <strong>{{ [u.prenoms, u.nom].filter(Boolean).join(' ') }}</strong>
                  <span v-if="u.id === moi.id" class="badge badge-vert vous">vous</span>
                  <div class="code">{{ u.matricule }}</div>
                </div>
              </div>
            </td>
            <td>{{ u.fonction?.libelle || '—' }}</td>
            <td>
              <span class="badge" :class="u.role === 'ADMIN' ? 'badge-rouge' : 'badge-vert'">
                {{ ROLES[u.role] ?? u.role }}
              </span>
            </td>
            <td class="contact">
              <div v-if="u.telephone">{{ u.telephone }}</div>
              <div v-if="u.email">{{ u.email }}</div>
              <span v-if="!u.telephone && !u.email">—</span>
            </td>
            <td>{{ u.derniereConnexion ? dateHeure(u.derniereConnexion) : 'Jamais' }}</td>
            <td>
              <span class="badge" :class="u.actif ? 'badge-vert' : 'badge-gris'">
                {{ u.actif ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td class="actions">
              <button v-si-modif class="bouton-lien" @click="ouvrirFormulaire(u)">Modifier</button>
              <button v-si-modif class="bouton-lien" @click="ouvrirReinitialisation(u)">Mot de passe</button>
              <button
                v-si-modif
                class="bouton-lien"
                :class="{ danger: u.actif }"
                :disabled="u.id === moi.id"
                :title="u.id === moi.id ? 'Vous ne pouvez pas désactiver votre propre compte' : ''"
                @click="changerActif(u)"
              >
                {{ u.actif ? 'Désactiver' : 'Réactiver' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="comptesAffiches.length" />
      <p v-if="!chargement && comptesAffiches.length === 0" class="tableau-vide">Aucun compte.</p>
      <p v-if="chargement" class="tableau-vide">Chargement…</p>
    </div>

    <!-- ===================== FORMULAIRE CRÉATION / MODIFICATION ===================== -->
    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? 'Modifier le compte' : 'Nouveau compte utilisateur'"
      large
      @fermer="formulaire = null"
    >
      <form id="form-compte" class="grille-formulaire" @submit.prevent="enregistrer">
        <!-- ---------- Identité ---------- -->
        <h4 class="section pleine-largeur">Identité</h4>
        <div>
          <label class="obligatoire">Nom</label>
          <input v-model.trim="formulaire.nom" class="maj" required maxlength="100" />
        </div>
        <div>
          <label>Prénoms</label>
          <input v-model.trim="formulaire.prenoms" class="maj" maxlength="150" />
        </div>
        <div>
          <label>Fonction</label>
          <ListeDeroulante v-model="formulaire.fonctionId" :options="fonctions" placeholder="— Aucune —" />
          <small v-if="fonctions.length === 0" class="aide">Aucune fonction : ajoutez-en dans l'onglet « Fonctions ».</small>
        </div>
        <div>
          <label>Téléphone</label>
          <input v-model.trim="formulaire.telephone" maxlength="50" />
        </div>
        <div>
          <label>E-mail</label>
          <input v-model.trim="formulaire.email" type="email" maxlength="150" />
        </div>

        <!-- ---------- Compte ---------- -->
        <h4 class="section pleine-largeur">Compte</h4>
        <div>
          <label :class="{ obligatoire: !formulaire.id }">Matricule (identifiant de connexion)</label>
          <input
            v-model.trim="formulaire.matricule"
            class="maj"
            :disabled="!!formulaire.id"
            :required="!formulaire.id"
            maxlength="30"
            placeholder="ex. PH001"
          />
          <small v-if="formulaire.id" class="aide">Le matricule ne se modifie pas.</small>
        </div>
        <div>
          <label class="obligatoire">Rôle</label>
          <ListeDeroulante v-model="formulaire.role" :options="LISTE_ROLES" obligatoire :effacable="false" />
          <small v-if="formulaire.role" class="aide">{{ DESCRIPTIONS_ROLES[formulaire.role] }}</small>
        </div>

        <!-- Mot de passe : seulement à la création (ensuite : bouton « Mot de passe ») -->
        <template v-if="!formulaire.id">
          <h4 class="section pleine-largeur">Mot de passe</h4>
          <div>
            <label class="obligatoire">Mot de passe</label>
            <ChampMotDePasse v-model="formulaire.motDePasse" obligatoire placeholder="8 caractères, lettres et chiffres" />
          </div>
          <div>
            <label class="obligatoire">Confirmation</label>
            <ChampMotDePasse v-model="formulaire.confirmation" obligatoire placeholder="Retapez le mot de passe" />
          </div>
          <p class="aide pleine-largeur">
            Au moins 8 caractères, dont au moins une lettre et un chiffre. Communiquez-le à l'utilisateur :
            il pourra le changer lui-même (bouton « Mon mot de passe » en haut de l'écran).
          </p>
        </template>
      </form>

      <template #pied>
        <button class="bouton-secondaire" @click="formulaire = null">Fermer</button>
        <button type="submit" form="form-compte" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </template>
    </FenetreModale>

    <!-- ===================== RÉINITIALISATION DU MOT DE PASSE ===================== -->
    <FenetreModale
      v-if="reinitialisation"
      :titre="`Nouveau mot de passe — ${[reinitialisation.utilisateur.prenoms, reinitialisation.utilisateur.nom].filter(Boolean).join(' ')}`"
      @fermer="reinitialisation = null"
    >
      <form id="form-reinit" class="grille-formulaire" @submit.prevent="enregistrerReinitialisation">
        <div>
          <label class="obligatoire">Nouveau mot de passe</label>
          <ChampMotDePasse v-model="reinitialisation.motDePasse" obligatoire placeholder="8 caractères, lettres et chiffres" />
        </div>
        <div>
          <label class="obligatoire">Confirmation</label>
          <ChampMotDePasse v-model="reinitialisation.confirmation" obligatoire placeholder="Retapez le mot de passe" />
        </div>
        <p class="aide pleine-largeur">L'ancien mot de passe ne fonctionnera plus.</p>
      </form>
      <template #pied>
        <button class="bouton-secondaire" @click="reinitialisation = null">Fermer</button>
        <button type="submit" form="form-reinit" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import ChampMotDePasse from '@/components/ChampMotDePasse.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { dateHeure } from '@/utils/format'
import { DESCRIPTIONS_ROLES, LISTE_ROLES, ROLES } from '@/utils/roles'
import { reinitialiserMotDePasse } from '@/api/parametrage'

const store = useStore()
const moi = computed(() => store.state.auth.utilisateur ?? {})

const recherche = ref('')
const roleFiltre = ref(null)
const afficherInactifs = ref(false)
const chargement = ref(false)
const enregistrement = ref(false)
const formulaire = ref(null)
const reinitialisation = ref(null)

const comptes = computed(() => store.state.referentiel.utilisateurs)
const fonctions = computed(() => store.state.referentiel.fonctions)

const comptesAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return comptes.value.filter((u) => {
    if (!afficherInactifs.value && !u.actif) return false
    if (roleFiltre.value && u.role !== roleFiltre.value) return false
    if (!texte) return true
    return [u.nom, u.prenoms, u.matricule].some((v) => (v || '').toLowerCase().includes(texte))
  })
})

const initiales = (u) => [u.prenoms, u.nom].filter(Boolean).map((m) => m[0]).join('').slice(0, 2)

/** Vérifie les règles du mot de passe (les mêmes que le serveur). */
function verifierMotDePasse(motDePasse, confirmation) {
  if (motDePasse.length < 8 || !/[A-Za-z]/.test(motDePasse) || !/\d/.test(motDePasse)) {
    return 'Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.'
  }
  if (motDePasse !== confirmation) return 'La confirmation ne correspond pas au mot de passe.'
  return null
}

async function charger() {
  chargement.value = true
  try {
    await Promise.all([
      store.dispatch('referentiel/charger', { liste: 'utilisateurs' }),
      store.dispatch('referentiel/charger', { liste: 'fonctions' }),
    ])
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}

function ouvrirFormulaire(u = null) {
  formulaire.value = u
    ? { ...u }
    : { matricule: '', nom: '', prenoms: '', fonctionId: null, telephone: '', email: '', role: 'AGENT', motDePasse: '', confirmation: '' }
}

async function enregistrer() {
  const f = formulaire.value
  if (!f.id) {
    const probleme = verifierMotDePasse(f.motDePasse, f.confirmation)
    if (probleme) return store.dispatch('notifications/erreur', probleme)
  }
  enregistrement.value = true
  try {
    const element = f.id
      ? { id: f.id, nom: f.nom, prenoms: f.prenoms, fonctionId: f.fonctionId, telephone: f.telephone, email: f.email, role: f.role }
      : {
          matricule: f.matricule,
          nom: f.nom,
          prenoms: f.prenoms,
          fonctionId: f.fonctionId,
          telephone: f.telephone,
          email: f.email,
          role: f.role,
          motDePasse: f.motDePasse,
        }
    await store.dispatch('referentiel/enregistrer', { liste: 'utilisateurs', element })
    store.dispatch('notifications/succes', f.id ? 'Compte modifié.' : 'Compte créé.')
    if (f.id) formulaire.value = null
    else ouvrirFormulaire()
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

function ouvrirReinitialisation(u) {
  reinitialisation.value = { utilisateur: u, motDePasse: '', confirmation: '' }
}

async function enregistrerReinitialisation() {
  const r = reinitialisation.value
  const probleme = verifierMotDePasse(r.motDePasse, r.confirmation)
  if (probleme) return store.dispatch('notifications/erreur', probleme)
  enregistrement.value = true
  try {
    await reinitialiserMotDePasse(r.utilisateur.id, r.motDePasse)
    store.dispatch('notifications/succes', 'Mot de passe réinitialisé.')
    reinitialisation.value = null
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

async function changerActif(u) {
  const nom = [u.prenoms, u.nom].filter(Boolean).join(' ')
  const confirme = await confirmer({
    titre: u.actif ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?',
    texte: u.actif ? `${nom} ne pourra plus se connecter.` : nom,
    boutonConfirmer: u.actif ? 'Oui, désactiver' : 'Oui, réactiver',
    danger: u.actif,
  })
  if (!confirme) return
  try {
    await store.dispatch('referentiel/changerActif', { liste: 'utilisateurs', element: u, actif: !u.actif })
    store.dispatch('notifications/succes', u.actif ? 'Compte désactivé.' : 'Compte réactivé.')
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

const COLONNES_PDF = [
  { titre: 'Matricule', valeur: (u) => u.matricule },
  { titre: 'Nom et prénoms', valeur: (u) => [u.nom, u.prenoms].filter(Boolean).join(' ') },
  { titre: 'Fonction', valeur: (u) => u.fonction?.libelle },
  { titre: 'Rôle', valeur: (u) => ROLES[u.role] ?? u.role },
  { titre: 'Téléphone', valeur: (u) => u.telephone },
  { titre: 'Dernière connexion', valeur: (u) => (u.derniereConnexion ? dateHeure(u.derniereConnexion) : 'Jamais') },
  { titre: 'Statut', valeur: (u) => (u.actif ? 'Actif' : 'Inactif') },
]

const VALEURS_TRI = {
  utilisateur: (u) => `${u.nom} ${u.prenoms ?? ''}`,
  fonction: (u) => u.fonction?.libelle,
  role: (u) => ROLES[u.role],
  connexion: (u) => u.derniereConnexion,
  statut: (u) => (u.actif ? 'Actif' : 'Inactif'),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(
  comptesAffiches,
  [recherche, roleFiltre, afficherInactifs],
  VALEURS_TRI,
)

onMounted(charger)
</script>

<style scoped>
.personne {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--primary));
}
.vous {
  margin-left: 0.4rem;
}
.contact {
  font-size: 0.85rem;
}
</style>
