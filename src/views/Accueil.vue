<!--
  Page d'accueil « lanceur » (même présentation que l'application de district) :
    1. Bandeau bleu : salutation + chiffres clés en pastilles blanches ;
    2. Bandeau rouge des URGENCES ;
    3. Grandes tuiles en dégradé de bleu : TOUS les modules ; ceux non attribués au
       profil sont GRISÉS (cadenas, non cliquables). Badge d'alerte en coin
       (rouge = urgent, orange = à traiter, bleu = information) et alertes en bas de tuile ;
    4. Alertes de stock réelles : lots périmés à retirer, ruptures, péremptions proches.
  Tuiles générées depuis src/utils/modules.js ; chiffres et badges calculés par
  le serveur (GET /api/accueil/resume), actualisés toutes les 30 s.
-->
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import api from '../services/api'
import Icone from '../components/Icone.vue'
import { MODULES, moduleParRoute } from '../utils/modules'
import { date, nombre } from '../utils/format'
import { estIos, estInstallee, estMobile, installationPossible, installer } from '../utils/mobile'

const store = useStore()
const utilisateur = computed(() => store.state.auth.utilisateur)

const salutation = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'
const dateDuJour = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Tous les modules ; « autorise » = le profil connecté y a accès (sinon tuile grisée). */
const tousLesModules = computed(() =>
  MODULES.filter((m) => m.tuile !== false && (!m.mobileSeulement || estMobile.value)).map((m) => ({
    ...m,
    autorise: [m.route, ...(m.accesAussi ?? [])].some((code) => store.getters['auth/peutVoir'](code)),
  })),
)
/**
 * Sur téléphone (§ 17) : seulement les modules du mobile auxquels le profil a accès
 * (stock et états, alertes, retraits, péremptions, points financiers) ;
 * « Afficher tous les modules » donne accès à la version complète.
 */
const tousSurMobile = ref(false)
const vueMobile = computed(() => estMobile.value && !tousSurMobile.value)
const modulesAffiches = computed(() =>
  vueMobile.value ? tousLesModules.value.filter((m) => m.mobile && m.autorise) : tousLesModules.value,
)
const aideIos = ref(false)
async function installerApplication() {
  if (estIos && !installationPossible.value) {
    aideIos.value = !aideIos.value
    return
  }
  await installer()
}

const accueil = ref({ indicateurs: {}, enAttente: {}, urgences: [] })
const enAttente = computed(() => accueil.value.enAttente ?? {})
const urgences = computed(() => accueil.value.urgences ?? [])
const exemples = computed(() => accueil.value.exemples)

/** Gravité : libellé (lecteurs d'écran) et symbole (jamais la couleur seule). */
const NIVEAUX = {
  URGENT: { libelle: 'Urgent', symbole: '!' },
  ATTENTION: { libelle: 'À traiter', symbole: '•' },
  INFO: { libelle: 'Information', symbole: 'i' },
}
const titreModule = (code) => moduleParRoute(code)?.titre ?? code

/** Pastilles du bandeau (seulement celles renvoyées par le serveur pour ce profil). */
const indicateurs = computed(() => {
  const i = accueil.value.indicateurs ?? {}
  const liste = [
    {
      libelle: 'Produits actifs',
      valeur: nombre(i.produitsActifs ?? 0),
      unite: 'produits',
      lien: { name: 'parametres', query: { onglet: 'medicaments' } },
    },
  ]
  if (i.stock) {
    liste.push({
      libelle: 'Valeur du stock',
      valeur: nombre(i.stock.valeurAchat ?? i.stock.valeurVente),
      unite: 'FCFA',
      detail:
        i.stock.valeurAchat !== undefined
          ? `Au prix d'achat · ${nombre(i.stock.valeurVente)} FCFA au prix de vente`
          : 'Au prix de vente',
      lien: { name: 'parametres', query: { onglet: 'medicaments' } },
    })
  }
  if (i.alertes) {
    const a = i.alertes
    liste.push({
      libelle: 'Alertes stock',
      valeur: nombre(a.total),
      unite: a.total > 1 ? 'alertes' : 'alerte',
      detail:
        [
          a.ruptures && `${a.ruptures} rupture(s)`,
          a.sousStock && `${a.sousStock} sous stock`,
          a.lotsPerimes && `${a.lotsPerimes} lot(s) périmé(s)`,
          a.lotsProches && `${a.lotsProches} lot(s) ≤ ${a.delai} j`,
        ]
          .filter(Boolean)
          .join(' · ') || 'Aucune alerte',
      couleur: a.total > 0 ? 'rouge' : '',
      lien: { name: 'parametres', query: { onglet: 'medicaments' } },
    })
  }
  if (i.receptions) {
    const r = i.receptions
    liste.push({
      libelle: 'Réceptions du mois',
      valeur: r.montant !== undefined ? nombre(r.montant) : nombre(r.nombre),
      unite: r.montant !== undefined ? 'FCFA' : 'réception(s)',
      detail: r.montant !== undefined ? `${r.nombre} réception(s)` : '',
      lien: { name: 'receptions' },
    })
  }
  return liste
})

