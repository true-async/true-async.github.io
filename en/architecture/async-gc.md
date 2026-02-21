---
layout: architecture
lang: en
path_key: "/architecture/async-gc.html"
nav_active: architecture
permalink: /en/architecture/async-gc.html
page_title: "Garbage Collection in Asynchronous Context"
description: "How PHP GC works with coroutines, scope, and contexts -- get_gc handlers, zombie coroutines, circular references."
---

# Garbage Collection in Asynchronous Context

In `PHP`, the garbage collector normally works synchronously. When the possible roots buffer is full,
`gc_collect_cycles()` is called in the current context. The `GC` computes circular references
and calls object destructors in a loop for objects marked for deletion.

In a concurrent environment, this model breaks down. An object's destructor may call `await` --
for example, to properly close a database connection. If `GC` is running inside a coroutine,
`await` will suspend that coroutine, leaving the `GC` in an incomplete state.
Other coroutines will see partially collected objects.

For this reason, `TrueAsync` had to modify the garbage collection logic.

## GC Coroutine

When the `gc_possible_root` buffer fills up and the threshold is triggered, `zend_gc_collect_cycles()`
launches itself in a separate coroutine.

```c
ZEND_API int zend_gc_collect_cycles(void)
{
    if (UNEXPECTED(ZEND_ASYNC_IS_ACTIVE
        && ZEND_ASYNC_CURRENT_COROUTINE != GC_G(gc_coroutine))) {

        if (GC_G(gc_coroutine)) {
            return 0;  // GC is already running in another coroutine
        }

        start_gc_in_coroutine();
        return 0;
    }

    // ... actual garbage collection
}
```

The coroutine that triggered `GC` is not blocked and continues its work,
while garbage collection happens on the next `Scheduler` tick.

The `GC` coroutine gets its own top-level `Scope` (`parent = NULL`).
This isolates garbage collection from user code: canceling a user `Scope`
will not affect the `GC`.

## Destructors in Coroutines

The main problem arises specifically when calling destructors, because destructors can unexpectedly
suspend a coroutine. Therefore, the `GC` uses a concurrent iterator algorithm based on microtasks.
To launch the iteration, `GC` creates yet another iterator coroutine.
This is done to create the illusion of sequential execution, which simplifies the `GC` considerably.

```c
static bool gc_call_destructors_in_coroutine(void)
{
    GC_G(dtor_idx) = GC_FIRST_ROOT;
    GC_G(dtor_end) = GC_G(first_unused);

    // Create child coroutine for destructors
    zend_coroutine_t *coroutine = gc_spawn_destructors_coroutine();

    // GC coroutine suspends on dtor_scope
    zend_async_resume_when(GC_G(gc_coroutine), &scope->event, ...);
    ZEND_ASYNC_SUSPEND();   // GC sleeps while destructors run

    return true;
}
```

The destructor uses the Scope mechanism not only to control the lifetime of coroutines, but also to
await their completion. For this purpose, another child `Scope` is created
to encapsulate all destructor coroutines:

```
gc_scope                          <- top-level `GC`
  \-- GC coroutine                <- marking + coordination
       \-- dtor_scope             <- child scope
            \-- dtor-coroutine[0] <- calling destructors (HI_PRIORITY)
```


The `GC` coroutine subscribes to the completion event of `dtor_scope`. It will wake up only when
**all** destructors in `dtor_scope` have completed.


![Garbage Collection in a Separate Coroutine](/diagrams/en/architecture-async-gc/gc-coroutine.svg)

## What If a Destructor Calls await?

Here the classic concurrent iterator algorithm based on microtasks is used:
* A microtask is registered that will execute if a context switch occurs
* If a switch happens, the microtask creates yet another coroutine for iteration

The iterator checks whether it is still in the same coroutine:

```c
static zend_result gc_call_destructors(uint32_t idx, uint32_t end, ...)
{
    zend_coroutine_t *coroutine = ZEND_ASYNC_CURRENT_COROUTINE;

    while (idx != end) {
        obj->handlers->dtor_obj(obj);   // call destructor

        // If the coroutine changed -- the destructor called await
        if (coroutine != NULL && coroutine != *current_coroutine_ptr) {
            return FAILURE;   // abort traversal
        }
        idx++;
    }
    return SUCCESS;
}
```

If `ZEND_ASYNC_CURRENT_COROUTINE` has changed, it means the destructor called `await`
and the current coroutine went to sleep. In this case, the iterator simply exits, and the next iteration step
will be launched in a new coroutine.
