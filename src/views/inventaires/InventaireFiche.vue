<!--
  =============================================================================
  FICHE D'INVENTAIRE — COMPTAGE PAR LOT (§ 12)
  =============================================================================
  Une ligne par lot : stock théorique (figé à l'ouverture), quantité comptée,
  écart calculé et valorisé, justification (obligatoire si écart).
  - « Enregistrer le comptage » : agent ou responsable (le comptage peut se faire
    en plusieurs fois) ;
  - « + Lot trouvé » : lot présent en rayon mais absent du stock ;
  - « Valider » (responsable) : crée les mouvements « correctif d'inventaire »
    et verrouille l'inventaire ; « Annuler l'inventaire » : sans aucun correctif.
  PDF : fiche de comptage (à remplir en rayon) et rapport des écarts valorisés.
  =============================================================================
-->
<template>
  <div v-if="inv" class="page">
    <EnteteModule icone="liste" :titre="`Inventaire ${inv.numero}`" :description="`${perimetre} — ouvert le ${dateHeure(inv.dateOuverture)} par ${inv.ouvertPar.nom}`">
      <template #actions>
        <span class="badge statut" :class="STATUTS[inv.statut].classe">{{ STATUTS[inv.statut].libelle }}</span>
      </template>
    </EnteteModule>

    <div v-if="inv.statut === 'VALIDE'" class="bandeau vert">
      <strong>Inventaire validé</strong> le {{ dateHeure(inv.dateValidation) }} par {{ inv.validePar?.nom }} :
      {{ lignesAvecEcart.length }} correctif(s) d'inventaire enregistré(s). Il ne peut plus être modifié.
    </div>
    <div v-if="inv.statut === 'ANNULE'" class="bandeau gris">
      <strong>Inventaire annulé</strong> — aucun correctif n'a été appliqué. {{ inv.observation }}
    </div>

    <!-- Avancement et totaux -->
    <div class="cartes">
      <div class="carte">
        <small>Lots comptés</small>
        <strong>{{ comptees }} / {{ lignes.length }}</strong>
        <div class="barre"><span :style="{ width: `${avancement}%` }"></span></div>
      </div>
      <div class="carte">
        <small>Lots avec écart</small>
        <strong :class="{ orange: lignesAvecEcart.length }">{{ lignesAvecEcart.length }}</strong>
        <span v-if="nonJustifies">{{ nonJustifies }} à justifier</span>
      </div>
      <div v-if="voitValeur" class="carte">
        <small>Écart valorisé (prix d'achat)</small>
        <strong :class="{ negatif: valeurEcart < 0, positif: valeurEcart > 0 }">{{ montant(valeurEcart) }}</strong>
        <span>Manquants {{ montant(valeurManquants) }} · surplus {{ montant(valeurSurplus) }}</span>
      </div>
    </div>

    <section class="bloc">
      <div class="barre-outils">
        <input v-model="recherche" class="recherche" type="search" placeholder="Médicament ou n° de lot…" />
        <div class="filtre">
          <ListeDeroulante v-model="vue" :options="VUES" :effacable="false" />
        </div>
        <span class="espace"></span>
        <ImportExportTableau titre="Fiche de comptage" :sous-titre="sousTitrePdf" :nom-fichier="`${inv.numero}_comptage`" libelle-pdf="Fiche de comptage" :colonnes-pdf="COLONNES_FICHE" :lignes="lignes" />
        <ImportExportTableau
          v-if="voitValeur"
          titre="Rapport des écarts d'inventaire"
          :sous-titre="sousTitrePdf"
          :nom-fichier="`${inv.numero}_ecarts`"
          libelle-pdf="Rapport des écarts"
          :colonnes-pdf="COLONNES_ECARTS"
          :lignes="lignesAvecEcart"
        />
        <button v-if="modifiable && peutCompter" class="bouton-secondaire" @click="ouvrirLotTrouve">+ Lot trouvé</button>
      </div>

      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-model="tri" cle="produit">Médicament</ColonneTri>
              <ColonneTri v-model="tri" cle="lot">Lot</ColonneTri>
              <ColonneTri v-model="tri" cle="peremption">Péremption</ColonneTri>
              <ColonneTri v-model="tri" cle="theorique" class="nombre">Théorique</ColonneTri>
              <th class="col-compte">Compté</th>
              <ColonneTri v-model="tri" cle="ecart" class="nombre">Écart</ColonneTri>
              <ColonneTri v-if="voitValeur" v-model="tri" cle="valeur" class="nombre">Valeur</ColonneTri>
              <th class="col-justif">Justification</th>
              <th v-if="modifiable" class="actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in lignesPage" :key="l.id" :class="{ 'a-justifier': aJustifier(l) }">
              <td>
                <strong>{{ l.produit.designation }}</strong>
                <div class="detail code">{{ l.produit.code }}</div>
              </td>
              <td>
                <span class="code">{{ l.numeroLot }}</span>
                <span v-if="l.lotTrouve" class="badge badge-bleu trouve">Trouvé</span>
              </td>
              <td>{{ date(l.datePeremption) }}</td>
              <td class="nombre">
                {{ l.quantiteTheorique }}
                <div v-if="l.produit.plaquesParBoite > 1" class="detail">{{ quantite(l.quantiteTheorique, l.produit.plaquesParBoite) }}</div>
              </td>
              <td>
                <input
                  v-if="modifiable && peutCompter"
                  v-model="saisie[l.id].quantiteComptee"
                  type="number"
                  min="0"
                  step="1"
                  class="champ-compte"
                  :placeholder="'—'"
                />
                <strong v-else>{{ l.quantiteComptee ?? '—' }}</strong>
              </td>
              <td class="nombre">
                <span v-if="ecart(l) !== null" class="ecart" :class="{ negatif: ecart(l) < 0, positif: ecart(l) > 0 }">
                  {{ ecart(l) > 0 ? '+' : '' }}{{ ecart(l) }}
                </span>
                <span v-else class="detail">à compter</span>
              </td>
              <td v-if="voitValeur" class="nombre">{{ ecart(l) ? montant(ecart(l) * Number(l.prixAchatPlaque)) : '' }}</td>
              <td>
                <input
                  v-if="modifiable && peutCompter"
                  v-model.trim="saisie[l.id].justification"
                  class="maj champ-justif"
                  maxlength="255"
                  :required="!!ecart(l)"
                  :placeholder="ecart(l) ? 'Obligatoire : cause de l’écart' : ''"
                />
                <span v-else class="detail">{{ l.justification }}</span>
              </td>
              <td v-if="modifiable" class="actions">
                <button v-if="l.lotTrouve && peutCompter" class="bouton-lien danger" title="Retirer ce lot trouvé de l'inventaire" @click="supprimer(l)">Retirer</button>
              </td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model:page="page" v-model:taille="taille" :total="lignesAffichees.length" />
        <p v-if="lignesAffichees.length === 0" class="tableau-vide">Aucun lot pour ce filtre.</p>
      </div>

      <div class="pied">
        <button class="bouton-secondaire" @click="router.push({ name: 'inventaires' })">← Retour à l'inventaire</button>
        <div v-if="modifiable" class="boutons">
          <button v-if="peutValider" class="bouton-danger" @click="annuler">Annuler l'inventaire</button>
          <button v-if="peutCompter" class="bouton-secondaire" :disabled="enregistrement || !modifie" @click="enregistrer()">
            {{ enregistrement ? 'Enregistrement…' : 'Enregistrer le comptage' }}
          </button>
          <button v-if="peutValider" :disabled="enregistrement" @click="valider">Valider l'inventaire</button>
        </div>
      </div>
    </section>

    <!-- Lot trouvé au comptage -->
    <FenetreModale v-if="lotTrouve" titre="Lot trouvé au comptage" @fermer="lotTrouve = null">
      <form id="form-lot-trouve" class="grille-formulaire" @submit.prevent="ajouterLot">
        <div class="pleine-largeur">
          <label class="obligatoire">Médicament</label>
          <ListeDeroulante
            v-model="lotTrouve.produitId"
            :options="medicamentsPerimetre"
            :champ-libelle="(m) => `${m.code} — ${m.designation}`"
            :desactive="inv.perimetre === 'PRODUIT'"
            placeholder="Tapez le code ou le nom…"
          />
        </div>
        <div>
          <label class="obligatoire">N° de lot</label>
          <input v-model.trim="lotTrouve.numeroLot" class="maj" required maxlength="60" />
        </div>
        <div>
          <label class="obligatoire">Date de péremption</label>
          <ChampDate v-model="lotTrouve.datePeremption" required />
        </div>
        <div>
          <label class="obligatoire">Quantité comptée</label>
          <input v-model="lotTrouve.quantiteComptee" type="number" min="1" step="1" required />
        </div>
        <div v-if="voitValeur">
          <label>Prix d'achat unitaire (FCFA)</label>
          <input v-model="lotTrouve.prixAchatPlaque" type="number" min="0" step="1" placeholder="Vide = dernier prix d'achat" />
        </div>
        <div class="pleine-largeur">
          <label class="obligatoire">Justification</label>
          <input v-model.trim="lotTrouve.justification" class="maj" required maxlength="255" placeholder="ex. Carton retrouvé en réserve" />
        </div>
      </form>
      <template #pied>
        <button class="bouton-secondaire" @click="lotTrouve = null">Fermer</button>
        <button type="submit" form="form-lot-trouve" :disabled="enregistrement">Ajouter le lot</button>
      </template>
    </FenetreModale>
  </div>
  <p v-else class="tableau-vide">Chargement…</p>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import EnteteModule from '@/components/EnteteModule.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import FenetreModale from '@/components/FenetreModale.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer, demanderTexte, notifier } from '@/utils/alertes'
import { GESTION_STOCK, PRIX_ACHAT } from '@/utils/roles'
import { date, dateHeure, montant, quantite } from '@/utils/format'

const props = defineProps({ id: { type: [String, Number], required: true } })
const store = useStore()
const router = useRouter()

const STATUTS = {
  EN_COURS: { libelle: 'En cours', classe: 'badge-orange' },
  VALIDE: { libelle: 'Validé', classe: 'badge-vert' },
  ANNULE: { libelle: 'Annulé', classe: 'badge-gris' },
}
const VUES = [
  { id: 'TOUS', libelle: 'Tous les lots' },
  { id: 'A_COMPTER', libelle: 'Lots à compter' },
  { id: 'ECARTS', libelle: 'Lots avec écart' },
]

const inv = computed(() => store.state.inventaires.courant)
const lignes = computed(() => inv.value?.lignes ?? [])
const modifiable = computed(() => inv.value?.statut === 'EN_COURS')
const peutCompter = computed(() => store.getters['auth/peut']([...GESTION_STOCK, 'AGENT']))
const peutValider = computed(() => store.getters['auth/peut'](GESTION_STOCK))
const voitValeur = computed(() => store.getters['auth/peut'](PRIX_ACHAT))

/** Saisie locale (le store Vuex n'est modifié que par ses actions). */
const saisie = ref({})
function remplirSaisie() {
  saisie.value = Object.fromEntries(
    lignes.value.map((l) => [l.id, { quantiteComptee: l.quantiteComptee ?? '', justification: l.justification ?? '' }]),
  )
}
watch(lignes, remplirSaisie)

const recherche = ref('')
const vue = ref('TOUS')
const enregistrement = ref(false)
const lotTrouve = ref(null)

/** Quantité comptée (saisie en cours si modifiable). */
function compte(l) {
  const v = modifiable.value ? saisie.value[l.id]?.quantiteComptee : l.quantiteComptee
  return v === '' || v === null || v === undefined ? null : Number(v)
}
const ecart = (l) => (compte(l) === null ? null : compte(l) - l.quantiteTheorique)
const justification = (l) => (modifiable.value ? saisie.value[l.id]?.justification : l.justification)
const aJustifier = (l) => !!ecart(l) && !justification(l)

const comptees = computed(() => lignes.value.filter((l) => compte(l) !== null).length)
const avancement = computed(() => (lignes.value.length ? Math.round((comptees.value / lignes.value.length) * 100) : 0))
const lignesAvecEcart = computed(() => lignes.value.filter((l) => !!ecart(l)))
const nonJustifies = computed(() => lignesAvecEcart.value.filter(aJustifier).length)
const valeurLigne = (l) => (ecart(l) ?? 0) * Number(l.prixAchatPlaque)
const valeurEcart = computed(() => lignes.value.reduce((s, l) => s + valeurLigne(l), 0))
const valeurManquants = computed(() => lignes.value.reduce((s, l) => s + Math.min(0, valeurLigne(l)), 0))
const valeurSurplus = computed(() => lignes.value.reduce((s, l) => s + Math.max(0, valeurLigne(l)), 0))

/** Lignes modifiées par rapport au serveur. */
const changements = computed(() =>
  lignes.value
    .filter((l) => {
      const s = saisie.value[l.id]
      if (!s) return false
      return compte(l) !== l.quantiteComptee || (s.justification || null) !== (l.justification || null)
    })
    .map((l) => ({ id: l.id, quantiteComptee: compte(l), justification: saisie.value[l.id].justification || null })),
)
const modifie = computed(() => changements.value.length > 0)

const perimetre = computed(() => {
  if (!inv.value) return ''
  if (inv.value.perimetre === 'FAMILLE') return `Famille : ${inv.value.famille?.libelle ?? '—'}`
  if (inv.value.perimetre === 'PRODUIT') return `Médicament : ${inv.value.produit?.designation ?? '—'}`
  if (inv.value.perimetre === 'COMPTAGE') return 'Comptage par lot'
  return 'Inventaire complet'
})
const sousTitrePdf = computed(() => `${inv.value?.numero} — ${perimetre.value} — ${STATUTS[inv.value?.statut]?.libelle}`)

const lignesAffichees = computed(() => {
  const texte = recherche.value.toLowerCase()
  return lignes.value.filter((l) => {
    if (vue.value === 'A_COMPTER' && compte(l) !== null) return false
    if (vue.value === 'ECARTS' && !ecart(l)) return false
    if (!texte) return true
    return [l.produit.designation, l.produit.code, l.numeroLot].some((v) => (v || '').toLowerCase().includes(texte))
  })
})

/** Médicaments proposés pour un lot trouvé (limités au périmètre). */
const medicamentsPerimetre = computed(() =>
  store.state.referentiel.medicaments.filter((m) => {
    if (!m.actif) return false
    if (inv.value?.perimetre === 'PRODUIT') return m.id === inv.value.produitId
    if (inv.value?.perimetre === 'FAMILLE') return m.familleId === inv.value.familleId
    return true
  }),
)

async function charger() {
  try {
    await store.dispatch('inventaires/chargerCourant', props.id)
    remplirSaisie()
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
}

async function enregistrer(silencieux = false) {
  if (!modifie.value) return true
  enregistrement.value = true
  try {
    await store.dispatch('inventaires/compter', changements.value)
    if (!silencieux) store.dispatch('notifications/succes', 'Comptage enregistré.')
    return true
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
    return false
  } finally {
    enregistrement.value = false
  }
}

async function valider() {
  if (comptees.value < lignes.value.length) {
    notifier('erreur', `${lignes.value.length - comptees.value} lot(s) ne sont pas encore comptés.`)
    return
  }
  if (nonJustifies.value) {
    notifier('erreur', `${nonJustifies.value} écart(s) à justifier avant la validation.`)
    return
  }
  const ok = await confirmer({
    titre: `Valider l'inventaire ${inv.value.numero} ?`,
    texte: `${lignesAvecEcart.value.length} correctif(s) d'inventaire seront enregistrés${voitValeur.value ? ` (écart ${montant(valeurEcart.value)})` : ''}. L'inventaire sera ensuite verrouillé.`,
    boutonConfirmer: 'Oui, valider',
  })
  if (!ok || !(await enregistrer(true))) return
  enregistrement.value = true
  try {
    await store.dispatch('inventaires/valider')
    store.dispatch('notifications/succes', 'Inventaire validé : correctifs enregistrés.')
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    enregistrement.value = false
  }
}

async function annuler() {
  const motif = await demanderTexte({
    titre: `Annuler l'inventaire ${inv.value.numero} ?`,
    texte: 'Aucun correctif ne sera appliqué au stock.',
    libelle: 'Motif (obligatoire)',
    boutonConfirmer: 'Annuler l’inventaire',
  })
  if (!motif) return
  try {
    await store.dispatch('inventaires/annuler', motif)
    store.dispatch('notifications/succes', 'Inventaire annulé.')
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
}

function ouvrirLotTrouve() {
  lotTrouve.value = {
    produitId: inv.value.perimetre === 'PRODUIT' ? inv.value.produitId : null,
    numeroLot: '',
    datePeremption: '',
    quantiteComptee: '',
    prixAchatPlaque: '',
    justification: '',
  }
}

async function ajouterLot() {
  // La saisie en cours est enregistrée d'abord (sinon elle serait perdue au rechargement)
  if (!(await enregistrer(true))) return
  enregistrement.value = true
  try {
    const f = lotTrouve.value
    await store.dispatch('inventaires/ajouterLot', {
      produitId: f.produitId,
      numeroLot: f.numeroLot,
      datePeremption: f.datePeremption,
      quantiteComptee: Number(f.quantiteComptee),
      prixAchatPlaque: f.prixAchatPlaque === '' ? undefined : Number(f.prixAchatPlaque),
      justification: f.justification,
    })
    store.dispatch('notifications/succes', 'Lot trouvé ajouté à l’inventaire.')
    lotTrouve.value = null
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    enregistrement.value = false
  }
}

async function supprimer(l) {
  const ok = await confirmer({ titre: `Retirer le lot ${l.numeroLot} de l'inventaire ?`, boutonConfirmer: 'Oui, retirer', danger: true })
  if (!ok || !(await enregistrer(true))) return
  try {
    await store.dispatch('inventaires/supprimerLigne', l.id)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  }
}

const COLONNES_FICHE = [
  { titre: 'Code', valeur: (l) => l.produit.code },
  { titre: 'Médicament', valeur: (l) => l.produit.designation },
  { titre: 'Lot', valeur: (l) => l.numeroLot },
  { titre: 'Péremption', valeur: (l) => date(l.datePeremption) },
  { titre: 'Théorique', valeur: (l) => l.quantiteTheorique, droite: true },
  { titre: 'Compté', valeur: (l) => compte(l) ?? '', droite: true },
  { titre: 'Écart', valeur: (l) => ecart(l) ?? '', droite: true },
  { titre: 'Observation', valeur: (l) => justification(l) ?? '' },
]
const COLONNES_ECARTS = [
  { titre: 'Médicament', valeur: (l) => l.produit.designation },
  { titre: 'Lot', valeur: (l) => l.numeroLot },
  { titre: 'Théorique', valeur: (l) => l.quantiteTheorique, droite: true },
  { titre: 'Compté', valeur: (l) => compte(l), droite: true },
  { titre: 'Écart', valeur: (l) => (ecart(l) > 0 ? `+${ecart(l)}` : ecart(l)), droite: true },
  { titre: 'Prix unitaire', valeur: (l) => montant(l.prixAchatPlaque), droite: true },
  { titre: 'Valeur', valeur: (l) => montant(valeurLigne(l)), droite: true, somme: valeurLigne, formatTotal: montant },
  { titre: 'Justification', valeur: (l) => justification(l) },
]

const VALEURS_TRI = {
  produit: (l) => l.produit.designation,
  lot: (l) => l.numeroLot,
  peremption: (l) => l.datePeremption,
  theorique: (l) => l.quantiteTheorique,
  ecart: (l) => ecart(l) ?? 0,
  valeur: (l) => valeurLigne(l),
}
const { tri, page, taille, lignesPage } = utiliserTableau(lignesAffichees, [recherche, vue], VALEURS_TRI)

onMounted(() => {
  charger()
  store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch(() => {})
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.statut {
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
}
.bandeau {
  padding: 0.85rem 1.1rem;
  border-radius: 12px;
}
.bandeau.vert {
  background: var(--primary-light);
  color: var(--primary-dark);
}
.bandeau.gris {
  background: #eef0f2;
  color: var(--muted);
}
.cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.carte {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
}
.carte small,
.carte span {
  font-size: 0.82rem;
  color: var(--muted);
}
.carte strong {
  font-size: 1.6rem;
  line-height: 1.15;
  color: var(--primary-dark);
}
.carte strong.orange {
  color: #e65100;
}
.barre {
  height: 8px;
  border-radius: 99px;
  background: var(--primary-light);
  overflow: hidden;
}
.barre span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--ciel), var(--primaire));
  transition: width 0.3s;
}
.detail {
  font-size: 0.78rem;
  color: var(--muted);
}
.trouve {
  margin-left: 0.35rem;
}
.col-compte {
  width: 120px;
}
.col-justif {
  width: 28%;
}
.champ-compte {
  width: 100px;
  text-align: right;
}
.champ-justif {
  width: 100%;
}
.ecart {
  font-weight: 800;
}
.negatif {
  color: var(--danger) !important;
}
.positif {
  color: #2e7d32 !important;
}
tr.a-justifier td {
  background: #fff8ec;
}
.pied {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.boutons {
  display: flex;
  gap: 0.75rem;
}
</style>
