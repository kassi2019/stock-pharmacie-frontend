/**
 * BULLETIN DE PAIE EN PDF (module Gestion de la paie), au format des documents
 * officiels de l'application (en-tête de la pharmacie, encadrés, signatures).
 *     await imprimerBulletin(bulletin)
 */
import { exporterDocumentPdf, nomPersonne } from '@/utils/documentPdf'
import { date, montant } from '@/utils/format'
import { MODES_PAIEMENT, STATUTS_BULLETIN, libelleMois } from '@/api/paie'

export async function imprimerBulletin(b) {
  const p = b.personnel
  const mode = MODES_PAIEMENT.find((m) => m.id === b.modePaiement)?.libelle
  const lignes = [
    { libelle: 'SALAIRE DE BASE', gain: Number(b.salaireBase), retenue: null },
    ...b.lignes.map((l) => ({
      libelle: l.libelle,
      gain: l.type === 'PRIME' ? Number(l.montant) : null,
      retenue: l.type === 'RETENUE' ? Number(l.montant) : null,
    })),
    { libelle: 'TOTAUX', gain: Number(b.salaireBase) + Number(b.totalPrimes), retenue: Number(b.totalRetenues), total: true },
  ]
  await exporterDocumentPdf({
    titre: 'BULLETIN DE PAIE',
    numero: b.numero,
    statut: STATUTS_BULLETIN[b.statut]?.libelle,
    encadres: [
      {
        titre: 'Salarié',
        lignes: [
          ['Matricule', p.matricule],
          ['Nom et prénoms', nomPersonne(p)],
          ['Fonction', p.fonction?.libelle || '—'],
          ['Embauché le', p.dateEmbauche ? date(p.dateEmbauche) : '—'],
        ],
      },
      {
        titre: 'Période',
        lignes: [
          ['Mois de paie', libelleMois(b.mois)],
          ['Payé le', b.datePaiement ? date(b.datePaiement) : '—'],
          ['Mode de paiement', mode || '—'],
        ],
      },
    ],
    colonnes: [
      { titre: 'Libellé', valeur: (l) => l.libelle },
      { titre: 'Gains', valeur: (l) => (l.gain === null ? '' : montant(l.gain)), droite: true, largeur: 40 },
      { titre: 'Retenues', valeur: (l) => (l.retenue === null ? '' : montant(l.retenue)), droite: true, largeur: 40 },
    ],
    lignes,
    total: { libelle: 'NET À PAYER', valeur: montant(b.netAPayer) },
    observations: b.observation || '',
    signatures: [{ libelle: "L'employeur", pharmacie: true }, { libelle: 'Le salarié', nom: nomPersonne(p) }],
    nomFichier: `bulletin_${b.numero}`,
  })
}
