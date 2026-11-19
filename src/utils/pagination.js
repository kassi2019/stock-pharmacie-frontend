/**
 * =============================================================================
 * PAGINATION D'UN TABLEAU (découpage d'une liste en pages)
 * =============================================================================
 * La liste complète est déjà chargée (et filtrée) dans l'écran : on n'affiche
 * que les lignes de la page en cours.
 *
 * Utilisation dans un écran :
 *
 *     import { utiliserPagination } from '@/utils/pagination'
 *     import Pagination from '@/components/Pagination.vue'
 *
 *     // 2e paramètre : ce qui doit ramener à la page 1 quand ça change
 *     // (recherche, filtres...)
 *     const { page, taille, lignesPage } = utiliserPagination(centresAffiches, [recherche, typeFiltre])
 *
 *     <tr v-for="centre in lignesPage" ...>
 *     <Pagination v-model:page="page" v-model:taille="taille" :total="centresAffiches.length" />
 * =============================================================================
 */
import { computed, ref, watch } from 'vue'

/** Nombre de lignes par page au départ. */
export const TAILLE_PAR_DEFAUT = 10

/**
 * @param lignes            liste complète (ref ou computed)
 * @param reinitialiserSur  liste de refs : quand l'une change, on revient à la page 1
 */
export function utiliserPagination(lignes, reinitialiserSur = []) {
  const page = ref(1)
  const taille = ref(TAILLE_PAR_DEFAUT)

  const nombrePages = computed(() => Math.max(1, Math.ceil(lignes.value.length / taille.value)))

  /** Lignes de la page en cours. */
  const lignesPage = computed(() => {
    const debut = (page.value - 1) * taille.value
    return lignes.value.slice(debut, debut + taille.value)
  })

  // Recherche / filtre modifié, ou nombre de lignes par page changé : page 1
  watch([...reinitialiserSur, taille], () => {
    page.value = 1
  })

  // Si la liste raccourcit (ex. élément désactivé), on reste sur une page qui existe
  watch(nombrePages, (total) => {
    if (page.value > total) page.value = total
  })

  return { page, taille, nombrePages, lignesPage }
}

/**
 * =============================================================================
 * TABLEAU COMPLET (« data table ») : TRI PAR COLONNE + PAGINATION
 * =============================================================================
 *     const VALEURS_TRI = {
 *       code: (c) => c.code,
 *       type: (c) => c.type?.libelle,
 *       stock: (m) => m.stockActuel,
 *     }
 *     const { tri, lignesTriees, page, taille, lignesPage } =
 *       utiliserTableau(centresAffiches, [recherche, typeFiltre], VALEURS_TRI)
 *
 *     <ColonneTri v-model="tri" cle="code">Code</ColonneTri>      (en-tête cliquable)
 *     <tr v-for="centre in lignesPage" ...>                          (page en cours)
 *     <ImportExportTableau :lignes="lignesTriees" ... />             (PDF dans l'ordre trié)
 *
 * Tri : textes par ordre alphabétique (sans tenir compte des majuscules/accents,
 * « 10 » après « 9 »), nombres par valeur ; les cases vides toujours à la fin.
 * =============================================================================
 */
export function utiliserTableau(lignes, reinitialiserSur = [], valeursTri = {}) {
  // Tri en cours : { cle: 'code', sens: 'asc' | 'desc' } ; cle null = ordre d'origine
  const tri = ref({ cle: null, sens: 'asc' })

  const lignesTriees = computed(() => {
    const valeur = valeursTri[tri.value.cle]
    if (!valeur) return lignes.value
    const sens = tri.value.sens === 'desc' ? -1 : 1
    return [...lignes.value].sort((a, b) => comparer(valeur(a), valeur(b), sens))
  })

  // Changer de tri ramène aussi à la page 1
  const pagination = utiliserPagination(lignesTriees, [...reinitialiserSur, tri])
  return { tri, lignesTriees, ...pagination }
}

/** Compare deux valeurs pour le tri (cases vides toujours en dernier). */
function comparer(a, b, sens) {
  const videA = a === null || a === undefined || a === ''
  const videB = b === null || b === undefined || b === ''
  if (videA || videB) return videA === videB ? 0 : videA ? 1 : -1
  if (typeof a === 'boolean') a = a ? 1 : 0
  if (typeof b === 'boolean') b = b ? 1 : 0
  // Nombres : vrais nombres, ou textes qui ne contiennent qu'un nombre
  // (les montants arrivent parfois en texte depuis l'API : « 1500.00 »)
  if (estUnNombre(a) && estUnNombre(b)) return (Number(a) - Number(b)) * sens
  // Textes : ordre alphabétique français, « 10 » après « 9 », sans tenir compte des accents
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' }) * sens
}

/** Vrai pour 12, 12.5, '12', '-4.0167'... */
function estUnNombre(valeur) {
  return typeof valeur === 'number' || /^-?\d+(\.\d+)?$/.test(String(valeur))
}
