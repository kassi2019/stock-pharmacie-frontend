/**
 * =============================================================================
 * CERTIFICAT HTTPS DE LA PHARMACIE (réseau local) — « npm run certificat »
 * =============================================================================
 * Pourquoi : la caméra et l'INSTALLATION de l'application sur le téléphone
 * (icône sur l'écran d'accueil) exigent une adresse https SANS avertissement.
 *
 * Ce script (OpenSSL, fourni avec Git pour Windows) crée dans « certificats/ » :
 *   - pharmastock-ca.crt / .key : l'AUTORITÉ de la pharmacie (créée une seule fois,
 *     valable 10 ans). Le .crt s'installe UNE FOIS sur chaque téléphone ;
 *     le .key reste sur ce PC (ne jamais le copier ni le partager) ;
 *   - serveur.crt / serveur.key : le certificat du site, signé par cette autorité,
 *     pour « localhost » et les adresses réseau de ce PC (à refaire si l'adresse
 *     du PC change : relancer « npm run certificat », rien à refaire sur les téléphones).
 * Une copie de pharmastock-ca.crt est mise dans public/ pour la télécharger
 * depuis le téléphone : https://<adresse du PC>:5443/pharmastock-ca.crt
 * =============================================================================
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dossier = join(racine, 'certificats')
mkdirSync(dossier, { recursive: true })
const f = (nom) => join(dossier, nom)
const openssl = (...args) => execFileSync('openssl', args, { stdio: 'pipe' })

// 1. Autorité de la pharmacie (une seule fois)
if (!existsSync(f('pharmastock-ca.crt'))) {
  openssl('genrsa', '-out', f('pharmastock-ca.key'), '2048')
  openssl(
    'req', '-x509', '-new', '-nodes', '-key', f('pharmastock-ca.key'), '-sha256', '-days', '3650',
    '-subj', '/CN=PharmaStock - Autorite locale/O=Pharmacie', '-out', f('pharmastock-ca.crt'),
  )
  console.log('✓ Autorité créée : certificats/pharmastock-ca.crt (à installer sur chaque téléphone)')
} else {
  console.log('• Autorité existante gardée (rien à refaire sur les téléphones)')
}

// 2. Certificat du site : localhost + toutes les adresses IPv4 de ce PC
const adresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4')
  .map((i) => i.address)
const noms = ['DNS:localhost', ...new Set(adresses)].map((a) => (a.startsWith('DNS:') ? a : `IP:${a}`))
writeFileSync(
  f('serveur.ext'),
  [
    'authorityKeyIdentifier=keyid,issuer',
    'basicConstraints=CA:FALSE',
    'keyUsage=digitalSignature,keyEncipherment',
    'extendedKeyUsage=serverAuth',
    `subjectAltName=${noms.join(',')}`,
  ].join('\n'),
)
openssl('genrsa', '-out', f('serveur.key'), '2048')
openssl('req', '-new', '-key', f('serveur.key'), '-subj', '/CN=PharmaStock', '-out', f('serveur.csr'))
// 825 jours : durée maximale acceptée par l'iPhone
openssl(
  'x509', '-req', '-in', f('serveur.csr'), '-CA', f('pharmastock-ca.crt'), '-CAkey', f('pharmastock-ca.key'),
  '-CAcreateserial', '-out', f('serveur.crt'), '-days', '825', '-sha256', '-extfile', f('serveur.ext'),
)
copyFileSync(f('pharmastock-ca.crt'), join(racine, 'public', 'pharmastock-ca.crt'))

console.log(`✓ Certificat du site créé pour : ${noms.map((n) => n.slice(n.indexOf(':') + 1)).join(', ')}`)
console.log('\nSur chaque téléphone (une seule fois) : installer certificats/pharmastock-ca.crt')
for (const a of adresses.filter((x) => x !== '127.0.0.1')) {
  console.log(`  téléchargement possible : https://${a}:5443/pharmastock-ca.crt`)
}
console.log('Puis lancer : npm run mobile')
