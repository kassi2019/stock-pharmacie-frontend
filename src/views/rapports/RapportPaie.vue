<!--
  =============================================================================
  RAPPORTS — ONGLET « PAIE » (droit VOIR sur la Gestion de la paie)
  =============================================================================
  Pour une année (bulletins de janvier à décembre) :
    - cartes : masse salariale nette, déjà payé, reste à payer, effectif payé ;
    - Par mois         : bulletins, base, primes, retenues, net, payé, reste ;
    - Livre de paie    : cumul de l'année par agent ;
    - Primes et retenues : total par libellé (transport, avance, absence…) ;
    - Paiements        : par mode (espèces, virement, mobile money, chèque) et détail.
  Chaque tableau : tri, total, Excel et PDF avec l'en-tête de la pharmacie.
  =============================================================================
-->
<template>
  <div class="rapport-paie">
    <section class="bloc">
      <div class="barre-outils">
        <label class="champ-annee">Année <input v-model.number="annee" type="number" min="2000" max="2100" @change="charger" /></label>
        <button type="button" class="bouton-secondaire petit" @click="changerAnnee(-1)">← {{ annee - 1 }}</button>
        <button type="button" class="bouton-secondaire petit" @click="changerAnnee(1)">{{ annee + 1 }} →</button>
        <span class="espace"></span>
        <router-link class="btn bouton-secondaire" :to="{ name: 'paie' }">Gestion de la paie →</router-link>
      </div>

      <div class="cartes">
        <div class="carte bleu">
          <small>Masse salariale nette {{ annee }}</small>
          <strong>{{ montant(totaux.net) }}</strong>
          <span>Base {{ montant(totaux.base) }} + primes {{ montant(totaux.primes) }} − retenues {{ montant(totaux.retenues) }}</span>
        </div>
        <div class="carte vert">
          <small>Déjà payé</small>
          <strong>{{ montant(totaux.paye) }}</strong>
          <span>{{ nombreParStatut.PAYE }} bulletin(s) payé(s)</span>
        </div>
        <div class="carte" :class="totaux.reste > 0 ? 'orange' : 'vert'">
          <small>Reste à payer</small>
          <strong>{{ montant(totaux.reste) }}</strong>
          <span>{{ nombreParStatut.VALIDE }} validé(s) · {{ nombreParStatut.BROUILLON }} brouillon(s)</span>
        </div>
        <div class="carte">
          <small>Effectif payé</small>
          <strong>{{ agents.length }}</strong>
          <span>{{ bulletins.length }} bulletin(s) sur l'année</span>
        </div>
      </div>

      <nav class="sous-onglets">
        <button v-for="v in VUES" :key="v.code" type="button" :class="{ actif: vue === v.code }" @click="vue = v.code">{{ v.titre }}</button>
      </nav>

      <p v-if="chargement" class="tableau-vide">Chargement…</p>
      <TableauRapport
        v-else-if="vue === 'mois'"
        :titre="`Masse salariale par mois — ${annee}`"
        :nom-fichier="`paie_par_mois_${annee}`"
        :colonnes="COLONNES_MOIS"
        :lignes="parMois"
        :recherche="false"
      />
      <TableauRapport
        v-else-if="vue === 'agents'"
        :titre="`Livre de paie — ${annee}`"
        sous-titre="Cumul de l'année par membre du personnel"
        :nom-fichier="`livre_de_paie_${annee}`"
        :colonnes="COLONNES_AGENTS"
        :lignes="agents"
        vide="Aucun bulletin sur cette année."
      />
      <TableauRapport
        v-else-if="vue === 'elements'"
        :titre="`Primes et retenues — ${annee}`"
        :nom-fichier="`primes_retenues_${annee}`"
        :colonnes="COLONNES_ELEMENTS"
        :lignes="elements"
        vide="Aucune prime ni retenue sur cette année."
      />
      <template v-else>
        <TableauRapport
          :titre="`Paiements par mode — ${annee}`"
          :nom-fichier="`paiements_par_mode_${annee}`"
          :colonnes="COLONNES_MODES"
          :lignes="parMode"
          :recherche="false"
          vide="Aucun paiement enregistré sur cette année."
        />
        <TableauRapport
          :titre="`Détail des paiements — ${annee}`"
          :nom-fichier="`paiements_${annee}`"
          :colonnes="COLONNES_PAIEMENTS"
          :lignes="paiements"
          vide="Aucun paiement enregistré sur cette année."
        />
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import TableauRapport from './TableauRapport.vue'
import { date, montant } from '@/utils/format'
import { MODES_PAIEMENT, libelleMois, listerBulletins } from '@/api/paie'

