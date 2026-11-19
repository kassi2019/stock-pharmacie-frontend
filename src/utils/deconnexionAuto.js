/**
 * =============================================================================
 * DÉCONNEXION AUTOMATIQUE APRÈS INACTIVITÉ — même fonctionnement que le district
 * =============================================================================
 * Délai : paramètre général « Déconnexion après inactivité (minutes) »
 * (SESSION_EXPIRATION_MINUTES ; 0 = désactivé).
 *
 *   - Toute action (souris, clavier, clic, défilement, toucher) remet le compteur
 *     à zéro. L'heure de la dernière action est partagée entre les ONGLETS ouverts
 *     (localStorage) : travailler dans un onglet garde les autres connectés.
 *   - 1 minute avant la fin : alerte avec compte à rebours,
 *     « Rester connecté » ou « Se déconnecter ».
 *   - À la fin : déconnexion et retour à l'écran de connexion.
 *   - Déconnexion dans un onglet = déconnexion de tous les onglets.
 *
 * Utilisation (une seule fois, dans components/MiseEnPage.vue) :
 *     utiliserDeconnexionAuto()
 * =============================================================================
 */
import { onBeforeUnmount, onMounted } from 'vue'
import Swal from 'sweetalert2'
import store from '@/store'
import router from '@/router'
import { listerParametres } from '@/api/parametrage'

const CLE_ACTIVITE = 'derniere_activite'
const CLE_JETON = 'jeton' // même clé que store/modules/auth.js
const PREAVIS_MS = 60 * 1000 // alerte 1 minute avant
const EVENEMENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']

export function utiliserDeconnexionAuto() {
  let minuterie = null
  let alerteOuverte = false
  let derniereEcriture = 0
  let minutes = 30 // valeur par défaut, remplacée par le paramètre général

  /** Délai en millisecondes (0 = pas de déconnexion automatique). */
  const delai = () => Math.max(0, minutes) * 60 * 1000

  /** Note une activité (au plus une écriture toutes les 5 s). */
  function activite() {
    const maintenant = Date.now()
    if (alerteOuverte || maintenant - derniereEcriture < 5000) return
    derniereEcriture = maintenant
    localStorage.setItem(CLE_ACTIVITE, String(maintenant))
  }

  function derniereActivite() {
    return Number(localStorage.getItem(CLE_ACTIVITE)) || Date.now()
  }

  function deconnecter() {
    arreter()
    Swal.close()
    store.dispatch('auth/deconnexion')
    router.push({ name: 'connexion' })
    Swal.fire({
      icon: 'info',
      title: 'Session expirée',
      text: 'Vous avez été déconnecté après une période d’inactivité.',
      confirmButtonColor: '#0288d1',
    })
  }

  /** Alerte « vous allez être déconnecté » avec compte à rebours. */
  async function prevenir() {
    alerteOuverte = true
    let intervalle = null
    const resultat = await Swal.fire({
      title: "Session sur le point d'expirer",
      html: 'Sans action de votre part, vous serez déconnecté dans <strong id="compte-a-rebours">60</strong> secondes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Rester connecté',
      cancelButtonText: 'Se déconnecter',
      confirmButtonColor: '#0288d1',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      allowOutsideClick: false,
      didOpen: () => {
        intervalle = setInterval(() => {
          const reste = Math.max(0, Math.ceil((derniereActivite() + delai() - Date.now()) / 1000))
          const zone = document.getElementById('compte-a-rebours')
          if (zone) zone.textContent = String(reste)
          // Activité dans un autre onglet : l'alerte se ferme d'elle-même
          if (reste > PREAVIS_MS / 1000) Swal.close()
        }, 1000)
      },
      willClose: () => clearInterval(intervalle),
    })
    alerteOuverte = false
    if (resultat.isConfirmed) {
      derniereEcriture = 0
      activite()
    } else if (resultat.dismiss === Swal.DismissReason.cancel) {
      deconnecter()
    }
  }

  /** Vérification toutes les 5 secondes. */
  function verifier() {
    if (!store.getters['auth/estConnecte'] || delai() === 0) return
    const inactif = Date.now() - derniereActivite()
    if (inactif >= delai()) deconnecter()
    else if (inactif >= delai() - PREAVIS_MS && !alerteOuverte) prevenir()
  }

  /** Autre onglet : déconnexion (jeton supprimé) -> on suit. */
  function surStockage(evenement) {
    if (evenement.key === CLE_JETON && !evenement.newValue && store.state.auth.jeton) {
      arreter()
      Swal.close()
      store.commit('auth/session', { jeton: null, utilisateur: null })
      router.push({ name: 'connexion' })
    }
  }

  function arreter() {
    clearInterval(minuterie)
    minuterie = null
    EVENEMENTS.forEach((e) => window.removeEventListener(e, activite))
    window.removeEventListener('storage', surStockage)
  }

  onMounted(async () => {
    derniereEcriture = 0
    localStorage.setItem(CLE_ACTIVITE, String(Date.now()))
    EVENEMENTS.forEach((e) => window.addEventListener(e, activite, { passive: true }))
    window.addEventListener('storage', surStockage)
    minuterie = setInterval(verifier, 5000)
    try {
      const valeur = (await listerParametres()).find((p) => p.cle === 'SESSION_EXPIRATION_MINUTES')?.valeur
      if (valeur !== undefined) minutes = Number(valeur)
    } catch {
      // Paramètre indisponible : délai par défaut (30 minutes)
    }
  })
  onBeforeUnmount(arreter)
}
