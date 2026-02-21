---
layout: docs
lang: en
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /en/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- a high-level structured concurrency pattern for managing groups of tasks."
---

# The Async\TaskGroup Class

(PHP 8.6+, True Async 1.0)

## Introduction

When working with coroutines, you often need to launch several tasks and wait for their results.
Using `spawn()` and `await()` directly, the developer takes responsibility for ensuring
that every coroutine is either awaited or cancelled. A forgotten coroutine keeps running,
an unhandled error is lost, and cancelling a group of tasks requires manual code.

The `await_all()` and `await_any()` functions don't account for logical relationships between different tasks.
For example, when you need to make several requests, take the first result, and cancel the rest,
`await_any()` requires additional code from the programmer to cancel the remaining tasks.
Such code can be quite complex, so `await_all()` and `await_any()` should be considered
anti-patterns in this situation.

Using `Scope` for this purpose is not suitable, since task coroutines may create other child coroutines,
which requires the programmer to maintain a list of task coroutines and track them separately.

**TaskGroup** solves all these problems. It is a high-level structured concurrency pattern
that guarantees: all tasks will be properly awaited or cancelled. It logically groups tasks
and allows operating on them as a single unit.

## Waiting Strategies

`TaskGroup` provides several strategies for waiting on results.
Each returns a `Future`, which allows passing a timeout: `->await(Async\timeout(5.0))`.

- **`all()`** -- returns a `Future` that resolves with an array of all task results,
  or rejects with `CompositeException` if at least one task threw an exception.
  With the `ignoreErrors: true` parameter, returns only successful results.
- **`race()`** -- returns a `Future` that resolves with the result of the first completed task,
  regardless of whether it completed successfully or not. Other tasks continue running.
- **`any()`** -- returns a `Future` that resolves with the result of the first *successfully* completed task,
  ignoring errors. If all tasks failed -- rejects with `CompositeException`.
- **`awaitCompletion()`** -- waits for full completion of all tasks, as well as other coroutines in the `Scope`.

## Concurrency Limit

When the `concurrency` parameter is specified, `TaskGroup` works as a coroutine pool:
tasks exceeding the limit wait in a queue and don't create a coroutine until a free slot appears.
This saves memory and controls load when processing a large number of tasks.

## TaskGroup and Scope

`TaskGroup` uses `Scope` for managing the lifecycle of task coroutines.
When creating a `TaskGroup`, you can pass an existing `Scope` or let `TaskGroup` create a child `Scope` from the current one.
All tasks added to `TaskGroup` execute inside this `Scope`.
This means that when `TaskGroup` is cancelled or destroyed,
all coroutines will be automatically cancelled, ensuring safe resource management and preventing leaks.

## Sealing and Iteration

`TaskGroup` allows adding tasks dynamically, until it is
sealed using the `seal()` method.

The `all()` method returns a `Future` that triggers when all existing tasks
in the queue are completed. This allows using `TaskGroup` in a loop, where tasks are added dynamically,
and `all()` is called to get results of the current set of tasks.

`TaskGroup` also supports `foreach` for iterating over results as they become ready.
In this case, `seal()` must be called after adding all tasks to signal that
there will be no new tasks, and `foreach` can finish after processing all results.

## Class Overview

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Methods */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Adding tasks */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Waiting for results */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* Lifecycle */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* State */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Results and errors */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* Iteration */
    public getIterator(): Iterator
}
```

## Examples

### all() -- Parallel Data Loading

The most common scenario -- loading data from multiple sources simultaneously:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

All three requests execute in parallel. If any of them throws an exception,
`all()` returns a `Future` that rejects with `CompositeException`.

### race() -- Hedged Requests

The "hedged request" pattern -- send the same request to multiple replicas
and take the first response. This reduces latency with slow or overloaded servers:

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// First response is the result, other tasks continue running
$product = $group->race()->await();
```

### any() -- Error-Tolerant Search

Query multiple providers, take the first successful response, ignoring errors:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() ignores providers that failed and returns the first successful result
$results = $group->any()->await();

// Errors from failed providers must be explicitly handled, otherwise the destructor will throw an exception
$group->suppressErrors();
```

If all providers failed, `any()` will throw `CompositeException` with all errors.

### Concurrency Limit -- Processing a Queue

Process 10,000 tasks, but no more than 50 simultaneously:

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` automatically queues tasks. A coroutine is created only when
a free slot appears, saving memory with large volumes of tasks.

### Iterating Over Results as They Complete

Process results without waiting for all tasks to finish:

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // Results arrive as they become ready, not in the order they were added
    saveToStorage($result);
}
```

### Timeout for a Task Group

Limit the waiting time for results:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "Failed to get data within 5 seconds";
}
```

## Analogues in Other Languages

| Capability              | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| Structured concurrency  | `seal()` + `all()->await()`         | `async with` block              | `try-with-resources` + `join()`          | Automatically via scope   |
| Waiting strategies      | `all()`, `race()`, `any()` -> Future | Only all (via `async with`)     | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| Concurrency limit       | `concurrency: N`                    | No (need `Semaphore`)           | No                                       | No (need `Semaphore`)     |
| Result iteration        | `foreach` as they complete          | No                              | No                                       | `Channel`                 |
| Error handling          | `CompositeException`, `getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | Exception cancels scope   |

PHP `TaskGroup` combines capabilities that in other languages are spread across multiple primitives:
concurrency limiting without a semaphore, multiple waiting strategies in a single object, and result iteration as they complete.

## Contents

- [TaskGroup::__construct](/en/docs/reference/task-group/construct.html) -- Create a task group
- [TaskGroup::spawn](/en/docs/reference/task-group/spawn.html) -- Add a task with an auto-increment key
- [TaskGroup::spawnWithKey](/en/docs/reference/task-group/spawn-with-key.html) -- Add a task with an explicit key
- [TaskGroup::all](/en/docs/reference/task-group/all.html) -- Wait for all tasks and get results
- [TaskGroup::race](/en/docs/reference/task-group/race.html) -- Get the result of the first completed task
- [TaskGroup::any](/en/docs/reference/task-group/any.html) -- Get the result of the first successful task
- [TaskGroup::awaitCompletion](/en/docs/reference/task-group/await-completion.html) -- Wait for all tasks to complete
- [TaskGroup::seal](/en/docs/reference/task-group/seal.html) -- Seal the group for new tasks
- [TaskGroup::cancel](/en/docs/reference/task-group/cancel.html) -- Cancel all tasks
- [TaskGroup::dispose](/en/docs/reference/task-group/dispose.html) -- Destroy the group's scope
- [TaskGroup::finally](/en/docs/reference/task-group/finally.html) -- Register a completion handler
- [TaskGroup::isFinished](/en/docs/reference/task-group/is-finished.html) -- Check if all tasks are finished
- [TaskGroup::isSealed](/en/docs/reference/task-group/is-sealed.html) -- Check if the group is sealed
- [TaskGroup::count](/en/docs/reference/task-group/count.html) -- Get the number of tasks
- [TaskGroup::getResults](/en/docs/reference/task-group/get-results.html) -- Get an array of successful results
- [TaskGroup::getErrors](/en/docs/reference/task-group/get-errors.html) -- Get an array of errors
- [TaskGroup::suppressErrors](/en/docs/reference/task-group/suppress-errors.html) -- Mark errors as handled
- [TaskGroup::getIterator](/en/docs/reference/task-group/get-iterator.html) -- Iterate over results as they complete
