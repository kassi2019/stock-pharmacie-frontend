<!--
  =============================================================================
  ONGLET « COMPTES UTILISATEURS » — même fonctionnement que le district
  =============================================================================
  - Liste des comptes (recherche, filtre par profil, inactifs, tri, pagination, PDF) ;
  - « Nouveau compte » : pour un membre du PERSONNEL qui n'a pas encore de
    compte (nom, fonction et contacts viennent de sa fiche) ;
  - « Modifier » : profil (l'identité se modifie dans l'onglet Personnel) ;
  - L'IDENTIFIANT DE CONNEXION est le MATRICULE de la personne (grisé) ;
  - « Mot de passe » : réinitialisation ; « Désactiver » / « Réactiver ».
  Règles (vérifiées aussi par le serveur) :
    - mot de passe : 8 caractères minimum, au moins une lettre et un chiffre ;
    - on ne peut pas désactiver son propre compte ;
    - il doit toujours rester au moins un administrateur actif ;
    - seul un administrateur donne le profil Administrateur.

  Propriétés : comptes, personnel, profils (chargés par UtilisateursView.vue)
  Événement  : @modifie -> la page recharge les listes
  =============================================================================
-->
<template>
  <div>
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (nom, identifiant, fonction)…" />
      <div class="filtre">
        <ListeDeroulante v-model="profilFiltre" :options="listeProfils" placeholder="Tous les profils" />
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
            <ColonneTri v-model="tri" cle="profil">Profil</ColonneTri>
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
                <Avatar :photo="u.personnel?.photo" :nom="u.nom" :prenoms="u.prenoms" />
                <div>
                  <strong>{{ u.prenoms }} {{ u.nom }}</strong>
                  <span v-if="u.id === moi.id" class="badge badge-vert vous">vous</span>
                  <div class="code">{{ u.matricule }}</div>
                </div>
              </div>
            </td>
            <td>{{ u.fonction?.libelle || '—' }}</td>
            <td>
              <span class="badge" :class="u.role === 'ADMIN' ? 'badge-rouge' : 'badge-vert'">{{ u.roleLibelle }}</span>
            </td>
            <td class="contact">
              <div v-if="u.telephone">{{ u.telephone }}</div>
              <div v-if="u.email">{{ u.email }}</div>
              <span v-if="!u.telephone && !u.email">—</span>
            </td>
            <td>{{ u.derniereConnexion ? dateHeure(u.derniereConnexion) : 'Jamais' }}</td>
            <td>
              <span class="badge" :class="u.actif ? 'badge-vert' : 'badge-gris'">{{ u.actif ? 'Actif' : 'Inactif' }}</span>
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
      <p v-if="comptesAffiches.length === 0" class="tableau-vide">Aucun compte.</p>
    </div>

    <!-- ===================== FORMULAIRE CRÉATION / MODIFICATION ===================== -->
    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? 'Modifier le compte' : 'Nouveau compte utilisateur'"
      large
      @fermer="formulaire = null"
    >
      <form id="form-compte" class="grille-formulaire" @submit.prevent="enregistrer">
        <h4 class="section pleine-largeur">Titulaire du compte</h4>
        <div v-if="!formulaire.id" class="pleine-largeur">
          <label class="obligatoire">Membre du personnel</label>
          <ListeDeroulante
            v-model="formulaire.personnelId"
            :options="personnelSansCompte"
            :champ-libelle="(p) => `${p.matricule} — ${p.prenoms || ''} ${p.nom}${p.fonction ? ' (' + p.fonction.libelle + ')' : ''}`"
            placeholder="Choisir une personne sans compte…"
          />
          <small class="aide">
            Seul le personnel actif sans compte est proposé. Pour une nouvelle personne, utilisez
            l'onglet « Personnel » (fiche + compte en une fois).
          </small>
        </div>
        <div v-else class="pleine-largeur titulaire">
          <Avatar :photo="formulaire.personnel?.photo" :nom="formulaire.nom" :prenoms="formulaire.prenoms" :taille="48" />
          <div>
            <strong>{{ formulaire.prenoms }} {{ formulaire.nom }}</strong>
            <small>
              {{ [formulaire.matricule, formulaire.fonction?.libelle].filter(Boolean).join(' · ') }}
              — nom, fonction et contacts se modifient dans l'onglet « Personnel ».
            </small>
          </div>
        </div>

        <h4 class="section pleine-largeur">Compte</h4>
        <div>
          <label>Identifiant de connexion</label>
          <input :value="identifiantAffiche" disabled />
          <small class="aide">C'est le matricule (il se change dans l'onglet « Personnel »).</small>
        </div>
        <div>
          <label class="obligatoire">Profil</label>
          <ListeDeroulante v-model="formulaire.role" :options="profilsProposes" obligatoire :effacable="false" />
          <small v-if="profilChoisi" class="aide">{{ profilChoisi.description }}</small>
        </div>

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
      :titre="`Nouveau mot de passe — ${reinitialisation.utilisateur.prenoms || ''} ${reinitialisation.utilisateur.nom}`"
      @fermer="reinitialisation = null"
    >
      <form id="form-reinit" class="grille-formulaire" @submit.prevent="enregistrerReinitialisation">
        <div>
          <label class="obligatoire">Nouveau mot de passe</label>
          <ChampMotDePasse v-model="reinitialisation.motDePasse" obligatoire />
        </div>
        <div>
          <label class="obligatoire">Confirmation</label>
          <ChampMotDePasse v-model="reinitialisation.confirmation" obligatoire />
        </div>
        <p class="aide pleine-largeur">L'ancien mot de passe de « {{ reinitialisation.utilisateur.matricule }} » ne fonctionnera plus.</p>
      </form>
      <template #pied>
        <button class="bouton-secondaire" @click="reinitialisation = null">Fermer</button>
        <button type="submit" form="form-reinit" :disabled="enregistrement">Enregistrer</button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import ChampMotDePasse from '@/components/ChampMotDePasse.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import Avatar from '@/components/Avatar.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { dateHeure } from '@/utils/format'
