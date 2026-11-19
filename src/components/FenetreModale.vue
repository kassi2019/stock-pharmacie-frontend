<!--
  =============================================================================
  FENÊTRE MODALE (fenêtre qui s'ouvre au-dessus de la page)
  =============================================================================
  Utilisée pour les formulaires de création / modification.

  Utilisation :
      <FenetreModale v-if="formulaireOuvert" titre="Nouveau centre" @fermer="formulaireOuvert = false">
        ... contenu du formulaire ...
        <template #pied>
          <button @click="enregistrer">Enregistrer</button>
        </template>
      </FenetreModale>

  - "titre"  : texte affiché en haut ;
  - "large"  : fenêtre plus large (pour les gros formulaires / tableaux) ;
  - "tres-large" : encore plus large (documents avec beaucoup de colonnes) ;
  - "plein-ecran" : occupe presque tout l'écran (grands tableaux : rapport centre) ;
  - @fermer  : émis quand l'utilisateur clique sur la croix ×.

  ⚠ Volontairement, la fenêtre NE se ferme PAS toute seule :
    - ni en cliquant à côté, ni avec la touche Échap ;
    - ni après un enregistrement réussi : les champs sont alors VIDÉS pour
      une nouvelle saisie (à faire dans l'écran, ex. ouvrirFormulaire()).
    C'est l'utilisateur qui la ferme lui-même (croix × ou bouton « Fermer »),
    pour ne pas perdre une saisie par erreur.
  =============================================================================
-->
<template>
  <div class="fond">
    <div class="fenetre" :class="{ large, 'tres-large': tresLarge, 'plein-ecran': pleinEcran }" role="dialog" aria-modal="true">
      <header class="entete">
        <h3>{{ titre }}</h3>
        <button class="fermer" title="Fermer" @click="emit('fermer')">×</button>
      </header>

      <div class="corps">
        <slot />
      </div>

      <!-- Zone des boutons (facultative) -->
      <footer v-if="$slots.pied" class="pied">
        <slot name="pied" />
      </footer>
    </div>
  </div>
</template>

<script setup>
defineProps({
  titre: { type: String, default: '' },
  large: { type: Boolean, default: false },
  /** Fenêtre encore plus large (documents avec beaucoup de colonnes : commandes, réceptions) */
  tresLarge: { type: Boolean, default: false },
  /** Fenêtre sur presque tout l'écran (tableaux avec beaucoup de colonnes et de lignes) */
  pleinEcran: { type: Boolean, default: false },
})
const emit = defineEmits(['fermer'])
</script>

<style scoped>
.fond {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(1, 47, 79, 0.35);
  backdrop-filter: blur(2px);
}
.fenetre {
  width: 100%;
  max-width: 620px;
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.fenetre.large { max-width: 900px; }
.fenetre.tres-large { max-width: 1200px; }
.fenetre.plein-ecran { max-width: none; height: calc(100vh - 2rem); }

.entete {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  border-top: 5px solid var(--primary);
}
.entete h3 { margin: 0; font-size: 1.1rem; color: var(--primary-dark); }
.fermer {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 8px;
  background: #f3f5f7;
  color: var(--muted);
  font-size: 1.4rem;
  line-height: 1;
}
.fermer:hover { background: #fdecec; color: var(--danger); }

.corps { padding: 1.25rem 1.5rem; overflow-y: auto; }
.plein-ecran .corps { flex: 1; }

.pied {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.9rem 1.5rem;
  border-top: 1px solid var(--border);
  background: #fafbfc;
}
</style>
