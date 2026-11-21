<!--
  =============================================================================
  ONGLET « INVENTAIRE » du module Inventaires et mouvements (§ 12) — PAR LOT, au fil de l'eau
  (même présentation et mêmes fonctions que l'application de district)
  =============================================================================
  Une CARTE par médicament :
    - en-tête : nom, dosage, code, stock total, lots à 0 masqués, « + Ajouter un lot » ;
    - tableau des lots : n° de lot et péremption MODIFIABLES (lus sur la boîte),
      stock actuel, STOCK RÉEL (COMPTÉ), écart, justification (si écart),
      boutons « Valider » et « Retirer ».
  Barre : recherche, Excel / PDF de la feuille de comptage, « Valider tout
  l'inventaire (n) », « Fiche d'inventaire ».
  Filtres : n° de lot ; État (périmés, péremption proche, stock à zéro, sous le
  seuil) ; Comptage (non comptés, comptés, avec écart) ; Trier par ; Effacer.
  Les filtres n'effacent pas les quantités déjà saisies.

  Valider un lot = son stock devient le stock compté (mouvement « Correctif »
  de l'écart, justification obligatoire § 12) ; n° de lot / péremption corrigés
  si modifiés. Chaque lot compté est TRACÉ, même sans écart : la FICHE
  D'INVENTAIRE liste tout ce qui a été compté sur une période (PDF / Excel A4).
  Retirer = retrait du lot (retour fournisseur, périmé, casse, perte, autre).
  Quantités en unités de stock (plaques pour un produit vendu au détail).
  =============================================================================
-->
<template>
  <div class="onglet-contenu">
    <div>
      <!-- ===================== BARRE ===================== -->
      <div class="barre-outils">
        <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher un médicament…" />
        <span class="espace"></span>
        <!-- Feuille de comptage : tous les lots affichés (filtres appliqués) -->
        <ImportExportTableau
          titre="Inventaire — feuille de comptage"
          :sous-titre="`Au ${date(aujourdhui())}`"
          nom-fichier="inventaire_pharmacie"
          :colonnes-pdf="COLONNES_EXPORT"
          :lignes="lignesExport"
        />
        <button v-if="peutValider" class="bouton-valider-tout" :disabled="nbSaisies === 0 || enregistrement" @click="validerTout">
          ✅ Valider tout l'inventaire ({{ nbSaisies }})
        </button>
        <button class="bouton-secondaire" title="Récapitulatif des lots comptés, à imprimer en A4" @click="ouvrirFiche">
          🖨️ Fiche d'inventaire
        </button>
      </div>

      <!-- ===================== FILTRES ===================== -->
      <div class="inv-filtres">
        <input v-model="filtreLot" class="inv-lot" type="search" placeholder="N° de lot…" />
        <div class="inv-groupe">
          <span class="inv-libelle">État :</span>
          <button
            v-for="o in ETATS_FILTRE"
            :key="o.v"
            type="button"
            class="bouton-filtre"
            :class="{ actif: filtreEtat === o.v }"
            @click="filtreEtat = o.v"
          >
            {{ o.l }}
          </button>
        </div>
        <div class="inv-groupe">
          <span class="inv-libelle">Comptage :</span>
          <button
            v-for="o in COMPTAGES"
            :key="o.v"
            type="button"
            class="bouton-filtre"
            :class="{ actif: filtreComptage === o.v }"
            @click="filtreComptage = o.v"
          >
            {{ o.l }}
          </button>
        </div>
        <div class="inv-groupe">
          <span class="inv-libelle">Trier par :</span>
          <div class="inv-tri">
            <ListeDeroulante v-model="tri" :options="TRIS" :effacable="false" />
          </div>
        </div>
        <button v-if="filtreActif" type="button" class="bouton-secondaire petit" @click="effacerFiltres">✖ Effacer</button>
        <span class="inv-compteur">{{ produits.length }} produit(s) · {{ produits.reduce((n, p) => n + p.lignes.length, 0) }} lot(s) affiché(s)</span>
      </div>

      <!-- ===================== PRODUITS ET LOTS ===================== -->
      <p v-if="chargement && !stock.length" class="tableau-vide">Chargement…</p>
      <p v-else-if="stock.length === 0" class="tableau-vide">Aucun médicament.</p>
      <div v-else-if="produits.length === 0" class="tableau-vide">
        Aucun lot ne correspond aux filtres.
        <button type="button" class="bouton-lien" @click="effacerFiltres">✖ Effacer les filtres</button>
      </div>

      <div v-else class="inventaire-produits">
        <div v-for="{ m, lignes } in produitsPage" :key="m.id" class="inventaire-produit">
          <!-- En-tête du produit -->
          <div class="inventaire-produit-entete">
            <strong>{{ m.designation }}</strong>
            <span v-if="m.dosage" class="detail">{{ m.dosage }}</span>
            <span class="code">{{ m.code }}</span>
            <span class="badge" :class="m.stock > 0 ? 'badge-vert' : 'badge-orange'">Stock total : {{ quantite(m.stock, m.plaquesParBoite) }}</span>
            <EtatBadge :etat="m.etatStock" />
            <span v-if="nbLotsVides(m) && filtreEtat !== 'ZERO'" class="lots-vides" title="Choisir « Stock à zéro » dans les filtres pour les revoir">
              {{ nbLotsVides(m) }} lot(s) à 0 masqué(s)
            </span>
            <button v-if="peutValider" type="button" class="bouton-ajout-lot" title="Ajouter un lot oublié ou mal enregistré à l'entrée" @click="ouvrirAjoutLot(m)">
              ＋ Ajouter un lot
            </button>
          </div>

          <p v-if="lignes.length === 0" class="inventaire-aucun-lot">Aucun lot en stock pour ce produit.</p>
          <table v-else class="inventaire-lots">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Péremption</th>
                <th>Stock actuel</th>
                <th>Stock réel (compté)</th>
                <th>Écart</th>
                <th>Justification</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in lignes" :key="l.id" :class="{ 'lot-corrige': lotCorrige(l), 'lot-compte': estCompte(l) }">
                <!-- N° de lot et péremption corrigeables pendant le comptage (lus sur la boîte) -->
                <td>
                  <input
                    v-if="corrections[l.id]"
                    v-model="corrections[l.id].numeroLot"
                    class="inventaire-input inventaire-lot maj"
                    :class="{ modifie: corrections[l.id].numeroLot.trim().toUpperCase() !== l.numeroLot }"
                    :title="`N° de lot enregistré : ${l.numeroLot}`"
                    :disabled="!peutValider"
                  />
                </td>
                <td>
                  <ChampDate
                    v-if="corrections[l.id]"
                    v-model="corrections[l.id].datePeremption"
                    class="inventaire-input inventaire-peremption"
                    :class="{ modifie: corrections[l.id].datePeremption !== jourIso(l.datePeremption) }"
                    :title="`Péremption enregistrée : ${date(l.datePeremption)}`"
                    :disabled="!peutValider"
                  />
                  <span v-if="peremption(l)" class="badge peremption" :class="peremption(l).classe">{{ peremption(l).libelle }}</span>
                </td>
                <td>
                  {{ l.quantiteRestante }}
                  <span v-if="m.plaquesParBoite > 1" class="detail">({{ quantite(l.quantiteRestante, m.plaquesParBoite) }})</span>
                </td>
                <td>
                  <input
                    v-model="saisies[l.id]"
                    type="number"
                    min="0"
                    class="inventaire-input"
                    :placeholder="String(l.quantiteRestante)"
                    :disabled="!peutValider"
                  />
                </td>
                <td>
                  <span class="badge" :class="ecart(l) === 0 ? 'badge-vert' : ecart(l) > 0 ? 'badge-orange' : 'badge-rouge'">
                    {{ ecart(l) > 0 ? '+' : '' }}{{ ecart(l) }}
                  </span>
                </td>
                <td>
                  <input
                    v-if="ecart(l) !== 0"
                    v-model="justifications[l.id]"
                    class="inventaire-input inventaire-justif maj"
                    :class="{ manquant: !justifications[l.id] }"
                    maxlength="255"
                    placeholder="Cause de l'écart (obligatoire)"
                    :disabled="!peutValider"
                  />
                </td>
                <td class="actions">
                  <button v-if="peutValider" type="button" class="bouton-valider" :disabled="!aValider(l) || enregistrement" @click="validerLot(m, l)">
                    ✅ Valider
                  </button>
                  <button
                    v-if="peutRetirer"
                    type="button"
                    class="bouton-retirer"
                    :disabled="l.quantiteRestante <= 0"
                    title="Retirer du stock (retour fournisseur, périmé, casse, perte…)"
                    @click="ouvrirRetrait(m, l)"
                  >
                    ↩️ Retirer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination v-model:page="page" v-model:taille="taille" :total="produits.length" />
      </div>
    </div>

    <!-- ===================== RETRAIT ===================== -->
    <FenetreRetrait
      v-if="retrait"
      :lot="retrait"
      :motif="retrait.perime ? 'PÉRIMÉ' : ''"
      @fermer="retrait = null"
      @enregistre="apresRetrait"
    />

    <!-- ===================== AJOUT D'UN LOT ===================== -->
    <FenetreModale v-if="ajoutLot" :titre="`＋ Ajouter un lot — ${ajoutLot.m.designation}`" @fermer="ajoutLot = null">
      <p class="note">
        Lot oublié ou mal enregistré à l'entrée : il est ajouté au stock (correctif +) et apparaît tout de suite dans
        l'inventaire.
      </p>
      <form id="form-ajout-lot" class="grille-formulaire" @submit.prevent="confirmerAjoutLot">
        <div>
          <label class="obligatoire">Numéro de lot</label>
          <input v-model.trim="ajoutLot.numeroLot" class="maj" required maxlength="60" />
        </div>
        <div>
          <label class="obligatoire">Quantité</label>
          <input v-model.number="ajoutLot.quantite" type="number" min="1" required />
        </div>
        <div>
          <label class="obligatoire">Date de péremption</label>
          <ChampDate v-model="ajoutLot.datePeremption" required />
        </div>
        <div class="pleine-largeur">
          <label>Justification</label>
          <input v-model.trim="ajoutLot.justification" class="maj" maxlength="255" placeholder="Ex : carton retrouvé en réserve" />
        </div>
      </form>
      <template #pied>
        <button class="bouton-secondaire" @click="ajoutLot = null">✖ Annuler</button>
        <button type="submit" form="form-ajout-lot" :disabled="enregistrement">Ajouter le lot</button>
      </template>
    </FenetreModale>

    <!-- ===================== FICHE D'INVENTAIRE ===================== -->
    <FenetreModale v-if="fiche" titre="🖨️ Fiche d'inventaire" tres-large @fermer="fiche = null">
      <div class="barre-outils">
        <label class="champ-date">Du <ChampDate v-model="fiche.du" @change="chargerFiche" /></label>
        <label class="champ-date">au <ChampDate v-model="fiche.au" @change="chargerFiche" /></label>
        <button type="button" class="bouton-secondaire petit" @click="chargerFiche">🔄 Actualiser</button>
        <span class="espace"></span>
        <ImportExportTableau
          v-if="fiche.donnees && fiche.donnees.lignes.length"
          titre="Fiche d'inventaire"
          :sous-titre="`Du ${date(fiche.du)} au ${date(fiche.au)} — ${resumeTexte}`"
          nom-fichier="fiche_inventaire"
          libelle-pdf="Imprimer (A4)"
          :colonnes-pdf="COLONNES_FICHE"
          :lignes="fiche.donnees.lignes"
        />
      </div>
      <p v-if="fiche.chargement" class="tableau-vide">Chargement…</p>
      <p v-else-if="!fiche.donnees || fiche.donnees.lignes.length === 0" class="tableau-vide">
        Aucun lot compté sur cette période. Validez d'abord l'inventaire, puis revenez ici.
      </p>
      <template v-else>
        <div class="fiche-resume">
          <span><strong>{{ fiche.donnees.resume.lotsComptes }}</strong> lot(s) compté(s)</span>
          <span><strong>{{ fiche.donnees.resume.lotsConformes }}</strong> conforme(s)</span>
          <span><strong>{{ fiche.donnees.resume.lotsAvecEcart }}</strong> avec écart</span>
          <span>Manquants : <strong>{{ fiche.donnees.resume.manquants }}</strong></span>
          <span>Excédents : <strong>+{{ fiche.donnees.resume.excedents }}</strong></span>
          <span v-if="voitValeur">Valeur des écarts : <strong>{{ montant(fiche.donnees.resume.valeurEcarts) }}</strong></span>
        </div>
        <div class="tableau-conteneur fiche-table">
          <table class="tableau">
            <thead>
              <tr>
                <th>Médicament</th><th>Lot</th><th>Péremption</th><th class="nombre">Stock théorique</th>
                <th class="nombre">Stock compté</th><th>Écart</th><th v-if="voitValeur" class="nombre">Valeur de l'écart</th>
                <th>Justification</th><th>Compté par</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in fiche.donnees.lignes" :key="l.id">
                <td><strong>{{ l.medicament }}</strong> <span class="detail">{{ l.code }}</span></td>
                <td>
                  <router-link :to="{ name: 'inventaire', params: { id: inventaireId(l) } }" class="code" :title="l.numero">{{ l.lot }}</router-link>
                  <span v-if="l.lotTrouve" class="badge badge-bleu trouve">Ajouté</span>
                </td>
                <td>{{ date(l.peremption) }}</td>
                <td class="nombre">{{ l.stockAvant }}</td>
                <td class="nombre">{{ l.stockApres }}</td>
                <td>
                  <span class="badge" :class="l.ecart === 0 ? 'badge-vert' : l.ecart > 0 ? 'badge-orange' : 'badge-rouge'">
                    {{ l.ecart > 0 ? '+' : '' }}{{ l.ecart }}
                  </span>
                </td>
                <td v-if="voitValeur" class="nombre">{{ montant(l.valeurEcart) }}</td>
                <td class="detail">{{ l.justification || (l.ecart === 0 ? 'Conforme' : '') }}</td>
                <td class="detail">{{ l.par }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #pied>
        <button class="bouton-secondaire" @click="fiche = null">✖ Fermer</button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import FenetreRetrait from '@/components/FenetreRetrait.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Pagination from '@/components/Pagination.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import EtatBadge from '@/components/EtatBadge.vue'
import { utiliserPagination } from '@/utils/pagination'
import { confirmer, notifier } from '@/utils/alertes'
import { aujourdhui, date, montant, quantite } from '@/utils/format'
import { listerParametres } from '@/api/parametrage'

const store = useStore()

/** Saisir et valider les comptages, ajouter un lot : droit VALIDER sur les inventaires. */
const peutValider = computed(() => store.getters['auth/peutValider']('inventaires'))
/** Retirer un lot : droit MODIFIER sur le module Lots, péremptions et retraits. */
const peutRetirer = computed(() => store.getters['auth/peutModifier']('retraits'))
const voitValeur = computed(() => store.getters['auth/voitPrixAchat'])
const stock = computed(() => store.state.inventaires.stock)
const chargement = ref(false)

/** Délai d'alerte de péremption (Paramètres généraux). */
const delaiAlerte = ref(30)

// ---------------------------------------------------------------------------
// FILTRES ET TRI (sans effet sur les saisies : un lot masqué garde sa quantité comptée)
// ---------------------------------------------------------------------------
const ETATS_FILTRE = computed(() => [
  { v: 'TOUS', l: 'Tous' },
  { v: 'PERIMES', l: 'Périmés' },
  { v: 'PROCHES', l: `Péremption ≤ ${delaiAlerte.value} j` },
  { v: 'ZERO', l: 'Stock à zéro' },
  { v: 'SOUS_SEUIL', l: 'Sous le seuil' },
])
const COMPTAGES = [
  { v: 'TOUS', l: 'Tous' },
  { v: 'NON_COMPTES', l: 'Non comptés' },
  { v: 'COMPTES', l: 'Comptés' },
  { v: 'ECART', l: 'Avec écart' },
]
const TRIS = [
  { id: 'STOCK_HAUT', libelle: 'Stock total le plus élevé' },
  { id: 'NOM', libelle: 'Nom A→Z' },
  { id: 'PEREMPTION', libelle: 'Péremption la plus proche' },
  { id: 'STOCK', libelle: 'Stock le plus bas' },
  { id: 'ECART', libelle: 'Écart le plus grand' },
]
const TRI_DEFAUT = 'STOCK_HAUT'

const recherche = ref('')
const filtreLot = ref('')
const filtreEtat = ref('TOUS')
const filtreComptage = ref('TOUS')
const tri = ref(TRI_DEFAUT)
const filtreActif = computed(
  () => !!filtreLot.value.trim() || filtreEtat.value !== 'TOUS' || filtreComptage.value !== 'TOUS' || tri.value !== TRI_DEFAUT,
)
function effacerFiltres() {
  filtreLot.value = ''
  filtreEtat.value = 'TOUS'
  filtreComptage.value = 'TOUS'
  tri.value = TRI_DEFAUT
}

// ---------------------------------------------------------------------------
// SAISIES (stock compté, justification) ET CORRECTIONS DE LOT, par lot
// ---------------------------------------------------------------------------
const saisies = reactive({}) // { [lotId]: quantité comptée }
const justifications = reactive({}) // { [lotId]: cause de l'écart }
const corrections = reactive({}) // { [lotId]: { numeroLot, datePeremption } }

/** « 2027-05-31T00:00:00.000Z » -> « 2027-05-31 » */
const jourIso = (d) => (d ? String(d).substring(0, 10) : '')

/** Prépare les corrections des nouveaux lots (n° de lot et péremption enregistrés). */
watch(
  stock,
  (produits) => {
    for (const m of produits) {
      for (const l of m.lots) {
        if (!corrections[l.id]) corrections[l.id] = { numeroLot: l.numeroLot, datePeremption: jourIso(l.datePeremption) }
      }
    }
  },
  { immediate: true },
)

const estCompte = (l) => saisies[l.id] !== undefined && saisies[l.id] !== '' && saisies[l.id] !== null
const ecart = (l) => (estCompte(l) ? Number(saisies[l.id]) - l.quantiteRestante : 0)
/** N° de lot ou péremption différents de ceux enregistrés. */
function lotCorrige(l) {
  const c = corrections[l.id]
  if (!c) return false
  return c.numeroLot.trim().toUpperCase() !== l.numeroLot || (!!c.datePeremption && c.datePeremption !== jourIso(l.datePeremption))
}
const aValider = (l) => estCompte(l) || lotCorrige(l)

/** Ligne envoyée au serveur : stock compté (inchangé s'il n'est pas saisi) + corrections du lot. */
function ligneComptage(l) {
  const ligne = {
    lotId: l.id,
    quantiteReelle: estCompte(l) ? Number(saisies[l.id]) : l.quantiteRestante,
    justification: ecart(l) !== 0 ? justifications[l.id] || null : null,
  }
  if (lotCorrige(l)) {
    ligne.numeroLot = corrections[l.id].numeroLot.trim()
    ligne.datePeremption = corrections[l.id].datePeremption || undefined
  }
  return ligne
}

// ---------------------------------------------------------------------------
// PRODUITS ET LIGNES AFFICHÉS
// ---------------------------------------------------------------------------
const toutesLignes = computed(() => stock.value.flatMap((m) => m.lots.map((l) => ({ m, l }))))
const nbSaisies = computed(() => toutesLignes.value.filter(({ l }) => aValider(l)).length)

const nbLotsVides = (m) => m.lots.filter((l) => l.quantiteRestante <= 0).length
const peremptionMs = (l) => new Date(l.datePeremption).getTime()
function joursAvantPeremption(l) {
  return Math.round((new Date(jourIso(l.datePeremption)) - new Date(aujourdhui())) / 86_400_000)
}
/** Badge de péremption : périmé / proche (rien si normal). */
function peremption(l) {
  const j = joursAvantPeremption(l)
  if (j < 0) return { libelle: 'Périmé', classe: 'badge-rouge' }
  if (j <= delaiAlerte.value) return { libelle: `${j} j`, classe: 'badge-orange' }
  return null
}

function ligneVisible(l) {
  const lot = filtreLot.value.trim().toUpperCase()
  if (lot && !l.numeroLot.toUpperCase().includes(lot)) return false
  const j = joursAvantPeremption(l)
  if (filtreEtat.value === 'PERIMES' && !(j < 0)) return false
  if (filtreEtat.value === 'PROCHES' && !(j >= 0 && j <= delaiAlerte.value)) return false
  if (filtreEtat.value === 'ZERO' && l.quantiteRestante !== 0) return false
  // Lots épuisés masqués : visibles seulement avec le filtre « Stock à zéro »
  if (filtreEtat.value !== 'ZERO' && l.quantiteRestante <= 0) return false
  if (filtreComptage.value === 'NON_COMPTES' && estCompte(l)) return false
  if (filtreComptage.value === 'COMPTES' && !estCompte(l)) return false
  if (filtreComptage.value === 'ECART' && ecart(l) === 0) return false
  return true
}

/** Produits et leurs lots affichés, après filtres et tri. */
const produits = computed(() => {
  const texte = recherche.value.toLowerCase()
  const filtreLignes = !!filtreLot.value.trim() || ['PERIMES', 'PROCHES', 'ZERO'].includes(filtreEtat.value) || filtreComptage.value !== 'TOUS'
  let liste = stock.value
    .filter((m) => !texte || [m.code, m.designation].some((v) => (v || '').toLowerCase().includes(texte)))
    .filter((m) => filtreEtat.value !== 'SOUS_SEUIL' || ['RUPTURE', 'SOUS_STOCK'].includes(m.etatStock))
    .map((m) => ({ m, lignes: m.lots.filter(ligneVisible) }))
    .filter((p) => p.lignes.length > 0 || !filtreLignes)

  const plusProche = (p) => Math.min(...p.lignes.map(peremptionMs))
  const plusGrandEcart = (p) => Math.max(0, ...p.lignes.map((l) => Math.abs(ecart(l))))
  const nom = (a, b) => a.m.designation.localeCompare(b.m.designation, 'fr')
  if (tri.value === 'PEREMPTION') liste.sort((a, b) => plusProche(a) - plusProche(b))
  else if (tri.value === 'STOCK_HAUT') liste.sort((a, b) => b.m.stock - a.m.stock || nom(a, b))
  else if (tri.value === 'STOCK') liste.sort((a, b) => a.m.stock - b.m.stock || nom(a, b))
  else if (tri.value === 'ECART') liste.sort((a, b) => plusGrandEcart(b) - plusGrandEcart(a) || nom(a, b))
  else liste.sort(nom)
  return liste
})

// Pagination des produits (retour à la page 1 quand un filtre change)
const { page, taille, lignesPage: produitsPage } = utiliserPagination(produits, [recherche, filtreLot, filtreEtat, filtreComptage, tri])

// ---------------------------------------------------------------------------
// VALIDATION DU COMPTAGE
// ---------------------------------------------------------------------------
const enregistrement = ref(false)

/** Remet à vide la saisie d'un lot (après validation). */
function oublier(lotId) {
  delete saisies[lotId]
  delete justifications[lotId]
  delete corrections[lotId] // recréées avec les nouvelles valeurs au rechargement
}

/** Contrôle avant envoi : n° de lot non vide, écart justifié (§ 12). */
function controler(lignes) {
  if (lignes.some((l) => l.numeroLot === '')) return 'Le numéro de lot ne peut pas être vide.'
  const sansJustif = toutesLignes.value.filter(({ l }) => aValider(l) && ecart(l) !== 0 && !justifications[l.id])
  const ids = new Set(lignes.map((l) => l.lotId))
  const manquantes = sansJustif.filter(({ l }) => ids.has(l.id))
  if (manquantes.length) return `Justifiez l'écart : ${manquantes.map(({ m, l }) => `${m.designation} lot ${l.numeroLot}`).join(', ')}.`
  return null
}

async function validerLot(m, l) {
  if (!aValider(l)) return
  const ligne = ligneComptage(l)
  const erreur = controler([ligne])
  if (erreur) return notifier('erreur', erreur)
  enregistrement.value = true
  try {
    const resultat = await store.dispatch('inventaires/validerComptage', [ligne])
    store.dispatch(
      'notifications/succes',
      estCompte(l)
        ? `${m.designation} — lot ${ligne.numeroLot || l.numeroLot} : stock ajusté à ${ligne.quantiteReelle} (${resultat.numero}).`
        : `${m.designation} — lot ${ligne.numeroLot || l.numeroLot} : n° de lot / péremption corrigés.`,
    )
    oublier(l.id)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    enregistrement.value = false
  }
}

/** Valide d'un coup toutes les quantités saisies et corrections. */
async function validerTout() {
  const aEnvoyer = toutesLignes.value.filter(({ l }) => aValider(l))
  const lignes = aEnvoyer.map(({ l }) => ligneComptage(l))
  if (lignes.length === 0) return
  const erreur = controler(lignes)
  if (erreur) return notifier('erreur', erreur)
  const confirme = await confirmer({
    titre: "Valider tout l'inventaire ?",
    texte: `${lignes.length} lot(s) seront validés : le stock de chaque lot devient le stock compté.`,
    boutonConfirmer: 'Oui, valider',
  })
  if (!confirme) return
  enregistrement.value = true
  try {
    const resultat = await store.dispatch('inventaires/validerComptage', lignes)
    store.dispatch('notifications/succes', `${resultat.numero} : ${resultat.ajustes} lot(s) ajusté(s) sur ${resultat.total} compté(s).`)
    for (const { l } of aEnvoyer) oublier(l.id)
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    enregistrement.value = false
  }
}

// ---------------------------------------------------------------------------
// RETRAIT D'UN LOT (fenêtre commune avec le module Retraits)
// ---------------------------------------------------------------------------
const retrait = ref(null)
function ouvrirRetrait(m, l) {
  retrait.value = { ...l, produit: m, perime: joursAvantPeremption(l) < 0 }
}
async function apresRetrait() {
  if (retrait.value) delete saisies[retrait.value.id]
  retrait.value = null
  await charger()
}

// ---------------------------------------------------------------------------
// AJOUT D'UN LOT
// ---------------------------------------------------------------------------
const ajoutLot = ref(null)
function ouvrirAjoutLot(m) {
  ajoutLot.value = { m, numeroLot: '', quantite: null, datePeremption: '', justification: '' }
}
async function confirmerAjoutLot() {
  const a = ajoutLot.value
  enregistrement.value = true
  try {
    await store.dispatch('inventaires/ajouterLotStock', {
      produitId: a.m.id,
      numeroLot: a.numeroLot,
      datePeremption: a.datePeremption,
      quantite: Number(a.quantite),
      justification: a.justification || null,
    })
    store.dispatch('notifications/succes', `Lot ${a.numeroLot.toUpperCase()} ajouté au stock.`)
    ajoutLot.value = null
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    enregistrement.value = false
  }
}

// ---------------------------------------------------------------------------
// FICHE D'INVENTAIRE (récapitulatif imprimable)
// ---------------------------------------------------------------------------
const fiche = ref(null)
function ouvrirFiche() {
  fiche.value = { du: aujourdhui(), au: aujourdhui(), donnees: null, chargement: false }
  chargerFiche()
}
async function chargerFiche() {
  const f = fiche.value
  f.chargement = true
  try {
    f.donnees = await store.dispatch('inventaires/fiche', { du: f.du, au: f.au || f.du })
  } catch (e) {
    f.donnees = null
    store.dispatch('notifications/erreurApi', e)
  } finally {
    f.chargement = false
  }
}
/** Document d'inventaire d'une ligne (n° INV-…) : la fiche détaillée est ouverte par son id. */
const inventaireId = (l) => idsInventaires.value[l.numero] ?? 0
const idsInventaires = ref({})
watch(
  () => fiche.value?.donnees,
  async (donnees) => {
    if (!donnees?.lignes.length) return
    try {
      await store.dispatch('inventaires/charger', {})
      idsInventaires.value = Object.fromEntries(store.state.inventaires.liste.map((i) => [i.numero, i.id]))
    } catch {
      // Liens vers les documents indisponibles : sans conséquence
    }
  },
)
const resumeTexte = computed(() => {
  const r = fiche.value?.donnees?.resume
  return r ? `${r.lotsComptes} lot(s) compté(s), ${r.lotsAvecEcart} avec écart` : ''
})

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
/** Feuille de comptage : une ligne par lot affiché (toutes les pages). */
const lignesExport = computed(() => produits.value.flatMap(({ m, lignes }) => lignes.map((l) => ({ m, l }))))
const COLONNES_EXPORT = [
  { titre: 'Code', valeur: ({ m }) => m.code },
  { titre: 'Médicament', valeur: ({ m }) => [m.designation, m.dosage].filter(Boolean).join(' ') },
  { titre: 'Lot', valeur: ({ l }) => l.numeroLot },
  { titre: 'Péremption', valeur: ({ l }) => date(l.datePeremption) },
  { titre: 'Stock actuel', valeur: ({ l }) => l.quantiteRestante, droite: true },
  { titre: 'Stock compté', valeur: ({ l }) => (estCompte(l) ? saisies[l.id] : ''), droite: true },
  { titre: 'Écart', valeur: ({ l }) => (estCompte(l) ? String(ecart(l)) : ''), droite: true },
]
const COLONNES_FICHE = [
  { titre: 'Médicament', valeur: (l) => `${l.medicament} (${l.code})` },
  { titre: 'Lot', valeur: (l) => l.lot },
  { titre: 'Péremption', valeur: (l) => date(l.peremption) },
  { titre: 'Stock théorique', valeur: (l) => l.stockAvant, droite: true },
  { titre: 'Stock compté', valeur: (l) => l.stockApres, droite: true },
  { titre: 'Écart', valeur: (l) => (l.ecart > 0 ? `+${l.ecart}` : String(l.ecart)), droite: true },
  { titre: "Valeur de l'écart", valeur: (l) => montant(l.valeurEcart), droite: true, somme: (l) => l.valeurEcart, formatTotal: montant },
  { titre: 'Justification', valeur: (l) => l.justification || (l.ecart === 0 ? 'Conforme' : '') },
  { titre: 'Compté par', valeur: (l) => l.par },
]

// ---------------------------------------------------------------------------
// CHARGEMENT
// ---------------------------------------------------------------------------
async function charger() {
  chargement.value = true
  try {
    await store.dispatch('inventaires/chargerStock')
  } catch (e) {
    store.dispatch('notifications/erreurApi', e)
  } finally {
    chargement.value = false
  }
}
onMounted(async () => {
  charger()
  try {
    const p = await listerParametres()
    delaiAlerte.value = Number(p.find((x) => x.cle === 'ALERTE_PEREMPTION_JOURS')?.valeur) || 30
  } catch {
    // délai par défaut : 30 jours
  }
})
</script>

<style scoped>
.onglet-contenu {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.detail { font-size: 0.78rem; color: var(--muted); }
.note { margin: 0 0 1rem; font-size: 0.88rem; color: var(--muted); line-height: 1.5; }
.petit { padding: 0.35rem 0.7rem; font-size: 0.82rem; }

.bouton-valider-tout { background: #16a34a; }
.bouton-valider-tout:hover:not(:disabled) { background: #15803d; }

/* ---------- Filtres ---------- */
.inv-filtres { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.9rem; margin: -0.25rem 0 1rem; }
.inv-lot { width: 170px; }
.inv-groupe { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; }
.inv-libelle { font-size: 0.78rem; font-weight: 600; color: var(--muted); }
.inv-tri { width: 250px; }
.inv-compteur { margin-left: auto; font-size: 0.78rem; color: var(--muted); }
.bouton-filtre {
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  background: #fff;
  border: 1.5px solid var(--border);
  color: var(--texte-sur-fond);
  font-size: 0.8rem;
  font-weight: 600;
}
.bouton-filtre:hover { border-color: var(--primary); }
.bouton-filtre.actif { background: var(--primary); border-color: var(--primary); color: #fff; }

/* ---------- Carte d'un produit (bleu ciel) ---------- */
.inventaire-produit {
  margin-bottom: 1.1rem;
  border: 2px solid #4f8fb8;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}
.inventaire-produit-entete {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: #e1f1fb;
  border-bottom: 2px solid #4f8fb8;
}
.inventaire-produit-entete strong { color: var(--texte-sur-fond); }
.lots-vides { font-size: 0.75rem; font-style: italic; color: var(--muted); }
.bouton-ajout-lot { margin-left: auto; padding: 0.4rem 0.8rem; font-size: 0.82rem; font-weight: 700; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25); }
.inventaire-aucun-lot { margin: 0.4rem 0.75rem; font-size: 0.82rem; color: var(--muted); }

/* ---------- Tableau des lots ---------- */
.inventaire-lots { width: 100%; border-collapse: collapse; }
.inventaire-lots th {
  padding: 0.4rem 0.65rem;
  background: #f8fafc;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  text-align: left;
}
.inventaire-lots td { padding: 0.4rem 0.65rem; border-bottom: 1px solid var(--bord-tableau); font-size: 0.85rem; }
.inventaire-lots tr.lot-corrige td { background: #fffdf5; }
.inventaire-lots tr.lot-compte td { background: #f0f8fe; }
.inventaire-input,
:deep(.champ-date-perso input.inventaire-input) { width: 90px; padding: 0.3rem 0.5rem; border: 1.5px solid #c5d7e3; border-radius: 6px; }
.inventaire-lot { width: 130px; }
.inventaire-peremption,
:deep(.champ-date-perso input.inventaire-peremption) { width: 150px; }
.inventaire-justif { width: 100%; min-width: 180px; }
.inventaire-input.modifie,
:deep(.champ-date-perso input.inventaire-input.modifie) { border-color: #d97706; background: #fffbeb; }
.inventaire-input.manquant { border-color: var(--danger); background: #fff5f5; }
.badge.peremption { margin-left: 0.35rem; }
.actions { text-align: right; white-space: nowrap; }
.bouton-valider { padding: 0.3rem 0.65rem; font-size: 0.8rem; }
.bouton-retirer {
  margin-left: 0.3rem;
  padding: 0.3rem 0.65rem;
  background: #fff;
  border: 1.5px solid #f1b4b4;
  color: var(--danger);
  font-size: 0.8rem;
}
.bouton-retirer:hover:not(:disabled) { background: #fdecec; }

/* ---------- Fiche d'inventaire ---------- */
.fiche-resume {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-bottom: 0.9rem;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  background: var(--fond-pale);
  font-size: 0.88rem;
}
.fiche-table { max-height: 50vh; overflow-y: auto; }
.trouve { margin-left: 0.35rem; }
</style>
