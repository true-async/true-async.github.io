---
layout: tutorial
lang: en
path_key: "/tutors-laravel/04-unsafe-patterns.html"
nav_active: docs
permalink: /en/tutors-laravel/04-unsafe-patterns.html
page_title: "What You Can't Do Inside a Coroutine"
description: "Mutable static properties, once() on a singleton, and Number::useLocale(): the usual ways state leaks between requests, and how to catch them with static analysis."
---

# What You Can't Do Inside a Coroutine

The earlier chapters fixed specific state leaks: `auth`/`session`
through context, the transaction counter through a trait.
`laravel-spawn` closed those holes for you. But the framework is
large, third-party packages are even more numerous, and tomorrow
someone on your team will write their own service. What you need is a
rule you can apply on sight, to tell code that's safe for concurrent
coroutines apart from code that will one day hand one user someone
else's data.

## One Rule: Don't Write To static After Startup

Every example below is a special case of the same mistake: something
writes a value into memory shared by every coroutine in the process,
and that value belongs to one specific request.

**A mutable static property on a service.**

```php
// Dangerous
class PriceCalculator
{
    private static array $cache = [];

    public function forProduct(int $id): float
    {
        return self::$cache[$id] ??= $this->computeExpensive($id);
    }
}
```

It looks like a harmless memoization. In reality it's an array shared
across every coroutine. If `computeExpensive()` depends on anything
that changes between requests, a user's currency, a regional markup,
the first request decides the cache's fate for every request that
follows. The fix is simple: an instance property instead of `static`,
with the service resolved per request (the "approach one" from the
first chapter).

**What if the service is your own, and you deliberately need
per-request state?** You don't need to wait for `laravel-spawn` to
provide a `ScopedService` and a proxy for it, it's the same trick that
solved the transaction counter problem in the second chapter, just one
level up: not `coroutine_context()` for a single coroutine, but
`request_context()`, shared across a request's whole coroutine tree.

```php
class PriceCalculator  // stays a singleton
{
    private const CTX_CACHE = 'price.cache';

    public function forProduct(int $id): float
    {
        $cache = request_context()->find(self::CTX_CACHE) ?? [];

        return $cache[$id] ??= $this->computeExpensive($id, $cache);
    }
}
```

The difference from the previous example looks small but is
fundamental: the array no longer lives on a class-wide `static`
property shared by the whole process, it lives in the scope context
of one specific request. Two concurrent requests call the very same
`PriceCalculator` instance, yet each gets its own `$cache`, because
`request_context()` resolves to a different scope for each of them. A
detailed look at `coroutine_context()` and `request_context()` is in
the [second chapter](/en/tutors-laravel/02-pool-transactions.html).

**`once()` on a singleton.**

```php
// Dangerous
class CurrentUserService  // registered as a singleton
{
    public function get()
    {
        return once(fn() => Auth::user());  // caches the FIRST user, forever
    }
}
```

`once()` caches the closure's result in a `WeakMap` keyed by the
object the call belongs to. For a singleton that object is one for the
whole process, so the cache is one too. The first request computes the
user, every following request gets the same one. On per-request
objects (controllers, `Eloquent` models) `once()` is perfectly safe,
because there the object itself is fresh on every request.

**A global mutation like `Number::useLocale()`.**

```php
// Dangerous
Number::useLocale('de');
$price = Number::format(1234.5);       // what if the coroutine sleeps before this line?

// Safe
$price = Number::format(1234.5, locale: 'de');
```

`useLocale()` changes a static variable on the `Number` class. Between
the call to `useLocale()` and `format()`, an `await`, a `delay()`, any
trip to the database can happen, in other words a point where the
scheduler hands control to another coroutine. If that coroutine also
calls `Number::format()` without an explicit locale, it gets whatever
locale someone else just set. The explicit `locale:` parameter removes
the possibility of a race entirely: there's nothing to protect,
because there's nothing to share.

**Superglobals.** `$_GET`, `$_POST`, `$_SERVER`, `$_SESSION` were safe
under PHP-FPM simply because they lived for one request. In a
coroutine worker they're variables shared by the whole process, and
the server updates them, not PHP on every new connection the way
you're used to. Use the `Request` object, which `laravel-spawn` already
isolates through `current_context()`, and leave the superglobals alone.

## When static Is Actually Safe

It's just as important not to swing to the other extreme and declare
every `static` a crime. These are safe:

- **`readonly static`**, if a value never changes after
  initialization, sharing it between coroutines is no more dangerous
  than sharing a constant.
- **Boot-time configuration**, a `static` set once when the worker
  starts and only read afterward (routes, compiled templates,
  registered macros).
- **Deterministic caches**, if the result depends only on the input
  arguments and not on the "current" request (say, the `Str::camel()`
  cache for a given string is always the same string), a race to fill
  it doesn't corrupt data, at worst something gets computed twice.
- **Monotonic counters without semantics**, an auto-increment alias
  like an internal counter for unique SQL aliases: even if two
  requests grab the same number, the collision doesn't produce wrong
  data, at most a less pretty alias.

The difference is always the same: is it *a computed result that
doesn't depend on the request* being shared, or *state that belongs to
one specific request*? The first is an optimization. The second is a
leak.

## Static Analysis Instead Of Careful Reading

Manually scrolling through every third-party package looking for
`private static` without `readonly` is exactly the kind of work you
gladly hand off to a linter. The package ships a `PHPStan` rule built
for this:

```php
final class MutableStaticPropertyRule implements Rule
{
    public function getNodeType(): string
    {
        return Property::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (! $node->isStatic() || $node->isReadonly()) {
            return [];
        }

        // ... message "potential state leak between coroutines"
    }
}
```

The rule is about as simple as it gets: it finds every `static`
property without the `readonly` modifier and flags it. There will be
plenty of false positives, exactly the "safe" cases listed above, but
that's a deliberate trade-off: missing a real leak is more expensive
than manually sorting through a list of candidates once.

```bash
phpstan analyse app/ --configuration=phpstan.neon
phpstan analyse vendor/some/package/src --configuration=phpstan.neon
```

Running the rule against the Laravel framework itself turns up more
than three hundred findings. The overwhelming majority are exactly the
safe `static` from the previous section: compiled `BladeCompiler`
caches, configuration flags set once at `boot()`, resolvers that
internally reach into an already-isolated `$app['request']`. Sorting
through three hundred lines once is a quarter hour of work. Missing
even one and hitting a leak in production is hours of debugging
someone else's bug report saying "I'm seeing another user's profile."

## The Bottom Line

Before leaving a `static` (or a singleton with a mutable property) in
code that runs inside a request handler, ask one question: will this
value survive the end of the current request and still be correct for
the next one? If yes, it's safe. If it's supposed to expire together
with the request, but physically keeps living in shared process
memory, it's a candidate for `ScopedService`,
`request_context()`/`coroutine_context()` (see the
[second chapter](/en/tutors-laravel/02-pool-transactions.html)), or a
plain instance property recreated per request.

We've covered your own code and stock Laravel. But a real project
usually has `spatie/laravel-permission`, `Telescope`, `Inertia`, and
`Debugbar` living right alongside it, each with its own history of
mutable state. Which of them is already adapted, and which is worth
disabling in async mode, is the topic of the next chapter.
