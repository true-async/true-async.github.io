// Glossary of key TrueAsync API symbols shown as hover tooltips inside code blocks.
// `path` is locale-agnostic; the current language prefix is added at runtime.
export interface GlossaryEntry {
  signature: string
  description: string
  path: string
}

export const apiGlossary: Record<string, GlossaryEntry> = {
  spawn: {
    signature: 'spawn(callable $fn): Coroutine',
    description: 'Starts $fn as a new coroutine. Returns a handle immediately; the body runs until its first suspension point.',
    path: '/docs/reference/spawn.html',
  },
  suspend: {
    signature: 'suspend(): void',
    description: 'Yields control from the current coroutine back to the scheduler, letting other coroutines run.',
    path: '/docs/reference/suspend.html',
  },
  await_all: {
    signature: 'await_all(iterable $coroutines): array',
    description: 'Suspends until every given coroutine finishes, then returns their results in order.',
    path: '/docs/components/future.html',
  },
  await_first: {
    signature: 'await_first(iterable $coroutines): mixed',
    description: 'Suspends until the first coroutine finishes and returns its result.',
    path: '/docs/components/future.html',
  },
  delay: {
    signature: 'delay(int $ms): void',
    description: 'Suspends the current coroutine for the given number of milliseconds without blocking the OS thread.',
    path: '/docs/reference/supported-functions.html',
  },
  coroutine_id: {
    signature: 'coroutine_id(): int',
    description: 'Returns the unique identifier of the currently running coroutine.',
    path: '/docs/reference/current-coroutine.html',
  },
  Scope: {
    signature: 'class Async\\Scope',
    description: 'A structured-concurrency sandbox that owns coroutines and controls their lifetime and cancellation.',
    path: '/docs/components/scope.html',
  },
  Coroutine: {
    signature: 'class Async\\Coroutine',
    description: 'A lightweight, cooperatively-scheduled unit of execution. Returned by spawn().',
    path: '/docs/components/coroutines.html',
  },
  Channel: {
    signature: 'class Async\\Channel',
    description: 'A buffered or unbuffered channel for passing values between coroutines (producer/consumer).',
    path: '/docs/components/channels.html',
  },
  Future: {
    signature: 'class Async\\Future',
    description: 'A deferred result of an asynchronous computation. Compose with await_all / await_first.',
    path: '/docs/components/future.html',
  },
  TaskGroup: {
    signature: 'class Async\\TaskGroup',
    description: 'Groups related coroutines so they can be awaited or cancelled together.',
    path: '/docs/components/scope.html',
  },
  ThreadPool: {
    signature: 'class Async\\ThreadPool',
    description: 'A pool of real OS threads for offloading CPU-bound work to run in parallel.',
    path: '/docs/components/thread-pool.html',
  },
  Thread: {
    signature: 'class Async\\Thread',
    description: 'Runs a closure in a separate parallel OS thread, with data transfer via ThreadChannel.',
    path: '/docs/components/threads.html',
  },
}
