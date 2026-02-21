---
layout: architecture
lang: en
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /en/architecture/frankenphp.html
page_title: "FrankenPHP Integration"
description: "How TrueAsync turns FrankenPHP into a fully asynchronous server -- a coroutine per request, zero-copy responses, dual notification path."
---

# TrueAsync + FrankenPHP: Many Requests, One Thread

In this article, we examine the experience of integrating `FrankenPHP` with `TrueAsync`.
`FrankenPHP` is a server based on `Caddy` that runs `PHP` code inside a `Go` process.
We added `TrueAsync` support to `FrankenPHP`, allowing each `PHP` thread to handle multiple requests simultaneously,
using `TrueAsync` coroutines for orchestration.

## How FrankenPHP Works

`FrankenPHP` is a process that bundles the `Go` world (`Caddy`) and `PHP` together.
`Go` owns the process, while `PHP` acts as a "plugin" that `Go` interacts with through `SAPI`.
To make this work, the `PHP` virtual machine runs in a separate thread. `Go` creates these threads
and calls `SAPI` functions to execute `PHP` code.

For each request, `Caddy` creates a separate goroutine that handles the HTTP request.
The goroutine selects a free `PHP` thread from the pool and sends the request data via a channel,
then enters a waiting state.

When `PHP` finishes forming the response, the goroutine receives it via the channel and passes it back to `Caddy`.

We changed this approach so that goroutines now send multiple requests to the same `PHP` thread,
and the `PHP` thread learns to handle such requests asynchronously.

### General Architecture

![General FrankenPHP + TrueAsync Architecture](/diagrams/en/architecture-frankenphp/architecture.svg)

The diagram shows three layers. Let's examine each one.

### Integrating Go into the TrueAsync Scheduler

For the application to work, the PHP `Reactor` and `Scheduler` must be integrated with `Caddy`.
Therefore, we need some cross-thread communication mechanism that is compatible
with both the `Go` and `PHP` worlds. `Go` channels are excellent for data transfer between threads
and are accessible from `C-Go`. But they are not sufficient, since the `EventLoop` cycle may go to sleep.

There is an old well-known approach
that can be found in almost any web server: a combination of a transfer channel
and an `fdevent` (on macOS/Windows a `pipe` is used).

If the channel is not empty, `PHP` will be reading from it, so we just add another value.
If the channel is empty, the `PHP` thread is sleeping and needs to be woken up. That's what `Notify()` is for.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- the fastest option
        // ...
    }
    // Fallback: pipe for macOS/BSD
    syscall.Pipe(fds[:])
}
```

On the `PHP` side, the `eventfd` descriptor is registered in the `Reactor`:

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

The `Reactor` (based on `libuv`) starts monitoring the descriptor. As soon as `Go` writes
to `eventfd`, the `Reactor` wakes up and calls the request handling callback.

Now, when a goroutine packages request data
into a `contextHolder` structure and passes it to the `Dispatcher` for delivery to the `PHP` thread.
The `Dispatcher` cycles through `PHP` threads in round-robin fashion
and attempts to send the request context to
the buffered `Go` channel (`requestChan`) bound to a specific thread.
If the buffer is full, the `Dispatcher` tries the next thread.
If all are busy -- the client receives `HTTP 503`.

```go
start := w.rrIndex.Add(1) % uint32(len(w.threads))
for i := 0; i < len(w.threads); i++ {
    idx := (start + uint32(i)) % uint32(len(w.threads))
    select {
    case thread.requestChan <- ch:
        if len(thread.requestChan) == 1 {
            thread.asyncNotifier.Notify()
        }
        return nil
    default:
        continue
    }
}
return ErrAllBuffersFull // HTTP 503
```

### Integration with the Scheduler

When `FrankenPHP` initializes and creates `PHP` threads,
it integrates with the `Reactor`/`Scheduler` using the `True Async ABI` (`zend_async_API.h`).

The `frankenphp_enter_async_mode()` function is responsible for this process and is called once
when the `PHP` script registers a callback via `HttpServer::onRequest()`:

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Get the notifier FD from Go
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. Register FD in the Reactor (slow path)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. Launch the Scheduler
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. Replace the heartbeat handler (fast path)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. Suspend the main coroutine
    frankenphp_suspend_main_coroutine();

    // --- we only reach here on shutdown ---

    // 6. Restore the heartbeat handler
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. Release resources
    close_request_event();
}
```

