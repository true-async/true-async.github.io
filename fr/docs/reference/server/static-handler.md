---
layout: docs
lang: fr
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /fr/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler — service de statique en prefix-mount sans handler PHP. Sidecars précompressés, ETag, Range, politiques dotfile/symlink, open-file cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

Handler intégré de fichiers statiques (issue #13). Une instance = un prefix-mount. S'attache au
serveur via [`HttpServer::addStaticHandler()`](/fr/docs/reference/server/http-server.html#addstatichandler).

Entièrement en C : les requêtes ne spawn pas de coroutine et n'entrent pas dans la VM PHP — les
fichiers sont envoyés via les async fs ops libuv directement dans le stream de la réponse.

```php
namespace TrueAsync;

final class StaticHandler
{
    public function __construct(string $urlPrefix, string $rootDirectory);

    // index / fallthrough
    public function setIndexFiles(string ...$files): static;
    public function disableIndex(): static;
    public function setOnMissing(StaticOnMissing $mode): static;

    // sidecars précompressés
    public function enablePrecompressed(string ...$encodings): static;
    public function disablePrecompressed(): static;

    // sécurité
    public function setDotfilePolicy(StaticDotfiles $policy): static;
    public function setSymlinkPolicy(StaticSymlinks $policy): static;
    public function hide(string ...$globs): static;

    // cache / en-têtes
    public function setEtagEnabled(bool $enabled): static;
    public function setCacheControl(string $value): static;
    public function setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static;
    public function disableOpenFileCache(): static;
    public function setHeader(string $name, string $value): static;

    // directory listing
    public function setBrowseEnabled(bool $enabled): static;

    // MIME
    public function setMimeType(string $extension, string $contentType): static;

    // introspection
    public function getUrlPrefix(): string;
    public function getRootDirectory(): string;
    public function isLocked(): bool;
}
```

## Constructeur

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| Paramètre | Exigences |
|-----------|-----------|
| `$urlPrefix` | Préfixe URL. Doit commencer et se terminer par `/`. Exemple : `"/static/"`. |
| `$rootDirectory` | Chemin absolu vers un répertoire disque ; canonicalisé à attach-time. |

## Index / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

Noms de fichiers servis pour une requête sur une URL répertoire. Défaut `["index.html"]`. Liste
vide : désactive le lookup d'index.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

Équivalent de `setIndexFiles()` sans arguments.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

Quoi faire si le chemin demandé ne résout pas vers un fichier régulier sous root :

| Valeur | Comportement |
|--------|--------------|
| `StaticOnMissing::NOT_FOUND` (défaut) | 404 en C, la requête n'entre pas dans la VM PHP |
| `StaticOnMissing::NEXT` | Le contrôle est rendu au dispatcher, un handler-coroutine normal est spawné — la requête passe à [`addHttpHandler()`](/fr/docs/reference/server/http-server.html#addhttphandler) |

## Sidecars précompressés

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

Active la livraison de sidecars précompressés (`main.css.br`, `main.css.gz`, `main.css.zst`), quand
le client le permet via `Accept-Encoding`. Arguments : noms de content-coding `"br"`, `"gzip"`,
`"zstd"`. Inconnus : `InvalidArgumentException` au setter.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## Sécurité

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" : tout path-segment commençant par `.`, y compris `..` (ce dernier est toujours rejeté
par le traversal guard, indépendamment de la politique).

| | Comportement |
|---|---|
| `StaticDotfiles::DENY` (défaut) | 404 sur tout chemin avec composant dotfile |
| `StaticDotfiles::ALLOW` | les dotfiles sont servis comme des fichiers normaux |
| `StaticDotfiles::IGNORE` | comme si le fichier n'existait pas (passthrough selon `StaticOnMissing`) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | Comportement |
|---|---|
| `StaticSymlinks::REJECT` (défaut) | 404 sur tout symlink dans le chemin. `O_NOFOLLOW` + `lstat` par segment — le symlink n'est jamais traversé |
| `StaticSymlinks::FOLLOW` | symlinks suivis ; après `realpath()`, la cible doit rester sous root |
| `StaticSymlinks::OWNER_MATCH` | follow uniquement si symlink et cible appartiennent au même uid |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Patterns glob : les paths matchés renvoient 404 indépendamment de l'existence. Comparaison
**relative à root**, séparateur `/`.

## Cache / en-têtes

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

Toggle weak ETag (défaut `true`). À l'activation, chaque 200 porte `ETag: W/"…"` calculé depuis
`(mtime_ns, size, ino)` ; `If-None-Match` / `If-Modified-Since` donnent 304.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

`Cache-Control` littéral. Chaîne vide : supprime l'émission.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

Open-file cache style nginx : stocke le chemin résolu, les métadonnées fstat, le MIME, l'ETag et
Last-Modified pour les N dernières requêtes. Dans la fenêtre `ttlSeconds`, les requêtes répétées
hitent le cache et sautent les passes realpath/stat/MIME.

Désactivé par défaut. Gagne sur cold-dentry / docroot volumineux / FS réseau. Sur warm-dentry de
disque local, les syscalls sont déjà sous µs — le surcoût du HashTable-lookup mange le gain.

`$maxEntries == 0` : désactiver.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

Sucre pour `setOpenFileCache(0)`.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

En-tête fixe, évalué une seule fois à attach-time. Émis sur chaque 200 et sur 304 (sauf les
en-têtes `Content-*` selon RFC 9110 §15.4.5).

## Directory listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

Toggle du listing HTML pour une requête sur un répertoire sans index. Défaut `false`.

> Réservé sous PR #6 — actuellement no-op, accepté au setter sans effet.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

Override du `Content-Type` pour les fichiers ayant l'extension donnée. Extension en minuscules,
sans dot initial.

## Introspection

### getUrlPrefix / getRootDirectory

```php
public StaticHandler::getUrlPrefix(): string
public StaticHandler::getRootDirectory(): string
```

### isLocked

```php
public StaticHandler::isLocked(): bool
```

`true` après attach au serveur via `addStaticHandler()`. Un handler locked refuse tous les setters
avec une runtime-exception.

## Enums

Voir pages séparées :

- [`StaticOnMissing`](/fr/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/fr/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/fr/docs/reference/server/static-symlinks.html)

(Les trois sont `enum: int` sous namespace `TrueAsync`.)

## Exemple

```php
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;
use TrueAsync\StaticDotfiles;

$static = (new StaticHandler('/static/', '/var/www/public'))
    ->setIndexFiles('index.html', 'index.htm')
    ->enablePrecompressed('br', 'gzip')
    ->setOnMissing(StaticOnMissing::NEXT)
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setEtagEnabled(true)
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60)
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->hide('*.bak', '*.tmp', 'private/**');

$server->addStaticHandler($static);
```

## Voir aussi

- [Fichiers statiques et sendFile](/fr/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/fr/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/fr/docs/reference/server/http-response.html#sendfile)
