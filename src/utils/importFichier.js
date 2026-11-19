/**
 * =============================================================================
 * IMPORT DE FICHIERS (Excel .xlsx ou CSV) — librairie ExcelJS
 * =============================================================================
 * Deux fonctions :
 *
 * 1) lireFichier(fichier, colonnes)
 *    Lit un fichier choisi par l'utilisateur et renvoie la liste des lignes,
 *    sous forme d'objets { cle: valeur } (une clé par colonne attendue).
 *      - La 1re ligne du fichier doit contenir les TITRES des colonnes ;
 *      - les titres sont reconnus sans tenir compte des majuscules, des
 *        accents, des espaces ni de l'étoile « * » (ex. « Raison sociale * »
 *        ou « raison_sociale » correspondent tous à « Raison sociale ») ;
 *      - les lignes entièrement vides sont ignorées.
 *
 * 2) telechargerModele({ colonnes, nomFichier, titre })
 *    Crée un fichier Excel « modèle » à remplir : titres en bleu,
 *    une ligne d'exemple et une feuille « Instructions ».
 *
 * Format des colonnes attendues (le même pour les deux fonctions) :
 *     [
 *       { cle: 'code', titre: 'Code', obligatoire: true, exemple: 'CSU-ABO',
 *         aide: 'Code unique du centre' },
 *       ...
 *     ]
 * =============================================================================
 */

/** Charge la librairie ExcelJS seulement quand on en a besoin. */
async function chargerExcelJS() {
  const module = await import('exceljs')
  return module.default || module
}

/**
 * Simplifie un titre de colonne pour la comparaison :
 * « Raison sociale * » -> « raisonsociale ».
 */
