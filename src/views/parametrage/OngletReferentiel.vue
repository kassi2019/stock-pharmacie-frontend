<!--
  =============================================================================
  ONGLET « LISTE DE RÉFÉRENCE » (code + libellé) — même fonctionnement que les
  onglets Formes, Familles, Unités de vente et Fonctions du district
  =============================================================================
  Un seul écran pour ces 4 listes : ParametrageView.vue lui passe la configuration
  (voir LISTES_SIMPLES). Une ligne peut être supprimée seulement si elle n'est
  pas utilisée (le bouton « Supprimer » est alors grisé).
  =============================================================================
-->
<template>
  <div>
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" :placeholder="config.recherche" />
      <span class="espace"></span>
      <ImportExportTableau
        :titre="config.titre"
        :nom-fichier="config.fichier"
        :colonnes-pdf="colonnesPdf"
        :lignes="lignesTriees"
        :colonnes-import="colonnesImport"
        :importer-ligne="importerLigne"
        @importe="charger"
      />
      <button v-si-modif @click="ouvrirFormulaire()">{{ config.boutonNouveau }}</button>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="code">Code</ColonneTri>
            <ColonneTri v-model="tri" cle="libelle">Libellé</ColonneTri>
            <ColonneTri v-if="config.avecCategorie" v-model="tri" cle="categorie">Catégorie</ColonneTri>
            <ColonneTri v-model="tri" cle="utilisations" class="nombre">{{ config.colonneCompte }}</ColonneTri>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="element in lignesPage" :key="element.id">
            <td class="code">{{ element.code }}</td>
            <td><strong>{{ element.libelle }}</strong></td>
            <td v-if="config.avecCategorie">{{ element.categorie || '—' }}</td>
            <td class="nombre">
              <span class="badge badge-vert">{{ utilisations(element) }}</span>
            </td>
            <td class="actions">
              <button v-si-modif class="bouton-lien" @click="ouvrirFormulaire(element)">Modifier</button>
              <button
                v-si-modif
                class="bouton-lien danger"
                :disabled="utilisations(element) > 0"
                :title="utilisations(element) > 0 ? config.messageUtilise : ''"
                @click="supprimer(element)"
              >
                Supprimer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="elementsAffiches.length" />
      <p v-if="!chargement && elementsAffiches.length === 0" class="tableau-vide">
        Aucun élément. Cliquez sur « {{ config.boutonNouveau.replace('+ ', '') }} » pour en ajouter un.
      </p>
      <p v-if="chargement" class="tableau-vide">Chargement…</p>
    </div>

    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? config.titreModifier : config.titreNouveau"
      @fermer="formulaire = null"
    >
      <form :id="idFormulaire" class="grille-formulaire" @submit.prevent="enregistrer">
        <div>
          <label>Code <small class="facultatif">(facultatif)</small></label>
          <!-- Code facultatif : laissé vide, il est généré automatiquement -->
          <input v-model.trim="formulaire.code" class="maj" maxlength="30" :placeholder="`Vide = automatique (ex. ${config.exempleCode})`" />
        </div>
        <div>
          <label class="obligatoire">Libellé</label>
          <input v-model.trim="formulaire.libelle" class="maj" required maxlength="100" :placeholder="`ex. ${config.exempleLibelle}`" />
        </div>
        <div v-if="config.avecCategorie" class="pleine-largeur">
          <label>Catégorie</label>
          <input v-model.trim="formulaire.categorie" class="maj" maxlength="100" placeholder="ex. Anti-infectieux" />
        </div>
      </form>

      <template #pied>
        <button class="bouton-secondaire" @click="formulaire = null">Fermer</button>
        <button type="submit" :form="idFormulaire" :disabled="enregistrement">
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
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { enTexte, sansChampsVides, trouverParCode } from '@/utils/importFichier'

const props = defineProps({
  /**
   * Configuration de la liste :
   * { liste, compte, titre, fichier, recherche, boutonNouveau, titreNouveau, titreModifier,
   *   colonneCompte, messageUtilise, exempleCode, exempleLibelle, avecCategorie, nomElement }
   */
  config: { type: Object, required: true },
})

const store = useStore()
const c = props.config
const idFormulaire = `form-${c.liste}`

const recherche = ref('')
const chargement = ref(false)
const enregistrement = ref(false)
const formulaire = ref(null)

const elements = computed(() => store.state.referentiel[c.liste])
const utilisations = (e) => e._count?.[c.compte] ?? 0

const elementsAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  if (!texte) return elements.value
  return elements.value.filter((e) => [e.code, e.libelle, e.categorie].some((v) => (v || '').toLowerCase().includes(texte)))
})

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('referentiel/charger', { liste: c.liste })
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}

function ouvrirFormulaire(element = null) {
  formulaire.value = element ? { ...element } : { code: '', libelle: '', categorie: '' }
}

async function enregistrer() {
  enregistrement.value = true
  try {
    const { id, code, libelle, categorie } = formulaire.value
    const element = c.avecCategorie ? { id, code, libelle, categorie } : { id, code, libelle }
    await store.dispatch('referentiel/enregistrer', { liste: c.liste, element })
    store.dispatch('notifications/succes', `${c.nomElement} ${id ? 'modifié(e)' : 'créé(e)'}.`)
    // La fenêtre RESTE OUVERTE (l'utilisateur la ferme : × ou Fermer) et les champs sont VIDÉS.
    ouvrirFormulaire()
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

async function supprimer(element) {
  const confirme = await confirmer({
    titre: 'Supprimer cet élément ?',
    texte: `« ${element.libelle} » sera supprimé définitivement.`,
    boutonConfirmer: 'Oui, supprimer',
    danger: true,
  })
  if (!confirme) return
  try {
    await store.dispatch('referentiel/supprimer', { liste: c.liste, element })
    store.dispatch('notifications/succes', `${c.nomElement} supprimé(e).`)
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

// ---------------------------------------------------------------------------
// EXPORT PDF ET IMPORT DE FICHIER
// ---------------------------------------------------------------------------
const colonnesPdf = [
  { titre: 'Code', valeur: (e) => e.code },
  { titre: 'Libellé', valeur: (e) => e.libelle },
  ...(c.avecCategorie ? [{ titre: 'Catégorie', valeur: (e) => e.categorie }] : []),
  { titre: c.colonneCompte, valeur: utilisations, droite: true, somme: utilisations },
]

const colonnesImport = [
  { cle: 'code', titre: 'Code', exemple: c.exempleCode, aide: 'Facultatif : code unique. Vide = code automatique' },
  { cle: 'libelle', titre: 'Libellé', obligatoire: true, exemple: c.exempleLibelle },
  ...(c.avecCategorie ? [{ cle: 'categorie', titre: 'Catégorie', exemple: 'ANTI-INFECTIEUX' }] : []),
]

/** Enregistre UNE ligne : mise à jour si le code existe, sinon création. */
async function importerLigne(valeurs) {
  const existant = trouverParCode(elements.value, valeurs.code)
  const element = sansChampsVides({
    id: existant?.id,
    code: enTexte(valeurs.code),
    libelle: enTexte(valeurs.libelle),
    categorie: c.avecCategorie ? enTexte(valeurs.categorie) : '',
  })
  await store.dispatch('referentiel/enregistrer', { liste: c.liste, element })
  return existant ? 'modifie' : 'cree'
}

const VALEURS_TRI = {
  code: (e) => e.code,
  libelle: (e) => e.libelle,
  categorie: (e) => e.categorie,
  utilisations,
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(elementsAffiches, [recherche], VALEURS_TRI)

onMounted(charger)
</script>
