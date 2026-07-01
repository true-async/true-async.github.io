---
layout: docs
lang: uk
path_key: "/docs/server/examples.html"
nav_active: docs
permalink: /uk/docs/server/examples.html
page_title: "TrueAsync Server: приклади"
description: "Готові рецепти: JSON-API, fan-out, multipart upload, статика, redirect, SSE, bailout firewall."
---

# Приклади TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

## JSON-API з паралельним fan-out

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;
use function Async\await_all;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(\Async\available_parallelism())
);

$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() !== '/dashboard') {
        $res->setStatusCode(404)->json(['error' => 'not found']);
        return;
    }

    $userId = (int) $req->getQueryParam('user_id');

    // Три незалежних запити в БД, паралельно
    [$user, $posts, $followers] = await_all([
        spawn(fn() => fetchUser($userId)),
        spawn(fn() => fetchPosts($userId)),
        spawn(fn() => fetchFollowers($userId)),
    ]);

    $res->json([
        'user'      => $user,
        'posts'     => $posts,
        'followers' => $followers,
    ]);
});

$server->start();
```

## Статика + dynamic

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setCompressionEnabled(true);

$server = new HttpServer($config);

// /assets/* роздається з public/, жодних PHP-обробників
$server->addStaticHandler(
    (new StaticHandler('/assets/', __DIR__ . '/public'))
        ->setIndexFiles('index.html')
        ->enablePrecompressed('br', 'gzip')
        ->setCacheControl('public, max-age=31536000, immutable')
);

// Усе інше йде в PHP
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(200)->html('<h1>Dynamic route: ' . htmlspecialchars($req->getPath()) . '</h1>');
});

$server->start();
```

## Multipart upload з file move

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setMaxBodySize(100 * 1024 * 1024)
);

$server->addHttpHandler(function ($req, $res) {
    if ($req->getMethod() !== 'POST') {
        $res->setStatusCode(405); return;
    }

    $avatar = $req->getFile('avatar');
    if ($avatar === null || !$avatar->isValid()) {
        $res->setStatusCode(400)->json(['error' => 'no valid avatar']);
        return;
    }

    if ($avatar->getSize() > 5 * 1024 * 1024) {
        $res->setStatusCode(413)->json(['error' => 'too big']);
        return;
    }

    $target = '/var/storage/avatars/' . bin2hex(random_bytes(8)) . '.bin';
    $avatar->moveTo($target);

    $res->json([
        'saved' => $target,
        'name'  => $avatar->getClientFilename(),
        'mime'  => $avatar->getClientMediaType(),
        'size'  => $avatar->getSize(),
    ]);
});

$server->start();
```

## Стрімінг великого upload без утримання в RAM

```php
$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setBodyStreamingEnabled(true)
        ->setMaxBodySize(10 * 1024 * 1024 * 1024)   // 10 GiB
);

$server->addHttpHandler(function ($req, $res) {
    $id = bin2hex(random_bytes(8));
    $fp = fopen("/var/storage/uploads/$id.bin", 'wb');
    if ($fp === false) {
        $res->setStatusCode(500)->json(['error' => 'open failed']); return;
    }

    $total = 0;
    try {
        while (($chunk = $req->readBody()) !== null) {
            fwrite($fp, $chunk);
            $total += strlen($chunk);
        }
    } finally {
        fclose($fp);
    }

    $res->json(['id' => $id, 'size' => $total]);
});

$server->start();
```

## SSE (Server-Sent Events)

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() !== '/events') {
        $res->setStatusCode(404); return;
    }

    for ($i = 0; $i < 60; $i++) {
        $res->sseEvent(json_encode(['t' => time(), 'i' => $i]));

        if (!$res->sendable()) {
            break;   // клієнт відвалився, немає сенсу чекати даремно
        }

        \Async\delay(1000);
    }

    $res->end();
});
```

Подробиці та розбір усіх методів дивіться в [керівництві по SSE](/uk/docs/server/sse.html).

## WebSocket (echo-сервер)

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        if ($msg->binary) {
            $ws->sendBinary($msg->data);
        } else {
            $ws->send('echo: ' . $msg->data);
        }
    }
});

$server->start();
```

Broadcast кільком клієнтам, без очікування повільних:

```php
/** @var WebSocket[] $clients */
$clients = [];

$server->addWebSocketHandler(function (WebSocket $ws) use (&$clients) {
    $clients[spl_object_id($ws)] = $ws;

    try {
        foreach ($ws as $msg) {
            foreach ($clients as $peer) {
                if ($peer !== $ws) {
                    $peer->trySend($msg->data);   // неблокувально, повільний клієнт не стопорить решту
                }
            }
        }
    } finally {
        unset($clients[spl_object_id($ws)]);
    }
});
```

Подробиці та розбір усіх методів дивіться в [керівництві по WebSocket](/uk/docs/server/websocket.html).

## Завантаження файлу з auth

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, $res) {
    $token = $req->getHeader('Authorization');
    if (!isValidToken($token)) {
        $res->setStatusCode(401); return;
    }

    $reportId = preg_replace('#[^a-z0-9-]#', '', $req->getQueryParam('id') ?? '');
    if ($reportId === '') {
        $res->setStatusCode(400); return;
    }

    $res->sendFile("/var/storage/reports/$reportId.pdf", new SendFileOptions(
        contentType:  'application/pdf',
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: "report-$reportId.pdf",
        cacheControl: 'private, no-store',
    ));
});
```

## Redirect

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/old-url') {
        $res->redirect('/new-url', 301);
        return;
    }
    // ...
});
```

## Pre-encoded JSON (skip re-encoding)

```php
$cache = new RedisCache();

$server->addHttpHandler(function ($req, $res) use ($cache) {
    $key = 'feed:' . $req->getQueryParam('uid');
    $cached = $cache->get($key);

    if ($cached !== null) {
        // рядок → надсилається як є, без переупаковки
        $res->json($cached);
        return;
    }

    $payload = buildFeed($req);
    $cache->set($key, $payload = json_encode($payload), 60);
    $res->json($payload);
});
```

## Bailout firewall: fatal не валить сервер

Навмисно битий обробник:

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/boom') {
        throw new \Error('uncaught fatal');
    }
    $res->setStatusCode(200)->setBody('ok');
});
```

Запит на `/boom` віддасть **500 Internal Server Error**, корутина handler'а дренується, listener
продовжує приймати нові з'єднання. Та сама поведінка на E_ERROR, OOM і uncaught винятках під час
shutdown. Працює на H1, H2 і H3.

## Кастомне HTTP-виключення

`TrueAsync\HttpException extends Async\AsyncCancellation`. Киньте його з будь-якого місця обробника,
щоб надіслати специфічний HTTP-статус через нормальний ланцюжок cancellation.

```php
use TrueAsync\HttpException;

class NotFoundException extends HttpException {}
class ForbiddenException extends HttpException {}

$server->addHttpHandler(function ($req, $res) {
    $user = User::find($req->getQueryParam('id'))
         ?? throw new NotFoundException('user not found', 404);

    if (!$user->canBeViewedBy(currentUser()))
         throw new ForbiddenException('access denied', 403);

    $res->json($user->toArray());
});
```

Статус береться з `$code` (має бути 4xx/5xx, інакше 500), тіло береться з `$message`.

## Див. також

- [`examples/` у репозиторії](https://github.com/true-async/server/tree/main/examples)
  (`minimal-server.php`, `demo-server.php`, `multi-worker.php`, `multi-worker-manual.php`)
- [Конфігурація](/uk/docs/server/configuration.html)
- [Multi-worker](/uk/docs/server/workers.html)
