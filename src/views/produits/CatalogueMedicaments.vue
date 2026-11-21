<!--
  =============================================================================
  CATALOGUE DES MÉDICAMENTS (§ 7) — module « Produits et médicaments »
  =============================================================================
  Mêmes champs et même fonctionnement que l'onglet Médicaments de l'application
  de district :
  - Liste avec recherche, filtres famille / forme, compteurs par état du stock
    (un clic filtre) et option « afficher les inactifs » ; le médecin ne voit
    ni stock ni prix (§ 6) ;
  - Affiche le seuil d'alerte, le prix de vente (par unité de comptage), le prix
    d'achat (dernier lot reçu), le stock et l'état de couleur (§ 13) ;
  - Le formulaire contient :
      * Identification : code, famille, forme, désignation, dosage ;
      * Vente : UNITÉ DE COMPTAGE (boîte, flacon…), PRIX DE VENTE de cette unité
        (enregistré dans l'historique des prix à la date du jour s'il change),
        CONSOMMABLE (vendu à 0 F mais décompté du stock) ;
      * Stock : SEUIL D'ALERTE (en dessous : « Sous stock ») et, à la création,
        STOCK INITIAL avec n° de lot et date de péremption ; ensuite le stock
        est seulement AFFICHÉ (il change par les entrées, sorties et inventaires).
  - IMPORT Excel/CSV : crée ou met à jour (par code) ; famille, forme et unité
    de vente inconnues sont ajoutées à leur liste ;
  - « Fiche » : lots du produit ; « Prix » : ouvre l'onglet Prix sur ce médicament.
  - CODES-BARRES (section du formulaire) : un ou plusieurs codes par médicament,
    scannés (📷 caméra, douchette) ou saisis ; la recherche trouve aussi un
    médicament par son code-barres. Adresse ?codeBarre=… : formulaire de création
    déjà rempli avec ce code (écran mobile « Codes-barres »).
  =============================================================================
