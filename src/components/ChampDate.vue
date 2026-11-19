<!--
  =============================================================================
  CHAMP DATE (format JJ/MM/AAAA + calendrier Année → Mois → Jour)
  =============================================================================
  Remplace les <input type="date"> de l'application (composant global).
  La valeur échangée reste au format ISO « AAAA-MM-JJ » (comme l'API), seul
  l'affichage est en JJ/MM/AAAA.

      <ChampDate v-model="filtres.du" @change="charger" />
      <ChampDate v-model="lot.datePeremption" :min="aujourdhui()" required />

  - On peut taper la date au clavier (18/11/2026 ou 18112026) ou cliquer
    sur l'icône calendrier.
  - min / max : dates ISO hors limites grisées.
  - Les autres attributs (class, title, required, disabled…) vont sur le champ.
  - @change(valeur) : émis quand la date change (choix, saisie ou effacement).
  =============================================================================
-->
<template>
  <span class="champ-date-perso" ref="racine">
    <input
      v-bind="$attrs"
      ref="champ"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="jj/mm/aaaa"
      maxlength="10"
      :value="texte"
      @input="texte = $event.target.value"
      @blur="validerSaisie"
      @keydown.enter.prevent="validerSaisie"
      @keydown.esc="fermer"
      @keydown.down.prevent="ouvrir"
    />
    <button
      type="button"
      class="champ-date-icone"
      tabindex="-1"
      title="Ouvrir le calendrier"
      :disabled="desactive"
      @mousedown.prevent
      @click="basculer"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="8" cy="14" r="1" fill="currentColor" /><circle cx="12" cy="14" r="1" fill="currentColor" />
        <circle cx="16" cy="14" r="1" fill="currentColor" /><circle cx="8" cy="17.5" r="1" fill="currentColor" />
        <circle cx="12" cy="17.5" r="1" fill="currentColor" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="ouvert" ref="panneau" class="calendrier-perso" :style="position" @mousedown.prevent>
        <!-- ANNÉE -->
        <div class="cal-titre">Année</div>
        <div class="cal-grille cal-4">
          <button
            v-for="d in decennies"
            :key="d"
            type="button"
            class="cal-case"
            :class="{ choisi: d === decennieVue }"
            @click="decennieVue = d"
          >
            {{ d }}–{{ String(d + 9).slice(-2) }}
          </button>
        </div>
        <div class="cal-grille cal-5">
          <button
            v-for="a in anneesDecennie"
            :key="a"
            type="button"
            class="cal-case"
            :class="{ actif: a === anneeVue }"
            :disabled="anneeHorsLimites(a)"
            @click="anneeVue = a"
          >
            {{ a }}
          </button>
        </div>

        <hr />
        <!-- MOIS -->
        <div class="cal-titre">Mois</div>
        <div class="cal-grille cal-6">
          <button
            v-for="(m, i) in MOIS_COURTS"
            :key="m"
            type="button"
            class="cal-case"
            :class="{ actif: i === moisVue }"
            :disabled="moisHorsLimites(anneeVue, i)"
            @click="moisVue = i"
          >
            {{ m }}
          </button>
        </div>

        <hr />
        <!-- JOUR -->
        <div class="cal-titre">Jour <span class="cal-sous-titre">{{ MOIS_LONGS[moisVue] }} {{ anneeVue }}</span></div>
        <div class="cal-grille cal-7 cal-entete">
          <span v-for="j in JOURS" :key="j">{{ j }}</span>
        </div>
        <div class="cal-grille cal-7">
          <span v-for="n in decalage" :key="'v' + n"></span>
          <button
            v-for="j in nbJours"
            :key="j"
            type="button"
            class="cal-case cal-jour"
            :class="{ actif: isoDe(anneeVue, moisVue, j) === modelValue, aujourdhui: isoDe(anneeVue, moisVue, j) === isoAujourdhui }"
            :disabled="horsLimites(isoDe(anneeVue, moisVue, j))"
            @click="choisir(isoDe(anneeVue, moisVue, j))"
          >
            {{ j }}
          </button>
        </div>

        <div class="cal-pied">
          <button type="button" class="cal-lien" :disabled="horsLimites(isoAujourdhui)" @click="choisir(isoAujourdhui)">Aujourd'hui</button>
          <button type="button" class="cal-lien" @click="choisir('')">Effacer</button>
          <button type="button" class="cal-lien gris" @click="fermer">Fermer</button>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'change'])
