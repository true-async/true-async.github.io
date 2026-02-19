---
layout: page
lang: en
path_key: "/rfc.html"
nav_active: rfc
permalink: /en/rfc.html
page_title: "RFC"
description: "Official proposals for adding asynchronous capabilities to PHP core"
---

## PHP RFC: True Async

The TrueAsync project has been advancing through the official `RFC` process on wiki.php.net for about a year.
Two `RFCs` have been published describing the basic concurrency model
and structured concurrency.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Author: Edmond [HT]</span>
<span>Version: 1.7</span>
<span>Target version: PHP 8.6+</span>
<span class="rfc-badge discussion">Draft</span>
</div>

The main `RFC` defining the concurrency model for PHP.
Describes coroutines, functions `spawn()` / `await()` / `suspend()`,
the `Coroutine` object, `Awaitable` and `Completable` interfaces,
cooperative cancellation mechanism, `Fiber` integration,
error handling and graceful shutdown.

**Key principles:**

- Minimal changes to existing code to enable concurrency
- Coroutines maintain the illusion of sequential execution
- Automatic coroutine switching on I/O operations
- Cooperative cancellation — "cancellable by design"
- Standard C API for extensions

[Read RFC on wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope and Structured Concurrency

<div class="rfc-meta">
<span>Author: Edmond [HT]</span>
<span>Version: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

An extension of the base RFC. Introduces the `Scope` class, binding
coroutine lifetime to the lexical scope.
Describes scope hierarchy, error propagation,
"zombie" coroutine policy and critical sections via `protect()`.

**What it solves:**

- Preventing coroutine leaks beyond the scope
- Automatic resource cleanup on scope exit
- Hierarchical cancellation: cancelling the parent → cancels all children
- Protecting critical sections from cancellation
- Deadlock and self-await detection

[Read RFC on wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## How these RFCs relate

The first `RFC` defines **low-level primitives** — coroutines,
base functions and C API for extensions. The second RFC adds
**structured concurrency** — mechanisms for managing groups of coroutines
that make concurrent code safe and predictable.

Together they form a complete asynchronous programming model for PHP:

|              | RFC #1: True Async                | RFC #2: Scope                           |
|--------------|-----------------------------------|-----------------------------------------|
| **Level**    | Primitives                        | Management                              |
| **Provides** | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **Analogies**| Go goroutines, Kotlin coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **Goal**     | Running concurrent code           | Safe lifecycle management               |

## Current RFC Status

Currently the `TrueAsync` project has faced uncertainty in the `RFC` process.
Over the past few months, the discussion has practically stopped, and there is no clarity regarding its future.
It is quite obvious that the `RFC` will not be able to pass a vote, and there is no way to change this.

For these reasons, the `RFC` process is currently considered frozen,
and the project will continue to develop within the open community, without "official" status.

## Join the Discussion

RFCs are discussed on the [internals@lists.php.net](mailto:internals@lists.php.net) mailing list
and on [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"}.

Also join the conversation on [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}.
