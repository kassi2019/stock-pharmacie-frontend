<!--
  =============================================================================
  ONGLET « PROFILS & DROITS » — même fonctionnement que le district
  =============================================================================
  Un profil = un code, un libellé, une description et des DROITS :
  pour chaque module (src/utils/modules.js), des cases indépendantes :
    - Voir     : ouvrir le module, consulter, rechercher ;
    - Imprimer : télécharger les PDF et Excel ;
    - Modifier : créer, modifier, importer… ;
    - Valider  : seulement Dispensation (annuler) et Inventaires (valider les comptages).
  Plus deux droits sur les données : prix de vente et quantités, prix d'achat.
  Cocher un droit coche aussi Voir ; décocher Voir décoche tout.

  Les comptes reçoivent les droits de leur profil (onglet Utilisateurs) ;
  un changement s'applique sans reconnexion.

  Règles (vérifiées aussi par le serveur) :
    - réservé à l'administrateur ;
    - le profil Administrateur a toujours tous les droits (non modifiables) ;
    - le code ne change pas après la création ;
    - un profil ne peut être supprimé que si aucun compte ne l'utilise.
  =============================================================================
-->
<template>
  <div>
    <div class="barre-outils">
      <input v-model="recherche" class="recherche" type="search" placeholder="Rechercher un profil…" />
      <span class="espace"></span>
      <ImportExportTableau
        titre="Profils et droits d'accès"
        nom-fichier="profils_droits"
        :colonnes-pdf="COLONNES_PDF"
        :lignes="lignesTriees"
      />
      <button @click="ouvrirFormulaire()">+ Nouveau profil</button>
    </div>

    <div class="tableau-conteneur">
      <table class="tableau">
        <thead>
          <tr>
            <ColonneTri v-model="tri" cle="code">Code</ColonneTri>
            <ColonneTri v-model="tri" cle="libelle">Profil</ColonneTri>
            <th>Modules accessibles</th>
            <ColonneTri v-model="tri" cle="comptes" class="nombre">Comptes</ColonneTri>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="chargement && !profils.length">
            <td colspan="5" class="tableau-vide">Chargement…</td>
          </tr>
          <tr v-for="profil in lignesPage" :key="profil.id">
            <td class="code">{{ profil.code }}</td>
            <td>
              <strong>{{ profil.libelle }}</strong>
              <div v-if="profil.description" class="detail">{{ profil.description }}</div>
            </td>
            <td>
              <span v-if="profil.code === 'ADMIN'" class="badge badge-rouge">Tous les modules, tous les droits</span>
              <template v-else>
                <span
                  v-for="module in modulesDuProfil(profil)"
                  :key="module.route"
                  class="puce-module"
                  :class="droitsDe(profil, module.route).length > 2 ? 'modif' : 'lecture'"
                  :title="droitsDe(profil, module.route).map((d) => LIBELLES_DROITS[d]).join(', ')"
                >
                  {{ module.court ?? module.titre }}
                  <small>{{ droitsDe(profil, module.route).map((d) => ICONES[d]).join(' ') }}</small>
                </span>
                <span v-if="modulesDuProfil(profil).length === 0" class="detail">Aucun module</span>
              </template>
            </td>
            <td class="nombre">
              <span class="badge" :class="profil.comptes ? 'badge-vert' : 'badge-gris'">{{ profil.comptes ?? 0 }}</span>
            </td>
            <td class="actions">
              <button class="bouton-lien" @click="ouvrirFormulaire(profil)">
                {{ profil.code === 'ADMIN' ? 'Modifier le libellé' : 'Modifier les droits' }}
              </button>
              <button
                v-if="profil.code !== 'ADMIN'"
                class="bouton-lien danger"
                :disabled="profil.comptes > 0"
                :title="profil.comptes > 0 ? 'Profil utilisé par des comptes' : ''"
                @click="supprimer(profil)"
              >
                Supprimer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:page="page" v-model:taille="taille" :total="profilsAffiches.length" />
    </div>

    <!-- ===================== FORMULAIRE DU PROFIL ET DE SES DROITS ===================== -->
    <FenetreModale
      v-if="formulaire"
      :titre="formulaire.id ? `Profil « ${formulaire.libelle || formulaire.code} »` : 'Nouveau profil'"
      large
      @fermer="formulaire = null"
    >
      <form id="form-profil" class="grille-formulaire" @submit.prevent="enregistrer">
        <h4 class="section pleine-largeur">Profil</h4>
        <div>
          <label class="obligatoire">Code</label>
          <input
            v-model.trim="formulaire.code"
            class="maj"
            required
            maxlength="20"
            pattern="[A-Z0-9_]+"
            title="MAJUSCULES, chiffres et _ (ex. PHARMACIEN)"
            placeholder="ex. PHARMACIEN"
            :disabled="!!formulaire.id"
            @input="formulaire.code = formulaire.code.toUpperCase()"
          />
          <small v-if="formulaire.id" class="aide">Le code ne se modifie pas.</small>
        </div>
        <div>
          <label class="obligatoire">Libellé</label>
          <input v-model.trim="formulaire.libelle" required maxlength="100" placeholder="ex. Pharmacien" />
        </div>
        <div class="pleine-largeur">
          <label>Description</label>
          <input v-model.trim="formulaire.description" maxlength="255" placeholder="ex. Gestion du stock et des entrées" />
        </div>

        <!-- ---------- Droits par module ---------- -->
        <div class="titre-avec-export pleine-largeur">
          <h4 class="section">Affectation des modules et droits</h4>
          <ImportExportTableau
            v-if="formulaire.code !== 'ADMIN'"
            :titre="`Droits du profil ${formulaire.libelle || formulaire.code || ''}`"
            :nom-fichier="`droits_${formulaire.code || 'profil'}`"
            :colonnes-pdf="COLONNES_DROITS"
            :lignes="TOUS"
          />
        </div>
        <p v-if="formulaire.code === 'ADMIN'" class="pleine-largeur info-lecture">
          L'administrateur a toujours tous les droits sur tous les modules, ainsi que les comptes
          utilisateurs, les profils, les paramètres généraux et les sauvegardes. Ses droits ne sont pas modifiables.
        </p>
        <div v-else class="pleine-largeur">
          <div class="raccourcis">
            <span>Pour tous les modules :</span>
            <button type="button" class="bouton-lien" @click="toutMettre([])">Aucun droit</button>
            <button type="button" class="bouton-lien" @click="toutMettre(['VOIR'])">Voir</button>
            <button type="button" class="bouton-lien" @click="toutMettre(['VOIR', 'IMPRIMER'])">Voir + imprimer</button>
            <button type="button" class="bouton-lien" @click="toutMettre(COLONNES)">Tous les droits</button>
          </div>

          <table class="tableau grille-droits">
            <thead>
              <tr>
                <th>Module</th>
                <th class="centre">Voir<br /><small>ouvrir, consulter</small></th>
                <th class="centre">Imprimer<br /><small>PDF, Excel</small></th>
                <th class="centre">Modifier<br /><small>créer, modifier</small></th>
                <th class="centre">Valider<br /><small>valider, annuler</small></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="groupe in GROUPES" :key="groupe.titre">
                <tr class="ligne-groupe"><td colspan="5">{{ groupe.titre }}</td></tr>
                <tr v-for="module in groupe.modules" :key="module.route">
                  <td>
                    <strong>{{ module.titre }}</strong>
                    <div class="detail">
                      {{ module.description }}
                      <template v-if="SENS_VALIDER[module.route]"> — Valider : {{ SENS_VALIDER[module.route] }}.</template>
                    </div>
                  </td>
                  <td v-for="droit in COLONNES" :key="droit" class="centre">
                    <input
                      v-if="module.droits.includes(droit)"
                      type="checkbox"
                      :checked="formulaire.droits[module.route].includes(droit)"
                      :title="LIBELLES_DROITS[droit]"
                      @change="changerDroit(module, droit, $event.target.checked)"
                    />
                    <span v-else class="sans-objet">—</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <p class="detail note">
            Les comptes utilisateurs, les profils, les paramètres généraux et les sauvegardes
            restent réservés à l'administrateur.
          </p>
        </div>
      </form>

      <template #pied>
        <button class="bouton-secondaire" @click="formulaire = null">Fermer</button>
        <button type="submit" form="form-profil" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </template>
    </FenetreModale>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import FenetreModale from '@/components/FenetreModale.vue'
