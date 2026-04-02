<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()

const repoUrl = 'https://github.com/true-async/true-async.github.io'

const currentLang = computed(() => {
  const path = page.value.relativePath
  const match = path.match(/^(ru|de|es|fr|it|ko|uk|zh)\//)
  return match ? match[1] : 'en'
})

const i18n: Record<string, {
  editPage: string
  reportError: string
  shortcut: string
  issuePrefix: string
  bodyPage: string
  bodySelected: string
  bodyDescription: string
}> = {
  en: {
    editPage: 'Edit this page',
    reportError: 'Report error',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Doc error',
    bodyPage: 'Page',
    bodySelected: 'Selected text',
    bodyDescription: 'Describe the issue...',
  },
  ru: {
    editPage: 'Редактировать страницу',
    reportError: 'Сообщить об ошибке',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Ошибка в документации',
    bodyPage: 'Страница',
    bodySelected: 'Выделенный текст',
    bodyDescription: 'Опишите проблему...',
  },
  de: {
    editPage: 'Seite bearbeiten',
    reportError: 'Fehler melden',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Dokumentationsfehler',
    bodyPage: 'Seite',
    bodySelected: 'Ausgewählter Text',
    bodyDescription: 'Beschreiben Sie das Problem...',
  },
  es: {
    editPage: 'Editar esta página',
    reportError: 'Reportar error',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Error en la documentación',
    bodyPage: 'Página',
    bodySelected: 'Texto seleccionado',
    bodyDescription: 'Describa el problema...',
  },
  fr: {
    editPage: 'Modifier cette page',
    reportError: 'Signaler une erreur',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Erreur de documentation',
    bodyPage: 'Page',
    bodySelected: 'Texte sélectionné',
    bodyDescription: 'Décrivez le problème...',
  },
  it: {
    editPage: 'Modifica questa pagina',
    reportError: 'Segnala un errore',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Errore nella documentazione',
    bodyPage: 'Pagina',
    bodySelected: 'Testo selezionato',
    bodyDescription: 'Descrivi il problema...',
  },
  ko: {
    editPage: '이 페이지 편집',
    reportError: '오류 신고',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: '문서 오류',
    bodyPage: '페이지',
    bodySelected: '선택한 텍스트',
    bodyDescription: '문제를 설명해 주세요...',
  },
  uk: {
    editPage: 'Редагувати сторінку',
    reportError: 'Повідомити про помилку',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: 'Помилка в документації',
    bodyPage: 'Сторінка',
    bodySelected: 'Виділений текст',
    bodyDescription: 'Опишіть проблему...',
  },
  zh: {
    editPage: '编辑此页',
    reportError: '报告错误',
    shortcut: 'Ctrl+Shift+E',
    issuePrefix: '文档错误',
    bodyPage: '页面',
    bodySelected: '选中的文本',
    bodyDescription: '请描述问题...',
  },
}

const labels = computed(() => {
  return i18n[currentLang.value] || i18n.en
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
