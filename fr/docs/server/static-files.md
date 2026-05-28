---
layout: docs
lang: fr
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /fr/docs/server/static-files.html
page_title: "TrueAsync Server : fichiers statiques et sendFile"
description: "StaticHandler : service de statique intégré sans handler PHP. sendFile() : envoi de fichier depuis le handler. Sidecars précompressés, ETag, Range, politiques de sécurité."
---

# Fichiers statiques et sendFile

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server propose deux mécanismes indépendants de livraison de fichiers :

1. **`StaticHandler`** : un prefix-mount distinct, servi **entièrement en C**, sans spawn de
   coroutine et sans entrée dans la VM PHP.
2. **`HttpResponse::sendFile()`** : livraison pilotée par le handler. Le code PHP a pris la décision
   (auth, ACL, génération de nom), le serveur récupère le fichier sur disque et l'envoie.

Les deux utilisent la même FSM dans le moteur (MIME, ETag, IMF-date, Range, conditional GET,
sidecars précompressés).

## StaticHandler

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;

$server = new HttpServer(
    (new HttpServerConfig())->addListener('0.0.0.0', 8080)
);

$static = (new StaticHandler('/static/', '/var/www/public'))
    ->setIndexFiles('index.html')
    ->enablePrecompressed('br', 'gzip')
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setEtagEnabled(true);

$server->addStaticHandler($static);

$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(200)->setBody('dynamic route');
});

$server->start();
```

Les requêtes vers `/static/...` sont servies par `StaticHandler` (aucun handler PHP n'est appelé).
Tout le reste passe par l'`addHttpHandler` habituel.

Les mounts multiples sont matchés **dans l'ordre d'enregistrement**. Après attach, le
`StaticHandler` est verrouillé ; tout setter sur celui-ci lèvera `HttpServerRuntimeException`.

### Index et fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // ce qui est servi sur une URL répertoire
    ->disableIndex()                              // ou pas de lookup d'index du tout
    ->setOnMissing(StaticOnMissing::NEXT);        // → passer au handler PHP
```

**`StaticOnMissing`** définit quoi faire si le fichier n'est pas trouvé sous root :

| Valeur | Comportement |
|--------|--------------|
| `NOT_FOUND` (défaut) | 404 en C, la requête n'entre pas dans la VM PHP |
| `NEXT` | Le contrôle est rendu au dispatcher, un handler-coroutine normal est spawné |

> Une requête sur une URL répertoire sans trailing slash, dont tous les fichiers d'index donnent
> 404, renvoie 404. Le redirect 301 que font nginx/Apache n'est **pas** émis par ce handler. Si
> votre déploiement repose sur un catch-all sur les chemins répertoire, désactivez le lookup
> d'index : `setIndexFiles([])` / `disableIndex()`.

### Sidecars précompressés

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

Quand le client envoie `Accept-Encoding: br, gzip`, le handler cherche `main.css.br` à côté de
`main.css` et envoie le sidecar directement, sans coût CPU d'encodage. Noms supportés : `"br"`,
`"gzip"`, `"zstd"`. Un nom inconnu lève `InvalidArgumentException` au setter.

### Politiques de sécurité

```php
use TrueAsync\StaticDotfiles;
use TrueAsync\StaticSymlinks;

$static
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setSymlinkPolicy(StaticSymlinks::REJECT)
    ->hide('*.bak', '*.tmp', 'private/**');
```

**`StaticDotfiles`** :

| | Comportement |
|---|---|
| `DENY` (défaut) | 404 sur tout chemin contenant un segment commençant par `.` (y compris `..`) |
| `ALLOW` | les dotfiles sont servis comme des fichiers normaux |
| `IGNORE` | comme si le fichier n'existait pas (passthrough selon `StaticOnMissing`) |

**`StaticSymlinks`** :

| | Comportement |
|---|---|
| `REJECT` (défaut) | 404 sur tout symlink dans le chemin. `O_NOFOLLOW` + `lstat` par segment, le symlink n'est jamais traversé |
| `FOLLOW` | les symlinks sont suivis ; après `realpath()`, la cible doit rester sous root |
| `OWNER_MATCH` | follow uniquement si le symlink et la cible appartiennent au même uid |

