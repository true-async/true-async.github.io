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
    // Force a full page load for links the VitePress SPA router can't resolve
    // client-side:
    //   * /interactive/* — static HTML served from public/, outside the router
    //   * a locale home ("/xx/" or "/xx/index.html") — with cleanUrls:false the
    //     router has no page data under that normalised key, so SPA navigation
    //     renders a blank <main> (verified: no crash, just empty). A hard load
    //     works. This is separate from the sidebar patcher fix.
    const localeHome = /^\/(?:en|ru|de|es|fr|it|uk|zh|ko)\/(?:index\.html)?$/
    if (typeof window !== 'undefined') {
      document.addEventListener('click', (e) => {
        const link = (e.target as HTMLElement).closest?.('a[href]')
        if (link) {
          const href = link.getAttribute('href')
          if (href && (href.includes('/interactive/') || localeHome.test(href))) {
            e.preventDefault()
            e.stopPropagation()
            window.location.href = href
          }
        }
      }, true)  // capture phase to run before VitePress router
    }
  },
} satisfies Theme
