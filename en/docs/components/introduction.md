---
layout: docs
lang: en
path_key: "/docs/components/introduction.html"
nav_active: docs
permalink: /en/docs/components/introduction.html
page_title: "Why Asynchrony?"
description: "What is asynchrony and why do you need it?"
---

## How Traditional PHP (FPM) Works

![FPM Model](../../../assets/docs/fpm_model.jpg)

If a PHP server application were a restaurant, it would probably be considered an elite establishment
where each table is served by a dedicated waiter.

Each new request to the server is handled by a separate PHP VM, process, or thread,
after which the state is destroyed.
This is equivalent to a waiter serving one table and then being fired or having their memory wiped.

This model has an advantage: if a PHP error occurs, a memory leak,
a forgotten database connection -- it doesn't affect other requests. Each request is isolated.
This means development is simpler, debugging is simpler, and there is high fault tolerance.

In recent years, the PHP community has been trying to introduce a stateful model,
where a single PHP VM can serve multiple requests, preserving state between them.
For example, the Laravel Octane project, which uses Swoole or RoadRunner, achieves better performance
by preserving state between requests.
But this is far from the limit of what's possible.

Firing a waiter after each order is too expensive.
Because dishes are prepared slowly in the kitchen, the waiter spends most of their time waiting.
The same thing happens with PHP-FPM: the PHP VM sits idle.
There are more context switches,
more overhead for creating and destroying processes or threads,
and more resource consumption.

```php
// Traditional PHP-FPM
$user = file_get_contents('https://api/user/123');     // standing and waiting 300ms
$orders = $db->query('SELECT * FROM orders');          // standing and waiting 150ms
$balance = file_get_contents('https://api/balance');   // standing and waiting 200ms

// Spent: 650ms of pure waiting
// CPU is idle. Memory is idle. Everything is waiting.
```

## Concurrency

![Concurrency Model](../../../assets/docs/concurrency_model.jpg)

Since the kitchen cannot prepare dishes instantly,
and the waiter has idle time between preparations,
there is an opportunity to handle orders from multiple customers.

This scheme can work quite flexibly:
Table 1 ordered three dishes.
Table 2 ordered two dishes.
The waiter brings the first dish to table 1, then the first dish to table 2.
Or maybe they managed to bring two dishes to the first table and one to the second. Or the other way around!

This is concurrency: sharing a single resource (`CPU`) between different logical execution threads,
which are called coroutines.

```php
use function Async\spawn;
use function Async\await;

// Launch all three requests "concurrently"
$userTask = spawn(file_get_contents(...), 'https://api/user/123');
$ordersTask = spawn($db->query(...), 'SELECT * FROM orders');
$balanceTask = spawn(file_get_contents(...), 'https://api/balance');

// While one request is waiting for a response, we do others!
$user = await($userTask);
$orders = await($ordersTask);
$balance = await($balanceTask);

// Spent: 300ms (the time of the slowest request)
```

## Concurrency is not Parallelism

It's important to understand the difference.

**Concurrency** -- as in `True Async`, `JavaScript`, `Python`:
- One waiter quickly switches between tables
- One PHP thread switches between tasks
- Tasks are **interleaved**, but do not execute simultaneously
- No race conditions -- only one coroutine runs at any given moment

**Parallelism** -- this is multithreading (`Go`):
- Multiple waiters work simultaneously
- Multiple threads execute on different CPU cores
- Tasks execute **truly simultaneously**
- Mutexes, locks, all that pain is required

## What's Next?

Now you understand the essence. You can dig deeper:

- [Efficiency](../evidence/concurrency-efficiency.md) -- how many coroutines are needed for maximum performance
- [Evidence Base](../evidence/coroutines-evidence.md) -- measurements, benchmarks and research confirming the effectiveness of coroutines
- [Swoole in Practice](../evidence/swoole-evidence.md) -- real measurements: Appwrite +91%, IdleMMO 35M req/day, benchmarks with DB
- [Python asyncio in Practice](../evidence/python-evidence.md) -- Duolingo +40%, Super.com -90% costs, Instagram, uvloop benchmarks
- [Coroutines](coroutines.md) -- how they work under the hood
- [Scope](scope.md) -- how to manage groups of coroutines
- [Scheduler](scheduler.md) -- who decides which coroutine to run