import ImportExportTableau from '@/components/ImportExportTableau.vue'
import Pagination from '@/components/Pagination.vue'
import ColonneTri from '@/components/ColonneTri.vue'
import { utiliserTableau } from '@/utils/pagination'
import { confirmer } from '@/utils/alertes'
import { DROITS_DONNEES, LIBELLES_DROITS, MODULES, SENS_VALIDER } from '@/utils/modules'

const store = useStore()

/** Colonnes de la grille (un module n'a que certains de ces droits : voir modules.js). */
const COLONNES = ['VOIR', 'IMPRIMER', 'MODIFIER', 'VALIDER']
const ICONES = { VOIR: '👁', IMPRIMER: '🖨', MODIFIER: '✎', VALIDER: '✔' }

const MODULES_DISPONIBLES = MODULES.filter((m) => m.disponible && !m.droitsDe)
const GROUPES = [
  { titre: 'Modules', modules: MODULES_DISPONIBLES },
  { titre: 'Données sensibles', modules: DROITS_DONNEES },
]
const TOUS = [...MODULES_DISPONIBLES, ...DROITS_DONNEES]

const profils = computed(() => store.state.referentiel.profils)
const chargement = ref(false)
const recherche = ref('')
const enregistrement = ref(false)
const formulaire = ref(null)

