<script setup lang="ts">
import { ref, watch, defineAsyncComponent, onMounted, onUnmounted } from 'vue'
import { useRoute, useData } from 'vitepress'

const VPLocalSearchBox = defineAsyncComponent(() =>
  import('vitepress/dist/client/theme-default/components/VPLocalSearchBox.vue')
)

const route = useRoute()
const { theme } = useData()
const menuOpen = ref(false)
const langOpen = ref(false)
const showSearch = ref(false)
const isDark = ref(false)

watch(() => route.path, () => {
  menuOpen.value = false
  langOpen.value = false
})

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
  { key: 'docs', path: '/docs.html', icon: '<path d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3zM4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>' },
  { key: 'download', path: '/download.html', icon: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>' },
  { key: 'rfc', path: '/rfc.html', icon: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 13h6M9 17h6"/>' },
  { key: 'tutorial', path: '/tutorial.html', icon: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/><path d="M22 10v6"/>' },
]

const navLabels: Record<string, Record<string, string>> = {
  en: { home: 'Home', docs: 'Documentation', download: 'Download', rfc: 'RFC', tutorial: 'Tutorial', motivation: 'Motivation', architecture: 'Architecture', contributing: 'Contributing' },
  ru: { home: 'Главная', docs: 'Документация', download: 'Скачать', rfc: 'RFC', tutorial: 'Туториал', motivation: 'Мотивация', architecture: 'Архитектура', contributing: 'Участие' },
  de: { home: 'Startseite', docs: 'Dokumentation', download: 'Download', rfc: 'RFC', tutorial: 'Tutorial', motivation: 'Motivation', architecture: 'Architektur', contributing: 'Mitmachen' },
  fr: { home: 'Accueil', docs: 'Documentation', download: 'Telecharger', rfc: 'RFC', tutorial: 'Tutoriel', motivation: 'Motivation', architecture: 'Architecture', contributing: 'Contribuer' },
  es: { home: 'Inicio', docs: 'Documentación', download: 'Descargar', rfc: 'RFC', tutorial: 'Tutorial', motivation: 'Motivación', architecture: 'Arquitectura', contributing: 'Contribuir' },
  it: { home: 'Home', docs: 'Documentazione', download: 'Download', rfc: 'RFC', tutorial: 'Tutorial', motivation: 'Motivazione', architecture: 'Architettura', contributing: 'Contribuire' },
  uk: { home: 'Головна', docs: 'Документація', download: 'Завантажити', rfc: 'RFC', tutorial: 'Туторіал', motivation: 'Мотивація', architecture: 'Архітектура', contributing: 'Участь' },
  zh: { home: '首页', docs: '文档', download: '下载', rfc: 'RFC', tutorial: '教程', motivation: '动机', architecture: '架构', contributing: '参与贡献' },
  ko: { home: '홈', docs: '문서', download: '다운로드', rfc: 'RFC', tutorial: '튜토리얼', motivation: '동기', architecture: '아키텍처', contributing: '기여하기' },
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
  const lang = getCurrentLang()
  const target = route.path.replace(`/${lang}/`, `/${code}/`)
  const routes: string[] = (theme.value as any).localeRoutes || []
  if (routes.length === 0) return target // no route data — fall back to naive swap
  // Match the target against known pages, tolerating the "/" vs "/index.html" forms.
  const candidates = [target]
  if (target.endsWith('/')) candidates.push(target + 'index.html')
  if (target.endsWith('/index.html')) candidates.push(target.slice(0, -'index.html'.length))
  if (candidates.some((c) => routes.includes(c))) return target
  // No translation for this page — send the user to the target locale's home.
  return `/${code}/`
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

// Swipe-up-to-dismiss for the open mobile menu (touch or held-mouse drag).
const menuEl = ref<HTMLElement | null>(null)
let swipeStartY = 0
let swipeStartX = 0
let swipeTracking = false

function onMenuPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  swipeStartY = e.clientY
  swipeStartX = e.clientX
  swipeTracking = true
}

function onMenuPointerMove(e: PointerEvent) {
  if (!swipeTracking) return
  // A mouse gesture requires the primary button held down.
  if (e.pointerType === 'mouse' && !(e.buttons & 1)) {
    swipeTracking = false
    return
  }
  const dy = e.clientY - swipeStartY
  const dx = e.clientX - swipeStartX
  // Decisive, mostly-vertical upward swipe.
  if (dy < -55 && Math.abs(dy) > Math.abs(dx)) {
    // If the menu can still scroll down, let native scrolling win instead.
    const el = menuEl.value
    const atBottom = !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    if (atBottom) {
      menuOpen.value = false
      swipeTracking = false
    }
  }
}

function onMenuPointerEnd() {
  swipeTracking = false
}

function toggleLang(e: Event) {
  e.stopPropagation()
  langOpen.value = !langOpen.value
}

// Close lang dropdown on outside click
let closeLangDropdown: (() => void) | null = null
onMounted(() => {
  closeLangDropdown = () => { langOpen.value = false }
  document.addEventListener('click', closeLangDropdown)
})
onUnmounted(() => {
  if (closeLangDropdown) {
    document.removeEventListener('click', closeLangDropdown)
  }
})
</script>

<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <a :href="`/${getCurrentLang()}/`" class="navbar-brand">
        <img class="brand-logo brand-logo--light" src="/assets/TrueAsync-flame-light.svg" alt="TrueAsync" width="34" height="34">
        <img class="brand-logo brand-logo--dark" src="/assets/TrueAsync-flame.svg" alt="" aria-hidden="true" width="34" height="34">
        <span>TrueAsync</span>
      </a>

      <button class="navbar-toggle" @click="toggleMenu" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div
        class="navbar-menu"
        :class="{ open: menuOpen }"
        ref="menuEl"
        @pointerdown="onMenuPointerDown"
        @pointermove="onMenuPointerMove"
        @pointerup="onMenuPointerEnd"
        @pointercancel="onMenuPointerEnd"
      >
        <ul class="navbar-nav">
          <li v-for="item in navItems" :key="item.key">
            <a
              :href="`/${getCurrentLang()}${item.path}`"
              class="navbar-link"
              :class="{ active: isActive(item.key) }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
              {{ getNavLabel(item.key) }}
            </a>
          </li>
        </ul>

        <div class="navbar-spacer"></div>

        <div class="navbar-actions">
          <button class="search-button" @click="openSearch" type="button" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <span class="search-button-label">Search docs&hellip;</span>
            <span class="search-kbd">&#8984;K</span>
          </button>

          <a href="https://discord.gg/yqBQPBHKp5" class="nav-box nav-box--glow" target="_blank" rel="noopener" aria-label="Discord">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33A16.6 16.6 0 0 0 15.05 4l-.2.4a15.4 15.4 0 0 1 3.72 1.15 15.2 15.2 0 0 0-12.94 0A15.4 15.4 0 0 1 9.35 4.4L9.15 4a16.6 16.6 0 0 0-4.22 1.33A17.5 17.5 0 0 0 2 17.9a16.8 16.8 0 0 0 5.07 2.57 12.4 12.4 0 0 0 1.09-1.77 10.8 10.8 0 0 1-1.7-.82l.42-.31a11.9 11.9 0 0 0 10.24 0l.42.31a10.8 10.8 0 0 1-1.71.82 12.4 12.4 0 0 0 1.09 1.77A16.8 16.8 0 0 0 22 17.9a17.5 17.5 0 0 0-2.73-12.57ZM8.89 15.55c-1 0-1.82-.92-1.82-2.05s.8-2.06 1.82-2.06 1.84.93 1.82 2.06c0 1.13-.8 2.05-1.82 2.05Zm6.22 0c-1 0-1.82-.92-1.82-2.05s.8-2.06 1.82-2.06 1.84.93 1.82 2.06c0 1.13-.8 2.05-1.82 2.05Z"/></svg>
          </a>

          <a href="https://github.com/true-async" class="nav-box nav-box--glow nav-box--github" target="_blank" rel="noopener" aria-label="GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.3-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.05 10.05 0 0 0 22 12.3C22 6.6 17.5 2 12 2Z"/></svg>
          </a>

          <button class="nav-box" @click="toggleTheme" type="button" :aria-label="isDark ? 'Light mode' : 'Dark mode'">
            <!-- Sun icon (shown in dark mode) -->
            <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
            </svg>
            <!-- Moon icon (shown in light mode) -->
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
            </svg>
          </button>

          <div class="lang-dropdown" :class="{ open: langOpen }">
            <button class="lang-dropdown-toggle" @click="toggleLang" type="button">
              <svg class="lang-dropdown-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
              {{ getCurrentLang().toUpperCase() }}
              <svg class="lang-dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="lang-dropdown-menu">
              <a
                v-for="lang in languages"
                :key="lang.code"
                :href="langPath(lang.code)"
                class="lang-option"
                :class="{ active: lang.code === getCurrentLang() }"
              >
                <span class="lang-option-code">{{ lang.code.toUpperCase() }}</span>
                <span class="lang-option-name">{{ lang.label }}</span>
                <svg v-if="lang.code === getCurrentLang()" class="lang-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <VPLocalSearchBox v-if="showSearch" @close="showSearch = false" />
  </nav>
</template>