function simplifier(texte) {
  return String(texte || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // retire espaces, *, _, -, etc.
}

/**
 * Valeur "simple" d'une cellule Excel (texte, nombre, date AAAA-MM-JJ...).
 * ExcelJS renvoie parfois des objets (formule, lien, texte enrichi).
 */
function valeurCellule(valeur) {
  if (valeur === null || valeur === undefined) return ''
  if (valeur instanceof Date) return valeur.toISOString().substring(0, 10)
  if (typeof valeur === 'object') {
    if ('result' in valeur) return valeurCellule(valeur.result) // formule
    if ('text' in valeur) return valeurCellule(valeur.text) // lien
    if (Array.isArray(valeur.richText)) return valeur.richText.map((r) => r.text).join('') // texte enrichi
    return ''
  }
  return typeof valeur === 'string' ? valeur.trim() : valeur
}

/** Lit un fichier Excel : renvoie un tableau de lignes (tableaux de valeurs). */
/**
 * Retire les COMMENTAIRES de cellules d'un fichier Excel (en mémoire seulement).
 *
 * Pourquoi : certains logiciels écrivent le lien vers les commentaires avec un
 * chemin "absolu" (ex. "/xl/comments/comment1.xml") qu'ExcelJS ne sait pas
 * lire : il plante avec « Cannot read properties of undefined (reading
 * 'comments') ». Les commentaires ne servent pas à l'import, on les enlève.
 *
 * Un fichier .xlsx est un ZIP : on supprime dans chaque feuille les liens
 * "comments" / "vmlDrawing" et la balise <legacyDrawing> qui les utilise.
 */
async function retirerCommentaires(contenu) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(contenu)

  for (const chemin of Object.keys(zip.files)) {
    // Liens de chaque feuille : xl/worksheets/_rels/sheet1.xml.rels
    if (/^xl\/worksheets\/_rels\/.+\.rels$/.test(chemin)) {
      const xml = await zip.file(chemin).async('string')
      zip.file(chemin, xml.replace(/<Relationship\b[^>]*\/(comments|vmlDrawing)"[^>]*\/>/g, ''))
    }
    // Feuille elle-même : xl/worksheets/sheet1.xml
    if (/^xl\/worksheets\/[^/]+\.xml$/.test(chemin)) {
      const xml = await zip.file(chemin).async('string')
      zip.file(chemin, xml.replace(/<legacyDrawing\b[^>]*\/>/g, ''))
    }
  }
  return zip.generateAsync({ type: 'arraybuffer' })
}

async function lireExcel(fichier) {
  const ExcelJS = await chargerExcelJS()
  const classeur = new ExcelJS.Workbook()
  await classeur.xlsx.load(await retirerCommentaires(await fichier.arrayBuffer()))
  const feuille = classeur.worksheets[0]
  if (!feuille) return []

  // On range chaque ligne à sa place (ligne.number) pour garder les bons
  // numéros de ligne même s'il y a des lignes vides au milieu.
  const lignes = []
  feuille.eachRow({ includeEmpty: false }, (ligne) => {
    // ligne.values commence à l'indice 1 (indice 0 vide) : on le retire
    lignes[ligne.number - 1] = ligne.values.slice(1).map(valeurCellule)
  })
  return Array.from(lignes, (ligne) => ligne || []) // lignes vides -> []
}

/**
 * Lit un fichier CSV. Le séparateur est détecté (« ; » pour Excel en français,
 * sinon « , »). Les valeurs entre guillemets sont gérées.
 */
async function lireCsv(fichier) {
  const texte = (await fichier.text()).replace(/^\ufeff/, '') // retire le BOM éventuel
  const premiereLigne = texte.split(/\r?\n/)[0] || ''
  const separateur = premiereLigne.split(';').length >= premiereLigne.split(',').length ? ';' : ','

  const lignes = []
  let ligne = []
  let valeur = ''
  let entreGuillemets = false

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (entreGuillemets) {
      if (c === '"' && texte[i + 1] === '"') { valeur += '"'; i++ } // guillemet doublé
      else if (c === '"') entreGuillemets = false
      else valeur += c
    } else if (c === '"') {
      entreGuillemets = true
    } else if (c === separateur) {
      ligne.push(valeur.trim()); valeur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++
      ligne.push(valeur.trim()); lignes.push(ligne); ligne = []; valeur = ''
    } else {
      valeur += c
    }
  }
  // Dernière ligne (si le fichier ne finit pas par un retour à la ligne)
  if (valeur !== '' || ligne.length) { ligne.push(valeur.trim()); lignes.push(ligne) }
  return lignes
}

/**
 * Lit le fichier et renvoie :
 *   {
 *     lignes:           [{ numero: 2, valeurs: { code: 'X', ... } }, ...]
 *                       (numero = n° de ligne dans le fichier, pour les messages)
 *     colonnesManquantes: ['Code', ...]   colonnes obligatoires absentes du fichier
 *   }
 */
export async function lireFichier(fichier, colonnes) {
  const nom = fichier.name.toLowerCase()
  let tableau
  if (nom.endsWith('.xlsx')) tableau = await lireExcel(fichier)
  else if (nom.endsWith('.csv')) tableau = await lireCsv(fichier)
  else throw new Error('Format non pris en charge. Utilisez un fichier Excel (.xlsx) ou CSV (.csv).')

  if (tableau.length === 0) throw new Error('Le fichier est vide.')

  // 1re ligne = titres. On cherche, pour chaque colonne attendue, sa position.
  const titres = tableau[0].map(simplifier)
  const positions = {}
  for (const colonne of colonnes) {
    const index = titres.findIndex((t) => t === simplifier(colonne.titre) || t === simplifier(colonne.cle))
    if (index !== -1) positions[colonne.cle] = index
  }

  const colonnesManquantes = colonnes
    .filter((c) => c.obligatoire && positions[c.cle] === undefined)
    .map((c) => c.titre)

  const lignes = []
  tableau.slice(1).forEach((cellules, index) => {
    const valeurs = {}
    for (const colonne of colonnes) {
      const position = positions[colonne.cle]
      const valeur = position === undefined ? '' : cellules[position]
      valeurs[colonne.cle] = valeur === undefined || valeur === null ? '' : valeur
    }
    // On ignore les lignes entièrement vides
    const vide = Object.values(valeurs).every((v) => v === '')
    if (!vide) lignes.push({ numero: index + 2, valeurs })
  })

  return { lignes, colonnesManquantes }
}

/**
 * Crée et télécharge un fichier Excel modèle.
 * @param colonnes   colonnes attendues (voir en haut du fichier)
 * @param nomFichier nom du fichier, sans ".xlsx"
 * @param titre      titre affiché dans la feuille Instructions
 */
export async function telechargerModele({ colonnes, nomFichier, titre }) {
  const ExcelJS = await chargerExcelJS()
  const classeur = new ExcelJS.Workbook()

  // ---------- Feuille 1 : les données à remplir ----------
  const feuille = classeur.addWorksheet('Données', { views: [{ state: 'frozen', ySplit: 1 }] })
  feuille.columns = colonnes.map((c) => ({
    header: c.obligatoire ? `${c.titre} *` : c.titre,
    key: c.cle,
    width: Math.max(16, c.titre.length + 6, String(c.exemple ?? '').length + 4),
  }))
  // Ligne d'exemple (à remplacer par les vraies données)
  feuille.addRow(Object.fromEntries(colonnes.map((c) => [c.cle, c.exemple ?? ''])))

  // Titres : fond bleu, texte blanc en gras
  const entete = feuille.getRow(1)
  entete.height = 22
  entete.eachCell((cellule) => {
    cellule.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0288D1' } }
    cellule.alignment = { vertical: 'middle' }
  })
  // Ligne d'exemple en italique gris
  feuille.getRow(2).font = { italic: true, color: { argb: 'FF6B7280' } }

  // ---------- Feuille 2 : instructions ----------
  const aide = classeur.addWorksheet('Instructions')
  aide.columns = [
    { header: 'Colonne', key: 'titre', width: 26 },
    { header: 'Obligatoire', key: 'obligatoire', width: 13 },
    { header: 'Exemple', key: 'exemple', width: 24 },
    { header: 'Explication', key: 'aide', width: 70 },
  ]
  colonnes.forEach((c) =>
    aide.addRow({ titre: c.titre, obligatoire: c.obligatoire ? 'Oui' : 'Non', exemple: c.exemple ?? '', aide: c.aide || '' }),
  )
  aide.getRow(1).eachCell((cellule) => {
    cellule.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0288D1' } }
  })
  aide.addRow([])
  aide.addRow([`Modèle d'import : ${titre}`]).font = { bold: true }
  aide.addRow(['1. Remplissez la feuille « Données » (une ligne par élément) en supprimant la ligne d\'exemple.'])
  aide.addRow(['2. Les colonnes marquées d\'une étoile * sont obligatoires.'])
  aide.addRow(['3. Si le CODE existe déjà dans l\'application, l\'élément est MIS À JOUR ; sinon il est CRÉÉ.'])
  aide.addRow(['4. Le CODE peut être laissé vide : un code est alors généré automatiquement.'])

  // ---------- Téléchargement ----------
  const contenu = await classeur.xlsx.writeBuffer()
  const blob = new Blob([contenu], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(blob)
  lien.download = `${nomFichier}.xlsx`
  lien.click()
  URL.revokeObjectURL(lien.href)
}

// =============================================================================
// PETITES FONCTIONS UTILES AUX ÉCRANS (conversion des valeurs lues)
// =============================================================================

/** Texte nettoyé ('' si vide). Excel peut renvoyer un nombre (ex. code 123). */
export function enTexte(valeur) {
  return valeur === null || valeur === undefined ? '' : String(valeur).trim()
}

/** Nombre (accepte « 5,4167 » avec virgule). null si vide ; erreur si invalide. */
export function enNombreImport(valeur, nomChamp) {
  const texte = enTexte(valeur).replace(/\s/g, '').replace(',', '.')
  if (texte === '') return null
  const nombre = Number(texte)
  if (Number.isNaN(nombre)) throw new Error(`${nomChamp} : « ${valeur} » n'est pas un nombre`)
  return nombre
}

/** Date AAAA-MM-JJ (accepte aussi JJ/MM/AAAA). null si vide ; erreur si invalide. */
export function enDateImport(valeur, nomChamp) {
  const texte = enTexte(valeur)
  if (texte === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(texte)) return texte
  const morceaux = texte.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (morceaux) return `${morceaux[3]}-${morceaux[2].padStart(2, '0')}-${morceaux[1].padStart(2, '0')}`
  throw new Error(`${nomChamp} : « ${valeur} » n'est pas une date (format JJ/MM/AAAA)`)
}

/** Oui / Non -> true / false (null si vide). */
export function enOuiNon(valeur) {
  const texte = enTexte(valeur).toLowerCase()
  if (texte === '') return null
  return ['oui', 'o', 'yes', 'y', 'vrai', 'true', '1', 'x'].includes(texte)
}

/** Cherche un élément d'une liste par son code (sans tenir compte des majuscules). */
export function trouverParCode(liste, code) {
  const cherche = enTexte(code).toLowerCase()
  if (!cherche) return null
  return liste.find((element) => enTexte(element.code).toLowerCase() === cherche) || null
}

/**
 * Retire les champs vides d'un objet.
 * Utile pour une MISE À JOUR par import : une case vide dans le fichier
 * ne doit pas effacer la valeur déjà enregistrée.
 */
export function sansChampsVides(objet) {
  return Object.fromEntries(
    Object.entries(objet).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )
}
