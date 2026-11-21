<!--
  =============================================================================
  SCANNER DE CODE-BARRES PAR LA CAMÉRA (téléphone, tablette, ordinateur)
  =============================================================================
  Fenêtre avec l'image de la caméra arrière ; dès qu'un code est lu : bip,
  événement « lu » (code déjà nettoyé : voir utils/codeBarre.js).

  Lecteur utilisé :
    - celui du NAVIGATEUR (BarcodeDetector) quand il existe (Chrome / Edge Android) :
      rapide et précis ;
    - sinon la bibliothèque ZXing (iPhone, Firefox…), chargée seulement à ce moment.
  Formats (ceux des boîtes de médicaments) : EAN-13, EAN-8, UPC, Code 128, Data Matrix.
  RAPIDITÉ : images analysées l'une après l'autre sans pause, mise au point continue,
  lecteur ZXing préchargé (prechargerLecteur) ; en continu, le même code n'est pas
  relu avant 1,2 s (une boîte devant la caméra ne compte qu'une fois).

  ⚠ La caméra n'est autorisée que sur une adresse HTTPS (ou localhost).

  Utilisation :
      <ScannerCamera v-if="scan" @lu="ajouter" @fermer="scan = false" />
      <ScannerCamera v-if="scan" continu titre="Scanner les boîtes" @lu="..." @fermer="..." />
  Propriétés : titre ; continu = la fenêtre reste ouverte après une lecture
  (le même code n'est pas relu avant 1,2 s).
  =============================================================================
-->
<template>
  <FenetreModale :titre="titre" @fermer="fermer">
    <div class="scanner">
      <div class="cadre-video">
        <video ref="video" muted playsinline autoplay></video>
        <div class="viseur" :class="{ lu: flash }"></div>
        <p v-if="etat === 'demarrage'" class="info">Ouverture de la caméra…</p>
      </div>
      <p v-if="message" class="message" :class="{ erreur: etat === 'erreur' }">{{ message }}</p>
      <p v-else class="aide">Placez le code-barres de la boîte dans le cadre. {{ continu ? 'Les boîtes se scannent l’une après l’autre.' : '' }}</p>
      <p v-if="dernier" class="dernier">Dernier code lu : <strong class="code">{{ dernier }}</strong></p>
      <div v-if="cameras.length > 1" class="choix-camera">
        <label>Caméra</label>
        <select v-model="cameraId" @change="redemarrer">
          <option v-for="c in cameras" :key="c.deviceId" :value="c.deviceId">{{ c.label || 'Caméra' }}</option>
        </select>
      </div>
    </div>
    <template #pied>
      <button class="bouton-secondaire" @click="fermer">{{ continu ? 'Terminer' : 'Fermer' }}</button>
    </template>
  </FenetreModale>
</template>

<script>
/** Lecteur ZXing (iPhone…), chargé une seule fois ; appelé à l'avance pour ouvrir la caméra plus vite. */
let chargement = null
export function prechargerLecteur() {
  chargement ??= Promise.all([import('@zxing/browser'), import('@zxing/library')])
  return chargement
}
</script>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import FenetreModale from './FenetreModale.vue'
import { bip, normaliserCode } from '@/utils/codeBarre'

const props = defineProps({
  titre: { type: String, default: 'Scanner un code-barres' },
  continu: { type: Boolean, default: false },
})
const emit = defineEmits(['lu', 'fermer'])

const video = ref(null)
const etat = ref('demarrage') // demarrage | lecture | erreur
const message = ref('')
const dernier = ref('')
const flash = ref(false)
const cameras = ref([])
const cameraId = ref('')

let flux = null // flux de la caméra (lecteur du navigateur)
let minuterie = null
let actif = false
let controlesZxing = null
let derniereLecture = { code: '', quand: 0 }

const FORMATS_NATIFS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'data_matrix']

/** Code lu : bip, puis « lu » (une seule fois, ou en continu sans doublon rapproché). */
function lu(texte) {
  const code = normaliserCode(texte)
  if (!code) return
  const maintenant = Date.now()
  if (code === derniereLecture.code && maintenant - derniereLecture.quand < 1200) return
  derniereLecture = { code, quand: maintenant }
  dernier.value = code
  flash.value = true
  setTimeout(() => (flash.value = false), 300)
  bip()
  emit('lu', code)
  if (!props.continu) fermer()
}

function contraintes() {
  return {
    audio: false,
    video: cameraId.value
      ? { deviceId: { exact: cameraId.value } }
      : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
  }
}

/** Mise au point continue (et exposition auto) quand l'appareil le permet : lecture plus nette. */
function reglerCamera() {
  const piste = video.value?.srcObject?.getVideoTracks?.()[0]
  const possibles = piste?.getCapabilities?.() ?? {}
  const reglages = {}
  if (possibles.focusMode?.includes('continuous')) reglages.focusMode = 'continuous'
  if (possibles.exposureMode?.includes('continuous')) reglages.exposureMode = 'continuous'
  if (Object.keys(reglages).length) piste.applyConstraints({ advanced: [reglages] }).catch(() => {})
}

/** Lecteur intégré au navigateur (Android) : images analysées à la suite, sans pause. */
async function demarrerNatif() {
  const formats = (await window.BarcodeDetector.getSupportedFormats()).filter((f) => FORMATS_NATIFS.includes(f))
  if (!formats.length) return false
  const detecteur = new window.BarcodeDetector({ formats })
  flux = await navigator.mediaDevices.getUserMedia(contraintes())
  video.value.srcObject = flux
  await video.value.play()
  reglerCamera()
  actif = true
  const analyser = async () => {
    if (!actif) return
    if (video.value && video.value.readyState >= 2) {
      try {
        const codes = await detecteur.detect(video.value)
        if (codes.length) lu(codes[0].rawValue)
      } catch {
        // image illisible : on continue
      }
    }
    if (actif) minuterie = setTimeout(analyser, 30)
  }
  analyser()
  return true
}

/** Bibliothèque ZXing (iPhone, autres navigateurs). */
async function demarrerZxing() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await prechargerLecteur()
  const indices = new Map()
  indices.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
  ])
  // (pas de TRY_HARDER : beaucoup plus lent, inutile avec la mise au point continue)
  const lecteur = new BrowserMultiFormatReader(indices, { delayBetweenScanAttempts: 40, delayBetweenScanSuccess: 300 })
  controlesZxing = await lecteur.decodeFromConstraints(contraintes(), video.value, (resultat) => {
    if (resultat) lu(resultat.getText())
  })
  reglerCamera()
}

