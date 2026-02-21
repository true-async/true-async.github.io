---
layout: architecture
lang: en
path_key: "/architecture/scheduler-reactor.html"
nav_active: architecture
permalink: /en/architecture/scheduler-reactor.html
page_title: "Scheduler and Reactor"
description: "Internal design of the coroutine scheduler and event reactor -- queues, context switching, libuv, fiber pool."
---

# Coroutines, Scheduler, and Reactor

`Scheduler` and `Reactor` are the two main components of the runtime.
`Scheduler` manages the coroutine queue and context switching,
while `Reactor` handles `I/O` events through the `Event loop`.

![Scheduler and Reactor Interaction](/diagrams/ru/architecture-scheduler-reactor/architecture.svg)

## Scheduler

### Scheduler Coroutine and Minimizing Context Switches

In many coroutine implementations, the `scheduler` uses a separate thread
or at least a separate execution context. A coroutine calls `yield`,
control passes to the `scheduler`, which picks the next coroutine and switches to it.
This results in **two** context switches per `suspend`/`resume`: coroutine -> scheduler -> coroutine.

In `TrueAsync`, the `Scheduler` has **its own coroutine** (`ZEND_ASYNC_SCHEDULER`)
with a dedicated context. When all user coroutines are sleeping and the queue is empty,
control is passed to this coroutine, where the main loop runs: `reactor tick`, `microtasks`.

Because coroutines use a full execution context (stack + registers),
context switching takes roughly 10-20 ns on modern `x86`.
Therefore, `TrueAsync` optimizes the number of switches
by allowing some operations to execute directly in the current coroutine's context, without switching to the scheduler.

When a coroutine calls a `SUSPEND()` operation, `scheduler_next_tick()` is called directly in the current coroutine's context --
a function that performs one scheduler tick: microtasks, reactor, queue check.
If there is a ready coroutine in the queue, the `Scheduler` switches to it **directly**,
bypassing its own coroutine. This is one `context switch` instead of two.
Moreover, if the next coroutine in the queue hasn't started yet and the current one has already finished,
no switch is needed at all -- the new coroutine receives the current context.

Switching to the `Scheduler` coroutine (via `switch_to_scheduler()`) occurs **only** if:
- The coroutine queue is empty and the reactor needs to wait for events
- Switching to another coroutine failed
- A deadlock is detected

### Main Loop

![Scheduler Main Loop](/diagrams/ru/architecture-scheduler-reactor/scheduler-loop.svg)

On each tick, the scheduler performs:

1. **Microtasks** -- processing the `microtasks` queue (small tasks without context switching)
2. **Coroutine queue** -- extracting the next coroutine from the `coroutine_queue`
3. **Context switching** -- `zend_fiber_switch_context()` to the selected coroutine
4. **Result handling** -- checking the coroutine's status after return
5. **Reactor** -- if the queue is empty, calling `ZEND_ASYNC_REACTOR_EXECUTE(no_wait)`

### Microtasks

Not every action deserves a coroutine. Sometimes you need to do something quick
between switches: update a counter, send a notification, release a resource.
Creating a coroutine for this is excessive, yet the action needs to be performed as soon as possible.
This is where microtasks come in handy -- lightweight handlers that execute
directly in the current coroutine's context, without switching.

Microtasks must be lightweight, fast handlers since they get direct access
to the scheduler's loop. In early versions of `TrueAsync`, microtasks could reside in PHP-land, but
due to strict rules and performance considerations, the decision was made to keep this mechanism
for C code only.

```c
struct _zend_async_microtask_s {
    zend_async_microtask_handler_t handler;
    zend_async_microtask_handler_t dtor;
    bool is_cancelled;
    uint32_t ref_count;
};
```

In `TrueAsync`, microtasks are processed via a FIFO queue before each coroutine switch.
If a microtask throws an exception, processing is interrupted.
After execution, the microtask is immediately removed from the queue, and its active reference count is decremented by one.

Microtasks are used in scenarios such as the concurrent iterator, allowing iteration
to automatically transfer to another coroutine if the previous one entered a waiting state.