-->
<template>
  <div>
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (code, désignation, code-barres)…" />
      <div class="filtre">
        <ListeDeroulante v-model="familleFiltre" :options="familles" placeholder="Toutes les familles" />
      </div>
      <div class="filtre">
        <ListeDeroulante v-model="formeFiltre" :options="formes" placeholder="Toutes les formes" />
      </div>
      <label class="case-a-cocher">
        <input v-model="afficherInactifs" type="checkbox" /> Afficher les inactifs
      </label>
      <span class="espace"></span>
      <ImportExportTableau
        titre="Catalogue des médicaments"
        :sous-titre="sousTitrePdf"
        nom-fichier="medicaments"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="lignesTriees"
        :colonnes-import="COLONNES_IMPORT"
        :importer-ligne="importerLigne"
        @importe="charger"
      />
      <router-link class="btn bouton-secondaire" :to="{ name: 'codes-barres' }" title="Scanner les boîtes, rattacher les codes-barres">▥ Codes-barres</router-link>
      <button v-si-modif @click="ouvrirFormulaire()">+ Nouveau médicament</button>
    </div>

    <div v-if="voitStock" class="compteurs">
      <button
        v-for="(e, cle) in ETATS"
        :key="cle"
        type="button"
        class="compteur"
        :class="{ choisi: etatFiltre === cle }"
        :title="`Afficher : ${e.libelle}`"
        @click="etatFiltre = etatFiltre === cle ? null : cle"
      >
        <EtatBadge :etat="cle" /> <strong>{{ compteurs[cle] ?? 0 }}</strong>
      </button>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="code">Code</ColonneTri>
            <ColonneTri v-model="tri" cle="designation">Désignation</ColonneTri>
            <ColonneTri v-model="tri" cle="codeBarre">Code-barres</ColonneTri>
            <ColonneTri v-model="tri" cle="forme">Forme / dosage</ColonneTri>
            <ColonneTri v-model="tri" cle="famille">Famille</ColonneTri>
            <ColonneTri v-if="voitStock" v-model="tri" cle="seuil" class="nombre">Seuil</ColonneTri>
            <ColonneTri v-if="voitStock" v-model="tri" cle="prixVente" class="nombre">Prix de vente</ColonneTri>
            <ColonneTri v-if="voitPrixAchat" v-model="tri" cle="prixAchat" class="nombre">Prix d'achat</ColonneTri>
            <ColonneTri v-if="voitStock" v-model="tri" cle="stock" class="nombre">Stock</ColonneTri>
            <ColonneTri v-if="voitStock" v-model="tri" cle="etat">État</ColonneTri>
            <ColonneTri v-model="tri" cle="statut">Statut</ColonneTri>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="med in lignesPage" :key="med.id" :class="{ 'ligne-inactive': !med.actif }">
            <td class="code">{{ med.code }}</td>
            <td>
              <strong>{{ med.designation }}</strong>
              <span v-if="med.consommable" class="badge badge-orange consommable">Consommable</span>
            </td>
            <td class="col-code-barre">
              <template v-if="med.codesBarres?.length">
                <span class="code">{{ med.codesBarres[0].code }}</span>
                <span v-if="med.codesBarres.length > 1" class="badge badge-bleu" :title="med.codesBarres.map((c) => c.code).join(', ')">
                  +{{ med.codesBarres.length - 1 }}
                </span>
              </template>
              <span v-else class="sans-code">—</span>
            </td>
            <td>{{ [med.forme?.libelle, med.dosage].filter(Boolean).join(' · ') || '—' }}</td>
            <td>{{ med.famille?.libelle || '—' }}</td>
            <td v-if="voitStock" class="nombre">{{ med.seuilAlerte || '—' }}</td>
            <td v-if="voitStock" class="nombre">
              {{ montant(prixVente(med)) }}
              <div class="detail">par {{ uniteVente(med).toLowerCase() }}</div>
            </td>
            <td v-if="voitPrixAchat" class="nombre">{{ montant(prixAchat(med)) }}</td>
            <td v-if="voitStock" class="nombre">
              <!-- Stock en rouge s'il est sous le seuil d'alerte -->
              <strong :class="{ 'stock-bas': sousLeSeuil(med) }">{{ quantite(med.stockDisponible ?? 0, med.plaquesParBoite) }}</strong>
            </td>
            <td v-if="voitStock"><EtatBadge :etat="med.etatStock" /></td>
            <td>
              <span class="badge" :class="med.actif ? 'badge-vert' : 'badge-gris'">
                {{ med.actif ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td class="actions">
              <button class="bouton-lien" @click="router.push({ name: 'produit', params: { id: med.id } })">Fiche</button>
              <button v-if="voitStock" class="bouton-lien" @click="emit('voir-prix', med)">Prix</button>
              <button v-si-modif class="bouton-lien" @click="ouvrirFormulaire(med)">Modifier</button>
              <button v-si-modif class="bouton-lien" :class="{ danger: med.actif }" @click="changerActif(med)">
                {{ med.actif ? 'Désactiver' : 'Réactiver' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Pagination (la recherche et les filtres s'appliquent à TOUTES les lignes) -->
      <Pagination v-model:page="page" v-model:taille="taille" :total="medicamentsAffiches.length" />
      <p v-if="!chargement && medicamentsAffiches.length === 0" class="tableau-vide">
        Aucun médicament. Cliquez sur « Nouveau médicament » pour en ajouter un.
      </p>
      <p v-if="chargement" class="tableau-vide">Chargement…</p>
    </div>

    <!-- Formulaire en fenêtre LARGE, sur 3 colonnes (2 puis 1 sur petit écran) -->
    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? 'Modifier le médicament' : 'Nouveau médicament'"
      large
      @fermer="formulaire = null"
    >
      <form id="form-medicament" class="grille-formulaire trois-colonnes" @submit.prevent="enregistrer">
        <!-- ---------- Identification ---------- -->
        <h4 class="section pleine-largeur">Identification</h4>
        <div>
          <label>Code <small class="facultatif">(facultatif)</small></label>
          <!-- Code facultatif : laissé vide, il est généré automatiquement (ex. MED-0001) -->
          <input v-model.trim="formulaire.code" class="maj" maxlength="30" placeholder="Vide = automatique (ex. PARA500)" />
        </div>
        <div>
          <label>Famille</label>
          <ListeDeroulante v-model="formulaire.familleId" :options="familles" placeholder="— Aucune —" />
          <small v-if="familles.length === 0" class="aide">
            Aucune famille : ajoutez-en dans Paramétrage › Familles.
          </small>
        </div>
        <div>
          <label>Forme</label>
          <ListeDeroulante v-model="formulaire.formeId" :options="formes" placeholder="— Choisir —" />
          <small v-if="formes.length === 0" class="aide">
            Aucune forme : ajoutez-en dans Paramétrage › Formes.
          </small>
        </div>
        <div class="double">
          <label class="obligatoire">Désignation</label>
          <input v-model.trim="formulaire.designation" class="maj" required maxlength="200" placeholder="ex. PARACÉTAMOL 500 MG" />
        </div>
        <div>
          <label>Dosage</label>
          <input v-model.trim="formulaire.dosage" class="maj" maxlength="50" placeholder="ex. 500 MG" />
        </div>

        <!-- ---------- Codes-barres ---------- -->
        <h4 class="section pleine-largeur">Codes-barres</h4>
        <div class="pleine-largeur codes-barres">
          <div class="liste-codes">
            <span v-for="c in formulaire.codesBarres" :key="c.code" class="puce-code">
              <span class="code">{{ c.code }}</span>
              <button type="button" class="retirer-code" title="Retirer ce code" @click="retirerCode(c)">×</button>
            </span>
            <span v-if="!formulaire.codesBarres.length" class="aide">Aucun code-barres : scannez la boîte ou saisissez son code.</span>
          </div>
          <div class="ajout-code">
            <ChampCodeBarre class="champ-ajout-code" placeholder="Scanner ou saisir le code-barres de la boîte…" titre-camera="Scanner la boîte du médicament" @code="ajouterCode" />
            <button v-if="!distant" type="button" class="bouton-secondaire" @click="demarrerDistant">📱 Scanner avec le téléphone</button>
          </div>
          <p v-if="recuDuTelephone && !distant" class="recu-telephone">✓ Code <strong class="code">{{ recuDuTelephone }}</strong> reçu du téléphone.</p>
          <!-- Scan à distance : le téléphone scanne, le code arrive ici -->
          <div v-if="distant" class="attente-telephone">
            <span class="pulsation"></span>
            <div>
              <strong>En attente du téléphone…</strong>
              <small>
                Sur le téléphone : écran <strong>Codes-barres</strong> → « Le poste attend un code » → <strong>Scanner</strong>.
              </small>
            </div>
            <button type="button" class="bouton-secondaire" @click="arreterDistant">Terminer</button>
          </div>
          <small class="aide">
            Un médicament peut avoir plusieurs codes (nouveau conditionnement, autre fournisseur). À la vente, un scan ajoute une
            {{ libelleUniteFormulaire.toLowerCase() }}.
          </small>
        </div>

        <!-- ---------- Vente ---------- -->
        <h4 class="section pleine-largeur">Vente</h4>
        <div>
          <label class="obligatoire">Unité de comptage</label>
          <ListeDeroulante v-model="formulaire.uniteVenteId" :options="unitesVente" :effacable="false" placeholder="BOÎTE" />
          <small class="aide">Le prix de vente s'applique à cette unité.</small>
        </div>
        <div>
          <label>Prix de vente (FCFA)</label>
          <input
            v-model="formulaire.prixVente"
            type="number"
            min="0"
            step="1"
            placeholder="ex. 500"
            :disabled="formulaire.consommable === 'OUI'"
          />
          <small class="aide">
            Prix par {{ libelleUniteFormulaire.toLowerCase() }}.
            <template v-if="formulaire.id">S'il change, un nouveau prix est créé à la date du jour (historique dans l'onglet Prix).</template>
          </small>
        </div>
        <div>
          <label>Consommable</label>
          <ListeDeroulante v-model="formulaire.consommable" :options="OUI_NON" :effacable="false" />
          <small class="aide">
            Un consommable (gants, seringues…) est vendu à 0 F mais décompté du stock.
          </small>
        </div>

        <!-- ---------- Stock ---------- -->
        <h4 class="section pleine-largeur">Stock</h4>
        <div>
          <label>Seuil d'alerte ({{ libelleUniteFormulaire.toLowerCase() }})</label>
          <input v-model="formulaire.seuilAlerte" type="number" min="0" step="1" placeholder="0" />
          <small class="aide">Stock minimum : en dessous, le médicament passe « Sous stock ». 0 = pas d'alerte.</small>
        </div>
        <!-- Création : stock initial -->
        <template v-if="!formulaire.id">
          <div>
            <label>Stock initial ({{ libelleUniteFormulaire.toLowerCase() }})</label>
            <input v-model="formulaire.stockInitial" type="number" min="0" step="1" placeholder="0" />
          </div>
          <!-- N° de lot et péremption : seulement si stock > 0 -->
          <template v-if="Number(formulaire.stockInitial) > 0">
            <div>
              <label class="obligatoire">N° de lot</label>
              <input v-model.trim="formulaire.numeroLot" class="maj" required maxlength="60" placeholder="ex. LOT2026-01" />
            </div>
            <div>
              <label class="obligatoire">Date de péremption</label>
              <ChampDate v-model="formulaire.datePeremption" required :min="aujourdhui()" />
            </div>
          </template>
        </template>
        <!-- Modification : stock seulement affiché -->
        <div v-else class="double stock-actuel">
          <span>Stock actuel</span>
          <strong>{{ quantite(formulaire.stockDisponible ?? 0, formulaire.plaquesParBoite) }}<template v-if="!(formulaire.plaquesParBoite > 1)"> {{ libelleUniteFormulaire.toLowerCase() }}</template></strong>
          <EtatBadge :etat="formulaire.etatStock" />
          <small class="aide">Le stock se modifie par les entrées, sorties et inventaires.</small>
        </div>
      </form>

      <template #pied>
        <button class="bouton-secondaire" @click="formulaire = null">Fermer</button>
        <button type="submit" form="form-medicament" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import ChampCodeBarre from '@/components/ChampCodeBarre.vue'
import { utiliserScanDistant } from '@/utils/scanDistant'
import { bip, codeValide } from '@/utils/codeBarre'
import api from '@/services/api'
import FenetreModale from '@/components/FenetreModale.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import EtatBadge from '@/components/EtatBadge.vue'
import { utiliserTableau } from '@/utils/pagination'
import { utiliserActualisation } from '@/utils/actualisation'
import { confirmer } from '@/utils/alertes'
import { ETATS } from '@/utils/etats'
import { aujourdhui, montant, quantite } from '@/utils/format'
import { enDateImport, enNombreImport, enOuiNon, enTexte, sansChampsVides, trouverParCode } from '@/utils/importFichier'

const store = useStore()
const router = useRouter()
const route = useRoute()
// « Prix » : ouvre l'onglet Prix du module sur ce médicament
const emit = defineEmits(['voir-prix'])

/** Choix Oui / Non (consommable). Valeurs en texte, converties en vrai/faux à l'enregistrement. */
const OUI_NON = [
  { id: 'NON', libelle: 'Non' },
  { id: 'OUI', libelle: 'Oui' },
]

const recherche = ref('')
const formeFiltre = ref(null)
const familleFiltre = ref(null)
const etatFiltre = ref(null)
const afficherInactifs = ref(false)
const chargement = ref(false)
const enregistrement = ref(false)
const formulaire = ref(null)

/** Le médecin ne voit ni prix ni quantités (§ 6) ; le prix d'achat est réservé à la gestion. */
const voitStock = computed(() => store.getters['auth/voitPrixVente'])
const voitPrixAchat = computed(() => store.getters['auth/voitPrixAchat'])

const medicaments = computed(() => store.state.referentiel.medicaments)
const formes = computed(() => store.state.referentiel.formes)
const familles = computed(() => store.state.referentiel.familles)
const unitesVente = computed(() => store.state.referentiel.unitesVente)

/** Libellé de l'unité de comptage d'un médicament (BOÎTE par défaut). */
const uniteVente = (m) => (m && !m.venteBoite && m.ventePlaque ? 'PLAQUE' : m?.uniteVente?.libelle ?? 'BOÎTE')
const libelleUniteFormulaire = computed(
  () => unitesVente.value.find((u) => u.id === formulaire.value?.uniteVenteId)?.libelle ?? 'BOÎTE',
)

/** Prix de vente d'une unité de comptage (ancien produit vendu à la plaque seule : prix plaque). */
const prixVente = (m) => Number(m.venteBoite ? m.prixVenteBoite : m.prixVentePlaque)
/** Prix d'achat d'une unité de comptage (le stock est tenu en plaques). */
const prixAchat = (m) => Number(m.prixAchatPlaque ?? 0) * (m.plaquesParBoite || 1)
/** Stock sous le seuil d'alerte (seuil en unités de comptage, stock en plaques). */
const sousLeSeuil = (m) => m.seuilAlerte > 0 && (m.stockDisponible ?? 0) <= m.seuilAlerte * (m.plaquesParBoite || 1)

const medicamentsAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return medicaments.value.filter((m) => {
    if (!afficherInactifs.value && !m.actif) return false
    if (formeFiltre.value && m.formeId !== formeFiltre.value) return false
    if (familleFiltre.value && m.familleId !== familleFiltre.value) return false
    if (etatFiltre.value && m.etatStock !== etatFiltre.value) return false
    if (!texte) return true
    return (
      [m.code, m.designation].some((v) => (v || '').toLowerCase().includes(texte)) ||
      (m.codesBarres ?? []).some((c) => c.code.toLowerCase() === texte.replace(/\s+/g, ''))
    )
  })
})

/** Nombre de médicaments par état (actifs, ou tous si « afficher les inactifs »). */
const compteurs = computed(() => {
  const c = {}
  for (const m of medicaments.value) {
    if (!afficherInactifs.value && !m.actif) continue
    c[m.etatStock] = (c[m.etatStock] ?? 0) + 1
  }
  return c
})

async function charger() {
  chargement.value = true
  try {
    await Promise.all([
      store.dispatch('referentiel/charger', { liste: 'medicaments' }),
      store.dispatch('referentiel/charger', { liste: 'formes' }),
      store.dispatch('referentiel/charger', { liste: 'familles' }),
      store.dispatch('referentiel/charger', { liste: 'unitesVente' }),
    ])
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}

function ouvrirFormulaire(med = null) {
  formulaire.value = med
    ? {
        ...med,
        dosage: med.dosage ?? '',
        // Prix de vente en cours (modifiable : un nouveau prix sera créé s'il change)
        prixVente: prixVente(med),
        consommable: med.consommable ? 'OUI' : 'NON',
        codesBarres: (med.codesBarres ?? []).map((c) => ({ ...c })),
      }
    : {
        code: '',
        designation: '',
        formeId: null,
        dosage: '',
        familleId: null,
        seuilAlerte: 0,
        // Boîte par défaut (si elle existe dans les unités de comptage)
        uniteVenteId: unitesVente.value.find((u) => u.code === 'BOITE')?.id ?? null,
        prixVente: '',
        consommable: 'NON',
        stockInitial: '',
        numeroLot: '',
        datePeremption: '',
        codesBarres: [],
      }
}

// ---------------------------------------------------------------------------
// CODES-BARRES du formulaire
//   - médicament existant : le code est enregistré (ou retiré) tout de suite ;
//   - nouveau médicament : les codes sont envoyés avec la création.
// ---------------------------------------------------------------------------
async function ajouterCode(code) {
  const f = formulaire.value
  if (!codeValide(code)) {
    bip(true)
    return store.dispatch('notifications/erreur', `Code-barres invalide : ${code}`)
  }
  if (f.codesBarres.some((c) => c.code === code)) return bip()
  // Déjà rattaché à un AUTRE médicament de la liste ?
  const autre = medicaments.value.find((m) => m.id !== f.id && m.codesBarres?.some((c) => c.code === code))
  if (autre) {
    bip(true)
    return store.dispatch('notifications/erreur', `Le code ${code} appartient déjà à « ${autre.designation} ».`)
  }
  try {
    if (f.id) {
      const cree = (await api.post(`/produits/${f.id}/codes-barres`, { code })).data
      f.codesBarres.push({ id: cree.id, code: cree.code, unite: cree.unite })
      store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch(() => {})
    } else {
      f.codesBarres.push({ code, unite: 'BOITE' })
    }
    bip()
  } catch (erreur) {
    bip(true)
    store.dispatch('notifications/erreurApi', erreur)
  }
}

// ---------------------------------------------------------------------------
// SCAN AVEC LE TÉLÉPHONE : le PC ouvre une demande, le téléphone y envoie le code
// scanné (écran Codes-barres) ; il arrive AUSSITÔT ici (utils/scanDistant.js).
// Une seule boîte : l'attente s'arrête dès que le code est reçu.
// ---------------------------------------------------------------------------
/** Dernier code reçu du téléphone (message de confirmation affiché quelques secondes). */
const recuDuTelephone = ref('')
let effacerRecu = null

const libelleDistant = () => {
  const f = formulaire.value
  return f?.designation ? `${f.designation}${f.id ? '' : ' (nouveau)'}` : 'Nouveau médicament'
}

const {
  actif: distant,
  demarrer: demarrerTelephone,
  arreter: arreterDistant,
  renommer: renommerDistant,
} = utiliserScanDistant({
  libelle: libelleDistant,
  continu: false,
  surCode: async (code) => {
    if (!formulaire.value) return
    await ajouterCode(code)
    recuDuTelephone.value = code
    clearTimeout(effacerRecu)
    effacerRecu = setTimeout(() => (recuDuTelephone.value = ''), 8000)
  },
})
function demarrerDistant() {
  recuDuTelephone.value = ''
  demarrerTelephone()
}

// Nom affiché sur le téléphone : suit la désignation saisie
let attenteLibelle = null
watch(
  () => formulaire.value?.designation,
  () => {
    if (!distant.value) return
    clearTimeout(attenteLibelle)
    attenteLibelle = setTimeout(renommerDistant, 800)
  },
)
// Formulaire fermé ou vidé (nouvelle saisie) : la demande est fermée
watch(formulaire, (nouveau, ancien) => {
  if (nouveau !== ancien) recuDuTelephone.value = ''
  if (distant.value && nouveau !== ancien) arreterDistant()
})

async function retirerCode(c) {
  const f = formulaire.value
  try {
    if (f.id && c.id) await api.delete(`/produits/${f.id}/codes-barres/${c.id}`)
    f.codesBarres = f.codesBarres.filter((x) => x.code !== c.code)
    if (f.id) store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch(() => {})
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

async function enregistrer() {
  enregistrement.value = true
  try {
    const f = formulaire.value
    const prix = Math.max(0, Number(f.prixVente) || 0)
    await store.dispatch('referentiel/enregistrer', {
      liste: 'medicaments',
      element: {
        id: f.id,
        code: f.code,
        designation: f.designation,
        formeId: f.formeId ?? null,
        dosage: f.dosage,
        familleId: f.familleId ?? null,
        seuilAlerte: Math.max(0, Math.round(Number(f.seuilAlerte) || 0)),
        uniteVenteId: f.uniteVenteId ?? null,
        consommable: f.consommable === 'OUI',
        // Un seul prix de vente, par unité de comptage (comme le district)
        venteBoite: true,
        ventePlaque: false,
        prixVenteBoite: prix,
        prixVentePlaque: 0,
        // Stock initial, lot et péremption : seulement à la CRÉATION
        ...(f.id
          ? {}
          : {
              plaquesParBoite: 1,
              stockInitial: Number(f.stockInitial) || '',
              numeroLot: f.numeroLot,
              datePeremption: f.datePeremption,
              codesBarres: f.codesBarres.map((c) => ({ code: c.code, unite: c.unite })),
            }),
      },
    })
    store.dispatch('notifications/succes', f.id ? 'Médicament modifié.' : 'Médicament créé.')
    // La fenêtre RESTE OUVERTE (c'est l'utilisateur qui la ferme : × ou Fermer)
    // et les champs sont VIDÉS, prêts pour une nouvelle saisie.
    ouvrirFormulaire()
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

async function changerActif(med) {
  const confirme = await confirmer({
    titre: med.actif ? 'Désactiver ce médicament ?' : 'Réactiver ce médicament ?',
    texte: med.actif
      ? `« ${med.designation} » ne sera plus proposé à la vente ni à l'entrée en stock. Son historique est conservé.`
      : `« ${med.designation} » sera de nouveau disponible.`,
    boutonConfirmer: med.actif ? 'Oui, désactiver' : 'Oui, réactiver',
    danger: med.actif,
  })
  if (!confirme) return
  try {
    await store.dispatch('referentiel/changerActif', { liste: 'medicaments', element: med, actif: !med.actif })
    store.dispatch('notifications/succes', med.actif ? 'Médicament désactivé.' : 'Médicament réactivé.')
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

// ---------------------------------------------------------------------------
// EXPORT PDF ET IMPORT DE FICHIER
// ---------------------------------------------------------------------------

/** Ligne sous le titre du PDF : rappelle les filtres appliqués. */
const sousTitrePdf = computed(() =>
  [
    familleFiltre.value ? `Famille : ${familles.value.find((f) => f.id === familleFiltre.value)?.libelle}` : 'Toutes les familles',
    formeFiltre.value ? `Forme : ${formes.value.find((f) => f.id === formeFiltre.value)?.libelle}` : null,
    etatFiltre.value ? `État : ${ETATS[etatFiltre.value]?.libelle}` : null,
    afficherInactifs.value ? 'médicaments actifs et inactifs' : 'médicaments actifs',
  ]
    .filter(Boolean)
    .join(' — '),
)

/** Colonnes du PDF. */
const COLONNES_PDF = [
  { titre: 'Code', valeur: (m) => m.code },
  { titre: 'Désignation', valeur: (m) => m.designation },
  { titre: 'Code-barres', valeur: (m) => (m.codesBarres ?? []).map((c) => c.code).join(', ') },
  { titre: 'Forme / dosage', valeur: (m) => [m.forme?.libelle, m.dosage].filter(Boolean).join(' · ') },
  { titre: 'Famille', valeur: (m) => m.famille?.libelle },
  { titre: 'Seuil', valeur: (m) => m.seuilAlerte || '', droite: true },
  { titre: 'Unité de comptage', valeur: (m) => uniteVente(m) },
  { titre: 'Prix de vente', valeur: (m) => montant(prixVente(m)), droite: true, somme: prixVente, formatTotal: montant },
  { titre: "Prix d'achat", valeur: (m) => montant(prixAchat(m)), droite: true, somme: prixAchat, formatTotal: montant },
  { titre: 'Stock', valeur: (m) => quantite(m.stockDisponible ?? 0, m.plaquesParBoite), droite: true },
  { titre: 'État', valeur: (m) => ETATS[m.etatStock]?.libelle },
  { titre: 'Consommable', valeur: (m) => (m.consommable ? 'Oui' : 'Non') },
  { titre: 'Statut', valeur: (m) => (m.actif ? 'Actif' : 'Inactif') },
]

/** Colonnes attendues dans le fichier importé (et dans le modèle Excel), comme le district. */
const COLONNES_IMPORT = [
  // --- Identification (dans le même ordre que le formulaire) ---
  { cle: 'code', titre: 'Code', exemple: 'PARA500', aide: 'Facultatif : code unique du médicament. Vide = code automatique (MED-0001)' },
  { cle: 'famille', titre: 'Famille', exemple: 'ANTALGIQUES', aide: "Libellé de la famille (ajoutée à la liste si elle n'existe pas)" },
  { cle: 'forme', titre: 'Forme', exemple: 'COMPRIMÉ', aide: "Libellé de la forme (ajoutée à la liste si elle n'existe pas)" },
  { cle: 'designation', titre: 'Désignation', obligatoire: true, exemple: 'PARACÉTAMOL 500 MG' },
  { cle: 'dosage', titre: 'Dosage', exemple: '500 MG' },
  // --- Vente ---
  { cle: 'uniteVente', titre: 'Unité de comptage', exemple: 'BOÎTE', aide: "Boîte, flacon, tube… (ajoutée si elle n'existe pas). BOÎTE si vide. Le prix de vente s'applique à cette unité" },
  { cle: 'prixVente', titre: 'Prix de vente', exemple: 500, aide: "En FCFA, par unité de comptage. S'il change, un nouveau prix est créé à la date du jour" },
  { cle: 'prixAchat', titre: "Prix d'achat", exemple: 350, aide: "En FCFA, par unité de comptage : prix du stock initial" },
  { cle: 'consommable', titre: 'Consommable', exemple: 'Non', aide: 'Oui ou Non (gants, seringues… : vendu à 0 F mais décompté du stock). Non si vide' },
  // --- Stock ---
  { cle: 'seuilAlerte', titre: "Seuil d'alerte", exemple: 50, aide: "Stock minimum (par unité de comptage) : en dessous, « Sous stock ». Vide = inchangé (0 pour un nouveau médicament)" },
  // --- Stock initial (seulement pour un NOUVEAU médicament) ---
  { cle: 'stockInitial', titre: 'Stock initial', exemple: 200, aide: 'Seulement pour un nouveau médicament (ignoré si le code existe déjà)' },
  { cle: 'numeroLot', titre: 'N° de lot', exemple: 'LOT2026-01', aide: 'Obligatoire si un stock initial est indiqué' },
  { cle: 'datePeremption', titre: 'Date de péremption', exemple: '31/12/2027', aide: 'Obligatoire si un stock initial est indiqué (JJ/MM/AAAA)' },
]

/** Enregistre UNE ligne : mise à jour si le code existe, sinon création. */
async function importerLigne(valeurs) {
  // Lecture des valeurs AVANT d'enregistrer (une valeur invalide arrête la ligne)
  const prix = enNombreImport(valeurs.prixVente, 'Prix de vente')
  const seuil = enNombreImport(valeurs.seuilAlerte, "Seuil d'alerte")
  if (seuil !== null && seuil < 0) throw new Error("Seuil d'alerte : la valeur ne peut pas être négative.")
  const existant = trouverParCode(medicaments.value, valeurs.code)

  const element = sansChampsVides({
    id: existant?.id,
    code: enTexte(valeurs.code),
    designation: enTexte(valeurs.designation),
    forme: enTexte(valeurs.forme),
    dosage: enTexte(valeurs.dosage),
    famille: enTexte(valeurs.famille),
    uniteVente: enTexte(valeurs.uniteVente),
    consommable: enOuiNon(valeurs.consommable),
    seuilAlerte: seuil === null ? null : Math.round(seuil),
    // Un seul prix de vente, par unité de comptage
    ...(prix === null ? {} : { venteBoite: true, ventePlaque: false, prixVenteBoite: prix, prixVentePlaque: 0 }),
  })

  // Stock initial, n° de lot et péremption : seulement pour un NOUVEAU médicament
  if (!existant) {
    element.plaquesParBoite = 1
    const stock = enNombreImport(valeurs.stockInitial, 'Stock initial')
    if (stock !== null && stock > 0) {
      element.stockInitial = Math.round(stock)
      element.prixAchat = enNombreImport(valeurs.prixAchat, "Prix d'achat") ?? 0
      element.numeroLot = enTexte(valeurs.numeroLot)
      element.datePeremption = enDateImport(valeurs.datePeremption, 'Date de péremption')
    }
  }

  await store.dispatch('referentiel/enregistrer', { liste: 'medicaments', element })
  return existant ? 'modifie' : 'cree'
}

// « Data table » : tri en cliquant sur les en-têtes + pagination.
const VALEURS_TRI = {
  code: (m) => m.code,
  designation: (m) => m.designation,
  codeBarre: (m) => m.codesBarres?.[0]?.code ?? '',
  forme: (m) => m.forme?.libelle,
  famille: (m) => m.famille?.libelle,
  seuil: (m) => m.seuilAlerte,
  prixVente: (m) => prixVente(m),
  prixAchat: (m) => prixAchat(m),
  stock: (m) => m.stockDisponible ?? 0,
  etat: (m) => ETATS[m.etatStock]?.libelle,
  statut: (m) => (m.actif ? 'Actif' : 'Inactif'),
}
// Retour à la page 1 quand la recherche, un filtre ou le tri change
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(
  medicamentsAffiches,
  [recherche, formeFiltre, familleFiltre, etatFiltre, afficherInactifs],
  VALEURS_TRI,
)

onMounted(async () => {
  await charger()
  // Arrivée depuis l'écran mobile « Codes-barres » : création avec le code scanné
  const code = route.query.codeBarre
  if (code && store.getters['auth/peutModifier']('produits')) {
    ouvrirFormulaire()
    formulaire.value.codesBarres.push({ code: String(code), unite: 'BOITE' })
    const { codeBarre, ...reste } = route.query
    router.replace({ query: reste })
  }
})
// Stock et états actualisés automatiquement (§ 13.2) ; la liste seule, le formulaire n'est pas touché
utiliserActualisation(() => store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch(() => {}))
</script>

<style scoped>
/* Compteurs par état : un clic filtre la liste sur cet état (nouveau clic = tous) */
.compteurs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 0.9rem;
}
.compteur {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
}
.compteur:hover,
.compteur.choisi {
  border-color: var(--primary);
  background: var(--fond-pale);
}
.detail {
  font-size: 0.78rem;
  color: var(--muted);
}
/* Étiquette « Consommable » dans la liste */
.consommable {
  margin-left: 0.4rem;
}
/* Stock sous le seuil d'alerte */
.stock-bas {
  color: var(--danger);
}
/* Encadré du stock actuel (modification) */
.stock-actuel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  align-self: start;
  margin-top: 1.6rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--fond-pale);
}
.stock-actuel strong {
  font-size: 1.1rem;
  color: var(--primary-dark);
}
.stock-actuel .aide {
  flex-basis: 100%;
  margin: 0;
}
.codes-barres { display: flex; flex-direction: column; gap: 0.5rem; }
.liste-codes { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
.puce-code {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.3rem 0.2rem 0.7rem;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-weight: 600;
}
.retirer-code {
  padding: 0 0.45rem;
  border-radius: 999px;
  background: transparent;
  color: var(--danger);
  font-size: 1rem;
  line-height: 1.4;
}
.retirer-code:hover { background: #fdecec; }
.champ-ajout-code { max-width: 520px; }
.col-code-barre { white-space: nowrap; }
.col-code-barre .badge { margin-left: 0.3rem; }
.sans-code { color: var(--muted); }
.ajout-code { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.ajout-code .champ-ajout-code { flex: 1; min-width: 260px; }
.attente-telephone {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  background: var(--primary-light);
  color: var(--primary-dark);
}
.attente-telephone > div { flex: 1; }
.attente-telephone small { display: block; color: var(--texte-sur-fond); }
.pulsation {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  animation: pulsation 1.2s infinite;
}
@keyframes pulsation {
  0% { box-shadow: 0 0 0 0 rgba(2, 136, 209, 0.6); }
  100% { box-shadow: 0 0 0 12px rgba(2, 136, 209, 0); }
}
.recu-telephone { margin: 0; color: #15803d; font-size: 0.9rem; }
</style>
