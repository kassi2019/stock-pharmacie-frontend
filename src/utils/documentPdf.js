/**
 * =============================================================================
 * DOCUMENTS OFFICIELS EN PDF (bon de commande, bon de réception...)
 * =============================================================================
 * Mise en page d'un DOCUMENT (et non d'une simple liste) :
 *   - en-tête : nom et coordonnées de la pharmacie (Paramètres généraux) ;
 *   - titre et numéro du document (ex. « BON DE COMMANDE N° BCF-2026-00001 ») ;
 *   - deux encadrés d'informations (ex. Fournisseur / Commande) ;
 *   - tableau des lignes, avec le TOTAL en bas ;
 *   - observations, puis zones de SIGNATURE ;
 *   - pied de page : date d'édition et « Page X / Y ».
 *
 * Utilisation :
 *     await exporterDocumentPdf({
 *       titre: 'BON DE COMMANDE',
 *       numero: 'BCF-2026-00001',
 *       statut: 'Validée',                          // facultatif (affiché à droite)
 *       encadres: [
 *         { titre: 'Fournisseur', lignes: [['Raison sociale', 'NPSP'], ['Téléphone', '...']] },
 *         { titre: 'Commande', lignes: [['Date', '15/11/2026'], ['Établie par', '...']] },
 *       ],
 *       colonnes: [{ titre: 'Désignation', valeur: (l) => ..., droite?: true, largeur?: 60 }],
 *       lignes,
 *       total: { libelle: 'MONTANT TOTAL', valeur: '125 000 FCFA' },
 *       observations: '...',
 *       signatures: [
 *         { libelle: 'Le gestionnaire du dépôt', nom: 'Awa KONÉ' },  // nom écrit automatiquement
 *         { libelle: 'Le responsable de la pharmacie', pharmacie: true }, // nom pris dans Paramètres généraux
 *         'Le livreur',                                               // texte seul : nom à écrire à la main
 *       ],
 *       nomFichier: 'bon_commande_BCF-2026-00001',
 *       orientation: 'landscape',                    // facultatif (défaut : portrait)
 *       policeTableau: 7,                            // facultatif (défaut : 8.8)
 *     })
 * =============================================================================
 */
import store from '@/store'
import { infosPharmacie, nettoyerTexte } from '@/utils/exportPdf'

/** « Prénoms NOM » d'une personne ({ nom, prenoms }), ou '' si inconnue. */
export function nomPersonne(p) {
  return p ? `${p.prenoms || ''} ${p.nom || ''}`.trim() : ''
}

/** Nom de l'utilisateur connecté (celui qui imprime le document). */
export function nomUtilisateurConnecte() {
  return nomPersonne(store.state.auth.utilisateur)
}

const BLEU = [2, 136, 209] // bleu ciel
const BLEU_FONCE = [1, 87, 155]
const BLEU_PALE = [240, 248, 254]
const TEXTE = [31, 41, 55]
const GRIS = [107, 114, 128]

