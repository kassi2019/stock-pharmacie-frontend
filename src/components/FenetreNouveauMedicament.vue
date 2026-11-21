<!--
  =============================================================================
  CRÉATION RAPIDE D'UN MÉDICAMENT (sans quitter l'écran en cours, ex. réception)
  =============================================================================
  Seulement l'essentiel : désignation, dosage, forme, famille, unité de comptage,
  prix de vente et codes-barres (déjà rempli quand il vient d'un scan inconnu ;
  sinon scanné ici : caméra, clavier / douchette, ou « 📱 Scanner avec le téléphone »).
  Le code (MED-0001…) est automatique ; le stock entre par la réception elle-même.
  Les autres réglages (seuil d'alerte, consommable…) se complètent ensuite dans
  Paramétrage › Médicaments.

      <FenetreNouveauMedicament v-if="creation" :code-barre="code" :designation="texte"
                                @cree="utiliser" @fermer="creation = null" />
  Événement « cree » : le médicament créé (avec son id).
  Droit nécessaire : Modifier sur « Médicaments et prix ».
  =============================================================================
-->
<template>
  <FenetreModale titre="Nouveau médicament" large @fermer="emit('fermer')">
    <form id="form-medicament-rapide" class="grille-formulaire" @submit.prevent="creer">
      <div class="pleine-largeur">
        <label class="obligatoire">Désignation</label>
        <input ref="champDesignation" v-model.trim="f.designation" class="maj" required maxlength="200" placeholder="ex. PARACÉTAMOL 500 MG COMPRIMÉS" />
      </div>
      <div>
        <label>Dosage</label>
        <input v-model.trim="f.dosage" class="maj" maxlength="50" placeholder="ex. 500 MG" />
      </div>
      <div>
        <label>Forme</label>
        <ListeDeroulante v-model="f.formeId" :options="formes" placeholder="— Choisir —" />
      </div>
      <div>
        <label>Famille</label>
        <ListeDeroulante v-model="f.familleId" :options="familles" placeholder="— Aucune —" />
      </div>
      <div>
        <label class="obligatoire">Unité de comptage</label>
        <ListeDeroulante v-model="f.uniteVenteId" :options="unitesVente" :effacable="false" placeholder="BOÎTE" />
      </div>
      <div>
        <label>Prix de vente (FCFA)</label>
        <input v-model="f.prixVente" type="number" min="0" step="1" placeholder="ex. 500" />
        <small class="aide">Par unité de comptage. Peut être saisi plus tard.</small>
      </div>

      <div class="pleine-largeur">
        <label>Codes-barres</label>
        <div class="liste-codes">
          <span v-for="c in f.codesBarres" :key="c" class="puce-code">
            <span class="code">{{ c }}</span>
            <button type="button" class="retirer-code" title="Retirer" @click="f.codesBarres = f.codesBarres.filter((x) => x !== c)">×</button>
          </span>
          <span v-if="!f.codesBarres.length" class="aide">Aucun code-barres.</span>
        </div>
        <div class="ajout-code">
          <ChampCodeBarre placeholder="Scanner ou saisir le code-barres de la boîte…" titre-camera="Scanner la boîte" @code="ajouterCode" />
          <button v-if="!telephoneActif" type="button" class="bouton-secondaire" @click="demarrerTelephone">📱 Scanner avec le téléphone</button>
        </div>
        <p v-if="recuDuTelephone && !telephoneActif" class="recu-telephone">
          ✓ Code <strong class="code">{{ recuDuTelephone }}</strong> reçu du téléphone.
        </p>
        <div v-if="telephoneActif" class="attente-telephone">
          <span class="pulsation"></span>
          <div>
            <strong>En attente du téléphone…</strong>
            <small>Sur le téléphone : écran <strong>Codes-barres</strong> → « Le poste attend un code » → <strong>Scanner</strong>.</small>
          </div>
          <button type="button" class="bouton-secondaire" @click="arreterTelephone()">Annuler</button>
        </div>
      </div>
      <p class="aide pleine-largeur">
        Code automatique (MED-…). Seuil d'alerte et autres réglages : Paramétrage › Médicaments.
      </p>
    </form>
    <template #pied>
      <button class="bouton-secondaire" @click="emit('fermer')">Annuler</button>
      <button type="submit" form="form-medicament-rapide" :disabled="envoi">{{ envoi ? 'Création…' : 'Créer le médicament' }}</button>
    </template>
  </FenetreModale>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from './FenetreModale.vue'
import ListeDeroulante from './ListeDeroulante.vue'
import ChampCodeBarre from './ChampCodeBarre.vue'
import { bip, codeValide } from '@/utils/codeBarre'
import { utiliserScanDistant } from '@/utils/scanDistant'

const props = defineProps({
  /** Code-barres déjà scanné (code inconnu) */
  codeBarre: { type: String, default: '' },
  /** Début de désignation déjà tapé dans la liste */
  designation: { type: String, default: '' },
})
const emit = defineEmits(['cree', 'fermer'])
const store = useStore()

const formes = computed(() => store.state.referentiel.formes)
const familles = computed(() => store.state.referentiel.familles)
const unitesVente = computed(() => store.state.referentiel.unitesVente)

const f = ref({
  designation: props.designation.toUpperCase(),
  dosage: '',
  formeId: null,
  familleId: null,
  uniteVenteId: null,
  prixVente: '',
  codesBarres: props.codeBarre ? [props.codeBarre] : [],
})
const envoi = ref(false)
const champDesignation = ref(null)

onMounted(async () => {
  champDesignation.value?.focus()
  try {
    await Promise.all(['formes', 'familles', 'unitesVente'].map((liste) => store.dispatch('referentiel/charger', { liste })))
    // Boîte par défaut (si elle existe dans les unités de comptage)
    f.value.uniteVenteId ??= unitesVente.value.find((u) => u.code === 'BOITE')?.id ?? null
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
})

// Scan avec le téléphone : une boîte, le code arrive aussitôt dans la liste ci-dessus
const recuDuTelephone = ref('')
const libelleTelephone = () => (f.value.designation ? `${f.value.designation} (nouveau)` : 'Nouveau médicament')
const {
  actif: telephoneActif,
  demarrer: demarrerScan,
  arreter: arreterTelephone,
  renommer: renommerTelephone,
} = utiliserScanDistant({
  libelle: libelleTelephone,
  continu: false,
  surCode: (code) => {
    ajouterCode(code)
    recuDuTelephone.value = code
  },
})
function demarrerTelephone() {
  recuDuTelephone.value = ''
  demarrerScan()
}
// Nom affiché sur le téléphone : suit la désignation saisie
let attenteNom = null
watch(
  () => f.value.designation,
  () => {
    if (!telephoneActif.value) return
    clearTimeout(attenteNom)
    attenteNom = setTimeout(renommerTelephone, 800)
  },
)

function ajouterCode(code) {
  if (!codeValide(code)) {
    bip(true)
    return store.dispatch('notifications/erreur', `Code-barres invalide : ${code}`)
  }
  if (!f.value.codesBarres.includes(code)) f.value.codesBarres.push(code)
  bip()
}

async function creer() {
  envoi.value = true
  try {
    const prix = Math.max(0, Number(f.value.prixVente) || 0)
    const cree = await store.dispatch('referentiel/enregistrer', {
      liste: 'medicaments',
      element: {
        designation: f.value.designation,
        dosage: f.value.dosage,
        formeId: f.value.formeId ?? null,
        familleId: f.value.familleId ?? null,
        uniteVenteId: f.value.uniteVenteId ?? null,
        venteBoite: true,
        ventePlaque: false,
        plaquesParBoite: 1,
        prixVenteBoite: prix,
        prixVentePlaque: 0,
        codesBarres: f.value.codesBarres.map((code) => ({ code, unite: 'BOITE' })),
      },
    })
    if (telephoneActif.value) arreterTelephone()
    store.dispatch('notifications/succes', `Médicament ${cree.code} — ${cree.designation} créé.`)
    emit('cree', cree)
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    envoi.value = false
  }
}
</script>

<style scoped>
.liste-codes { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem; }
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
.retirer-code { padding: 0 0.45rem; border-radius: 999px; background: transparent; color: var(--danger); font-size: 1rem; line-height: 1.4; }
.ajout-code { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.ajout-code > :first-child { flex: 1; min-width: 240px; }
.recu-telephone { margin: 0.4rem 0 0; color: #15803d; font-size: 0.9rem; }
.attente-telephone {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 0.5rem;
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
</style>
