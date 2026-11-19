<!--
  =============================================================================
  ONGLET « PARAMÈTRES GÉNÉRAUX » — même présentation que le district
  =============================================================================
  1. INFORMATIONS DE LA PHARMACIE : code, nom, responsable, localité, adresse,
     téléphone, e-mail. Un seul bouton « Enregistrer » pour toute la fiche.
     ➜ Utilisées sur les documents imprimés (en-tête et pied des PDF).
  2. RÉGLAGES DU MODULE (§ 13.2) : une ligne par paramètre avec son bouton.
     Le champ dépend du type renvoyé par le serveur : entier, heure, liste, texte.
  =============================================================================
-->
<template>
  <div>
    <p v-if="chargement" class="tableau-vide">Chargement…</p>

    <template v-else>
      <!-- ===================== 1. INFORMATIONS DE LA PHARMACIE ===================== -->
      <section class="fiche">
        <header class="fiche-entete">
          <span class="fiche-icone"><Icone nom="accueil" :taille="22" /></span>
          <div>
            <h3>Informations de la pharmacie</h3>
            <p>Utilisées sur les documents imprimés (en-tête et pied des PDF).</p>
          </div>
        </header>

        <form class="grille-formulaire trois-colonnes" @submit.prevent="enregistrerFiche">
          <h4 class="section pleine-largeur">Identification</h4>
          <div>
            <label>Code</label>
            <input v-model.trim="fiche.PHARMACIE_CODE" class="maj" maxlength="30" placeholder="ex. PH-CLINIQUE" />
          </div>
          <div class="double">
            <label class="obligatoire">Nom de la pharmacie</label>
            <input v-model.trim="fiche.PHARMACIE_NOM" class="maj" required maxlength="150" placeholder="ex. Pharmacie de la clinique" />
          </div>
          <div class="double">
            <label>Responsable</label>
            <input v-model.trim="fiche.PHARMACIE_RESPONSABLE" class="maj" maxlength="150" placeholder="ex. Dr Kouassi (pharmacien)" />
          </div>
          <div></div>

          <h4 class="section pleine-largeur">Localisation</h4>
          <div>
            <label>Ville / localité</label>
            <input v-model.trim="fiche.PHARMACIE_LOCALITE" class="maj" maxlength="100" placeholder="ex. Abidjan" />
          </div>
          <div class="double">
            <label>Adresse</label>
            <input v-model.trim="fiche.PHARMACIE_ADRESSE" class="maj" maxlength="255" placeholder="ex. Cocody, rue des Jardins" />
          </div>

          <h4 class="section pleine-largeur">Contact</h4>
          <div>
            <label>Téléphone</label>
            <input v-model.trim="fiche.PHARMACIE_TELEPHONE" maxlength="30" placeholder="ex. 27 22 00 00 00" />
          </div>
          <div class="double">
            <label>E-mail</label>
            <input v-model.trim="fiche.PHARMACIE_EMAIL" type="email" maxlength="150" placeholder="ex. pharmacie@clinique.ci" />
          </div>

          <div class="pleine-largeur actions-fiche">
            <span v-if="ficheModifiee" class="aide">Modifications non enregistrées</span>
            <button v-si-modif type="submit" :disabled="!ficheModifiee || enregistrementFiche">
              {{ enregistrementFiche ? 'Enregistrement…' : 'Enregistrer les informations' }}
            </button>
          </div>
        </form>
      </section>

      <!-- ===================== 2. RÉGLAGES DU MODULE ===================== -->
      <h3 class="titre-reglages">Réglages du module stock (§ 13.2)</h3>
      <div class="liste-parametres">
        <div v-for="parametre in reglages" :key="parametre.cle" class="parametre">
          <div class="parametre-texte">
            <strong>{{ LIBELLES[parametre.cle] ?? parametre.cle }}</strong>
            <small>{{ parametre.description }}</small>
          </div>

          <div class="parametre-champ">
            <ListeDeroulante
              v-if="parametre.type === 'ouiNon'"
              v-model="valeurs[parametre.cle]"
              :options="OUI_NON"
              :effacable="false"
            />
            <input
              v-else-if="parametre.type === 'entier'"
              v-model="valeurs[parametre.cle]"
              type="number"
              :min="parametre.cle === 'SESSION_EXPIRATION_MINUTES' ? 0 : 1"
              step="1"
            />
            <input v-else-if="parametre.type === 'heure'" v-model="valeurs[parametre.cle]" type="time" />
            <input v-else v-model="valeurs[parametre.cle]" class="maj" type="text" />
          </div>

          <button
            v-si-modif
            :disabled="String(valeurs[parametre.cle]) === parametre.valeur || enregistrement === parametre.cle"
            @click="enregistrer(parametre)"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { listerParametres, modifierParametre } from '@/api/parametrage'
