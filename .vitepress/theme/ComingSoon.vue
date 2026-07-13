<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const lang = computed(() => {
  const m = route.path.match(/^\/(en|ru|de|es|fr|it|uk|zh|ko)\//)
  return m ? m[1] : 'en'
})

const i18n: Record<string, { title: string; text: string }> = {
  en: { title: 'Coming soon', text: 'The tutorial section is under construction. Check back a little later.' },
  ru: { title: 'Скоро будет', text: 'Раздел с туториалами сейчас в разработке. Загляните чуть позже.' },
  de: { title: 'Demnächst', text: 'Der Tutorial-Bereich ist in Arbeit. Schauen Sie etwas später wieder vorbei.' },
  es: { title: 'Próximamente', text: 'La sección de tutoriales está en construcción. Vuelve un poco más tarde.' },
  fr: { title: 'Bientôt disponible', text: 'La section des tutoriels est en cours de préparation. Revenez un peu plus tard.' },
  it: { title: 'Prossimamente', text: 'La sezione dei tutorial è in costruzione. Torna un po’ più tardi.' },
  uk: { title: 'Незабаром', text: 'Розділ із туторіалами в розробці. Завітайте трохи згодом.' },
  zh: { title: '即将推出', text: '教程板块正在建设中，请稍后再来查看。' },
  ko: { title: '곧 제공됩니다', text: '튜토리얼 섹션을 준비 중입니다. 잠시 후 다시 확인해 주세요.' },
}
const t = computed(() => i18n[lang.value] || i18n.en)
</script>

<template>
  <div class="coming-soon">
    <div class="coming-soon-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10L12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
        <path d="M22 10v6" />
      </svg>
    </div>
    <div class="coming-soon-title">{{ t.title }}</div>
    <p class="coming-soon-text">{{ t.text }}</p>
  </div>
</template>

<style>
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 4rem 1.5rem 5rem;
  border: 1px dashed var(--color-border);
  border-radius: 16px;
  background: var(--color-bg-subtle);
  margin: 1rem 0 2rem;
}
.coming-soon-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  color: #8B7BFF;
  background: rgba(139, 123, 255, 0.12);
}
.coming-soon-icon svg { width: 38px; height: 38px; }
.coming-soon-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}
.coming-soon-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-muted);
  max-width: 46ch;
  margin: 0;
}
</style>
