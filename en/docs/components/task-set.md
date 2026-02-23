---
layout: docs
lang: en
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /en/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — a dynamic task set with automatic result cleanup after delivery."
---

# The Async\TaskSet Class

(PHP 8.6+, True Async 1.0)

## Introduction

`TaskGroup` is perfect for scenarios where the goal is the results, not the tasks themselves.
However, there are many situations where you need to control the number of tasks
while results are consumed as a stream.

Typical examples:

- **Supervisor**: code that monitors tasks and reacts to their completion.
- **Coroutine pool**: a fixed number of coroutines processing data.

**TaskSet** is designed to solve these problems. It automatically removes completed tasks
at the moment of result delivery via `joinNext()`, `joinAll()`, `joinAny()`, or `foreach`.

## Differences from TaskGroup

| Property                  | TaskGroup                          | TaskSet                                    |
|---------------------------|------------------------------------|--------------------------------------------|
| Result storage            | All results until explicit request | Removed after delivery                     |
| Repeated method calls     | Idempotent — same result           | Each call — next element                   |
| `count()`                 | Total number of tasks              | Number of undelivered tasks                |
| Waiting methods           | `all()`, `race()`, `any()`         | `joinAll()`, `joinNext()`, `joinAny()`     |
| Iteration                 | Entries remain                     | Entries removed after `foreach`            |
| Use case                  | Fixed set of tasks                 | Dynamic task stream                        |

## Idempotency vs Consumption

**The key conceptual difference** between `TaskSet` and `TaskGroup`.

**TaskGroup is idempotent.** Calls to `race()`, `any()`, `all()` always return
the same result. Iteration via `foreach` always traverses all tasks.
Results are stored in the group and available for repeated access:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() always returns the same first completed task
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — same result!

// all() always returns the full array
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — same array!

// foreach always traverses all elements
foreach ($group as $key => [$result, $error]) { /* 3 iterations */ }
foreach ($group as $key => [$result, $error]) { /* again 3 iterations */ }

echo $group->count(); // 3 — always 3
```

**TaskSet is consuming.** Each call to `joinNext()` / `joinAny()` extracts
the next element and removes it from the set. A repeated `foreach` won't find
already delivered entries. This behavior is analogous to reading from a queue or channel:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() returns the NEXT result each time
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — different result!
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — set is empty

// joinAll() after full consumption — empty array
$set->seal();
$rest = $set->joinAll()->await(); // [] — nothing to return
```

The same logic applies to iteration:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// First foreach consumes all results
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// Second foreach — empty, nothing to iterate
foreach ($set as $key => [$result, $error]) {
    echo "this won't execute\n";
}
```

> **Rule:** if you need to access results repeatedly — use `TaskGroup`.
> If results are processed once and should free memory — use `TaskSet`.

## Join Method Semantics

Unlike `TaskGroup`, where `race()` / `any()` / `all()` leave entries in the group,
`TaskSet` uses methods with **join** semantics — result delivered, entry removed:

- **`joinNext()`** — analogous to `race()`: result of the first completed task (success or error),
  entry is removed from the set.
- **`joinAny()`** — analogous to `any()`: result of the first *successfully* completed task,
  entry is removed from the set. Errors are skipped.
- **`joinAll()`** — analogous to `all()`: array of all results,
  all entries are removed from the set.

## Automatic Cleanup

Auto-cleanup works at all result delivery points:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

When iterating via `foreach`, each processed entry is removed immediately:

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() decreases with each iteration
    process($result);
}
```

## Concurrency Limit

Like `TaskGroup`, `TaskSet` supports concurrency limiting:

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

Tasks exceeding the limit are queued and started when a slot becomes available.

## Class Synopsis

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* Methods */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Adding tasks */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Waiting for results (with auto-cleanup) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* Lifecycle */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* State */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Awaiting completion */
    public awaitCompletion(): void

    /* Iteration (with auto-cleanup) */
    public getIterator(): Iterator
}
```

## Examples

### joinAll() — parallel loading with auto-cleanup

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, all entries removed

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — processing tasks as they complete

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Got result, remaining: {$set->count()}\n";
}
```

### joinAny() — fault-tolerant search

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// First successful result, entry removed
$result = $set->joinAny()->await();
echo "Found, active tasks: {$set->count()}\n";
```

### foreach — streaming processing

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Error processing $key: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // Entry removed, memory freed
}
```

### Worker loop with dynamic task addition

```php
$set = new Async\TaskSet(concurrency: 10);

// One coroutine adds tasks
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// Another processes results
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Error: {$error->getMessage()}");
        }
    }
});
```

## Equivalents in Other Languages

| Feature              | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|----------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| Dynamic set          | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| Auto-cleanup         | Automatic                         | Manual management             | Manual management         | Manual management      |
| Concurrency limit    | `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | Buffered channel       |
| Streaming iteration  | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## Contents

- [TaskSet::__construct](/en/docs/reference/task-set/construct.html) — Create a task set
- [TaskSet::spawn](/en/docs/reference/task-set/spawn.html) — Add a task with an auto-increment key
- [TaskSet::spawnWithKey](/en/docs/reference/task-set/spawn-with-key.html) — Add a task with an explicit key
- [TaskSet::joinNext](/en/docs/reference/task-set/join-next.html) — Get the result of the first completed task
- [TaskSet::joinAny](/en/docs/reference/task-set/join-any.html) — Get the result of the first successful task
- [TaskSet::joinAll](/en/docs/reference/task-set/join-all.html) — Wait for all tasks and get results
- [TaskSet::seal](/en/docs/reference/task-set/seal.html) — Seal the set for new tasks
- [TaskSet::cancel](/en/docs/reference/task-set/cancel.html) — Cancel all tasks
- [TaskSet::dispose](/en/docs/reference/task-set/dispose.html) — Destroy the set's scope
- [TaskSet::finally](/en/docs/reference/task-set/finally.html) — Register a completion handler
- [TaskSet::isFinished](/en/docs/reference/task-set/is-finished.html) — Check if all tasks are finished
- [TaskSet::isSealed](/en/docs/reference/task-set/is-sealed.html) — Check if the set is sealed
- [TaskSet::count](/en/docs/reference/task-set/count.html) — Get the number of undelivered tasks
- [TaskSet::awaitCompletion](/en/docs/reference/task-set/await-completion.html) — Wait for all tasks to complete
- [TaskSet::getIterator](/en/docs/reference/task-set/get-iterator.html) — Iterate over results with auto-cleanup
