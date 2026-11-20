/**
 * =============================================================================
 * OUTILS COMMUNS AUX ENTRÉES EN STOCK
 * =============================================================================
 *   - BON DE RÉCEPTION en PDF (fournisseur, produits, lots, quantités, prix),
 *     même présentation que les documents de l'application du district.
 * =============================================================================
 */
import { exporterDocumentPdf, nomPersonne } from '@/utils/documentPdf'
import { date, montant, nombre } from '@/utils/format'

/** BON DE RÉCEPTION (PDF) à partir d'une réception complète (lignes par lot). */
export function bonDeReceptionPdf(r) {
  const f = r.fournisseur
  return exporterDocumentPdf({
    titre: 'BON DE RÉCEPTION',
    numero: r.numero,
    encadres: [
      {
        titre: 'Fournisseur',
        lignes: [
          ['Raison sociale', f.nom],
          ['Code', f.code],
          ['Contact', f.contact],
          ['Téléphone', f.telephone],
          ['Adresse', f.adresse],
        ],
      },
      {
        titre: 'Réception',
        lignes: [
          ['Date', date(r.dateReception)],
          ['N° facture', r.numFactureFourn],
          ['N° bon de livraison', r.numBonLivraison],
          ['Saisie par', nomPersonne(r.utilisateur)],
          ['Enregistrée le', new Date(r.createdAt).toLocaleString('fr-FR')],
          ['Lignes', r.lignes.length],
        ],
      },
    ],
    colonnes: [
      { titre: 'N°', valeur: (l) => r.lignes.indexOf(l) + 1, largeur: 8 },
      { titre: 'Médicament', valeur: (l) => (l.produit.code ? `${l.produit.code} — ${l.produit.designation}` : l.produit.designation) },
      { titre: 'Unité', valeur: (l) => (l.unite === 'PLAQUE' ? 'PLAQUE' : l.produit.uniteVente?.libelle || 'BOÎTE'), largeur: 18 },
      { titre: 'Lot', valeur: (l) => l.numeroLot || '—', largeur: 22 },
      { titre: 'Péremption', valeur: (l) => date(l.datePeremption) || '—', largeur: 23 },
      { titre: 'Quantité', valeur: (l) => nombre(l.quantite), droite: true, largeur: 18 },
      { titre: 'Prix unitaire', valeur: (l) => montant(l.prixAchatUnitaire), droite: true, largeur: 26 },
      { titre: 'Montant', valeur: (l) => montant(l.montant), droite: true, largeur: 28 },
    ],
    lignes: r.lignes,
    total: { libelle: 'MONTANT TOTAL', valeur: montant(r.montantTotal) },
    // Observations : générale + celles des lignes
    observations: [
      r.observation,
      ...r.lignes.filter((l) => l.observation).map((l) => `${l.produit.designation} (lot ${l.numeroLot}) : ${l.observation}`),
    ]
      .filter(Boolean)
      .join('\n'),
    signatures: [
      { libelle: 'Le magasinier (reçu conforme)', nom: nomPersonne(r.utilisateur) },
      'Le livreur',
      { libelle: 'Le responsable de la pharmacie', pharmacie: true },
    ],
    nomFichier: `bon_reception_${r.numero}`,
  })
}
