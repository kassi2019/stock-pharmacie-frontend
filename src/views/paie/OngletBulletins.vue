<!--
  =============================================================================
  ONGLET « PAIE DU MOIS »
  =============================================================================
  Choix du mois ; cartes (masse salariale, primes, retenues, net, payé / reste) ;
  ÉTAT DE LA PAIE du mois (tableau, PDF / Excel).
  - « Préparer la paie du mois » (MODIFIER) : un bulletin brouillon pour chaque
    membre du personnel actif qui n'en a pas encore (salaire de base repris) ;
  - « + Bulletin » (MODIFIER) : pour une personne précise ;
  - « Valider les brouillons » (VALIDER) : tous les brouillons du mois ;
  - « Ouvrir » : primes / retenues, validation, paiement, bulletin PDF.
  =============================================================================
-->
<template>
  <div class="onglet-contenu">
    <div class="barre-outils">
      <label class="champ-mois">Mois <input v-model="mois" type="month" required @change="charger" /></label>
      <select v-model="statutFiltre" class="filtre-statut">
        <option value="">Tous les statuts</option>
        <option v-for="(s, code) in STATUTS_BULLETIN" :key="code" :value="code">{{ s.libelle }}</option>
      </select>
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (matricule, nom)…" />
      <span class="espace"></span>
      <ImportExportTableau
        :titre="`État de la paie — ${libelleMois(mois)}`"
        :sous-titre="statutFiltre ? STATUTS_BULLETIN[statutFiltre].libelle : 'Tous les bulletins'"
        :nom-fichier="`etat_paie_${mois}`"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="lignesTriees"
      />
      <button v-si-modif="'paie'" class="bouton-secondaire" :disabled="!sansBulletin.length" @click="choixPersonne = true">+ Bulletin</button>
      <button v-si-modif="'paie'" :disabled="occupe" @click="preparer">Préparer la paie du mois</button>
      <button v-if="peutValider && nombres.BROUILLON" class="bouton-valider" :disabled="occupe" @click="validerTout">
        Valider les brouillons ({{ nombres.BROUILLON }})
      </button>
    </div>

    <div class="cartes">
      <div class="carte">
        <small>Bulletins</small>
        <strong>{{ bulletins.length }}</strong>
        <span>{{ nombres.BROUILLON }} brouillon(s) · {{ nombres.VALIDE }} validé(s) · {{ nombres.PAYE }} payé(s)</span>
      </div>
      <div class="carte">
        <small>Salaires de base</small>
        <strong>{{ montant(totaux.base) }}</strong>
        <span>+ {{ montant(totaux.primes) }} primes · − {{ montant(totaux.retenues) }} retenues</span>
      </div>
      <div class="carte bleu">
        <small>Net à payer</small>
        <strong>{{ montant(totaux.net) }}</strong>
        <span>Masse salariale du mois</span>
      </div>
      <div class="carte" :class="totaux.reste > 0 ? 'orange' : 'vert'">
        <small>Reste à payer</small>
        <strong>{{ montant(totaux.reste) }}</strong>
        <span>Déjà payé : {{ montant(totaux.paye) }}</span>
      </div>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="matricule">Matricule</ColonneTri>
            <ColonneTri v-model="tri" cle="nom">Nom et prénoms</ColonneTri>
            <ColonneTri v-model="tri" cle="fonction">Fonction</ColonneTri>
            <ColonneTri v-model="tri" cle="base" class="nombre">Base</ColonneTri>
            <ColonneTri v-model="tri" cle="primes" class="nombre">Primes</ColonneTri>
            <ColonneTri v-model="tri" cle="retenues" class="nombre">Retenues</ColonneTri>
            <ColonneTri v-model="tri" cle="net" class="nombre">Net à payer</ColonneTri>
            <ColonneTri v-model="tri" cle="statut">Statut</ColonneTri>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in lignesPage" :key="b.id">
            <td class="code">{{ b.personnel.matricule }}</td>
            <td><strong>{{ b.personnel.prenoms }} {{ b.personnel.nom }}</strong></td>
            <td>{{ b.personnel.fonction?.libelle || '—' }}</td>
            <td class="nombre">{{ montant(b.salaireBase) }}</td>
            <td class="nombre">{{ Number(b.totalPrimes) ? montant(b.totalPrimes) : '—' }}</td>
            <td class="nombre">{{ Number(b.totalRetenues) ? '− ' + montant(b.totalRetenues) : '—' }}</td>
            <td class="nombre"><strong>{{ montant(b.netAPayer) }}</strong></td>
            <td>
              <span class="badge" :class="STATUTS_BULLETIN[b.statut].badge">{{ STATUTS_BULLETIN[b.statut].libelle }}</span>
              <div v-if="b.datePaiement" class="detail">le {{ date(b.datePaiement) }}</div>
            </td>
            <td class="actions">
              <button class="bouton-lien" @click="ouvert = b">Ouvrir</button>
              <button v-si-imprimer="'paie'" class="bouton-lien" @click="imprimerBulletin(b)">PDF</button>
              <button v-if="b.statut === 'BROUILLON'" v-si-modif="'paie'" class="bouton-lien danger" @click="supprimer(b)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="bulletinsAffiches.length" />
      <p v-if="!chargement && bulletins.length === 0" class="tableau-vide">
        Aucun bulletin pour {{ libelleMois(mois) }}. Cliquez sur « Préparer la paie du mois ».
      </p>
      <p v-if="chargement" class="tableau-vide">Chargement…</p>
    </div>

    <FenetreBulletin v-if="ouvert" :key="ouvert.id + ouvert.statut" :bulletin="ouvert" @fermer="ouvert = null" @modifie="apresModification" />

    <!-- Bulletin pour une personne précise -->
    <FenetreModale v-if="choixPersonne" :titre="`Nouveau bulletin — ${libelleMois(mois)}`" @fermer="choixPersonne = false">
      <label class="obligatoire">Membre du personnel</label>
      <ListeDeroulante
        v-model="personneChoisie"
        :options="sansBulletin"
        :champ-libelle="(p) => `${p.matricule} — ${p.prenoms || ''} ${p.nom}`"
        placeholder="Personnel actif sans bulletin ce mois…"
      />
      <template #pied>
        <button class="bouton-secondaire" @click="choixPersonne = false">Fermer</button>
        <button :disabled="!personneChoisie || occupe" @click="creerBulletin">Créer le bulletin</button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import FenetreBulletin from './FenetreBulletin.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { aujourdhui, date, montant } from '@/utils/format'