### Coroutine Priorities

Under the hood, `TrueAsync` uses the simplest type of queue: a circular buffer. This is probably the best solution
in terms of the balance between simplicity, performance, and functionality.

There is no guarantee that the queue algorithm won't change in the future. That said, there are rare occasions
when coroutine priority matters.

Currently, two priorities are used:

```c
typedef enum {
    ZEND_COROUTINE_NORMAL = 0,
    ZEND_COROUTINE_HI_PRIORITY = 255
} zend_coroutine_priority;
```

High-priority coroutines are placed **at the head** of the queue during `enqueue`.
Extraction always happens from the head. No complex scheduling,
just insertion order. This is a deliberate simple approach: two levels cover
real-world needs, while complex priority queues (as in `RTOS`) would add overhead
unjustified in the context of PHP applications.

### Suspend and Resume

![Suspend and Resume Operations](/diagrams/ru/architecture-scheduler-reactor/suspend-resume.svg)

`Suspend` and `Resume` operations are the core tasks of the `Scheduler`.

When a coroutine calls `suspend`, the following happens:

1. The coroutine's `waker` events are started (`start_waker_events`).
   Only at this moment do timers begin ticking and poll objects
   start listening on descriptors. Before calling `suspend`, events are not active --
   this allows preparing all subscriptions first, then starting the wait with a single call.
2. **Without a context switch**, `scheduler_next_tick()` is called:
   - Microtasks are processed
   - A `reactor tick` is performed (if enough time has passed)
   - If there is a ready coroutine in the queue, `execute_next_coroutine()` switches to it
   - If the queue is empty, `switch_to_scheduler()` switches to the `scheduler` coroutine
3. When control returns, the coroutine wakes up with the `waker` object that holds the `suspend` result.

**Fast return path**: if during `start_waker_events` an event has already fired
(e.g., a `Future` is already completed), the coroutine **is not suspended at all** --
the result is available immediately. Therefore, `await` on a completed
`Future` does not trigger `suspend` and does not cause a context switch, returning the result directly.

## Context Pool

A context is a full `C stack` (`EG(fiber_stack_size)` by default).
Since stack creation is an expensive operation, `TrueAsync` strives to optimize memory management.
We account for the memory usage pattern: coroutines are constantly dying and being created.
The pool pattern is ideal for this scenario!

```c
struct _async_fiber_context_s {
    zend_fiber_context context;     // Native C fiber (stack + registers)
    zend_vm_stack vm_stack;         // Zend VM stack
    zend_execute_data *execute_data;// Current execute_data
    uint8_t flags;                  // Fiber state
};
```

Instead of constantly creating and destroying memory, the Scheduler returns contexts to the pool
and reuses them over and over.

Smart pool size management algorithms are planned
that will dynamically adapt to the workload
to minimize both `mmap`/`mprotect` latency and overall memory footprint.

### Switch Handlers

In `PHP`, many subsystems rely on a simple assumption:
code executes from start to finish without interruption.
The output buffer (`ob_start`), object destructors, global variables --
all of this works linearly: start -> end.

Coroutines break this model. A coroutine can sleep in the middle of its work
and wake up after thousands of other operations. Between `LEAVE` and `ENTER`
on the same thread, dozens of other coroutines will have run.

`Switch Handlers` are hooks bound to a **specific coroutine**.
Unlike microtasks (which fire on any switch),
a `switch handler` is called only on enter and exit of "its" coroutine:

```c
typedef bool (*zend_coroutine_switch_handler_fn)(
    zend_coroutine_t *coroutine,
    bool is_enter,    // true = enter, false = exit
    bool is_finishing // true = coroutine is finishing
    // return: true = keep handler, false = remove
);
```

The return value controls the handler's lifetime:
* `true` -- the `handler` stays and will be called again.
* `false` -- the `Scheduler` will remove it.

The `Scheduler` calls handlers at three points:

```c
ZEND_COROUTINE_ENTER(coroutine)  // Coroutine received control
ZEND_COROUTINE_LEAVE(coroutine)  // Coroutine yielded control (suspend)
ZEND_COROUTINE_FINISH(coroutine) // Coroutine is finishing permanently
```

