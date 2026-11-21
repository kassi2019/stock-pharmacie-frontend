/**
 * =============================================================================
 * SCAN AVEC LE TÉLÉPHONE, CÔTÉ PC (réutilisable dans un écran)
 * =============================================================================
 * Le PC ouvre une « demande » ; sur le téléphone, l'écran Codes-barres affiche
 * « Le poste attend un code » ; chaque code scanné arrive ici AUSSITÔT :
 * le PC reste « à l'écoute » (requête en attente active côté serveur, renouvelée
 * toutes les 20 s) au lieu de demander toutes les secondes.
 *
 *   const telephone = utiliserScanDistant({
 *     libelle: () => 'Réception — LABOREX',   // texte affiché sur le téléphone
 *     continu: true,                           // boîtes à la suite (sinon : une seule)
 *     surCode: (code) => ajouterParCode(code), // appelé pour chaque code reçu
 *   })
 *   telephone.demarrer()  /  telephone.arreter()
 *   telephone.actif (vrai pendant l'attente), telephone.recus (nombre de codes reçus)
 * La demande est fermée quand l'écran se ferme (ou après 15 min sans activité).
 * =============================================================================
 */
import { onBeforeUnmount, ref } from 'vue'
import api from '@/services/api'
import store from '@/store'

const ATTENTE_MS = 20000
const pause = (ms) => new Promise((fin) => setTimeout(fin, ms))

export function utiliserScanDistant({ libelle, continu = false, surCode }) {
  const actif = ref(false)
  const recus = ref(0)
  let id = null
  let session = 0 // change à chaque démarrage / arrêt : la boucle précédente s'arrête

  /** Boucle d'écoute : une requête en attente à la fois, relancée dès qu'elle répond. */
  async function ecouter(maSession) {
    let lus = 0
    let echecs = 0
    while (maSession === session) {
      try {
        const { data } = await api.get(`/scan-distant/${id}`, { params: { depuis: lus, attente: ATTENTE_MS } })
        if (maSession !== session) return
        echecs = 0
        lus = data.total
        for (const c of data.codes) {
          recus.value++
          await surCode(c.code)
        }
        if (data.codes.length && !continu) return arreter()
        if (data.ferme) return arreter(false)
      } catch (erreur) {
        if (maSession !== session) return
        // Demande expirée / fermée : on arrête ; coupure réseau : on réessaie un peu
        if (erreur?.response?.status === 404 || ++echecs > 5) {
          arreter(false)
          store.dispatch('notifications/erreur', 'Scan avec le téléphone arrêté. Relancez-le si besoin.')
          return
        }
        await pause(1000)
      }
    }
  }

  async function demarrer() {
    try {
      id = (await api.post('/scan-distant', { libelle: libelle(), continu })).data.id
      recus.value = 0
      actif.value = true
      ecouter(++session)
    } catch (erreur) {
      store.dispatch('notifications/erreurApi', erreur)
    }
  }

  function arreter(prevenirServeur = true) {
    session++
    if (id && prevenirServeur) api.delete(`/scan-distant/${id}`).catch(() => {})
    id = null
    actif.value = false
  }

  /** Met à jour le texte affiché sur le téléphone (ex. fournisseur choisi après coup). */
  function renommer() {
    if (id) api.patch(`/scan-distant/${id}`, { libelle: libelle() }).catch(() => {})
  }

  onBeforeUnmount(() => arreter())
  return { actif, recus, demarrer, arreter, renommer }
}