`hide($glob, ...)` définit des patterns glob renvoyant 404 indépendamment de l'existence du fichier.
La comparaison est faite **relativement à root**, séparateur `/`.

### Cache / en-têtes

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" calculé depuis (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-file cache** (style nginx) : stocke le chemin résolu, les métadonnées fstat, le MIME, l'ETag,
Last-Modified pour les N dernières requêtes. Dans la fenêtre `ttlSeconds`, les requêtes répétées
hitent le cache et sautent les passes realpath/stat/MIME.

Désactivé par défaut. Gagne sur cold-dentry / docroot volumineux / FS réseau. Sur warm-dentry de
disque local, les syscalls sont déjà sous µs, donc le surcoût du HashTable-lookup mange le gain.

### Override MIME

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

Extension sans dot initial, en minuscules.

### Performance

Depuis 0.4.0 dans le moteur :

- **`open(2)`/`fstat(2)` inlinés** (issue #13) : sans futex round-trip via le thread pool libuv.
  Wins : H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Small-file fast path** (≤ 64 KiB) : le fichier est slurpé dans une `zend_string` et envoyé en
  un seul `writev(headers + body)`. Wins : H1 tiny → 103k req/s (×2.9), H2 tiny → 154k (×4.4).
- Les fichiers > 64 KiB passent par sendfile.

## sendFile depuis le handler

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, $res) {
    $userId = (int) $req->getQueryParam('id');
    if (!isAuthorized($userId)) {
        $res->setStatusCode(403); return;
    }

    $res->sendFile('/var/storage/reports/2026-Q1.pdf', new SendFileOptions(
        contentType:   'application/pdf',
        disposition:   SendFileDisposition::ATTACHMENT,
        downloadName:  'Q1-report.pdf',
        cacheControl:  'private, no-store',
        acceptRanges:  true,
        conditional:   true,
        precompressed: false,
    ));
});
```

`sendFile()` **inscrit** path + options sur la réponse et **retourne immédiatement**. Le transfert
du fichier a lieu en phase dispose via la même FSM que `StaticHandler`. La middleware de compression
est bypassée pour sendFile (pipeline de livraison propre).

Après `sendFile()`, la réponse est **scellée** : `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` et un second `sendFile()` lèvent
`HttpServerRuntimeException`.

Le chemin est considéré **de confiance** : le handler a lui-même décidé de l'accès. Les erreurs
open/fstat (`ENOENT`, `EACCES`, oversize, non-regular) donnent 500, parce que les en-têtes ne sont
pas encore partis sur le câble.

### SendFileOptions

`final readonly class` avec args nommés au constructeur :

| Champ | Type | Défaut | Rôle |
|-------|------|--------|------|
| `contentType` | `?string` | `null` | override MIME ; `null` signifie auto depuis l'extension |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` ou `ATTACHMENT` |
| `downloadName` | `?string` | `null` | nom du fichier pour `Content-Disposition: attachment; filename=...` |
| `cacheControl` | `?string` | `null` | littéralement dans `Cache-Control` |
| `etag` | `bool` | `true` | émettre un weak ETag |
| `lastModified` | `bool` | `true` | émettre `Last-Modified` |
| `acceptRanges` | `bool` | `true` | support de `Range:` |
| `precompressed` | `bool` | `true` | chercher un sidecar `.br`/`.gz`/`.zst` |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | unlink après envoi réussi (pour téléchargements one-shot) |
| `status` | `?int` | `null` | override du statut HTTP (par ex. pour répondre 200 à un CDN) |

> Le chemin HTTP/3 pour `sendFile()` est encore en développement : le hook dispose renvoie 500 en H3.

## Voir aussi

- [`TrueAsync\StaticHandler`](/fr/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/fr/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/fr/docs/reference/server/http-response.html#sendfile)
- [Compression](/fr/docs/server/compression.html)