import { imprimerBulletin } from '@/utils/bulletinPdf'
import {
  STATUTS_BULLETIN,
  libelleMois,
  listerBulletins,
  listerSalaires,
  nouveauBulletin,
  preparerMois,
  supprimerBulletin,
  validerMois,
} from '@/api/paie'

const emit = defineEmits(['charge'])
const store = useStore()
const peutValider = computed(() => store.getters['auth/peutValider']('paie'))

const mois = ref(aujourdhui().slice(0, 7))
const statutFiltre = ref('')
const recherche = ref('')
const bulletins = ref([])
const personnel = ref([])
const chargement = ref(false)
const occupe = ref(false)
const ouvert = ref(null)
const choixPersonne = ref(false)
const personneChoisie = ref(null)

async function charger() {
  if (!mois.value) return
  chargement.value = true
  try {
    ;[bulletins.value, personnel.value] = await Promise.all([listerBulletins({ mois: mois.value }), listerSalaires()])
    emit('charge', bulletins.value)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}
onMounted(charger)

const bulletinsAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return bulletins.value.filter((b) => {
    if (statutFiltre.value && b.statut !== statutFiltre.value) return false
    if (!texte) return true
    return [b.personnel.matricule, b.personnel.nom, b.personnel.prenoms].some((v) => (v || '').toLowerCase().includes(texte))
  })
})
const nombres = computed(() => {
  const n = { BROUILLON: 0, VALIDE: 0, PAYE: 0 }
  for (const b of bulletins.value) n[b.statut]++
  return n
})
const totaux = computed(() => {
  const somme = (champ, liste = bulletins.value) => liste.reduce((s, b) => s + Number(b[champ]), 0)
  const net = somme('netAPayer')
  const paye = somme('netAPayer', bulletins.value.filter((b) => b.statut === 'PAYE'))
  return { base: somme('salaireBase'), primes: somme('totalPrimes'), retenues: somme('totalRetenues'), net, paye, reste: net - paye }
})
const sansBulletin = computed(() => {
  const avec = new Set(bulletins.value.map((b) => b.personnelId))
  return personnel.value.filter((p) => p.actif && !avec.has(p.id))
})

async function executer(appel) {
  occupe.value = true
  try {
    await appel()
    await charger()
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    occupe.value = false
  }
}

function preparer() {
  return executer(async () => {
    const r = await preparerMois(mois.value)
    store.dispatch(
      'notifications/succes',
      r.crees ? `${r.crees} bulletin(s) préparé(s) pour ${libelleMois(mois.value)}.` : 'Tout le personnel actif a déjà son bulletin ce mois-ci.',
    )
  })
}

