/** États du stock et couleurs (§ 13.1), identiques partout. */
export const ETATS = {
  RUPTURE: { libelle: 'Rupture', couleur: '#d32f2f', texte: '#fff' },
  SANS_CONSO: { libelle: 'Sans consommation', couleur: '#212121', texte: '#fff' },
  SOUS_STOCK: { libelle: 'Sous stock', couleur: '#fbc02d', texte: '#212121' },
  BIEN_STOCKE: { libelle: 'Bien stocké', couleur: '#388e3c', texte: '#fff' },
  SURSTOCK: { libelle: 'Surstock', couleur: '#1976d2', texte: '#fff' },
}

/**
 * État correspondant à un texte de cellule (« Rupture », « Sous stock »…) :
 * utilisé par les exports PDF et Excel pour colorer la colonne État comme à l'écran (§ 18).
 */
export function etatDuTexte(texte) {
  const t = String(texte ?? '').trim().toLowerCase()
  return Object.values(ETATS).find((e) => e.libelle.toLowerCase() === t) ?? null
}

/** « #d32f2f » -> [211, 47, 47] (jsPDF) */
export const enRvb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
