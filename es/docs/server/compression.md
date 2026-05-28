---
layout: docs
lang: es
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /es/docs/server/compression.html
page_title: "TrueAsync Server: compresión HTTP"
description: "gzip, Brotli y zstd en TrueAsync Server: negociación Accept-Encoding, filtro MIME, límites, protección BREACH, decodificación de cuerpos entrantes."
---

# Compresión HTTP

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server admite tres codecs: **gzip**, **Brotli (br)** y **zstd**, de forma uniforme en
todos los protocolos: HTTP/1.1, HTTP/2 y HTTP/3.

## Backends

- **gzip**: `zlib-ng` (preferido, ~2–4× más rápido al mismo nivel de compresión) o `zlib` del
  sistema como fallback. El mismo código, conmutado por la capa de macros `zng_*` ↔ `*`.
- **Brotli**: `libbrotli`. Activo solo si `--enable-brotli` encontró la biblioteca.
- **zstd**: `libzstd`. Activo solo si `--enable-zstd` encontró la biblioteca.

Lo que está compilado se consulta en runtime:

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

La lista siempre contiene `"identity"`; `"gzip"` aparece si `--enable-http-compression` funcionó;
`"br"`/`"zstd"` aparecen si la biblioteca correspondiente estaba presente en configure-time.

## Preferencia del lado del servidor

Orden de preferencia del servidor: **`zstd > gzip > brotli > identity`**.

> **¿Por qué gzip por delante de brotli?** El encoder de Brotli no sabe reutilizar estado
> (`libbrotli` no expone una API pública de reset). Hasta que llegue el arena-allocator
> (TODO Step 4), `deflateReset` de gzip da mejor default. Los clientes que prefieran brotli
> explícitamente mediante q-values (`br;q=1.0, gzip;q=0.5`) siguen recibiendo brotli.

## Negociación (RFC 9110 §12.5.3)

El servidor parsea el `Accept-Encoding` del cliente: q-values, `identity;q=0`, `*;q=0`. Si la
cabecera **no está presente**, la respuesta sale sin compresión (solo identity). Esto coincide
con el comportamiento de nginx y es más seguro que una lectura estricta del RFC.

Condiciones para **omitir** la compresión:

- status `1xx`, `204`, `304`
- método `HEAD`
- respuesta con `Range`
- el manejador ya estableció `Content-Encoding`
- MIME fuera de la whitelist
- cuerpo más pequeño que el umbral

## Configuración

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // master switch (default: true)
    ->setCompressionLevel(6)                   // gzip 1..9, default 6
    ->setBrotliLevel(4)                        // 0..11, default 4
    ->setZstdLevel(3)                          // 1..22, default 3
    ->setCompressionMinSize(1024)              // no comprimir cuerpos < 1 KiB
    ->setCompressionMimeTypes([
        'application/javascript',
        'application/json',
        'application/xml',
        'image/svg+xml',
        'text/css',
        'text/html',
        'text/javascript',
        'text/plain',
        'text/xml',
    ])
    ->setRequestMaxDecompressedSize(10 * 1024 * 1024);  // tope anti zip-bomb
```

### Niveles de compresión

| Codec | Rango | Default | Notas |
|-------|------:|--------:|-------|
| gzip | 1..9 | 6 | semántica clásica de zlib |
| brotli | 0..11 | 4 | quality 11 ≈ 50× más lento que quality 4 sin mejora apreciable |
| zstd | 1..22 | 3 | default del propio equipo zstd: mejor ratio y más rápido que gzip-6 |

### Whitelist MIME

`setCompressionMimeTypes()` **reemplaza por completo** la lista (semántica `gzip_types` de nginx).
Las entradas se normalizan en el setter: se eliminan parámetros (`; charset=...`), se hace trim
de espacios y se pasa todo a minúsculas. La comparación en runtime sigue siendo exacta y
zero-allocation.

### Anti zip-bomb

`setRequestMaxDecompressedSize($bytes)` define el límite sobre el tamaño **descomprimido** del
cuerpo entrante. Por defecto 10 MiB. Si se supera se devuelve 413. `0` desactiva el límite, pero
hay que ponerlo de forma explícita: no existe ruta "ilimitada implícita".

## Opt-out por respuesta

`HttpResponse::setNoCompression()` prevalece sobre todo (Accept-Encoding, MIME, tamaño).
Aplícalo en:

- endpoints donde haya secretos mezclados con datos reflejados del usuario (**mitigación BREACH**)
- payloads con `Content-Encoding` ya establecido por el manejador
- cualquier respuesta que el servidor no deba envolver

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // contiene token CSRF + búsqueda reflejada, sensible a BREACH
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

El método es idempotente.

## Streaming

Cuando el manejador llama a `HttpResponse::send($chunk)`, el wrapper de compresión se activa de
forma transparente en la primera llamada (si la negociación lo permitió) y emite **un chunk de
salida por cada chunk de origen**, conservando la eficiencia del framing en chunked H1 y frames
DATA de H2.

## Decodificación entrante

`Content-Encoding: gzip` / `br` / `zstd` (y el legado `x-gzip`) en las solicitudes se decodifican
de forma transparente. `identity` es un no-op. Un coding desconocido → 413/415 (véase abajo).

| Situación | Código |
|-----------|------:|
| Coding desconocido | 415 |
| Tope anti-bomb superado | 413 |
| Inflate corrupto | 400 |

En el manejador, el cuerpo ya decodificado se obtiene mediante
[`HttpRequest::getBody()`](/es/docs/reference/server/http-request.html#getbody).

## Brotli one-shot

Desde 0.6.3 el servidor usa `BrotliEncoderCompress()` para cuerpos de tamaño conocido
(size-hint `BROTLI_PARAM_SIZE_HINT`): el encoder elige directamente el tamaño correcto de
ring-buffer y de las tablas hash, en lugar del modo streaming pensado para longitudes arbitrarias.
La ruta streaming se conserva para respuestas chunked / de longitud desconocida.

## Benchmarks

Los defaults de la parte en C están ajustados para producción (gzip 6, brotli 4). Las invocaciones
de bench del autor usan `setCompressionLevel(1)` / `setBrotliLevel(1)` para equivaler al camino
`BrotliEncoderCompress` de Swoole.

## Véase también

- [`HttpServerConfig::setCompressionEnabled()`](/es/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/es/docs/reference/server/http-response.html#setnocompression)
- [Archivos estáticos](/es/docs/server/static-files.html): sidecars precomprimidos (`.br`, `.gz`, `.zst`)
