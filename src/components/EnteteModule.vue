<!--
  En-tête bleu affiché en haut de chaque module (même style que le bandeau
  de l'accueil).

  Utilisation :
      <EnteteModule icone="utilisateurs" titre="Utilisateurs"
                    description="Comptes, profils et droits d'accès." />

  Un bouton (ou autre contenu) peut être placé à droite avec le slot "actions" :
      <EnteteModule ...>
        <template #actions><button>...</button></template>
      </EnteteModule>
-->
<template>
  <section class="entete-module">
    <div class="entete-icone"><Icone :nom="icone" :taille="28" /></div>
    <div class="entete-texte">
      <h2>{{ titre }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="entete-actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup>
import Icone from '@/components/Icone.vue'

defineProps({
  icone: { type: String, required: true },
  titre: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<style scoped>
.entete-module {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(120deg, var(--primary) 0%, var(--primary-dark) 100%);
  box-shadow: 0 10px 28px rgba(2, 119, 189, 0.25);
}
.entete-icone {
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.2);
}
.entete-texte { flex: 1; }
.entete-module h2 { margin: 0; font-size: 1.4rem; }
.entete-module p { margin: 0.2rem 0 0; opacity: 0.9; }
.entete-actions { display: flex; gap: 0.5rem; }

/* Téléphone (§ 17) : en-tête compact, boutons sous le titre */
@media (max-width: 600px) {
  .entete-module { flex-wrap: wrap; gap: 0.6rem 0.8rem; padding: 0.85rem 1rem; border-radius: 14px; }
  .entete-icone { width: 40px; height: 40px; border-radius: 11px; }
  .entete-icone :deep(svg) { width: 22px; height: 22px; }
  .entete-texte { min-width: 0; flex-basis: calc(100% - 60px); }
  .entete-module h2 { font-size: 1.1rem; }
  .entete-module p { font-size: 0.82rem; }
  .entete-actions { flex-basis: 100%; flex-wrap: wrap; }
}
</style>
