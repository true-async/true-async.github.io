<script setup lang="ts">
import { computed } from 'vue'
import { inBrowser } from 'vitepress'

const currentLang = computed(() => {
  if (!inBrowser) return 'en'
  const match = window.location.pathname.match(/^\/(en|ru|de|es|fr|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
})

const i18n: Record<string, { title: string; message: string; home: string; docs: string }> = {
  en: { title: '404', message: 'Page not found', home: 'Go Home', docs: 'Documentation' },
  ru: { title: '404', message: 'Страница не найдена', home: 'На главную', docs: 'Документация' },
  de: { title: '404', message: 'Seite nicht gefunden', home: 'Startseite', docs: 'Dokumentation' },
  es: { title: '404', message: 'Página no encontrada', home: 'Inicio', docs: 'Documentación' },
  fr: { title: '404', message: 'Page non trouvée', home: 'Accueil', docs: 'Documentation' },
  it: { title: '404', message: 'Pagina non trovata', home: 'Home', docs: 'Documentazione' },
  ko: { title: '404', message: '페이지를 찾을 수 없습니다', home: '홈으로', docs: '문서' },
  uk: { title: '404', message: 'Сторінку не знайдено', home: 'На головну', docs: 'Документація' },
  zh: { title: '404', message: '页面未找到', home: '返回首页', docs: '文档' },
}

const t = computed(() => i18n[currentLang.value] || i18n.en)
</script>

<template>
  <div class="not-found">
    <div class="not-found-content">
      <h1 class="not-found-code">404</h1>
      <p class="not-found-message">{{ t.message }}</p>
      <div class="not-found-actions">
        <a :href="`/${currentLang}/`" class="btn btn-primary btn-lg">{{ t.home }}</a>
        <a :href="`/${currentLang}/docs.html`" class="btn btn-secondary btn-lg">{{ t.docs }}</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 3.5rem - 200px);
  padding: 4rem 1.5rem;
  text-align: center;
}

.not-found-code {
  font-size: 8rem;
  font-weight: 700;
  line-height: 1;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light, #8b7cf7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem;
}

.not-found-message {
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  margin: 0 0 2rem;
}

.not-found-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.not-found-actions a.btn-primary {
  background: var(--color-primary);
  color: #fff !important;
}

.not-found-actions a.btn-primary:hover {
  background: var(--color-primary-dark);
  color: #fff !important;
}

.not-found-actions a.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text) !important;
  box-shadow: 0 1px 3px rgba(0,0,0,.06), inset 0 0 0 1px rgba(0,0,0,.08);
}

.not-found-actions a.btn-secondary:hover {
  background: var(--color-bg-subtle);
}
</style>
