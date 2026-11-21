<!--
  =============================================================================
  FENÊTRE D'UN BULLETIN DE PAIE
  =============================================================================
  - BROUILLON (droit MODIFIER) : salaire de base, primes et retenues (libellé +
    montant), observation ; le net à payer se calcule en direct.
  - Droit VALIDER : « Valider » (brouillon), « Remettre en brouillon » ou
    « Enregistrer le paiement » (date + mode) pour un bulletin validé.
  - « Bulletin PDF » (droit IMPRIMER).
  Propriété : bulletin ; événements : @fermer, @modifie (bulletin mis à jour)
  =============================================================================
-->
<template>
  <FenetreModale :titre="`Bulletin ${bulletin.numero} — ${libelleMois(bulletin.mois)}`" large @fermer="emit('fermer')">
    <div class="entete-bulletin">
      <Avatar :photo="null" :nom="bulletin.personnel.nom" :prenoms="bulletin.personnel.prenoms" :taille="46" />
      <div>
        <strong>{{ bulletin.personnel.prenoms }} {{ bulletin.personnel.nom }}</strong>
        <small>{{ [bulletin.personnel.matricule, bulletin.personnel.fonction?.libelle].filter(Boolean).join(' · ') }}</small>
      </div>
      <span class="badge" :class="STATUTS_BULLETIN[bulletin.statut].badge">{{ STATUTS_BULLETIN[bulletin.statut].libelle }}</span>
    </div>

    <form id="form-bulletin" class="corps" @submit.prevent="enregistrer">
      <div class="ligne-base">
        <label>Salaire de base</label>
        <ChampMontant v-if="modifiable" v-model="saisie.salaireBase" />
        <strong v-else>{{ montant(bulletin.salaireBase) }}</strong>
      </div>

      <table class="tableau lignes">
        <thead>
          <tr>
            <th>Type</th>
            <th>Libellé</th>
            <th class="nombre">Montant</th>
            <th v-if="modifiable" class="actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(l, i) in saisie.lignes" :key="i">
            <td>
              <select v-if="modifiable" v-model="l.type">
                <option value="PRIME">Prime / indemnité</option>
                <option value="RETENUE">Retenue</option>
              </select>
              <span v-else class="badge" :class="l.type === 'PRIME' ? 'badge-vert' : 'badge-orange'">
                {{ l.type === 'PRIME' ? 'Prime' : 'Retenue' }}
              </span>
            </td>
            <td>
              <input v-if="modifiable" v-model.trim="l.libelle" class="maj" required maxlength="100" list="libelles-paie" placeholder="ex. PRIME DE TRANSPORT" />
              <span v-else>{{ l.libelle }}</span>
            </td>
            <td class="nombre">
              <ChampMontant v-if="modifiable" v-model="l.montant" />
              <span v-else :class="{ retenue: l.type === 'RETENUE' }">{{ l.type === 'RETENUE' ? '− ' : '' }}{{ montant(l.montant) }}</span>
            </td>
            <td v-if="modifiable" class="actions">
              <button type="button" class="bouton-lien danger" @click="saisie.lignes.splice(i, 1)">Retirer</button>
            </td>
          </tr>
          <tr v-if="!saisie.lignes.length">
            <td :colspan="modifiable ? 4 : 3" class="tableau-vide">Aucune prime ni retenue.</td>
          </tr>
        </tbody>
      </table>
      <datalist id="libelles-paie">
        <option v-for="l in LIBELLES" :key="l" :value="l" />
      </datalist>
      <div v-if="modifiable" class="ajouts">
        <button type="button" class="bouton-secondaire" @click="ajouter('PRIME')">+ Prime</button>
        <button type="button" class="bouton-secondaire" @click="ajouter('RETENUE')">+ Retenue</button>
      </div>

      <div class="totaux">
        <span>Base <strong>{{ montant(totaux.base) }}</strong></span>
        <span>+ Primes <strong>{{ montant(totaux.primes) }}</strong></span>
        <span>− Retenues <strong>{{ montant(totaux.retenues) }}</strong></span>
        <span class="net" :class="{ negatif: totaux.net < 0 }">Net à payer <strong>{{ montant(totaux.net) }}</strong></span>
      </div>

      <div>
        <label>Observation</label>
        <input v-if="modifiable" v-model.trim="saisie.observation" class="maj" maxlength="255" />
        <p v-else class="observation">{{ bulletin.observation || '—' }}</p>
      </div>

      <!-- Paiement -->
      <div v-if="bulletin.statut === 'PAYE'" class="paiement-fait">
        Payé le <strong>{{ date(bulletin.datePaiement) }}</strong> —
        {{ MODES_PAIEMENT.find((m) => m.id === bulletin.modePaiement)?.libelle }}
      </div>
      <div v-else-if="bulletin.statut === 'VALIDE' && peutValider" class="paiement">
        <h4 class="section">Paiement</h4>
        <div class="grille-paiement">
          <div>
            <label class="obligatoire">Date de paiement</label>
            <ChampDate v-model="paiement.datePaiement" />
          </div>
          <div>
            <label class="obligatoire">Mode de paiement</label>
            <ListeDeroulante v-model="paiement.modePaiement" :options="MODES_PAIEMENT" obligatoire :effacable="false" />
          </div>
        </div>
      </div>
    </form>

    <template #pied>
      <button v-si-imprimer="'paie'" class="bouton-secondaire" @click="imprimerBulletin(bulletin)">Bulletin PDF</button>
      <span class="espace"></span>
      <button class="bouton-secondaire" @click="emit('fermer')">Fermer</button>
      <template v-if="bulletin.statut === 'BROUILLON'">
        <button v-if="modifiable" type="submit" form="form-bulletin" :disabled="envoi">Enregistrer</button>
        <button v-if="peutValider" class="bouton-valider" :disabled="envoi" @click="valider">Valider</button>
      </template>
      <template v-else-if="bulletin.statut === 'VALIDE' && peutValider">
        <button class="bouton-secondaire" :disabled="envoi" @click="action(remettreEnBrouillon, 'Bulletin remis en brouillon.')">
          Remettre en brouillon
        </button>
        <button class="bouton-valider" :disabled="envoi" @click="payer">Enregistrer le paiement</button>
      </template>
    </template>
  </FenetreModale>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import ChampMontant from '@/components/ChampMontant.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import Avatar from '@/components/Avatar.vue'
