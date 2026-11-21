<!--
  =============================================================================
  ONGLET « PERSONNEL » — même fonctionnement que le district
  =============================================================================
  Fiches du personnel : PHOTO d'identité (facultative), matricule (obligatoire,
  c'est l'identifiant de connexion), nom et prénoms (obligatoires), fonction
  (Paramétrage > Fonctions), date d'embauche, contacts.
  ➜ Lieu d'affectation : la PHARMACIE, affichée en GRISÉ (Paramètres généraux).

  - « Nouvelle personne » : la fiche, et SI ON LE SOUHAITE le compte de
    connexion en même temps (case « Créer aussi un compte utilisateur » :
    profil, mot de passe). Tout est enregistré en une fois.
    ➜ L'IDENTIFIANT DE CONNEXION est le MATRICULE (grisé, non saisi).
  - « Créer un compte » : pour une personne qui n'en a pas encore.
  - « Modifier » : nom, fonction et contacts sont mis à jour dans son compte ;
    si le matricule change, l'identifiant de connexion change aussi.
  - « Désactiver » : la fiche ET son compte. Une fiche n'est jamais supprimée.
  Le salaire se gère dans le module « Gestion de la paie ».

  Propriétés : personnel, profils (chargés par UtilisateursView.vue)
  Événement  : @modifie -> la page recharge les listes
  =============================================================================
