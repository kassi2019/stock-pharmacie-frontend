<!--
  Fenêtre « Retrait d'un lot » (§ 10.2), utilisée par les modules Retraits et Péremptions.

  Propriétés :
    - lot   : lot déjà choisi (depuis la liste des péremptions) ; sinon une liste
              de tous les lots en stock est proposée ;
    - motif : motif proposé par défaut (ex. « PÉRIMÉ »).
  Événements : @fermer, @enregistre(retrait).

  Règles : motif obligatoire (liste des Paramètres généraux) ; « AUTRE » demande
  une précision ; la quantité ne peut pas dépasser le stock du lot.
-->
<template>
  <FenetreModale titre="Retrait d'un lot" large @fermer="emit('fermer')">
    <form id="form-retrait" class="grille-formulaire" @submit.prevent="enregistrer">
      <div class="pleine-largeur">
        <label class="obligatoire">Lot</label>
        <ListeDeroulante
          v-model="f.lotId"
          :options="lots"
          :champ-libelle="libelleLot"
          :effacable="false"
          :desactive="!!lot"
          placeholder="Tapez le médicament ou le n° de lot…"
        />
      </div>

      <div v-if="lotChoisi" class="pleine-largeur infos-lot">
        <span><small>Médicament</small><strong>{{ lotChoisi.produit.designation }}</strong></span>
        <span><small>N° de lot</small><strong class="code">{{ lotChoisi.numeroLot }}</strong></span>
        <span>
          <small>Péremption</small>
          <strong :class="{ perime: estPerime }">{{ date(lotChoisi.datePeremption) }}{{ estPerime ? ' (périmé)' : '' }}</strong>
        </span>
        <span><small>En stock</small><strong>{{ quantite(lotChoisi.quantiteRestante, plaquesParBoite) }}</strong></span>
      </div>

      <div>
        <label class="obligatoire">Quantité à retirer</label>
        <input v-model="f.quantite" type="number" min="1" :max="maximum" step="1" required />
        <small class="aide">
          Maximum : {{ maximum }} {{ libelleMaximum }}.
          <button v-if="lotChoisi" type="button" class="bouton-lien" @click="f.quantite = maximum">Tout le lot</button>
        </small>
      </div>
      <div v-if="plaquesParBoite > 1">
        <label>Unité</label>
        <ListeDeroulante v-model="f.unite" :options="unites" :effacable="false" />
      </div>
      <div>
        <label class="obligatoire">Motif</label>
        <ListeDeroulante v-model="f.motif" :options="motifs" :effacable="false" placeholder="— Choisir —" />
      </div>
      <div class="pleine-largeur">
        <label :class="{ obligatoire: estAutre }">Précision</label>
        <input
          v-model.trim="f.precision"
          class="maj"
          maxlength="255"
          :required="estAutre"
          :placeholder="estAutre ? 'Obligatoire pour le motif AUTRE' : 'ex. n° du bon de retour, circonstance de la casse…'"
        />
      </div>
      <p v-if="lotChoisi && voitValeur" class="pleine-largeur aide valeur">
        Valeur retirée (prix d'achat) : <strong>{{ montant(valeur) }}</strong>
      </p>
    </form>

    <template #pied>
      <button class="bouton-secondaire" @click="emit('fermer')">Fermer</button>
      <button type="submit" form="form-retrait" class="bouton-danger" :disabled="enregistrement || !f.lotId">
        {{ enregistrement ? 'Enregistrement…' : 'Retirer du stock' }}
      </button>
    </template>
  </FenetreModale>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import { PRIX_ACHAT } from '@/utils/roles'
import { aujourdhui, date, montant, quantite } from '@/utils/format'

const props = defineProps({
  lot: { type: Object, default: null },
  motif: { type: String, default: '' },
})
const emit = defineEmits(['fermer', 'enregistre'])
const store = useStore()

const f = ref({ lotId: props.lot?.id ?? null, quantite: '', unite: 'PLAQUE', motif: props.motif || null, precision: '' })
const enregistrement = ref(false)

const motifs = computed(() => store.state.sorties.motifs)
/** Lot imposé (péremptions) ou liste de tous les lots en stock. */
const lots = computed(() => (props.lot ? [props.lot] : store.state.sorties.lotsRetrait))
const lotChoisi = computed(() => lots.value.find((l) => l.id === f.value.lotId) ?? null)
const plaquesParBoite = computed(() => lotChoisi.value?.produit?.plaquesParBoite || 1)
const uniteLot = computed(() => lotChoisi.value?.produit?.uniteVente?.libelle ?? 'BOÎTE')
const unites = computed(() => [
  { id: 'BOITE', libelle: uniteLot.value },
  { id: 'PLAQUE', libelle: 'PLAQUE' },
])
/** Unité de la quantité maximale affichée sous le champ. */
const libelleMaximum = computed(() =>
  plaquesParBoite.value > 1 ? (f.value.unite === 'BOITE' ? uniteLot.value.toLowerCase() : 'plaque(s)') : 'unité(s)',
)
const estPerime = computed(() => !!lotChoisi.value && String(lotChoisi.value.datePeremption).slice(0, 10) < aujourdhui())
const estAutre = computed(() => f.value.motif === 'AUTRE')
const voitValeur = computed(() => store.getters['auth/peut'](PRIX_ACHAT))

/** Quantité maximale dans l'unité choisie. */
const maximum = computed(() => {
  const stock = lotChoisi.value?.quantiteRestante ?? 0
  return f.value.unite === 'BOITE' && plaquesParBoite.value > 1 ? Math.floor(stock / plaquesParBoite.value) : stock
})
const valeur = computed(() => {
  const plaques = (Number(f.value.quantite) || 0) * (f.value.unite === 'BOITE' ? plaquesParBoite.value : 1)
  return plaques * Number(lotChoisi.value?.prixAchatPlaque ?? 0)
})

const libelleLot = (l) =>
  `${l.produit.designation} — lot ${l.numeroLot} — péremption ${date(l.datePeremption)} — ${quantite(l.quantiteRestante, l.produit.plaquesParBoite)} en stock`

// Produit sans plaques : la quantité est saisie dans l'unité du stock
watch(lotChoisi, () => {
  f.value.unite = 'PLAQUE'
  f.value.quantite = ''
})

async function enregistrer() {
  enregistrement.value = true
  try {
    const retrait = await store.dispatch('sorties/creerRetrait', {
      lotId: f.value.lotId,
      quantite: Number(f.value.quantite),
      unite: plaquesParBoite.value > 1 ? f.value.unite : 'PLAQUE',
      motif: f.value.motif,
      precision: f.value.precision || null,
    })
    store.dispatch('notifications/succes', `Retrait ${retrait.numero} enregistré.`)
    emit('enregistre', retrait)
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

onMounted(() => {
  store.dispatch('sorties/chargerMotifs').catch((e) => store.dispatch('notifications/erreurApi', e))
  if (!props.lot) store.dispatch('sorties/chargerLotsRetrait').catch((e) => store.dispatch('notifications/erreurApi', e))
})
</script>

<style scoped>
.infos-lot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 2rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--fond-pale);
}
.infos-lot span {
  display: flex;
  flex-direction: column;
}
.infos-lot small {
  font-size: 0.75rem;
  color: var(--muted);
}
.perime {
  color: var(--danger);
}
.aide {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: var(--muted);
}
.valeur {
  font-size: 0.9rem;
}
</style>
