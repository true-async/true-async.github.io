---
layout: tutorial
lang: en
path_key: "/tutors-server/09-production.html"
nav_active: docs
permalink: /en/tutors-server/09-production.html
page_title: "Production"
description: "Timeouts, limits, backpressure on accept, compression, logs, and graceful shutdown."
---

# Production

A good server differs from a demo not in how it works. In how it fails.
Everyone works when the mood is right; production begins where the bad
day arrives: a traffic spike, slow clients, a deploy at the most
inopportune moment. This chapter is entirely about bad days.

## Timeouts: Nobody Waits Forever

From the first series we took an iron rule: any wait must have a limit.
Let's see where a connection even has waits. The client sends a
request, that's one. Takes the response, that's two. Hangs between
requests on keep-alive, that's three. Each stage gets its own limit:

```php
$config
    ->setReadTimeout(30)       // request takes longer than 30 seconds to send? goodbye
    ->setWriteTimeout(60)      // and the response takes longer than a minute to fetch? that too
    ->setKeepAliveTimeout(15); // an idle connection lives at most 15 seconds
```

The read timeout isn't only about slow internet. There's an attack with
a wonderful name, slowloris: the client sends a request one byte a
minute and occupies the connection forever. A hundred such clients and
a server without timeouts is done. With a timeout it's just a hundred
dropped connections.

The one legitimate exception you already know from the SSE chapter: for
streams the write timeout is turned off, `setWriteTimeout(0)`.

## Limits: Refuse Cheaply

Now about overload. The question isn't "if," the question is "when."
And at that moment the server has exactly two paths. Path one: accept
everyone, pile up a queue, slow down, and in the end everyone gets
timeouts, including those who could have been served. Path two: tell
the extras "busy" right away, and serve the rest as if nothing
happened.

The second path is configured like this:

```php
$config
    ->setMaxConnections(10_000)          // hard connection limit
    ->setMaxInflightRequests(1_000)      // requests processed concurrently
    ->setMaxBodySize(10 * 1024 * 1024);  // body larger than 10 MiB? 413
```

Look closely at `setMaxInflightRequests`. Recognize it? It's our old
friend, the concurrency limit: `POOL_MAX`, `concurrency` on groups, now
at the level of a whole server. An excess request gets an instant
`503 Retry-After: 1`. Instant is the key word: the client learns the
truth in a millisecond and will retry later, instead of hanging in a
queue for a minute waiting for a timeout.

There's a third line of defense too, the most elegant. The server
itself measures how long requests wait in the queue. Is the wait
systematically growing? Then we're not keeping up, and the server
temporarily stops accepting new connections until it catches up. The
algorithm is called CoDel, but you know it under a different name: it's
the backpressure from the channels chapter, applied to `accept()`. The
internet is the producer, the handlers are the consumer, and the
producer is slowed down. There's one setting:

```php
$config->setBackpressureTargetMs(20); // what wait time in the queue to consider normal
```

## Compression

Good news: response compression already works. The server negotiates
with the client via `Accept-Encoding` and picks the best of the
available codecs: zstd, brotli, gzip. Usually there's nothing to do
here, but three levers are worth knowing:

```php
$config
    ->setCompressionMinSize(1024)   // don't compress small stuff: the overhead costs more
    ->setZstdLevel(3)               // speed/ratio balance per codec
    ->setCompressionMimeTypes([...]); // whitelist: text is compressed, jpeg already isn't
```

Plus one lever on the response side: `$res->setNoCompression()` for
endpoints where compression is harmful. The SSE helpers, by the way,
call it themselves; a buffering gzip would kill all the instantaneity
of delivery.

## Logs

While all is well, the server is silent. Agreed, we'd rather hear about
trouble not from the users:

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::WARN)
    ->setLogStream(STDERR);
```

`WARN` covers failed TLS handshakes, dropped clients, swallowed
exceptions. `INFO` adds the lifecycle: start, ports, workers. The sink
is an ordinary PHP stream: stderr for systemd and Docker, a file,
whatever.

## A Graceful Stop

And the last bad day, which is actually a good one: the deploy. A
picture worthy of oils: the server has a thousand live connections, a
hundred of them mid-write to the database, and here comes the new
version. `kill -9`? Enjoy a hundred aborted transactions and a crowd of
users with broken uploads.

The graceful version looks like this:

```php
$config->setShutdownTimeout(30);
```

On receiving `stop()` or SIGTERM, the server first stops accepting new
ones, and lets the current ones live out their lives, up to thirty
seconds. Whoever didn't make it will be cancelled. And here, for the
last time in this series, scope discipline pays off: cancellation
cooperatively passes through the tree of each request, the `finally`
blocks release resources, the pool rolls back unclosed transactions.
Graceful shutdown wasn't written as a feature. It fell out of the
architecture.

For long-lived connections behind a load balancer there's one more
touch, `setMaxConnectionAgeMs()`: a connection older than the given age
is gracefully closed (`Connection: close`, GOAWAY), so that clients
redistribute across machines instead of hanging on one for years.

Now this is production. Overload meets a fast refusal, slow clients run
into timeouts, a deploy doesn't tear transactions apart, and the server
reports its problems itself. One last frontier remains for the whole
series: so far only browsers and curl have talked to our server. It's
time to let in other interlocutors, the neighboring services, in their
native tongue.
