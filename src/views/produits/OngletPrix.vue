<!--
  =============================================================================
  ONGLET « PRIX » (prix de vente et prix d'achat, avec historique)
  =============================================================================
  Même présentation que le district, DEUX VUES :

  Comme le district : UN SEUL prix de vente, par unité de vente (boîte, flacon…).

  A. VUE D'ENSEMBLE : tous les médicaments avec prix de vente, dernier prix
     d'achat et marge (par unité de vente). Filtres : recherche, famille,
     état des prix, inactifs. Bouton « Historique / modifier » -> vue B.

  B. DÉTAIL D'UN MÉDICAMENT :
       - PRIX DE VENTE : prix en cours + nouveau prix + historique (Corriger) ;
       - PRIX D'ACHAT : dernier prix + historique des réceptions (le prix d'achat
         est repris des lots reçus, § 7 : il se modifie par une réception).

  Règle : un prix de vente n'est jamais modifié. Un changement de tarif crée un
  NOUVEAU prix à la date du jour ; l'ancien est clôturé automatiquement.
  « Corriger » sert uniquement aux erreurs de saisie (motif obligatoire).
  =============================================================================
-->
<template>
  <div>
    <!-- ===================== A. VUE D'ENSEMBLE ===================== -->
    <template v-if="!produitId">
      <div class="barre-outils">
        <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher (code, désignation)…" />
        <div class="filtre">
          <ListeDeroulante v-model="familleFiltre" :options="familles" placeholder="Toutes les familles" />
        </div>
        <div class="filtre">
          <ListeDeroulante v-model="etatPrixFiltre" :options="ETATS_PRIX" placeholder="Tous les prix" />
        </div>
        <label class="case-a-cocher">
          <input v-model="afficherInactifs" type="checkbox" /> Afficher les inactifs
        </label>
        <span class="espace"></span>
        <ImportExportTableau
          titre="Prix des médicaments"
          :sous-titre="sousTitrePdf"
          nom-fichier="prix_medicaments"
          :colonnes-pdf="COLONNES_PDF_LISTE"
          :lignes="lignesTriees"
        />
      </div>

      <div class="compteurs">
        <span class="compteur">{{ medicamentsAffiches.length }} médicament(s)</span>
        <span class="compteur rouge" :class="{ zero: compteurs.sansVente === 0 }">
          {{ compteurs.sansVente }} sans prix de vente
        </span>
        <span class="compteur orange" :class="{ zero: compteurs.sansAchat === 0 }">
          {{ compteurs.sansAchat }} sans prix d'achat
        </span>
      </div>

      <div class="tableau-conteneur">
        <table class="tableau">
          <thead>
            <tr>
              <ColonneTri v-model="tri" cle="code">Code</ColonneTri>
              <ColonneTri v-model="tri" cle="designation">Désignation</ColonneTri>
              <ColonneTri v-model="tri" cle="famille">Famille</ColonneTri>
              <ColonneTri v-model="tri" cle="uniteVente">Unité de vente</ColonneTri>
              <ColonneTri v-model="tri" cle="prixVente" class="nombre">Prix de vente</ColonneTri>
              <ColonneTri v-model="tri" cle="prixAchat" class="nombre">Prix d'achat</ColonneTri>
              <ColonneTri v-model="tri" cle="marge" class="nombre">Marge</ColonneTri>
              <th class="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="med in lignesPage" :key="med.id" :class="{ 'ligne-inactive': !med.actif }">
              <td class="code">{{ med.code }}</td>
              <td>
                <strong>{{ med.designation }}</strong>
                <span v-if="med.consommable" class="badge badge-orange consommable">Consommable</span>
                <div v-if="med.forme" class="detail">{{ med.forme.libelle }}</div>
              </td>
              <td>{{ med.famille?.libelle || '—' }}</td>
              <td>{{ uniteVente(med) }}</td>
              <td class="nombre">
                <span v-if="med.consommable">{{ montant(0) }}</span>
                <span v-else-if="sansVente(med)" class="badge badge-rouge">Non défini</span>
                <span v-else>{{ montant(prixVente(med)) }}</span>
              </td>
              <td class="nombre">
                <span v-if="!sansAchat(med)">{{ montant(prixAchat(med)) }}</span>
                <span v-else class="badge badge-orange">Non défini</span>
              </td>
              <td class="nombre">
                <template v-if="marge(med) !== null">
                  <strong :class="{ 'marge-negative': marge(med) < 0 }">{{ montant(marge(med)) }}</strong>
                  <div v-if="tauxMarge(med) !== null" class="detail">{{ tauxMarge(med) }} %</div>
                </template>
                <span v-else>—</span>
              </td>
              <td class="actions">
                <button class="bouton-lien" @click="ouvrirDetail(med)">Historique / modifier</button>
              </td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model:page="page" v-model:taille="taille" :total="medicamentsAffiches.length" />
        <p v-if="!chargement && medicamentsAffiches.length === 0" class="tableau-vide">
          Aucun médicament ne correspond aux filtres.
        </p>
        <p v-if="chargement" class="tableau-vide">Chargement…</p>
      </div>
    </template>

    <!-- ===================== B. DÉTAIL D'UN MÉDICAMENT ===================== -->
    <template v-else>
      <div class="barre-outils">
        <button class="bouton-secondaire retour" @click="retourListe">← Retour à la liste</button>
        <div class="choix-medicament">
          <label>Médicament</label>
          <ListeDeroulante
            v-model="produitId"
            :options="medicamentsActifs"
            :champ-libelle="(m) => `${m.code} — ${m.designation}`"
            :effacable="false"
            placeholder="Tapez le code ou le nom du médicament…"
          />
        </div>
      </div>

      <div class="colonnes-prix">
        <!-- =================== PRIX DE VENTE =================== -->
        <section class="carte-prix">
          <header class="entete-carte">
            <div>
              <h3>Prix de vente</h3>
              <p>Prix appliqué à la caisse de la pharmacie</p>
            </div>
            <ImportExportTableau
              titre="Historique des prix de vente"
              :sous-titre="libelleMedicament"
              :nom-fichier="`prix_vente_${produitChoisi?.code || ''}`"
              :colonnes-pdf="COLONNES_PDF_VENTE"
              :lignes="historiqueVente"
            />
          </header>

          <div class="prix-actuel">
            <span>Prix en cours</span>
            <strong v-if="produitChoisi">{{ montant(prixVente(produitChoisi)) }} / {{ uniteVente(produitChoisi).toLowerCase() }}</strong>
          </div>

          <p v-if="produitChoisi?.consommable" class="explication">
            Consommable : vendu à 0 F mais décompté du stock. Pas de prix de vente à saisir.
          </p>
          <!-- Nouveau prix de vente -->
          <form v-else v-si-modif class="nouveau-prix" @submit.prevent="enregistrerPrixVente">
            <div>
              <label class="obligatoire">Nouveau prix par {{ uniteVente(produitChoisi).toLowerCase() }} (FCFA)</label>
              <input v-model.number="nouveauPrix" type="number" min="0" step="1" required />
            </div>
            <div>
              <label>À partir du</label>
              <input :value="date(aujourdhui())" disabled />
            </div>
            <button type="submit" :disabled="enregistrement">Enregistrer</button>
          </form>

          <TableauHistoriquePrix :lignes="historiqueVente" @corriger="ouvrirCorrection" />
        </section>

        <!-- =================== PRIX D'ACHAT =================== -->
        <section class="carte-prix">
          <header class="entete-carte">
            <div>
              <h3>Prix d'achat</h3>
              <p>Prix payé au fournisseur, repris des lots reçus (valorisation du stock)</p>
            </div>
            <ImportExportTableau
              titre="Historique des prix d'achat"
              :sous-titre="libelleMedicament"
              :nom-fichier="`prix_achat_${produitChoisi?.code || ''}`"
              :colonnes-pdf="COLONNES_PDF_ACHAT"
              :lignes="historiqueAchat"
            />
          </header>

          <div class="prix-actuel secondaire">
            <span>Dernier prix d'achat</span>
            <strong v-if="produitChoisi && !sansAchat(produitChoisi)">{{ montant(prixAchat(produitChoisi)) }} / {{ uniteVente(produitChoisi).toLowerCase() }}</strong>
            <strong v-else>Non défini</strong>
          </div>
          <p class="explication">
            Le prix d'achat se met à jour à chaque <strong>entrée en stock</strong> (module Entrées).
          </p>

          <div class="tableau-conteneur">
            <h4>Historique des réceptions</h4>
            <p v-if="historiqueAchat.length === 0" class="tableau-vide">Aucune réception pour ce médicament.</p>
            <table v-else class="tableau">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fournisseur</th>
                  <th>Lot</th>
                  <th class="nombre">Quantité</th>
                  <th class="nombre">Prix d'achat</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in historiqueAchatPage" :key="l.id">
                  <td>
                    {{ date(l.dateReception) }}
                    <div class="detail">
                      <router-link :to="{ name: 'reception', params: { id: l.receptionId } }">{{ l.numero }}</router-link>
                    </div>
                  </td>
                  <td>{{ l.fournisseur }}</td>
                  <td class="code">{{ l.numeroLot }}</td>
                  <td class="nombre">{{ l.quantite }}</td>
                  <td class="nombre">
                    <strong>{{ montant(l.prixUnitaire) }}</strong>
                    <div class="detail">par {{ l.unite === 'BOITE' ? uniteVente(produitChoisi).toLowerCase() : 'plaque' }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <Pagination v-model:page="pageAchat" v-model:taille="tailleAchat" :total="historiqueAchat.length" />
          </div>
        </section>
      </div>
    </template>

    <!-- ===================== FENÊTRE : CORRIGER LE PRIX EN COURS ===================== -->
    <FenetreModale v-if="correction" titre="Corriger le prix de vente" @fermer="correction = null">
      <p class="explication">
        À utiliser pour une <strong>erreur de saisie</strong> : le prix en cours est remplacé, sans créer de
        nouvelle ligne dans l'historique. L'ancien montant et le motif sont conservés dans le journal.
        Pour un <strong>changement de tarif</strong>, utilisez plutôt « Nouveau prix ».
      </p>
      <form id="form-correction" class="grille-formulaire" @submit.prevent="enregistrerCorrection">
        <div>
          <label class="obligatoire">Prix par {{ uniteVente(produitChoisi).toLowerCase() }} (FCFA)</label>
          <input v-model.number="correction.prix" type="number" min="0" step="1" required />
        </div>
        <div class="pleine-largeur">
          <label class="obligatoire">Motif de la correction</label>
          <input v-model.trim="correction.motif" class="maj" required maxlength="255" placeholder="ex. Erreur de saisie (1 500 au lieu de 15 000)" />
        </div>
      </form>
      <template #pied>
        <button class="bouton-secondaire" @click="correction = null">Fermer</button>
        <button type="submit" form="form-correction" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Corriger' }}
        </button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import TableauHistoriquePrix from './TableauHistoriquePrix.vue'
import { utiliserPagination, utiliserTableau } from '@/utils/pagination'
import { aujourdhui, date, montant } from '@/utils/format'
import { corrigerPrixVente, creerPrixVente, historiquePrixAchat, historiquePrixVente } from '@/api/parametrage'

const store = useStore()
const route = useRoute()
const router = useRouter()

const ETATS_PRIX = [
  { id: 'SANS_VENTE', libelle: 'Sans prix de vente' },
  { id: 'SANS_ACHAT', libelle: "Sans prix d'achat" },
  { id: 'COMPLETS', libelle: 'Prix complets' },
]

// ---------------------------------------------------------------------------
// A. VUE D'ENSEMBLE
// ---------------------------------------------------------------------------
const recherche = ref('')
const familleFiltre = ref(null)
const etatPrixFiltre = ref(null)
const afficherInactifs = ref(false)
const chargement = ref(false)

const medicaments = computed(() => store.state.referentiel.medicaments)
const familles = computed(() => store.state.referentiel.familles)
const medicamentsActifs = computed(() => medicaments.value.filter((m) => m.actif))

/** Un médicament ancien vendu à la plaque seule garde la plaque comme unité de vente. */
const alaPlaque = (m) => !!m && !m.venteBoite && m.ventePlaque
const uniteVente = (m) => (alaPlaque(m) ? 'PLAQUE' : m?.uniteVente?.libelle ?? 'BOÎTE')
/** Prix de vente d'une unité de vente (un seul prix, comme le district). */
const prixVente = (m) => Number(alaPlaque(m) ? m.prixVentePlaque : m.prixVenteBoite)
/** Prix d'achat d'une unité de vente (le stock est tenu en plaques). */
const prixAchat = (m) => Number(m.prixAchatPlaque ?? 0) * (alaPlaque(m) ? 1 : m.plaquesParBoite || 1)
/** Montants envoyés à l'API pour un prix unique. */
const montants = (m, prix) =>
  alaPlaque(m) ? { prixBoite: 0, prixPlaque: Number(prix) || 0 } : { prixBoite: Number(prix) || 0, prixPlaque: 0 }

const sansVente = (m) => !m.consommable && prixVente(m) === 0
const sansAchat = (m) => Number(m.prixAchatPlaque ?? 0) === 0

/** Marge par unité de vente = prix de vente − prix d'achat. */
function marge(m) {
  if (m.consommable || sansVente(m) || sansAchat(m)) return null
  return Math.round((prixVente(m) - prixAchat(m)) * 100) / 100
}
function tauxMarge(m) {
  const g = marge(m)
  return g === null ? null : Math.round((g / prixAchat(m)) * 100)
}

const medicamentsAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  return medicaments.value.filter((m) => {
    if (!afficherInactifs.value && !m.actif) return false
    if (familleFiltre.value && m.familleId !== familleFiltre.value) return false
    if (etatPrixFiltre.value === 'SANS_VENTE' && !sansVente(m)) return false
    if (etatPrixFiltre.value === 'SANS_ACHAT' && !sansAchat(m)) return false
    if (etatPrixFiltre.value === 'COMPLETS' && (sansVente(m) || sansAchat(m))) return false
    if (!texte) return true
    return [m.code, m.designation].some((v) => (v || '').toLowerCase().includes(texte))
  })
})

