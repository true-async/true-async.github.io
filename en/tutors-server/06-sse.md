---
layout: tutorial
lang: en
path_key: "/tutors-server/06-sse.html"
nav_active: docs
permalink: /en/tutors-server/06-sse.html
page_title: "Server-Sent Events"
description: "SSE: an event stream to the browser, import progress, and heartbeat via sseComment()."
---

# Server-Sent Events

So the address import now starts with a button on the page. The user
clicked, the file went off, processing began. It runs for about ten
minutes. What does the user see all that time?

Right, a spinning spinner. For ten minutes. Without a single sign of
life. Around the third minute they'll decide it's all frozen, refresh
the page, and start the import a second time. We need a progress bar.

The classic solution is polling: the browser hits `/import/progress`
once a second, the server answers with a number. Does it work? It
works. But do the math: six hundred requests in ten minutes, with
headers, with a full processing cycle, and in each one the payload is a
single number. What we'd rather have is the opposite: the browser
connects once, and from then on the server itself sends the number
whenever it changes.

That's exactly what `SSE`, `Server-Sent Events`, does. No new protocol.
An ordinary `HTTP` response that the server doesn't close but keeps
appending events to. On the browser side they're received by the
built-in `EventSource`, without a single library.

## Progress to the Browser

```php
use function Async\delay;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    if ($req->getPath() !== '/import/progress') { /* ... routing ... */ }

    $import = currentImport(); // that same ImportService from the first series

    $res->sseStart();
    $res->sseRetry(3000); // if the stream breaks, the browser reconnects in 3 seconds

    while (!$import->isFinished()) {
        $res->sseEvent(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!$res->sendable()) {
            break; // the tab was closed, nobody to draw for
        }

        delay(1000);
    }

    $res->sseEvent(event: 'finished', data: 'ok');
    $res->end();
});
```

And in the browser:

```js
const es = new EventSource('/import/progress');
es.addEventListener('progress', e => {
    const {done, total} = JSON.parse(e.data);
    bar.style.width = (100 * done / total) + '%';
});
es.addEventListener('finished', () => es.close());
```

Look closely at the handler's structure. A loop. Taking a reading.
`delay(1000)`. Ring a bell? It's the progress coroutine from the very
first chapter, letter for letter. Only the last line changed: instead
of `echo` to the terminal, `sseEvent()` into an open response. Fifteen
chapters later the progress bar reached the browser, and the code
barely changed. And, as back then, progress knows nothing about the
import, and the import knows nothing about progress.

There's no magic under the hood either: the SSE methods are thin
formatting over `send()` from chapter four. From that, two free gifts.
Backpressure: a slow tab won't eat the server's memory. And protocol
independence: the same handler works over `HTTP/1.1`, `HTTP/2`, and
`HTTP/3`, and the browser chooses.

## Long Silence and the Heartbeat

An `SSE` connection lives for minutes and hours. Long life, as usual,
has its own ailments. There are two here.

The first: the write timeout. By default the server limits how long a
response may take to send, and that's correct. But an SSE response is
"being sent" forever, that's its nature. For a service with streams
you turn the limit off:

```php
$config->setWriteTimeout(0);
```

The second ailment is subtler. Suppose the import stalls for a long
time: it's computing something heavy, no events are going out. For us
it's a pause, but for some proxy between the server and the browser
it's a dead connection that's due to be killed. And it will kill it,
nginx defaults to sixty seconds for this.

The cure is comical in its simplicity:

```php
$res->sseComment(); // on the wire: ":\n\n"
```

A comment. An event the browser silently ignores, but which travels
through the wire and convinces every intermediary that the connection
is alive. Send it on a timer during pauses, and the stream will survive
any silence.

## Breaks and Recovery

The mobile network blinked, the stream broke. What to do? Nothing.
Seriously: `EventSource` restores the connection itself, after waiting
the interval from `sseRetry()`.

The one thing worth helping it with is not starting from a blank slate.
Give events numbers:

```php
$res->sseEvent(data: $update, id: (string) $sequence);
```

On reconnect the browser sends a `Last-Event-ID` header with the last
number it received, and the handler continues from exactly that point:

```php
$since = (int) ($req->getHeader('last-event-id') ?? 0);
foreach (updatesSince($since) as $sequence => $update) {
    $res->sseEvent(data: $update, id: (string) $sequence);
}
```

Delivery, reconnection, catching up on what was missed. An honest
notification channel, and all of it over the most ordinary HTTP.

With one caveat: the channel is one-way. The server speaks, the browser
listens. For a progress bar that's ideal. But for a support chat, where
both sides write? For a chat you'll need something more serious.
