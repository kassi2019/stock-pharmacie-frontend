import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

let surDeconnexion = () => {}
/** Appelé par le store pour réagir à une session expirée. */
export function definirDeconnexion(fn) {
  surDeconnexion = fn
}

api.interceptors.request.use((config) => {
  const jeton = localStorage.getItem('jeton')
  if (jeton) config.headers.Authorization = `Bearer ${jeton}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (erreur) => {
    if (erreur.response?.status === 401 && !erreur.config.url.includes('auth/connexion')) {
      surDeconnexion()
    }
    return Promise.reject(erreur)
  },
)

/** Message lisible à partir d'une erreur d'API. */
export function messageErreur(e) {
  const m = e?.response?.data?.message
  if (Array.isArray(m)) return m.join('\n')
  if (m) return m
  if (e?.code === 'ERR_NETWORK') return 'Serveur injoignable.'
  return e?.message ?? 'Erreur inconnue.'
}

/** Télécharge un fichier renvoyé par l'API. */
export async function telecharger(url, nomFichier) {
  const { data } = await api.get(url, { responseType: 'blob' })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(data)
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(lien.href)
}

export default api
