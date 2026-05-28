---
layout: docs
lang: it
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /it/docs/server/static-files.html
page_title: "TrueAsync Server: file statici e sendFile"
description: "StaticHandler: servizio integrato dei file statici senza handler PHP. sendFile(): invio di un file dall'handler. Sidecar precompressi, ETag, Range, policy di sicurezza."
---

# File statici e sendFile

(PHP 8.6+, true_async_server 0.6+)

In TrueAsync Server ci sono due meccanismi indipendenti per la consegna dei file:

1. **`StaticHandler`**: un mount con prefisso separato, servito **interamente in C**, senza creare
   coroutine e senza entrare nella VM di PHP.
2. **`HttpResponse::sendFile()`**: consegna gestita dall'handler. Il codice PHP decide
   (autorizzazione, ACL, generazione del nome), il server preleva dal disco e invia.

Entrambi usano la stessa FSM del motore (MIME, ETag, IMF-date, Range, GET condizionali,
sidecar precompressi).

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

Le richieste a `/static/...` vengono servite da `StaticHandler` (nessun handler PHP viene invocato).
Tutto il resto passa per il normale `addHttpHandler`.

I mount multipli vengono confrontati **nell'ordine di registrazione**. Dopo l'attach, lo
`StaticHandler` viene bloccato; qualsiasi setter lancia `HttpServerRuntimeException`.

### Index e fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // cosa restituire su URL di directory
    ->disableIndex()                              // oppure niente lookup degli index
    ->setOnMissing(StaticOnMissing::NEXT);        // → passa all'handler PHP
```

**`StaticOnMissing`** definisce cosa fare se il file non viene trovato all'interno della root:

| Valore | Comportamento |
|--------|---------------|
| `NOT_FOUND` (default) | 404 in C, la richiesta non entra nella VM di PHP |
| `NEXT` | Il controllo passa al dispatcher, viene creata una normale coroutine di handler |

> Una richiesta su una URL di directory senza slash finale, per cui tutti i file index restituiscono
> 404, ottiene un 404. Il redirect 301 emesso da nginx/Apache **non** viene generato. Se il tuo
> deploy si basa su un catch-all per i path di directory, disattiva il lookup degli index:
> `setIndexFiles([])` / `disableIndex()`.

### Sidecar precompressi

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

Quando il client invia `Accept-Encoding: br, gzip`, l'handler cerca `main.css.br` accanto a
`main.css` e serve il sidecar direttamente, senza spendere CPU per l'encoding. Nomi supportati:
`"br"`, `"gzip"`, `"zstd"`. Un nome sconosciuto lancia `InvalidArgumentException` sul setter.

### Policy di sicurezza

```php
use TrueAsync\StaticDotfiles;
use TrueAsync\StaticSymlinks;

$static
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setSymlinkPolicy(StaticSymlinks::REJECT)
    ->hide('*.bak', '*.tmp', 'private/**');
```

**`StaticDotfiles`**:

| | Comportamento |
|---|---|
| `DENY` (default) | 404 su qualsiasi path contenente un segmento che inizia con `.` (incluso `..`) |
| `ALLOW` | i dotfile vengono serviti come normali file |
| `IGNORE` | come se il file non esistesse (passthrough secondo `StaticOnMissing`) |

**`StaticSymlinks`**:

| | Comportamento |
|---|---|
| `REJECT` (default) | 404 su qualsiasi symlink sul percorso. `O_NOFOLLOW` + `lstat` per segmento, i symlink non vengono mai traversati |
| `FOLLOW` | i symlink vengono seguiti; dopo `realpath()` la destinazione deve restare dentro la root |
| `OWNER_MATCH` | follow solo se symlink e target appartengono allo stesso uid |

`hide($glob, ...)` definisce pattern glob che producono 404 indipendentemente dall'esistenza del file.
Il confronto è **relativo alla root**, separatore `/`.

### Cache / header

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" da (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Cache di file aperti** (stile nginx): conserva path risolto, metadati di fstat, MIME, ETag,
Last-Modified per le ultime N richieste. Entro `ttlSeconds` le richieste ripetute pescano dalla
cache e saltano realpath/stat/MIME-walk.

Disattivata per impostazione predefinita. Conviene su dentry fredde / docroot di grandi dimensioni /
FS di rete. Su dentry calde di un disco locale le syscall sono comunque sotto il µs, quindi
l'overhead di lookup nella HashTable annullerebbe il guadagno.

### Override MIME

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

Estensione senza punto iniziale, in lowercase.

### Prestazioni

Dal 0.4.0 nel motore:

- **`open(2)`/`fstat(2)` inline** (issue #13): senza futex round-trip attraverso il thread pool di
  libuv. Wins: H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Fast path per file piccoli** (≤ 64 KiB): il file viene caricato in uno `zend_string` e inviato
  con un unico `writev(headers + body)`. Wins: H1 tiny → 103k req/s (×2.9), H2 tiny → 154k (×4.4).
- I file > 64 KiB passano per sendfile.

## sendFile dall'handler

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

`sendFile()` **registra** path + options sulla risposta e **ritorna subito**. Il trasferimento del
file avviene in fase di dispose tramite la stessa FSM di `StaticHandler`. Il middleware di
compressione per sendFile viene bypassato (pipeline di consegna dedicata).

Dopo `sendFile()` la risposta è **sigillata**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` e un altro `sendFile()` lanciano
`HttpServerRuntimeException`.

Il path è considerato **fidato**: l'handler ha già deciso sull'accesso. Gli errori di open/fstat
(`ENOENT`, `EACCES`, oversize, non regolare) producono 500, perché gli header non sono ancora sulla rete.

### SendFileOptions

`final readonly class` con argomenti nominati nel costruttore:

| Campo | Tipo | Default | Cosa fa |
|-------|------|---------|---------|
| `contentType` | `?string` | `null` | override del MIME; `null` significa autodetect dall'estensione |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` o `ATTACHMENT` |
| `downloadName` | `?string` | `null` | nome file per `Content-Disposition: attachment; filename=...` |
| `cacheControl` | `?string` | `null` | letterale in `Cache-Control` |
| `etag` | `bool` | `true` | emette weak ETag |
| `lastModified` | `bool` | `true` | emette `Last-Modified` |
| `acceptRanges` | `bool` | `true` | supporto a `Range:` |
| `precompressed` | `bool` | `true` | cerca sidecar `.br`/`.gz`/`.zst` |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | unlink dopo un invio riuscito (per download one-shot) |
| `status` | `?int` | `null` | override dello stato HTTP (ad esempio per rispondere 200 a un CDN) |

> Il path HTTP/3 per `sendFile()` è ancora in lavorazione: il dispose-hook restituisce 500 su H3.

## Vedi anche

- [`TrueAsync\StaticHandler`](/it/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/it/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/it/docs/reference/server/http-response.html#sendfile)
- [Compressione](/it/docs/server/compression.html)
