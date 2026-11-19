/*
 * =============================================================================
 * SERVICE WORKER — application installable (PWA, § 17 « Application mobile »)
 * =============================================================================
 * Rôle : permettre l'installation sur le téléphone et ouvrir l'application vite.
 *  - Pages : réseau d'abord, sinon la dernière version en cache (réseau coupé) ;
 *  - Fichiers de l'application (/assets/… à nom unique, icônes, polices) : cache d'abord ;
 *  - Données de stock (API) : JAMAIS en cache — toujours lues sur le serveur,
 *    pour ne jamais afficher un stock ou une alerte périmés.
 * Changer VERSION à chaque modification de ce fichier.
 */
const VERSION = 'pharmastock-v1'
const COQUILLE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icones/icone-192.png', '/icones/icone-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(COQUILLE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  // Supprime les caches des versions précédentes
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const requete = e.request
  if (requete.method !== 'GET') return
  const url = new URL(requete.url)
  // API ou autre serveur : jamais de cache (le navigateur gère normalement)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return

  // Navigation (ouverture d'une page) : réseau d'abord, sinon l'application en cache
  if (requete.mode === 'navigate') {
    e.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copie))
          return reponse
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Fichiers de l'application : cache d'abord (noms uniques à chaque version)
  e.respondWith(
    caches.match(requete).then(
      (enCache) =>
        enCache ||
        fetch(requete).then((reponse) => {
          if (reponse.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icones/'))) {
            const copie = reponse.clone()
            caches.open(VERSION).then((cache) => cache.put(requete, copie))
          }
          return reponse
        }),
    ),
  )
})
