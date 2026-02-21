---
layout: architecture
lang: en
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /en/architecture/zend-async-api.html
page_title: "TrueAsync ABI"
description: "Architecture of the PHP core asynchronous ABI -- function pointers, extension registration, global state, and ZEND_ASYNC_* macros."
---

# TrueAsync ABI

The `TrueAsync` `ABI` is built on a clear separation of **definition** and **implementation**:

| Layer           | Location                | Responsibility                                 |
|-----------------|-------------------------|-------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h` | Definition of types, structures, function pointers |
| **Extension**   | `ext/async/`            | Implementation of all functions, registration via API |

The `PHP` core does not call extension functions directly.
Instead, it uses `ZEND_ASYNC_*` macros that invoke `function pointers`
registered by the extension at load time.

This approach serves two goals:
1. The async engine can work with any number of extensions implementing the `ABI`
2. Macros reduce dependency on implementation details and minimize refactoring

## Global State

The portion of global state related to asynchrony resides in the PHP core
and is also accessible via the `ZEND_ASYNC_G(v)` macro, as well as other specialized ones,
such as `ZEND_ASYNC_CURRENT_COROUTINE`.

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // Scheduler heartbeat flag
    bool in_scheduler_context;          // TRUE if currently in the scheduler
    bool graceful_shutdown;             // TRUE during shutdown
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // Current coroutine
    zend_async_scope_t *main_scope;     // Root scope
    zend_coroutine_t *scheduler;        // Scheduler coroutine
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### Startup

Currently, `TrueAsync` does not start immediately but does so lazily at the "right" moment.
(This approach will change in the future, since virtually any PHP I/O function activates the `Scheduler`.)

When a `PHP` script begins execution, `TrueAsync` is in the `ZEND_ASYNC_READY` state.
On the first call to a function that requires the `Scheduler` via the `ZEND_ASYNC_SCHEDULER_LAUNCH()` macro,
the scheduler is initialized and transitions to the `ZEND_ASYNC_ACTIVE` state.

At this point, the code that was executing ends up in the main coroutine,
and a separate coroutine is created for the `Scheduler`.

In addition to `ZEND_ASYNC_SCHEDULER_LAUNCH()`, which explicitly activates the `Scheduler`,
`TrueAsync` also intercepts control in the `php_execute_script_ex` and `php_request_shutdown` functions.

```c
    // php_execute_script_ex

    if (prepend_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, prepend_file_p) == SUCCESS;
    }
    if (result) {
        result = zend_execute_script(ZEND_REQUIRE, retval, primary_file) == SUCCESS;
    }
    if (append_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, append_file_p) == SUCCESS;
    }

    ZEND_ASYNC_RUN_SCHEDULER_AFTER_MAIN();
    ZEND_ASYNC_INITIALIZE;
```

This code allows control to be passed to the `Scheduler` after the main thread finishes execution.
The `Scheduler` in turn can launch other coroutines if any exist.

This approach ensures not only 100% transparency of TrueAsync for the PHP programmer,
but also full `PHP SAPI` compatibility. Clients using `PHP SAPI` continue to treat `PHP` as synchronous,
even though an `EventLoop` is running internally.

In the `php_request_shutdown` function, the final interception occurs to execute coroutines in destructors,
after which the `Scheduler` shuts down and releases resources.

## Extension Registration

Since the `TrueAsync ABI` is part of the `PHP` core, it is available to all `PHP` extensions at the earliest stage.
Therefore, extensions have the opportunity to properly initialize `TrueAsync` before the `PHP Engine`
is launched to execute code.

An extension registers its implementations through a set of `_register()` functions.
Each function accepts a set of function pointers and writes them
to the core's global `extern` variables.

Depending on the extension's goals, `allow_override` permits legally re-registering function pointers.
By default, `TrueAsync` prohibits two extensions from defining the same `API` groups.

`TrueAsync` is divided into several categories, each with its own registration function:
* `Scheduler` -- API related to core functionality. Contains the majority of different functions
* `Reactor` -- API for working with the `Event loop` and events. Contains functions for creating different event types and managing the reactor lifecycle
* `ThreadPool` -- API for managing the thread pool and task queue
* `Async IO` -- API for asynchronous I/O, including file descriptors, sockets, and UDP
* `Pool` -- API for managing universal resource pools, with healthcheck and circuit breaker support

```c
zend_async_scheduler_register(
    char *module,                    // Module name
    bool allow_override,             // Allow overwrite
    zend_async_scheduler_launch_t,   // Launch scheduler
    zend_async_new_coroutine_t,      // Create coroutine
    zend_async_new_scope_t,          // Create scope
    zend_async_new_context_t,        // Create context
    zend_async_spawn_t,              // Spawn coroutine
    zend_async_suspend_t,            // Suspend
    zend_async_enqueue_coroutine_t,  // Enqueue
    zend_async_resume_t,             // Resume
    zend_async_cancel_t,             // Cancel
    // ... and others
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // Initialize event loop
    zend_async_reactor_shutdown_t,   // Shut down event loop
    zend_async_reactor_execute_t,    // One reactor tick
    zend_async_reactor_loop_alive_t, // Are there active events
    zend_async_new_socket_event_t,   // Create poll event
    zend_async_new_timer_event_t,    // Create timer
    zend_async_new_signal_event_t,   // Subscribe to signal
    // ... and others
);
```
