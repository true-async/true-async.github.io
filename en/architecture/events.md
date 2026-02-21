---
layout: architecture
lang: en
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /en/architecture/events.html
page_title: "Events and the Event Model"
description: "The base zend_async_event_t structure -- foundation of all asynchronous operations, callback system, flags, event hierarchy."
---

# Events and the Event Model

An event (`zend_async_event_t`) is a universal structure
from which **all** asynchronous primitives inherit:
coroutines, `future`, channels, timers, `poll` events, signals, and others.

The unified event interface allows:
- Subscribing to any event via callback
- Combining heterogeneous events in a single wait
- Managing the lifecycle through ref-counting

## Base Structure

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // Offset to additional data

    union {
        uint32_t ref_count;          // For C objects
        uint32_t zend_object_offset; // For Zend objects
    };

    uint32_t loop_ref_count;         // Event loop reference count

    zend_async_callbacks_vector_t callbacks;

    // Methods
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // Nullable
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // Nullable
    zend_async_event_callbacks_notify_t notify_handler; // Nullable
};
```

### Virtual Methods of an Event

Each event has a small set of virtual methods.

| Method           | Purpose                                            |
|------------------|----------------------------------------------------|
| `add_callback`   | Subscribe a callback to the event                  |
| `del_callback`   | Unsubscribe a callback                             |
| `start`          | Activate the event in the reactor                  |
| `stop`           | Deactivate the event                               |
| `replay`         | Re-deliver the result (for futures, coroutines)    |
| `dispose`        | Release resources                                  |
| `info`           | Text description of the event (for debugging)      |
| `notify_handler` | Hook called before notifying callbacks             |

#### `add_callback`

Adds a callback to the event's dynamic `callbacks` array.
Calls `zend_async_callbacks_push()`,
which increments the callback's `ref_count` and adds the pointer to the vector.

#### `del_callback`

Removes a callback from the vector (O(1) via swap with the last element)
and calls `callback->dispose`.

Typical scenario: during a `select` wait on multiple events,
when one fires, the others are unsubscribed via `del_callback`.

#### `start`

The `start` and `stop` methods are intended for events that can be placed into the `EventLoop`.
Therefore, not all primitives implement this method.

For EventLoop events, `start` increments the `loop_ref_count`, which allows
the event to remain in the EventLoop as long as it is needed by someone.

| Type                                           | What `start` does                                                        |
|------------------------------------------------|--------------------------------------------------------------------------|
| Coroutine, `Future`, `Channel`, `Pool`, `Scope` | Does nothing                                                            |
| Timer                                          | `uv_timer_start()` + increments `loop_ref_count` and `active_event_count` |
| Poll                                           | `uv_poll_start()` with event mask (READABLE/WRITABLE)                    |
| Signal                                         | Registers the event in the global signal table                           |
| IO                                             | Increments `loop_ref_count` -- libuv stream starts via read/write        |

#### `stop`

The mirror method of `start`. Decrements the `loop_ref_count` for EventLoop-type events.
The last `stop` call (when `loop_ref_count` reaches 0) actually stops the `handle`.

#### `replay`

Allows late subscribers to receive the result of an already completed event.
Implemented only by types that store a result.

| Type         | What `replay` returns                            |
|--------------|--------------------------------------------------|
| **Coroutine** | `coroutine->result` and/or `coroutine->exception` |
| **Future**   | `future->result` and/or `future->exception`       |

If a `callback` is provided, it is called synchronously with the result.
If `result`/`exception` is provided, values are copied to the pointers.
Without `replay`, waiting on a closed event produces a warning.

#### `dispose`

This method attempts to release the event by decrementing its `ref_count`.
If the count reaches zero, actual resource deallocation is triggered.

#### `info`

A human-readable string for debugging and logging.

| Type                 | Example string                                                           |
|----------------------|--------------------------------------------------------------------------|
| **Coroutine**        | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` or `"FutureState(pending)"`                   |
| **Iterator**         | `"iterator-completion"`                                                  |


#### `notify_handler`

A hook that intercepts notification **before** callbacks receive the result.
By default `NULL` for all events. Used in `Async\Timeout`:

## Event Lifecycle

![Event Lifecycle](/diagrams/ru/architecture-events/lifecycle.svg)

