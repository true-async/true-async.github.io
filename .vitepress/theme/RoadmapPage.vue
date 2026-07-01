<script setup>
import { ref } from 'vue'

const roadmaps = ref([
  {
    section: 'TrueAsync Core',
    sectionSubtitle: 'Language extension: coroutines, async I/O, structured concurrency, threads.',
    milestones: [
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
        status: 'done',
        features: [
          { name: 'spawn_thread() — cross-platform OS threads', status: 'done' },
          { name: 'Thread lifecycle (request startup/shutdown, TSRM)', status: 'done' },
          { name: 'Closure deep copy (op_array transfer via pemalloc)', status: 'done' },
          { name: 'Zval transfer between threads (scalars, strings, arrays)', status: 'done' },
          { name: 'RemoteException / ThreadTransferException', status: 'done' },
          { name: 'Bailout recovery (fatal errors in child threads)', status: 'done' },
          { name: 'Object transfer (declared properties)', status: 'done' },
          { name: 'Captured variables (use) in closures', status: 'done' },
          { name: 'ThreadPool with worker reuse', status: 'done' },
          { name: 'ThreadPool: bootloader + coroutine-mode + auto workers', status: 'done' },
          { name: 'ThreadChannel (cross-thread data exchange)', status: 'done' },
          { name: 'Thread cancellation (ThreadPool::cancel in coroutine-mode)', status: 'done' },
          { name: 'Future-style exception semantics for await(coroutine) (#139)', status: 'done' },
          { name: 'Test suite & stabilization', status: 'done' },
        ],
      },
      {
        version: '0.8',
        title: 'Framework Adapters',
        date: 'Q3 2026',
        status: 'active',
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
    ],
  },
  {
    section: 'TrueAsync Server',
    sectionSubtitle: 'Native HTTP/1.1/2/3 server inside the PHP process.',
    milestones: [
      {
        version: '0.6',
        title: 'Native HTTP/1.1/2/3',
        date: '2026-05',
        status: 'active',
        features: [
          { name: 'HTTP/1.1 (llhttp 9.3.0, keep-alive, pipelining)', status: 'done' },
          { name: 'HTTP/2 (nghttp2, multiplexing, server push, rapid-reset mitigation)', status: 'done' },
          { name: 'HTTP/3 / QUIC (ngtcp2 + nghttp3, OpenSSL 3.5 QUIC API)', status: 'done' },
          { name: 'TLS 1.2 / 1.3 (OpenSSL 3.x, ALPN, hardened defaults)', status: 'done' },
          { name: 'Multi-protocol on a single port (ALPN / Upgrade)', status: 'done' },
          { name: 'Compression: gzip / brotli / zstd (H1/H2/H3)', status: 'done' },
          { name: 'Streaming request body (readBody)', status: 'done' },
          { name: 'Streaming response (send / sendable / trailers)', status: 'done' },
          { name: 'StaticHandler + precompressed sidecars + sendFile', status: 'done' },
          { name: 'CoDel backpressure + graceful drain', status: 'done' },
          { name: 'Multi-worker pool (setWorkers + bootloader + SO_REUSEPORT)', status: 'done' },
          { name: 'Per-request scope + request_context()', status: 'done' },
          { name: 'Bailout firewall (fatal does not crash server)', status: 'done' },
          { name: 'W3C Trace Context', status: 'done' },
        ],
      },
      {
        version: '0.8',
        title: 'Server-Sent Events',
        date: '2026-06-27',
        status: 'done',
        features: [
          { name: 'sseStart() / sseEvent() / sseComment() / sseRetry()', status: 'done' },
          { name: 'Same handler works over HTTP/1.1, HTTP/2 and HTTP/3', status: 'done' },
          { name: 'WHATWG-compliant event-stream framing', status: 'done' },
        ],
      },
      {
        version: '0.9',
        title: 'WebSocket',
        date: '2026-07-01',
        status: 'done',
        features: [
          { name: 'RFC 6455 upgrade from HTTP/1.1 and HTTP/2 (RFC 8441)', status: 'done' },
          { name: 'wss:// and permessage-deflate (RFC 7692)', status: 'done' },
          { name: 'Full-duplex send/recv, backpressure, keepalive ping/pong', status: 'done' },
          { name: 'Subprotocol negotiation (WebSocketUpgrade)', status: 'done' },
          { name: 'Autobahn|Testsuite conformance: 246/246', status: 'done' },
        ],
      },
      {
        version: 'Next',
        title: 'Protocols on the same listener',
        status: 'planned',
        features: [
          { name: 'gRPC (over HTTP/2)', status: 'planned' },
          { name: 'Cross-thread stop()', status: 'planned' },
        ],
      },
    ],
  },
  {
    section: 'TrueAsync Mobile',
    sectionSubtitle: 'Persistent PHP runtime bridge for native mobile apps.',
    milestones: [
      {
        version: '0.1',
        title: 'Android via native-bridge',
        status: 'active',
        features: [
          { name: 'Persistent PHP runtime on a background thread (JNI)', status: 'done' },
          { name: 'Two-way event bridge (Android events → PHP, PHP → UI)', status: 'done' },
          { name: 'Codegen: PHP #[BridgeModule] spec → PHP/Kotlin/C glue', status: 'done' },
          { name: '#[FastPath] direct JNI calls for hot paths', status: 'done' },
          { name: 'Demo Android Studio app + Docker build', status: 'done' },
          { name: 'iOS support', status: 'planned' },
        ],
      },
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
    <section
      v-for="roadmap in roadmaps"
      :key="roadmap.section"
      class="roadmap-section"
    >
      <header class="roadmap-section-header">
        <h2>{{ roadmap.section }}</h2>
        <p v-if="roadmap.sectionSubtitle">{{ roadmap.sectionSubtitle }}</p>
      </header>
      <div class="roadmap-timeline">
        <div
          v-for="milestone in roadmap.milestones"
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
    </section>
  </div>
</template>

<style scoped>
.roadmap-section + .roadmap-section {
  margin-top: 3rem;
}

.roadmap-section-header {
  margin-bottom: 1.25rem;
}

.roadmap-section-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.roadmap-section-header p {
  margin: 0;
  color: var(--vp-c-text-2, #6b7280);
  font-size: 0.95rem;
}
</style>
