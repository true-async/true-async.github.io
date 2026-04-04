<script setup lang="ts">
import { ref, defineAsyncComponent, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vitepress'

const VPLocalSearchBox = defineAsyncComponent(() =>
  import('vitepress/dist/client/theme-default/components/VPLocalSearchBox.vue')
)

const route = useRoute()
const menuOpen = ref(false)
const langOpen = ref(false)
const showSearch = ref(false)
const isDark = ref(false)

function openSearch() {
  showSearch.value = true
}

function onSearchKeydown(e: KeyboardEvent) {
  if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    showSearch.value = true
  }
  if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
    e.preventDefault()
    showSearch.value = true
  }
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  window.addEventListener('keydown', onSearchKeydown)
  // Restore saved theme or use system preference
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})
onUnmounted(() => {
  window.removeEventListener('keydown', onSearchKeydown)
})

const languages = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'uk', label: 'Українська' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
]

const navItems = [
  { key: 'home', path: '/' },
  { key: 'docs', path: '/docs.html' },
  { key: 'download', path: '/download.html' },
  { key: 'rfc', path: '/rfc.html' },
  { key: 'motivation', path: '/motivation.html' },
  { key: 'architecture', path: '/architecture.html' },
  { key: 'contributing', path: '/contributing.html' },
]

const navLabels: Record<string, Record<string, string>> = {
  en: { home: 'Home', docs: 'Documentation', download: 'Download', rfc: 'RFC', motivation: 'Motivation', architecture: 'Architecture', contributing: 'Contributing' },
  ru: { home: 'Главная', docs: 'Документация', download: 'Скачать', rfc: 'RFC', motivation: 'Мотивация', architecture: 'Архитектура', contributing: 'Участие' },
  de: { home: 'Startseite', docs: 'Dokumentation', download: 'Download', rfc: 'RFC', motivation: 'Motivation', architecture: 'Architektur', contributing: 'Mitmachen' },
  fr: { home: 'Accueil', docs: 'Documentation', download: 'Telecharger', rfc: 'RFC', motivation: 'Motivation', architecture: 'Architecture', contributing: 'Contribuer' },
  es: { home: 'Inicio', docs: 'Documentación', download: 'Descargar', rfc: 'RFC', motivation: 'Motivación', architecture: 'Arquitectura', contributing: 'Contribuir' },
  it: { home: 'Home', docs: 'Documentazione', download: 'Download', rfc: 'RFC', motivation: 'Motivazione', architecture: 'Architettura', contributing: 'Contribuire' },
  uk: { home: 'Головна', docs: 'Документація', download: 'Завантажити', rfc: 'RFC', motivation: 'Мотивація', architecture: 'Архітектура', contributing: 'Участь' },
  zh: { home: '首页', docs: '文档', download: '下载', rfc: 'RFC', motivation: '动机', architecture: '架构', contributing: '参与贡献' },
  ko: { home: '홈', docs: '문서', download: '다운로드', rfc: 'RFC', motivation: '동기', architecture: '아키텍처', contributing: '기여하기' },
}

function getCurrentLang(): string {
  const path = route.path
  const match = path.match(/^\/(en|ru|de|fr|es|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
}

function getNavLabel(key: string): string {
  const lang = getCurrentLang()
  return navLabels[lang]?.[key] ?? navLabels.en[key] ?? key
}

function isActive(key: string): boolean {
  const path = route.path
  const lang = getCurrentLang()
  if (key === 'home') return path === '/' || path === `/${lang}/` || path === `/${lang}/index.html`
  if (key === 'docs') return path.startsWith(`/${lang}/docs`)
  return path.startsWith(`/${lang}/${key}`)
}

function langPath(code: string): string {
  const path = route.path
  const lang = getCurrentLang()
  return path.replace(`/${lang}/`, `/${code}/`)
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function toggleLang(e: Event) {
  e.stopPropagation()
  langOpen.value = !langOpen.value
}

// Close lang dropdown on outside click
if (typeof document !== 'undefined') {
  document.addEventListener('click', () => {
    langOpen.value = false
  })
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <a :href="`/${getCurrentLang()}/`" class="navbar-brand">
        <img src="/assets/logo-header.png" alt="" width="28" height="28">
        <span>TrueAsync</span>
      </a>

      <button class="navbar-toggle" @click="toggleMenu" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div class="navbar-menu" :class="{ open: menuOpen }">
        <ul class="navbar-nav">
          <li v-for="item in navItems" :key="item.key">
            <a
              :href="`/${getCurrentLang()}${item.path}`"
              class="navbar-link"
              :class="{ active: isActive(item.key) }"
            >{{ getNavLabel(item.key) }}</a>
          </li>
        </ul>

        <div class="navbar-actions">
          <button class="search-button" @click="openSearch" type="button" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span class="search-button-label">Search</span>
            <kbd class="search-kbd">Ctrl K</kbd>
          </button>

          <div class="lang-dropdown" :class="{ open: langOpen }">
            <button class="lang-dropdown-toggle" @click="toggleLang" type="button">
              {{ getCurrentLang().toUpperCase() }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="lang-dropdown-menu">
              <a
                v-for="lang in languages"
                :key="lang.code"
                :href="langPath(lang.code)"
                class="lang-option"
                :class="{ active: lang.code === getCurrentLang() }"
              >{{ lang.label }}</a>
            </div>
          </div>

          <button class="theme-toggle" @click="toggleTheme" type="button" :aria-label="isDark ? 'Light mode' : 'Dark mode'">
            <!-- Sun icon (shown in dark mode) -->
            <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <!-- Moon icon (shown in light mode) -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>

          <a href="https://github.com/true-async" class="github-link" target="_blank" rel="noopener" aria-label="GitHub">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          </a>

          <a href="https://discord.gg/yqBQPBHKp5" class="github-link" target="_blank" rel="noopener" aria-label="Discord">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.046.046 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.027-.07 8.735 8.735 0 0 1-1.248-.595.05.05 0 0 1-.005-.083c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007c.08.066.164.132.248.195a.05.05 0 0 1-.004.083c-.398.232-.805.43-1.249.596a.05.05 0 0 0-.027.07c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019z"/></svg>
          </a>
        </div>
      </div>
    </div>
    <VPLocalSearchBox v-if="showSearch" @close="showSearch = false" />
  </nav>
</template>

<style scoped>
.search-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85em;
  transition: border-color 0.2s, color 0.2s;
  white-space: nowrap;
}
.search-button:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}
.search-button-label {
  display: none;
}
.search-kbd {
  display: none;
  font-family: inherit;
  font-size: 0.8em;
  padding: 1px 5px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-muted);
  background: var(--color-bg);
}
@media (min-width: 768px) {
  .search-button-label { display: inline; }
  .search-kbd { display: inline; }
}
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  padding: 0;
}
.theme-toggle svg {
  width: 16px;
  height: 16px;
}
.theme-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}
</style>