import { creerCompte, modifierCompte, reinitialiserMotDePasse, verifierMotDePasse } from '@/api/utilisateurs'

const props = defineProps({
  comptes: { type: Array, required: true },
  personnel: { type: Array, required: true },
  profils: { type: Array, required: true },
})
const emit = defineEmits(['modifie'])

const store = useStore()
const moi = computed(() => store.state.auth.utilisateur || {})

const recherche = ref('')
const profilFiltre = ref(null)
const afficherInactifs = ref(false)
const enregistrement = ref(false)
const formulaire = ref(null)
const reinitialisation = ref(null)

const listeProfils = computed(() => props.profils.map((p) => ({ id: p.code, libelle: p.libelle })))
/** Profil Administrateur proposé seulement à un administrateur. */
const profilsProposes = computed(() => listeProfils.value.filter((p) => p.id !== 'ADMIN' || moi.value.role === 'ADMIN'))
const profilChoisi = computed(() => props.profils.find((p) => p.code === formulaire.value?.role))

const comptesAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return props.comptes.filter((u) => {
    if (!afficherInactifs.value && !u.actif) return false
    if (profilFiltre.value && u.role !== profilFiltre.value) return false
    if (!texte) return true
    return [u.nom, u.prenoms, u.matricule, u.fonction?.libelle].some((v) => (v || '').toLowerCase().includes(texte))
  })
})

/** Personnel actif sans compte (pour « Nouveau compte »). */
const personnelSansCompte = computed(() => props.personnel.filter((p) => p.actif && p.comptes.length === 0))

const identifiantAffiche = computed(() => {
  const f = formulaire.value
  if (!f) return ''
  if (f.id) return f.matricule
  return personnelSansCompte.value.find((p) => p.id === f.personnelId)?.matricule || '— choisir la personne —'
})

function ouvrirFormulaire(u = null) {
  formulaire.value = u ? { ...u } : { personnelId: null, role: 'AGENT', motDePasse: '', confirmation: '' }
}

async function enregistrer() {
  const f = formulaire.value
  enregistrement.value = true
  try {
    if (f.id) {
      await modifierCompte(f.id, { role: f.role })
      store.dispatch('notifications/succes', 'Compte modifié.')
      formulaire.value = null
    } else {
      if (!f.personnelId) return store.dispatch('notifications/erreur', 'Choisissez le membre du personnel.')
      const probleme = verifierMotDePasse(f.motDePasse, f.confirmation)
      if (probleme) return store.dispatch('notifications/erreur', probleme)
      await creerCompte({ personnelId: f.personnelId, role: f.role, motDePasse: f.motDePasse })
      store.dispatch('notifications/succes', 'Compte créé.')
      ouvrirFormulaire()
    }
    emit('modifie')
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

function ouvrirReinitialisation(utilisateur) {
  reinitialisation.value = { utilisateur, motDePasse: '', confirmation: '' }
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
  const nom = `${u.prenoms || ''} ${u.nom}`.trim()
  const confirme = await confirmer({
    titre: u.actif ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?',
    texte: u.actif ? `« ${nom} » ne pourra plus se connecter.` : `« ${nom} » pourra de nouveau se connecter.`,
    boutonConfirmer: u.actif ? 'Oui, désactiver' : 'Oui, réactiver',
    danger: u.actif,
  })
  if (!confirme) return
  try {
    await modifierCompte(u.id, { actif: !u.actif })
    store.dispatch('notifications/succes', u.actif ? 'Compte désactivé.' : 'Compte réactivé.')
    emit('modifie')
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

// ---------------------------------------------------------------------------
// Tri, pagination, PDF
// ---------------------------------------------------------------------------
const VALEURS_TRI = {
  utilisateur: (u) => `${u.nom} ${u.prenoms || ''}`,
  fonction: (u) => u.fonction?.libelle,
  profil: (u) => u.roleLibelle,
  connexion: (u) => u.derniereConnexion || '',
  statut: (u) => (u.actif ? 'Actif' : 'Inactif'),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(
  comptesAffiches,
  [recherche, profilFiltre, afficherInactifs],
  VALEURS_TRI,
)

const COLONNES_PDF = [
  { titre: 'Identifiant', valeur: (u) => u.matricule },
  { titre: 'Nom et prénoms', valeur: (u) => `${u.nom} ${u.prenoms || ''}`.trim() },
  { titre: 'Fonction', valeur: (u) => u.fonction?.libelle },
  { titre: 'Profil', valeur: (u) => u.roleLibelle },
  { titre: 'Téléphone', valeur: (u) => u.telephone },
  { titre: 'Dernière connexion', valeur: (u) => (u.derniereConnexion ? dateHeure(u.derniereConnexion) : 'Jamais') },
  { titre: 'Statut', valeur: (u) => (u.actif ? 'Actif' : 'Inactif') },
]
</script>

<style scoped>
.contact { font-size: 0.85rem; }
.personne { display: flex; align-items: center; gap: 0.6rem; }
.vous { margin-left: 0.4rem; }
.titulaire {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--primary-light);
}
.titulaire small { display: block; color: var(--muted); }
</style>
