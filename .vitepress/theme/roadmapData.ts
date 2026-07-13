// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for the roadmap.
//
// Drives BOTH the homepage summary timeline (milestones flagged `homepage: true`)
// and the full /roadmap page. To add / remove / reorder a milestone or feature,
// edit THIS file only — nothing is duplicated between the two pages.
//
// Locale-independent structure lives here. Human-readable prose (section titles
// & subtitles, milestone titles, the status labels) is localised in
// roadmapI18n.ts, keyed by the `id`s below. Feature `name`s are technical
// (library / protocol / API names) and stay in English, like code in the docs.
// ---------------------------------------------------------------------------

export type RoadmapStatus = 'done' | 'active' | 'planned'

export interface RoadmapFeature {
  name: string
  status: RoadmapStatus
}

export interface RoadmapMilestone {
  id: string // stable key -> milestone title in roadmapI18n
  version: string
  date?: string
  status: RoadmapStatus
  tag?: string
  tagStyle?: string
  homepage?: boolean // include in the homepage summary timeline
  features: RoadmapFeature[]
}

export interface RoadmapSection {
  id: string // stable key -> section title/subtitle in roadmapI18n
  milestones: RoadmapMilestone[]
}

export const roadmap: RoadmapSection[] = [
  {
    id: 'core',
    milestones: [
      {
        id: 'core-0.1', version: '0.1', date: '2024', status: 'done', homepage: true,
        features: [
          { name: 'Coroutines & Scheduler', status: 'done' },
          { name: 'Event loop (libuv)', status: 'done' },
          { name: 'spawn() / delay() / timeout()', status: 'done' },
        ],
      },
      {
        id: 'core-0.6', version: '0.6', date: '2026-03-14', status: 'done', homepage: true,
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
        id: 'core-0.7', version: '0.7', date: 'Summer 2026', status: 'done', homepage: true,
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
        id: 'core-0.8', version: '0.8', date: 'Q3 2026', status: 'active', homepage: true,
        features: [
          { name: 'Framework integration layer', status: 'planned' },
          { name: 'Laravel / Symfony adapters', status: 'planned' },
          { name: 'Migration guides', status: 'planned' },
        ],
      },
      {
        id: 'core-1.0-rc', version: '1.0-RC', date: 'August 2026', status: 'planned', tag: 'RC', homepage: true,
        features: [
          { name: 'Feature freeze', status: 'planned' },
          { name: 'Community testing', status: 'planned' },
          { name: 'Performance benchmarks', status: 'planned' },
        ],
      },
      {
        id: 'core-1.0', version: '1.0', date: 'November 2026', status: 'planned', tag: 'Target: PHP 8.6', tagStyle: 'highlight', homepage: true,
        features: [
          { name: 'Stable API', status: 'planned' },
          { name: 'Production ready', status: 'planned' },
          { name: 'PHP RFC submission', status: 'planned' },
        ],
      },
    ],
  },
  {
    id: 'server',
    milestones: [
      {
        id: 'server-0.6', version: '0.6', date: '2026-05', status: 'done',
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
        id: 'server-sse', version: '0.8', date: '2026-06-27', status: 'done',
        features: [
          { name: 'sseStart() / sseEvent() / sseComment() / sseRetry()', status: 'done' },
          { name: 'Same handler works over HTTP/1.1, HTTP/2 and HTTP/3', status: 'done' },
          { name: 'WHATWG-compliant event-stream framing', status: 'done' },
        ],
      },
      {
        id: 'server-ws', version: '0.9', date: '2026-07-01', status: 'done',
        features: [
          { name: 'RFC 6455 upgrade from HTTP/1.1 and HTTP/2 (RFC 8441)', status: 'done' },
          { name: 'wss:// and permessage-deflate (RFC 7692)', status: 'done' },
          { name: 'Full-duplex send/recv, backpressure, keepalive ping/pong', status: 'done' },
          { name: 'Subprotocol negotiation (WebSocketUpgrade)', status: 'done' },
          { name: 'Autobahn|Testsuite conformance: 246/246', status: 'done' },
        ],
      },
      {
        id: 'server-next', version: 'Next', status: 'planned',
        features: [
          { name: 'gRPC (over HTTP/2)', status: 'planned' },
          { name: 'Cross-thread stop()', status: 'planned' },
        ],
      },
    ],
  },
  {
    id: 'mobile',
    milestones: [
      {
        id: 'mobile-android', version: '0.1', status: 'active',
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
]
