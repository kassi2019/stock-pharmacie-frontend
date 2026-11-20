/**
 * =============================================================================
 * OUTILS COMMUNS À LA DISPENSATION
 * =============================================================================
 *   - FICHE DE DISPENSATION en PDF (patient, médicaments délivrés, lots sortis),
 *     même présentation que les documents de l'application du district.
 * =============================================================================
 */
import { exporterDocumentPdf, nomPersonne } from '@/utils/documentPdf'
import { date, dateHeure, montant, nombre } from '@/utils/format'

/** Unité de la ligne : PLAQUE, ou l'unité de comptage du produit (BOÎTE par défaut). */
export const uniteLigne = (l) => (l.unite === 'PLAQUE' ? 'PLAQUE' : l.produit.uniteVente?.libelle ?? 'BOÎTE')

/** FICHE DE DISPENSATION (PDF) à partir d'une dispensation complète. */
export function ficheDispensationPdf(d) {
  const annulee = d.statut === 'ANNULEE'
  // Lots sortis (FEFO) de chaque ligne, pour la traçabilité sur le document
  const lots = (l) => [
    ...new Set(
      (d.mouvements || [])
        .filter((m) => m.type !== 'ANNULATION' && m.produitId === l.produit.id)
        .map((m) => `${m.lot.numeroLot} (${date(m.lot.datePeremption)})`),
    ),
  ].join(', ')
  const avecLots = d.lignes.some((l) => lots(l))

  return exporterDocumentPdf({
    titre: 'FICHE DE DISPENSATION',
    numero: d.numero,
    statut: annulee ? 'Annulée' : 'Validée',
    encadres: [
      // Patient : seulement pour les anciennes dispensations (le formulaire ne le demande plus)
      ...(d.patient ? [{
        titre: 'Patient',
        lignes: [
          ['Patient', d.patient],
          ['N° de passage', d.numeroPassage],
          ['Prescripteur', d.prescripteur],
        ],
      }] : []),
      {
        titre: 'Dispensation',
        lignes: [
          ['Date', dateHeure(d.date)],
          ['Agent', nomPersonne(d.utilisateur)],
          ...(annulee
            ? [
                ['Annulée le', dateHeure(d.dateAnnulation)],
                ['Annulée par', nomPersonne(d.annulePar)],
              ]
            : []),
        ],
      },
    ],
    colonnes: [
      { titre: 'N°', valeur: (l) => d.lignes.indexOf(l) + 1, largeur: 8 },
      { titre: 'Médicament', valeur: (l) => `${l.produit.code} — ${l.produit.designation}${l.produit.consommable ? ' (consommable)' : ''}` },
      ...(avecLots ? [{ titre: 'Lots sortis', valeur: lots, largeur: 38 }] : []),
      { titre: 'Quantité', valeur: (l) => `${nombre(l.quantite)} ${uniteLigne(l).toLowerCase()}`, droite: true, largeur: 24 },
      { titre: 'Prix unitaire', valeur: (l) => montant(l.prixUnitaire), droite: true, largeur: 26 },
      { titre: 'Montant', valeur: (l) => montant(l.montant), droite: true, largeur: 28 },
    ],
    lignes: d.lignes,
    total: { libelle: 'MONTANT TOTAL', valeur: montant(d.montantTotal) },
    observations: annulee ? `Dispensation annulée — motif : ${d.motifAnnulation || ''}. Les quantités ont été remises dans leurs lots d'origine.` : '',
    signatures: [
      { libelle: "L'agent de la pharmacie", nom: nomPersonne(d.utilisateur) },
      ...(d.patient ? ['Le patient (reçu conforme)'] : []),
    ],
    nomFichier: `dispensation_${d.numero}`,
  })
}
