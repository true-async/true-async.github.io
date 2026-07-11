<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { isTutorialCompleted, toggleTutorialCompleted, tutorialSlugFromPath } from './tutorialProgress'

const route = useRoute()

const slug = computed(() => tutorialSlugFromPath(route.path))
const lang = computed(() => {
  const m = route.path.match(/^\/([a-z]{2})\//)
  return m ? m[1] : 'en'
})
const done = computed(() => (slug.value ? isTutorialCompleted(slug.value) : false))

const labels: Record<string, { mark: string; done: string }> = {
  en: { mark: 'Mark as completed', done: 'Completed' },
  ru: { mark: 'Отметить как пройденное', done: 'Пройдено' },
}
const t = computed(() => labels[lang.value] || labels.en)

function onClick() {
  if (slug.value) toggleTutorialCompleted(slug.value)
}
</script>

<template>
  <button
    v-if="slug"
    type="button"
    class="btn btn-secondary tutorial-progress-btn"
    :class="{ 'tutorial-progress-btn--done': done }"
    @click="onClick"
  >
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    {{ done ? t.done : t.mark }}
  </button>
</template>
