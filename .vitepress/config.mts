import { defineConfig } from 'vitepress'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Collect every real page URL per locale at config time. The language switcher
// uses this to fall back to the locale home when a page has no translation,
// instead of navigating to a non-existent path. Works in dev and prod alike
// (unlike VitePress' prod-only __VP_HASH_MAP__).
const LOCALES = ['en', 'ru', 'de', 'fr', 'es', 'it', 'uk', 'zh', 'ko']
const projectRoot = fileURLToPath(new URL('..', import.meta.url))

function collectLocaleRoutes(): string[] {
  const routes: string[] = []
  for (const loc of LOCALES) {
    const dir = join(projectRoot, loc)
    if (!existsSync(dir)) continue
    const stack = [dir]
    while (stack.length) {
      const cur = stack.pop() as string
      for (const name of readdirSync(cur)) {
        const full = join(cur, name)
        if (statSync(full).isDirectory()) { stack.push(full); continue }
        if (!name.endsWith('.md')) continue
        const rel = full.slice(projectRoot.length).split(sep).join('/')
        if (rel === `${loc}/docs.md`) continue // srcExcluded, served via rewrite
        routes.push('/' + rel.replace(/\.md$/, '.html'))
      }
    }
    routes.push(`/${loc}/docs.html`) // provided by the vitepress-docs rewrite
  }
  return routes
}

const localeRoutes = collectLocaleRoutes()

// Custom Shiki themes matching the TrueAsync mockup code palette
// (purple variables, purple functions, teal keywords/classes, orange strings).
const trueAsyncDark = {
  name: 'trueasync-dark',
  type: 'dark' as const,
  colors: { 'editor.background': '#12101F', 'editor.foreground': '#C6C2D6' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment', 'string.comment'], settings: { foreground: '#6f6d80', fontStyle: 'italic' } },
    { scope: ['variable', 'variable.other', 'variable.other.php', 'variable.language', 'meta.variable', 'punctuation.definition.variable'], settings: { foreground: '#B69BFF' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'meta.function-call.php', 'entity.name.function.php'], settings: { foreground: '#7C6BFF' } },
    { scope: ['keyword', 'keyword.control', 'keyword.other', 'storage.type', 'storage.modifier', 'keyword.operator.new'], settings: { foreground: '#5AD1B0' } },
    { scope: ['entity.name.type', 'support.class', 'entity.name.class', 'entity.other.inherited-class', 'support.type'], settings: { foreground: '#5AD1B0' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: '#7CC7E8' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.other'], settings: { foreground: '#E8B77C' } },
    { scope: ['keyword.operator', 'punctuation', 'meta.brace'], settings: { foreground: '#C6C2D6' } },
  ],
}
const trueAsyncLight = {
  name: 'trueasync-light',
  type: 'light' as const,
  colors: { 'editor.background': '#F6F4FC', 'editor.foreground': '#3A3550' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment', 'string.comment'], settings: { foreground: '#8B8798', fontStyle: 'italic' } },
    { scope: ['variable', 'variable.other', 'variable.other.php', 'variable.language', 'meta.variable', 'punctuation.definition.variable'], settings: { foreground: '#6A4BEA' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'meta.function-call.php', 'entity.name.function.php'], settings: { foreground: '#5B3FD6' } },
    { scope: ['keyword', 'keyword.control', 'keyword.other', 'storage.type', 'storage.modifier', 'keyword.operator.new'], settings: { foreground: '#1C8F76' } },
    { scope: ['entity.name.type', 'support.class', 'entity.name.class', 'entity.other.inherited-class', 'support.type'], settings: { foreground: '#1C8F76' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: '#2C6FCC' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.other'], settings: { foreground: '#B4711F' } },
    { scope: ['keyword.operator', 'punctuation', 'meta.brace'], settings: { foreground: '#3A3550' } },
  ],
}

export default defineConfig({
  title: 'TrueAsync',
  description: 'True Asynchronous PHP',

  // Don't process non-docs root files
  srcExclude: [
    'CLAUDE.md',
    'README.md',
    'CHANGELOG.md',
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
    // Apply the saved/system theme synchronously, before first paint, so the
    // page never flashes light-then-dark on reload (no FOUC).
    ['script', {}, "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();"],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap', rel: 'stylesheet' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/assets/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/assets/favicon.ico', sizes: '16x16 32x32 48x48' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/assets/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/assets/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/assets/site.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#17142B' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'TrueAsync' }],
    ['meta', { property: 'og:title', content: 'TrueAsync — True Asynchronous PHP' }],
    ['meta', { property: 'og:description', content: 'Write sync. Run async. Coroutines, non-blocking I/O and structured concurrency, built into the PHP language core.' }],
    ['meta', { property: 'og:image', content: 'https://true-async.github.io/assets/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:url', content: 'https://true-async.github.io' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'TrueAsync — True Asynchronous PHP' }],
    ['meta', { name: 'twitter:description', content: 'Write sync. Run async. Coroutines, non-blocking I/O and structured concurrency, built into the PHP language core.' }],
    ['meta', { name: 'twitter:image', content: 'https://true-async.github.io/assets/og-image.png' }],
    // KaTeX for math formulas (used in evidence pages)
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css' }],
    ['script', { defer: '', src: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js' }],
    ['script', { defer: '', src: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js', onload: "renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]})" }],
  ],

  sitemap: {
    hostname: 'https://true-async.github.io',
  },

  // Use our fully custom theme — no VitePress defaults
  themeConfig: {
    search: {
      provider: 'local',
    },
    localeRoutes,
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
    // Dual theme for light/dark syntax highlighting (mockup palette)
    theme: {
      light: trueAsyncLight,
      dark: trueAsyncDark,
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