/** Droits d'un profil sur un module (liste). */
const droitsDe = (profil, module) => profil.permissions?.[module] ?? []

const profilsAffiches = computed(() => {
  const texte = recherche.value.toLowerCase()
  if (!texte) return profils.value
  return profils.value.filter((p) =>
    [p.code, p.libelle, p.description].some((v) => (v || '').toLowerCase().includes(texte)),
  )
})

/** Modules (et données) auxquels le profil a au moins un droit. */
const modulesDuProfil = (profil) => TOUS.filter((m) => droitsDe(profil, m.route).length > 0)

async function charger() {
  chargement.value = true
  try {
    await store.dispatch('referentiel/charger', { liste: 'profils' })
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    chargement.value = false
  }
}
onMounted(charger)

function ouvrirFormulaire(profil = null) {
  const droits = Object.fromEntries(TOUS.map((m) => [m.route, profil ? [...droitsDe(profil, m.route)] : []]))
  formulaire.value = profil
    ? { id: profil.id, code: profil.code, libelle: profil.libelle, description: profil.description || '', droits }
    : { code: '', libelle: '', description: '', droits }
}

/** Raccourci : mêmes droits pour tous les modules (seulement ceux que le module propose). */
function toutMettre(droits) {
  for (const module of MODULES_DISPONIBLES) {
    formulaire.value.droits[module.route] = module.droits.filter((d) => droits.includes(d))
  }
}

/**
 * Coche / décoche un droit en gardant la cohérence :
 *   - cocher un droit coche aussi Voir ;
 *   - décocher Voir décoche tout (on ne peut rien faire sans voir).
 */
function changerDroit(module, droit, coche) {
  let liste = new Set(formulaire.value.droits[module.route])
  if (coche) {
    liste.add(droit)
    liste.add('VOIR')
  } else if (droit === 'VOIR') {
    liste = new Set()
  } else {
    liste.delete(droit)
  }
  formulaire.value.droits[module.route] = module.droits.filter((d) => liste.has(d))
}

