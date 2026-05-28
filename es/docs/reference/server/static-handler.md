---
layout: docs
lang: es
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /es/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler: servicio de estáticos por prefix-mount sin manejador PHP. Sidecars precomprimidos, ETag, Range, políticas de dotfile/symlink, open-file cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

Handler integrado de archivos estáticos (issue #13). Una instancia = un prefix-mount.
Se acopla al servidor mediante
[`HttpServer::addStaticHandler()`](/es/docs/reference/server/http-server.html#addstatichandler).

Totalmente en C: las solicitudes no spawnean corrutinas ni entran a la VM de PHP. Los archivos se
entregan mediante operaciones async de filesystem de libuv directamente al response-stream.

```php
namespace TrueAsync;

final class StaticHandler
{
    public function __construct(string $urlPrefix, string $rootDirectory);

    // index / fallthrough
    public function setIndexFiles(string ...$files): static;
    public function disableIndex(): static;
    public function setOnMissing(StaticOnMissing $mode): static;

    // sidecars precomprimidos
    public function enablePrecompressed(string ...$encodings): static;
    public function disablePrecompressed(): static;

    // seguridad
    public function setDotfilePolicy(StaticDotfiles $policy): static;
    public function setSymlinkPolicy(StaticSymlinks $policy): static;
    public function hide(string ...$globs): static;

    // caché / cabeceras
    public function setEtagEnabled(bool $enabled): static;
    public function setCacheControl(string $value): static;
    public function setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static;
    public function disableOpenFileCache(): static;
    public function setHeader(string $name, string $value): static;

    // directory listing
    public function setBrowseEnabled(bool $enabled): static;

    // MIME
    public function setMimeType(string $extension, string $contentType): static;

    // introspección
    public function getUrlPrefix(): string;
    public function getRootDirectory(): string;
    public function isLocked(): bool;
}
```

## Constructor

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| Parámetro | Requisitos |
|-----------|------------|
| `$urlPrefix` | Prefijo URL. Debe empezar y terminar por `/`. Ejemplo: `"/static/"`. |
| `$rootDirectory` | Ruta absoluta del directorio en disco; se canonicaliza al acoplar. |

## Index / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

Nombres de archivos a entregar ante una solicitud sobre una URL de directorio. Default
`["index.html"]`. Una lista vacía desactiva el lookup de index.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

Equivalente a `setIndexFiles()`.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

Qué hacer si la ruta solicitada no resuelve a un archivo normal dentro de root:

| Valor | Comportamiento |
|-------|----------------|
| `StaticOnMissing::NOT_FOUND` (default) | 404 en C, la solicitud no entra a la VM de PHP |
| `StaticOnMissing::NEXT` | El control vuelve al dispatcher, se spawnea el manejador-corrutina habitual: la solicitud entra a [`addHttpHandler()`](/es/docs/reference/server/http-server.html#addhttphandler) |

## Sidecars precomprimidos

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

Activa la entrega de sidecars precomprimidos (`main.css.br`, `main.css.gz`, `main.css.zst`)
cuando el cliente lo permite mediante `Accept-Encoding`. Argumentos: nombres de content-coding
`"br"`, `"gzip"`, `"zstd"`. Desconocidos: `InvalidArgumentException` en el setter.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## Seguridad

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" es cualquier path-segment que empieza por `.`, incluido `..` (este último siempre lo
rechaza el guard contra traversal, sea cual sea la política).

| | Comportamiento |
|---|---|
| `StaticDotfiles::DENY` (default) | 404 ante cualquier ruta con un dotfile-componente |
| `StaticDotfiles::ALLOW` | los dotfiles se sirven como archivos normales |
| `StaticDotfiles::IGNORE` | como si el archivo no existiera (passthrough según `StaticOnMissing`) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | Comportamiento |
|---|---|
| `StaticSymlinks::REJECT` (default) | 404 ante cualquier symlink en la ruta. `O_NOFOLLOW` + `lstat` por segmento, el symlink nunca se atraviesa |
| `StaticSymlinks::FOLLOW` | los symlinks se siguen; el target post `realpath()` debe permanecer dentro de root |
| `StaticSymlinks::OWNER_MATCH` | se sigue solo si symlink y target pertenecen al mismo uid |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Patrones glob: las rutas que coincidan devuelven 404 con independencia de su existencia.
Comparación **relativa a root**, separador `/`.

## Caché / cabeceras

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

Toggle weak ETag (default `true`). Si está activo, cada 200 lleva `ETag: W/"…"` derivado de
`(mtime_ns, size, ino)`; `If-None-Match` / `If-Modified-Since` dan 304.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

`Cache-Control` literal. Cadena vacía: no se emite.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

Open-file cache estilo nginx: guarda la ruta resuelta, los metadatos fstat, MIME, ETag y
Last-Modified de las últimas N solicitudes. Dentro de `ttlSeconds` las solicitudes repetidas
golpean la caché y se saltan realpath/stat/MIME-walk.

Desactivada por defecto. Aporta valor con dentry frío / docroot grande / sistemas de archivos en
red. Con dentry caliente en disco local las syscalls ya están por debajo de µs y el overhead
del lookup HashTable se come la ganancia.

`$maxEntries == 0` la desactiva.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

Azúcar para `setOpenFileCache(0)`.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

Cabecera fija, evaluada una vez al acoplar. Se emite en cada 200 y en cada 304 (salvo las
cabeceras `Content-*` según RFC 9110 §15.4.5).

## Directory listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

Toggle del listing HTML ante una solicitud sobre un directorio sin index. Default `false`.

> Reservado para el PR #6: por ahora no-op, se acepta en el setter sin efecto.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

Override del `Content-Type` para archivos con la extensión indicada. Extensión en minúsculas, sin
punto inicial.

## Introspección

### getUrlPrefix / getRootDirectory

```php
public StaticHandler::getUrlPrefix(): string
public StaticHandler::getRootDirectory(): string
```

### isLocked

```php
public StaticHandler::isLocked(): bool
```

`true` tras acoplar al servidor mediante `addStaticHandler()`. Un handler bloqueado rechaza todos
los setters con una runtime-exception.

## Enums

Véanse las páginas dedicadas:

- [`StaticOnMissing`](/es/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/es/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/es/docs/reference/server/static-symlinks.html)

(Los tres son `enum: int` bajo el namespace `TrueAsync`.)

## Ejemplo

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

## Véase también

- [Archivos estáticos y sendFile](/es/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/es/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/es/docs/reference/server/http-response.html#sendfile)
