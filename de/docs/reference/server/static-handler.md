---
layout: docs
lang: de
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /de/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler — Ausliefern statischer Dateien per Prefix-Mount ohne PHP-Handler. Precompressed Sidecars, ETag, Range, Dotfile/Symlink-Policies, Open-File-Cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

Integrierter Handler für statische Dateien (Issue #13). Eine Instanz = ein Prefix-Mount.
Wird über [`HttpServer::addStaticHandler()`](/de/docs/reference/server/http-server.html#addstatichandler)
am Server angeheftet.

Vollständig in C: Anfragen spawnen keine Coroutine und treten nicht in die PHP-VM ein — Dateien
werden über libuv-Async-FS-Ops direkt in den Response-Stream gegeben.

```php
namespace TrueAsync;

final class StaticHandler
{
    public function __construct(string $urlPrefix, string $rootDirectory);

    // index / fallthrough
    public function setIndexFiles(string ...$files): static;
    public function disableIndex(): static;
    public function setOnMissing(StaticOnMissing $mode): static;

    // precompressed sidecars
    public function enablePrecompressed(string ...$encodings): static;
    public function disablePrecompressed(): static;

    // security
    public function setDotfilePolicy(StaticDotfiles $policy): static;
    public function setSymlinkPolicy(StaticSymlinks $policy): static;
    public function hide(string ...$globs): static;

    // cache / headers
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

## Konstruktor

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| Parameter | Anforderungen |
|-----------|---------------|
| `$urlPrefix` | URL-Präfix. Muss mit `/` beginnen und enden. Beispiel: `"/static/"`. |
| `$rootDirectory` | Absoluter Pfad zum Verzeichnis auf der Disk; wird beim Attach kanonikalisiert. |

## Index / Fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

Dateinamen, die bei Anfragen auf eine Directory-URL ausgeliefert werden. Default `["index.html"]`.
Leere Liste — deaktiviert das Index-Lookup.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

Äquivalent zu `setIndexFiles()`.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

Was passiert, wenn der angefragte Pfad nicht in eine reguläre Datei innerhalb von Root aufgelöst wird:

| Wert | Verhalten |
|------|-----------|
| `StaticOnMissing::NOT_FOUND` (Default) | 404 in C, die Anfrage erreicht die PHP-VM nicht |
| `StaticOnMissing::NEXT` | Control geht an den Dispatcher zurück, eine reguläre Handler-Coroutine wird gespawnt — die Anfrage geht in [`addHttpHandler()`](/de/docs/reference/server/http-server.html#addhttphandler) |

## Precompressed Sidecars

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

Aktiviert die Auslieferung von Precompressed-Sidecars (`main.css.br`, `main.css.gz`, `main.css.zst`),
wenn der Client es per `Accept-Encoding` zulässt. Argumente — Content-Coding-Namen: `"br"`, `"gzip"`,
`"zstd"`. Unbekannte — `InvalidArgumentException` im Setter.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## Security

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" — jedes Pfadsegment, das mit `.` beginnt, inklusive `..` (letzteres wird unabhängig von
der Policy immer vom Traversal-Guard abgelehnt).

| | Verhalten |
|---|---|
| `StaticDotfiles::DENY` (Default) | 404 auf jeden Pfad mit Dotfile-Komponente |
| `StaticDotfiles::ALLOW` | Dotfiles werden wie reguläre Dateien ausgeliefert |
| `StaticDotfiles::IGNORE` | als ob die Datei nicht existiert (Passthrough gemäß `StaticOnMissing`) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | Verhalten |
|---|---|
| `StaticSymlinks::REJECT` (Default) | 404 auf jeden Symlink im Pfad. `O_NOFOLLOW` + Per-Segment-`lstat` — Symlinks werden nie traversiert |
| `StaticSymlinks::FOLLOW` | Symlinks werden gefolgt; das Post-`realpath()`-Target muss innerhalb von Root bleiben |
| `StaticSymlinks::OWNER_MATCH` | Folgen nur, wenn Symlink und Target derselben uid gehören |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Glob-Patterns: passende Pfade liefern 404 unabhängig von der Existenz. Vergleich — **relativ zu Root**,
Trenner `/`.

## Cache / Header

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

Weak-ETag-Toggle (Default `true`). Bei Aktivierung trägt jede 200 einen `ETag: W/"…"` aus
`(mtime_ns, size, ino)`; `If-None-Match` / `If-Modified-Since` ergeben 304.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

Wörtlicher `Cache-Control`. Leerer String — Emission unterdrücken.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

nginx-Stil Open-File-Cache: speichert Resolved Path, fstat-Metadaten, MIME, ETag und Last-Modified
für die letzten N Anfragen. Innerhalb von `ttlSeconds` treffen wiederholte Anfragen den Cache und
überspringen realpath/stat/MIME-Walk.

Standardmäßig deaktiviert. Lohnt sich bei kaltem Dentry / großem docroot / Netzwerk-FS. Bei warmem
Dentry auf lokaler Disk liegen die Syscalls ohnehin im µs-Bereich — der HashTable-Lookup-Overhead
frisst den Gewinn auf.

`$maxEntries == 0` — deaktivieren.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

Syntactic Sugar für `setOpenFileCache(0)`.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

Fester Header, der einmalig beim Attach evaluiert wird. Wird auf jeder 200 und 304 emittiert (außer
`Content-*`-Headern gemäß RFC 9110 §15.4.5).

## Directory Listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

HTML-Listing-Toggle bei Anfragen auf ein Directory ohne Index. Default `false`.

> Reserviert für PR #6 — aktuell No-op, wird im Setter akzeptiert, ohne Effekt.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

`Content-Type`-Override für Dateien mit angegebener Endung. Extension — lowercase, ohne führenden Punkt.

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

`true` nach dem Attach am Server über `addStaticHandler()`. Ein locked Handler verweigert jeden
Setter mit einer Runtime-Exception.

## Enums

Siehe eigene Seiten:

- [`StaticOnMissing`](/de/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/de/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/de/docs/reference/server/static-symlinks.html)

(Alle drei — `enum: int` im Namespace `TrueAsync`.)

## Beispiel

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

## Siehe auch

- [Statische Dateien und sendFile](/de/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/de/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/de/docs/reference/server/http-response.html#sendfile)
