---
layout: architecture
lang: en
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /en/architecture/waker.html
page_title: "Waker -- Wait and Wake-up Mechanism"
description: "Internal design of the Waker -- the link between coroutines and events: statuses, resume_when, timeout, error delivery."
---

# Coroutine Wait and Wake-up Mechanism

To store the waiting context of a coroutine,
`TrueAsync` uses the `Waker` structure.
It serves as the link between a coroutine and the events it is subscribed to.
Thanks to the `Waker`, a coroutine always knows exactly which events it is waiting for.

## Waker Structure

For memory optimization purposes, the `waker` is integrated directly into the coroutine structure (`zend_coroutine_t`),
which avoids additional allocations and simplifies memory management,
although a `zend_async_waker_t *waker` pointer is used in the code for backward compatibility.

The `Waker` holds a list of awaited events and aggregates the wait result or exception.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // Events the coroutine is waiting for
    HashTable events;

    // Events that fired on the last iteration
    HashTable *triggered_events;

    // Wake-up result
    zval result;

    // Error (if wake-up was caused by an error)
    zend_object *error;

    // Creation point (for debugging)
    zend_string *filename;
    uint32_t lineno;

    // Destructor
    zend_async_waker_dtor dtor;
};
```

## Waker Statuses

At each stage of a coroutine's life, the `Waker` is in one of five states:

![Waker Statuses](/diagrams/en/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Waker is not active
    ZEND_ASYNC_WAKER_WAITING,   // Coroutine is waiting for events
    ZEND_ASYNC_WAKER_QUEUED,    // Coroutine is queued for execution
    ZEND_ASYNC_WAKER_IGNORED,   // Coroutine was skipped
    ZEND_ASYNC_WAKER_RESULT     // Result is available
} ZEND_ASYNC_WAKER_STATUS;
```

A coroutine starts with `NO_STATUS` -- the `Waker` exists but is not active; the coroutine is executing.
When the coroutine calls `SUSPEND()`, the `Waker` transitions to `WAITING` and begins monitoring events.

When one of the events fires, the `Waker` transitions to `QUEUED`: the result is saved,
and the coroutine is placed in the `Scheduler` queue awaiting a context switch.

The `IGNORED` status is needed for cases when a coroutine is already in the queue but must be destroyed.
In that case, the `Scheduler` does not launch the coroutine but immediately finalizes its state.

When the coroutine wakes up, the `Waker` transitions to the `RESULT` state.
At this point, `waker->error` is transferred to `EG(exception)`.
If there are no errors, the coroutine can use `waker->result`. For example, `result` is what the
`await()` function returns.

## Creating a Waker

```c
// Get waker (create if it doesn't exist)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// Reinitialize waker for a new wait
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// With timeout and cancellation
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` destructs the existing waker
and resets it to its initial state. This allows reusing
the waker without allocations.

## Subscribing to Events

The zend_async_API.c module provides several ready-made functions to bind a coroutine to an event:

```c
zend_async_resume_when(
    coroutine,        // Which coroutine to wake
    event,            // Which event to subscribe to
    trans_event,      // Transfer event ownership
    callback,         // Callback function
    event_callback    // Coroutine callback (or NULL)
);
```

`resume_when` is the main subscription function.
It creates a `zend_coroutine_event_callback_t`, binds it
to the event and to the coroutine's waker.

As the callback function, you can use one of three standard ones,
depending on how you want to wake the coroutine:

```c
// Successful result
zend_async_waker_callback_resolve(event, callback, result, exception);

// Cancellation
zend_async_waker_callback_cancel(event, callback, result, exception);

// Timeout
zend_async_waker_callback_timeout(event, callback, result, exception);
```