export async function exporterDocumentPdf({
  titre,
  numero,
  statut = '',
  encadres = [],
  colonnes,
  lignes,
  total = null,
  observations = '',
  signatures = [],
  nomFichier,
  orientation = 'portrait', // 'landscape' pour les tableaux larges (ex. rapport centre)
  policeTableau = 8.8, // taille du texte du tableau (plus petit = plus de colonnes)
}) {
  const [{ jsPDF }, { autoTable }, pharmacie] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    infosPharmacie(),
  ])

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const largeur = doc.internal.pageSize.getWidth()
  const hauteur = doc.internal.pageSize.getHeight()
  const marge = 14
  const maintenant = new Date()

  // ---------------------------------------------------------------------------
  // 1. EN-TÊTE : pharmacie à gauche, titre du document à droite
  // ---------------------------------------------------------------------------
  doc.setFillColor(...BLEU)
  doc.rect(0, 0, largeur, 4, 'F')

  doc.setTextColor(...BLEU_FONCE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(nettoyerTexte(pharmacie.nom).toUpperCase(), marge, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  if (pharmacie.contact) doc.text(doc.splitTextToSize(nettoyerTexte(pharmacie.contact), 100), marge, 21.5)

  doc.setTextColor(...TEXTE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(nettoyerTexte(titre), largeur - marge, 15, { align: 'right' })
  doc.setFontSize(11)
  doc.setTextColor(...BLEU_FONCE)
  doc.text(`N° ${nettoyerTexte(numero)}`, largeur - marge, 22, { align: 'right' })
  if (statut) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS)
    doc.text(`Statut : ${nettoyerTexte(statut)}`, largeur - marge, 27, { align: 'right' })
  }

  doc.setDrawColor(...BLEU)
  doc.setLineWidth(0.5)
  doc.line(marge, 32, largeur - marge, 32)

  // ---------------------------------------------------------------------------
  // 2. ENCADRÉS D'INFORMATIONS (côte à côte)
  // ---------------------------------------------------------------------------
  let y = 38
  if (encadres.length) {
    const espace = 6
    const largeurEncadre = (largeur - 2 * marge - espace * (encadres.length - 1)) / encadres.length
    const INTERLIGNE = 3.8 // hauteur d'une ligne de texte supplémentaire (valeur longue)
    const ECART_LIGNES = 5.2 // écart entre deux informations
    // 1) Préparation : chaque valeur est découpée en plusieurs lignes si elle est
    //    trop longue (ex. nom complet du centre), pour qu'elle sorte EN ENTIER.
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    const blocs = encadres.map((encadre) => {
      const infos = encadre.lignes
        .filter(([, valeur]) => valeur !== null && valeur !== undefined && valeur !== '')
        .map(([libelle, valeur]) => ({ libelle, morceaux: doc.splitTextToSize(nettoyerTexte(valeur), largeurEncadre - 40) }))
      const hauteur = 9 + infos.reduce((t, info) => t + ECART_LIGNES + (info.morceaux.length - 1) * INTERLIGNE, 0) + 2
      return { encadre, infos, hauteur }
    })
    // Tous les encadrés ont la même hauteur (celle du plus haut) : rendu aligné
    const hauteurMax = Math.max(...blocs.map((b) => b.hauteur))

    // 2) Dessin
    blocs.forEach(({ encadre, infos }, index) => {
      const x = marge + index * (largeurEncadre + espace)
      doc.setFillColor(...BLEU_PALE)
      doc.setDrawColor(187, 222, 251)
      doc.roundedRect(x, y, largeurEncadre, hauteurMax, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...BLEU_FONCE)
      doc.text(nettoyerTexte(encadre.titre).toUpperCase(), x + 4, y + 6)

      doc.setFontSize(8.5)
      let yLigne = y + 12
      infos.forEach(({ libelle, morceaux }) => {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRIS)
        doc.text(nettoyerTexte(libelle), x + 4, yLigne)
        doc.setTextColor(...TEXTE)
        doc.setFont('helvetica', 'bold')
        doc.text(morceaux, x + 36, yLigne, { lineHeightFactor: INTERLIGNE / (8.5 * 0.3528) })
        yLigne += ECART_LIGNES + (morceaux.length - 1) * INTERLIGNE
      })
    })
    y += hauteurMax + 6
  }

  // ---------------------------------------------------------------------------
  // 3. TABLEAU DES LIGNES (+ TOTAL)
  // ---------------------------------------------------------------------------
  const stylesColonnes = {}
  colonnes.forEach((c, i) => {
    stylesColonnes[i] = { ...(c.droite ? { halign: 'right' } : {}), ...(c.largeur ? { cellWidth: c.largeur } : {}) }
  })
  // Ligne TOTAL : le libellé s'étend sur toutes les colonnes sauf la dernière
  // (sinon il serait coupé dans la 1re colonne, souvent étroite comme « N° »),
  // aligné à droite juste avant le montant.
  const pied = total
    ? [
        [
          { content: nettoyerTexte(total.libelle), colSpan: colonnes.length - 1, styles: { halign: 'right' } },
          { content: nettoyerTexte(total.valeur), styles: { halign: 'right' } },
        ],
      ]
    : []

  autoTable(doc, {
    startY: y,
    margin: { left: marge, right: marge, bottom: 20 },
    head: [colonnes.map((c) => nettoyerTexte(c.titre))],
    body: lignes.map((ligne) => colonnes.map((c) => nettoyerTexte(c.valeur(ligne)))),
    foot: pied,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: policeTableau, cellPadding: policeTableau < 8 ? 1.4 : 2.4, textColor: TEXTE, lineColor: [229, 231, 235], lineWidth: 0.2 },
    headStyles: { fillColor: BLEU, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [225, 245, 254], textColor: BLEU_FONCE, fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: BLEU_PALE },
    columnStyles: stylesColonnes,
    didParseCell: (d) => {
      if (d.section !== 'body' && colonnes[d.column.index]?.droite) d.cell.styles.halign = 'right'
    },
    didDrawPage: (d) => {
      doc.setDrawColor(...BLEU)
      doc.setLineWidth(0.3)
      doc.line(marge, hauteur - 12, largeur - marge, hauteur - 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...GRIS)
      doc.text(
        `${nettoyerTexte(titre)} N° ${nettoyerTexte(numero)} — édité le ${maintenant.toLocaleDateString('fr-FR')} à ${maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        marge,
        hauteur - 7,
      )
      doc.text(`Page ${d.pageNumber} / {total}`, largeur - marge, hauteur - 7, { align: 'right' })
    },
  })
  y = doc.lastAutoTable.finalY + 8

  // ---------------------------------------------------------------------------
  // 4. OBSERVATIONS
  // ---------------------------------------------------------------------------
  if (observations) {
    const texte = doc.splitTextToSize(nettoyerTexte(observations), largeur - 2 * marge)
    if (y + 8 + texte.length * 4.5 > hauteur - 50) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLEU_FONCE)
    doc.text('Observations', marge, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXTE)
    doc.text(texte, marge, y + 5)
    y += 8 + texte.length * 4.5
  }

  // ---------------------------------------------------------------------------
  // 5. SIGNATURES
  // ---------------------------------------------------------------------------
  if (signatures.length) {
    if (y + 35 > hauteur - 16) {
      doc.addPage()
      y = 20
    }
    const largeurSignature = (largeur - 2 * marge) / signatures.length
    signatures.forEach((signature, i) => {
      // Une signature est un texte (libellé seul) ou { libelle, nom?, pharmacie? }
      const { libelle, nom: nomSaisi = '', pharmacie: deLaPharmacie = false } =
        typeof signature === 'string' ? { libelle: signature } : signature
      const nom = (deLaPharmacie ? pharmacie.responsable : nomSaisi) || ''
      const x = marge + i * largeurSignature
      const centre = x + largeurSignature / 2
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TEXTE)
      doc.text(nettoyerTexte(libelle), centre, y + 4, { align: 'center' })
      if (nom) {
        // Nom de l'acteur écrit automatiquement (2 lignes au plus)
        doc.setFontSize(8.5)
        doc.setTextColor(...BLEU_FONCE)
        const lignesNom = doc.splitTextToSize(nettoyerTexte(nom), largeurSignature - 6).slice(0, 2)
        doc.text(lignesNom, centre, y + 9, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...GRIS)
        doc.text('Date et signature', centre, y + 10 + lignesNom.length * 3.6, { align: 'center' })
      } else {
        // Pas de nom connu : à écrire à la main
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...GRIS)
        doc.text('Nom, date et signature', centre, y + 9, { align: 'center' })
      }
      doc.setDrawColor(200, 200, 200)
      doc.line(x + 8, y + 30, x + largeurSignature - 8, y + 30)
    })
  }

  doc.putTotalPages('{total}')
  doc.save(`${nomFichier}.pdf`)
}
