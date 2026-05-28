---
layout: docs
lang: es
path_key: "/docs/server/examples.html"
nav_active: docs
permalink: /es/docs/server/examples.html
page_title: "TrueAsync Server: ejemplos"
description: "Recetas listas: JSON-API, fan-out, subida multipart, estáticos, redirect, SSE, bailout firewall."
---

# Ejemplos de TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

## JSON-API con fan-out paralelo

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

    // Tres consultas independientes a la BD, en paralelo
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

## Estáticos + dinámico

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setCompressionEnabled(true);

$server = new HttpServer($config);

// /assets/* se sirve desde public/, sin manejadores PHP
$server->addStaticHandler(
    (new StaticHandler('/assets/', __DIR__ . '/public'))
        ->setIndexFiles('index.html')
        ->enablePrecompressed('br', 'gzip')
        ->setCacheControl('public, max-age=31536000, immutable')
);

// Todo lo demás va a PHP
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(200)->html('<h1>Dynamic route: ' . htmlspecialchars($req->getPath()) . '</h1>');
});

$server->start();
```

## Subida multipart con file move

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

## Streaming de subida grande sin retenerla en RAM

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

    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setHeader('X-Accel-Buffering', 'no')   // nginx-friendly
        ->setNoCompression();                      // SSE: los eventos deben llegar al cliente de inmediato

    for ($i = 0; $i < 60; $i++) {
        $payload = json_encode(['t' => time(), 'i' => $i]);
        $res->send("data: $payload\n\n");
        \Async\delay(1000);
    }
});
```

## Descarga de archivo con auth

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

## JSON pre-codificado (saltarse la re-codificación)

```php
$cache = new RedisCache();

$server->addHttpHandler(function ($req, $res) use ($cache) {
    $key = 'feed:' . $req->getQueryParam('uid');
    $cached = $cache->get($key);

    if ($cached !== null) {
        // string → se envía tal cual, sin re-empaquetar
        $res->json($cached);
        return;
    }

    $payload = buildFeed($req);
    $cache->set($key, $payload = json_encode($payload), 60);
    $res->json($payload);
});
```

## Bailout firewall: un fatal no tira el servidor

Manejador roto a propósito:

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/boom') {
        throw new \Error('uncaught fatal');
    }
    $res->setStatusCode(200)->setBody('ok');
});
```

Una solicitud a `/boom` devuelve **500 Internal Server Error**, la corrutina del handler se drena
y el listener sigue aceptando nuevas conexiones. El mismo comportamiento se aplica ante E_ERROR,
OOM y excepciones no capturadas durante el shutdown. Funciona en H1, H2 y H3.

## Excepción HTTP personalizada

`TrueAsync\HttpException extends Async\AsyncCancellation`. Lánzala desde cualquier punto del
manejador para enviar un status HTTP específico a través de la cadena normal de cancellation.

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

El status se toma de `$code` (debe ser 4xx/5xx, en caso contrario 500); el cuerpo se toma de
`$message`.

## Véase también

- [`examples/` en el repositorio](https://github.com/true-async/server/tree/main/examples)
  (`minimal-server.php`, `demo-server.php`, `multi-worker.php`, `multi-worker-manual.php`)
- [Configuración](/es/docs/server/configuration.html)
- [Multi-worker](/es/docs/server/workers.html)
