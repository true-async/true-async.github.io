---
layout: tutorial
lang: en
path_key: "/tutors-laravel/05-third-party.html"
nav_active: docs
permalink: /en/tutors-laravel/05-third-party.html
page_title: "Third-Party Packages"
description: "Debugbar, Telescope, Inertia, spatie/permission, Socialite: what's already adapted for coroutines and what's worth disabling."
---

# Third-Party Packages

We've covered Laravel's core and your own code. But a real project's
dependency list doesn't stop there: `Debugbar` in development,
`Telescope` for logs, `Inertia` for the frontend,
`spatie/laravel-permission` for roles. Every one of them was written
long before anyone pictured hundreds of concurrent requests inside a
single process, and every one of them has its own singleton carrying
state. The good news: for the most common packages this work is
already done. The bad news: not for all of them, and it matters to be
able to tell one from the other.

## Already Adapted

**`spatie/laravel-permission`.** `PermissionRegistrar` keeps the
current `team ID` and a wildcard-permission index in its own
properties, exactly the pattern covered in the chapter on unsafe
patterns. `AsyncPermissionRegistrar` moves both into
`current_context()`:

```php
class AsyncPermissionRegistrar extends PermissionRegistrar
{
    public function setPermissionsTeamId(int|string|Model|null $id): void
    {
        current_context()->set(self::CTX_TEAM_ID, $id, replace: true);
    }

    public function getPermissionsTeamId(): int|string|null
    {
        return current_context()->find(self::CTX_TEAM_ID);
    }

    // clearPermissionsCollection() becomes a no-op: the permission list
    // itself is read-only after loading and safely shared across requests.
}
```

Nothing changes in your own code: `Auth::user()->can(...)`,
`setPermissionsTeamId()` in middleware, all work exactly as the
package's docs describe.

**`inertiajs/inertia-laravel`.** `AsyncResponseFactory` moves
`sharedProps`, `rootView`, `version`, and `encryptHistory`, everything
that used to accumulate on the `ResponseFactory` singleton's
properties and would have survived past the end of a request into the
next one, into context.

**`barryvdh/laravel-debugbar`.** The solution here is a bit more
nuanced. `Debugbar` collects data over the whole request: SQL queries,
messages, timings, a classic accumulating collector that writes into
itself for the entire handling cycle, including pauses on `await`.
`AsyncDebugbar` doesn't resolve a new instance per request (that would
break one-time event subscriptions), it keeps one `Debugbar` per
worker, but makes the collectors themselves context-aware:

```php
class AsyncDebugbar extends LaravelDebugbar
{
    public function __construct(Application $app, Request $request)
    {
        parent::__construct($app, $request);

        // These accumulate data across every I/O pause in the request,
        // so storage needs to be per-coroutine, not per-instance.
        $this->messagesCollector   = new AsyncMessagesCollector();
        $this->timeCollector       = new AsyncTimeDataCollector(...);
        $this->exceptionsCollector = new AsyncExceptionsCollector();
    }
}
```

The difference from `ScopedServiceProxy` in the first chapter matters:
there, the whole service was resolved fresh per request; here, the
service stays a single instance (it's expensive to recreate: event
subscriptions, configuration), and only the specific accumulating
collectors inside it become context-aware. Same diagnosis as the
chapter on unsafe patterns ("don't write into state shared between
requests"), just a cure tailored to this package's particular anatomy.

**`laravel/telescope`.** Similarly: `entriesQueue`, `updatesQueue`,
and the `shouldRecord` flag move into context through a
`CoroutineSafeRecording` trait, and the decision whether to log a
given request is made per coroutine.

**`laravel/socialite`.** Simpler here: `SocialiteManager` caches
drivers together with the config of whichever request reached them
first. The fix isn't an adapter, it's a `scopedSingleton`, the same
"approach one" from the first chapter: a fresh manager per request, no
context needed at all.

## Safe Without Adaptation

`Cache`, `Queue`, `Mail`, `Log`, `Validation`, `Filesystem`, `HTTP
Client`, `Notifications`, `Encryption`, `Hashing`, `Pagination`,
`Sanctum`, `Passport`, `Scout`, `Cashier`, `Horizon`, these have
singletons too, but what they hold is configuration and clients, not
per-request data. `CacheManager` caches the `Redis` client object, not
the values you put into it; `MailManager` caches the configured
`Mailer`, not the emails. Same question from the chapter on unsafe
patterns: does the state survive the end of a request while staying
correct? Here the answer is yes, because the state is connection
configuration, not one user's data.

## Incompatible: Turn Them Off

**`livewire/livewire`.** This is where it's worth pausing and not
carrying the previous optimism forward. `LivewireManager` accumulates
per-request state deep inside itself, and `wire:stream` is built on
assumptions about a buffered, one-shot response that the concurrent
coroutine model itself breaks. Adapting it piecemeal hasn't worked,
not for `laravel-spawn`, and not for `Laravel Octane` before it. The
only recommendation that actually holds up is not to enable
`Livewire` in async mode at all. For interactive interfaces on this
stack, use `Inertia`, it's already adapted and covered above.
`Filament`, built on top of `Livewire`, inherits the same limitation.

## Deciding On Your Own Package

If the package you need isn't on either list, the question is the
same one from the previous chapter, just aimed at someone else's code
this time: does the package's singleton hold mutable state that's only
supposed to be correct for one request? If so, there are three paths,
and they aren't equivalent.

The fastest is `scoped_services` in the config, "approach one": the
package gets resolved fresh on every request, and its own code stays
untouched.

```php
// config/async.php
'scoped_services' => [
    \SomePackage\Manager::class,
],
```

If recreating it is expensive (the package is costly to initialize, or
caches something useful across requests on its own), write a targeted
adapter following the pattern of `AsyncPermissionRegistrar` or
`AsyncDebugbar` from this chapter: subclass it, add a
`bootCompleted()`, move only what actually changes from request to
request into `current_context()`, leave the rest as is.

And if it's not a standalone service but a deeply ingrained pattern
like `Livewire`, don't spend a week adapting it only to discover
`wire:stream` broken for architectural reasons a week later. Run the
`MutableStaticPropertyRule` from the previous chapter against the
package's source: if the findings number in the dozens and they hit
the package's very core rather than safe boot-time caches, that's a
signal to exclude it from async mode, not to fix it.

We've covered your own code, Laravel's core, and its surrounding
ecosystem. What's left is to see the numbers: how much faster does an
application actually get once all of this is in place.
