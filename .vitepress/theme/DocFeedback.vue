<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()

const repoUrl = 'https://github.com/true-async/true-async.github.io'

const currentLang = computed(() => {
  const path = page.value.relativePath
  if (path.startsWith('ru/')) return 'ru'
  return 'en'
})

const labels = computed(() => {
  if (currentLang.value === 'ru') {
    return {
      editPage: 'Редактировать страницу',
      reportError: 'Сообщить об ошибке',
      shortcut: 'Ctrl+Shift+E',
      issuePrefix: 'Ошибка в документации',
      bodyPage: 'Страница',
      bodySelected: 'Выделенный текст',
      bodyDescription: 'Опишите проблему...',
    }
  }
  return {
    editPage: 'Edit this page',
    reportError: 'Report error',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Doc error',
    bodyPage: 'Page',
    bodySelected: 'Selected text',
    bodyDescription: 'Describe the issue...',
  }
})

const editUrl = computed(() => {
  let path = page.value.relativePath
  // Handle rewritten paths
  if (path.startsWith('vitepress-docs/')) {
    path = path.replace('vitepress-docs/en-docs.md', 'en/docs.md')
                .replace('vitepress-docs/ru-docs.md', 'ru/docs.md')
  }
  return `${repoUrl}/edit/main/${path}`
})

function reportError() {
  const selected = window.getSelection()?.toString().trim() || ''
  const pageUrl = window.location.href
  const pageTitle = document.title
  const l = labels.value

  let body = `## ${l.bodyPage}\n${pageUrl}\n\n`
  if (selected) {
    const truncated = selected.length > 500 ? selected.substring(0, 500) + '...' : selected
    body += `## ${l.bodySelected}\n> ${truncated.replace(/\n/g, '\n> ')}\n\n`
  }
  body += `## Description\n${l.bodyDescription}`

  const params = new URLSearchParams({
    title: `${l.issuePrefix}: ${pageTitle}`,
    body,
    labels: 'documentation',
  })

  window.open(`${repoUrl}/issues/new?${params.toString()}`, '_blank')
}

function onKeydown(e: KeyboardEvent) {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e' || e.key === 'У' || e.key === 'у')) {
    e.preventDefault()
    reportError()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="doc-feedback">
    <a :href="editUrl" target="_blank" rel="noopener" class="doc-feedback-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L5.333 13.333 2 14l.667-3.333L11.333 2z"/>
      </svg>
      {{ labels.editPage }}
    </a>
    <button type="button" class="doc-feedback-link doc-feedback-report" @click="reportError">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="8" r="7"/>
        <line x1="8" y1="5" x2="8" y2="8.5"/>
        <circle cx="8" cy="11" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
      {{ labels.reportError }}
      <kbd>{{ labels.shortcut }}</kbd>
    </button>
  </div>
</template>
