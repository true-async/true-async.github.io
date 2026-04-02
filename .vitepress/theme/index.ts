import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import './style.css'

export default {
  Layout,
  enhanceApp({ app }) {
    // Force full page load for /interactive/ links (served as static HTML from public/)
    if (typeof window !== 'undefined') {
      document.addEventListener('click', (e) => {
        const link = (e.target as HTMLElement).closest?.('a[href]')
        if (link) {
          const href = link.getAttribute('href')
          if (href && href.includes('/interactive/')) {
            e.preventDefault()
            e.stopPropagation()
            window.location.href = href
          }
        }
      }, true)  // capture phase to run before VitePress router
    }
  },
} satisfies Theme