const attrs = useAttrs()

const MOIS_COURTS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const deux = (n) => String(n).padStart(2, '0')
const isoDe = (a, m, j) => `${a}-${deux(m + 1)}-${deux(j)}`
const isoAujourdhui = (() => {
  const d = new Date()
  return isoDe(d.getFullYear(), d.getMonth(), d.getDate())
})()

// La valeur peut arriver en « AAAA-MM-JJ » ou « AAAA-MM-JJT… » : on garde la date
const isoPropre = computed(() => (props.modelValue ? String(props.modelValue).slice(0, 10) : ''))
const versTexte = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

const texte = ref(versTexte(isoPropre.value))
watch(isoPropre, (v) => (texte.value = versTexte(v)))

const desactive = computed(() => attrs.disabled !== undefined && attrs.disabled !== false)

// ─── Limites min / max ───
const horsLimites = (iso) => (props.min && iso < props.min.slice(0, 10)) || (props.max && iso > props.max.slice(0, 10))
const anneeHorsLimites = (a) => (props.min && `${a}-12-31` < props.min.slice(0, 10)) || (props.max && `${a}-01-01` > props.max.slice(0, 10))
const moisHorsLimites = (a, m) => (props.min && isoDe(a, m, new Date(a, m + 1, 0).getDate()) < props.min.slice(0, 10)) || (props.max && isoDe(a, m, 1) > props.max.slice(0, 10))

// ─── Vue affichée dans le calendrier ───
const anneeVue = ref(new Date().getFullYear())
const moisVue = ref(new Date().getMonth())
const decennieVue = ref(Math.floor(anneeVue.value / 10) * 10)
watch(anneeVue, (a) => (decennieVue.value = Math.floor(a / 10) * 10))

const decennies = computed(() => [-10, 0, 10, 20].map((d) => decennieVue.value + d))
const anneesDecennie = computed(() => Array.from({ length: 10 }, (_, i) => decennieVue.value + i))
const nbJours = computed(() => new Date(anneeVue.value, moisVue.value + 1, 0).getDate())
// Semaine commençant le lundi
const decalage = computed(() => (new Date(anneeVue.value, moisVue.value, 1).getDay() + 6) % 7)

// ─── Ouverture / position ───
const ouvert = ref(false)
const racine = ref(null)
const champ = ref(null)
const panneau = ref(null)
const position = ref({})

function placer() {
  if (!racine.value) return
  const r = racine.value.getBoundingClientRect()
  const largeur = 340
  const hauteur = panneau.value ? panneau.value.offsetHeight : 560
  let gauche = Math.min(r.left, window.innerWidth - largeur - 8)
  let haut = r.bottom + 4
  if (haut + hauteur > window.innerHeight - 8 && r.top - hauteur - 4 > 8) haut = r.top - hauteur - 4
  position.value = { left: `${Math.max(8, gauche)}px`, top: `${Math.max(8, haut)}px` }
}

function ouvrir() {
  if (desactive.value || ouvert.value) return
  const iso = isoPropre.value || (props.max && isoAujourdhui > props.max ? props.max.slice(0, 10) : props.min && isoAujourdhui < props.min ? props.min.slice(0, 10) : isoAujourdhui)
  anneeVue.value = Number(iso.slice(0, 4))
  moisVue.value = Number(iso.slice(5, 7)) - 1
  decennieVue.value = Math.floor(anneeVue.value / 10) * 10
  ouvert.value = true
  placer()
  nextTick(placer)
  document.addEventListener('mousedown', clicExterieur, true)
  window.addEventListener('resize', placer)
  window.addEventListener('scroll', placer, true)
}

function fermer() {
  ouvert.value = false
  document.removeEventListener('mousedown', clicExterieur, true)
  window.removeEventListener('resize', placer)
  window.removeEventListener('scroll', placer, true)
}

const basculer = () => (ouvert.value ? fermer() : (ouvrir(), champ.value?.focus()))

function clicExterieur(e) {
  if (racine.value?.contains(e.target) || panneau.value?.contains(e.target)) return
  fermer()
}

onBeforeUnmount(fermer)

// ─── Choix d'une valeur ───
function emettre(iso) {
  texte.value = versTexte(iso)
  if (iso === isoPropre.value) return
  emit('update:modelValue', iso)
  emit('change', iso)
}

