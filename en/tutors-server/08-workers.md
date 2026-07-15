---
layout: tutorial
lang: en
path_key: "/tutors-server/08-workers.html"
nav_active: docs
permalink: /en/tutors-server/08-workers.html
page_title: "Workers and HTTP/3"
description: "setWorkers(): the first series' threads under the server's hood, the bootloader, and HTTP/3 on the same port."
---

# Workers and HTTP/3

Open some htop on the server under load. Our process is toiling away,
thousands of requests in flight... and out of eight cores, one is busy.
Seven idle. Annoying? Annoying.

There's nothing new in this, we covered it in the chapter on threads:
while tasks wait on I/O, one core is enough for everyone. But under
real traffic the server doesn't only wait. HTTP parsing, TLS
handshakes, JSON serialization, those are computations, and they run up
against that one single core.

The recipe from that same chapter: give computation threads. The server
applies it in a single line:

```php
$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(Async\available_parallelism());
```

`setWorkers(N)` spins up N workers, and it's literally
`Async\ThreadPool` from chapter fourteen. Not a "similar mechanism,"
but the very same one. Which means you already know the rules too: each
worker is a separate operating system thread with its own PHP
environment, its own event loop, its own pools. The configuration and
handlers are copied into each worker by the usual rules for passing
between threads. `start()` in the parent waits for all of them.

One question remains: who hands incoming connections to the workers?
And here's the nicest part. Nobody. Each worker opens the same port
with the `SO_REUSEPORT` flag, and from there the Linux kernel itself
distributes connections among them. No dispatcher, no queue, no locks.
Eight independent servers hidden behind one port.

## Bootloader: Warming Up Each Worker

In the first series ThreadPool had a bootloader, and there it looked
like an optional convenience. Here it becomes the central figure.
Here's why: everything we did in the first chapter "once, before
`start()`" now has to happen in every worker. Each one has its own
memory, after all.

```php
$config
    ->setWorkers(8)
    ->setBootloader(function () {
        require __DIR__ . '/vendor/autoload.php';

        Database::initPool(min: 4, max: 16); // its own PDO Pool in each worker
        Router::compile();
    });
```

The closure runs once per worker, before the first request. An
exception inside it stops the whole pool. Harsh? Correct: a server with
one under-warmed worker out of eight is a machine that fires errors at
every eighth client. Better it not start at all.

## The Chat Meets Workers

And now the promised explosion. In the previous chapter we built a chat
on the formula "shared state in the process's memory." Reread the
formula slowly. In the memory. Of the process.

Which one of the eight?

The kernel scatters connections however it pleases. Alice landed in
worker 3, Bob in worker 5. Each worker has its own memory, and thus its
own `$room`. Two rooms with the same name that will never know about
each other. Alice writes into the void, Bob is silent in a different
void. No races, no errors, the chat just quietly stopped being a chat.

The classic fix is to move the shared state outside the process, into
Redis pub/sub, and let the workers talk through it. It works, but now a
chat needs a second service running next to it just to pass messages
between threads of the same server.

So the server carries its own answer: **topics**. A connection
subscribes to a name, a message is published to that name, and the
server delivers it to every subscriber — on every worker. No array of
connections, no Redis.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = $req->getQueryParam('room', 'lobby');
    $name = $req->getQueryParam('name', 'guest');

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", "$name: {$msg->data}");
    }
});
```

Compare it with the previous chapter's room. The `SplObjectStorage` is
gone, and with it the manual broadcast loop and the `finally` that swept
up the ghosts. `subscribe()` puts this connection into the room;
`publish()` sends a line to everyone in it. A closing connection leaves
its rooms by itself. And where the old room lived in one worker's
memory, a topic spans all of them: Alice in worker 3 and Bob in worker 5
are in the same `chat/general` again.

`publish()` never blocks — a peer whose buffer is full drops the line
instead of stalling the room, the same trade-off `trySend()` made. It
returns the number of local subscribers it reached; delivery to the
other workers happens behind the scenes. The name is not just a string,
it's an [MQTT filter](/en/docs/server/websocket.html#topics-publishsubscribe-across-every-worker):
subscribe to `chat/+/typing` and you get the typing signal from every
room at once.

`setWorkers(1)` is still a fair answer for a small system — one worker
holds thousands of mostly-waiting WebSocket connections without trouble.
But you no longer have to choose it just to keep a chat working. A rule
to remember: request state lives in the request scope, process state in
the worker, and shared state either in a topic or in external storage.

## HTTP/3: The Same Handlers, a Different Transport

Since we're already scaling, let's bring the stack up to modern. About
HTTP/3 it's enough to know three things. It works not over TCP but over
QUIC on UDP. It establishes a connection faster and doesn't let one
lost packet stall all the streams at once. And it's mandatory to learn,
because browsers already prefer it.

Sounds like a big construction project? Look:

```php
$config = (new HttpServerConfig())
    ->setWorkers(Async\available_parallelism())
    ->setCertificate('/etc/tls/profile.crt')
    ->setPrivateKey('/etc/tls/profile.key')
    ->addListener('0.0.0.0', 443, tls: true)  // TCP: HTTP/1.1 and HTTP/2
    ->addHttp3Listener('0.0.0.0', 443);       // UDP: HTTP/3
```

One line, `addHttp3Listener`. The same port, and there's no conflict:
443/TCP listens for HTTP/1.1 and HTTP/2, while 443/UDP goes to QUIC. It
has no separate TLS flag, because per the spec QUIC doesn't exist
without TLS; the certificates are taken from the server.

How do clients learn about the UDP entrance? On their own. To every
response over TCP the server adds an `Alt-Svc: h3=":443"` header. The
browser sees it and sends the next requests over HTTP/3. First visit
over HTTP/2, then QUIC, and nobody configured anything.

```bash
$ curl --http3 -I https://profile.example.com/
HTTP/3 200
alt-svc: h3=":443"; ma=86400
```

Know what I like most about this chapter? What isn't in it. We turned
on eight threads and the third version of HTTP, and not a single line
changed in the handlers. The routing from chapter two, the SSE from
chapter six, the chat from chapter seven, none of them is aware that
the world around them became multithreaded and started speaking QUIC.
Scaling moved off into the config, where it belongs.

The server got fast. The next step is to make it unsinkable: what to do
about overload, about slow clients, about deploying in the thick of
traffic. One chapter about bad days.