const store = useStore()
const VUES = [
  { code: 'mois', titre: 'Par mois' },
  { code: 'agents', titre: 'Livre de paie (par agent)' },
  { code: 'elements', titre: 'Primes et retenues' },
  { code: 'paiements', titre: 'Paiements' },
]
const vue = ref('mois')
const annee = ref(new Date().getFullYear())
const bulletins = ref([])
const chargement = ref(false)

async function charger() {
  chargement.value = true
  try {
    bulletins.value = await listerBulletins({ annee: annee.value })
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}
function changerAnnee(pas) {
  annee.value += pas
  charger()
}
onMounted(charger)

const n = (v) => Number(v) || 0
const nomAgent = (p) => `${p.nom} ${p.prenoms || ''}`.trim()
const modeLibelle = (code) => MODES_PAIEMENT.find((m) => m.id === code)?.libelle ?? code ?? '—'

/** Additionne les montants d'un groupe de bulletins. */
function cumul(liste) {
  const paye = liste.filter((b) => b.statut === 'PAYE').reduce((s, b) => s + n(b.netAPayer), 0)
  const net = liste.reduce((s, b) => s + n(b.netAPayer), 0)
  return {
    bulletins: liste.length,
    base: liste.reduce((s, b) => s + n(b.salaireBase), 0),
    primes: liste.reduce((s, b) => s + n(b.totalPrimes), 0),
    retenues: liste.reduce((s, b) => s + n(b.totalRetenues), 0),
    net,
    paye,
    reste: net - paye,
  }
}

const totaux = computed(() => cumul(bulletins.value))
const nombreParStatut = computed(() => {
  const c = { BROUILLON: 0, VALIDE: 0, PAYE: 0 }
  for (const b of bulletins.value) c[b.statut]++
  return c
})

/** Les 12 mois de l'année (mois sans bulletin : à zéro). */
const parMois = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const mois = `${annee.value}-${String(i + 1).padStart(2, '0')}`
    return { mois, ...cumul(bulletins.value.filter((b) => b.mois === mois)) }
  }),
)

/** Livre de paie : cumul par agent. */
const agents = computed(() => {
  const groupes = new Map()
  for (const b of bulletins.value) {
    if (!groupes.has(b.personnelId)) groupes.set(b.personnelId, { personnel: b.personnel, liste: [] })
    groupes.get(b.personnelId).liste.push(b)
  }
  return [...groupes.values()]
    .map(({ personnel, liste }) => ({ personnel, mois: liste.map((b) => b.mois).sort(), ...cumul(liste) }))
    .sort((a, b) => nomAgent(a.personnel).localeCompare(nomAgent(b.personnel)))
})

/** Primes et retenues regroupées par libellé. */
const elements = computed(() => {
  const groupes = new Map()
  for (const b of bulletins.value) {
    for (const l of b.lignes) {
      const cle = `${l.type}|${l.libelle}`
      if (!groupes.has(cle)) groupes.set(cle, { type: l.type, libelle: l.libelle, nombre: 0, agents: new Set(), total: 0 })
      const g = groupes.get(cle)
      g.nombre++
      g.agents.add(b.personnelId)
      g.total += n(l.montant)
    }
  }
  return [...groupes.values()].sort((a, b) => a.type.localeCompare(b.type) || b.total - a.total)
})

/** Bulletins payés : par mode et en détail. */
const paiements = computed(() =>
  bulletins.value.filter((b) => b.statut === 'PAYE').sort((a, b) => String(a.datePaiement).localeCompare(String(b.datePaiement))),
)
const parMode = computed(() =>
  MODES_PAIEMENT.map((m) => {
    const liste = paiements.value.filter((b) => b.modePaiement === m.id)
    return { mode: m.libelle, nombre: liste.length, montant: liste.reduce((s, b) => s + n(b.netAPayer), 0) }
  }).filter((x) => x.nombre),
)