-->
<template>
  <div>
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (matricule, nom, fonction)…" />
      <div class="filtre">
        <ListeDeroulante v-model="compteFiltre" :options="OPTIONS_COMPTE" placeholder="Avec ou sans compte" />
      </div>
      <label class="case-a-cocher">
        <input v-model="afficherInactifs" type="checkbox" /> Afficher les inactifs
      </label>
      <span class="espace"></span>
      <ImportExportTableau
        titre="Liste du personnel"
        :sous-titre="afficherInactifs ? 'Personnel actif et inactif' : 'Personnel actif'"
        nom-fichier="personnel"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="lignesTriees"
        :colonnes-import="peutModifier ? COLONNES_IMPORT : null"
        :importer-ligne="importerLigne"
        @importe="emit('modifie')"
      />
      <button v-si-modif @click="ouvrirFormulaire()">+ Nouvelle personne</button>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="matricule">Matricule</ColonneTri>
            <ColonneTri v-model="tri" cle="nom">Nom et prénoms</ColonneTri>
            <ColonneTri v-model="tri" cle="fonction">Fonction</ColonneTri>
            <ColonneTri v-model="tri" cle="embauche">Embauche</ColonneTri>
            <th>Contact</th>
            <ColonneTri v-model="tri" cle="compte">Compte utilisateur</ColonneTri>
            <ColonneTri v-model="tri" cle="statut">Statut</ColonneTri>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in lignesPage" :key="p.id" :class="{ 'ligne-inactive': !p.actif }">
            <td class="code">{{ p.matricule }}</td>
            <td>
              <div class="personne">
                <Avatar :photo="p.photo" :nom="p.nom" :prenoms="p.prenoms" />
                <strong>{{ p.prenoms }} {{ p.nom }}</strong>
              </div>
            </td>
            <td>{{ p.fonction?.libelle || '—' }}</td>
            <td>{{ p.dateEmbauche ? date(p.dateEmbauche) : '—' }}</td>
            <td class="contact">
              <div v-if="p.telephone">{{ p.telephone }}</div>
              <div v-if="p.email">{{ p.email }}</div>
              <span v-if="!p.telephone && !p.email">—</span>
            </td>
            <td>
              <template v-if="p.comptes.length">
                <span class="code">{{ p.comptes[0].matricule }}</span>
                <span class="badge" :class="p.comptes[0].role === 'ADMIN' ? 'badge-rouge' : 'badge-vert'">
                  {{ libelleProfil(p.comptes[0].role) }}
                </span>
                <span v-if="!p.comptes[0].actif" class="badge badge-gris">inactif</span>
              </template>
              <span v-else class="sans-compte">Aucun compte</span>
            </td>
            <td>
              <span class="badge" :class="p.actif ? 'badge-vert' : 'badge-gris'">{{ p.actif ? 'Actif' : 'Inactif' }}</span>
            </td>
            <td class="actions">
              <button v-si-modif class="bouton-lien" @click="ouvrirFormulaire(p)">Modifier</button>
              <button v-if="!p.comptes.length && p.actif" v-si-modif class="bouton-lien" @click="ouvrirFormulaire(p, true)">
                Créer un compte
              </button>
              <button
                v-si-modif
                class="bouton-lien"
                :class="{ danger: p.actif }"
                :disabled="p.comptes[0]?.id === moi.id"
                :title="p.comptes[0]?.id === moi.id ? 'Vous ne pouvez pas désactiver votre propre fiche' : ''"
                @click="changerActif(p)"
              >
                {{ p.actif ? 'Désactiver' : 'Réactiver' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="personnelAffiche.length" />
      <p v-if="personnelAffiche.length === 0" class="tableau-vide">
        Aucun membre du personnel. Cliquez sur « Nouvelle personne » pour en ajouter un.
      </p>
    </div>

    <!-- ===================== FORMULAIRE PERSONNEL (+ COMPTE) ===================== -->
    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? 'Modifier la fiche du personnel' : 'Nouvelle personne'"
      large
      @fermer="formulaire = null"
    >
      <form id="form-personnel" class="grille-formulaire" @submit.prevent="enregistrer">
        <!-- ---------- Photo d'identité ---------- -->
        <div class="pleine-largeur bloc-photo">
          <Avatar :photo="formulaire.photo" :nom="formulaire.nom" :prenoms="formulaire.prenoms" :taille="96" />
          <div>
            <strong>Photo d'identité</strong>
            <small class="aide">Facultative. JPEG ou PNG ; elle est recadrée en carré et réduite automatiquement.</small>
            <div class="boutons-photo">
              <label class="bouton-photo">
                <input type="file" accept="image/*" hidden @change="choisirPhoto" />
                {{ formulaire.photo ? 'Changer la photo' : 'Charger une photo' }}
              </label>
              <button v-if="formulaire.photo" type="button" class="bouton-lien danger" @click="formulaire.photo = null">Retirer</button>
            </div>
          </div>
        </div>

        <!-- ---------- Identité ---------- -->
        <h4 class="section pleine-largeur">Identité</h4>
        <div>
          <label class="obligatoire">Matricule</label>
          <input
            v-model.trim="formulaire.matricule"
            class="maj"
            required
            maxlength="30"
            pattern="[a-zA-Z0-9._\-]+"
            title="Le matricule sert d'identifiant de connexion : lettres, chiffres, points, tirets ou soulignés (pas d'espace ni d'accent)"
            placeholder="ex. PH-001"
          />
        </div>
        <div>
          <label>Fonction</label>
          <ListeDeroulante v-model="formulaire.fonctionId" :options="fonctions" placeholder="— Choisir une fonction —" />
          <small v-if="fonctions.length === 0" class="aide">Aucune fonction : ajoutez-en dans Paramétrage > Fonctions.</small>
        </div>
        <div>
          <label class="obligatoire">Nom</label>
          <input v-model.trim="formulaire.nom" class="maj" required maxlength="100" placeholder="ex. BAMBA" />
        </div>
        <div>
          <label class="obligatoire">Prénoms</label>
          <input v-model.trim="formulaire.prenoms" class="maj" required maxlength="150" placeholder="ex. AWA MARIE" />
        </div>
        <div>
          <label>Date d'embauche</label>
          <ChampDate v-model="formulaire.dateEmbauche" />
        </div>

        <!-- ---------- Affectation ---------- -->
        <h4 class="section pleine-largeur">Affectation</h4>
        <div class="pleine-largeur">
          <label>Lieu d'affectation</label>
          <!-- Grisé : le personnel est affecté à la pharmacie (Paramètres généraux) -->
          <input :value="pharmacie.nom" disabled />
          <small v-if="pharmacie.contact" class="aide">{{ pharmacie.contact }}</small>
        </div>

        <!-- ---------- Contact ---------- -->
        <h4 class="section pleine-largeur">Contact</h4>
        <div>
          <label>Téléphone</label>
          <input v-model.trim="formulaire.telephone" maxlength="50" />
        </div>
        <div>
          <label>E-mail</label>
          <input v-model.trim="formulaire.email" type="email" maxlength="150" />
        </div>

        <!-- ---------- Compte utilisateur ---------- -->
        <h4 class="section pleine-largeur">Compte utilisateur</h4>
        <div v-if="formulaire.compteExistant" class="pleine-largeur compte-existant">
          <span>
            Compte <strong class="code">{{ formulaire.compteExistant.matricule }}</strong>
            — profil {{ libelleProfil(formulaire.compteExistant.role) }}
          </span>
          <small>
            Profil et mot de passe se gèrent dans l'onglet « Comptes utilisateurs ».
            Si vous changez le matricule, l'identifiant de connexion change aussi.
          </small>
        </div>
        <template v-else>
          <div class="pleine-largeur">
            <label class="case-a-cocher case-compte">
              <input v-model="formulaire.creerCompte" type="checkbox" />
              Créer aussi un compte utilisateur (pour se connecter à l'application)
            </label>
          </div>
          <template v-if="formulaire.creerCompte">
            <div>
              <label>Identifiant de connexion</label>
              <input :value="(formulaire.matricule || '').toUpperCase() || '— saisir le matricule —'" disabled />
              <small class="aide">C'est le matricule de la personne.</small>
            </div>
            <div>
              <label class="obligatoire">Profil</label>
              <ListeDeroulante v-model="formulaire.role" :options="profilsProposes" obligatoire :effacable="false" />
              <small v-if="profilChoisi" class="aide">{{ profilChoisi.description }}</small>
            </div>
            <div>
              <label class="obligatoire">Mot de passe</label>
              <ChampMotDePasse v-model="formulaire.motDePasse" obligatoire placeholder="8 caractères, lettres et chiffres" />
            </div>
            <div>
              <label class="obligatoire">Confirmation</label>
              <ChampMotDePasse v-model="formulaire.confirmation" obligatoire placeholder="Retapez le mot de passe" />
            </div>
            <p class="aide pleine-largeur">
              Au moins 8 caractères, dont au moins une lettre et un chiffre. La personne pourra le changer
              elle-même (bouton « Mon mot de passe »).
            </p>
          </template>
        </template>
      </form>

      <template #pied>
        <button class="bouton-secondaire" @click="formulaire = null">Fermer</button>
        <button type="submit" form="form-personnel" :disabled="enregistrement">
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
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import ChampMotDePasse from '@/components/ChampMotDePasse.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import Avatar from '@/components/Avatar.vue'
import { preparerPhoto } from '@/utils/photo'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { date } from '@/utils/format'
import { infosPharmacie } from '@/utils/exportPdf'
import { enDateImport, enTexte, sansChampsVides, trouverParCode } from '@/utils/importFichier'
import { creerComptePersonnel, creerPersonnel, modifierPersonnel, verifierMotDePasse } from '@/api/utilisateurs'

const props = defineProps({
  personnel: { type: Array, required: true },
  profils: { type: Array, required: true },
})
const emit = defineEmits(['modifie'])

const store = useStore()
const moi = computed(() => store.state.auth.utilisateur || {})
const peutModifier = computed(() => store.getters['auth/peutModifier']('utilisateurs'))

const OPTIONS_COMPTE = [
  { id: 'AVEC', libelle: 'Avec un compte' },
  { id: 'SANS', libelle: 'Sans compte' },
]

const recherche = ref('')
const compteFiltre = ref(null)
const afficherInactifs = ref(false)
const enregistrement = ref(false)
const formulaire = ref(null)

/** Pharmacie (lieu d'affectation), lue dans les Paramètres généraux. */
const pharmacie = ref({ nom: 'Pharmacie', contact: '' })
onMounted(async () => {
  try {
    pharmacie.value = await infosPharmacie()
  } catch {
    // « Pharmacie » par défaut
  }
})

const fonctions = computed(() => store.state.referentiel.fonctions)
const libelleProfil = (code) => props.profils.find((p) => p.code === code)?.libelle ?? code

const personnelAffiche = computed(() => {
  const texte = recherche.value.toLowerCase()
  return props.personnel.filter((p) => {
    if (!afficherInactifs.value && !p.actif) return false
    if (compteFiltre.value === 'AVEC' && p.comptes.length === 0) return false
    if (compteFiltre.value === 'SANS' && p.comptes.length > 0) return false
    if (!texte) return true
    return [p.matricule, p.nom, p.prenoms, p.fonction?.libelle].some((v) => (v || '').toLowerCase().includes(texte))
  })
})

/** Profils proposés (Administrateur seulement pour un administrateur) : { id: code, libelle }. */
const profilsProposes = computed(() =>
  props.profils.filter((p) => p.code !== 'ADMIN' || moi.value.role === 'ADMIN').map((p) => ({ id: p.code, libelle: p.libelle })),
)
const profilChoisi = computed(() => props.profils.find((p) => p.code === formulaire.value?.role))

/**
 * Ouvre le formulaire.
 * @param personne    fiche à modifier (null = nouvelle personne)
 * @param avecCompte  true = case « Créer aussi un compte » déjà cochée
 */
function ouvrirFormulaire(personne = null, avecCompte = false) {
  const base = personne
    ? {
        id: personne.id,
        matricule: personne.matricule,
        nom: personne.nom,
        prenoms: personne.prenoms || '',
        fonctionId: personne.fonctionId,
        dateEmbauche: personne.dateEmbauche ? personne.dateEmbauche.slice(0, 10) : '',
        telephone: personne.telephone || '',
        email: personne.email || '',
        photo: personne.photo || null,
        compteExistant: personne.comptes[0] || null,
      }
    : { matricule: '', nom: '', prenoms: '', fonctionId: null, dateEmbauche: '', telephone: '', email: '', photo: null, compteExistant: null }
  formulaire.value = { ...base, creerCompte: avecCompte, role: 'AGENT', motDePasse: '', confirmation: '' }
}

async function choisirPhoto(evenement) {
  const fichier = evenement.target.files[0]
  evenement.target.value = ''
  if (!fichier) return
  try {
    formulaire.value.photo = await preparerPhoto(fichier)
  } catch (erreur) {
    store.dispatch('notifications/erreur', erreur.message)
  }
}

const videEnNull = (v) => (v === '' ? null : v)

async function enregistrer() {
  const f = formulaire.value
  if (f.creerCompte) {
    if (!f.role) return store.dispatch('notifications/erreur', 'Choisissez le profil du compte.')
    const probleme = verifierMotDePasse(f.motDePasse, f.confirmation)
    if (probleme) return store.dispatch('notifications/erreur', probleme)
  }
  const compte = f.creerCompte ? { role: f.role, motDePasse: f.motDePasse } : undefined

  enregistrement.value = true
  try {
    const fiche = {
      matricule: f.matricule,
      nom: f.nom,
      prenoms: f.prenoms,
      fonctionId: f.fonctionId,
      dateEmbauche: f.dateEmbauche,
      telephone: f.telephone,
      email: f.email,
      photo: f.photo,
    }
    if (f.id) {
      await modifierPersonnel(f.id, Object.fromEntries(Object.entries(fiche).map(([k, v]) => [k, videEnNull(v)])))
      if (compte) await creerComptePersonnel(f.id, compte)
    } else {
      await creerPersonnel({ ...sansChampsVides(fiche), ...(compte ? { compte } : {}) })
    }
    store.dispatch('notifications/succes', compte ? 'Fiche et compte utilisateur enregistrés.' : f.id ? 'Fiche modifiée.' : 'Personne ajoutée.')
    // La fenêtre reste ouverte et vidée pour une nouvelle saisie (comme le district)
    ouvrirFormulaire()
    emit('modifie')
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

async function changerActif(personne) {
  const nom = `${personne.prenoms || ''} ${personne.nom}`.trim()
  const aUnCompte = personne.comptes.length > 0
  const confirme = await confirmer({
    titre: personne.actif ? 'Désactiver cette personne ?' : 'Réactiver cette personne ?',
    texte: personne.actif
      ? `« ${nom} » n'apparaîtra plus dans les listes.${aUnCompte ? ' Son compte est aussi désactivé : elle ne pourra plus se connecter.' : ''}`
      : `« ${nom} » sera de nouveau active.${aUnCompte ? ' Son compte est aussi réactivé.' : ''}`,
    boutonConfirmer: personne.actif ? 'Oui, désactiver' : 'Oui, réactiver',
    danger: personne.actif,
  })
  if (!confirme) return
  try {
    await modifierPersonnel(personne.id, { actif: !personne.actif })
    store.dispatch('notifications/succes', personne.actif ? 'Personne désactivée.' : 'Personne réactivée.')
    emit('modifie')
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

// ---------------------------------------------------------------------------
// Tri, pagination, PDF / Excel et import
// ---------------------------------------------------------------------------
const VALEURS_TRI = {
  matricule: (p) => p.matricule,
  nom: (p) => `${p.nom} ${p.prenoms || ''}`,
  fonction: (p) => p.fonction?.libelle,
  embauche: (p) => p.dateEmbauche || '',
  compte: (p) => p.comptes[0]?.matricule,
  statut: (p) => (p.actif ? 'Actif' : 'Inactif'),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(
  personnelAffiche,
  [recherche, compteFiltre, afficherInactifs],
  VALEURS_TRI,
)

const COLONNES_PDF = [
  { titre: 'Matricule', valeur: (p) => p.matricule },
  { titre: 'Nom et prénoms', valeur: (p) => `${p.nom} ${p.prenoms || ''}`.trim() },
  { titre: 'Fonction', valeur: (p) => p.fonction?.libelle },
  { titre: 'Embauche', valeur: (p) => date(p.dateEmbauche) },
  { titre: 'Téléphone', valeur: (p) => p.telephone },
  { titre: 'E-mail', valeur: (p) => p.email },
  { titre: 'Compte', valeur: (p) => (p.comptes[0] ? `${p.comptes[0].matricule} (${libelleProfil(p.comptes[0].role)})` : 'Aucun') },
  { titre: 'Statut', valeur: (p) => (p.actif ? 'Actif' : 'Inactif') },
]

/** Fichier d'import (les comptes se créent ensuite dans l'application). */
const COLONNES_IMPORT = [
  { cle: 'matricule', titre: 'Matricule', obligatoire: true, exemple: 'PH-001', aide: "Unique, sans espace (identifiant de connexion). S'il existe déjà, la fiche est mise à jour" },
  { cle: 'nom', titre: 'Nom', obligatoire: true, exemple: 'BAMBA' },
  { cle: 'prenoms', titre: 'Prénoms', obligatoire: true, exemple: 'AWA MARIE' },
  { cle: 'fonction', titre: 'Fonction', exemple: 'PHARMACIEN', aide: "Code ou libellé d'une fonction (créée si elle n'existe pas)" },
  { cle: 'dateEmbauche', titre: "Date d'embauche", exemple: '01/03/2024' },
  { cle: 'telephone', titre: 'Téléphone', exemple: '0102030405' },
  { cle: 'email', titre: 'E-mail', exemple: 'a.bamba@pharmacie.ci' },
]

/** Une ligne du fichier : mise à jour si le matricule existe, sinon création. */
async function importerLigne(valeurs) {
  let fonctionId = null
  const fonctionTexte = enTexte(valeurs.fonction)
  if (fonctionTexte) {
    const trouvee =
      trouverParCode(fonctions.value, fonctionTexte) ||
      fonctions.value.find((f) => f.libelle.toLowerCase() === fonctionTexte.toLowerCase())
    if (trouvee) fonctionId = trouvee.id
    else {
      const creee = await store.dispatch('referentiel/enregistrer', { liste: 'fonctions', element: { libelle: fonctionTexte } })
      await store.dispatch('referentiel/charger', { liste: 'fonctions' })
      fonctionId = creee.id
    }
  }
  const matricule = enTexte(valeurs.matricule).toUpperCase()
  const existant = props.personnel.find((p) => p.matricule === matricule)
  const fiche = sansChampsVides({
    matricule,
    nom: enTexte(valeurs.nom),
    prenoms: enTexte(valeurs.prenoms),
    fonctionId,
    dateEmbauche: enDateImport(valeurs.dateEmbauche, "Date d'embauche"),
    telephone: enTexte(valeurs.telephone),
    email: enTexte(valeurs.email),
  })
  if (existant) await modifierPersonnel(existant.id, fiche)
  else await creerPersonnel(fiche)
  return existant ? 'modifie' : 'cree'
}
</script>

<style scoped>
.contact { font-size: 0.85rem; }
.personne { display: flex; align-items: center; gap: 0.6rem; }
.sans-compte { font-size: 0.82rem; color: var(--muted); font-style: italic; }
td .code + .badge { margin-left: 0.4rem; }
.case-compte { font-weight: 600; }

/* Photo d'identité dans le formulaire */
.bloc-photo { display: flex; align-items: center; gap: 1.1rem; }
.bloc-photo strong { color: var(--texte-sur-fond); }
.bloc-photo .aide { display: block; }
.boutons-photo { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.45rem; }
.bouton-photo {
  display: inline-block;
  margin: 0;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1.5px solid var(--primary);
  background: #fff;
  color: var(--primary-dark);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.bouton-photo:hover { background: var(--primary-light); }
.compte-existant {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary-dark);
}
.compte-existant small { color: var(--muted); }
</style>
