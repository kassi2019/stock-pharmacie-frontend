<!--
  =============================================================================
  MODULE — ENTRÉES EN STOCK (RÉCEPTIONS FOURNISSEURS) (§ 9)
  =============================================================================
  Même présentation que l'onglet « Réceptions fournisseurs » du district :
  liste filtrable + fenêtre de saisie / consultation.
  - Saisie : fournisseur, date, n° de facture / bon de livraison du fournisseur,
    et pour chaque produit : unité de comptage, quantité reçue, prix d'achat,
    n° de lot et date de péremption (obligatoires), observation de la ligne.
    Un même médicament reçu en plusieurs lots : bouton « + lot ».
  - UNITÉ DE COMPTAGE : celle de la fiche du médicament (boîte, flacon…) ;
    un produit en plaquettes peut aussi être reçu à la plaque.
  - PRIX D'ACHAT : le dernier prix d'achat du médicament est proposé, mais
    reste MODIFIABLE.
  - Pas de brouillon (différence avec le district) : « Enregistrer la
    réception » fait ENTRER LES LOTS EN STOCK tout de suite. Un lot périmé est
    refusé ; une péremption proche demande une confirmation.
  - Bon de réception (PDF).
  Liens : /receptions?nouvelle=1 ouvre une nouvelle réception,
          /receptions?voir=ID ouvre la réception ID (lien depuis les mouvements…).
  =============================================================================
