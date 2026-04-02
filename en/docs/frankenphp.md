---
layout: docs
lang: en
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /en/docs/frankenphp.html
page_title: "FrankenPHP"
description: "Running TrueAsync PHP with FrankenPHP — Docker quick start, building from source, Caddyfile configuration, async worker entrypoint, graceful restart, and troubleshooting."
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) is a PHP application server built on top of [Caddy](https://caddyserver.com).
It embeds the PHP runtime directly into a Go process, eliminating the overhead of a separate FastCGI proxy.

In the TrueAsync fork of FrankenPHP, a single PHP thread handles **many requests simultaneously** —
each incoming HTTP request gets its own coroutine, and the TrueAsync scheduler switches between them
while they are waiting for I/O.

```
Traditional FPM / regular FrankenPHP:
  1 request → 1 thread  (blocked during I/O)

TrueAsync FrankenPHP:
  N requests → 1 thread  (coroutines, non-blocking I/O)
```

## Quick Start — Docker

The fastest way to try the setup is with the pre-built Docker image:

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

Open [http://localhost:8080](http://localhost:8080) — you will see the live dashboard showing PHP version,
active coroutines, memory, and uptime.

### Available image tags

| Tag | Description |
|-----|-------------|
| `latest-frankenphp` | Latest stable, latest PHP |
| `latest-php8.6-frankenphp` | Latest stable, PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | Specific release |

### Running your own PHP application

Mount your application directory and provide a custom `Caddyfile`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## Install from Source

Building from source gives you a native `frankenphp` binary alongside the `php` binary.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Or interactively — the wizard will ask about FrankenPHP as part of the extension preset selection.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

### What gets installed

After a successful build both binaries are placed in `$INSTALL_DIR/bin/`:

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # FrankenPHP server binary
```

## Caddyfile Configuration

FrankenPHP is configured via a `Caddyfile`. The minimal configuration for an async TrueAsync worker:

```caddyfile
{
    admin off
    frankenphp {
        num_threads 4   # total PHP threads across all workers (default: 2× CPU cores)
    }
}

:8080 {
    root * /app
    php_server {
        index off
        file_server off
        worker {
            file /app/entrypoint.php
            num 1
            async
            match /*
        }
    }
}
```

### Global `frankenphp` directives

| Directive | Description |
|-----------|-------------|
| `num_threads N` | Total PHP thread pool size. Defaults to `2 × CPU cores`. All workers share this pool |

### Key worker directives

| Directive | Description |
|-----------|-------------|
| `file` | Path to the PHP entrypoint script |
| `num` | Number of PHP threads assigned to this worker. Start with `1` and tune based on CPU-bound work |
| `async` | **Required** — enables TrueAsync coroutine mode |
| `drain_timeout` | Grace period for in-flight requests during graceful restart (default `30s`) |
| `match` | URL pattern handled by this worker |

### Multiple workers

You can run different entrypoints for different routes:

```caddyfile
:8080 {
    root * /app
    php_server {
        worker {
            file /app/api.php
            num 2
            async
            match /api/*
        }
        worker {
            file /app/web.php
            num 1
            async
            match /*
        }
    }
}
```

## Writing the Entrypoint

The entrypoint is a long-running PHP script. It registers a request handler callback and then
hands control to `FrankenPHP`, which blocks until the server shuts down.

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

set_time_limit(0);

HttpServer::onRequest(function (Request $request, Response $response): void {
    $path = parse_url($request->getUri(), PHP_URL_PATH);

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello from TrueAsync! Path: $path");
    $response->end();
});
```

The handler receives a [`Request`](/en/docs/reference/frankenphp/request.html) and a [`Response`](/en/docs/reference/frankenphp/response.html) object.
Each request runs in its own coroutine — there are no shared globals, so handlers are safe for concurrent execution.

> **Important:** always call `response->end()` to send the response, even when the body is empty.
> Omitting `end()` will hang the request.

### API Reference

| Class | Description |
|-------|-------------|
| [`FrankenPHP\Request`](/en/docs/reference/frankenphp/request.html) | Read-only access to HTTP method, URI, headers, body, query params, cookies, and uploaded files |
| [`FrankenPHP\Response`](/en/docs/reference/frankenphp/response.html) | Set status, headers, buffer body with `write()`, send with `end()`, redirect |
| [`FrankenPHP\UploadedFile`](/en/docs/reference/frankenphp/uploaded-file.html) | Uploaded file metadata (name, type, size, error) and `moveTo()` |

### Async I/O inside the handler

Because each request runs in its own coroutine, you can use blocking I/O calls freely —
they will yield the coroutine instead of blocking the thread:

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    $db   = new PDO('pgsql:host=localhost;dbname=app', 'user', 'pass');
    $rows = $db->query('SELECT * FROM users LIMIT 10')->fetchAll();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($rows));
    $response->end();
});
```

### Spawning additional coroutines

The handler itself is already a coroutine, so you can `spawn()` child work:

```php
use function Async\spawn;
use function Async\await;

HttpServer::onRequest(function (Request $request, Response $response): void {
    // Fan-out: run two DB queries concurrently
    $users  = spawn(fn() => fetchUsers());
    $totals = spawn(fn() => fetchTotals());

    $data = [
        'users'  => await($users),
        'totals' => await($totals),
    ];

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($data));
    $response->end();
});
```

## Tuning

### Worker thread count (`num`)

Each PHP thread runs one TrueAsync scheduler loop. A single thread already handles thousands of
concurrent I/O-bound requests via coroutines. Add more threads only when you have CPU-bound work
that benefits from true parallelism (each thread runs on a separate OS thread thanks to ZTS).

A good starting point:

```
I/O-heavy API:   num 1–2
Mixed workload:  num = number of CPU cores / 2
CPU-heavy:       num = number of CPU cores
```

## Graceful Restart

Async workers support **green-blue restarts** — code is reloaded without dropping in-flight requests.

When a restart is triggered (via admin API, file watcher, or config reload):

1. Old threads are **detached** — no new requests are routed to them.
2. In-flight requests get a grace period (`drain_timeout`, default `30s`) to finish.
3. Old threads shut down and release their resources.
4. Fresh threads boot with the updated PHP code.

During the drain window new requests receive `HTTP 503`. Once the new threads are ready, traffic resumes normally.

### Trigger via Admin API

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

The Caddy admin API listens on `localhost:2019` by default. To enable it, remove `admin off` from
your global block (or restrict it to localhost):

```caddyfile
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Configuring the drain timeout

```caddyfile
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## Checking the installation

```bash
# Version
frankenphp version

# Start with a config
frankenphp run --config /etc/caddy/Caddyfile

# Validate the Caddyfile without starting
frankenphp adapt --config /etc/caddy/Caddyfile
```

Check that TrueAsync is active from PHP:

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## Troubleshooting

### Requests never arrive at the PHP handler

Make sure the worker has `async` enabled **and** that the Caddy matcher routes traffic to it.
Without `match *` (or a specific pattern) no requests reach the async worker.

### Requests getting `HTTP 503`

All PHP threads are busy and the thread queue is saturated, or a graceful restart is in progress.
Increase `num` to add more threads, or reduce `drain_timeout` if deploys are taking too long.

## Source code

| Repository | Description |
|------------|-------------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | TrueAsync fork of FrankenPHP (`true-async` branch) |
| [true-async/releases](https://github.com/true-async/releases) | Docker images, installers, build configuration |

For a deep dive into how the Go ↔ PHP integration works internally, see the
[FrankenPHP Architecture](/en/architecture/frankenphp.html) page.
