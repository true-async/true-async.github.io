import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import NotFound from './NotFound.vue'
import ComingSoon from './ComingSoon.vue'
import './styles/main.scss'

export default {
  Layout,
  NotFound,
  enhanceApp({ app }) {
    // Global components usable from markdown pages.
    app.component('ComingSoon', ComingSoon)
    // Force a full page load for links the VitePress SPA router can't safely
    // handle client-side:
    //   * /interactive/* — static HTML served from public/, outside the router.
    //   * a locale home ("/xx/" or "/xx/index.html") — with cleanUrls:false the
    //     router has no page data under that normalised key, so SPA navigation
    //     renders a blank <main>. A hard load works.
    //   * a LANGUAGE SWITCH (link locale != current locale) — switching language
    //     replaces the entire sidebar/content at once; the resulting keyed re-patch
    //     of nested v-for lists makes Vue crash (insertBefore/nextSibling of null).
    //     A hard load rebuilds the page cleanly instead of diffing two locales.
    const LOCALES = ['en', 'ru', 'de', 'es', 'fr', 'it', 'uk', 'zh', 'ko']
    const localeHome = /^\/(?:en|ru|de|es|fr|it|uk|zh|ko)\/(?:index\.html)?$/
    const localeOf = (path: string): string | null => {
      const m = path.match(/^\/([a-z]{2})(?:\/|$)/)
      return m && LOCALES.includes(m[1]) ? m[1] : null
    }
    if (typeof window !== 'undefined') {
      document.addEventListener('click', (e) => {
        const link = (e.target as HTMLElement).closest?.('a[href]')
        if (link) {
          const href = link.getAttribute('href')
          if (!href) return
          const fromLoc = localeOf(window.location.pathname)
          const toLoc = localeOf(href)
          const isLangSwitch = fromLoc !== null && toLoc !== null && fromLoc !== toLoc
          if (href.includes('/interactive/') || localeHome.test(href) || isLangSwitch) {
            e.preventDefault()
            e.stopPropagation()
            window.location.href = href
          }
        }
      }, true)  // capture phase to run before VitePress router
    }
  },
} satisfies Theme
