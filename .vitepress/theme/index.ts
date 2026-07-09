import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import NotFound from './NotFound.vue'
import ComingSoon from './ComingSoon.vue'
import './styles/main.scss'

export default {
  Layout,
  NotFound,
  enhanceApp({ app, router }) {
    // Global components usable from markdown pages.
    app.component('ComingSoon', ComingSoon)
    if (typeof window === 'undefined') return

    const LOCALES = ['en', 'ru', 'de', 'es', 'fr', 'it', 'uk', 'zh', 'ko']
    const localeHome = /^\/(?:en|ru|de|es|fr|it|uk|zh|ko)\/(?:index\.html)?$/
    const localeOf = (path: string): string | null => {
      const m = path.match(/^\/([a-z]{2})(?:\/|$)/)
      return m && LOCALES.includes(m[1]) ? m[1] : null
    }

    // Some navigations must bypass the VitePress SPA router and do a full reload:
    //   * a LANGUAGE SWITCH (target locale != current locale) — switching locale
    //     replaces the entire sidebar + content at once; the keyed re-patch of the
    //     nested nav lists crashes Vue with insertBefore/nextSibling of null.
    //   * a locale home ("/xx/") — with cleanUrls:false the router has no page data
    //     under that normalised key, so SPA nav renders a blank <main>.
    // Hook the ROUTER itself (onBeforeRouteChange, which VitePress calls inside its
    // own go()) rather than a click listener — a click listener races the router's
    // own capture-phase handler and loses, so the SPA nav (and crash) happened anyway.
    // Canonical form so "/fr/", "/fr/index.html" and "/fr" compare equal.
    const canon = (p: string): string =>
      p.replace(/index\.html$/, '').replace(/\/+$/, '') || '/'
    const needsFullLoad = (path: string): boolean => {
      const from = localeOf(window.location.pathname)
      const dest = localeOf(path)
      if (from && dest && from !== dest) return true // language switch
      if (localeHome.test(path)) return true         // locale home (blank on SPA)
      return false
    }
    const prevHook = router.onBeforeRouteChange
    router.onBeforeRouteChange = (to: string) => {
      const path = to.split('#')[0].split('?')[0]
      // Never intercept a navigation to the page we are already on — the forced
      // reload would re-fire onBeforeRouteChange and loop forever (locale home).
      if (needsFullLoad(path) && canon(path) !== canon(window.location.pathname)) {
        window.location.assign(to)
        return false // cancel the SPA navigation; the full page load takes over
      }
      return prevHook ? prevHook.call(router, to) : undefined
    }

    // /interactive/* pages are static HTML in public/, outside the router entirely.
    document.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement).closest?.('a[href]')
      const href = link?.getAttribute('href')
      if (href && href.includes('/interactive/')) {
        e.preventDefault()
        e.stopPropagation()
        window.location.href = href
      }
    }, true)
  },
} satisfies Theme
