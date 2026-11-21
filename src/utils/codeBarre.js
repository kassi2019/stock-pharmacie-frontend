/**
 * =============================================================================
 * CODES-BARRES : lecture, nettoyage et bip
 * =============================================================================
 * Un code arrive de trois façons, toutes traitées pareil :
 *   - CAMÉRA du téléphone / de la tablette (components/ScannerCamera.vue) ;
 *   - SAISIE au clavier (champ « Scanner ou saisir », touche Entrée) ;
 *   - DOUCHETTE USB (plus tard) : elle « tape » le code puis Entrée, comme un clavier.
 *
 * normaliserCode() rend un code comparable à ceux enregistrés :
 *   - espaces retirés, MAJUSCULES ;
 *   - DATA MATRIX des boîtes récentes (GS1, ex. « 0103400930000120… ») : on garde le
 *     GTIN (01) et on le ramène au code EAN-13 imprimé sur la même boîte
 *     (« 03400930000120 » -> « 3400930000120 »). Ainsi le petit carré et le code-barres
 *     classique d'une même boîte donnent le MÊME code.
 * =============================================================================
 */

/** Préfixes d'identification ajoutés par certains lecteurs (]d2 = Data Matrix GS1, ]C1 = GS1-128…). */
const PREFIXE_AIM = /^\][A-Za-z]\d/

export function normaliserCode(texte) {
  let code = String(texte ?? '')
    .replace(PREFIXE_AIM, '')
    .replace(/\s+/g, '') // (le séparateur GS1 \u001d n'est pas un espace : il est gardé)
  // GS1 (Data Matrix, GS1-128) : identifiant d'application 01 = GTIN sur 14 chiffres
  const gs1 = code.match(/^01(\d{14})/)
  if (gs1 && code.length > 16) code = gs1[1]
  else if (/^01\d{14}$/.test(code)) code = code.slice(2)
  // GTIN-14 commençant par 0 = EAN-13 précédé d'un zéro
  if (/^0\d{13}$/.test(code)) code = code.slice(1)
  return code.replace(/\u001d/g, '').toUpperCase()
}

/** Format accepté (le même que le serveur) : 4 à 50 chiffres ou lettres, sans espace. */
export const codeValide = (code) => /^[0-9A-Z.\-_/+]{4,50}$/.test(code)

/** Petit bip de confirmation (ou grave en cas d'erreur), sans fichier son. */
let contexteAudio = null
export function bip(erreur = false) {
  try {
    contexteAudio ??= new (window.AudioContext || window.webkitAudioContext)()
    const oscillateur = contexteAudio.createOscillator()
    const volume = contexteAudio.createGain()
    oscillateur.frequency.value = erreur ? 220 : 1320
    volume.gain.value = 0.08
    oscillateur.connect(volume).connect(contexteAudio.destination)
    oscillateur.start()
    oscillateur.stop(contexteAudio.currentTime + (erreur ? 0.35 : 0.12))
    if (navigator.vibrate) navigator.vibrate(erreur ? [80, 60, 80] : 60)
  } catch {
    // Pas de son possible : sans importance
  }
}
