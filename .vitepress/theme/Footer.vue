<script setup lang="ts">
import { useRoute } from 'vitepress'

const route = useRoute()

function getCurrentLang(): string {
  const match = route.path.match(/^\/(en|ru|de|fr|es|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
}

const footerLabels: Record<string, Record<string, string>> = {
  en: {
    about: 'True asynchronous programming for PHP. Built into the language core.',
    project: 'Project', community: 'Community', resources: 'Resources',
    home: 'Home', docs: 'Documentation', download: 'Download',
    issues: 'Issues', discussions: 'Discussions',
    getting_started: 'Getting Started', api_reference: 'API Reference', examples: 'Examples',
    license: 'MIT License.',
  },
  ru: {
    about: 'Настоящее асинхронное программирование для PHP. Встроено в ядро языка.',
    project: 'Проект', community: 'Сообщество', resources: 'Ресурсы',
    home: 'Главная', docs: 'Документация', download: 'Скачать',
    issues: 'Проблемы', discussions: 'Обсуждения',
    getting_started: 'Начало работы', api_reference: 'Справочник API', examples: 'Примеры',
    license: 'Лицензия MIT.',
  },
  de: {
    about: 'Echte asynchrone Primitive für PHP',
    project: 'Projekt', community: 'Community', resources: 'Ressourcen',
    home: 'Startseite', docs: 'Dokumentation', download: 'Download',
    issues: 'Fehlermeldungen', discussions: 'Diskussionen',
    getting_started: 'Erste Schritte', api_reference: 'API-Referenz', examples: 'Beispiele',
    license: 'Veröffentlicht unter der MIT-Lizenz.',
  },
  es: {
    about: 'Primitivas verdaderamente asíncronas para PHP',
    project: 'Proyecto', community: 'Comunidad', resources: 'Recursos',
    home: 'Inicio', docs: 'Documentación', download: 'Descargar',
    issues: 'Incidencias', discussions: 'Discusiones',
    getting_started: 'Primeros pasos', api_reference: 'Referencia API', examples: 'Ejemplos',
    license: 'Publicado bajo la licencia MIT.',
  },
  fr: {
    about: 'De veritables primitives asynchrones pour PHP',
    project: 'Projet', community: 'Communaute', resources: 'Ressources',
    home: 'Accueil', docs: 'Documentation', download: 'Telecharger',
    issues: 'Problemes', discussions: 'Discussions',
    getting_started: 'Premiers pas', api_reference: 'Reference API', examples: 'Exemples',
    license: 'Publie sous licence MIT.',
  },
  it: {
    about: 'Primitive asincrone native per PHP',
    project: 'Progetto', community: 'Comunità', resources: 'Risorse',
    home: 'Home', docs: 'Documentazione', download: 'Download',
    issues: 'Segnalazioni', discussions: 'Discussioni',
    getting_started: 'Per iniziare', api_reference: 'Riferimento API', examples: 'Esempi',
    license: 'Rilasciato sotto licenza MIT.',
  },
  uk: {
    about: 'Справжні асинхронні примітиви для PHP',
    project: 'Проєкт', community: 'Спільнота', resources: 'Ресурси',
    home: 'Головна', docs: 'Документація', download: 'Завантажити',
    issues: 'Проблеми', discussions: 'Обговорення',
    getting_started: 'Початок роботи', api_reference: 'Довідник API', examples: 'Приклади',
    license: 'Випущено під ліцензією MIT.',
  },
  zh: {
    about: 'PHP 的真正异步原语',
    project: '项目', community: '社区', resources: '资源',
    home: '首页', docs: '文档', download: '下载',
    issues: '问题跟踪', discussions: '讨论',
    getting_started: '快速开始', api_reference: 'API 参考', examples: '示例',
    license: '基于 MIT 许可证发布。',
  },
  ko: {
    about: 'PHP를 위한 진정한 비동기 프리미티브',
    project: '프로젝트', community: '커뮤니티', resources: '리소스',
    home: '홈', docs: '문서', download: '다운로드',
    issues: '이슈', discussions: '토론',
    getting_started: '시작하기', api_reference: 'API 레퍼런스', examples: '예제',
    license: 'MIT 라이선스에 따라 배포됩니다.',
  },
}

function t(key: string): string {
  const lang = getCurrentLang()
  return footerLabels[lang]?.[key] ?? footerLabels.en[key] ?? key
}
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-grid">
        <div class="footer-about">
          <div class="footer-brand">
            <img src="/assets/logo-header.png" alt="" width="28" height="28">
            <span>TrueAsync</span>
          </div>
          <p>{{ t('about') }}</p>
          <div class="footer-social">
            <a href="https://github.com/true-async" target="_blank" rel="noopener" aria-label="GitHub">
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            </a>
            <a href="https://discord.gg/yqBQPBHKp5" target="_blank" rel="noopener" aria-label="Discord">
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.046.046 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.027-.07 8.735 8.735 0 0 1-1.248-.595.05.05 0 0 1-.005-.083c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007c.08.066.164.132.248.195a.05.05 0 0 1-.004.083c-.398.232-.805.43-1.249.596a.05.05 0 0 0-.027.07c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019z"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-links">
          <div class="footer-col">
            <h3>{{ t('project') }}</h3>
            <ul>
              <li><a :href="`/${getCurrentLang()}/`">{{ t('home') }}</a></li>
              <li><a :href="`/${getCurrentLang()}/docs.html`">{{ t('docs') }}</a></li>
              <li><a :href="`/${getCurrentLang()}/download.html`">{{ t('download') }}</a></li>
              <li><a :href="`/${getCurrentLang()}/roadmap.html`">Roadmap</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3>{{ t('community') }}</h3>
            <ul>
              <li><a href="https://github.com/true-async" target="_blank" rel="noopener">GitHub</a></li>
              <li><a href="https://github.com/true-async/php-async/issues" target="_blank" rel="noopener">{{ t('issues') }}</a></li>
              <li><a href="https://github.com/orgs/true-async/discussions" target="_blank" rel="noopener">{{ t('discussions') }}</a></li>
              <li><a href="https://discord.gg/yqBQPBHKp5" target="_blank" rel="noopener">Discord</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3>{{ t('resources') }}</h3>
            <ul>
              <li><a :href="`/${getCurrentLang()}/docs.html`">{{ t('getting_started') }}</a></li>
              <li><a :href="`/${getCurrentLang()}/docs.html`">{{ t('api_reference') }}</a></li>
              <li><a :href="`/${getCurrentLang()}/docs.html`">{{ t('examples') }}</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="footer-credits">
        &copy; 2025&ndash;2026 TrueAsync. {{ t('license') }}
      </div>
    </div>
  </footer>
</template>