An event goes through several states:
- **Created** -- memory allocated, `ref_count = 1`, callbacks can be subscribed
- **Active** -- registered in the `EventLoop` (`start()`), increments `active_event_count`
- **Fired** -- `libuv` called the callback. For periodic events (timer, poll) -- returns to **Active**. For one-shot events (DNS, exec, Future) -- transitions to **Closed**
- **Stopped** -- temporarily removed from the `EventLoop` (`stop()`), can be reactivated
- **Closed** -- `flags |= F_CLOSED`, subscription is not possible, when `ref_count = 0` is reached, `dispose` is called

## Interaction: Event, Callback, Coroutine

![Event -> Callback -> Coroutine](/diagrams/ru/architecture-events/callback-flow.svg)

## Dual Life: C Object and Zend Object

Events often live in two worlds simultaneously.
A timer, `poll` handle, or `DNS` query is an internal `C` object managed by the `Reactor`.
But a coroutine or `Future` is also a `PHP` object accessible from user code.

C structures in the `EventLoop` may live longer than the `PHP` objects that reference them, and vice versa.
C objects use `ref_count`, while `PHP` objects use `GC_ADDREF/GC_DELREF`
with the garbage collector.

Therefore, `TrueAsync` supports several types of bindings between PHP objects and C objects.

### C Object

Internal events invisible from PHP code use the `ref_count` field.
When the last owner releases the reference, `dispose` is called:

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + dispose when reaching 0
```

### Zend Object

A coroutine is a `PHP` object implementing the `Awaitable` interface.
Instead of `ref_count`, they use the `zend_object_offset` field,
which points to the offset of the `zend_object` structure.

The `ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` macros work correctly in all cases.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

The `zend_object` is part of the event's C structure
and can be recovered using `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT`.

```c
// Get event from PHP object (accounting for event reference)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// Get PHP object from event
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## Event Reference

Some events face an architectural problem: they cannot be `Zend` objects directly.

For example, a timer. `PHP GC` may decide to collect the object at any moment, but `libuv` requires
asynchronous handle closure via `uv_close()` with a callback. If `GC` calls the destructor
while `libuv` hasn't finished working with the handle, we get `use-after-free`.

In this case, the **Event Reference** approach is used: the `PHP` object stores not the event itself, but a pointer to it:

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // Pointer to the actual event
} zend_async_event_ref_t;
```

With this approach, the lifetimes of the `PHP` object and the C event are **independent**.
The `PHP` object can be collected by `GC` without affecting the `handle`,
and the `handle` will close asynchronously when ready.

The `ZEND_ASYNC_OBJECT_TO_EVENT()` macro automatically recognizes a reference
by the `flags` prefix and follows the pointer.

## Callback System

Subscribing to events is the primary mechanism of interaction between coroutines and the outside world.
When a coroutine wants to wait for a timer, data from a socket, or completion of another coroutine,
it registers a `callback` on the corresponding event.

Each event stores a dynamic array of subscribers:

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // Pointer to the active iterator index (or NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` solves the problem of safely removing callbacks during iteration.

### Callback Structure

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

A callback is also a ref-counted structure. This is necessary because a single `callback`
can be referenced by both the event's vector and the coroutine's `waker` simultaneously.
`ref_count` ensures that memory is freed only when both sides release their reference.

### Coroutine Callback

Most callbacks in `TrueAsync` are used to wake up a coroutine.
Therefore, they store information about the coroutine and the event they subscribed to:

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // Inheritance
    zend_coroutine_t *coroutine;         // Who to wake
    zend_async_event_t *event;           // Where it came from
};
```

This binding is the foundation for the [Waker](/en/architecture/waker.html) mechanism:

## Event Flags

Bit flags in the `flags` field control the event's behavior at every stage of its lifecycle:

| Flag                  | Purpose                                                                          |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | Event is complete. `start`/`stop` no longer work, subscription is not possible   |
| `F_RESULT_USED`       | Someone is awaiting the result -- no unused result warning needed                |
| `F_EXC_CAUGHT`        | The error will be caught -- suppress unhandled exception warning                 |
| `F_ZVAL_RESULT`       | The result in the callback is a pointer to `zval` (not `void*`)                  |
| `F_ZEND_OBJ`          | The event is a `Zend` object -- switches `ref_count` to `GC_ADDREF`              |
| `F_NO_FREE_MEMORY`    | `dispose` should not free memory (object was not allocated via `emalloc`)        |
| `F_EXCEPTION_HANDLED` | Exception was handled -- no need to re-throw                                     |
| `F_REFERENCE`         | The structure is an `Event Reference`, not an actual event                        |
| `F_OBJ_REF`           | At `extra_offset` there is a pointer to `zend_object`                            |
| `F_CLOSE_FD`          | Close the file descriptor upon destruction                                       |
| `F_HIDDEN`            | Hidden event -- does not participate in `Deadlock Detection`                     |

### Deadlock Detection

`TrueAsync` tracks the number of active events in the `EventLoop` via `active_event_count`.
When all coroutines are suspended and there are no active events -- this is a `deadlock`:
no event can wake any coroutine.

But some events are always present in the `EventLoop` and are unrelated to user logic:
background `healthcheck` timers, system handlers. If they are counted as "active",
`deadlock detection` will never trigger.

For such events, the `F_HIDDEN` flag is used:

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // Mark as hidden
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, but only if NOT hidden
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, but only if NOT hidden
```