function choisir(iso) {
  emettre(iso)
  fermer()
}

// Saisie clavier : « 18/11/2026 », « 18-11-2026 », « 18.11.26 » ou « 18112026 »
function validerSaisie() {
  const t = texte.value.trim()
  if (!t) return emettre('')
  let m = t.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})$/) || t.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (!m) return (texte.value = versTexte(isoPropre.value))
  const j = Number(m[1])
  const mo = Number(m[2])
  const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  const d = new Date(a, mo - 1, j)
  if (d.getFullYear() !== a || d.getMonth() !== mo - 1 || d.getDate() !== j) return (texte.value = versTexte(isoPropre.value))
  const iso = isoDe(a, mo - 1, j)
  if (horsLimites(iso)) return (texte.value = versTexte(isoPropre.value))
  emettre(iso)
}
</script>

<style>
.champ-date-perso {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
}
.champ-date-perso > input {
  width: 100%;
  padding-right: 2.2rem;
  font-variant-numeric: tabular-nums;
}
.barre-outils .champ-date-perso,
td .champ-date-perso {
  width: auto;
}
.barre-outils .champ-date-perso > input {
  width: 9.5rem;
}
.champ-date-perso .champ-date-icone {
  position: absolute;
  right: 0.35rem;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0.2rem;
  margin: 0;
  color: var(--primaire);
  cursor: pointer;
  box-shadow: none;
  min-height: 0;
}
.champ-date-perso .champ-date-icone:disabled {
  color: #b0bec5;
  cursor: not-allowed;
}

.calendrier-perso {
  position: fixed;
  z-index: 10000;
  width: 340px;
  padding: 0.75rem 0.85rem 0.6rem;
  background: #fff;
  border: 1px solid var(--primaire);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(1, 87, 155, 0.18);
  font-family: var(--police);
  font-size: 0.85rem;
  color: var(--texte);
  user-select: none;
}
.calendrier-perso hr {
  border: none;
  border-top: 1px solid var(--bord);
  margin: 0.6rem 0;
}
.calendrier-perso .cal-titre {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primaire-fonce);
  margin-bottom: 0.4rem;
}
.calendrier-perso .cal-sous-titre {
  margin-left: 0.6rem;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--gris);
}
.calendrier-perso .cal-grille {
  display: grid;
  gap: 0.3rem;
  margin-bottom: 0.3rem;
}
.calendrier-perso .cal-4 { grid-template-columns: repeat(4, 1fr); }
.calendrier-perso .cal-5 { grid-template-columns: repeat(5, 1fr); }
.calendrier-perso .cal-6 { grid-template-columns: repeat(6, 1fr); }
.calendrier-perso .cal-7 { grid-template-columns: repeat(7, 1fr); }
.calendrier-perso .cal-entete span {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--gris);
}
.calendrier-perso .cal-case {
  padding: 0.35rem 0;
  min-height: 0;
  background: #f7fbfd;
  border: 1px solid var(--bord);
  border-radius: 7px;
  color: var(--texte);
  font-size: 0.82rem;
  font-weight: 400;
  cursor: pointer;
  box-shadow: none;
  text-align: center;
}
.calendrier-perso .cal-case:hover:not(:disabled) {
  border-color: var(--primaire);
  background: var(--ciel-pale);
}
.calendrier-perso .cal-case.choisi {
  background: var(--ciel-pale);
  border-color: var(--primaire);
  color: var(--primaire-fonce);
  font-weight: 600;
}
.calendrier-perso .cal-case.actif {
  background: var(--primaire);
  border-color: var(--primaire);
  color: #fff;
  font-weight: 700;
}
.calendrier-perso .cal-case.aujourdhui:not(.actif) {
  border-color: var(--primaire);
  color: var(--primaire-fonce);
  font-weight: 600;
}
.calendrier-perso .cal-case:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.calendrier-perso .cal-pied {
  display: flex;
  justify-content: flex-end;
  gap: 0.9rem;
  margin-top: 0.5rem;
}
.calendrier-perso .cal-lien {
  background: none;
  border: none;
  padding: 0;
  min-height: 0;
  box-shadow: none;
  color: var(--primaire);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}
.calendrier-perso .cal-lien.gris { color: var(--gris); }
.calendrier-perso .cal-lien:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