import Icone from '@/components/Icone.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import { CLES_SAUVEGARDE } from '@/utils/sauvegardes'

const OUI_NON = [
  { id: 'true', libelle: 'Oui' },
  { id: 'false', libelle: 'Non' },
]

const store = useStore()

/** Clés des paramètres qui forment la fiche « Informations de la pharmacie ». */
const CHAMPS_FICHE = [
  'PHARMACIE_CODE',
  'PHARMACIE_NOM',
  'PHARMACIE_RESPONSABLE',
  'PHARMACIE_LOCALITE',
  'PHARMACIE_ADRESSE',
  'PHARMACIE_TELEPHONE',
  'PHARMACIE_EMAIL',
]

/** Libellé clair des réglages. */
const LIBELLES = {
  DEVISE: 'Devise',
  SESSION_EXPIRATION_MINUTES: 'Déconnexion après inactivité (minutes)',
  SORTIE_AUTO_PERIMES: 'Sortie automatique des lots périmés (chaque nuit)',
  PERIODE_CONSO_JOURS: 'Période de calcul de la consommation (jours)',
  LIMITE_SOUS_STOCK_JOURS: 'Limite « sous stock » (jours de couverture)',
  LIMITE_SURSTOCK_JOURS: 'Limite « surstock » (jours de couverture)',
  ALERTE_PEREMPTION_JOURS: 'Alerte de péremption (jours avant)',
  HEURE_RETRAIT_PERIMES: 'Heure du retrait automatique des périmés',
  HEURE_RECALCUL_SEUILS: 'Heure du recalcul des seuils',
  ACTUALISATION_ECRANS_SECONDES: 'Actualisation automatique des écrans (secondes)',
  MOTIFS_RETRAIT: 'Motifs de retrait',
}

const parametres = ref([])
const valeurs = reactive({})
const fiche = reactive({})
const chargement = ref(false)
const enregistrement = ref(null)
const enregistrementFiche = ref(false)

// Les réglages de sauvegarde sont dans l'onglet « Sauvegardes »
const reglages = computed(() => parametres.value.filter((p) => !CHAMPS_FICHE.includes(p.cle) && !CLES_SAUVEGARDE.includes(p.cle)))
const valeurEnregistree = (cle) => parametres.value.find((p) => p.cle === cle)?.valeur ?? ''
const ficheModifiee = computed(() => CHAMPS_FICHE.some((cle) => String(fiche[cle] ?? '') !== valeurEnregistree(cle)))

async function charger() {
  chargement.value = true
  try {
    parametres.value = await listerParametres()
    for (const p of parametres.value) valeurs[p.cle] = p.valeur
    for (const cle of CHAMPS_FICHE) fiche[cle] = valeurEnregistree(cle)
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}

/** Enregistre UN réglage. */
async function enregistrer(parametre) {
  enregistrement.value = parametre.cle
  try {
    const misAJour = await modifierParametre(parametre.cle, String(valeurs[parametre.cle]))
    parametre.valeur = misAJour.valeur
    valeurs[parametre.cle] = misAJour.valeur
    store.dispatch('notifications/succes', `Paramètre « ${LIBELLES[parametre.cle] ?? parametre.cle} » enregistré.`)
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = null
  }
}

/** Enregistre la fiche de la pharmacie : seulement les informations modifiées. */
async function enregistrerFiche() {
  enregistrementFiche.value = true
  try {
    for (const cle of CHAMPS_FICHE) {
      const nouvelle = String(fiche[cle] ?? '')
      if (nouvelle === valeurEnregistree(cle)) continue
      const misAJour = await modifierParametre(cle, nouvelle)
      const parametre = parametres.value.find((p) => p.cle === cle)
      if (parametre) parametre.valeur = misAJour.valeur
      fiche[cle] = misAJour.valeur
    }
    store.dispatch('notifications/succes', 'Informations de la pharmacie enregistrées.')
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrementFiche.value = false
  }
}

onMounted(charger)
</script>

<style scoped>
.fiche {
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.75rem;
  border: 1px solid var(--border);
  border-top: 4px solid var(--primary);
  border-radius: 14px;
}
.fiche-entete {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.5rem;
}
.fiche-entete h3 {
  margin: 0;
  color: var(--primary-dark);
}
.fiche-entete p {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.fiche-icone {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--primary-light);
  color: var(--primary-dark);
}
.aide {
  font-size: 0.8rem;
  color: var(--muted);
}
.actions-fiche {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

.titre-reglages {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: var(--texte-sur-fond);
}
.liste-parametres {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.parametre {
  display: grid;
  grid-template-columns: 1fr 320px auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  border-radius: 12px;
}
.parametre-texte {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.parametre-texte small {
  color: var(--muted);
}
.parametre-champ input {
  width: 100%;
}
@media (max-width: 700px) {
  .parametre {
    grid-template-columns: 1fr;
  }
}
</style>