import { aujourdhui, date, montant } from '@/utils/format'
import { imprimerBulletin } from '@/utils/bulletinPdf'
import {
  MODES_PAIEMENT,
  STATUTS_BULLETIN,
  libelleMois,
  modifierBulletin,
  payerBulletin,
  remettreEnBrouillon,
  validerBulletin,
} from '@/api/paie'

const props = defineProps({ bulletin: { type: Object, required: true } })
const emit = defineEmits(['fermer', 'modifie'])
const store = useStore()

/** Libellés proposés (on peut en saisir d'autres). */
const LIBELLES = [
  'PRIME DE TRANSPORT',
  'PRIME DE RENDEMENT',
  'HEURES SUPPLÉMENTAIRES',
  'INDEMNITÉ DE LOGEMENT',
  'AVANCE SUR SALAIRE',
  'ABSENCE',
  'REMBOURSEMENT DE PRÊT',
]

const peutModifier = computed(() => store.getters['auth/peutModifier']('paie'))
const peutValider = computed(() => store.getters['auth/peutValider']('paie'))
const modifiable = computed(() => props.bulletin.statut === 'BROUILLON' && peutModifier.value)

const copie = (b) => ({
  salaireBase: Number(b.salaireBase),
  lignes: b.lignes.map((l) => ({ type: l.type, libelle: l.libelle, montant: Number(l.montant) })),
  observation: b.observation || '',
})
const saisie = ref(copie(props.bulletin))
const paiement = ref({ datePaiement: aujourdhui(), modePaiement: 'ESPECES' })
const envoi = ref(false)

const totaux = computed(() => {
  const somme = (type) => saisie.value.lignes.filter((l) => l.type === type).reduce((s, l) => s + Number(l.montant || 0), 0)
  const base = Number(saisie.value.salaireBase || 0)
  const primes = somme('PRIME')
  const retenues = somme('RETENUE')
  return { base, primes, retenues, net: base + primes - retenues }
})

function ajouter(type) {
  saisie.value.lignes.push({ type, libelle: '', montant: 0 })
}

/** Appelle l'API, met à jour la fenêtre et prévient la liste. */
async function action(appel, message) {
  envoi.value = true
  try {
    const b = await appel(props.bulletin.id)
    saisie.value = copie(b)
    emit('modifie', b)
    store.dispatch('notifications/succes', message)
    return b
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    envoi.value = false
  }
}

function enregistrer() {
  if (totaux.value.net < 0) return store.dispatch('notifications/erreur', 'Le net à payer ne peut pas être négatif.')
  const donnees = {
    salaireBase: Number(saisie.value.salaireBase || 0),
    lignes: saisie.value.lignes.map((l) => ({ ...l, montant: Number(l.montant || 0) })),
    observation: saisie.value.observation,
  }
  return action((id) => modifierBulletin(id, donnees), 'Bulletin enregistré.')
}

async function valider() {
  // Les modifications en cours sont enregistrées avant la validation
  if (modifiable.value && !(await enregistrer())) return
  await action(validerBulletin, 'Bulletin validé.')
}

function payer() {
  if (!paiement.value.datePaiement) return store.dispatch('notifications/erreur', 'Indiquez la date de paiement.')
  return action((id) => payerBulletin(id, paiement.value), 'Paiement enregistré.')
}
</script>

<style scoped>
.entete-bulletin {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--primary-light);
}
.entete-bulletin small { display: block; color: var(--muted); }
.entete-bulletin .badge { margin-left: auto; }
.corps { display: flex; flex-direction: column; gap: 0.9rem; }
.ligne-base { display: flex; align-items: center; gap: 1rem; }
.ligne-base label { margin: 0; font-weight: 600; }
.ligne-base :deep(input) { max-width: 220px; }
.lignes select { width: 100%; }
.lignes :deep(input) { width: 100%; }
.retenue { color: #b35c00; }
.ajouts { display: flex; gap: 0.5rem; }
.totaux {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.2rem;
  align-items: baseline;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--fond-pale);
  font-size: 0.9rem;
}
.totaux .net { margin-left: auto; font-size: 1.05rem; color: var(--primary-dark); }
.totaux .net.negatif { color: var(--danger); }
.observation { margin: 0.2rem 0 0; color: var(--muted); }
.paiement-fait { padding: 0.7rem 1rem; border-radius: 10px; background: #e8f5e9; color: #1b5e20; }
.grille-paiement { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.espace { flex: 1; }
.bouton-valider { background: #16a34a; }
.bouton-valider:hover:not(:disabled) { background: #15803d; }
</style>
