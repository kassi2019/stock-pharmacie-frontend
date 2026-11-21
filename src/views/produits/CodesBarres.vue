<!--
  =============================================================================
  ÉCRAN « CODES-BARRES » (téléphone / tablette, utilisable aussi sur ordinateur)
  =============================================================================
  Pour ÉQUIPER les médicaments de leur code-barres et pour VÉRIFIER une boîte.
  - « Scanner des boîtes » : caméra ouverte, les boîtes se scannent à la suite :
      * code CONNU   -> le médicament s'affiche (stock et prix selon les droits) ;
      * code INCONNU -> la caméra se ferme et propose (droit MODIFIER sur
        Médicaments et prix) : RATTACHER le code à un médicament existant, ou
        CRÉER un nouveau médicament avec ce code (Paramétrage > Médicaments).
  - Saisie au clavier (ou douchette) dans le même champ.
  - « LE POSTE ATTEND UN CODE » : un PC a ouvert le formulaire d'un médicament et
    attend son code (bouton « 📱 Scanner avec le téléphone ») : « Scanner » envoie
    le code lu directement dans ce formulaire.
  - « Médicaments sans code-barres » : on choisit le médicament, puis on scanne sa
    boîte (le code lui est rattaché directement) — pour équiper tout le stock.
  Droits : ceux de « Médicaments et prix » (module produits).
  =============================================================================
