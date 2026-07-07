<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const visible = ref(false)
const navEl = ref<HTMLElement | null>(null)

let observer: IntersectionObserver | null = null
let links: HTMLAnchorElement[] = []

function clearObserver() {
  observer?.disconnect()
  observer = null
}

function setActive(id: string) {
  for (const a of links) {
    a.classList.toggle('active', a.dataset.id === id)
  }
}

function build() {
  const content = document.querySelector('.docs-content')
  const nav = navEl.value
  if (!content || !nav) { visible.value = false; return }
  const heads = Array.from(content.querySelectorAll<HTMLElement>('h2[id], h3[id]'))
  if (heads.length < 2) { visible.value = false; nav.innerHTML = ''; return }

  // Build the link list imperatively to avoid Vue keyed-fragment patching,
  // which is fragile inside this block-optimized layout.
  nav.innerHTML = ''
  links = []
  for (const h of heads) {
    const a = document.createElement('a')
    a.href = '#' + h.id
    a.dataset.id = h.id
    a.className = 'docs-toc-link' + (h.tagName === 'H3' ? ' docs-toc-link--sub' : '')
    a.textContent = (h.textContent || '').replace(/[#​]+$/, '').trim()
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const el = document.getElementById(h.id)
      if (!el) return
      setActive(h.id)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      history.replaceState(null, '', '#' + h.id)
    })
    nav.appendChild(a)
    links.push(a)
  }
  visible.value = true

  clearObserver()
  observer = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) setActive((en.target as HTMLElement).id)
      }
    },
    { rootMargin: '-92px 0px -68% 0px', threshold: 0 }
  )
  heads.forEach((h) => observer!.observe(h))
}

function refresh() {
  nextTick(() => {
    ;[60, 200, 500, 1000].forEach((d) => setTimeout(build, d))
  })
}

onMounted(refresh)
onUnmounted(clearObserver)
watch(() => route.path, () => { visible.value = false; refresh() })
</script>

<template>
  <aside class="docs-toc" v-show="visible">
    <div class="docs-toc-inner">
      <div class="docs-toc-title">On this page</div>
      <nav class="docs-toc-nav" ref="navEl"></nav>
    </div>
  </aside>
</template>
