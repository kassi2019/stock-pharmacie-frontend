<!--
  =============================================================================
  BOUTONS « IMPORTER UN FICHIER » ET « TÉLÉCHARGER EN PDF » D'UN TABLEAU
  =============================================================================
  À placer dans la barre d'outils d'un tableau. Affiche deux boutons :

    - « Importer » : ouvre une fenêtre en 3 étapes :
        1. choix du fichier (Excel .xlsx ou CSV) + modèle Excel à télécharger ;
        2. aperçu des lignes lues (les lignes incomplètes sont signalées) ;
        3. import ligne par ligne, puis résumé (créés / modifiés / erreurs).
    - « Excel » : télécharge le tableau en Excel, avec l'en-tête de la pharmacie (src/utils/exportExcel.js) ;
    - « PDF » : télécharge le tableau en PDF (voir src/utils/exportPdf.js).

  Utilisation (exemple dans OngletFournisseurs.vue) :

      <ImportExportTableau
        titre="Liste des fournisseurs"
        nom-fichier="fournisseurs"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="fournisseursAffiches"
        :colonnes-import="COLONNES_IMPORT"
        :importer-ligne="importerLigne"
        @importe="charger"
      />

  Propriétés :
    - titre          : titre du PDF et de la fenêtre d'import ;
    - sous-titre     : ligne sous le titre du PDF (ex. filtres appliqués) ;
    - nom-fichier    : nom des fichiers téléchargés (sans extension) ;
    - colonnes-pdf   : [{ titre, valeur: (ligne) => texte, droite?: true }] ;
    - lignes         : lignes à mettre dans le PDF (celles affichées à l'écran) ;
    - libelle-pdf    : texte du bouton (« PDF » par défaut) ;
    - colonnes-import: colonnes attendues dans le fichier (voir utils/importFichier.js).
                       Si absent, le bouton « Importer » n'est pas affiché ;
    - importer-ligne : fonction async (valeurs) => 'cree' | 'modifie'
                       qui enregistre UNE ligne (lève une erreur si problème).
  Événement :
    - @importe : émis après un import (pour recharger la liste).
  =============================================================================
-->
<template>
  <div class="import-export">
    <button v-si-modif v-if="colonnesImport" class="bouton-outil" title="Importer des données depuis un fichier Excel ou CSV" @click="ouvrirImport">
      <Icone nom="televerser" :taille="17" />
      Importer
    </button>
    <button v-if="excel" v-si-imprimer class="bouton-outil excel" :disabled="exportEnCours" title="Télécharger le tableau en Excel" @click="telechargerExcel">
      <Icone nom="excel" :taille="17" />
      Excel
    </button>
    <button v-si-imprimer class="bouton-outil pdf" :disabled="exportEnCours" title="Télécharger le tableau en PDF" @click="telechargerPdf">
      <Icone nom="pdf" :taille="17" />
      {{ exportEnCours ? `${libellePdf}…` : libellePdf }}
    </button>

    <!-- ===================== FENÊTRE D'IMPORT ===================== -->
    <FenetreModale v-if="fenetreOuverte" :titre="`Importer — ${titre}`" large @fermer="fermer">
      <!-- Étapes -->
      <ol class="etapes">
        <li :class="{ active: etape === 'choix', faite: etape !== 'choix' }">1. Fichier</li>
        <li :class="{ active: etape === 'apercu', faite: etape === 'import' || etape === 'resultat' }">2. Vérification</li>
        <li :class="{ active: etape === 'import' || etape === 'resultat' }">3. Import</li>
      </ol>

      <!-- ---------- ÉTAPE 1 : choix du fichier ---------- -->
      <div v-if="etape === 'choix'">
        <label
          class="zone-depot"
          :class="{ survol: survolDepot }"
          @dragover.prevent="survolDepot = true"
          @dragleave.prevent="survolDepot = false"
          @drop.prevent="deposerFichier"
        >
          <input type="file" accept=".xlsx,.csv" hidden @change="choisirFichier" />
          <span class="zone-icone"><Icone nom="televerser" :taille="30" /></span>
          <strong>{{ lecture ? 'Lecture du fichier…' : 'Cliquez ou glissez votre fichier ici' }}</strong>
          <small>Fichier Excel (.xlsx) ou CSV (.csv) — la 1re ligne doit contenir les titres des colonnes</small>
        </label>

        <div class="modele">
          <div>
            <strong>Pas encore de fichier ?</strong>
            <p>Téléchargez le modèle Excel, remplissez-le puis importez-le ici.</p>
          </div>
          <button class="bouton-secondaire" @click="telechargerLeModele">
            <Icone nom="telecharger" :taille="16" /> Télécharger le modèle
          </button>
        </div>

        <h4 class="sous-titre">Colonnes attendues</h4>
        <div class="tableau-conteneur">
          <table class="tableau compact">
            <thead>
              <tr><th>Colonne</th><th>Exemple</th><th>Explication</th></tr>
            </thead>
            <tbody>
              <tr v-for="colonne in colonnesImport" :key="colonne.cle">
                <td>
                  <strong :class="{ obligatoire: colonne.obligatoire }">{{ colonne.titre }}</strong>
                </td>
                <td class="code">{{ colonne.exemple ?? '' }}</td>
                <td class="aide">{{ colonne.aide || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="note">
          Si le <strong>code</strong> existe déjà, l'élément est <strong>mis à jour</strong> ; sinon il est <strong>créé</strong>.
          Un code laissé vide est généré automatiquement.
        </p>
      </div>

      <!-- ---------- ÉTAPE 2 : aperçu ---------- -->
      <div v-else-if="etape === 'apercu'">
        <div class="fichier-choisi">
          <Icone nom="facture" :taille="20" />
          <span><strong>{{ nomFichierChoisi }}</strong> — {{ lignesLues.length }} ligne(s) trouvée(s)</span>
          <span class="espace"></span>
          <button class="bouton-lien" @click="recommencer">Changer de fichier</button>
        </div>

        <p v-if="colonnesManquantes.length" class="message erreur-bloc">
          Colonne(s) obligatoire(s) absente(s) du fichier : <strong>{{ colonnesManquantes.join(', ') }}</strong>.
          Vérifiez la 1re ligne (titres) ou utilisez le modèle.
        </p>
        <p v-else-if="lignesIncompletes.length" class="message attention-bloc">
          {{ lignesIncompletes.length }} ligne(s) incomplète(s) (en rouge) seront ignorées.
        </p>

        <div class="tableau-conteneur apercu">
          <table class="tableau compact">
            <thead>
              <tr>
                <th>Ligne</th>
                <th v-for="colonne in colonnesImport" :key="colonne.cle">{{ colonne.titre }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ligne in lignesLues" :key="ligne.numero" :class="{ incomplete: champsManquants(ligne).length }">
                <td class="numero">{{ ligne.numero }}</td>
                <td v-for="colonne in colonnesImport" :key="colonne.cle">
                  {{ ligne.valeurs[colonne.cle] === '' ? '—' : ligne.valeurs[colonne.cle] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ---------- ÉTAPE 3 : import en cours / résultat ---------- -->
      <div v-else>
        <div class="progression">
          <div class="progression-texte">
            <strong>{{ etape === 'import' ? 'Import en cours…' : 'Import terminé' }}</strong>
            <span>{{ traitees }} / {{ lignesAImporter.length }}</span>
          </div>
          <div class="barre"><div class="barre-remplie" :style="{ width: pourcentage + '%' }"></div></div>
        </div>

        <div v-if="etape === 'resultat'" class="resume">
          <div class="resume-case vert">
            <span class="resume-chiffre">{{ resultat.crees }}</span><span>créé(s)</span>
          </div>
          <div class="resume-case bleu">
            <span class="resume-chiffre">{{ resultat.modifies }}</span><span>mis à jour</span>
          </div>
          <div class="resume-case rouge">
            <span class="resume-chiffre">{{ resultat.erreurs.length }}</span><span>erreur(s)</span>
          </div>
        </div>

        <div v-if="resultat.erreurs.length" class="liste-erreurs">
          <h4 class="sous-titre">Lignes non importées</h4>
          <ul>
            <li v-for="erreur in resultat.erreurs" :key="erreur.numero">
              <strong>Ligne {{ erreur.numero }}</strong> : {{ erreur.message }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Boutons du bas -->
      <template #pied>
        <button class="bouton-secondaire" :disabled="etape === 'import'" @click="fermer">Fermer</button>
        <button
          v-if="etape === 'apercu'"
          :disabled="colonnesManquantes.length > 0 || lignesAImporter.length === 0"
          @click="lancerImport"
        >
          Importer {{ lignesAImporter.length }} ligne(s)
        </button>
        <button v-if="etape === 'resultat'" @click="recommencer">Importer un autre fichier</button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import Icone from '@/components/Icone.vue'
import FenetreModale from '@/components/FenetreModale.vue'
import { exporterPdf } from '@/utils/exportPdf'
import { exporterExcel } from '@/utils/exportExcel'
import { lireFichier, telechargerModele } from '@/utils/importFichier'

const props = defineProps({
  titre: { type: String, required: true },
  sousTitre: { type: String, default: '' },
  nomFichier: { type: String, required: true },
  colonnesPdf: { type: Array, required: true },
  lignes: { type: Array, required: true },
  colonnesImport: { type: Array, default: null },
  importerLigne: { type: Function, default: null },
  /** Texte du bouton PDF (quand plusieurs PDF sont proposés sur la même page) */
  libellePdf: { type: String, default: 'PDF' },
  /** Bouton « Excel » (mêmes colonnes que le PDF, § 15) */
  excel: { type: Boolean, default: true },
})
const emit = defineEmits(['importe'])

const store = useStore()

// ---------------------------------------------------------------------------
// EXPORT PDF
// ---------------------------------------------------------------------------
const exportEnCours = ref(false)

async function telechargerPdf() {
  exportEnCours.value = true
  try {
    await exporterPdf({
      titre: props.titre,
      sousTitre: props.sousTitre,
      colonnes: props.colonnesPdf,
      lignes: props.lignes,
      nomFichier: props.nomFichier,
    })
  } catch (erreur) {
    console.error(erreur)
    store.dispatch('notifications/erreur', 'Impossible de créer le PDF.')
  } finally {
    exportEnCours.value = false
  }
}

async function telechargerExcel() {
  exportEnCours.value = true
  try {
    await exporterExcel({
      titre: props.titre,
      sousTitre: props.sousTitre,
      colonnes: props.colonnesPdf,
      lignes: props.lignes,
      nomFichier: props.nomFichier,
    })
  } catch (erreur) {
    console.error(erreur)
    store.dispatch('notifications/erreur', 'Impossible de créer le fichier Excel.')
  } finally {
    exportEnCours.value = false
  }
}

// ---------------------------------------------------------------------------
// IMPORT
// ---------------------------------------------------------------------------
const fenetreOuverte = ref(false)
const etape = ref('choix') // 'choix' | 'apercu' | 'import' | 'resultat'
const lecture = ref(false)
const survolDepot = ref(false)
const nomFichierChoisi = ref('')
const lignesLues = ref([])
const colonnesManquantes = ref([])
const traitees = ref(0)
const resultat = ref({ crees: 0, modifies: 0, erreurs: [] })

/** Titres des colonnes obligatoires vides dans une ligne. */
function champsManquants(ligne) {
  return props.colonnesImport
    .filter((c) => c.obligatoire && ligne.valeurs[c.cle] === '')
    .map((c) => c.titre)
}

const lignesIncompletes = computed(() => lignesLues.value.filter((l) => champsManquants(l).length))
const lignesAImporter = computed(() => lignesLues.value.filter((l) => !champsManquants(l).length))
const pourcentage = computed(() =>
  lignesAImporter.value.length ? Math.round((traitees.value / lignesAImporter.value.length) * 100) : 100,
)

function ouvrirImport() {
  recommencer()
  fenetreOuverte.value = true
}

function recommencer() {
  etape.value = 'choix'
  nomFichierChoisi.value = ''
  lignesLues.value = []
  colonnesManquantes.value = []
  traitees.value = 0
  resultat.value = { crees: 0, modifies: 0, erreurs: [] }
}

function fermer() {
  fenetreOuverte.value = false
}

async function telechargerLeModele() {
  try {
    await telechargerModele({
      colonnes: props.colonnesImport,
      nomFichier: `modele_${props.nomFichier}`,
      titre: props.titre,
    })
  } catch (erreur) {
    console.error(erreur)
    store.dispatch('notifications/erreur', 'Impossible de créer le modèle.')
  }
}

/** Fichier choisi avec le bouton. */
function choisirFichier(evenement) {
  const fichier = evenement.target.files[0]
  evenement.target.value = '' // permet de re-choisir le même fichier
  if (fichier) analyserFichier(fichier)
}

/** Fichier glissé-déposé dans la zone. */
function deposerFichier(evenement) {
  survolDepot.value = false
  const fichier = evenement.dataTransfer.files[0]
  if (fichier) analyserFichier(fichier)
}

/** Lit le fichier puis passe à l'aperçu. */
async function analyserFichier(fichier) {
  lecture.value = true
  try {
    const { lignes, colonnesManquantes: manquantes } = await lireFichier(fichier, props.colonnesImport)
    if (lignes.length === 0) {
      store.dispatch('notifications/erreur', 'Aucune ligne de données dans ce fichier.')
      return
    }
    nomFichierChoisi.value = fichier.name
    lignesLues.value = lignes
    colonnesManquantes.value = manquantes
    etape.value = 'apercu'
  } catch (erreur) {
    console.error(erreur)
    store.dispatch('notifications/erreur', erreur.message || 'Impossible de lire ce fichier.')
  } finally {
    lecture.value = false
  }
}

/** Message lisible pour une erreur (erreur de l'API ou erreur de vérification). */
function messageErreur(erreur) {
  const message = erreur?.response?.data?.message
  if (Array.isArray(message)) return message.join(' · ')
  return message || erreur?.message || 'Erreur inconnue'
}

/** Importe les lignes UNE PAR UNE (pour savoir exactement lesquelles échouent). */
async function lancerImport() {
  etape.value = 'import'
  traitees.value = 0
  const bilan = { crees: 0, modifies: 0, erreurs: [] }

  // Les lignes incomplètes sont comptées comme erreurs
  for (const ligne of lignesIncompletes.value) {
    bilan.erreurs.push({ numero: ligne.numero, message: `champ(s) obligatoire(s) vide(s) : ${champsManquants(ligne).join(', ')}` })
  }

  for (const ligne of lignesAImporter.value) {
    try {
      const action = await props.importerLigne(ligne.valeurs)
      if (action === 'modifie') bilan.modifies++
      else bilan.crees++
    } catch (erreur) {
      bilan.erreurs.push({ numero: ligne.numero, message: messageErreur(erreur) })
    }
    traitees.value++
  }

  bilan.erreurs.sort((a, b) => a.numero - b.numero)
  resultat.value = bilan
  etape.value = 'resultat'
  emit('importe')

  const reussies = bilan.crees + bilan.modifies
  if (bilan.erreurs.length === 0) store.dispatch('notifications/succes', `${reussies} ligne(s) importée(s).`)
  else store.dispatch('notifications/erreur', `${reussies} ligne(s) importée(s), ${bilan.erreurs.length} erreur(s).`)
}
</script>

<style scoped>
.import-export { display: flex; gap: 0.5rem; }

/* Boutons « Importer » et « PDF » : contour bleu, fond blanc */
.bouton-outil {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #fff;
  color: var(--primary-dark);
  border: 1.5px solid var(--primary);
  font-weight: 600;
}
.bouton-outil:hover { background: var(--primary-light); }
/* Bouton PDF : rouge doux (couleur habituelle des PDF) */
.bouton-outil.pdf { color: var(--danger); border-color: #f1b4b4; }
.bouton-outil.excel { color: #1e7e45; border-color: #a9d8bb; }
.bouton-outil.excel:hover { background: #e8f5ec; }
.bouton-outil.pdf:hover { background: #fdecec; }

/* ---------- Étapes en haut de la fenêtre ---------- */
.etapes {
  display: flex;
  gap: 0.5rem;
  margin: 0 0 1.25rem;
  padding: 0;
  list-style: none;
}
.etapes li {
  flex: 1;
  padding: 0.5rem;
  border-radius: 8px;
  background: #f3f5f7;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}
.etapes li.faite { background: var(--primary-light); color: var(--primary-dark); }
.etapes li.active { background: var(--primary); color: #fff; }

/* ---------- Étape 1 ---------- */
.zone-depot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 2rem 1rem;
  margin: 0;
  border: 2px dashed #b3e0f7;
  border-radius: 14px;
  background: #f5fbff;
  color: var(--texte-sur-fond);
  text-align: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.zone-depot:hover,
.zone-depot.survol { background: var(--primary-light); border-color: var(--primary); }
.zone-depot small { color: var(--muted); }
.zone-icone {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  color: var(--primary);
  box-shadow: 0 4px 12px rgba(2, 119, 189, 0.15);
}

.modele {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: var(--fond-pale);
}
.modele p { margin: 0.15rem 0 0; font-size: 0.85rem; color: var(--muted); }
.modele button { display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; }

.sous-titre {
  margin: 1.25rem 0 0.5rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
}
.tableau.compact td,
.tableau.compact th { padding: 0.45rem 0.6rem; font-size: 0.83rem; }
.aide { color: var(--muted); }
.note { margin: 0.75rem 0 0; font-size: 0.85rem; color: var(--muted); }

/* ---------- Étape 2 ---------- */
.fichier-choisi {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  margin-bottom: 0.75rem;
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary-dark);
}
.fichier-choisi .espace { flex: 1; }
.message { margin: 0 0 0.75rem; padding: 0.7rem 1rem; border-radius: 10px; font-size: 0.88rem; }
.erreur-bloc { background: #fdecec; color: var(--danger); }
.attention-bloc { background: #fff6e5; color: #9a5b00; }
.apercu { max-height: 340px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; }
.apercu th { position: sticky; top: 0; }
.numero { color: var(--muted); font-size: 0.78rem; }
.incomplete td { background: #fdecec; color: var(--danger); }

/* ---------- Étape 3 ---------- */
.progression-texte { display: flex; justify-content: space-between; margin-bottom: 0.4rem; }
.barre { height: 12px; border-radius: 999px; background: #eef0f2; overflow: hidden; }
.barre-remplie {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--primary));
  transition: width 0.2s;
}
.resume { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-top: 1.25rem; }
.resume-case {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}
.resume-chiffre { font-size: 1.8rem; font-weight: 800; }
.resume-case.vert { background: var(--primary-light); color: var(--primary-dark); }
.resume-case.bleu { background: #e8f1fd; color: #1d4f91; }
.resume-case.rouge { background: #fdecec; color: var(--danger); }
.liste-erreurs ul {
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  padding: 0.6rem 1rem 0.6rem 2rem;
  border-radius: 10px;
  background: #fdf6f6;
  font-size: 0.85rem;
}
.liste-erreurs li { margin: 0.2rem 0; }
</style>
