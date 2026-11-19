/**
 * =============================================================================
 * EXPORT EXCEL D'UN TABLEAU (§ 15 : « exportable en Excel et PDF avec l'en-tête
 * de la clinique ») — librairie ExcelJS, chargée seulement au moment de l'export.
 * =============================================================================
 * Mêmes colonnes que le PDF (voir exportPdf.js) :
 *   { titre, valeur: (ligne) => texte, droite?, somme?: (ligne) => nombre, formatTotal? }
 * - une colonne avec « somme » est écrite en NOMBRE (cellule calculable dans Excel)
 *   et reçoit un total en bas ;
 * - les autres colonnes sont écrites en texte, comme à l'écran.
 * En-tête : nom et coordonnées de la pharmacie, titre, sous-titre, date d'édition.
 */
import { infosPharmacie } from './exportPdf'
import { etatDuTexte } from './etats'

const BLEU = 'FF0288D1'
const BLEU_PALE = 'FFF0F8FE'

/** Nettoie un nom de fichier / de feuille. */
const nomPropre = (texte, max = 31) => String(texte).replace(/[\\/?*[\]:]/g, ' ').slice(0, max)

export async function exporterExcel({ titre, sousTitre = '', colonnes, lignes, nomFichier }) {
  const [{ default: ExcelJS }, { nom: pharmacie, contact }] = await Promise.all([import('exceljs'), infosPharmacie()])
  const classeur = new ExcelJS.Workbook()
  classeur.creator = pharmacie
  const feuille = classeur.addWorksheet(nomPropre(titre), {
    pageSetup: { paperSize: 9, orientation: colonnes.length > 6 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  const nbColonnes = colonnes.length
  const fusionner = (ligne) => feuille.mergeCells(ligne, 1, ligne, Math.max(1, nbColonnes))

  // ---------- En-tête de la clinique ----------
  const maintenant = new Date()
  const entete = [
    { texte: pharmacie.toUpperCase(), police: { bold: true, size: 12, color: { argb: BLEU } } },
    { texte: contact, police: { size: 9, color: { argb: 'FF607D8B' } } },
    { texte: titre, police: { bold: true, size: 15 } },
    { texte: sousTitre, police: { size: 10, color: { argb: 'FF455A64' } } },
    {
      texte: `Édité le ${maintenant.toLocaleDateString('fr-FR')} à ${maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — ${lignes.length} enregistrement(s)`,
      police: { italic: true, size: 9, color: { argb: 'FF607D8B' } },
    },
  ].filter((e) => e.texte)
  entete.forEach((e, i) => {
    const ligne = feuille.getRow(i + 1)
    ligne.getCell(1).value = e.texte
    ligne.getCell(1).font = e.police
    fusionner(i + 1)
  })
  const debutTableau = entete.length + 2

  // ---------- Titres des colonnes ----------
  const titres = feuille.getRow(debutTableau)
  colonnes.forEach((c, i) => {
    const cellule = titres.getCell(i + 1)
    cellule.value = c.titre
    cellule.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU } }
    cellule.alignment = { vertical: 'middle', horizontal: c.droite ? 'right' : 'left', wrapText: true }
  })
  titres.height = 22

  // ---------- Lignes ----------
  lignes.forEach((ligne, n) => {
    const rangee = feuille.getRow(debutTableau + 1 + n)
    colonnes.forEach((c, i) => {
      const cellule = rangee.getCell(i + 1)
      if (c.somme) {
        cellule.value = Number(c.somme(ligne)) || 0
        cellule.numFmt = '# ##0;[Red]-# ##0'
      } else {
        const v = c.valeur(ligne)
        cellule.value = v === null || v === undefined ? '' : typeof v === 'number' ? v : String(v)
      }
      cellule.alignment = { horizontal: c.droite ? 'right' : 'left', vertical: 'top' }
      if (n % 2 === 1) cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU_PALE } }
      // État du stock : même couleur qu'à l'écran (§ 18)
      const etat = !c.somme && etatDuTexte(cellule.value)
      if (etat) {
        const argb = (hex) => `FF${(hex === '#fff' ? '#ffffff' : hex).slice(1).toUpperCase()}`
        cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(etat.couleur) } }
        cellule.font = { bold: true, color: { argb: argb(etat.texte) } }
      }
    })
  })

  // ---------- Totaux (formules Excel) ----------
  if (lignes.length && colonnes.some((c) => c.somme)) {
    const numero = debutTableau + lignes.length + 1
    const rangee = feuille.getRow(numero)
    rangee.getCell(1).value = 'TOTAL'
    colonnes.forEach((c, i) => {
      const cellule = rangee.getCell(i + 1)
      if (c.somme) {
        const lettre = feuille.getColumn(i + 1).letter
        const total = lignes.reduce((s, l) => s + (Number(c.somme(l)) || 0), 0)
        cellule.value = { formula: `SUM(${lettre}${debutTableau + 1}:${lettre}${numero - 1})`, result: total }
        cellule.numFmt = '# ##0;[Red]-# ##0'
        cellule.alignment = { horizontal: 'right' }
      }
      cellule.font = { bold: true }
      cellule.border = { top: { style: 'thin', color: { argb: BLEU } } }
    })
  }

  // ---------- Largeur des colonnes ----------
  colonnes.forEach((c, i) => {
    const longueurs = lignes.slice(0, 300).map((l) => String(c.somme ? Math.round(c.somme(l) ?? 0) : c.valeur(l) ?? '').length)
    feuille.getColumn(i + 1).width = Math.min(48, Math.max(10, c.titre.length + 2, ...longueurs.map((n) => n + 2)))
  })
  feuille.views = [{ state: 'frozen', ySplit: debutTableau }]

  // ---------- Téléchargement ----------
  const contenu = await classeur.xlsx.writeBuffer()
  const blob = new Blob([contenu], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(blob)
  lien.download = `${nomPropre(nomFichier, 80)}.xlsx`
  lien.click()
  URL.revokeObjectURL(lien.href)
}
