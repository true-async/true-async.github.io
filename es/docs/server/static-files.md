---
layout: docs
lang: es
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /es/docs/server/static-files.html
page_title: "TrueAsync Server: archivos estáticos y sendFile"
description: "StaticHandler: servicio integrado de estáticos sin manejador PHP. sendFile(): envío de un archivo desde el handler. Sidecars precomprimidos, ETag, Range, políticas de seguridad."
---

# Archivos estáticos y sendFile

(PHP 8.6+, true_async_server 0.6+)

En TrueAsync Server hay dos mecanismos independientes para servir archivos:

1. **`StaticHandler`**: prefix-mount aparte, atendido **completamente en C**, sin spawn de
   corrutina y sin entrar a la VM de PHP.
2. **`HttpResponse::sendFile()`**: entrega controlada por el handler. El código PHP tomó la
   decisión (auth, ACL, generación de nombre); el servidor lee del disco y envía.

Ambos comparten la misma FSM del motor (MIME, ETag, IMF-date, Range, GET condicional, sidecars
precomprimidos).

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

Las solicitudes a `/static/...` las atiende el `StaticHandler` (no se invoca ningún manejador PHP).
Todo lo demás va al `addHttpHandler` habitual.

Los mounts múltiples se evalúan **en orden de registro**. Tras el attach el `StaticHandler` queda
bloqueado; cualquier setter sobre él lanza `HttpServerRuntimeException`.

### Index y fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // qué servir en la URL de directorio
    ->disableIndex()                              // o bien sin lookup de index
    ->setOnMissing(StaticOnMissing::NEXT);        // → entregar al handler PHP
```

**`StaticOnMissing`** define qué hacer si el archivo no se encuentra dentro de root:

| Valor | Comportamiento |
|-------|----------------|
| `NOT_FOUND` (default) | 404 en C, la solicitud no entra a la VM de PHP |
| `NEXT` | El control pasa al dispatcher, se spawnea el manejador-corrutina habitual |

> Una solicitud a una URL de directorio sin trailing slash, en la que todos los archivos de index
> dan 404, devuelve 404. El redirect 301 que hacen nginx/Apache este handler **no** lo emite. Si
> tu despliegue depende de un catch-all sobre rutas de directorio, desactiva el lookup de index:
> `setIndexFiles([])` / `disableIndex()`.

### Sidecars precomprimidos

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

Cuando el cliente envía `Accept-Encoding: br, gzip`, el handler busca `main.css.br` junto a
`main.css` y entrega el sidecar directamente, sin gasto de CPU para codificar. Nombres admitidos:
`"br"`, `"gzip"`, `"zstd"`. Un nombre desconocido lanza `InvalidArgumentException` en el setter.

### Políticas de seguridad

```php
use TrueAsync\StaticDotfiles;
use TrueAsync\StaticSymlinks;

$static
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setSymlinkPolicy(StaticSymlinks::REJECT)
    ->hide('*.bak', '*.tmp', 'private/**');
```

**`StaticDotfiles`**:

| | Comportamiento |
|---|---|
| `DENY` (default) | 404 ante cualquier ruta con un segmento que empieza por `.` (incluido `..`) |
| `ALLOW` | los dotfiles se sirven como archivos normales |
| `IGNORE` | como si el archivo no existiera (passthrough según `StaticOnMissing`) |

**`StaticSymlinks`**:

| | Comportamiento |
|---|---|
| `REJECT` (default) | 404 ante cualquier symlink en la ruta. `O_NOFOLLOW` + `lstat` por segmento, el symlink nunca se atraviesa |
| `FOLLOW` | los symlinks se siguen; el target post `realpath()` debe permanecer dentro de root |
| `OWNER_MATCH` | se sigue solo si symlink y target pertenecen al mismo uid |

`hide($glob, ...)` define globs para devolver 404 con independencia de la existencia del archivo.
La comparación es **relativa a root**, con separador `/`.

### Caché / cabeceras

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" a partir de (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-file cache** (estilo nginx): guarda la ruta resuelta, los metadatos fstat, MIME, ETag y
Last-Modified para las últimas N solicitudes. Dentro de `ttlSeconds`, las solicitudes repetidas
golpean la caché y se saltan realpath/stat/walk del MIME.

Desactivada por defecto. Aporta valor con dentry frío / docroot grande / sistemas de archivos en
red. Sobre un dentry caliente en disco local las syscalls ya están por debajo de µs, así que el
overhead del lookup HashTable se come la ganancia.

### Override de MIME

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

Extensión sin el punto inicial, en minúsculas.

### Rendimiento

Desde 0.4.0 en el motor:

- **`open(2)`/`fstat(2)` inline** (issue #13): sin futex-round-trip a través del thread pool de
  libuv. Mejoras: H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Fast path para archivos pequeños** (≤ 64 KiB): el archivo se vuelca a un `zend_string` y se
  manda en un único `writev(headers + body)`. Mejoras: H1 tiny → 103k req/s (×2.9), H2 tiny →
  154k (×4.4).
- Los archivos > 64 KiB van por sendfile.

## sendFile desde el handler

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

`sendFile()` **registra** la ruta + opciones en la respuesta y **regresa de inmediato**. La
entrega del archivo se realiza en la fase de dispose mediante la misma FSM que `StaticHandler`.
El middleware de compresión se omite para sendFile (pipeline de entrega propia).

Tras `sendFile()` la respuesta queda **sellada**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` y otro `sendFile()` lanzan
`HttpServerRuntimeException`.

La ruta se considera **de confianza**: el handler ya decidió sobre el acceso. Los errores de
open/fstat (`ENOENT`, `EACCES`, oversize, no-regular) producen 500, porque las cabeceras todavía
no están en el cable.

### SendFileOptions

`final readonly class` con argumentos nombrados en el constructor:

| Campo | Tipo | Default | Qué hace |
|-------|------|---------|----------|
| `contentType` | `?string` | `null` | override de MIME; `null` significa auto desde la extensión |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` o `ATTACHMENT` |
| `downloadName` | `?string` | `null` | nombre de archivo para `Content-Disposition: attachment; filename=...` |
| `cacheControl` | `?string` | `null` | literal en `Cache-Control` |
| `etag` | `bool` | `true` | emitir weak ETag |
| `lastModified` | `bool` | `true` | emitir `Last-Modified` |
| `acceptRanges` | `bool` | `true` | soporte de `Range:` |
| `precompressed` | `bool` | `true` | buscar sidecar `.br`/`.gz`/`.zst` |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | unlink tras el envío correcto (descargas one-shot) |
| `status` | `?int` | `null` | override del status HTTP (por ejemplo, para responder con 200 desde CDN) |

> La ruta HTTP/3 para `sendFile()` está aún en desarrollo: el dispose-hook devuelve 500 en H3.

## Véase también

- [`TrueAsync\StaticHandler`](/es/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/es/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/es/docs/reference/server/http-response.html#sendfile)
- [Compresión](/es/docs/server/compression.html)
