---
layout: docs
lang: it
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /it/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler: servizio dei file statici con prefix-mount senza handler PHP. Sidecar precompressi, ETag, Range, policy dotfile/symlink, open-file cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

Handler integrato per i file statici (issue #13). Una istanza = un prefix-mount.
Si aggancia al server tramite
[`HttpServer::addStaticHandler()`](/it/docs/reference/server/http-server.html#addstatichandler).

Interamente in C: le richieste non creano coroutine e non entrano nella VM PHP — i file vengono
serviti tramite le operazioni async fs di libuv direttamente nello stream di risposta.

```php
namespace TrueAsync;

final class StaticHandler
{
    public function __construct(string $urlPrefix, string $rootDirectory);

    // index / fallthrough
    public function setIndexFiles(string ...$files): static;
    public function disableIndex(): static;
    public function setOnMissing(StaticOnMissing $mode): static;

    // sidecar precompressi
    public function enablePrecompressed(string ...$encodings): static;
    public function disablePrecompressed(): static;

    // sicurezza
    public function setDotfilePolicy(StaticDotfiles $policy): static;
    public function setSymlinkPolicy(StaticSymlinks $policy): static;
    public function hide(string ...$globs): static;

    // cache / header
    public function setEtagEnabled(bool $enabled): static;
    public function setCacheControl(string $value): static;
    public function setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static;
    public function disableOpenFileCache(): static;
    public function setHeader(string $name, string $value): static;

    // directory listing
    public function setBrowseEnabled(bool $enabled): static;

    // MIME
    public function setMimeType(string $extension, string $contentType): static;

    // introspezione
    public function getUrlPrefix(): string;
    public function getRootDirectory(): string;
    public function isLocked(): bool;
}
```

## Costruttore

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| Parametro | Requisiti |
|-----------|-----------|
| `$urlPrefix` | Prefisso URL. Deve iniziare e finire con `/`. Esempio: `"/static/"`. |
| `$rootDirectory` | Path assoluto a una directory su disco; viene canonicalizzato all'attach. |

## Index / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

Nomi file da servire su una richiesta a URL di directory. Default `["index.html"]`. Lista vuota:
disattiva il lookup degli index.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

Equivalente a `setIndexFiles()`.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

Cosa fare se il path richiesto non si risolve in un normale file dentro la root:

| Valore | Comportamento |
|--------|---------------|
| `StaticOnMissing::NOT_FOUND` (default) | 404 in C, la richiesta non entra nella VM PHP |
| `StaticOnMissing::NEXT` | Il controllo torna al dispatcher, viene creata una normale coroutine handler — la richiesta passa a [`addHttpHandler()`](/it/docs/reference/server/http-server.html#addhttphandler) |

## Sidecar precompressi

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

Abilita la consegna di sidecar precompressi (`main.css.br`, `main.css.gz`, `main.css.zst`) quando il
client lo consente via `Accept-Encoding`. Argomenti: nomi di content-coding `"br"`, `"gzip"`,
`"zstd"`. Sconosciuti → `InvalidArgumentException` al setter.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## Sicurezza

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" = qualsiasi segmento di path che inizia con `.`, incluso `..` (quest'ultimo viene comunque
sempre rifiutato dal traversal guard, indipendentemente dalla policy).

| | Comportamento |
|---|---|
| `StaticDotfiles::DENY` (default) | 404 su qualsiasi path con componente dotfile |
| `StaticDotfiles::ALLOW` | i dotfile vengono serviti come normali file |
| `StaticDotfiles::IGNORE` | come se il file non esistesse (passthrough secondo `StaticOnMissing`) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | Comportamento |
|---|---|
| `StaticSymlinks::REJECT` (default) | 404 su qualsiasi symlink sul percorso. `O_NOFOLLOW` + `lstat` per segmento, i symlink non vengono mai traversati |
| `StaticSymlinks::FOLLOW` | i symlink vengono seguiti; il target dopo `realpath()` deve restare dentro la root |
| `StaticSymlinks::OWNER_MATCH` | follow solo se symlink e target hanno lo stesso uid |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Pattern glob: i path che combaciano restituiscono 404 indipendentemente dall'esistenza. Il confronto
è **relativo alla root**, separatore `/`.

## Cache / header

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

Toggle dell'ETag weak (default `true`). Se abilitato, ogni 200 porta `ETag: W/"…"` derivato da
`(mtime_ns, size, ino)`; `If-None-Match` / `If-Modified-Since` producono 304.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

`Cache-Control` letterale. Stringa vuota: sopprime l'emissione.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

Open-file cache stile nginx: conserva path risolto, metadati di fstat, MIME, ETag e Last-Modified
per le ultime N richieste. Entro `ttlSeconds` le richieste ripetute pescano dalla cache e saltano
realpath/stat/MIME-walk.

Disattivata per impostazione predefinita. Conviene su dentry fredde / docroot grandi / FS di rete.
Su dentry calde di un disco locale le syscall sono sotto il µs: l'overhead di lookup in HashTable
annullerebbe il guadagno.

`$maxEntries == 0`: disattiva.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

Zucchero sintattico per `setOpenFileCache(0)`.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

Header fisso, valutato una sola volta all'attach. Emesso su ogni 200 e sui 304 (tranne gli header
`Content-*` per RFC 9110 §15.4.5).

## Directory listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

Toggle del listing HTML sulle richieste a directory senza index. Default `false`.

> Riservato per la PR #6: attualmente no-op, accettato dal setter senza effetto.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

Override del `Content-Type` per i file con l'estensione indicata. Estensione in lowercase, senza
punto iniziale.

## Introspezione

### getUrlPrefix / getRootDirectory

```php
public StaticHandler::getUrlPrefix(): string
public StaticHandler::getRootDirectory(): string
```

### isLocked

```php
public StaticHandler::isLocked(): bool
```

`true` dopo l'attach al server tramite `addStaticHandler()`. Un handler bloccato rifiuta tutti i
setter con una runtime exception.

## Enum

Vedi pagine dedicate:

- [`StaticOnMissing`](/it/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/it/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/it/docs/reference/server/static-symlinks.html)

(Tutti e tre sono `enum: int` nel namespace `TrueAsync`.)

## Esempio

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

## Vedi anche

- [File statici e sendFile](/it/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/it/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/it/docs/reference/server/http-response.html#sendfile)
