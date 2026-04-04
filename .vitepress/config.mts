import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TrueAsync',
  description: 'True Asynchronous PHP',

  // Don't process Jekyll/build files
  srcExclude: [
    '_layouts/**',
    '_includes/**',
    '_data/**',
    '_sass/**',
    'css/**',
    'scripts/**',
    'Gemfile*',
    '_config.yml',
    'CLAUDE.md',
    'README.md',
    'CHANGELOG.md',
    'index.html',
    // Exclude docs.md for all languages — contains inline <style>/<script>
    // Clean versions are in vitepress-docs/ and mapped via rewrites
    'en/docs.md',
    'ru/docs.md',
    'de/docs.md',
    'es/docs.md',
    'fr/docs.md',
    'it/docs.md',
    'ko/docs.md',
    'uk/docs.md',
    'zh/docs.md',
  ],

  // Map VitePress-clean docs pages to the original URL paths
  rewrites: {
    'vitepress-docs/en-docs.md': 'en/docs.md',
    'vitepress-docs/ru-docs.md': 'ru/docs.md',
    'vitepress-docs/de-docs.md': 'de/docs.md',
    'vitepress-docs/es-docs.md': 'es/docs.md',
    'vitepress-docs/fr-docs.md': 'fr/docs.md',
    'vitepress-docs/it-docs.md': 'it/docs.md',
    'vitepress-docs/ko-docs.md': 'ko/docs.md',
    'vitepress-docs/uk-docs.md': 'uk/docs.md',
    'vitepress-docs/zh-docs.md': 'zh/docs.md',
  },

  // Keep existing URL structure
  cleanUrls: false,

  // Ignore dead links (interactive demos, localhost, etc.)
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&family=Fira+Mono:wght@400;500&display=swap', rel: 'stylesheet' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/assets/favicon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'TrueAsync - True Asynchronous PHP' }],
    ['meta', { property: 'og:description', content: 'True async/await, coroutines, and non-blocking I/O for PHP' }],
    ['meta', { property: 'og:image', content: 'https://true-async.github.io/assets/logo-header.png' }],
    ['meta', { property: 'og:url', content: 'https://true-async.github.io' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],

  sitemap: {
    hostname: 'https://true-async.github.io',
  },

  // Use our fully custom theme — no VitePress defaults
  themeConfig: {
    search: {
      provider: 'local',
    },
  },

  locales: {
    'en': { label: 'English', lang: 'en' },
    'ru': { label: 'Русский', lang: 'ru' },
    'de': { label: 'Deutsch', lang: 'de' },
    'fr': { label: 'Français', lang: 'fr' },
    'es': { label: 'Español', lang: 'es' },
    'it': { label: 'Italiano', lang: 'it' },
    'uk': { label: 'Українська', lang: 'uk' },
    'zh': { label: '中文', lang: 'zh' },
    'ko': { label: '한국어', lang: 'ko' },
  },

  markdown: {
    // Keep GitHub Flavored Markdown behavior
    breaks: false,
    // Enable MathJax rendering ($$...$$ and $...$)
    math: true,
    // Dual theme for light/dark syntax highlighting
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    config: (md) => {
      // Wrap all rendered markdown in <div v-pre> to prevent Vue
      // from compiling raw HTML (e.g. <style>, <script>) inside content.
      const defaultRender = md.render.bind(md)
      md.render = (src, env) => {
        const html = defaultRender(src, env)
        return `<div v-pre>${html}</div>`
      }
    },
  },

  vite: {
    css: {
      // Disable VitePress default styles injection
    },
    server: {
      hmr: {
        overlay: false,
      },
    },
  },
})
