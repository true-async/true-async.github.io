<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { completedTutorials, isTutorialCompleted, TUTORIAL_SLUGS } from './tutorialProgress'

const route = useRoute()
const lang = computed(() => {
  const m = route.path.match(/^\/([a-z]{2})\//)
  return m ? m[1] : 'en'
})

// Structure (slug, tag color) is locale-independent; strings are per-locale, index-aligned to TUTORIAL_SLUGS.
const tagColors = [
  'purple', 'orange', 'purple', 'orange', 'orange',
  'purple', 'teal', 'teal', 'blue', 'teal',
  'teal', 'teal', 'blue', 'blue', 'blue',
]

const strings: Record<string, { progress: string; readMore: string; items: { title: string; body: string }[] }> = {
  ru: {
    progress: 'пройдено',
    readMore: 'Читать',
    items: [
      { title: 'Корутины', body: 'Первое знакомство с корутинами: spawn() и конкурентное выполнение.' },
      { title: 'Отмена', body: 'Как работает cancel() и кооперативная отмена корутин.' },
      { title: 'Await', body: 'Зачем нужен await() и как он работает с корутинами.' },
      { title: 'Исключения', body: 'Как исключения из корутины пробрасываются через await().' },
      { title: 'Таймауты', body: 'Ограничение времени ожидания await() через timeout().' },
      { title: 'Future', body: 'Future и FutureState: обещание результата, которое не привязано к корутине.' },
      { title: 'Каналы', body: 'Channel: поток значений между корутинами, пул воркеров и обратное давление.' },
      { title: 'Scope', body: 'Кто владеет корутинами, ждёт их завершения и отменяет всей группой.' },
      { title: 'PDO Pool', body: 'Почему корутинам нельзя делить один PDO и как встроенный пул решает это прозрачно.' },
      { title: 'TaskGroup', body: 'Группа задач с результатами и стратегии ожидания all, race, any.' },
      { title: 'TaskSet', body: 'Поток задач с автоочисткой, joinNext/joinAny/joinAll и цикл супервизора.' },
      { title: 'Конкурентный итератор', body: 'iterate(): конкурентный обход коллекции одной строчкой.' },
      { title: 'Pool', body: 'Async\\Pool: универсальный пул ресурсов с healthcheck и circuit breaker.' },
      { title: 'Потоки', body: 'spawn_thread и ThreadPool: настоящий параллелизм для вычислений.' },
      { title: 'Context', body: 'Где хранить «текущее», когда глобальные переменные перестали работать.' },
    ],
  },
  en: {
    progress: 'completed',
    readMore: 'Read',
    items: [
      { title: 'Coroutines', body: 'Your first look at coroutines: spawn() and concurrent execution.' },
      { title: 'Cancellation', body: 'How cancel() and cooperative cancellation work.' },
      { title: 'Await', body: 'Why await() exists and how it works with coroutines.' },
      { title: 'Exceptions', body: 'How exceptions from a coroutine propagate through await().' },
      { title: 'Timeouts', body: 'Bounding how long await() waits with timeout().' },
      { title: 'Future', body: "Future and FutureState: a promise of a result that isn't tied to a coroutine." },
      { title: 'Channels', body: 'Channel: a stream of values between coroutines, worker pools, and backpressure.' },
      { title: 'Scope', body: 'Who owns a group of coroutines, waits for them, and cancels them together.' },
      { title: 'PDO Pool', body: "Why coroutines can't share one PDO connection, and how the built-in pool solves it transparently." },
      { title: 'TaskGroup', body: 'A group of tasks with results and all, race, any waiting strategies.' },
      { title: 'TaskSet', body: 'A stream of tasks with auto-cleanup, joinNext/joinAny/joinAll, and a supervisor loop.' },
      { title: 'Concurrent Iterator', body: 'iterate(): concurrent traversal of a collection in one line.' },
      { title: 'Pool', body: 'Async\\Pool: a general-purpose resource pool with health checks and a circuit breaker.' },
      { title: 'Threads', body: 'spawn_thread and ThreadPool: real parallelism for CPU-bound work.' },
      { title: 'Context', body: 'Where to keep "the current thing" now that global variables no longer work.' },
    ],
  },
}

const t = computed(() => strings[lang.value] || strings.en)

const tutorials = computed(() =>
  TUTORIAL_SLUGS.map((slug, i) => ({
    slug,
    url: `/${lang.value}/tutors/${slug}.html`,
    tag: String(i + 1).padStart(2, '0'),
    tagColor: tagColors[i],
    title: t.value.items[i].title,
    body: t.value.items[i].body,
  }))
)

const doneCount = computed(() => {
  // Touch completedTutorials so this recomputes on every toggle.
  void completedTutorials.value
  return tutorials.value.filter((tut) => isTutorialCompleted(tut.slug)).length
})
</script>

<template>
  <p class="tutorial-progress-count">{{ doneCount }} / {{ tutorials.length }} {{ t.progress }}</p>
  <div class="tutorial-grid">
    <a
      v-for="tut in tutorials"
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