#### Example: Output Buffer

The `ob_start()` function uses a single handler stack.
When a coroutine calls `ob_start()` and then goes to sleep, another coroutine may see the other's buffer if nothing is done.
(By the way, **Fiber** does not handle `ob_start()` properly.)

A one-shot `switch handler` solves this at coroutine startup:
it moves the global `OG(handlers)` into the coroutine's context and clears the global state.
After this, each coroutine works with its own buffer, and `echo` in one doesn't mix with another.

#### Example: Destructors During Shutdown

When `PHP` shuts down, `zend_objects_store_call_destructors()` is called --
traversing the object store and calling destructors. Normally this is a linear process.

But a destructor may contain `await`. For example, a database connection object
wants to properly close the connection -- which is a network operation.
The coroutine calls `await` inside the destructor and goes to sleep.

The remaining destructors need to continue. The `switch handler` catches the `LEAVE` moment
and spawns a new high-priority coroutine that continues the traversal
from the object where the previous one stopped.

#### Registration

```c
// Add handler to a specific coroutine
ZEND_COROUTINE_ADD_SWITCH_HANDLER(coroutine, handler);

// Add to the current coroutine (or to main if Scheduler hasn't started yet)
ZEND_ASYNC_ADD_SWITCH_HANDLER(handler);

// Add handler that fires when the main coroutine starts
ZEND_ASYNC_ADD_MAIN_COROUTINE_START_HANDLER(handler);
```

The last macro is needed by subsystems that initialize before the `Scheduler` starts.
They register a handler globally, and when the `Scheduler` creates the `main` coroutine,
all global handlers are copied into it and fire as `ENTER`.

## Reactor

### Why libuv?

`TrueAsync` uses `libuv`, the same library that powers `Node.js`.

The choice is deliberate. `libuv` provides:
- A unified `API` for `Linux` (`epoll`), macOS (`kqueue`), Windows (`IOCP`)
- Built-in support for timers, signals, `DNS`, child processes, file I/O
- A mature codebase tested by billions of requests in production

Alternatives (`libev`, `libevent`, `io_uring`) were considered,
but `libuv` wins on usability.

### Structure

```c
// Reactor global data (in ASYNC_G)
uv_loop_t uvloop;
bool reactor_started;
uint64_t last_reactor_tick;

// Signal management
HashTable *signal_handlers;  // signum -> uv_signal_t*
HashTable *signal_events;    // signum -> HashTable* (events)
HashTable *process_events;   // SIGCHLD process events
```

### Event Types and Wrappers

Each event in `TrueAsync` has a dual nature: an `ABI` structure defined in the `PHP` core,
and a `libuv handle` that actually interacts with the `OS`. The `Reactor` "glues" them together,
creating wrappers where both worlds coexist:

| Event Type       | ABI Structure                   | libuv handle                  |
|------------------|---------------------------------|-------------------------------|
| Poll (fd/socket) | `zend_async_poll_event_t`       | `uv_poll_t`                   |
| Timer            | `zend_async_timer_event_t`      | `uv_timer_t`                  |
| Signal           | `zend_async_signal_event_t`     | Global `uv_signal_t`          |
| Filesystem       | `zend_async_filesystem_event_t` | `uv_fs_event_t`               |
| DNS              | `zend_async_dns_addrinfo_t`     | `uv_getaddrinfo_t`            |
| Process          | `zend_async_process_event_t`    | `HANDLE` (Win) / `waitpid`    |
| Thread           | `zend_async_thread_event_t`     | `uv_thread_t`                 |
| Exec             | `zend_async_exec_event_t`       | `uv_process_t` + `uv_pipe_t` |
| Trigger          | `zend_async_trigger_event_t`    | `uv_async_t`                  |

For more details on event structure, see [Events and the Event Model](/en/architecture/events.html).

### Async IO

For stream operations, a unified `async_io_t` is used:

