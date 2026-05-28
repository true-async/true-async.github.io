---
layout: docs
lang: it
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /it/docs/server/compression.html
page_title: "TrueAsync Server: compressione HTTP"
description: "gzip, Brotli e zstd in TrueAsync Server: negoziazione Accept-Encoding, filtro MIME, limiti, protezione BREACH, decodifica dei corpi in ingresso."
---

# Compressione HTTP

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server supporta tre codec: **gzip**, **Brotli (br)** e **zstd**, in modo uniforme su tutti
i protocolli: HTTP/1.1, HTTP/2 e HTTP/3.

## Backend

- **gzip**: `zlib-ng` (preferito, circa 2–4× più veloce allo stesso livello di compressione) o lo
  `zlib` di sistema come fallback. Stesso codice, passaggio tra `zng_*` ↔ `*` tramite uno strato di macro.
- **Brotli**: `libbrotli`. Attivo solo se `--enable-brotli` ha trovato la libreria.
- **zstd**: `libzstd`. Attivo solo se `--enable-zstd` ha trovato la libreria.

Cosa è compilato si verifica a runtime:

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

L'elenco contiene sempre `"identity"`; `"gzip"` compare con `--enable-http-compression` riuscito;
`"br"`/`"zstd"` compaiono se la libreria corrispondente era disponibile in fase di configure.

## Preferenze del server

Ordine di preferenza del server: **`zstd > gzip > brotli > identity`**.

> **Perché gzip prima di brotli?** L'encoder Brotli non sa riutilizzare lo stato (`libbrotli` non
> espone un'API pubblica di reset). Finché non arriva un'allocatore arena (TODO Step 4), il
> `deflateReset` di gzip dà il miglior default. I client che preferiscono esplicitamente brotli
> tramite q-values (`br;q=1.0, gzip;q=0.5`) ricevono comunque brotli.

## Negoziazione (RFC 9110 §12.5.3)

Il server analizza il `Accept-Encoding` del client: q-values, `identity;q=0`, `*;q=0`. Se l'header è
**assente**, la risposta viene inviata senza compressione (solo identity). Questo coincide con il
comportamento di nginx ed è più sicuro di un'interpretazione rigida dell'RFC.

Condizioni che fanno **saltare** la compressione:

- stato `1xx`, `204`, `304`
- metodo `HEAD`
- risposta con `Range`
- l'handler ha impostato manualmente `Content-Encoding`
- MIME fuori dalla whitelist
- corpo più piccolo della soglia

## Configurazione

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // interruttore principale (default: true)
    ->setCompressionLevel(6)                   // gzip 1..9, default 6
    ->setBrotliLevel(4)                        // 0..11, default 4
    ->setZstdLevel(3)                          // 1..22, default 3
    ->setCompressionMinSize(1024)              // non comprimere corpi < 1 KiB
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
    ->setRequestMaxDecompressedSize(10 * 1024 * 1024);  // tetto anti zip-bomb
```

### Livelli di compressione

| Codec | Intervallo | Default | Note |
|-------|-----------:|--------:|------|
| gzip | 1..9 | 6 | semantica zlib classica |
| brotli | 0..11 | 4 | quality 11 ≈ 50× più lento di quality 4 senza guadagno sostanziale |
| zstd | 1..22 | 3 | default consigliato dal team di zstd: miglior rapporto e più veloce di gzip-6 |

### Whitelist MIME

`setCompressionMimeTypes()` **sostituisce completamente** la lista (semantica `gzip_types` di nginx).
Le voci vengono normalizzate al momento del set: i parametri (`; charset=...`) vengono tagliati,
gli spazi rimossi, tutto in lowercase. Il confronto a runtime resta esatto e zero-allocation.

### Anti zip-bomb

`setRequestMaxDecompressedSize($bytes)` impone un limite sulla dimensione **decompressa** del corpo
in ingresso. Predefinito 10 MiB. Al superamento si restituisce 413. `0` disattiva il limite, ma va
impostato esplicitamente: non esiste un percorso implicito illimitato.

## Disattivazione per singola risposta

`HttpResponse::setNoCompression()` ha la precedenza su tutto (Accept-Encoding, MIME, dimensione).
Da usare su:

- endpoint dove segreti si mescolano con input riflesso dall'utente (**mitigazione BREACH**)
- payload con `Content-Encoding` già impostato (l'handler ha già provveduto)
- qualsiasi risposta che il server non deve incapsulare

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // contiene token CSRF + query di ricerca riflessa, sensibile a BREACH
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

Il metodo è idempotente.

## Streaming

Quando l'handler chiama `HttpResponse::send($chunk)`, il wrapper di compressione si attiva in modo
trasparente alla prima chiamata (se la negoziazione lo consente) e produce **un blocco in uscita per
ciascun blocco in ingresso**, mantenendo l'efficienza del framing su H1 chunked e sui frame DATA di H2.

## Decodifica in ingresso

`Content-Encoding: gzip` / `br` / `zstd` (e il legacy `x-gzip`) sulle richieste viene decodificato in
modo trasparente. `identity` è un no-op. Codifiche sconosciute → 413/415 (vedi sotto).

| Situazione | Codice |
|------------|-------:|
| Codifica sconosciuta | 415 |
| Superato il tetto anti-bomb | 413 |
| Inflate corrotto | 400 |

Nell'handler il corpo già decodificato è visibile tramite
[`HttpRequest::getBody()`](/it/docs/reference/server/http-request.html#getbody).

## Brotli one-shot

A partire da 0.6.3 il server usa `BrotliEncoderCompress()` per i corpi di dimensione nota
(size-hint `BROTLI_PARAM_SIZE_HINT`): l'encoder seleziona subito le dimensioni corrette di
ring-buffer e tabelle hash invece di restare nella modalità streaming pensata per lunghezze
arbitrarie. Il percorso streaming resta per le risposte chunked / di lunghezza ignota.

## Benchmark

I default lato C sono impostati per la produzione (gzip 6, brotli 4). Nei benchmark dell'autore si
usa `setCompressionLevel(1)` / `setBrotliLevel(1)` per confrontare in modo equo con il percorso
`BrotliEncoderCompress` di Swoole.

## Vedi anche

- [`HttpServerConfig::setCompressionEnabled()`](/it/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/it/docs/reference/server/http-response.html#setnocompression)
- [File statici](/it/docs/server/static-files.html): sidecar precompressi (`.br`, `.gz`, `.zst`)
