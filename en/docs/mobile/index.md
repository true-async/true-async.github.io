---
layout: docs
lang: en
path_key: "/docs/mobile/index.html"
nav_active: docs
permalink: /en/docs/mobile/index.html
page_title: "TrueAsync Mobile"
description: "native-bridge: a persistent PHP runtime inside a native Android app over JNI. Architecture, event exchange, calling Kotlin from PHP, code generation."
---

# TrueAsync Mobile

(demo project, experimental, repository
[native-bridge](https://github.com/true-async/native-bridge), Android)

Asynchronous PHP is a great fit for UI applications: the interface shouldn't freeze while
something is talking to the network, reading from disk, or waiting for the next user action.
TrueAsync has a dedicated C API for this: the Trigger Event
(`ZEND_ASYNC_NEW_TRIGGER_EVENT()` in `zend_async_API.h`). It's an object with a single method,
`trigger()`, that any C or C++ code can call from another thread to thread-safely wake up the
PHP reactor and hand it control to process the event.

**native-bridge** implements exactly this kind of integration for Android: PHP embeds into the
app as a persistent process, starting once on a background thread, running an event loop (the
same TrueAsync reactor used across the rest of the ecosystem), and talking to Kotlin in both
directions.

## Why a persistent process instead of request/response

The usual PHP scenario is a web request: the process starts up, handles one request, and exits.
That doesn't fit a mobile app: PHP needs to stay alive for as long as the app is open, and
react to user events (taps, sensors, location) the same way a handler reacts to an HTTP
request. That's exactly what native-bridge gives you: PHP starts once when the app launches and
lives in its own thread until it's explicitly stopped, while TrueAsync coroutines inside that
thread handle events and background work concurrently.

## Bridge architecture

The bridge works in two directions:

1. **Android to PHP.** Kotlin pushes events (a tap, a sensor reading, location, an arbitrary
   custom event) into a queue, and PHP pulls them from its own loop.
2. **PHP to Kotlin.** PHP calls methods implemented on the Kotlin side (show a Toast, vibrate,
   copy text to the clipboard, and so on).

Both directions go through **JNI (Java Native Interface)**, the standard Android mechanism that
lets C code call Kotlin/Java code and vice versa. Neither direction passes data through JSON or
any other text format: values cross the boundary already typed, with no extra conversions.

PHP runs on its own OS thread and never blocks Android's UI thread. If PHP is waiting on data,
the UI thread keeps responding, and vice versa.

## Direction 1: events from Android to PHP

Kotlin sends events over JNI into a queue that PHP reads with `NativeBridge::poll()`. When the
queue is empty, `poll()` returns `null` right away, and the PHP application decides for itself
whether to wait for the next event or do something else in the meantime (in the demo app that's
a short `usleep()` pause, during which TrueAsync gets to run background coroutines and timers).

There are four event types: a screen touch, location data, sensor data (accelerometer and
similar), and an arbitrary event with a name and a text payload. That last kind is what the demo
app uses to mark button presses:

```php
use TrueAsync\NativeBridge;

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC) {
        match ($event['event_name']) {
            'count_a' => $counterA->toggle(),
            'fetch'   => spawn(fn() => fetchDemo()),
            default   => null,
        };
    }
}
```

The first three event types (touch, location, sensors) need no string allocation, so they stay
cheap even at a high call rate (for example, for a stream of accelerometer data).

## Direction 2: calls from PHP to Kotlin

When PHP calls a module method, for example `Toast::show('Hello', true)`, there are two ways
that call can reach Kotlin:

### The generic path

By default, PHP packs the arguments into a compact typed buffer (no string format like JSON, so
Kotlin reads it without parsing text and without extra allocations) and ships it through a
single call to `NativeBridge::invoke()`. Adding a new module or method on this path never
touches C: only Kotlin and the generated PHP wrapper change, so a Gradle rebuild of the Kotlin
side is enough, no need to rebuild the native library.

### The fast path: `#[FastPath]`

For "hot" methods called very often (for example, feeding sensor data on every frame), the PHP
spec marks the method with the `#[FastPath]` attribute. For such a method, the generator emits a
dedicated typed C function that calls Kotlin directly over JNI, with no intermediate buffer.
This kind of method requires rebuilding the native library (the `.so` file) on every change, but
runs faster and without extra allocations. The method's behavior doesn't change, only the way
the call crosses the PHP/Kotlin boundary.

## Describing a module: `#[BridgeModule]`

A module's contract is described on the PHP side as an interface with the `#[BridgeModule]`
attribute:

```php
namespace TrueAsync\Android\Spec;

#[BridgeModule]
interface ToastInterface
{
    #[Ui]
    public function show(string $text, bool $long): void;

    public function batteryLevel(): int;
}
```

- The module name is derived from the interface name (`ToastInterface` becomes module `Toast`),
  or set explicitly: `#[BridgeModule('Clipboard')]`.
- `#[Ui]` on a method means the Kotlin implementation must run on Android's UI thread (the
  generator adds the thread switch for you).
- `#[FastPath]` on a method enables the fast call path described above.

## What `tools/bridge/gen.php` generates

From a PHP spec (a `#[BridgeModule]` interface), the generator rebuilds on every run:

- a Kotlin class with abstract methods (`ToastSpec`);
- the call-routing code (Kotlin);
- a PHP wrapper (`Toast::show(...)`) that the rest of the PHP app code calls;
- for methods marked `#[FastPath]`, typed C code that calls Kotlin directly.

## PHP application lifecycle

1. Kotlin starts PHP on a background thread and passes it the path to the entry PHP script.
2. The PHP script calls `NativeBridge::init()`; from that point on the bridge is ready to accept
   events and calls.
3. From there the application runs in a loop: pull events through `poll()`, handle them, and
   spawn background TrueAsync coroutines when needed (for network requests, for example).
4. Shutdown is graceful: Kotlin calls `NativeBridge.stop()`, the PHP loop sees this through
   `NativeBridge::shouldStop()`, finishes up, and releases its resources cleanly.

## Example: a counter on a button

A simplified example based on the demo app: a button starts and stops an endless counter, and
its value updates directly in the UI. Starting and stopping are implemented with a plain
TrueAsync coroutine's `spawn()`/`cancel()`, without blocking the UI thread:

```php
use TrueAsync\NativeBridge;
use TrueAsync\Android\Ui;
use function Async\spawn;
use function Async\delay;

NativeBridge::init();

$root = Ui::newLinearLayout();

$button = Ui::newButton();
Ui::setText($button, '▶ start counter');
Ui::setOnClickListener($button, 'toggle');
Ui::addView($root, $button);

$label = Ui::newTextView();
Ui::setText($label, 'stopped');
Ui::addView($root, $label);

Ui::setContentView($root);

$counter = null;

function tick(int $label): void
{
    $n = 0;
    while (true) {
        Ui::setText($label, 'tick ' . ++$n);
        delay(400);
    }
}

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC && $event['event_name'] === 'toggle') {
        if ($counter === null) {
            $counter = spawn(fn() => tick($label));
            Ui::setText($button, '■ stop counter');
        } else {
            $counter->cancel();
            $counter = null;
            Ui::setText($button, '▶ start counter');
        }
    }
}
```

A second click cancels the `$counter` coroutine through `cancel()`, and the counter stops at
whatever value it reached. The full example, with several independent counters, is in the
repository's `android/app.php`.

## Status and limitations

- Only Android is supported; iOS support is planned but not yet implemented.
- The bridge currently carries simple types: strings, integers, floats, booleans. Passing
  compound objects (by field, still with no string format) is planned.
- The PHP-to-Kotlin direction is synchronous: a method returns its result immediately; deferred
  (asynchronous) results are not yet supported on this side.
- PHP's opcache is force-disabled on Android: the app sandbox doesn't let it use the lock file
  and executable memory it needs.
- A thread-safe (ZTS) PHP build is required, since PHP runs on its own OS thread rather than
  the app's main thread.

## See also

- [Roadmap: TrueAsync Mobile](/en/roadmap.html)
- [native-bridge repository on GitHub](https://github.com/true-async/native-bridge)