-->
<template>
  <div class="page-codes">
    <EnteteModule
      icone="code-barre"
      titre="Codes-barres des médicaments"
      description="Scannez une boîte pour la retrouver, ou pour rattacher son code-barres au bon médicament."
    />

    <!-- ===== Demandes des postes (PC) : le code scanné part dans leur formulaire ===== -->
    <section v-if="demandes.length" class="bloc demandes">
      <h4 class="section">📱 Le poste attend un code</h4>
      <div v-for="d in demandes" :key="d.id" class="demande">
        <div>
          <strong>{{ d.libelle }}</strong>
          <small>
            Saisi sur le poste par {{ d.auteur }}<template v-if="d.continu"> · scannez les boîtes à la suite</template><template v-if="d.recus"> · {{ d.recus }} code(s) déjà envoyé(s)</template>
          </small>
        </div>
        <button @click="ouvrirCameraPour(d)">📷 Scanner</button>
      </div>
      <p v-if="envoiPoste" class="envoye">✓ Code <strong class="code">{{ envoiPoste.code }}</strong> envoyé au poste ({{ envoiPoste.libelle }}).</p>
    </section>

    <section class="bloc zone-scan">
      <button class="bouton-scanner" @click="ouvrirCamera()">📷 Scanner des boîtes</button>
      <ChampCodeBarre placeholder="… ou saisir le code-barres" @code="traiter" />

      <!-- ===== Résultat du dernier code ===== -->
      <div v-if="resultat" class="resultat" :class="resultat.produit ? 'connu' : 'inconnu'">
        <template v-if="resultat.produit">
          <div class="resultat-titre">✓ <span class="code">{{ resultat.code }}</span></div>
          <strong class="nom">{{ resultat.produit.designation }}</strong>
          <div class="details">
            <span class="code">{{ resultat.produit.code }}</span>
            <span v-if="resultat.produit.forme">{{ resultat.produit.forme.libelle }}</span>
            <template v-if="voitStock">
              <EtatBadge :etat="resultat.produit.etatStock" />
              <span>Stock : <strong>{{ quantite(resultat.produit.stockDisponible ?? 0, resultat.produit.plaquesParBoite) }}</strong></span>
              <span>Prix : <strong>{{ montant(resultat.produit.prixVenteBoite) }}</strong></span>
            </template>
          </div>
          <router-link class="bouton-lien" :to="{ name: 'produit', params: { id: resultat.produit.id } }">Voir la fiche →</router-link>
        </template>

        <template v-else>
          <div class="resultat-titre">✗ Code <span class="code">{{ resultat.code }}</span> inconnu</div>
          <template v-if="peutModifier">
            <label>Rattacher ce code à un médicament existant</label>
            <div class="rattacher">
              <ListeDeroulante
                v-model="choix"
                :options="medicamentsActifs"
                :champ-libelle="(m) => `${m.code} — ${m.designation}`"
                placeholder="Tapez le nom du médicament…"
              />
              <button :disabled="!choix || envoi" @click="rattacher(choix, resultat.code)">Rattacher</button>
            </div>
            <router-link class="btn bouton-secondaire" :to="{ name: 'parametres', query: { onglet: 'medicaments', codeBarre: resultat.code } }">
              + Créer un nouveau médicament avec ce code
            </router-link>
          </template>
          <p v-else class="aide">Demandez à un responsable de rattacher ce code au médicament.</p>
        </template>
      </div>

      <!-- ===== Codes scannés pendant cette séance ===== -->
      <div v-if="historique.length" class="historique">
        <h4 class="section">Codes scannés</h4>
        <ul>
          <li v-for="h in historique" :key="h.quand">
            <span class="code">{{ h.code }}</span>
            <span :class="h.produit ? 'ok' : 'ko'">{{ h.produit ? h.produit.designation : 'inconnu' }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ===== Médicaments sans code-barres (pour équiper le stock) ===== -->
    <section v-if="peutModifier" class="bloc">
      <div class="barre-outils">
        <h4 class="section titre-liste">Médicaments sans code-barres ({{ sansCode.length }})</h4>
        <span class="espace"></span>
        <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher…" />
      </div>
      <ul class="sans-code">
        <li v-for="m in sansCodeAffiches.slice(0, 50)" :key="m.id">
          <div>
            <strong>{{ m.designation }}</strong>
            <div class="code detail">{{ m.code }}</div>
          </div>
          <button class="bouton-secondaire" @click="ouvrirCamera(m)">📷 Scanner sa boîte</button>
        </li>
      </ul>
      <p v-if="!sansCode.length" class="tableau-vide">✓ Tous les médicaments actifs ont un code-barres.</p>
      <p v-else-if="sansCodeAffiches.length > 50" class="aide">50 premiers affichés : utilisez la recherche.</p>
    </section>

    <ScannerCamera
      v-if="camera"
      :continu="!cible && (!demande || demande.continu)"
      :titre="demande ? `Pour le poste : ${demande.libelle}` : cible ? `Boîte de ${cible.designation}` : 'Scanner des boîtes'"
      @lu="lu"
      @fermer="fermerCamera"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import EnteteModule from '@/components/EnteteModule.vue'
import ChampCodeBarre from '@/components/ChampCodeBarre.vue'
import ScannerCamera, { prechargerLecteur } from '@/components/ScannerCamera.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import EtatBadge from '@/components/EtatBadge.vue'
import { bip, codeValide } from '@/utils/codeBarre'
import { montant, quantite } from '@/utils/format'
import api from '@/services/api'

const store = useStore()
const peutModifier = computed(() => store.getters['auth/peutModifier']('produits'))
const voitStock = computed(() => store.getters['auth/voitPrixVente'])

const medicaments = computed(() => store.state.referentiel.medicaments)
const medicamentsActifs = computed(() => medicaments.value.filter((m) => m.actif))
const sansCode = computed(() => medicamentsActifs.value.filter((m) => !m.codesBarres?.length))
const recherche = ref('')
const sansCodeAffiches = computed(() => {
  const t = recherche.value.toLowerCase()
  return sansCode.value.filter((m) => !t || [m.code, m.designation].some((v) => (v || '').toLowerCase().includes(t)))
})

const resultat = ref(null) // { code, produit | null }
const historique = ref([])
const choix = ref(null)
const camera = ref(false)
const cible = ref(null) // médicament choisi avant de scanner sa boîte
const envoi = ref(false)

const charger = () => store.dispatch('referentiel/charger', { liste: 'medicaments' }).catch((e) => store.dispatch('notifications/erreurApi', e))
onMounted(charger)

function ouvrirCamera(medicament = null) {
  cible.value = medicament
  demande.value = null
  camera.value = true
}
function fermerCamera() {
  camera.value = false
  cible.value = null
  demande.value = null
}

// ---------------------------------------------------------------------------
// DEMANDES DES POSTES : un PC attend le code du médicament qu'il saisit
// ---------------------------------------------------------------------------
const demandes = ref([])
const demande = ref(null) // demande pour laquelle la caméra est ouverte
const envoiPoste = ref(null)
let minuterieDemandes = null

async function chargerDemandes() {
  try {
    demandes.value = (await api.get('/scan-distant')).data
  } catch {
    demandes.value = []
  }
}
onMounted(() => {
  // Lecteur de secours (iPhone) préparé dès l'ouverture : la caméra démarre plus vite
  if (!('BarcodeDetector' in window)) prechargerLecteur().catch(() => {})
  chargerDemandes()
  minuterieDemandes = setInterval(() => {
    if (document.visibilityState === 'visible') chargerDemandes()
  }, 2000)
})
onBeforeUnmount(() => clearInterval(minuterieDemandes))

function ouvrirCameraPour(d) {
  cible.value = null
  demande.value = d
  camera.value = true
}

async function envoyerAuPoste(d, code) {
  try {
    await api.post(`/scan-distant/${d.id}/codes`, { code })
    bip()
    envoiPoste.value = { code, libelle: d.libelle }
    chargerDemandes()
  } catch (erreur) {
    bip(true)
    store.dispatch('notifications/erreurApi', erreur)
    chargerDemandes()
  }
}

/** Code lu par la caméra : rattaché au médicament choisi, ou recherché. */
async function lu(code) {
  if (demande.value) {
    const d = demande.value
    // Réception : la caméra reste ouverte pour les boîtes suivantes
    if (!d.continu) fermerCamera()
    if (!codeValide(code)) {
      bip(true)
      return store.dispatch('notifications/erreur', `Code-barres invalide : ${code}`)
    }
    await envoyerAuPoste(d, code)
    return
  }
  if (cible.value) {
    const m = cible.value
    fermerCamera()
    await rattacher(m.id, code)
    return
  }
  const connu = await traiter(code)
  // Code inconnu : on ferme la caméra pour pouvoir le rattacher
  if (!connu) camera.value = false
}

/** Cherche le médicament d'un code (liste chargée, sinon serveur). Renvoie true s'il est connu. */
async function traiter(code) {
  if (!codeValide(code)) {
    bip(true)
    store.dispatch('notifications/erreur', `Code-barres invalide : ${code}`)
    return false
  }
  let produit = medicaments.value.find((m) => m.codesBarres?.some((c) => c.code === code)) ?? null
  if (!produit) {
    try {
      produit = (await api.get(`/produits/code-barre/${encodeURIComponent(code)}`)).data.produit
    } catch {
      produit = null
    }
  }
  if (!produit) bip(true)
  choix.value = null
  resultat.value = { code, produit }
  historique.value.unshift({ code, produit, quand: Date.now() })
  historique.value = historique.value.slice(0, 20)
  return !!produit
}

async function rattacher(produitId, code) {
  if (!codeValide(code)) {
    bip(true)
    return store.dispatch('notifications/erreur', `Code-barres invalide : ${code}`)
  }
  envoi.value = true
  try {
    await api.post(`/produits/${produitId}/codes-barres`, { code })
    await charger()
    const produit = medicaments.value.find((m) => m.id === produitId)
    bip()
    store.dispatch('notifications/succes', `Code ${code} rattaché à « ${produit?.designation} ».`)
    resultat.value = { code, produit }
    historique.value.unshift({ code, produit, quand: Date.now() })
  } catch (erreur) {
    bip(true)
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    envoi.value = false
  }
}
</script>

<style scoped>
.page-codes { display: flex; flex-direction: column; gap: 1.25rem; }
.zone-scan { display: flex; flex-direction: column; gap: 0.9rem; }
.bouton-scanner { padding: 1rem; font-size: 1.1rem; border-radius: 14px; }
.resultat {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border-left: 5px solid;
}
.resultat.connu { border-color: #16a34a; background: #f0fdf4; }
.resultat.inconnu { border-color: var(--danger); background: #fef2f2; }
.resultat-titre { font-weight: 700; }
.resultat .nom { font-size: 1.15rem; color: var(--texte-sur-fond); }
.details { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 1rem; font-size: 0.9rem; color: var(--muted); }
.rattacher { display: flex; gap: 0.5rem; align-items: center; }
.rattacher > :first-child { flex: 1; min-width: 0; }
.historique ul, .sans-code { list-style: none; margin: 0; padding: 0; }
.historique li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.35rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
.historique .ok { color: #15803d; }
.historique .ko { color: var(--danger); }
.titre-liste { margin: 0; border: none; }
.sans-code li { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid var(--border); }
.detail { font-size: 0.78rem; color: var(--muted); }
@media (max-width: 520px) {
  .rattacher { flex-direction: column; align-items: stretch; }
}
.demandes { border: 2px solid var(--primary); }
.demandes .section { margin-top: 0; }
.demande {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
}
.demande small { display: block; color: var(--muted); }
.envoye { margin: 0.6rem 0 0; color: #15803d; }
</style>