const compteurs = computed(() => ({
  sansVente: medicamentsAffiches.value.filter(sansVente).length,
  sansAchat: medicamentsAffiches.value.filter(sansAchat).length,
}))

const sousTitrePdf = computed(() =>
  [
    familleFiltre.value ? `Famille : ${familles.value.find((f) => f.id === familleFiltre.value)?.libelle}` : 'Toutes les familles',
    ETATS_PRIX.find((e) => e.id === etatPrixFiltre.value)?.libelle ?? 'Tous les prix',
  ].join(' · '),
)

const COLONNES_PDF_LISTE = [
  { titre: 'Code', valeur: (m) => m.code },
  { titre: 'Désignation', valeur: (m) => m.designation },
  { titre: 'Famille', valeur: (m) => m.famille?.libelle },
  { titre: 'Unité', valeur: (m) => uniteVente(m) },
  { titre: 'Prix de vente', valeur: (m) => (sansVente(m) ? 'Non défini' : montant(prixVente(m))), droite: true },
  { titre: "Prix d'achat", valeur: (m) => (sansAchat(m) ? 'Non défini' : montant(prixAchat(m))), droite: true },
  { titre: 'Marge', valeur: (m) => (marge(m) === null ? '—' : montant(marge(m))), droite: true },
]

const VALEURS_TRI = {
  code: (m) => m.code,
  designation: (m) => m.designation,
  famille: (m) => m.famille?.libelle,
  uniteVente: (m) => uniteVente(m),
  prixVente: (m) => prixVente(m),
  prixAchat: (m) => prixAchat(m),
  marge: (m) => marge(m),
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(
  medicamentsAffiches,
  [recherche, familleFiltre, etatPrixFiltre, afficherInactifs],
  VALEURS_TRI,
)

async function charger() {
  chargement.value = true
  try {
    await Promise.all([
      store.dispatch('referentiel/charger', { liste: 'medicaments' }),
      store.dispatch('referentiel/charger', { liste: 'familles' }),
    ])
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}

// ---------------------------------------------------------------------------
// B. DÉTAIL D'UN MÉDICAMENT (écrit dans l'adresse : /produits?onglet=prix&medicament=12)
// ---------------------------------------------------------------------------
const produitId = ref(route.query.medicament ? Number(route.query.medicament) : null)
const produitChoisi = computed(() => medicaments.value.find((m) => m.id === produitId.value) ?? null)
const libelleMedicament = computed(() => (produitChoisi.value ? `${produitChoisi.value.code} — ${produitChoisi.value.designation}` : ''))

const historiqueVente = ref([])
const historiqueAchat = ref([])
const nouveauPrix = ref(0)
const correction = ref(null)
const enregistrement = ref(false)

const {
  page: pageAchat,
  taille: tailleAchat,
  lignesPage: historiqueAchatPage,
} = utiliserPagination(historiqueAchat, [produitId])

function ouvrirDetail(med) {
  produitId.value = med.id
}
function retourListe() {
  produitId.value = null
}

async function chargerHistorique() {
  if (!produitId.value) return
  try {
    const [vente, achat] = await Promise.all([historiquePrixVente(produitId.value), historiquePrixAchat(produitId.value)])
    historiqueVente.value = vente
    historiqueAchat.value = achat
    nouveauPrix.value = produitChoisi.value ? prixVente(produitChoisi.value) : 0
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

watch(produitId, (id) => {
  router.replace({ query: { ...route.query, medicament: id ?? undefined } })
  chargerHistorique()
})

/** Recharge le médicament (prix en cours) puis son historique. */
async function rafraichir() {
  await store.dispatch('referentiel/charger', { liste: 'medicaments' })
  await chargerHistorique()
}

async function enregistrerPrixVente() {
  enregistrement.value = true
  try {
    const p = produitChoisi.value
    await creerPrixVente({ produitId: p.id, ...montants(p, nouveauPrix.value) })
    store.dispatch('notifications/succes', 'Nouveau prix de vente enregistré.')
    await rafraichir()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

function ouvrirCorrection(ligne) {
  correction.value = { ligne, prix: Number(ligne.prixBoite) || Number(ligne.prixPlaque), motif: '' }
}

async function enregistrerCorrection() {
  enregistrement.value = true
  try {
    const { ligne, prix, motif } = correction.value
    await corrigerPrixVente(ligne.id, { ...montants(produitChoisi.value, prix), motif })
    store.dispatch('notifications/succes', 'Prix corrigé.')
    correction.value = null
    await rafraichir()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

const COLONNES_PDF_VENTE = [
  { titre: 'Prix de vente', valeur: (p) => montant(Number(p.prixBoite) || Number(p.prixPlaque)), droite: true },
  { titre: 'Du', valeur: (p) => date(p.dateEffet) },
  { titre: 'Au', valeur: (p) => (p.dateFin ? date(p.dateFin) : '—') },
  { titre: 'Statut', valeur: (p) => (p.dateFin ? 'Clôturé' : 'En cours') + (p.motifCorrection ? ' (corrigé)' : '') },
]
const COLONNES_PDF_ACHAT = [
  { titre: 'Date', valeur: (l) => date(l.dateReception) },
  { titre: 'Réception', valeur: (l) => l.numero },
  { titre: 'Fournisseur', valeur: (l) => l.fournisseur },
  { titre: 'Lot', valeur: (l) => l.numeroLot },
  { titre: 'Quantité', valeur: (l) => l.quantite, droite: true },
  { titre: "Prix d'achat", valeur: (l) => `${montant(l.prixUnitaire)} / ${l.unite === 'BOITE' ? 'boîte' : 'plaque'}`, droite: true },
]

onMounted(async () => {
  await charger()
  await chargerHistorique()
})
</script>

<style scoped>
.detail {
  font-size: 0.78rem;
  color: var(--muted);
}
.consommable {
  margin-left: 0.4rem;
}
.marge-negative {
  color: var(--danger);
}
.compteurs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}
.compteur {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 0.8rem;
  font-weight: 700;
}
.compteur.rouge {
  background: #fdecec;
  color: var(--danger);
}
.compteur.orange {
  background: #fff1e0;
  color: #b35c00;
}
.compteur.zero {
  opacity: 0.55;
}

/* Vue détail */
.retour {
  align-self: flex-end;
}
.choix-medicament {
  flex: 1;
  max-width: 520px;
}
.choix-medicament label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--muted);
}
.colonnes-prix {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
@media (max-width: 1000px) {
  .colonnes-prix {
    grid-template-columns: 1fr;
  }
}
.carte-prix {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--border);
  border-top: 4px solid var(--primary);
  border-radius: 14px;
}
.entete-carte {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
.entete-carte h3 {
  margin: 0;
  color: var(--primary-dark);
}
.entete-carte p {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.prix-actuel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: linear-gradient(120deg, var(--primary), var(--primary-dark));
  color: #fff;
}
.prix-actuel strong {
  font-size: 1.15rem;
  text-align: right;
}
.prix-actuel.secondaire {
  background: linear-gradient(120deg, var(--accent), var(--accent-dark));
}
.nouveau-prix {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}
.nouveau-prix > div {
  flex: 1;
  min-width: 140px;
}
.nouveau-prix label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--muted);
}
.nouveau-prix input {
  width: 100%;
}
.explication {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  background: var(--fond-pale);
  font-size: 0.85rem;
  color: var(--texte-sur-fond);
}
h4 {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: var(--texte-sur-fond);
}
</style>
