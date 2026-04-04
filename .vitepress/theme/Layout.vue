<script setup lang="ts">
import { computed, watch, nextTick } from 'vue'
import { useData, useRoute, inBrowser } from 'vitepress'
import Navbar from './Navbar.vue'
import Footer from './Footer.vue'
import HomePage from './HomePage.vue'
import Sidebar from './Sidebar.vue'
import RoadmapPage from './RoadmapPage.vue'
import DownloadPage from './DownloadPage.vue'
import DocFeedback from './DocFeedback.vue'
import LearningMap from './LearningMap.vue'
import { docsSidebar, architectureSidebar } from './sidebarData'
import { docsSidebarRu, architectureSidebarRu } from './sidebarDataRu'
import { docsSidebarDe, architectureSidebarDe } from './sidebarDataDe'
import { docsSidebarEs, architectureSidebarEs } from './sidebarDataEs'
import { docsSidebarFr, architectureSidebarFr } from './sidebarDataFr'
import { docsSidebarIt, architectureSidebarIt } from './sidebarDataIt'
import { docsSidebarKo, architectureSidebarKo } from './sidebarDataKo'
import { docsSidebarUk, architectureSidebarUk } from './sidebarDataUk'
import { docsSidebarZh, architectureSidebarZh } from './sidebarDataZh'

const { frontmatter, page } = useData()

const supportedLangs = ['en', 'ru', 'de', 'es', 'fr', 'it', 'ko', 'uk', 'zh'] as const

const currentLang = computed(() => {
  const path = page.value.relativePath
  for (const lang of supportedLangs) {
    if (path.startsWith(`${lang}/`)) return lang
  }
  return 'en'
})

const docsSidebarMap: Record<string, any[]> = {
  en: docsSidebar, ru: docsSidebarRu, de: docsSidebarDe, es: docsSidebarEs,
  fr: docsSidebarFr, it: docsSidebarIt, ko: docsSidebarKo, uk: docsSidebarUk, zh: docsSidebarZh,
}

const archSidebarMap: Record<string, any[]> = {
  en: architectureSidebar, ru: architectureSidebarRu, de: architectureSidebarDe, es: architectureSidebarEs,
  fr: architectureSidebarFr, it: architectureSidebarIt, ko: architectureSidebarKo, uk: architectureSidebarUk, zh: architectureSidebarZh,
}

const currentDocsSidebar = computed(() => docsSidebarMap[currentLang.value] || docsSidebar)
const currentArchSidebar = computed(() => archSidebarMap[currentLang.value] || architectureSidebar)

const layout = computed(() => frontmatter.value.layout || 'default')
const isMainDocsPage = computed(() => frontmatter.value.path_key === '/docs.html')

// Re-render KaTeX math formulas after SPA navigation
if (inBrowser) {
  const route = useRoute()
  watch(() => route.path, () => {
    nextTick(() => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        ;(window as any).renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
        })
      }
    })
  })
}
</script>

<template>
  <div>
    <Navbar />

    <!-- Page Header (docs, architecture, roadmap, download) -->
    <div v-if="['docs', 'architecture', 'roadmap'].includes(layout)" class="page-header">
      <div class="page-header-inner" :class="{ 'page-header-inner--narrow': layout === 'roadmap' }">
        <h1>{{ frontmatter.page_title || 'Documentation' }}</h1>
        <p v-if="frontmatter.description">{{ frontmatter.description }}</p>
      </div>
    </div>

    <!-- Docs layout with sidebar -->
    <div v-if="layout === 'docs'" class="docs-layout">
      <Sidebar :sidebar="currentDocsSidebar" />
      <main class="docs-content">
        <Content />
        <LearningMap v-if="isMainDocsPage" />
        <DocFeedback />
      </main>
    </div>

    <!-- Architecture layout with sidebar -->
    <div v-else-if="layout === 'architecture'" class="docs-layout">
      <Sidebar :sidebar="currentArchSidebar" />
      <main class="docs-content">
        <Content />
        <DocFeedback />
      </main>
    </div>

    <!-- Home layout -->
    <main v-else-if="layout === 'home'">
      <HomePage />
    </main>

    <!-- Roadmap layout -->
    <main v-else-if="layout === 'roadmap'" style="">
      <RoadmapPage />
    </main>

    <!-- Download layout -->
    <main v-else-if="layout === 'download'">
      <DownloadPage />
    </main>

    <!-- Page layout (contributing, motivation, rfc) -->
    <template v-else-if="layout === 'page'">
      <div class="page-header">
        <div class="page-header-inner page-header-inner--narrow">
          <h1>{{ frontmatter.page_title || page.title }}</h1>
          <p v-if="frontmatter.description">{{ frontmatter.description }}</p>
        </div>
      </div>
      <main class="page-content">
        <Content />
        <DocFeedback />
      </main>
    </template>

    <!-- Default layout -->
    <main v-else style="padding-top: 3.5rem;">
      <Content />
    </main>

    <Footer />
  </div>
</template>
