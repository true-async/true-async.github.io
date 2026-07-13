---
layout: tutorial
lang: en
path_key: "/tutors/13-pool.html"
nav_active: docs
permalink: /en/tutors/13-pool.html
page_title: "Pool"
description: "Async\\Pool: a universal resource pool with health checks and a circuit breaker."
---

# Pool

In the PDO Pool chapter we sketched a channel-based pool in six lines and immediately admitted
it was naive for real life: you have to remember to return the resource no matter how things
turn out, recognize broken connections, and replace the dead ones. For PDO, the core did all of
that for us. But `checkAddress` talks to `GeoDirectory` over HTTP, and opening a fresh
connection to it on every request would be wasteful too. And tomorrow there will be Redis for
caching and SMTP for email.

Surely we're not going to hand-build a channel pool for every single resource. Right, there's a
ready-made primitive for this, the very one working under the hood of PDO Pool: `Async\Pool`.

## Factory and destructor

The pool doesn't know what kind of resource it's holding. You tell it two things: how to create
a resource and how to destroy one:

```php
use Async\Pool;

$geo = new Pool(
    factory:    fn() => new GeoConnection('geodirectory.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);
```

`min: 2` means two connections are opened up front, so the first coroutines don't have to wait
through a handshake. `max: 10` means the pool will never create more than ten connections, no
matter how many coroutines ask for one. It's the familiar concurrency limit, except now it's
tied to the resource itself rather than to a number of workers.

Next comes the cycle we've already built by hand with a channel:

```php
$conn = $geo->acquire();

try {
    $verdict = $conn->request("/check?address=$address");
} finally {
    $geo->release($conn);
}
```

`acquire` hands out a free resource. If none are free and the limit hasn't been reached, the
factory creates a new one. If the limit has been reached, the coroutine goes to sleep until
someone else calls `release`: the same mechanics as `recv` on an empty channel. Notice the
`finally`: the resource is returned no matter how things turn out, including an exception or a
cancellation. That's exactly the point where our hand-rolled pool used to stumble.

You can also wait with a limit, in the usual way:

```php
$conn = $geo->acquire(timeout: 3000); // TimeoutException if it doesn't arrive within 3 seconds
```

## Resources die

A connection that has been sitting in the pool for half an hour may have died quietly: the
server closed it after a timeout, the network blipped. We already saw in the PDO chapter what
that leads to: the next coroutine gets a mysterious error out of nowhere. The pool fights this
on three fronts:

```php
$geo = new Pool(
    factory:             fn() => new GeoConnection('geodirectory.example.com'),
    destructor:          fn($conn) => $conn->close(),
    healthcheck:         fn($conn) => $conn->ping(),
    beforeAcquire:       fn($conn) => $conn->isAlive(),
    beforeRelease:       fn($conn) => !$conn->isBroken(),
    min: 2,
    max: 10,
    healthcheckInterval: 30000,
);
```

- **`healthcheck`** — every thirty seconds the pool walks its free resources on its own and
  checks their pulse. Dead ones are destroyed and replaced with new ones.
- **`beforeAcquire`** — a final check before handing a resource out. If it fails, the resource
  is destroyed and the coroutine gets the next one.
- **`beforeRelease`** — a check on return. A coroutine may have broken the connection partway
  through a request; a resource like that doesn't go back into the pool.

Coroutines know nothing about this behind-the-scenes work: they ask for a resource and get a
working one. Health management is expressed declaratively, in the constructor, instead of
smeared across the code as a pile of `if`s.

## Circuit breaker

Now imagine `GeoDirectory` goes down entirely. All ten connections are dead, every coroutine
dutifully waits out a timeout, creates a new connection, waits again. The application spends all
its energy bombarding a service that's already down, and in doing so keeps it from getting back
up.

Electrical engineering invented a fix for exactly this: a circuit breaker that opens the circuit
until the fault is cleared. The pattern is named after it, circuit breaker, and it's built into
the pool. The pool has three states: `ACTIVE`, everything works; `INACTIVE`, the service has
been declared unavailable and `acquire` fails immediately, without any timeouts; `RECOVERING`, a
cautious check on whether the service has come back to life.

You can switch states by hand, or hand the decision off to a strategy:

```php
use Async\CircuitBreakerStrategy;

final class FiveStrikes implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $pool): void
    {
        $this->failures = 0;
        $pool->activate();
    }

    public function reportFailure(mixed $pool, Throwable $error): void
    {
        if (++$this->failures >= 5) {
            $pool->deactivate();
        }
    }

    public function shouldRecover(): bool
    {
        return true; // attempt recovery at the first opportunity
    }
}

$geo->setCircuitBreakerStrategy(new FiveStrikes());
```

The pool itself reports every success and every failure of a resource to the strategy, and asks
through `shouldRecover` whether it's time to cautiously check if the service is back. Five
failures in a row, and the circuit opens: coroutines get a fast failure instead of a slow torture
of timeouts, and `GeoDirectory` stops taking pointless hits and gets to recover in peace.

Looking back, `Pool` does exactly what we hand-built out of a channel in chapter nine, plus
everything you really don't want to hand-build: guaranteed return, health checks, a circuit
breaker. `PDO Pool` is the same primitive, just tucked behind the `PDO` facade. And for
everything else, HTTP clients, Redis, sockets, and heavy objects in general, there's
`Async\Pool`.

By this point our arsenal looks impressive: coroutines, channels, scopes, task groups, pools.
But all of it runs in a single operating system thread and shares a single CPU core. As long as
tasks are waiting on I/O, that's nobody's problem. But what if the work isn't bound by waiting
but by computation? There the whole picture changes, and that's what the next chapter is about.