## Event Hierarchy

In `C` there is no class inheritance, but there is a technique: if the first field of a structure
is `zend_async_event_t`, then a pointer to the structure can be safely cast
to a pointer to `zend_async_event_t`. This is exactly how all specialized events
"inherit" from the base:

```
zend_async_event_t
|-- zend_async_poll_event_t      -- fd/socket polling
|   \-- zend_async_poll_proxy_t  -- proxy for event filtering
|-- zend_async_timer_event_t     -- timers (one-shot and periodic)
|-- zend_async_signal_event_t    -- POSIX signals
|-- zend_async_process_event_t   -- waiting for process termination
|-- zend_async_thread_event_t    -- background threads
|-- zend_async_filesystem_event_t -- filesystem changes
|-- zend_async_dns_nameinfo_t    -- reverse DNS
|-- zend_async_dns_addrinfo_t    -- DNS resolution
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- TCP server socket
|-- zend_async_trigger_event_t   -- manual wake-up (cross-thread safe)
|-- zend_async_task_t            -- thread pool task
|-- zend_async_io_t              -- unified I/O
|-- zend_coroutine_t             -- coroutine
|-- zend_future_t                -- future
|-- zend_async_channel_t         -- channel
|-- zend_async_group_t           -- task group
|-- zend_async_pool_t            -- resource pool
\-- zend_async_scope_t           -- scope
```

Thanks to this, a `Waker` can subscribe to **any** of these events
with the same `event->add_callback` call, without knowing the specific type.

### Examples of Specialized Structures

Each structure adds to the base event only those fields
that are specific to its type:

**Timer** -- minimal extension:
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // Milliseconds
    bool is_periodic;
};
```

**Poll** -- I/O tracking on a descriptor:
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // What to track: READABLE|WRITABLE|...
    async_poll_event triggered_events; // What actually happened
};
```

**Filesystem** -- filesystem monitoring:
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // Which file changed
};
```

**Exec** -- executing external commands:
```c
struct _zend_async_exec_event_s {
    zend_async_event_t base;
    zend_async_exec_mode exec_mode;    // exec/system/passthru/shell_exec
    bool terminated;
    char *cmd;
    zval *return_value;
    zend_long exit_code;
    int term_signal;
};
```

## Poll Proxy

Imagine a situation: two coroutines on a single TCP socket -- one reading, the other writing.
They need different events (`READABLE` vs `WRITABLE`), but the socket is one.

`Poll Proxy` solves this problem. Instead of creating two `uv_poll_t` handles
for the same fd (which is impossible in `libuv`), a single `poll_event` is created
along with several proxies with different masks:

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // Parent poll
    async_poll_event events;               // Event subset for this proxy
    async_poll_event triggered_events;     // What fired
};
```

The `Reactor` aggregates masks from all active proxies and passes the combined mask to `uv_poll_start`.
When `libuv` reports an event, the `Reactor` checks each proxy
and notifies only those whose mask matched.

## Async IO

For stream I/O operations (reading from a file, writing to a socket, working with pipes),
`TrueAsync` provides a unified `handle`:

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // For PIPE/FILE
        zend_socket_t socket;        // For TCP/UDP
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

The same `ZEND_ASYNC_IO_READ/WRITE/CLOSE` interface works with any type,
and the specific implementation is selected at `handle` creation time based on `type`.

All I/O operations are asynchronous and return a `zend_async_io_req_t` -- a one-shot request:

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // Operation error (or NULL)
    char *buf;                 // Data buffer
    bool completed;            // Operation complete?
    void (*dispose)(zend_async_io_req_t *req);
};
```

A coroutine calls `ZEND_ASYNC_IO_READ`, receives a `req`,
subscribes to its completion via the `Waker`, and goes to sleep.
When `libuv` completes the operation, `req->completed` becomes `true`,
the callback wakes the coroutine, and it retrieves data from `req->buf`.
