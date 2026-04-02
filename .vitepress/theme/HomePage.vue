<script setup lang="ts">
import { useRoute } from 'vitepress'

const route = useRoute()

function getCurrentLang(): string {
  const match = route.path.match(/^\/(en|ru|de|fr|es|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
}

const hero = {
  badge: 'Experimental Version',
  title: 'True Asynchronous inside PHP',
  description: 'Imagine PHP with coroutines, where familiar functions support concurrent I/O. Build high-performance concurrent applications with clean, readable code and minimal changes!',
  buttons: [
    { label: 'Get Started', url: '/en/docs.html', style: 'primary' },
    { label: 'How Coroutines Work', url: '/en/interactive/coroutine-demo.html', style: 'secondary', external: true },
    { label: 'Download', url: '/en/download.html', style: 'secondary' },
    { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
  ],
}

const features = [
  { title: 'Coroutines', icon: 'coroutines', url: '/en/docs/components/coroutines.html', text: 'Lightweight coroutines for efficient concurrent execution. No colored <code>async</code> functions. Just do <code>spawn()</code> and go!' },
  { title: 'Non-blocking I/O', icon: 'io', url: '/en/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Regular PHP functions now work asynchronously.' },
  { title: 'Async Web Servers', icon: 'web-servers', url: '/en/docs/frankenphp.html', text: 'Support for the model: multiple requests — one PHP process.' },
  { title: 'Cooperative Cancellation', icon: 'cancellation', url: '/en/docs/components/cancellation.html', text: 'Simple and flexible <code>API</code> for coroutine cancellation. <code>Scope::cancel()</code>.' },
  { title: 'Structured Concurrency', icon: 'structured-concurrency', url: '/en/docs/components/scope.html', text: 'Control coroutine lifetime with <code>Scope</code> sandbox. Manage groups via <code>TaskGroup</code>.' },
  { title: 'PDO Pool', icon: 'pdo-pool', url: '/en/docs/components/pdo-pool.html', text: 'Connection pooling built right into <code>PDO</code>. Automatic connection management.' },
  { title: 'Channel', icon: 'channel', url: '/en/docs/components/channels.html', text: 'Data exchange between coroutines. Buffered and unbuffered channels for producer/consumer patterns.' },
  { title: 'Futures', icon: 'futures', url: '/en/docs/components/future.html', text: 'Deferred results for async computations. Composition via <code>await_all</code>, <code>await_first</code>.' },
  { title: 'Context', icon: 'context', url: '/en/docs/components/context.html', text: 'Data associated with a coroutine. Easy adaptation via <code>Context</code>.' },
]

const cta = {
  title: 'Ready to Build Async PHP Applications?',
  description: 'Get started with TrueAsync in minutes. Install via Composer and start writing concurrent code today.',
  buttons: [
    { label: 'Read the Docs', url: '/en/docs.html', style: 'primary' },
    { label: 'View on GitHub', url: 'https://github.com/true-async', style: 'secondary', external: true },
    { label: 'Chat on Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
  ],
}

const milestones = [
  { version: '0.1', title: 'Foundation', date: '2024', status: 'done' },
  { version: '0.6', title: 'Complete Async API', date: '2026-03-14', status: 'done' },
  { version: '0.7', title: 'Threads & Stabilization', date: 'Summer 2026', status: 'active', tag: 'In Development', tagStyle: 'highlight' },
  { version: '0.8', title: 'Framework Adapters', date: 'Q3 2026', status: 'planned' },
  { version: '1.0-RC', title: 'Release Candidate', date: 'August 2026', status: 'planned', tag: 'RC' },
  { version: '1.0', title: 'Stable Release', date: 'November 2026', status: 'planned', tag: 'Target: PHP 8.6', tagStyle: 'highlight' },
]

// Feature icons as SVG paths
const iconSvgs: Record<string, string> = {
  'coroutines': '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  'io': '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  'web-servers': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  'cancellation': '<circle cx="12" cy="13" r="9"/><polyline points="12 9 12 13 15 16"/><path d="M12 4V2"/><path d="M16.2 4.8L17.6 3.4"/><path d="M7.8 4.8L6.4 3.4"/>',
  'structured-concurrency': '<rect x="6" y="2" width="12" height="5" rx="1"/><rect x="1" y="17" width="10" height="5" rx="1"/><rect x="13" y="17" width="10" height="5" rx="1"/><path d="M12 7v4"/><path d="M6 13.5h12"/><path d="M6 11v2.5"/><path d="M18 11v2.5"/>',
  'pdo-pool': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  'channel': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  'futures': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  'context': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
}
</script>

<template>
  <!-- Hero -->
  <section class="hero">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <div class="hero-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
        {{ hero.badge }}
      </div>
      <h1>{{ hero.title }}</h1>
      <p class="hero-description">{{ hero.description }}</p>
      <div class="hero-actions">
        <a
          v-for="btn in hero.buttons"
          :key="btn.label"
          :href="btn.url"
          :class="['btn', `btn-${btn.style}`, 'btn-lg']"
          :target="btn.external ? '_blank' : undefined"
          :rel="btn.external ? 'noopener' : undefined"
        >{{ btn.label }}</a>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="features">
    <div class="features-header">
      <h2>Key Features</h2>
    </div>
    <div class="features-grid">
      <a
        v-for="feature in features"
        :key="feature.title"
        :href="feature.url"
        class="feature-card feature-card--link"
      >
        <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="iconSvgs[feature.icon]"></svg>
        <h3>{{ feature.title }}</h3>
        <p v-html="feature.text"></p>
      </a>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta-section">
    <div class="cta-content">
      <svg class="cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      <h2>{{ cta.title }}</h2>
      <p>{{ cta.description }}</p>
      <div class="cta-actions">
        <a
          v-for="btn in cta.buttons"
          :key="btn.label"
          :href="btn.url"
          :class="['btn', `btn-${btn.style}`, 'btn-lg']"
          :target="btn.external ? '_blank' : undefined"
          :rel="btn.external ? 'noopener' : undefined"
        >{{ btn.label }}</a>
      </div>
    </div>
  </section>

  <!-- Roadmap -->
  <section class="home-roadmap">
    <div class="home-roadmap-inner">
      <h2>Roadmap</h2>
      <div class="home-roadmap-timeline">
        <div
          v-for="m in milestones"
          :key="m.version"
          :class="['home-roadmap-item', `home-roadmap-item--${m.status}`]"
        >
          <div class="home-roadmap-dot"></div>
          <div class="home-roadmap-content">
            <span class="home-roadmap-version">v{{ m.version }}</span>
            <span class="home-roadmap-title">{{ m.title }}</span>
            <span v-if="m.date" class="home-roadmap-date">{{ m.date }}</span>
            <span v-if="m.tag" :class="['home-roadmap-tag', m.tagStyle ? `home-roadmap-tag--${m.tagStyle}` : '']">{{ m.tag }}</span>
          </div>
        </div>
      </div>
      <a :href="`/${getCurrentLang()}/roadmap.html`" class="home-roadmap-link">View full roadmap &rarr;</a>
    </div>
  </section>
</template>