```c
struct _async_io_t {
    zend_async_io_t base;   // ABI: event + fd/socket + type + state
    int crt_fd;             // CRT file descriptor
    async_io_req_t *active_req;
    union {
        uv_stream_t stream;
        uv_pipe_t pipe;
        uv_tty_t tty;
        uv_tcp_t tcp;
        uv_udp_t udp;
        struct { zend_off_t offset; } file;
    } handle;
};
```

The same interface (`ZEND_ASYNC_IO_READ/WRITE/CLOSE`) works with `PIPE`, `FILE`, `TCP`, `UDP`, `TTY`.
The specific implementation is selected at handle creation time based on `type`.

### Reactor Loop

`reactor_execute(no_wait)` calls one tick of the `libuv` `event loop`:
- `no_wait = true` -- non-blocking call, process only ready events
- `no_wait = false` -- block until the next event

The `Scheduler` uses both modes. Between coroutine switches -- a non-blocking tick
to collect events that have already fired. When the coroutine queue is empty --
a blocking call to avoid wasting CPU in an idle loop.

This is a classic strategy from the world of event-driven servers: `nginx`, `Node.js`,
and `Tokio` use the same principle: poll without waiting while there's work to do,
and sleep when there's no work.

## Switching Efficiency: TrueAsync in the Industry Context

### Stackful vs Stackless: Two Worlds

There are two fundamentally different approaches to implementing coroutines:

**Stackful** (Go, Erlang, Java Loom, PHP Fibers) -- each coroutine has its own C stack.
Switching involves saving/restoring registers and the stack pointer.
The main advantage: **transparency**. Any function at any call depth can invoke `suspend`
without requiring special annotations. The programmer writes ordinary synchronous code.

**Stackless** (Rust async/await, Kotlin, C# async) -- the compiler transforms an `async` function
into a state machine. "Suspending" is just a `return` from the function,
and "resuming" is a method call with a new state number. The stack is not switched at all.
The cost: **"function coloring"** (`async` infects the entire call chain).

| Property                                  | Stackful                          | Stackless                         |
|-------------------------------------------|-----------------------------------|-----------------------------------|
| Suspension from nested calls              | Yes                               | No -- only from `async` functions |
| Switching cost                            | 15-200 ns (register save)         | 10-50 ns (writing fields to object) |
| Memory per coroutine                      | 4-64 KiB (separate stack)         | Exact state machine size          |
| Compiler optimization through yield       | Not possible (stack is opaque)    | Possible (inline, HALO)           |

`PHP coroutines` are **stackful** coroutines based on `Boost.Context fcontext_t`.

### Architectural Trade-off

`TrueAsync` chooses the **stackful single-threaded** model:

- **Stackful** -- because the `PHP` ecosystem is huge, and "coloring" millions of lines
  of existing code with `async` is expensive. Stackful coroutines allow using regular C functions, which is a critical requirement for PHP.
- **Single-threaded** -- PHP is historically single-threaded (no shared mutable state),
  and this property is easier to preserve than to deal with its consequences.
  Threads appear only in the `ThreadPool` for `CPU-bound` tasks.

Since `TrueAsync` currently reuses the low-level `Fiber API`,
the context switching cost is relatively high and may be improved in the future.

## Graceful Shutdown

A `PHP` script can terminate at any moment: an unhandled exception, `exit()`,
an OS signal. But in the async world, dozens of coroutines may hold open connections,
unwritten buffers, and uncommitted transactions.

`TrueAsync` handles this through a controlled shutdown:

1. `ZEND_ASYNC_SHUTDOWN()` -> `start_graceful_shutdown()` -- sets the flag
2. All coroutines receive a `CancellationException`
3. Coroutines get the opportunity to execute `finally` blocks -- close connections, flush buffers
4. `finally_shutdown()` -- final cleanup of remaining coroutines and microtasks
5. The Reactor stops

```c
#define TRY_HANDLE_EXCEPTION() \
    if (UNEXPECTED(EG(exception) != NULL)) { \
        if (ZEND_ASYNC_GRACEFUL_SHUTDOWN) { \
            finally_shutdown(); \
            break; \
        } \
        start_graceful_shutdown(); \
    }
```
