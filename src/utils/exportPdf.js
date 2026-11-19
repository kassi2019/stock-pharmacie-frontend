/**
 * =============================================================================
 * EXPORT D'UN TABLEAU EN PDF (librairies jsPDF + jspdf-autotable)
 * =============================================================================
 * Crée un document PDF bien présenté à partir d'une liste :
 *   - bandeau bleu en haut : nom de la pharmacie, titre, date d'édition ;
 *   - tableau avec en-tête vert et lignes alternées ;
 *   - ligne TOTAL à la fin : nombre de lignes + somme des colonnes chiffrées ;
 *   - pied de page sur chaque page : nom de la pharmacie, adresse, téléphone,
 *     e-mail (s'ils sont renseignés) + « Page X / Y ».
 *
 * Utilisation :
 *
 *     import { exporterPdf } from '@/utils/exportPdf'
 *     await exporterPdf({
 *       titre: 'Liste des fournisseurs',
 *       sousTitre: 'Fournisseurs actifs',              // facultatif
 *       colonnes: [
 *         { titre: 'Code', valeur: (f) => f.code },
 *         { titre: 'Raison sociale', valeur: (f) => f.raisonSociale },
 *         { titre: 'Prix', valeur: (m) => formaterMontant(m.prix), droite: true,
 *           somme: (m) => m.prix, formatTotal: formaterMontant },   // ➜ total
 *       ],
 *       lignes: fournisseurs,                          // les lignes AFFICHÉES
 *       nomFichier: 'fournisseurs',                    // sans ".pdf"
 *     })
 *
 * TOTAL : une colonne avec "somme" (fonction qui donne le nombre de la ligne)
 * est additionnée ; "formatTotal" met le total en forme (par défaut : nombre
 * avec séparateur de milliers). La 1re colonne affiche « TOTAL (N lignes) ».
 *
 * Le document est en PAYSAGE automatiquement s'il y a plus de 6 colonnes.
 * Les informations de la pharmacie viennent des Paramètres généraux
 * (PHARMACIE_NOM, PHARMACIE_ADRESSE, PHARMACIE_TELEPHONE, PHARMACIE_EMAIL...).
 * =============================================================================
 */
import { listerParametres } from '@/api/parametrage'
import { enRvb, etatDuTexte } from './etats'

// Couleurs (les mêmes que dans src/style.css), en [rouge, vert, bleu]
const BLEU = [2, 136, 209] // bleu ciel
const BLEU_FONCE = [1, 87, 155]
const BLEU_PALE = [240, 248, 254]
const TEXTE = [31, 41, 55]
const GRIS = [107, 114, 128]

/**
 * Nettoie un texte pour le PDF.
 * Les polices de base du PDF ne connaissent pas certains espaces spéciaux
 * (ex. l'espace des milliers « 12 500 » produit par toLocaleString) : on les
 * remplace par des espaces normaux, sinon des caractères bizarres apparaissent.
 */
export function nettoyerTexte(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  return String(valeur).replace(/[\u00a0\u202f\u2009]/g, ' ')
}

/**
 * Informations de la pharmacie (Paramètres généraux) :
 *   { nom: 'Pharmacie de la clinique', contact: 'Adresse · Tél. ... · e-mail' }
 * Valeurs par défaut si les paramètres sont indisponibles.
 */
export async function infosPharmacie() {
  try {
    const parametres = await listerParametres()
    const valeur = (cle) => (parametres.find((p) => p.cle === cle)?.valeur || '').trim()
    const telephone = valeur('PHARMACIE_TELEPHONE')
    const contact = [
      [valeur('PHARMACIE_ADRESSE'), valeur('PHARMACIE_LOCALITE')].filter(Boolean).join(', '),
      telephone ? `Tél. ${telephone}` : '',
      valeur('PHARMACIE_EMAIL'),
    ]
      .filter(Boolean)
      .join(' · ')
    return { nom: valeur('PHARMACIE_NOM') || 'Pharmacie', contact, responsable: valeur('PHARMACIE_RESPONSABLE') }
  } catch {
    return { nom: 'Pharmacie', contact: '', responsable: '' }
  }
}

