<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { completedTutorials, isTutorialCompleted } from './tutorialProgress'
import { tutorialSections, tutorialStrings } from './tutorialData'

const route = useRoute()
const lang = computed(() => {
  const m = route.path.match(/^\/([a-z]{2})\//)
  return m ? m[1] : 'en'
})

const t = computed(() => tutorialStrings(lang.value))
const sections = computed(() => tutorialSections(lang.value))

const totalCount = computed(() => sections.value.reduce((n, s) => n + s.cards.length, 0))
const doneCount = computed(() => {
  // Touch completedTutorials so this recomputes on every toggle.
  void completedTutorials.value
  return sections.value.reduce(
    (n, s) => n + s.cards.filter((c) => isTutorialCompleted(c.slug)).length,
    0,
  )
})
</script>

<template>
  <p class="tutorial-progress-count">{{ doneCount }} / {{ totalCount }} {{ t.progress }}</p>
  <template v-for="section in sections" :key="section.title">
    <h2 class="tutorial-section-title">{{ section.title }}</h2>
    <div class="tutorial-grid">
      <a
        v-for="tut in section.cards"
        :key="tut.slug"
        :href="tut.url"
        class="lesson-card"
        :class="{ 'lesson-card--done': isTutorialCompleted(tut.slug) }"
      >
        <div class="lesson-card-glow"></div>
        <div class="lesson-card-meta">
          <span :class="['lesson-tag', `lesson-tag--${tut.tagColor}`]">{{ tut.tag }}</span>
          <svg v-if="isTutorialCompleted(tut.slug)" class="lesson-done-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h3>{{ tut.title }}</h3>
        <p>{{ tut.body }}</p>
        <div class="lesson-read-more">
          {{ t.readMore }}
          <svg class="lesson-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
      </a>
    </div>
  </template>
</template>
