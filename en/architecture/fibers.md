---
layout: architecture
lang: en
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /en/architecture/fibers.html
page_title: "Fibers in TrueAsync"
description: "How TrueAsync changes Fiber behavior — coroutine mode, GC, refcount, parameters, exit/bailout, destructors."
---

# Fibers in TrueAsync

In standard `PHP`, a fiber (`Fiber`) is a cooperative thread with its own call stack.
When the `TrueAsync` extension is loaded, the fiber switches to **coroutine mode**:
instead of direct stack switching, the fiber gets its own coroutine
managed by the scheduler (`Scheduler`).

This article describes the key changes in fiber behavior when using `TrueAsync`.

## Fiber Coroutine Mode

When creating `new Fiber(callable)`, if `TrueAsync` is active, instead of initializing
a stack-switching context, a coroutine is created:

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

Calling `$fiber->start()` does not switch the stack directly but enqueues the coroutine
into the scheduler via `ZEND_ASYNC_ENQUEUE_COROUTINE`, after which the calling code
suspends in `zend_fiber_await()` until the fiber completes or suspends.

## Coroutine Refcount Lifecycle

The fiber explicitly retains its coroutine via `ZEND_ASYNC_EVENT_ADD_REF`:

```
After constructor:   coroutine refcount = 1 (scheduler)
After start():       coroutine refcount = 2 (scheduler + fiber)
```

The additional `+1` from the fiber is necessary to keep the coroutine alive
after completion; otherwise `getReturn()`, `isTerminated()`, and other methods
would be unable to access the result.

The `+1` is released in the fiber destructor (`zend_fiber_object_destroy`):

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Fiber::start() Parameters — Copying to the Heap

The `Z_PARAM_VARIADIC_WITH_NAMED` macro, when parsing `Fiber::start()` arguments,
sets `fcall->fci.params` as a pointer directly into the VM frame stack.
In standard PHP this is safe — `zend_fiber_execute` is called immediately
via a stack switch, and the `Fiber::start()` frame is still alive.

In coroutine mode, `fcall->fci.params` can become
a dangling pointer if the awaited coroutine is destroyed first.
There is no way to guarantee this will never happen.

Therefore, after parsing the parameters, we copy them to heap memory:

```c
if (fiber->coroutine != NULL && fiber->fcall != NULL) {
    if (fiber->fcall->fci.param_count > 0) {
        uint32_t count = fiber->fcall->fci.param_count;
        zval *heap_params = emalloc(sizeof(zval) * count);
        for (uint32_t i = 0; i < count; i++) {
            ZVAL_COPY(&heap_params[i], &fiber->fcall->fci.params[i]);
        }
        fiber->fcall->fci.params = heap_params;
    }
    if (fiber->fcall->fci.named_params) {
        GC_ADDREF(fiber->fcall->fci.named_params);
    }
}
```

Now `coroutine_entry_point`
can safely use and release the parameters.

## GC for Coroutine Fibers

Instead of adding the coroutine object to the GC buffer, `zend_fiber_object_gc`
directly traverses the coroutine's execution stack and passes the found variables:

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Stack traversal — same as for a regular fiber
        for (; ex; ex = ex->prev_execute_data) {
            // ... add CVs to GC buffer ...
        }
    }
}
```

This only works for the `YIELD` state (fiber suspended via `Fiber::suspend()`).
For other states (running, awaiting child), the stack is active and cannot be traversed.

## Destructors from GC

In standard PHP, destructors of objects found by `GC` are called synchronously
in the same context. In `TrueAsync`, GC runs in a separate GC coroutine
(see [Garbage Collection in an Asynchronous Context](async-gc.html)).

This means:

1. **Execution order** — destructors run asynchronously, after returning
   from `gc_collect_cycles()`.

2. **`Fiber::suspend()` in a destructor** — not possible. The destructor runs
   in the GC coroutine, not in a fiber. Calling `Fiber::suspend()` will result
   in the error "Cannot suspend outside of a fiber".

3. **`Fiber::getCurrent()` in a destructor** — returns `NULL`, since the destructor
   runs outside a fiber context.

For this reason, tests that expect synchronous execution of destructors
from GC inside a fiber are marked as `skip` for `TrueAsync`.

## Generators During Shutdown

In standard PHP, when a fiber is destroyed, the generator is marked with the
`ZEND_GENERATOR_FORCED_CLOSE` flag. This prevents `yield from` in finally blocks —
the generator is dying and should not create new dependencies.

In `TrueAsync`, the coroutine receives graceful cancellation rather than forced
closure. The generator is not marked as `FORCED_CLOSE`, and `yield from`
in finally blocks may execute. This is a known behavioral difference.

It is not yet clear whether this should be changed or not.
