/**
 * =============================================================================
 * APPLICATION MOBILE (§ 17) — même serveur et mêmes règles que le web
 * =============================================================================
 * - estMobile : vrai sur un écran de téléphone (largeur ≤ 768 px) ; l'accueil
 *   n'y propose que les modules du mobile (stock et états, alertes, retraits,
 *   péremptions, points financiers) ;
 * - installation : bouton « Installer l'application » (Android / ordinateur :
 *   événement beforeinstallprompt du navigateur ; iPhone : menu Partager →
 *   « Sur l'écran d'accueil ») ;
 * - enregistrerServiceWorker : rend l'application installable (version compilée seulement).
 */
import { ref } from 'vue'

const requete = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null
export const estMobile = ref(!!requete?.matches)
requete?.addEventListener('change', (e) => {
  estMobile.value = e.matches
})

/** Application déjà ouverte comme application installée (plein écran, sans barre du navigateur). */
export const estInstallee = ref(
  typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true),
)

/** Demande d'installation proposée par le navigateur (null si indisponible). */
const demande = ref(null)
export const installationPossible = ref(false)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    demande.value = e
    installationPossible.value = true
  })
  window.addEventListener('appinstalled', () => {
    demande.value = null
    installationPossible.value = false
    estInstallee.value = true
  })
}

/** iPhone / iPad : pas d'installation automatique, seulement par le menu Partager. */
export const estIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

export async function installer() {
  if (!demande.value) return false
  demande.value.prompt()
  const { outcome } = await demande.value.userChoice
  demande.value = null
  installationPossible.value = false
  return outcome === 'accepted'
}

export function enregistrerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sans service worker (HTTP non sécurisé…), l'application fonctionne normalement
    })
  })
}
