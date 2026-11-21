<!--
  =============================================================================
  RAPPORTS — ONGLET « PERSONNEL » (droit VOIR sur le module Utilisateurs)
  =============================================================================
    - cartes : effectif actif, comptes de connexion, embauches de l'année,
      masse salariale de base mensuelle (seulement avec le droit VOIR sur la paie) ;
    - Liste du personnel : fonction, embauche, ANCIENNETÉ, compte et profil, statut
      (+ salaire de base avec le droit paie) ;
    - Effectif par fonction ;
    - Comptes par profil (droits d'accès) ;
    - Embauches de l'année.
  Chaque tableau : tri, total, Excel et PDF avec l'en-tête de la pharmacie.
  =============================================================================
-->
<template>
  <div class="rapport-personnel">
    <section class="bloc">
      <div class="barre-outils">
        <label class="case-a-cocher"><input v-model="avecInactifs" type="checkbox" /> Inclure le personnel inactif</label>
        <span class="espace"></span>
        <router-link class="btn bouton-secondaire" :to="{ name: 'utilisateurs' }">Module Utilisateurs →</router-link>
      </div>

      <div class="cartes">
        <div class="carte bleu">
          <small>Personnel actif</small>
          <strong>{{ actifs.length }}</strong>
          <span>{{ personnel.length - actifs.length }} inactif(s)</span>
        </div>
        <div class="carte">
          <small>Comptes de connexion</small>
          <strong>{{ actifs.filter((p) => p.comptes.some((c) => c.actif)).length }}</strong>
          <span>{{ actifs.filter((p) => !p.comptes.length).length }} personne(s) sans compte</span>
        </div>
        <div class="carte vert">
          <small>Embauches {{ anneeCourante }}</small>
          <strong>{{ embauches.length }}</strong>
          <span>Ancienneté moyenne : {{ ancienneteMoyenne }}</span>
        </div>
        <div v-if="voitPaie" class="carte">
          <small>Salaires de base (mensuel)</small>
          <strong>{{ montant(masseSalariale) }}</strong>
          <span>Personnel actif</span>
        </div>
      </div>

      <nav class="sous-onglets">
        <button v-for="v in VUES" :key="v.code" type="button" :class="{ actif: vue === v.code }" @click="vue = v.code">{{ v.titre }}</button>
      </nav>

      <p v-if="chargement" class="tableau-vide">Chargement…</p>
      <TableauRapport
        v-else-if="vue === 'liste'"
        titre="Liste du personnel"
        :sous-titre="avecInactifs ? 'Personnel actif et inactif' : 'Personnel actif'"
        nom-fichier="rapport_personnel"
        :colonnes="colonnesListe"
        :lignes="affiches"
        vide="Aucun membre du personnel."
      />
      <TableauRapport
        v-else-if="vue === 'fonctions'"
        titre="Effectif par fonction"
        :sous-titre="avecInactifs ? 'Personnel actif et inactif' : 'Personnel actif'"
        nom-fichier="effectif_par_fonction"
        :colonnes="colonnesFonctions"
        :lignes="parFonction"
        :recherche="false"
      />
      <TableauRapport
        v-else-if="vue === 'profils'"
        titre="Comptes par profil"
        sous-titre="Comptes de connexion et droits d'accès"
        nom-fichier="comptes_par_profil"
        :colonnes="COLONNES_PROFILS"
        :lignes="parProfil"
        :recherche="false"
      />
      <TableauRapport
        v-else
        :titre="`Embauches ${anneeCourante}`"
        :nom-fichier="`embauches_${anneeCourante}`"
        :colonnes="colonnesListe"
        :lignes="embauches"
        vide="Aucune embauche cette année (date d'embauche saisie dans la fiche du personnel)."
      />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import TableauRapport from './TableauRapport.vue'
import { date, montant } from '@/utils/format'
import { listerPersonnel, listerProfilsComptes } from '@/api/utilisateurs'
import { listerSalaires } from '@/api/paie'

const store = useStore()
const voitPaie = computed(() => store.getters['auth/peutVoir']('paie'))

const VUES = [
  { code: 'liste', titre: 'Liste du personnel' },
  { code: 'fonctions', titre: 'Effectif par fonction' },
  { code: 'profils', titre: 'Comptes par profil' },
  { code: 'embauches', titre: "Embauches de l'année" },
]
const vue = ref('liste')
const avecInactifs = ref(false)
const personnel = ref([])
const profils = ref([])
const salaires = ref(new Map())
const chargement = ref(false)
const anneeCourante = new Date().getFullYear()

onMounted(async () => {
  chargement.value = true
  try {
    const [liste, listeProfils, listeSalaires] = await Promise.all([
      listerPersonnel(),
      listerProfilsComptes(),
      voitPaie.value ? listerSalaires() : Promise.resolve([]),
    ])
    personnel.value = liste
    profils.value = listeProfils
    salaires.value = new Map(listeSalaires.map((s) => [s.id, Number(s.salaireBase)]))
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
})

const actifs = computed(() => personnel.value.filter((p) => p.actif))
const affiches = computed(() => (avecInactifs.value ? personnel.value : actifs.value))
const nomPersonne = (p) => `${p.nom} ${p.prenoms || ''}`.trim()
const libelleProfil = (code) => profils.value.find((p) => p.code === code)?.libelle ?? code
const salaire = (p) => salaires.value.get(p.id) ?? 0
const masseSalariale = computed(() => actifs.value.reduce((s, p) => s + salaire(p), 0))

/** Ancienneté en mois depuis l'embauche (null si la date n'est pas saisie). */
function ancienneteMois(p) {
  if (!p.dateEmbauche) return null
  const d = new Date(p.dateEmbauche)
  const j = new Date()
  return Math.max(0, (j.getFullYear() - d.getFullYear()) * 12 + j.getMonth() - d.getMonth() - (j.getDate() < d.getDate() ? 1 : 0))
}
function texteAnciennete(mois) {
  if (mois === null) return '—'
  const ans = Math.floor(mois / 12)
  const reste = mois % 12
  return [ans && `${ans} an${ans > 1 ? 's' : ''}`, reste && `${reste} mois`].filter(Boolean).join(' ') || "moins d'un mois"
}
const ancienneteMoyenne = computed(() => {
  const valeurs = actifs.value.map(ancienneteMois).filter((m) => m !== null)
  return valeurs.length ? texteAnciennete(Math.round(valeurs.reduce((s, m) => s + m, 0) / valeurs.length)) : '—'
})
const embauches = computed(() =>
  personnel.value
    .filter((p) => p.dateEmbauche && new Date(p.dateEmbauche).getFullYear() === anneeCourante)
    .sort((a, b) => String(a.dateEmbauche).localeCompare(String(b.dateEmbauche))),
)

const parFonction = computed(() => {
  const groupes = new Map()
  for (const p of affiches.value) {
    const cle = p.fonction?.libelle || '(sans fonction)'
    if (!groupes.has(cle)) groupes.set(cle, { fonction: cle, effectif: 0, avecCompte: 0, salaires: 0 })
    const g = groupes.get(cle)
    g.effectif++
    if (p.comptes.length) g.avecCompte++
    g.salaires += salaire(p)
  }
  return [...groupes.values()].sort((a, b) => b.effectif - a.effectif)
})

const parProfil = computed(() => {
  const groupes = new Map(profils.value.map((p) => [p.code, { profil: p.libelle, actifs: 0, inactifs: 0 }]))
  for (const p of personnel.value) {
    for (const c of p.comptes) {
      if (!groupes.has(c.role)) groupes.set(c.role, { profil: libelleProfil(c.role), actifs: 0, inactifs: 0 })
      groupes.get(c.role)[c.actif && p.actif ? 'actifs' : 'inactifs']++
    }
  }
  return [...groupes.values()]
})

// ---------- Colonnes ----------
const colonnesListe = computed(() => [
  { titre: 'Matricule', valeur: (p) => p.matricule },
  { titre: 'Nom et prénoms', valeur: nomPersonne },
  { titre: 'Fonction', valeur: (p) => p.fonction?.libelle || '—' },
  { titre: 'Embauche', valeur: (p) => (p.dateEmbauche ? date(p.dateEmbauche) : '—'), tri: (p) => p.dateEmbauche || '' },
  { titre: 'Ancienneté', valeur: (p) => texteAnciennete(ancienneteMois(p)), tri: (p) => ancienneteMois(p) ?? -1 },
  { titre: 'Téléphone', valeur: (p) => p.telephone || '' },
  { titre: 'Compte / profil', valeur: (p) => (p.comptes[0] ? `${p.comptes[0].matricule} (${libelleProfil(p.comptes[0].role)})` : 'Aucun') },
  { titre: 'Statut', valeur: (p) => (p.actif ? 'Actif' : 'Inactif') },
  ...(voitPaie.value
    ? [{ titre: 'Salaire de base', valeur: (p) => montant(salaire(p)), droite: true, somme: salaire, formatTotal: montant }]
    : []),
])
const colonnesFonctions = computed(() => [
  { titre: 'Fonction', valeur: (l) => l.fonction },
  { titre: 'Effectif', valeur: (l) => l.effectif, droite: true, somme: (l) => l.effectif },
  { titre: 'Avec un compte', valeur: (l) => l.avecCompte, droite: true, somme: (l) => l.avecCompte },
  ...(voitPaie.value
    ? [{ titre: 'Salaires de base', valeur: (l) => montant(l.salaires), droite: true, somme: (l) => l.salaires, formatTotal: montant }]
    : []),
])
const COLONNES_PROFILS = [
  { titre: 'Profil', valeur: (l) => l.profil },
  { titre: 'Comptes actifs', valeur: (l) => l.actifs, droite: true, somme: (l) => l.actifs },
  { titre: 'Comptes désactivés', valeur: (l) => l.inactifs, droite: true, somme: (l) => l.inactifs },
]
</script>

<style scoped>
.rapport-personnel .bloc { display: flex; flex-direction: column; gap: 1rem; }
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
