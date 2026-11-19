/**
 * =============================================================================
 * ALERTES ET NOTIFICATIONS (SweetAlert2) — même fonctionnement que le district
 * =============================================================================
 * 1) NOTIFICATION en haut à droite (disparaît toute seule) :
 *      notifier('succes', 'Fournisseur enregistré.')
 *    (dans les écrans : store.dispatch('notifications/succes', '...'))
 *
 * 2) CONFIRMATION :
 *      if (!(await confirmer({ titre: 'Désactiver ?', texte: '…', boutonConfirmer: 'Oui', danger: true }))) return
 *
 * 3) Raccourcis utilisés par les écrans du lot 1 : succes(), erreur(), echapper().
 * =============================================================================
 */
import Swal from 'sweetalert2'
import { messageErreur } from '../services/api'

// Couleurs de l'application (les mêmes que dans src/style.css)
const BLEU = '#0288d1'
const ROUGE = '#b91c1c'
const GRIS = '#6b7280'

const Notification = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  showCloseButton: true,
  timer: 3500,
  timerProgressBar: true,
  customClass: { popup: 'notification-swal' },
  didOpen: (fenetre) => {
    fenetre.addEventListener('mouseenter', Swal.stopTimer)
    fenetre.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

/**
 * Notification en haut à droite.
 * @param type  'succes' | 'erreur' | 'info' | 'attention'
 */
export function notifier(type, texte) {
  const icones = { succes: 'success', erreur: 'error', info: 'info', attention: 'warning' }
  Notification.fire({ icon: icones[type] || 'info', title: texte })
}

/**
 * Fenêtre de confirmation. Renvoie true si l'utilisateur confirme.
 * Forme du district : confirmer({ titre, texte, boutonConfirmer, boutonAnnuler, danger })
 * Forme courte (lot 1) : confirmer(titre, html, bouton)
 */
export async function confirmer(options, html, bouton) {
  const {
    titre,
    texte = '',
    boutonConfirmer = 'Oui, confirmer',
    boutonAnnuler = 'Annuler',
    danger = false,
  } = typeof options === 'object' ? options : { titre: options, boutonConfirmer: bouton ?? 'Confirmer', danger: true }

  const resultat = await Swal.fire({
    title: titre,
    text: html ? undefined : texte,
    html: html || undefined,
    icon: danger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: boutonConfirmer,
    cancelButtonText: boutonAnnuler,
    confirmButtonColor: danger && typeof options === 'object' ? ROUGE : BLEU,
    cancelButtonColor: GRIS,
    reverseButtons: true,
    focusCancel: danger,
    allowOutsideClick: false,
  })
  return resultat.isConfirmed
}

/** Demande un texte (ex. motif). Renvoie le texte, ou null si annulé. */
export async function demanderTexte({ titre, texte = '', libelle = '', boutonConfirmer = 'Valider', obligatoire = true }) {
  const resultat = await Swal.fire({
    title: titre,
    text: texte,
    input: 'textarea',
    inputLabel: libelle,
    inputAttributes: { maxlength: '500' },
    showCancelButton: true,
    confirmButtonText: boutonConfirmer,
    cancelButtonText: 'Annuler',
    confirmButtonColor: BLEU,
    cancelButtonColor: GRIS,
    reverseButtons: true,
    allowOutsideClick: false,
    inputValidator: (valeur) => (obligatoire && !valeur.trim() ? 'Ce champ est obligatoire.' : undefined),
  })
  return resultat.isConfirmed ? resultat.value.trim() : null
}

/** Notification de réussite. */
export const succes = (titre, texte) => notifier('succes', texte ? `${titre} — ${texte}` : titre)

/** Fenêtre d'erreur (message de l'API ou de vérification). */
export const erreur = (e, titre = 'Erreur') =>
  Swal.fire({
    icon: 'error',
    title: titre,
    html: `<div style="white-space:pre-line;text-align:left">${echapper(messageErreur(e))}</div>`,
    confirmButtonColor: BLEU,
  })

export const echapper = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
