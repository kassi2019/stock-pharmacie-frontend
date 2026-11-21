import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// https://vite.dev/config/
//
// « npm run dev »        : poste de la pharmacie (http://localhost:5173)
// « npm run dev:mobile » : TEST sur téléphone / tablette (caméra, codes-barres), site en HTTPS
// « npm run mobile »     : version COMPILÉE en HTTPS, INSTALLABLE sur le téléphone
//                          (icône sur l'écran d'accueil, plein écran)
// Dans les deux cas « mobile » :
//   - ouvert sur le réseau Wi-Fi (adresse « Network » affichée au lancement), port 5443 ;
//   - les appels /api sont relayés au serveur (port 3005) : pas de CORS à régler ;
//   - certificat : celui de la pharmacie s'il existe (« npm run certificat », sans
//     avertissement une fois l'autorité installée sur le téléphone), sinon un
//     certificat de test (avertissement à accepter, installation impossible).
const certificat = new URL('./certificats/serveur.crt', import.meta.url)
const cle = new URL('./certificats/serveur.key', import.meta.url)
const certificatPharmacie = existsSync(certificat) && existsSync(cle)

export default defineConfig(({ mode }) => {
  const mobile = mode === 'mobile'
  const reseau = {
    port: 5443,
    host: true,
    proxy: { '/api': { target: 'http://localhost:3005', changeOrigin: true } },
    ...(certificatPharmacie ? { https: { cert: readFileSync(certificat), key: readFileSync(cle) } } : {}),
  }
  return {
    plugins: [vue(), ...(mobile && !certificatPharmacie ? [basicSsl()] : [])],
    // « @/… » = dossier src (comme dans l'application de district)
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: mobile ? reseau : { port: 5173 },
    preview: mobile ? reseau : undefined,
  }
})