/** Crée et télécharge le PDF. */
export async function exporterPdf({ titre, sousTitre = '', colonnes, lignes, nomFichier }) {
  // Les librairies PDF sont chargées seulement au moment de l'export
  // (l'application reste rapide à l'ouverture).
  const [{ jsPDF }, { autoTable }, { nom: pharmacie, contact }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    infosPharmacie(),
  ])

  const paysage = colonnes.length > 6
  const doc = new jsPDF({ orientation: paysage ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const largeur = doc.internal.pageSize.getWidth()
  const hauteur = doc.internal.pageSize.getHeight()
  const marge = 14

  const maintenant = new Date()
  const dateEdition = maintenant.toLocaleDateString('fr-FR')
  const heureEdition = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // ---------------------------------------------------------------------------
  // 1. BANDEAU BLEU (première page)
  // ---------------------------------------------------------------------------
  doc.setFillColor(...BLEU)
  doc.rect(0, 0, largeur, 34, 'F')
  // Fine bande plus foncée sous le bandeau
  doc.setFillColor(...BLEU_FONCE)
  doc.rect(0, 34, largeur, 1.5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(nettoyerTexte(pharmacie).toUpperCase(), marge, 10)

  doc.setFontSize(17)
  doc.text(nettoyerTexte(titre), marge, 20)

  if (sousTitre) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(nettoyerTexte(sousTitre), marge, 27.5)
  }

  // À droite : date d'édition et nombre de lignes
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Édité le ${dateEdition} à ${heureEdition}`, largeur - marge, 10, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const total = `${lignes.length} enregistrement${lignes.length > 1 ? 's' : ''}`
  doc.text(total, largeur - marge, 20, { align: 'right' })

  // ---------------------------------------------------------------------------
  // 2. TABLEAU
  // ---------------------------------------------------------------------------
  // Colonnes alignées à droite (montants, nombres)
  const stylesColonnes = {}
  colonnes.forEach((colonne, index) => {
    if (colonne.droite) stylesColonnes[index] = { halign: 'right' }
  })

  // ---------------------------------------------------------------------------
  // LIGNE TOTAL : nombre de lignes + somme des colonnes qui ont « somme »
  // ---------------------------------------------------------------------------
  const ligneTotal = colonnes.map((colonne, index) => {
    if (colonne.somme) {
      const total = lignes.reduce((cumul, ligne) => cumul + (Number(colonne.somme(ligne)) || 0), 0)
      return nettoyerTexte(colonne.formatTotal ? colonne.formatTotal(total) : total.toLocaleString('fr-FR'))
    }
    return index === 0 ? `TOTAL (${lignes.length})` : ''
  })

  autoTable(doc, {
    startY: 42,
    margin: { left: marge, right: marge, top: 16, bottom: 18 },
    head: [colonnes.map((c) => nettoyerTexte(c.titre))],
    body: lignes.map((ligne) => colonnes.map((c) => nettoyerTexte(c.valeur(ligne)))),
    // Ligne TOTAL, affichée une seule fois, à la fin du tableau
    foot: lignes.length ? [ligneTotal] : [],
    showFoot: 'lastPage',
    footStyles: {
      fillColor: [225, 245, 254],
      textColor: [1, 87, 155],
      fontStyle: 'bold',
      fontSize: 9.5,
      lineColor: [2, 136, 209],
      lineWidth: { top: 0.6 },
    },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.6,
      textColor: TEXTE,
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: BLEU,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: BLEU_PALE },
    columnStyles: stylesColonnes,

    // Titre et total des colonnes de montants alignés à droite, comme leurs valeurs
    didParseCell: (donnees) => {
      if (donnees.section !== 'body' && colonnes[donnees.column.index]?.droite) {
        donnees.cell.styles.halign = 'right'
      }
      // État du stock : même couleur qu'à l'écran (§ 18)
      if (donnees.section === 'body') {
        const etat = etatDuTexte(donnees.cell.raw)
        if (etat) {
          donnees.cell.styles.fillColor = enRvb(etat.couleur)
          donnees.cell.styles.textColor = enRvb(etat.texte === '#fff' ? '#ffffff' : etat.texte)
          donnees.cell.styles.fontStyle = 'bold'
        }
      }
    },

    // Pied de page (et petit rappel du titre sur les pages suivantes)
    didDrawPage: (donnees) => {
      if (donnees.pageNumber > 1) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...BLEU_FONCE)
        doc.text(nettoyerTexte(titre), marge, 10)
      }
      doc.setDrawColor(...BLEU)
      doc.setLineWidth(0.4)
      doc.line(marge, hauteur - 12, largeur - marge, hauteur - 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRIS)
      // Nom de la pharmacie + coordonnées (coupé s'il est trop long pour la moitié gauche de la page)
      const piedGauche = contact ? `${nettoyerTexte(pharmacie)} — ${nettoyerTexte(contact)}` : `${nettoyerTexte(pharmacie)} — Gestion de stock`
      doc.text(doc.splitTextToSize(piedGauche, largeur - 2 * marge - 30)[0], marge, hauteur - 7)
      // "{total}" est remplacé à la fin par le nombre total de pages
      doc.text(`Page ${donnees.pageNumber} / {total}`, largeur - marge, hauteur - 7, { align: 'right' })
    },
  })

  // Tableau vide : petit message sous le bandeau
  if (lignes.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...GRIS)
    doc.text('Aucune donnée à afficher.', marge, 60)
  }

  doc.putTotalPages('{total}')
  doc.save(`${nomFichier}_${maintenant.toISOString().substring(0, 10)}.pdf`)
}
