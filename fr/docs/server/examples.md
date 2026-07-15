---
layout: docs
lang: fr
path_key: "/docs/server/examples.html"
nav_active: docs
permalink: /fr/docs/server/examples.html
page_title: "TrueAsync Server : exemples"
description: "Recettes prêtes à l'emploi : JSON-API, fan-out, multipart upload, statique, redirect, SSE, bailout firewall."
---

# Exemples TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

## JSON-API avec fan-out parallèle

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

    // Trois requêtes indépendantes en BD, en parallèle
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

## Statique + dynamique

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setCompressionEnabled(true);

$server = new HttpServer($config);

// /assets/* est servi depuis public/, aucun handler PHP
$server->addStaticHandler(
    (new StaticHandler('/assets/', __DIR__ . '/public'))
        ->setIndexFiles('index.html')
        ->enablePrecompressed('br', 'gzip')
        ->setCacheControl('public, max-age=31536000, immutable')
);

// Tout le reste passe en PHP
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(200)->html('<h1>Dynamic route: ' . htmlspecialchars($req->getPath()) . '</h1>');
});

$server->start();
```

## Multipart upload avec file move

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

## Streaming d'un gros upload sans rétention en RAM

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
            break;   // le client est parti, inutile d'attendre
        }

        \Async\delay(1000);
    }

    $res->end();
});
```

Voir le [guide SSE](/fr/docs/server/sse.html) pour le parcours complet de chaque méthode.

## WebSocket (serveur écho)

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

// Obligatoire : le serveur refuse de démarrer sans handler HTTP, et c'est lui
// qui répond aux requêtes qui ne sont pas des upgrades.
$server->addHttpHandler(fn ($req, $res) => $res->setStatusCode(404)->end());

$server->start();
```

Diffuser un message à tous les clients — y compris ceux servis par **d'autres threads
worker** — c'est à cela que servent les topics. On s'abonne à la connexion, `publish()`
fait le fan-out ; pas de tableau partagé, pas de `setWorkers(1)` :

```php
use TrueAsync\HttpRequest;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)                          // un vrai chat, réparti sur 4 threads
);

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';
    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);  // atteint les abonnés sur TOUS les workers
    }
});

$server->addHttpHandler(fn ($req, $res) => $res->setStatusCode(404)->end());

$server->start();
```

`publish()` ne suspend jamais : un pair dont le socket est engorgé perd le message plutôt
que de bloquer le reste du topic. Voir le
[guide WebSocket](/fr/docs/server/websocket.html#topics-publishsubscribe-across-every-worker)
pour le modèle de topics, les filtres et les rate limits.

## Téléchargement de fichier avec auth

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

## JSON pré-encodé (skip re-encoding)

```php
$cache = new RedisCache();

$server->addHttpHandler(function ($req, $res) use ($cache) {
    $key = 'feed:' . $req->getQueryParam('uid');
    $cached = $cache->get($key);

    if ($cached !== null) {
        // string → envoyée telle quelle, sans re-encodage
        $res->json($cached);
        return;
    }

    $payload = buildFeed($req);
    $cache->set($key, $payload = json_encode($payload), 60);
    $res->json($payload);
});
```

## Bailout firewall : un fatal ne tue pas le serveur

Handler volontairement cassé :

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/boom') {
        throw new \Error('uncaught fatal');
    }
    $res->setStatusCode(200)->setBody('ok');
});
```

Une requête sur `/boom` renverra **500 Internal Server Error**, la coroutine du handler est drainée,
le listener continue d'accepter de nouvelles connexions. Même comportement sur E_ERROR, OOM et
exceptions non capturées pendant le shutdown. Fonctionne en H1, H2 et H3.

## Exception HTTP personnalisée

`TrueAsync\HttpException extends Async\AsyncCancellation`. Levez-la depuis n'importe où dans le
handler pour envoyer un statut HTTP spécifique via la chaîne de cancellation normale.

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

Le statut vient de `$code` (doit être 4xx/5xx, sinon 500), le corps vient de `$message`.

## Voir aussi

- [`examples/` dans le dépôt](https://github.com/true-async/server/tree/main/examples)
  (`minimal-server.php`, `demo-server.php`, `multi-worker.php`, `multi-worker-manual.php`)
- [Configuration](/fr/docs/server/configuration.html)
- [Multi-worker](/fr/docs/server/workers.html)
