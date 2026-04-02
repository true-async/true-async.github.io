<script setup>
import { ref } from 'vue'

const milestones = ref([
  {
    version: '0.1',
    title: 'Foundation',
    date: '2024',
    status: 'done',
    features: [
      { name: 'Coroutines & Scheduler', status: 'done' },
      { name: 'Event loop (libuv)', status: 'done' },
      { name: 'spawn() / delay() / timeout()', status: 'done' },
    ],
  },
  {
    version: '0.6',
    title: 'Complete Async API',
    date: '2026-03-14',
    status: 'done',
    features: [
      { name: 'TaskGroup & TaskSet', status: 'done' },
      { name: 'Channels (buffered/unbuffered)', status: 'done' },
      { name: 'Future / FutureState', status: 'done' },
      { name: 'Pool with CircuitBreaker', status: 'done' },
      { name: 'Async File & Pipe I/O', status: 'done' },
      { name: 'TCP / UDP sockets', status: 'done' },
      { name: 'PDO connection pooling', status: 'done' },
      { name: 'FileSystemWatcher', status: 'done' },
      { name: 'CURL async', status: 'done' },
      { name: 'Deadlock diagnostics', status: 'done' },
    ],
  },
  {
    version: '0.7',
    title: 'Threads & Stabilization',
    date: 'Summer 2026',
    status: 'active',
    tag: 'In Development',
    tag_style: 'highlight',
    features: [
      { name: 'spawn_thread() — cross-platform OS threads', status: 'done' },
      { name: 'Thread lifecycle (request startup/shutdown, TSRM)', status: 'done' },
      { name: 'Closure deep copy (op_array transfer via pemalloc)', status: 'done' },
      { name: 'Zval transfer between threads (scalars, strings, arrays)', status: 'done' },
      { name: 'RemoteException / ThreadTransferException', status: 'done' },
      { name: 'Bailout recovery (fatal errors in child threads)', status: 'done' },
      { name: 'Object transfer (declared properties)', status: 'in-progress' },
      { name: 'Captured variables (use) in closures', status: 'in-progress' },
      { name: 'ThreadPool with worker reuse', status: 'planned' },
      { name: 'Thread cancellation', status: 'planned' },
      { name: 'Test suite & stabilization', status: 'planned' },
    ],
  },
  {
    version: '0.8',
    title: 'Framework Adapters',
    date: 'Q3 2026',
    status: 'planned',
    features: [
      { name: 'Framework integration layer', status: 'planned' },
      { name: 'Laravel / Symfony adapters', status: 'planned' },
      { name: 'Migration guides', status: 'planned' },
    ],
  },
  {
    version: '1.0-RC',
    title: 'Release Candidate',
    date: 'August 2026',
    tag: 'RC',
    status: 'planned',
    features: [
      { name: 'Feature freeze', status: 'planned' },
      { name: 'Community testing', status: 'planned' },
      { name: 'Performance benchmarks', status: 'planned' },
    ],
  },
  {
    version: '1.0',
    title: 'Stable Release',
    date: 'November 2026',
    tag: 'Target: PHP 8.6',
    tag_style: 'highlight',
    status: 'planned',
    features: [
      { name: 'Stable API', status: 'planned' },
      { name: 'Production ready', status: 'planned' },
      { name: 'PHP RFC submission', status: 'planned' },
    ],
  },
])

function badgeLabel(status) {
  if (status === 'done') return 'Completed'
  if (status === 'active') return 'In Progress'
  return 'Planned'
}
</script>

<template>
  <div class="roadmap-container">
    <div class="roadmap-timeline">
      <div
        v-for="milestone in milestones"
        :key="milestone.version"
        class="roadmap-milestone"
        :class="`roadmap-milestone--${milestone.status}`"
      >
        <div class="roadmap-marker"></div>
        <div class="roadmap-card">
          <div class="roadmap-card-header">
            <div class="roadmap-card-title-row">
              <h3>v{{ milestone.version }} &mdash; {{ milestone.title }}</h3>
              <span
                v-if="milestone.tag"
                class="roadmap-tag"
                :class="milestone.tag_style ? `roadmap-tag--${milestone.tag_style}` : ''"
              >{{ milestone.tag }}</span>
            </div>
            <div class="roadmap-card-meta">
              <span v-if="milestone.date" class="roadmap-date">{{ milestone.date }}</span>
              <span
                class="roadmap-badge"
                :class="`roadmap-badge--${milestone.status}`"
              >{{ badgeLabel(milestone.status) }}</span>
            </div>
          </div>
          <ul class="roadmap-features">
            <li
              v-for="(feature, idx) in milestone.features"
              :key="idx"
              class="roadmap-feature"
              :class="`roadmap-feature--${feature.status}`"
            >
              <span class="roadmap-feature-dot"></span>
              {{ feature.name }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