// ---------- Colonnes (tableaux, Excel et PDF) ----------
const somme = (champ) => (l) => n(l[champ])
const colMontant = (titre, champ) => ({ titre, valeur: (l) => montant(l[champ]), droite: true, somme: somme(champ), formatTotal: montant })

const COLONNES_MOIS = [
  { titre: 'Mois', valeur: (l) => libelleMois(l.mois), tri: (l) => l.mois },
  { titre: 'Bulletins', valeur: (l) => l.bulletins, droite: true, somme: somme('bulletins') },
  colMontant('Salaires de base', 'base'),
  colMontant('Primes', 'primes'),
  colMontant('Retenues', 'retenues'),
  colMontant('Net à payer', 'net'),
  colMontant('Payé', 'paye'),
  colMontant('Reste à payer', 'reste'),
]
const COLONNES_AGENTS = [
  { titre: 'Matricule', valeur: (l) => l.personnel.matricule },
  { titre: 'Nom et prénoms', valeur: (l) => nomAgent(l.personnel) },
  { titre: 'Fonction', valeur: (l) => l.personnel.fonction?.libelle || '—' },
  { titre: 'Mois', valeur: (l) => l.bulletins, droite: true, somme: somme('bulletins') },
  colMontant('Base', 'base'),
  colMontant('Primes', 'primes'),
  colMontant('Retenues', 'retenues'),
  colMontant('Net', 'net'),
  colMontant('Payé', 'paye'),
  colMontant('Reste', 'reste'),
]
const COLONNES_ELEMENTS = [
  { titre: 'Type', valeur: (l) => (l.type === 'PRIME' ? 'Prime / indemnité' : 'Retenue') },
  { titre: 'Libellé', valeur: (l) => l.libelle },
  { titre: 'Nombre', valeur: (l) => l.nombre, droite: true, somme: somme('nombre') },
  { titre: 'Agents concernés', valeur: (l) => l.agents.size, droite: true },
  { titre: 'Montant total', valeur: (l) => (l.type === 'RETENUE' ? '− ' : '') + montant(l.total), droite: true, somme: (l) => (l.type === 'RETENUE' ? -l.total : l.total), formatTotal: montant },
]
const COLONNES_MODES = [
  { titre: 'Mode de paiement', valeur: (l) => l.mode },
  { titre: 'Bulletins payés', valeur: (l) => l.nombre, droite: true, somme: somme('nombre') },
  colMontant('Montant', 'montant'),
]
const COLONNES_PAIEMENTS = [
  { titre: 'Payé le', valeur: (l) => date(l.datePaiement), tri: (l) => l.datePaiement || '' },
  { titre: 'N° bulletin', valeur: (l) => l.numero },
  { titre: 'Mois', valeur: (l) => libelleMois(l.mois), tri: (l) => l.mois },
  { titre: 'Matricule', valeur: (l) => l.personnel.matricule },
  { titre: 'Nom et prénoms', valeur: (l) => nomAgent(l.personnel) },
  { titre: 'Mode', valeur: (l) => modeLibelle(l.modePaiement) },
  colMontant('Net payé', 'netAPayer'),
]
</script>

<style scoped>
.rapport-paie { display: flex; flex-direction: column; gap: 1.25rem; }
.rapport-paie .bloc { display: flex; flex-direction: column; gap: 1rem; }
.champ-annee { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; color: var(--muted); }
.champ-annee input { width: 90px; }
.petit { padding: 0.35rem 0.7rem; font-size: 0.82rem; }
.cartes { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.8rem; }
.carte {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.85rem 1.1rem;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-left: 5px solid var(--border);
}
.carte small, .carte span { color: var(--muted); font-size: 0.8rem; }
.carte strong { font-size: 1.35rem; color: var(--texte-sur-fond); }
.carte.bleu { border-left-color: var(--primary); }
.carte.bleu strong { color: var(--primary-dark); }
.carte.orange { border-left-color: #f57c00; }
.carte.orange strong { color: #e65100; }
.carte.vert { border-left-color: #16a34a; }
.carte.vert strong { color: #15803d; }
.sous-onglets { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.sous-onglets button {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--texte-sur-fond);
  font-size: 0.85rem;
  font-weight: 600;
}
.sous-onglets button.actif { background: var(--primary-light); border-color: var(--primary); color: var(--primary-dark); }
</style>