async function enregistrer() {
  const f = formulaire.value
  const permissions = Object.fromEntries(Object.entries(f.droits).filter(([, droits]) => droits.length > 0))
  const element = f.id
    ? { id: f.id, libelle: f.libelle, description: f.description, permissions }
    : { code: f.code, libelle: f.libelle, description: f.description, permissions }

  enregistrement.value = true
  try {
    await store.dispatch('referentiel/enregistrer', { liste: 'profils', element })
    store.dispatch('notifications/succes', f.id ? 'Profil et droits enregistrés.' : 'Profil créé.')
    if (f.id) formulaire.value = null
    else ouvrirFormulaire()
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  } finally {
    enregistrement.value = false
  }
}

async function supprimer(profil) {
  const confirme = await confirmer({
    titre: 'Supprimer ce profil ?',
    texte: `« ${profil.libelle} » sera supprimé définitivement.`,
    boutonConfirmer: 'Oui, supprimer',
    danger: true,
  })
  if (!confirme) return
  try {
    await store.dispatch('referentiel/supprimer', { liste: 'profils', element: profil })
    store.dispatch('notifications/succes', 'Profil supprimé.')
    await charger()
  } catch (erreur) {
    store.dispatch('notifications/erreurApi', erreur)
  }
}

// ---------------------------------------------------------------------------
// Tri, pagination, PDF / Excel
// ---------------------------------------------------------------------------

const VALEURS_TRI = {
  code: (p) => p.code,
  libelle: (p) => p.libelle,
  comptes: (p) => p.comptes ?? 0,
}
const { tri, lignesTriees, page, taille, lignesPage } = utiliserTableau(profilsAffiches, [recherche], VALEURS_TRI)

/** Grille des droits du profil ouvert (Oui / vide). */
const COLONNES_DROITS = [
  { titre: 'Module', valeur: (m) => m.titre },
  ...COLONNES.map((droit) => ({
    titre: LIBELLES_DROITS[droit],
    valeur: (m) =>
      !m.droits.includes(droit) ? '—' : formulaire.value?.droits[m.route]?.includes(droit) ? 'Oui' : '',
  })),
]

/** Liste des profils : pour chaque droit, les modules concernés. */
const COLONNES_PDF = [
  { titre: 'Code', valeur: (p) => p.code },
  { titre: 'Profil', valeur: (p) => p.libelle },
  ...COLONNES.map((droit) => ({
    titre: LIBELLES_DROITS[droit],
    valeur: (p) =>
      p.code === 'ADMIN'
        ? 'Tous les modules'
        : TOUS.filter((m) => droitsDe(p, m.route).includes(droit)).map((m) => m.court ?? m.titre).join(', '),
  })),
  { titre: 'Comptes', valeur: (p) => p.comptes ?? 0, droite: true, somme: (p) => p.comptes ?? 0 },
]
</script>

<style scoped>
.detail { font-size: 0.78rem; color: var(--muted); }
.note { margin: 0.6rem 0 0; }
.info-lecture {
  margin: 0;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 0.85rem;
}

/* Puces des modules dans la liste */
.puce-module {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0.15rem 0.3rem 0.15rem 0;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.puce-module.modif { background: var(--primary-light); color: var(--primary-dark); }
.puce-module.lecture { background: #eef0f2; color: #475569; }

/* Grille des droits */
.titre-avec-export { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.raccourcis { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--muted); }
.grille-droits th small { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--muted); }
.grille-droits .centre { text-align: center; width: 105px; }
.grille-droits input[type='checkbox'] { width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer; }
.sans-objet { color: #cbd5e1; }
.ligne-groupe td {
  padding: 0.45rem 0.75rem;
  background: #f3f9fd;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
}
</style>
