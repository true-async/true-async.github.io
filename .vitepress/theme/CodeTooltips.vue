<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { apiGlossary } from './apiGlossary'

const route = useRoute()

const visible = ref(false)
const tipX = ref(0)
const tipY = ref(0)
const flipUp = ref(false)
const sig = ref('')
const desc = ref('')
const url = ref('')

let hideTimer: ReturnType<typeof setTimeout> | null = null

function currentLang(): string {
  const m = route.path.match(/^\/(en|ru|de|fr|es|it|uk|zh|ko)\//)
  return m ? m[1] : 'en'
}

function mark() {
  // Match leaf token spans whose exact text is a known API symbol.
  const scopes = document.querySelectorAll('main pre code, .hero-panel-code')
  scopes.forEach((scope) => {
    scope.querySelectorAll('span').forEach((span) => {
      const el = span as HTMLElement
      if (el.classList.contains('api-term') || el.children.length) return
      const text = (el.textContent || '').trim()
      if (Object.prototype.hasOwnProperty.call(apiGlossary, text)) {
        el.classList.add('api-term')
        el.dataset.term = text
      }
    })
  })
}

function show(el: HTMLElement, term: string) {
  const entry = apiGlossary[term]
  if (!entry) return
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  sig.value = entry.signature
  desc.value = entry.description
  url.value = `/${currentLang()}${entry.path}`
  const r = el.getBoundingClientRect()
  const width = 360
  tipX.value = Math.max(12, Math.min(r.left - 4, window.innerWidth - width - 12))
  const below = r.bottom + 10
  const estHeight = 150
  if (below + estHeight > window.innerHeight && r.top > estHeight + 20) {
    flipUp.value = true
    tipY.value = r.top - 10
  } else {
    flipUp.value = false
    tipY.value = below
  }
  visible.value = true
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { visible.value = false }, 140)
}

function onOver(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest?.('.api-term') as HTMLElement | null
  if (el && el.dataset.term) show(el, el.dataset.term)
}
function onOut(e: MouseEvent) {
  if ((e.target as HTMLElement).closest?.('.api-term')) scheduleHide()
}
function keepOpen() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
}
function onClick(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest?.('.api-term') as HTMLElement | null
  if (el && el.dataset.term) {
    const entry = apiGlossary[el.dataset.term]
    if (entry) window.location.href = `/${currentLang()}${entry.path}`
  }
}

let rescanTimer: ReturnType<typeof setTimeout> | null = null
function scheduleScan() {
  if (rescanTimer) clearTimeout(rescanTimer)
  rescanTimer = setTimeout(mark, 120)
}

onMounted(() => {
  scheduleScan()
  document.addEventListener('mouseover', onOver)
  document.addEventListener('mouseout', onOut)
  document.addEventListener('click', onClick)
})
onUnmounted(() => {
  document.removeEventListener('mouseover', onOver)
  document.removeEventListener('mouseout', onOut)
  document.removeEventListener('click', onClick)
})
watch(() => route.path, () => { visible.value = false; scheduleScan() })
</script>

<template>
  <Teleport to="body">
    <div
      v-show="visible"
      class="api-tooltip"
      :class="{ 'api-tooltip--up': flipUp }"
      :style="{ left: tipX + 'px', top: tipY + 'px' }"
      @mouseenter="keepOpen"
      @mouseleave="scheduleHide"
    >
      <div class="api-tooltip-sig">{{ sig }}</div>
      <div class="api-tooltip-body">
        <div class="api-tooltip-desc">{{ desc }}</div>
        <a class="api-tooltip-link" :href="url">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg>
          Click to open in docs
        </a>
      </div>
    </div>
  </Teleport>
</template>
