import type { TutorialStrings } from '../tutorialData'

const en: TutorialStrings = {
  coreGroup: 'Basics',
  serverGroup: 'TrueAsync Server',
  progress: 'completed',
  readMore: 'Read',
  core: [
    { label: 'Coroutines', body: 'Your first look at coroutines: spawn() and concurrent execution.' },
    { label: 'Cancellation', body: 'How cancel() and cooperative cancellation work.' },
    { label: 'Await', body: 'Why await() exists and how it works with coroutines.' },
    { label: 'Exceptions', body: 'How exceptions from a coroutine propagate through await().' },
    { label: 'Timeouts', body: 'Bounding how long await() waits with timeout().' },
    { label: 'Future', body: "Future and FutureState: a promise of a result that isn't tied to a coroutine." },
    { label: 'Channels', body: 'Channel: a stream of values between coroutines, worker pools, and backpressure.' },
    { label: 'Scope', body: 'Who owns a group of coroutines, waits for them, and cancels them together.' },
    { label: 'PDO Pool', body: "Why coroutines can't share one PDO connection, and how the built-in pool solves it transparently." },
    { label: 'TaskGroup', body: 'A group of tasks with results and all, race, any waiting strategies.' },
    { label: 'TaskSet', body: 'A stream of tasks with auto-cleanup, joinNext/joinAny/joinAll, and a supervisor loop.' },
    { label: 'Concurrent Iterator', body: 'iterate(): concurrent traversal of a collection in one line.' },
    { label: 'Pool', body: 'Async\\Pool: a general-purpose resource pool with health checks and a circuit breaker.' },
    { label: 'Threads', body: 'spawn_thread and ThreadPool: real parallelism for CPU-bound work.' },
    { label: 'Context', body: 'Where to keep "the current thing" now that global variables no longer work.' },
  ],
  server: [
    { label: 'First Server', body: 'An HTTP server inside PHP: HttpServer, HttpServerConfig, and your first handler.' },
    { label: 'Request and Response', body: 'HttpRequest and HttpResponse: routing, json(), and errors via HttpException.' },
    { label: 'Concurrency Inside a Request', body: 'TaskGroup in a handler, the PDO Pool under load, and request_context().' },
    { label: 'Byte Streams', body: 'send() and sendable(), streaming the request body, file uploads, and sendFile().' },
    { label: 'Static Files', body: 'StaticHandler: serving files without a PHP coroutine, caching, and safety policies.' },
    { label: 'Server-Sent Events', body: 'SSE: a stream of events to the browser, import progress, and heartbeats via sseComment().' },
    { label: 'WebSocket', body: 'The recv loop, a chat room, send from other coroutines, and trySend against slow clients.' },
    { label: 'Workers and HTTP/3', body: 'setWorkers(): threads under the server hood, the bootloader, and HTTP/3 on the same port.' },
    { label: 'Production', body: 'Timeouts, limits, backpressure on accept, compression, logging, and graceful shutdown.' },
    { label: 'gRPC', body: 'addGrpcHandler(): unary and streaming, readMessage/writeMessage, trailers, and deadlines.' },
  ],
  laravelGroup: 'Laravel',
  laravel: [
    { label: 'First Run', body: 'Running Laravel under TrueAsync Server and your first API, from routes to the database.' },
    { label: 'Pool & Transactions', body: "PDO Pool under Eloquent and CoroutineTransactions: why the nested transaction counter can't stay on a Connection property." },
    { label: 'SSE & gRPC', body: 'trueasync_response(), Sse, and grpc_handlers: reaching past the buffered Illuminate Response right from a controller.' },
    { label: 'Unsafe Patterns', body: 'Mutable static properties, once() on a singleton, and Number::useLocale(): the usual ways state leaks between requests, and how to catch them with static analysis.' },
    { label: 'Third-Party Packages', body: "Debugbar, Telescope, Inertia, spatie/permission, Socialite: what's already adapted for coroutines and what's worth disabling." },
  ],
}

export default en
