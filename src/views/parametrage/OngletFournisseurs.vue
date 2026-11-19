<!--
  =============================================================================
  ONGLET « FOURNISSEURS » (§ 8) — même fonctionnement que le district
  =============================================================================
  Liste + recherche, formulaire en fenêtre, désactivation au lieu de suppression.
  « Historique » : réceptions du fournisseur sur une période.
  =============================================================================
-->
<template>
  <div>
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (code, raison sociale)…" />
      <label class="case-a-cocher">
        <input v-model="afficherInactifs" type="checkbox" /> Afficher les inactifs
      </label>
      <span class="espace"></span>
      <ImportExportTableau
        titre="Liste des fournisseurs"
        :sous-titre="afficherInactifs ? 'Fournisseurs actifs et inactifs' : 'Fournisseurs actifs'"
        nom-fichier="fournisseurs"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="lignesTriees"
        :colonnes-import="COLONNES_IMPORT"
        :importer-ligne="importerLigne"
        @importe="charger"
      />
      <button v-si-modif @click="ouvrirFormulaire()">+ Nouveau fournisseur</button>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="code">Code</ColonneTri>
            <ColonneTri v-model="tri" cle="nom">Raison sociale</ColonneTri>
            <ColonneTri v-model="tri" cle="contact">Contact</ColonneTri>
            <ColonneTri v-model="tri" cle="telephone">Téléphone</ColonneTri>
            <ColonneTri v-model="tri" cle="email">E-mail</ColonneTri>
            <ColonneTri v-model="tri" cle="receptions" class="nombre">Réceptions</ColonneTri>
            <ColonneTri v-model="tri" cle="statut">Statut</ColonneTri>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fournisseur in lignesPage" :key="fournisseur.id" :class="{ 'ligne-inactive': !fournisseur.actif }">
            <td class="code">{{ fournisseur.code }}</td>
            <td><strong>{{ fournisseur.nom }}</strong></td>
            <td>{{ fournisseur.contact || '—' }}</td>
            <td>{{ fournisseur.telephone || '—' }}</td>
            <td>{{ fournisseur.email || '—' }}</td>
            <td class="nombre">
              <span class="badge badge-vert">{{ fournisseur._count?.receptions ?? 0 }}</span>
            </td>
            <td>
              <span class="badge" :class="fournisseur.actif ? 'badge-vert' : 'badge-gris'">
                {{ fournisseur.actif ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td class="actions">
              <button class="bouton-lien" @click="router.push({ name: 'fournisseur', params: { id: fournisseur.id } })">
                Historique
              </button>
              <button v-si-modif class="bouton-lien" @click="ouvrirFormulaire(fournisseur)">Modifier</button>
              <button v-si-modif class="bouton-lien" :class="{ danger: fournisseur.actif }" @click="changerActif(fournisseur)">
                {{ fournisseur.actif ? 'Désactiver' : 'Réactiver' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="fournisseursAffiches.length" />
      <p v-if="!chargement && fournisseursAffiches.length === 0" class="tableau-vide">
        Aucun fournisseur. Cliquez sur « Nouveau fournisseur » pour en ajouter un.
      </p>
      <p v-if="chargement" class="tableau-vide">Chargement…</p>
    </div>

    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur'"
      @fermer="formulaire = null"
    >
      <form id="form-fournisseur" class="grille-formulaire" @submit.prevent="enregistrer">
        <div>
          <label>Code <small class="facultatif">(facultatif)</small></label>
          <!-- Code facultatif : laissé vide, il est généré automatiquement (ex. FRN-0001) -->
          <input v-model.trim="formulaire.code" class="maj" maxlength="30" placeholder="Vide = automatique (ex. LABOREX)" />
        </div>
        <div>
          <label class="obligatoire">Raison sociale</label>
          <input v-model.trim="formulaire.nom" class="maj" required maxlength="150" />
        </div>
        <div>
          <label>Personne à contacter</label>
          <input v-model.trim="formulaire.contact" class="maj" maxlength="150" />
        </div>
        <div>
          <label>Téléphone</label>
          <input v-model.trim="formulaire.telephone" maxlength="50" />
        </div>
        <div>
          <label>E-mail</label>
          <input v-model.trim="formulaire.email" type="email" maxlength="150" />
        </div>
        <div>
          <label>Adresse</label>
          <input v-model.trim="formulaire.adresse" class="maj" maxlength="255" />
        </div>
      </form>

      <template #pied>
        <button class="bouton-secondaire" @click="formulaire = null">Fermer</button>
        <button type="submit" form="form-fournisseur" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import FenetreModale from '@/components/FenetreModale.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { enTexte, sansChampsVides, trouverParCode } from '@/utils/importFichier'

const store = useStore()
const router = useRouter()

const recherche = ref('')
const afficherInactifs = ref(false)
const chargement = ref(false)
const enregistrement = ref(false)
const formulaire = ref(null)

const fournisseurs = computed(() => store.state.referentiel.fournisseurs)

const fournisseursAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return fournisseurs.value.filter((f) => {
    if (!afficherInactifs.value && !f.actif) return false
    if (!texte) return true
    return [f.code, f.nom].some((v) => (v || '').toLowerCase().includes(texte))
  })
})

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('referentiel/charger', { liste: 'fournisseurs' })
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}

function ouvrirFormulaire(fournisseur = null) {
  formulaire.value = fournisseur
    ? { ...fournisseur }
    : { code: '', nom: '', contact: '', telephone: '', email: '', adresse: '' }
}

async function enregistrer() {
  enregistrement.value = true
  try {
    const { id, code, nom, contact, telephone, email, adresse } = formulaire.value
    await store.dispatch('referentiel/enregistrer', {
      liste: 'fournisseurs',
      element: { id, code, nom, contact, telephone, email, adresse },
    })
    store.dispatch('notifications/succes', id ? 'Fournisseur modifié.' : 'Fournisseur créé.')
    // La fenêtre RESTE OUVERTE (l'utilisateur la ferme : × ou Fermer) et les champs sont VIDÉS.
    ouvrirFormulaire()
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

async function changerActif(fournisseur) {
  const confirme = await confirmer({
    titre: fournisseur.actif ? 'Désactiver ce fournisseur ?' : 'Réactiver ce fournisseur ?',
    texte: `« ${fournisseur.nom} »`,
    boutonConfirmer: fournisseur.actif ? 'Oui, désactiver' : 'Oui, réactiver',
    danger: fournisseur.actif,
  })
  if (!confirme) return
  try {
    await store.dispatch('referentiel/changerActif', { liste: 'fournisseurs', element: fournisseur, actif: !fournisseur.actif })
    store.dispatch('notifications/succes', fournisseur.actif ? 'Fournisseur désactivé.' : 'Fournisseur réactivé.')
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

// ---------------------------------------------------------------------------
// EXPORT PDF ET IMPORT DE FICHIER
// ---------------------------------------------------------------------------
const COLONNES_PDF = [
  { titre: 'Code', valeur: (f) => f.code },
  { titre: 'Raison sociale', valeur: (f) => f.nom },
  { titre: 'Contact', valeur: (f) => f.contact },
  { titre: 'Téléphone', valeur: (f) => f.telephone },
  { titre: 'E-mail', valeur: (f) => f.email },
  { titre: 'Statut', valeur: (f) => (f.actif ? 'Actif' : 'Inactif') },
]

const COLONNES_IMPORT = [
  { cle: 'code', titre: 'Code', exemple: 'LABOREX', aide: 'Facultatif : code unique du fournisseur. Vide = code automatique' },
  { cle: 'nom', titre: 'Raison sociale', obligatoire: true, exemple: "LABOREX CÔTE D'IVOIRE" },
  { cle: 'contact', titre: 'Contact', exemple: 'M. KOUASSI', aide: 'Personne à contacter' },
  { cle: 'telephone', titre: 'Téléphone', exemple: '0102030405' },
  { cle: 'email', titre: 'E-mail', exemple: 'commandes@laborex.ci' },
  { cle: 'adresse', titre: 'Adresse', exemple: 'ABIDJAN, ZONE 4' },
]

/** Enregistre UNE ligne : mise à jour si le code existe, sinon création. */
async function importerLigne(valeurs) {
  const existant = trouverParCode(fournisseurs.value, valeurs.code)
  const element = sansChampsVides({
    id: existant?.id,
    code: enTexte(valeurs.code),
    nom: enTexte(valeurs.nom),
    contact: enTexte(valeurs.contact),
    telephone: enTexte(valeurs.telephone),
    email: enTexte(valeurs.email),
    adresse: enTexte(valeurs.adresse),
  })
  await store.dispatch('referentiel/enregistrer', { liste: 'fournisseurs', element })
  return existant ? 'modifie' : 'cree'
}

// « Data table » : tri en cliquant sur les en-têtes + pagination.
const VALEURS_TRI = {
  code: (f) => f.code,
  nom: (f) => f.nom,
  contact: (f) => f.contact,
  telephone: (f) => f.telephone,
  email: (f) => f.email,
  receptions: (f) => f._count?.receptions ?? 0,
  statut: (f) => (f.actif ? 'Actif' : 'Inactif'),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(fournisseursAffiches, [recherche, afficherInactifs], VALEURS_TRI)

onMounted(charger)
</script>
