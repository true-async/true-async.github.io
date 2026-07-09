<script setup>
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { roadmap } from './roadmapData'
import { roadmapI18n } from './roadmapI18n'

const route = useRoute()
const lang = computed(() => route.path.match(/^\/(en|ru|de|es|fr|it|uk|zh|ko)\//)?.[1] || 'en')
const t = computed(() => roadmapI18n[lang.value] || roadmapI18n.en)
const en = roadmapI18n.en

// Per-key fallback to English so a partially-translated locale never shows a raw id.
const sectionTitle = (id) => (t.value.sections[id] || en.sections[id]).title
const sectionSubtitle = (id) => (t.value.sections[id] || en.sections[id]).subtitle
const milestoneTitle = (id) => t.value.milestones[id] || en.milestones[id] || id

function badgeLabel(status) {
  const ui = t.value.ui
  return status === 'done' ? ui.badgeDone : status === 'active' ? ui.badgeActive : ui.badgePlanned
}
</script>

<template>
  <div class="roadmap-container">
    <section
      v-for="section in roadmap"
      :key="section.id"
      class="roadmap-section"
    >
      <header class="roadmap-section-header">
        <h2>{{ sectionTitle(section.id) }}</h2>
        <p v-if="sectionSubtitle(section.id)">{{ sectionSubtitle(section.id) }}</p>
      </header>
      <div class="roadmap-timeline">
        <div
          v-for="milestone in section.milestones"
          :key="milestone.id"
          class="roadmap-milestone"
          :class="`roadmap-milestone--${milestone.status}`"
        >
          <div class="roadmap-marker"></div>
          <div class="roadmap-card">
            <div class="roadmap-card-header">
              <div class="roadmap-card-title-row">
                <h3>v{{ milestone.version }} &mdash; {{ milestoneTitle(milestone.id) }}</h3>
                <span
                  v-if="milestone.tag"
                  class="roadmap-tag"
                  :class="milestone.tagStyle ? `roadmap-tag--${milestone.tagStyle}` : ''"
                >{{ milestone.tag }}</span>
              </div>
              <div class="roadmap-card-meta">
                <span v-if="milestone.date" class="roadmap-date">{{ milestone.date }}</span>
                <span
                  class="roadmap-badge"
                  :class="`roadmap-badge--${milestone.status}`"
                >{{ badgeLabel(milestone.status) }}</span>
              </div>
            </div>
            <ul class="roadmap-features">
              <li
                v-for="(feature, idx) in milestone.features"
                :key="idx"
                class="roadmap-feature"
                :class="`roadmap-feature--${feature.status}`"
              >
                <span class="roadmap-feature-dot"></span>
                {{ feature.name }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.roadmap-section + .roadmap-section {
  margin-top: 3rem;
}

.roadmap-section-header {
  margin-bottom: 1.25rem;
}

.roadmap-section-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.roadmap-section-header p {
  margin: 0;
  color: var(--vp-c-text-2, #6b7280);
  font-size: 0.95rem;
}
</style>