We use a `heartbeat handler`, a special callback from the `Scheduler`, to add our own handler
for each `Scheduler` tick. This handler allows `FrankenPHP` to create new
coroutines for request processing.

![Dual Notification System](/diagrams/en/architecture-frankenphp/notification.svg)

Now the `Scheduler` calls the `heartbeat handler` on each tick. This handler
checks the `Go` channel via `CGo`:

```c
void frankenphp_scheudler_tick_handler(void) {
    uint64_t request_id;
    while ((request_id = go_async_worker_check_requests(thread_index)) != 0) {
        if (request_id == UINT64_MAX) {
            ZEND_ASYNC_SHUTDOWN();
            return;
        }
        frankenphp_handle_request_async(request_id);
    }
    if (old_heartbeat_handler) old_heartbeat_handler();
}
```

No system calls, no `epoll_wait`, a direct call to a `Go` function via `CGo`.
Instant return if the channel is empty.
The cheapest possible operation, which is a mandatory requirement for the `heartbeat handler`.

If all coroutines are asleep, the `Scheduler` passes control to the `Reactor`,
and the `heartbeat` stops ticking. Then the `AsyncNotifier` kicks in:
the `Reactor` waits on `epoll`/`kqueue` and wakes up when `Go` writes to the descriptor.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

The two systems complement each other: `heartbeat` provides minimal latency under load,
while the `poll event` ensures zero `CPU` consumption during idle periods.

### Creating a Request Coroutine

The `frankenphp_request_coroutine_entry()` function is responsible for creating the request handling coroutine:

![Request Lifecycle](/diagrams/en/architecture-frankenphp/request-lifecycle.svg)

```c
void frankenphp_handle_request_async(uint64_t request_id) {
    zend_async_scope_t *request_scope =
        ZEND_ASYNC_NEW_SCOPE(ZEND_ASYNC_CURRENT_SCOPE);

    zend_coroutine_t *coroutine =
        ZEND_ASYNC_NEW_COROUTINE(request_scope);

    coroutine->internal_entry = frankenphp_request_coroutine_entry;
    coroutine->extended_data = (void *)(uintptr_t)request_id;

    ZEND_ASYNC_ENQUEUE_COROUTINE(coroutine);
}
```

A **separate `Scope`** is created for each request. This is an isolated context
that allows controlling the lifecycle of the coroutine and its resources.
When a `Scope` completes, all coroutines within it are cancelled.

### Interaction with PHP Code

To create coroutines, `FrankenPHP` needs to know the handler function.
The handler function must be defined by the PHP programmer.
This requires initialization code on the `PHP` side. The `HttpServer::onRequest()` function
serves as this initializer, registering a `PHP` callback for handling `HTTP` requests.

From the `PHP` side, everything looks simple:

```php
use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response) {
    $uri = $request->getUri();
    $body = $request->getBody();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['uri' => $uri]));
    $response->end();
});
```

Initialization happens in the main coroutine.
The programmer must create an `HttpServer` object, call `onRequest()`, and explicitly "start" the server.
After that, `FrankenPHP` takes over control and blocks the main coroutine until the server shuts down.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // always false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

To send results back to `Caddy`, `PHP` code uses the `Response` object,
which provides `write()` and `end()` methods.
Under the hood, memory is copied and results are sent to the channel.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## Source Code

The integration repository is a fork of `FrankenPHP` with the `true-async` branch:

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) -- integration repository

Key files:

| File                                                                                                        | Description                                                                 |
|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | Integration with `Scheduler`/`Reactor`: heartbeat, poll event, coroutine creation |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | PHP classes `HttpServer`, `Request`, `Response`                              |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Go side: `round-robin`, `requestChan`, `responseChan`, `CGo` exports         |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`: `eventfd` (Linux) / `pipe` (macOS)                          |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | Integration documentation                                                    |

TrueAsync ABI used by the integration:

| File                                                                                                     | Description                                       |
|----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/aspect-build/php-src/blob/true-async/Zend/zend_async_API.h) | API definition: macros, function pointers, types  |
| [`Zend/zend_async_API.c`](https://github.com/aspect-build/php-src/blob/true-async/Zend/zend_async_API.c) | Infrastructure: registration, stub implementations |
