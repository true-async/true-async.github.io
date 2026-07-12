---
layout: tutorial
lang: en
path_key: "/tutors-server/01-first-server.html"
nav_active: docs
permalink: /en/tutors-server/01-first-server.html
page_title: "Your First Server"
description: "An HTTP server inside PHP: HttpServer, HttpServerConfig, and your first handler."
---

# Your First Server

Let's recall how PHP usually serves a request. Nginx accepts the
connection and hands it to PHP-FPM. FPM grabs a free process. The
process wakes up, loads classes, opens a database connection,
assembles the response, sends it. And dies. Everything it managed to
build, every connection, every cache, all those beautifully warmed-up
pools from the first series, goes in the trash. A millisecond later
the next request arrives, and the whole story replays from scratch. A
hundred times a second. A thousand.

Meanwhile, in the first series we built a whole arsenal of things for
which such a life is contraindicated: a connection pool is good when
it lives a long time, and a memoized `Future` is meaningless if it
dies together with the process.

So the plan for this series is simple: remove the middlemen.
`TrueAsync Server` is an extension that runs an `HTTP` server right
inside the `PHP` process:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    new HttpServerConfig()->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

```bash
$ php server.php &
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
Content-Length: 13

Hello, World!
```

`addListener` opens a port, `addHttpHandler` registers a handler
function, and `start()` launches the event loop and never returns.
Every incoming request runs the handler.

## A Handler Is a Coroutine

Every handler invocation runs in its own coroutine (`spawn`). What
does that mean in practice? Let's run an experiment. We'll add a
deliberately slow route to the server:

```php
use function Async\delay;

$server->addHttpHandler(function ($request, $response) {
    if ($request->getPath() === '/slow') {
        delay(5000); // five seconds of "heavy" I/O work
        $response->setBody("was slow\n");
        return;
    }

    $response->setBody("fast\n");
});
```

Now open two terminals. In the first, request `/slow`. It hangs,
waiting out its five seconds. Without waiting for it, request `/` in
the second terminal:

```bash
$ curl http://localhost:8080/
fast
```

Instantly.

If you read the first series, you already understand what happened.
The `/slow` coroutine fell asleep in `delay`, the scheduler passed
control on, and the server calmly served the second request. These are
the same "A" and "B" counters from the very first chapter, only now
they're called HTTP requests. One thread. One event loop. Thousands of
concurrent clients.

Now picture what that same `/slow` would do to classic FPM. Five
seconds of sleep is five seconds during which an entire worker is out
of commission. A dozen such requests and the worker pool is exhausted.
The whole site stands and waits while someone finishes their nap.

## A Process That Doesn't Die

The second consequence is more interesting than the first, even though
it looks mundane. `start()` never returns. Which means everything
created before it lives as long as the server does:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX     => 10,
]);

$directory = new RegionsDirectory(); // memoization from chapter six

$server->addHttpHandler(function ($request, $response) use ($pdo, $directory) {
    // the pool is already warm, the directory is already loaded
});

$server->start();
```

The connection pool opens once. The regions directory loads once. The
routes compile once. Remember how much effort the first series spent
on reuse tooling? Here's the place where it all finally comes home.
Cold start didn't get faster. It vanished.

To be fair, long life has a price, and it's worth saying so upfront. A
memory leak is no longer forgiven by the death of the process after
the request. A global variable is no longer "for one request," it's
forever and for everyone. No need to panic: scope, pools, and context
from the first series were invented for exactly this, and we'll cover
the server-specific details in a separate chapter.

For now our server has a simpler problem: it answers the same thing to
everything. `GET /profile/42`, `POST /profile/42/address`, a typo in
the URL, it makes no difference. A real `ProfileService` will have to
learn to read the request. That's what we'll tackle next.