async function demarrer() {
  etat.value = 'demarrage'
  message.value = ''
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    etat.value = 'erreur'
    message.value =
      "La caméra n'est disponible que sur une adresse sécurisée (https://…). Ouvrez l'application par son adresse https, ou saisissez le code au clavier."
    return
  }
  try {
    const natif = 'BarcodeDetector' in window && (await demarrerNatif())
    if (!natif) await demarrerZxing()
    etat.value = 'lecture'
    // Liste des caméras (noms visibles une fois l'autorisation donnée)
    const appareils = await navigator.mediaDevices.enumerateDevices()
    cameras.value = appareils.filter((a) => a.kind === 'videoinput')
  } catch (erreur) {
    etat.value = 'erreur'
    message.value =
      erreur?.name === 'NotAllowedError'
        ? "L'accès à la caméra a été refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez."
        : erreur?.name === 'NotFoundError'
          ? 'Aucune caméra trouvée sur cet appareil.'
          : `Impossible d'ouvrir la caméra (${erreur?.message || erreur}).`
  }
}

function arreter() {
  actif = false
  clearTimeout(minuterie)
  minuterie = null
  controlesZxing?.stop()
  controlesZxing = null
  flux?.getTracks().forEach((t) => t.stop())
  flux = null
}

async function redemarrer() {
  arreter()
  await demarrer()
}

function fermer() {
  arreter()
  emit('fermer')
}

onMounted(demarrer)
onBeforeUnmount(arreter)
</script>

<style scoped>
.scanner { display: flex; flex-direction: column; gap: 0.6rem; }
.cadre-video {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background: #0d1b2a;
  aspect-ratio: 4 / 3;
}
.cadre-video video { width: 100%; height: 100%; object-fit: cover; }
.viseur {
  position: absolute;
  inset: 30% 10%;
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.35);
  transition: border-color 0.15s;
}
.viseur.lu { border-color: #22c55e; }
.info {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: #fff;
}
.aide, .message { margin: 0; font-size: 0.88rem; color: var(--muted); }
.message.erreur { color: var(--danger); }
.dernier { margin: 0; font-size: 0.9rem; }
.choix-camera { display: flex; align-items: center; gap: 0.5rem; }
.choix-camera label { margin: 0; }
</style>