/** Cartes de la bande d'alertes : périmés (rouge), ruptures / sous stock, péremption proche. */
const alertesStock = computed(() => {
  const e = exemples.value
  if (!e) return []
  return [
    ...e.perimes.map((l) => ({
      produitId: l.produitId,
      produit: l.designation,
      detail: `Lot ${l.numeroLot} · PÉRIMÉ depuis le ${date(l.datePeremption)} · ${l.quantite} plq`,
      couleur: 'rouge',
    })),
    ...e.ruptures.map((p) => ({
      produitId: p.produitId,
      produit: p.designation,
      detail: p.etat === 'RUPTURE' ? 'Rupture de stock' : 'Sous stock (moins de 5 jours)',
      couleur: p.etat === 'RUPTURE' ? 'rouge' : 'orange',
    })),
    ...e.proches.map((l) => ({
      produitId: l.produitId,
      produit: l.designation,
      detail: `Lot ${l.numeroLot} · expire le ${date(l.datePeremption)} · ${l.quantite} plq`,
      couleur: 'orange',
    })),
  ]
})
const voitStock = computed(() => !!accueil.value.indicateurs?.alertes)

async function charger() {
  try {
    const { data } = await api.get('/accueil/resume')
    accueil.value = data
  } catch {
    // Pas bloquant : l'accueil s'affiche sans les chiffres
  }
}

// Actualisation automatique toutes les 30 s (§ 13.2)
let minuterie
onMounted(() => {
  charger()
  minuterie = setInterval(charger, 30_000)
})
onUnmounted(() => clearInterval(minuterie))
</script>