-->
<template>
  <div class="page">
    <EnteteModule
      icone="entree"
      titre="Entrées en stock"
      description="Réceptions fournisseurs par lot : n° de lot, péremption, quantité et prix d'achat. L'enregistrement fait entrer les lots en stock."
    />

    <section class="bloc">
      <!-- Barre d'outils -->
      <div class="barre-outils">
        <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (n°, fournisseur, facture, BL)…" />
        <div class="filtre">
          <ListeDeroulante
            :model-value="filtres.fournisseurId || null"
            :options="fournisseurs"
            champ-libelle="nom"
            placeholder="Tous les fournisseurs"
            @update:model-value="(v) => filtrer('fournisseurId', v || '')"
          />
        </div>
        <div class="periode">
          <ChampDate :model-value="filtres.du" title="Du" @change="(v) => filtrer('du', v)" />
          <span>au</span>
          <ChampDate :model-value="filtres.au" title="Au" @change="(v) => filtrer('au', v)" />
        </div>
        <span class="espace"></span>
        <ImportExportTableau
          titre="Réceptions fournisseurs"
          :sous-titre="sousTitrePdf"
          nom-fichier="receptions"
          :colonnes-pdf="COLONNES_PDF"
          :lignes="lignesTriees"
        />
        <button v-si-modif @click="ouvrirFormulaire()">+ Nouvelle réception</button>
      </div>

      <!-- Tableau -->
      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-model="tri" cle="numero">N° réception</ColonneTri>
              <ColonneTri v-model="tri" cle="date">Date</ColonneTri>
              <ColonneTri v-model="tri" cle="fournisseur">Fournisseur</ColonneTri>
              <ColonneTri v-model="tri" cle="bonLivraison">Bon de livraison</ColonneTri>
              <ColonneTri v-model="tri" cle="facture">Facture fourn.</ColonneTri>
              <ColonneTri v-model="tri" cle="lignes" class="nombre">Lignes</ColonneTri>
              <ColonneTri v-model="tri" cle="agent">Saisie par</ColonneTri>
              <ColonneTri v-model="tri" cle="montant" class="nombre">Montant</ColonneTri>
              <th class="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in lignesPage" :key="r.id">
              <td class="code">{{ r.numero }}</td>
              <td>{{ date(r.dateReception) }}</td>
              <td><strong>{{ r.fournisseur.nom }}</strong></td>
              <td>{{ r.numBonLivraison || '—' }}</td>
              <td>{{ r.numFactureFourn || '—' }}</td>
              <td class="nombre">{{ r._count.lignes }}</td>
              <td>{{ nomPersonne(r.utilisateur) }}</td>
              <td class="nombre">{{ montant(r.montantTotal) }}</td>
              <td class="actions">
                <button class="bouton-lien" @click="ouvrirFormulaire(r)">Voir</button>
                <button v-si-imprimer class="bouton-lien" title="Bon de réception (PDF)" @click="imprimer(r)">Bon PDF</button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="receptionsAffichees.length">
            <tr>
              <td colspan="7">Total ({{ receptionsAffichees.length }} réception(s))</td>
              <td class="nombre total">{{ montant(totalListe) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <Pagination v-model:page="page" v-model:taille="taille" :total="receptionsAffichees.length" />
        <p v-if="!chargement && receptionsAffichees.length === 0" class="tableau-vide">Aucune réception sur la période.</p>
        <p v-if="chargement" class="tableau-vide">Chargement…</p>
      </div>
    </section>

    <!-- ===================== FORMULAIRE / CONSULTATION ===================== -->
    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? `Réception ${formulaire.numero}` : 'Nouvelle réception'"
      tres-large
      class="fenetre-reception"
      @fermer="fermer"
    >
      <!-- Réception enregistrée : rappel et bon de réception -->
      <div v-if="formulaire.id" class="encart-suite">
        <div>
          <strong>Réception enregistrée le {{ dateHeure(formulaire.createdAt) }} par {{ nomPersonne(formulaire.utilisateur) }} : les lots sont en stock.</strong>
          Une erreur se corrige par un retrait ou un inventaire.
        </div>
        <div class="encart-suite-boutons">
          <button v-si-imprimer type="button" @click="imprimer(formulaire)">Imprimer le bon de réception</button>
        </div>
      </div>

      <form id="form-reception" class="grille-formulaire quatre-colonnes" @submit.prevent="enregistrer">
        <div>
          <label class="obligatoire">Fournisseur</label>
          <ListeDeroulante
            v-model="formulaire.fournisseurId"
            :options="fournisseursActifs"
            champ-libelle="nom"
            placeholder="— Choisir le fournisseur —"
            :obligatoire="!lectureSeule"
            :desactive="lectureSeule"
          />
        </div>
        <div>
          <label class="obligatoire">Date de réception</label>
          <ChampDate v-model="formulaire.dateReception" :max="jour" required :disabled="lectureSeule" />
        </div>
        <div>
          <label>N° facture fournisseur</label>
          <input v-model.trim="formulaire.numFactureFourn" class="maj" maxlength="50" :disabled="lectureSeule" />
        </div>
        <div>
          <label>N° bon de livraison</label>
          <input v-model.trim="formulaire.numBonLivraison" class="maj" maxlength="50" :disabled="lectureSeule" />
        </div>

        <!-- ---------- Lignes ---------- -->
        <div class="pleine-largeur">
          <div class="titre-avec-export">
            <h4 class="section">Médicaments reçus</h4>
            <ImportExportTableau
              :titre="`Réception ${formulaire.numero || '(nouvelle)'}`"
              :sous-titre="formulaire.dateReception ? `Du ${date(formulaire.dateReception)}` : ''"
              :nom-fichier="`reception_${formulaire.numero || 'nouvelle'}`"
              :colonnes-pdf="COLONNES_LIGNES"
              :lignes="formulaire.lignes.filter((l) => l.produitId)"
            />
          </div>
          <p v-if="!lectureSeule" class="aide-prix">
            Le prix d'achat proposé est le dernier prix payé pour ce médicament : modifiez-le s'il a changé.
            Les quantités et prix sont par unité de comptage. Une ligne par lot ; un lot déjà en stock
            (même médicament, même n° de lot) est complété.
          </p>
          <div class="tableau-conteneur">
            <table class="tableau lignes">
              <thead>
                <tr>
                  <th>Médicament</th>
                  <th>Unité de comptage</th>
                  <th class="nombre">Qté reçue</th>
                  <th class="nombre">Prix d'achat</th>
                  <th>N° de lot</th>
                  <th>Péremption</th>
                  <th class="nombre">Montant</th>
                  <th>Observation</th>
                  <th v-if="!lectureSeule"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(ligne, index) in formulaire.lignes" :key="ligne.cle">
                  <td class="col-medicament">
                    <ListeDeroulante
                      v-if="!lectureSeule"
                      v-model="ligne.produitId"
                      :options="produits"
                      :champ-libelle="(p) => `${p.code} — ${p.designation}`"
                      placeholder="Choisir…"
                      @update:model-value="choisirProduit(ligne)"
                    />
                    <span v-else>{{ ligne.libelle }}</span>
                  </td>
                  <!-- Unité de comptage : celle de la fiche du médicament (ou la plaque) -->
                  <td class="col-unite">
                    <ListeDeroulante
                      v-if="!lectureSeule && unites(ligne).length > 1"
                      v-model="ligne.unite"
                      :options="unites(ligne)"
                      :effacable="false"
                      @update:model-value="changerUnite(ligne)"
                    />
                    <span v-else>{{ libelleUnite(ligne) }}</span>
                  </td>
                  <td class="nombre">
                    <input v-model.number="ligne.quantite" type="number" min="1" step="1" required :disabled="lectureSeule" />
                    <small v-if="plaquesDe(ligne)" class="detail">= {{ plaquesDe(ligne) }} plaques</small>
                  </td>
                  <!-- Prix d'achat : dernier prix proposé, modifiable -->
                  <td class="nombre">
                    <ChampMontant
                      v-model="ligne.prixAchatUnitaire"
                      decimales
                      class="champ-prix"
                      :class="{ 'prix-manquant': ligne.produitId && !prixSaisi(ligne) }"
                      :placeholder="ligne.produitId ? 'À saisir' : ''"
                      :required="!!ligne.produitId"
                      :disabled="lectureSeule"
                    />
                  </td>
                  <td>
                    <input v-model.trim="ligne.numeroLot" maxlength="60" class="champ-lot maj" required :disabled="lectureSeule" />
                  </td>
                  <td>
                    <ChampDate
                      v-model="ligne.datePeremption"
                      required
                      :disabled="lectureSeule"
                      :class="{ invalide: !lectureSeule && etatPeremption(ligne) === 'perime', alerte: !lectureSeule && etatPeremption(ligne) === 'proche' }"
                    />
                    <template v-if="!lectureSeule">
                      <small v-if="etatPeremption(ligne) === 'perime'" class="detail note-danger">Lot périmé : refusé</small>
                      <small v-else-if="etatPeremption(ligne) === 'proche'" class="detail note-alerte">≤ {{ DELAI_ALERTE_JOURS }} jours</small>
                    </template>
                  </td>
                  <td class="nombre"><strong>{{ montant(montantLigne(ligne)) }}</strong></td>
                  <td>
                    <input
                      v-if="!lectureSeule"
                      v-model.trim="ligne.observation"
                      maxlength="500"
                      class="champ-observation maj"
                      placeholder="Facultatif"
                    />
                    <span v-else>{{ ligne.observation || '' }}</span>
                  </td>
                  <td v-if="!lectureSeule" class="actions">
                    <button type="button" class="bouton-lien" title="Même médicament, autre lot" @click="ajouterLot(index)">+ lot</button>
                    <button type="button" class="bouton-lien danger" title="Retirer la ligne" @click="retirerLigne(index)">✕</button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="6">
                    <button v-if="!lectureSeule" type="button" class="bouton-lien" @click="ajouterLigne">+ Ajouter un médicament</button>
                  </td>
                  <td class="nombre total">{{ montant(totalFormulaire) }}</td>
                  <td></td>
                  <td v-if="!lectureSeule"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="pleine-largeur">
          <label>Observations générales (toute la réception)</label>
          <textarea v-model.trim="formulaire.observation" class="maj" rows="2" maxlength="500" :disabled="lectureSeule"></textarea>
        </div>
      </form>

      <template #pied>
        <button class="bouton-secondaire" @click="fermer">Fermer</button>
        <button v-if="formulaire.id" v-si-imprimer type="button" class="bouton-secondaire" @click="imprimer(formulaire)">Bon de réception PDF</button>
        <button v-if="!lectureSeule" v-si-modif type="submit" form="form-reception" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer la réception (entrée en stock)' }}
        </button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import EnteteModule from '@/components/EnteteModule.vue'
import FenetreModale from '@/components/FenetreModale.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import ChampMontant from '@/components/ChampMontant.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer, echapper } from '@/utils/alertes'
import { aujourdhui, date, dateHeure, montant, nombre } from '@/utils/format'
import { nomPersonne } from '@/utils/documentPdf'
import { bonDeReceptionPdf } from './receptionsCommun'

const DELAI_ALERTE_JOURS = 30

const store = useStore()
const route = useRoute()
const router = useRouter()

const recherche = ref('')
const formulaire = ref(null)
const enregistrement = ref(false)
const produits = ref([])

const liste = computed(() => store.state.receptions.liste)
const filtres = computed(() => store.state.receptions.filtres)
const chargement = computed(() => store.state.receptions.chargement)
const fournisseurs = computed(() => store.state.fournisseurs.liste)
const fournisseursActifs = computed(() => fournisseurs.value.filter((f) => f.actif || f.id === formulaire.value?.fournisseurId))

/** Réception déjà enregistrée : consultation seulement. */
const lectureSeule = computed(() => !!formulaire.value?.id)

const erreurApi = (e) => store.dispatch('notifications/erreurApi', e)
const charger = () => store.dispatch('receptions/charger').catch(erreurApi)
function filtrer(champ, valeur) {
  store.commit('receptions/filtres', { [champ]: valeur })
  charger()
}

const receptionsAffichees = computed(() => {
  const texte = recherche.value.toLowerCase()
  if (!texte) return liste.value
  return liste.value.filter((r) =>
    [r.numero, r.fournisseur.nom, r.numFactureFourn, r.numBonLivraison].some((v) => (v || '').toLowerCase().includes(texte)),
  )
})
const totalListe = computed(() => receptionsAffichees.value.reduce((t, r) => t + Number(r.montantTotal), 0))

// ---------------------------------------------------------------------------
// PÉREMPTION
// ---------------------------------------------------------------------------
const jour = aujourdhui()
const limite = (() => {
  const d = new Date(`${jour}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + DELAI_ALERTE_JOURS)
  return d.toISOString().slice(0, 10)
})()
function etatPeremption(l) {
  if (!l.datePeremption) return null
  if (l.datePeremption < jour) return 'perime'
  if (l.datePeremption <= limite) return 'proche'
  return null
}

// ---------------------------------------------------------------------------
// FORMULAIRE
// ---------------------------------------------------------------------------
let compteurLignes = 0
/** Ligne vide. prixAchatUnitaire = null tant que le prix n'est ni proposé ni saisi. */
function nouvelleLigne(produitId = null, unite = 'BOITE', prixAchatUnitaire = null) {
  return { cle: ++compteurLignes, produitId, unite, quantite: 1, prixAchatUnitaire, numeroLot: '', datePeremption: '', observation: '' }
}
function videFormulaire() {
  return { fournisseurId: null, dateReception: jour, numFactureFourn: '', numBonLivraison: '', observation: '', lignes: [nouvelleLigne()] }
}

/** Ouvre une réception enregistrée (consultation) ou une nouvelle réception. */
async function ouvrirFormulaire(reception = null) {
  if (!reception) {
    formulaire.value = videFormulaire()
    return
  }
  try {
    const r = await store.dispatch('receptions/trouver', reception.id)
    formulaire.value = {
      ...r,
      dateReception: r.dateReception.slice(0, 10),
      numFactureFourn: r.numFactureFourn || '',
      numBonLivraison: r.numBonLivraison || '',
      observation: r.observation || '',
      lignes: r.lignes.map((l) => ({
        cle: ++compteurLignes,
        produitId: l.produit.id,
        libelle: l.produit.code ? `${l.produit.code} — ${l.produit.designation}` : l.produit.designation,
        uniteLibelle: l.unite === 'PLAQUE' ? 'PLAQUE' : l.produit.uniteVente?.libelle,
        unite: l.unite,
        quantite: l.quantite,
        prixAchatUnitaire: Number(l.prixAchatUnitaire),
        numeroLot: l.numeroLot,
        datePeremption: l.datePeremption.slice(0, 10),
        observation: l.observation || '',
      })),
    }
  } catch (e) {
    erreurApi(e)
  }
}

function fermer() {
  formulaire.value = null
  // Retire ?nouvelle / ?voir de l'adresse
  if (route.query.nouvelle || route.query.voir) router.replace({ name: 'receptions' })
}

const produit = (id) => produits.value.find((p) => p.id === id)
const plaquesParBoite = (l) => produit(l.produitId)?.plaquesParBoite ?? 1

/** Unités possibles : l'unité de comptage du médicament et, s'il est en plaquettes, la plaque. */
function unites(l) {
  const p = produit(l.produitId)
  const comptage = { id: 'BOITE', libelle: p?.uniteVente?.libelle || 'BOÎTE' }
  if (!p) return [comptage]
  return p.plaquesParBoite > 1 || p.venteBoite ? [comptage, ...(p.plaquesParBoite > 1 ? [{ id: 'PLAQUE', libelle: 'PLAQUE' }] : [])] : [{ id: 'PLAQUE', libelle: 'PLAQUE' }]
}
function libelleUnite(l) {
  if (l.uniteLibelle) return l.uniteLibelle
  if (!l.produitId) return '—'
  return unites(l).find((u) => u.id === l.unite)?.libelle || '—'
}
/** Quantité convertie en plaques (affichée si l'unité contient plusieurs plaques). */
function plaquesDe(l) {
  if (lectureSeule.value || !l.produitId || l.unite !== 'BOITE' || plaquesParBoite(l) <= 1) return 0
  return (Number(l.quantite) || 0) * plaquesParBoite(l)
}

/** Vrai si la ligne a un prix d'achat (0 accepté, ex. don). */
function prixSaisi(l) {
  return l.prixAchatUnitaire !== null && l.prixAchatUnitaire !== undefined && l.prixAchatUnitaire !== '' && Number(l.prixAchatUnitaire) >= 0
}
/** Dernier prix d'achat connu du médicament, pour l'unité choisie. */
function prixPropose(l) {
  const p = produit(l.produitId)
  const prixPlaque = Number(p?.prixAchatPlaque)
  if (!prixPlaque) return null
  return Math.round(prixPlaque * (l.unite === 'BOITE' ? p.plaquesParBoite : 1) * 100) / 100
}

/** Médicament choisi : unité par défaut et dernier prix d'achat proposé. */
function choisirProduit(l) {
  const possibles = unites(l).map((u) => u.id)
  if (!possibles.includes(l.unite)) l.unite = possibles[0]
  l.prixAchatUnitaire = l.produitId ? prixPropose(l) : null
}
/** Unité changée : le prix proposé suit (boîte ↔ plaque). */
function changerUnite(l) {
  l.prixAchatUnitaire = prixPropose(l)
}

function ajouterLigne() {
  formulaire.value.lignes.push(nouvelleLigne())
}
/** Même médicament reçu dans un autre lot : nouvelle ligne juste en dessous. */
function ajouterLot(index) {
  const l = formulaire.value.lignes[index]
  formulaire.value.lignes.splice(index + 1, 0, nouvelleLigne(l.produitId, l.unite, l.prixAchatUnitaire))
}
function retirerLigne(index) {
  formulaire.value.lignes.splice(index, 1)
  if (!formulaire.value.lignes.length) ajouterLigne()
}

const montantLigne = (l) => (Number(l.quantite) || 0) * (Number(l.prixAchatUnitaire) || 0)
const totalFormulaire = computed(() => (formulaire.value?.lignes || []).reduce((t, l) => t + montantLigne(l), 0))
const libelleProduit = (id) => {
  const p = produit(id)
  return p ? `${p.code} — ${p.designation}` : '—'
}

/** Enregistre la réception : les lots ENTRENT EN STOCK tout de suite. */
async function enregistrer() {
  const f = formulaire.value
  if (!f.fournisseurId) return store.dispatch('notifications/erreur', 'Choisissez le fournisseur.')
  const lignes = f.lignes.filter((l) => l.produitId)
  if (lignes.length === 0) return store.dispatch('notifications/erreur', 'Ajoutez au moins un médicament reçu.')
  // Champs obligatoires et dates incomplètes : message du navigateur sur la case concernée
  if (!document.getElementById('form-reception')?.reportValidity()) return
  const sansPrix = lignes.find((l) => !prixSaisi(l))
  if (sansPrix) return store.dispatch('notifications/erreur', `${libelleProduit(sansPrix.produitId)} : saisissez le prix d'achat.`)

  const dto = {
    fournisseurId: f.fournisseurId,
    dateReception: f.dateReception,
    numFactureFourn: f.numFactureFourn || null,
    numBonLivraison: f.numBonLivraison || null,
    observation: f.observation || null,
    lignes: lignes.map((l) => ({
      produitId: l.produitId,
      numeroLot: l.numeroLot.toUpperCase(),
      datePeremption: l.datePeremption,
      quantite: Number(l.quantite),
      unite: l.unite,
      prixAchatUnitaire: Number(l.prixAchatUnitaire),
      observation: l.observation || null,
    })),
  }

  enregistrement.value = true
  try {
    const { erreurs, avertissements } = await store.dispatch('receptions/verifier', dto)
    if (erreurs.length) return store.dispatch('notifications/erreur', erreurs.join('\n'))
    const texte = `Les ${lignes.length} ligne(s) reçue(s) vont ENTRER EN STOCK. Une réception enregistrée ne peut plus être modifiée.`
    const ok = await confirmer(
      { titre: 'Enregistrer la réception ?', texte, boutonConfirmer: 'Oui, enregistrer et mettre en stock' },
      // Péremption proche : liste des lots concernés dans la même fenêtre
      avertissements.length
        ? `<p>${echapper(texte)}</p><p><strong>Péremption proche :</strong></p><ul style="text-align:left">${avertissements.map((a) => `<li>${echapper(a)}</li>`).join('')}</ul>`
        : undefined,
    )
    if (!ok) return
    const { reception } = await store.dispatch('receptions/creer', dto)
    store.dispatch('notifications/succes', `Réception ${reception.numero} enregistrée : stock mis à jour.`)
    await ouvrirFormulaire(reception)
    charger()
  } catch (e) {
    erreurApi(e)
  } finally {
    enregistrement.value = false
  }
}

async function imprimer(reception) {
  try {
    await bonDeReceptionPdf(await store.dispatch('receptions/trouver', reception.id))
  } catch (e) {
    erreurApi(e)
  }
}

// ---------------------------------------------------------------------------
// « DATA TABLE » : tri, pagination, PDF de la liste
// ---------------------------------------------------------------------------
const VALEURS_TRI = {
  numero: (r) => r.numero,
  date: (r) => r.dateReception,
  fournisseur: (r) => r.fournisseur.nom,
  bonLivraison: (r) => r.numBonLivraison,
  facture: (r) => r.numFactureFourn,
  lignes: (r) => r._count.lignes,
  agent: (r) => nomPersonne(r.utilisateur),
  montant: (r) => Number(r.montantTotal),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(receptionsAffichees, [recherche, filtres], VALEURS_TRI)

const sousTitrePdf = computed(() => {
  const f = fournisseurs.value.find((x) => x.id === Number(filtres.value.fournisseurId))
  return [
    f ? `Fournisseur : ${f.nom}` : 'Tous les fournisseurs',
    `du ${filtres.value.du ? date(filtres.value.du) : '…'} au ${filtres.value.au ? date(filtres.value.au) : '…'}`,
  ].join(' — ')
})

// Export PDF / Excel des lignes de la fenêtre de réception
const COLONNES_LIGNES = [
  { titre: 'Médicament', valeur: (l) => l.libelle || libelleProduit(l.produitId) },
  { titre: 'Unité de comptage', valeur: (l) => libelleUnite(l) },
  { titre: 'Qté reçue', valeur: (l) => nombre(Number(l.quantite) || 0), droite: true, somme: (l) => Number(l.quantite) || 0 },
  { titre: "Prix d'achat", valeur: (l) => (prixSaisi(l) ? montant(l.prixAchatUnitaire) : 'À saisir'), droite: true },
  { titre: 'N° de lot', valeur: (l) => l.numeroLot || '' },
  { titre: 'Péremption', valeur: (l) => date(l.datePeremption) },
  { titre: 'Montant', valeur: (l) => montant(montantLigne(l)), droite: true, somme: montantLigne, formatTotal: montant },
  { titre: 'Observation', valeur: (l) => l.observation || '' },
]

const COLONNES_PDF = [
  { titre: 'N° réception', valeur: (r) => r.numero },
  { titre: 'Date', valeur: (r) => date(r.dateReception) },
  { titre: 'Fournisseur', valeur: (r) => r.fournisseur.nom },
  { titre: 'Bon de livraison', valeur: (r) => r.numBonLivraison },
  { titre: 'Facture', valeur: (r) => r.numFactureFourn },
  { titre: 'Lignes', valeur: (r) => r._count.lignes, droite: true },
  { titre: 'Saisie par', valeur: (r) => nomPersonne(r.utilisateur) },
  { titre: 'Montant', valeur: (r) => montant(r.montantTotal), droite: true, somme: (r) => Number(r.montantTotal), formatTotal: montant },
]

// Liens /receptions?nouvelle=1 et /receptions?voir=ID
function ouvrirDepuisAdresse() {
  if (route.query.nouvelle) ouvrirFormulaire()
  else if (route.query.voir) ouvrirFormulaire({ id: Number(route.query.voir) })
}
watch(() => route.query, ouvrirDepuisAdresse)

onMounted(async () => {
  charger()
  store.dispatch('fournisseurs/charger').catch(() => {})
  ouvrirDepuisAdresse()
  try {
    produits.value = await store.dispatch('catalogue/rechercherProduits', '')
  } catch (e) {
    erreurApi(e)
  }
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.periode {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--muted);
}
.detail {
  display: block;
  font-size: 0.78rem;
  color: var(--muted);
}
.total {
  font-weight: 800;
  color: var(--primary-dark);
}
.encart-suite {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--primary);
  border-radius: 10px;
  background: #fff;
  font-size: 0.9rem;
}
.encart-suite-boutons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.titre-avec-export {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.section {
  margin: 0.25rem 0 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
}
/* Fenêtre de réception : un peu plus large que « très large » pour éviter de défiler */
.fenetre-reception :deep(.fenetre) {
  max-width: 1400px;
}
.grille-formulaire.quatre-colonnes {
  grid-template-columns: repeat(4, 1fr);
}
@media (max-width: 900px) {
  .grille-formulaire.quatre-colonnes {
    grid-template-columns: 1fr 1fr;
  }
}
.lignes td {
  padding: 0.45rem 0.4rem;
  vertical-align: top;
}
.lignes .col-medicament {
  min-width: 260px;
}
.lignes .col-unite {
  min-width: 120px;
  white-space: nowrap;
  color: var(--muted);
}
.lignes input[type='number'] {
  width: 90px;
  text-align: right;
}
.champ-lot {
  width: 120px;
}
.lignes .champ-prix {
  width: 110px;
}
.champ-observation {
  width: 160px;
}
.lignes .prix-manquant {
  border-color: #c0392b;
}
.note-danger {
  color: var(--danger);
  font-weight: 600;
}
.note-alerte {
  color: #b35c00;
  font-weight: 600;
}
:deep(.champ-date-perso input.invalide),
.invalide :deep(input) {
  border-color: var(--danger);
  background: #fff5f5;
}
.alerte :deep(input) {
  border-color: #e0a100;
  background: #fffaf0;
}
.aide-prix {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--muted);
}
.lignes tfoot td {
  border-bottom: none;
}
textarea {
  width: 100%;
  resize: vertical;
}
</style>
