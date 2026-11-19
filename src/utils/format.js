const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

export const montant = (v) => `${nf.format(Number(v ?? 0))} F`
export const nombre = (v) => nf.format(Number(v ?? 0))

/** 'AAAA-MM-JJ…' → 'JJ/MM/AAAA' */
export const date = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '')

export const dateHeure = (v) => (v ? new Date(v).toLocaleString('fr-FR') : '')

/** Date du jour au format AAAA-MM-JJ (heure locale). */
export function aujourdhui() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Quantité en plaques → « 2 bte + 5 plq » lorsque le produit a plusieurs plaques par boîte. */
export function quantite(plaques, plaquesParBoite = 1) {
  if (plaquesParBoite <= 1) return nombre(plaques)
  const boites = Math.floor(plaques / plaquesParBoite)
  const reste = plaques % plaquesParBoite
  return [boites && `${boites} bte`, reste && `${reste} plq`].filter(Boolean).join(' + ') || '0'
}