<template>
  <div class="lanceur">
    <!-- 1. Bandeau -->
    <section class="bandeau">
      <div class="bandeau-texte">
        <p class="bandeau-date">{{ dateDuJour }}</p>
        <h2>{{ salutation }}, {{ utilisateur?.nom }}</h2>
        <p>Choisissez un module pour commencer.</p>
      </div>
      <div class="chiffres">
        <router-link
          v-for="ind in indicateurs"
          :key="ind.libelle"
          :to="ind.lien"
          class="chiffre"
          :title="ind.detail"
        >
          <div class="chiffre-valeur" :class="ind.couleur">
            {{ ind.valeur }} <small>{{ ind.unite }}</small>
          </div>
          <div class="chiffre-libelle">{{ ind.libelle }}</div>
          <div v-if="ind.detail" class="chiffre-detail">{{ ind.detail }}</div>
        </router-link>
      </div>
    </section>

    <!-- Application mobile : installation sur l'écran d'accueil (§ 17) -->
    <section v-if="estMobile && !estInstallee && (installationPossible || estIos)" class="installation">
      <Icone nom="entree" :taille="20" />
      <span>Installez PharmaStock sur votre téléphone pour l'ouvrir comme une application.</span>
      <button type="button" @click="installerApplication">Installer</button>
      <p v-if="aideIos" class="aide-ios">Sur iPhone : touchez <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>.</p>
    </section>

    <!-- 2. Urgences -->
    <section v-if="urgences.length" class="urgences" role="alert">
      <span class="urgences-titre">
        <Icone nom="attention" :taille="18" /> {{ urgences.length }} alerte(s) urgente(s)
      </span>
      <router-link v-for="(u, i) in urgences" :key="i" :to="{ name: u.module }" class="urgence">
        <strong>{{ u.nombre }}</strong> {{ u.texte }} <small>— {{ titreModule(u.module) }}</small>
      </router-link>
    </section>

    <!-- 3. Grandes tuiles -->
    <section class="grille">
      <component
        :is="m.autorise ? 'router-link' : 'div'"
        v-for="(m, index) in modulesAffiches"
        :key="m.route"
        v-bind="m.autorise ? { to: { name: m.route } } : { title: 'Module non attribué à votre profil' }"
        class="grande-tuile"
        :class="m.autorise ? 'nuance-' + (index % 4) : 'grisee'"
      >
        <Icone :nom="m.icone" :taille="120" class="filigrane" />

        <div class="tuile-haut">
          <div class="tuile-icone-numero">
            <span class="tuile-icone"><Icone :nom="m.icone" :taille="26" /></span>
            <span class="tuile-numero">{{ String(index + 1).padStart(2, '0') }}</span>
          </div>
          <span v-if="!m.autorise" class="tuile-verrou">
            <Icone nom="cadenas" :taille="14" /> Non attribué
          </span>
        </div>

        <span
          v-if="m.autorise && enAttente[m.route]"
          class="badge-alerte"
          :class="'niveau-' + enAttente[m.route].niveau.toLowerCase()"
          :title="enAttente[m.route].libelle"
          :aria-label="`${NIVEAUX[enAttente[m.route].niveau].libelle} : ${enAttente[m.route].libelle}`"
        >
          {{ enAttente[m.route].nombre > 99 ? '99+' : enAttente[m.route].nombre }}
        </span>

        <div class="tuile-bas">
          <div class="tuile-titre">{{ m.titre }}</div>
          <ul v-if="m.autorise && enAttente[m.route]" class="tuile-alertes">
            <li
              v-for="a in enAttente[m.route].alertes.slice(0, 3)"
              :key="a.texte"
              :class="'niveau-' + a.niveau.toLowerCase()"
            >
              <span class="pastille">{{ NIVEAUX[a.niveau].symbole }}</span>
              <strong>{{ a.nombre }}</strong> {{ a.texte }}
            </li>
          </ul>
          <div v-else class="tuile-description">{{ m.description }}</div>
          <span v-if="m.autorise && !m.disponible" class="tuile-lot">Lot {{ m.lot }} · bientôt</span>
        </div>
      </component>
    </section>

    <!-- Téléphone : accès à la version complète -->
    <button v-if="estMobile" type="button" class="bascule-modules" @click="tousSurMobile = !tousSurMobile">
      {{ tousSurMobile ? 'Afficher seulement les modules du mobile' : 'Afficher tous les modules (version complète)' }}
    </button>

    <!-- 4. Alertes de stock réelles -->
    <template v-if="voitStock && exemples">
      <router-link
        v-if="accueil.indicateurs.alertes.lotsPerimes > 0"
        :to="{ name: 'retraits', query: { onglet: 'peremptions' } }"
        class="bandeau-perimes"
      >
        <Icone nom="attention" :taille="22" />
        <span>
          <strong>{{ accueil.indicateurs.alertes.lotsPerimes }} lot(s) périmé(s) à retirer du stock</strong>
          ({{ exemples.quantitePerimee }} plaque(s)).
        </span>
        <Icone nom="fleche" :taille="18" />
      </router-link>

      <section class="alertes">
        <router-link :to="{ name: 'parametres', query: { onglet: 'medicaments' } }" class="alertes-titre">
          <Icone nom="attention" :taille="18" /> Alertes stock
          <span class="compteurs-alertes">
            <span v-if="accueil.indicateurs.alertes.ruptures" class="c-rouge">
              {{ accueil.indicateurs.alertes.ruptures }} rupture(s)
            </span>
            <span v-if="accueil.indicateurs.alertes.sousStock" class="c-orange">
              {{ accueil.indicateurs.alertes.sousStock }} sous stock
            </span>
            <span v-if="accueil.indicateurs.alertes.lotsProches" class="c-orange">
              {{ accueil.indicateurs.alertes.lotsProches }} lot(s) ≤ {{ accueil.indicateurs.alertes.delai }} j
            </span>
          </span>
        </router-link>
        <div class="alertes-liste">
          <router-link
            v-for="(a, i) in alertesStock"
            :key="i"
            :to="{ name: 'produit', params: { id: a.produitId } }"
            class="alerte"
            :class="a.couleur"
          >
            <strong>{{ a.produit }}</strong>
            <span>{{ a.detail }}</span>
          </router-link>
          <span v-if="!alertesStock.length" class="aucune-alerte">✔ Aucune alerte de stock.</span>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.lanceur {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* ─── 1. Bandeau bleu ─── */
.bandeau {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 2rem;
  border-radius: 18px;
  color: #fff;
  background:
    radial-gradient(circle at 90% -20%, rgb(255 255 255 / 0.22) 0, transparent 45%),
    linear-gradient(120deg, #29b6f6 0%, #0277bd 100%);
  box-shadow: 0 12px 32px rgb(2 119 189 / 0.3);
}
.bandeau h2 {
  margin: 0.2rem 0;
  font-size: 1.7rem;
}
.bandeau p {
  margin: 0;
  opacity: 0.92;
}
.bandeau-date {
  font-size: 0.85rem;
  text-transform: capitalize;
  opacity: 0.8 !important;
}
.chiffres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.chiffre {
  display: block;
  min-width: 150px;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: #fff;
  color: var(--texte);
  text-decoration: none;
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.12);
  transition: transform 0.15s;
}
.chiffre:hover {
  transform: translateY(-2px);
}
.chiffre-valeur {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--primaire-fonce);
}
.chiffre-valeur.rouge {
  color: var(--danger);
}
.chiffre-valeur small {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--gris);
}
.chiffre-libelle {
  font-size: 0.75rem;
  color: var(--gris);
}
.chiffre-detail {
  margin-top: 0.15rem;
  max-width: 210px;
  font-size: 0.68rem;
  color: var(--gris);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── 2. Urgences ─── */
.urgences {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.8rem 1.1rem;
  border-radius: 14px;
  background: #fdecec;
  border: 1px solid #f5b5b5;
}
.urgences-titre {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #b91c1c;
  font-weight: 800;
}
.urgence {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: #fff;
  color: #7f1d1d;
  font-size: 0.85rem;
  text-decoration: none;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}
.urgence:hover {
  background: #dc2626;
  color: #fff;
}
.urgence small {
  opacity: 0.75;
}

/* ─── 3. Grandes tuiles : 5 par ligne, centrées ─── */
.grille {
  --espace: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--espace);
}
.grande-tuile {
  /* 4 tuiles par ligne : 8 modules = 4 en haut, 4 en bas */
  width: calc((100% - 3 * var(--espace)) / 4);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 190px;
  padding: 1.4rem;
  border-radius: 18px;
  color: #fff;
  text-decoration: none;
  box-shadow: 0 10px 24px rgb(2 119 189 / 0.18);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.grande-tuile:hover {
  transform: translateY(-5px) scale(1.01);
  box-shadow: 0 18px 36px rgb(2 119 189 / 0.26);
}

/* Nuances de bleu ciel (une tuile sur quatre) */
.nuance-0 {
  background: linear-gradient(135deg, #29b6f6, #0288d1);
}
.nuance-1 {
  background: linear-gradient(135deg, #4fc3f7, #039be5);
}
.nuance-2 {
  background: linear-gradient(135deg, #0288d1, #01579b);
}
.nuance-3 {
  background: linear-gradient(135deg, #64b5f6, #1e88e5);
}

/* Module non attribué : gris, non cliquable */
.grande-tuile.grisee {
  background: linear-gradient(135deg, #c9cfd4, #a7afb6);
  color: #f4f6f7;
  box-shadow: none;
  cursor: not-allowed;
  filter: saturate(0.2);
  opacity: 0.75;
}
.grande-tuile.grisee:hover {
  transform: none;
  box-shadow: none;
}
.grande-tuile.grisee:hover .filigrane {
  transform: none;
}
.tuile-verrou {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.35);
  color: #4b5563;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Grande icône en filigrane */
.filigrane {
  position: absolute;
  right: -18px;
  bottom: -18px;
  opacity: 0.14;
  transition: transform 0.3s;
}
.grande-tuile:hover .filigrane {
  transform: rotate(-8deg) scale(1.08);
}

.tuile-haut {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.tuile-icone-numero {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.tuile-numero {
  font-size: 1.5rem;
  font-weight: 800;
  opacity: 0.55;
  letter-spacing: 0.02em;
}
.tuile-icone {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgb(255 255 255 / 0.22);
}

/* Badge d'alerte en coin */
.badge-alerte {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  z-index: 2;
  min-width: 30px;
  height: 30px;
  padding: 0 0.5rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 2px solid #fff;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  box-shadow: 0 4px 10px rgb(0 0 0 / 0.25);
}
.badge-alerte.niveau-urgent {
  background: #dc2626;
  animation: pulsation 1.8s ease-out infinite;
}
.badge-alerte.niveau-attention {
  background: #ea7a0c;
}
.badge-alerte.niveau-info {
  background: #1565c0;
}
@keyframes pulsation {
  0% {
    box-shadow: 0 0 0 0 rgb(220 38 38 / 0.7), 0 4px 10px rgb(0 0 0 / 0.25);
  }
  70% {
    box-shadow: 0 0 0 12px rgb(220 38 38 / 0), 0 4px 10px rgb(0 0 0 / 0.25);
  }
  100% {
    box-shadow: 0 0 0 0 rgb(220 38 38 / 0), 0 4px 10px rgb(0 0 0 / 0.25);
  }
}

/* Alertes en bas de tuile */
.tuile-alertes {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.tuile-alertes li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: fit-content;
  max-width: 100%;
  padding: 0.18rem 0.55rem 0.18rem 0.25rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.95);
  color: #1f2937;
  font-size: 0.74rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tuile-alertes li strong {
  font-weight: 800;
}
.tuile-alertes .pastille {
  flex: none;
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 900;
}
.tuile-alertes .niveau-urgent .pastille {
  background: #dc2626;
}
.tuile-alertes .niveau-attention .pastille {
  background: #ea7a0c;
}
.tuile-alertes .niveau-info .pastille {
  background: #1565c0;
}
.tuile-alertes .niveau-urgent {
  color: #991b1b;
}

.tuile-bas {
  position: relative;
}
.tuile-titre {
  font-size: 1.15rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}
.tuile-description {
  font-size: 0.82rem;
  opacity: 0.92;
  line-height: 1.4;
}
.tuile-lot {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.12rem 0.55rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.25);
  font-size: 0.7rem;
  font-weight: 700;
}

/* ─── 4. Alertes de stock ─── */
.bandeau-perimes {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1.25rem;
  border-radius: 14px;
  background: linear-gradient(120deg, #dc2626, #b91c1c);
  color: #fff;
  text-decoration: none;
  box-shadow: 0 8px 20px rgb(185 28 28 / 0.3);
}
.bandeau-perimes span {
  flex: 1;
}
.bandeau-perimes:hover {
  filter: brightness(1.05);
}
.alertes {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: #fff;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 0.05),
    0 8px 24px rgb(2 136 209 / 0.08);
}
.alertes-titre {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  color: var(--danger);
  text-decoration: none;
}
.compteurs-alertes {
  display: inline-flex;
  gap: 0.35rem;
  margin-left: 0.4rem;
}
.compteurs-alertes span {
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}
.c-rouge {
  background: #fdecec;
  color: var(--danger);
}
.c-orange {
  background: #fff1e0;
  color: #b35c00;
}
.alertes-liste {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 2px;
}
.alerte {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  border-left: 4px solid var(--ciel);
  background: var(--ciel-pale);
  color: inherit;
  text-decoration: none;
  font-size: 0.8rem;
}
.alerte span {
  color: var(--gris);
}
.alerte.rouge {
  border-left-color: var(--danger);
  background: #fdecec;
}
.alerte.orange {
  border-left-color: #ea7a0c;
  background: #fff4e5;
}
.alerte:hover {
  filter: brightness(0.97);
}
.aucune-alerte {
  align-self: center;
  font-size: 0.85rem;
  color: var(--primaire-fonce);
}

/* ─── Écrans plus petits : moins de tuiles par ligne ─── */
@media (max-width: 1100px) {
  .grande-tuile {
    width: calc((100% - var(--espace)) / 2);
  }
}
@media (max-width: 800px) {
  .grande-tuile {
    width: calc((100% - var(--espace)) / 2);
  }
  .alertes {
    flex-direction: column;
    align-items: stretch;
  }
}
@media (max-width: 520px) {
  .grande-tuile {
    width: 100%;
  }
}
/* ─── Téléphone (§ 17) : bandeau compact, chiffres 2 × 2, tuiles sur 2 colonnes ─── */
@media (max-width: 768px) {
  .lanceur {
    gap: 1rem;
  }
  .bandeau {
    padding: 1.1rem;
    gap: 1rem;
  }
  .bandeau h2 {
    font-size: 1.25rem;
  }
  .chiffres {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    gap: 0.5rem;
  }
  .chiffre {
    min-width: 0;
    padding: 0.6rem 0.75rem;
  }
  .chiffre-detail {
    display: none;
  }
  .grille {
    --espace: 0.75rem;
  }
  .grande-tuile {
    width: calc((100% - var(--espace)) / 2);
    min-height: 0;
    padding: 0.9rem;
  }
  .grande-tuile .tuile-description,
  .grande-tuile .filigrane {
    display: none;
  }
  .alertes {
    flex-direction: column;
    align-items: stretch;
  }
}
.installation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 0.8rem;
  padding: 0.8rem 1rem;
  border-radius: 14px;
  background: #fff;
  color: var(--primaire-fonce);
  box-shadow: 0 2px 10px rgb(2 136 209 / 0.12);
}
.installation span {
  flex: 1;
  min-width: 180px;
  font-size: 0.88rem;
}
.aide-ios {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.85rem;
  color: var(--gris);
}
.bascule-modules {
  align-self: center;
  background: transparent;
  color: var(--primaire);
  font-weight: 600;
  text-decoration: underline;
  box-shadow: none;
}
@media (prefers-reduced-motion: reduce) {
  .badge-alerte.niveau-urgent {
    animation: none;
  }
  .grande-tuile,
  .filigrane {
    transition: none;
  }
}
</style>
