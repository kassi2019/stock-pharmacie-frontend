<!--
  =============================================================================
  ONGLET « SAUVEGARDES » (§ 4 et § 18) — administrateur
  =============================================================================
  - Réglages : sauvegarde automatique, heure (01:30), dossier et conservation
    sur le serveur (7 j), dossier de copie sur le PC de la clinique, fréquence
    (6 h) et conservation (30 j) des copies ;
  - Fichiers présents sur le serveur et sur le PC, avec date et taille ;
  - « Sauvegarder maintenant » et « Copier maintenant » ; dernier résultat.
  Restauration d'une sauvegarde : avec SQL Server Management Studio (voir l'aide).
  =============================================================================
-->
<template>
  <div class="sauvegardes">
    <p v-if="!etat" class="tableau-vide">Chargement…</p>
    <template v-else>
      <!-- ===================== ÉTAT ===================== -->
      <div class="cartes">
        <div class="carte" :class="derniereClasse(etat.derniere.sauvegarde, etat.serveur.fichiers[0])">
          <small>Dernière sauvegarde (serveur)</small>
          <strong>{{ etat.serveur.fichiers[0] ? dateHeure(etat.serveur.fichiers[0].date) : 'Aucune' }}</strong>
          <span v-if="etat.serveur.fichiers[0]">{{ taille(etat.serveur.fichiers[0].taille) }} · {{ etat.serveur.fichiers.length }} fichier(s) conservé(s)</span>
          <span v-if="etat.derniere.sauvegarde && !etat.derniere.sauvegarde.ok" class="erreur">{{ etat.derniere.sauvegarde.message }}</span>
          <button :disabled="action" @click="lancer('sauvegarder')">{{ action === 'sauvegarder' ? 'Sauvegarde…' : 'Sauvegarder maintenant' }}</button>
        </div>
        <div class="carte" :class="etat.copie.dossier ? derniereClasse(etat.derniere.copie, etat.copie.fichiers[0]) : 'grise'">
          <small>Dernière copie (PC de la clinique)</small>
          <strong>{{ etat.copie.dossier ? (etat.copie.fichiers[0] ? dateHeure(etat.copie.fichiers[0].date) : 'Aucune') : 'Non configurée' }}</strong>
          <span v-if="etat.copie.fichiers[0]">{{ taille(etat.copie.fichiers[0].taille) }} · {{ etat.copie.fichiers.length }} copie(s) conservée(s)</span>
          <span v-else-if="!etat.copie.dossier">Renseignez le dossier de copie ci-dessous.</span>
          <span v-if="etat.copie.erreur || (etat.derniere.copie && !etat.derniere.copie.ok)" class="erreur">
            {{ etat.copie.erreur ?? etat.derniere.copie.message }}
          </span>
          <button :disabled="action || !etat.copie.dossier" @click="lancer('copier')">{{ action === 'copier' ? 'Copie…' : 'Copier maintenant' }}</button>
        </div>
      </div>

      <!-- ===================== RÉGLAGES ===================== -->
      <h3 class="titre">Réglages</h3>
      <div class="liste-parametres">
        <div v-for="p in parametres" :key="p.cle" class="parametre">
          <div class="parametre-texte">
            <strong>{{ LIBELLES[p.cle] }}</strong>
            <small>{{ p.description }}</small>
          </div>
          <div class="parametre-champ">
            <ListeDeroulante v-if="p.type === 'ouiNon'" v-model="valeurs[p.cle]" :options="OUI_NON" :effacable="false" />
            <input v-else-if="p.type === 'entier'" v-model="valeurs[p.cle]" type="number" min="1" step="1" />
            <input v-else-if="p.type === 'heure'" v-model="valeurs[p.cle]" type="time" />
            <input
              v-else
              v-model.trim="valeurs[p.cle]"
              type="text"
              :placeholder="p.cle === 'SAUVEGARDE_DOSSIER' ? etat.serveur.dossier ?? 'Dossier de SQL Server' : 'ex. \\\\PC-PHARMACIE\\Sauvegardes'"
            />
          </div>
          <button :disabled="String(valeurs[p.cle] ?? '') === p.valeur || enregistrement === p.cle" @click="enregistrer(p)">Enregistrer</button>
        </div>
      </div>

      <!-- ===================== FICHIERS ===================== -->
      <div class="colonnes">
        <section v-for="zone in ZONES" :key="zone.cle" class="zone">
          <h3 class="titre">{{ zone.titre }}</h3>
          <p class="chemin">
            <Icone nom="carton" :taille="16" />
            <span>{{ etat[zone.cle].dossier ?? '— non configuré —' }}</span>
          </p>
          <p v-if="etat[zone.cle].erreur" class="erreur">{{ etat[zone.cle].erreur }}</p>
          <div v-else-if="etat[zone.cle].fichiers.length" class="tableau-conteneur">
            <table class="tableau">
              <thead>
                <tr><th>Fichier</th><th>Date</th><th class="nombre">Taille</th></tr>
              </thead>
              <tbody>
                <tr v-for="f in etat[zone.cle].fichiers" :key="f.nom">
                  <td class="code">{{ f.nom }}</td>
                  <td>{{ dateHeure(f.date) }}</td>
                  <td class="nombre">{{ taille(f.taille) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="etat[zone.cle].dossier" class="tableau-vide">Aucun fichier.</p>
        </section>
      </div>

      <details class="aide">
        <summary>Restaurer une sauvegarde</summary>
        <ol>
          <li>Arrêter le serveur de l'application (backend).</li>
          <li>Dans SQL Server Management Studio : clic droit sur <strong>Bases de données</strong> → <strong>Restaurer la base de données…</strong> → Périphérique → choisir le fichier <code>.bak</code>.</li>
          <li>Base de destination : <code>{{ etat.base }}</code> ; cocher « Remplacer la base de données existante ».</li>
          <li>Redémarrer le serveur de l'application.</li>
        </ol>
      </details>
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import api from '@/services/api'
import { listerParametres, modifierParametre } from '@/api/parametrage'
import Icone from '@/components/Icone.vue'
import ListeDeroulante from '@/components/ListeDeroulante.vue'
import { dateHeure } from '@/utils/format'
import { CLES_SAUVEGARDE } from '@/utils/sauvegardes'

const store = useStore()

const OUI_NON = [
  { id: 'true', libelle: 'Oui' },
  { id: 'false', libelle: 'Non' },
]
const LIBELLES = {
  SAUVEGARDE_AUTO: 'Sauvegarde automatique (chaque nuit)',
  HEURE_SAUVEGARDE: 'Heure de la sauvegarde de nuit',
  SAUVEGARDE_DOSSIER: 'Dossier des sauvegardes sur le serveur',
  SAUVEGARDE_JOURS: 'Conservation sur le serveur (jours)',
  COPIE_DOSSIER: 'Dossier de copie sur le PC de la clinique',
  COPIE_INTERVALLE_HEURES: 'Copie toutes les … heures',
  COPIE_JOURS: 'Conservation des copies (jours)',
}
const ZONES = [
  { cle: 'serveur', titre: 'Sauvegardes sur le serveur' },
  { cle: 'copie', titre: 'Copies sur le PC de la clinique' },
]

const etat = ref(null)
const parametres = ref([])
const valeurs = reactive({})
const action = ref(null)
const enregistrement = ref(null)

/** Taille lisible (Ko / Mo). */
const taille = (octets) => (octets >= 1_048_576 ? `${(octets / 1_048_576).toFixed(1)} Mo` : `${Math.round(octets / 1024)} Ko`)

/** Couleur de la carte : vert si récente, orange si plus de 26 h, rouge si échec. */
function derniereClasse(resultat, fichier) {
  if (resultat && !resultat.ok) return 'rouge'
  if (!fichier) return 'orange'
  return Date.now() - new Date(fichier.date).getTime() > 26 * 3_600_000 ? 'orange' : ''
}

async function charger() {
  try {
    const [e, liste] = await Promise.all([api.get('/sauvegardes'), listerParametres()])
    etat.value = e.data
    parametres.value = CLES_SAUVEGARDE.map((cle) => liste.find((p) => p.cle === cle)).filter(Boolean)
    for (const p of parametres.value) valeurs[p.cle] = p.valeur
  } catch (err) {
    store.dispatch('notifications/erreurApi', err)
  }
}

async function enregistrer(p) {
  enregistrement.value = p.cle
  try {
    const misAJour = await modifierParametre(p.cle, String(valeurs[p.cle] ?? ''))
    p.valeur = misAJour.valeur
    valeurs[p.cle] = misAJour.valeur
    store.dispatch('notifications/succes', `« ${LIBELLES[p.cle]} » enregistré.`)
    await charger()
  } catch (err) {
    store.dispatch('notifications/erreurApi', err)
  } finally {
    enregistrement.value = null
  }
}

async function lancer(quoi) {
  action.value = quoi
  try {
    const { data } = await api.post(quoi === 'copier' ? '/sauvegardes/copie' : '/sauvegardes')
    store.dispatch('notifications/succes', quoi === 'copier' ? `Copie faite : ${data.fichier}` : `Sauvegarde faite : ${data.fichier} (${taille(data.taille)})`)
    await charger()
  } catch (err) {
    store.dispatch('notifications/erreurApi', err)
    await charger()
  } finally {
    action.value = null
  }
}

onMounted(charger)
</script>

<style scoped>
.sauvegardes {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}
.carte {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  padding: 1rem 1.2rem;
  border: 1px solid var(--border);
  border-left: 5px solid #2e7d32;
  border-radius: 12px;
  background: #fff;
}
.carte.orange {
  border-left-color: #ef6c00;
}
.carte.rouge {
  border-left-color: var(--danger);
}
.carte.grise {
  border-left-color: #b0bec5;
}
.carte small {
  color: var(--muted);
}
.carte strong {
  font-size: 1.2rem;
  color: var(--primary-dark);
}
.carte span {
  font-size: 0.82rem;
  color: var(--muted);
}
.carte button {
  margin-top: 0.4rem;
}
.erreur {
  color: var(--danger) !important;
  font-size: 0.82rem;
}
.titre {
  margin: 0.5rem 0 0;
  font-size: 1rem;
  color: var(--primary-dark);
}
.liste-parametres {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.parametre {
  display: grid;
  grid-template-columns: 1fr minmax(220px, 340px) auto;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.parametre-texte {
  display: flex;
  flex-direction: column;
}
.parametre-texte small {
  color: var(--muted);
}
.parametre-champ input {
  width: 100%;
}
.colonnes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1.25rem;
}
.chemin {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.25rem 0 0.5rem;
  font-size: 0.82rem;
  color: var(--muted);
  word-break: break-all;
}
.aide {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--fond-pale);
  font-size: 0.88rem;
}
.aide summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--primary-dark);
}
@media (max-width: 700px) {
  .parametre {
    grid-template-columns: 1fr;
  }
}
</style>