function creerBulletin() {
  return executer(async () => {
    const b = await nouveauBulletin(personneChoisie.value, mois.value)
    choixPersonne.value = false
    personneChoisie.value = null
    ouvert.value = b
  })
}

async function validerTout() {
  const ok = await confirmer({
    titre: `Valider les ${nombres.value.BROUILLON} bulletin(s) en brouillon ?`,
    texte: `Paie de ${libelleMois(mois.value)}. Les bulletins validés ne se modifient plus (sauf remise en brouillon).`,
    boutonConfirmer: 'Oui, valider',
  })
  if (!ok) return
  await executer(async () => {
    const r = await validerMois(mois.value)
    store.dispatch('notifications/succes', `${r.valides} bulletin(s) validé(s).`)
  })
}

async function supprimer(b) {
  const ok = await confirmer({
    titre: 'Supprimer ce bulletin ?',
    texte: `Bulletin de ${b.personnel.prenoms || ''} ${b.personnel.nom} (${libelleMois(b.mois)}).`,
    boutonConfirmer: 'Oui, supprimer',
    danger: true,
  })
  if (!ok) return
  await executer(async () => {
    await supprimerBulletin(b.id)
    store.dispatch('notifications/succes', 'Bulletin supprimé.')
  })
}

function apresModification(b) {
  ouvert.value = b
  const i = bulletins.value.findIndex((x) => x.id === b.id)
  if (i >= 0) bulletins.value[i] = b
  emit('charge', bulletins.value)
}

// ---------- Tri, pagination, état PDF / Excel ----------
const VALEURS_TRI = {
  matricule: (b) => b.personnel.matricule,
  nom: (b) => `${b.personnel.nom} ${b.personnel.prenoms || ''}`,
  fonction: (b) => b.personnel.fonction?.libelle,
  base: (b) => Number(b.salaireBase),
  primes: (b) => Number(b.totalPrimes),
  retenues: (b) => Number(b.totalRetenues),
  net: (b) => Number(b.netAPayer),
  statut: (b) => b.statut,
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(bulletinsAffiches, [recherche, statutFiltre, mois], VALEURS_TRI)

const somme = (champ) => (b) => Number(b[champ])
const COLONNES_PDF = [
  { titre: 'Matricule', valeur: (b) => b.personnel.matricule },
  { titre: 'Nom et prénoms', valeur: (b) => `${b.personnel.nom} ${b.personnel.prenoms || ''}`.trim() },
  { titre: 'Fonction', valeur: (b) => b.personnel.fonction?.libelle },
  { titre: 'Base', valeur: (b) => montant(b.salaireBase), droite: true, somme: somme('salaireBase'), formatTotal: montant },
  { titre: 'Primes', valeur: (b) => montant(b.totalPrimes), droite: true, somme: somme('totalPrimes'), formatTotal: montant },
  { titre: 'Retenues', valeur: (b) => montant(b.totalRetenues), droite: true, somme: somme('totalRetenues'), formatTotal: montant },
  { titre: 'Net à payer', valeur: (b) => montant(b.netAPayer), droite: true, somme: somme('netAPayer'), formatTotal: montant },
  { titre: 'Statut', valeur: (b) => STATUTS_BULLETIN[b.statut].libelle + (b.datePaiement ? ` (${date(b.datePaiement)})` : '') },
]
</script>

<style scoped>
.onglet-contenu { display: flex; flex-direction: column; gap: 1rem; }
.champ-mois { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; color: var(--muted); }
.champ-mois input { width: auto; }
.filtre-statut { width: auto; }
.cartes { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.8rem; }
.carte {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.85rem 1.1rem;
  border-radius: 14px;
  background: #fff;
  border-left: 5px solid var(--border);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
}
.carte small, .carte span { color: var(--muted); font-size: 0.8rem; }
.carte strong { font-size: 1.35rem; color: var(--texte-sur-fond); }
.carte.bleu { border-color: var(--primary); }
.carte.bleu strong { color: var(--primary-dark); }
.carte.orange { border-color: #f57c00; }
.carte.orange strong { color: #e65100; }
.carte.vert { border-color: #16a34a; }
.carte.vert strong { color: #15803d; }
.detail { font-size: 0.75rem; color: var(--muted); }
.bouton-valider { background: #16a34a; }
.bouton-valider:hover:not(:disabled) { background: #15803d; }
</style>
