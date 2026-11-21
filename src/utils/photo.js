/**
 * =============================================================================
 * PRÉPARATION D'UNE PHOTO D'IDENTITÉ (avant l'envoi au serveur)
 * =============================================================================
 * La photo choisie (téléphone, appareil photo...) peut peser plusieurs Mo.
 * Avant de l'enregistrer, on la transforme dans le navigateur :
 *   - recadrage en CARRÉ (au centre de l'image) ;
 *   - réduction à 256 x 256 pixels ;
 *   - compression en JPEG.
 * Résultat : un texte « data:image/jpeg;base64,... » d'environ 20 à 40 Ko,
 * enregistré tel quel dans la fiche du personnel.
 *
 *     import { preparerPhoto } from '@/utils/photo'
 *     const photo = await preparerPhoto(fichier)   // fichier = <input type="file">
 * =============================================================================
 */

/** Taille finale de la photo (en pixels, carré). */
const TAILLE = 256
/** Qualité JPEG (0 à 1). */
const QUALITE = 0.82
/** Taille maximale du fichier choisi (au-delà : refusé). */
const POIDS_MAX = 10 * 1024 * 1024 // 10 Mo

/** Lit un fichier image et renvoie la photo prête à enregistrer. */
export async function preparerPhoto(fichier) {
  if (!fichier.type.startsWith('image/')) throw new Error('Choisissez une image (JPEG, PNG...).')
  if (fichier.size > POIDS_MAX) throw new Error('Image trop lourde (10 Mo maximum).')

  const image = await chargerImage(fichier)

  // Carré au centre de l'image
  const cote = Math.min(image.width, image.height)
  const x = (image.width - cote) / 2
  const y = (image.height - cote) / 2

  const canvas = document.createElement('canvas')
  canvas.width = TAILLE
  canvas.height = TAILLE
  const contexte = canvas.getContext('2d')
  contexte.fillStyle = '#ffffff' // fond blanc (images PNG transparentes)
  contexte.fillRect(0, 0, TAILLE, TAILLE)
  contexte.drawImage(image, x, y, cote, cote, 0, 0, TAILLE, TAILLE)

  return canvas.toDataURL('image/jpeg', QUALITE)
}

/** Charge un fichier image dans un objet Image. */
function chargerImage(fichier) {
  return new Promise((resoudre, rejeter) => {
    const adresse = URL.createObjectURL(fichier)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(adresse)
      resoudre(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(adresse)
      rejeter(new Error("Impossible de lire cette image."))
    }
    image.src = adresse
  })
}
