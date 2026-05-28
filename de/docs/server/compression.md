---
layout: docs
lang: de
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /de/docs/server/compression.html
page_title: "TrueAsync Server: HTTP-Komprimierung"
description: "gzip, Brotli und zstd im TrueAsync Server: Accept-Encoding-Aushandlung, MIME-Filter, Limits, BREACH-Schutz, Decoding eingehender Bodies."
---

# HTTP-Komprimierung

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server unterstützt drei Codecs: **gzip**, **Brotli (br)** und **zstd**, einheitlich über
alle Protokolle hinweg: HTTP/1.1, HTTP/2 und HTTP/3.

## Backends

- **gzip** — `zlib-ng` (bevorzugt, ~2–4× schneller bei gleichem Compression Level) oder das System-`zlib`
  als Fallback. Derselbe Code, Umschaltung über die Makro-Schicht `zng_*` ↔ `*`.
- **Brotli** — `libbrotli`. Nur aktiv, wenn `--enable-brotli` die Bibliothek gefunden hat.
- **zstd** — `libzstd`. Nur aktiv, wenn `--enable-zstd` die Bibliothek gefunden hat.

Was hineinkompiliert wurde, ist zur Laufzeit abfragbar:

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

Die Liste enthält stets `"identity"`; `"gzip"` erscheint bei erfolgreichem `--enable-http-compression`;
`"br"`/`"zstd"` erscheinen, wenn die jeweilige Bibliothek zur Configure-Zeit vorhanden war.

## Serverseitige Präferenz

Server-Präferenzreihenfolge: **`zstd > gzip > brotli > identity`**.

> **Warum steht gzip vor brotli?** Der Brotli-Encoder kann Zustand nicht wiederverwenden
> (`libbrotli` hat keine öffentliche Reset-API). Bis ein Arena-Allokator kommt (TODO Step 4),
> liefert das `deflateReset` von gzip den besseren Default. Clients, die brotli per q-values
> explizit bevorzugen (`br;q=1.0, gzip;q=0.5`), bekommen weiterhin brotli.

## Aushandlung (RFC 9110 §12.5.3)

Der Server parst den Client-`Accept-Encoding`: q-values, `identity;q=0`, `*;q=0`. Fehlt der Header
**komplett**, geht die Antwort ohne Komprimierung raus (identity-only). Das entspricht dem
nginx-Verhalten und ist sicherer als die strenge RFC-Lesart.

Bedingungen, unter denen Komprimierung **übersprungen** wird:

- Status `1xx`, `204`, `304`
- Methode `HEAD`
- Antwort mit `Range`
- Handler hat selbst `Content-Encoding` gesetzt
- MIME außerhalb der Whitelist
- Body kleiner als der Schwellwert

## Konfiguration

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // Master Switch (Default: true)
    ->setCompressionLevel(6)                   // gzip 1..9, Default 6
    ->setBrotliLevel(4)                        // 0..11, Default 4
    ->setZstdLevel(3)                          // 1..22, Default 3
    ->setCompressionMinSize(1024)              // Bodies < 1 KiB nicht komprimieren
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
    ->setRequestMaxDecompressedSize(10 * 1024 * 1024);  // Anti-Zip-Bomb-Cap
```

### Kompressionsstufen

| Codec | Bereich | Default | Anmerkungen |
|-------|--------:|--------:|-------------|
| gzip | 1..9 | 6 | klassische zlib-Semantik |
| brotli | 0..11 | 4 | Quality 11 ≈ 50× langsamer als Quality 4 ohne nennenswerten Gewinn |
| zstd | 1..22 | 3 | Default des zstd-Tools: bestes Verhältnis und schneller als gzip-6 |

### MIME-Whitelist

`setCompressionMimeTypes()` **ersetzt die Liste vollständig** (nginx `gzip_types`-Semantik).
Einträge werden zum Setter-Zeitpunkt normalisiert: Parameter (`; charset=...`) entfernt, Whitespace
getrimmt, alles in lowercase. Der Runtime-Vergleich bleibt exakt und ohne Allokation.

### Anti-Zip-Bomb

`setRequestMaxDecompressedSize($bytes)` legt das Limit auf den **dekodierten** Umfang des eingehenden
Bodys fest. Default 10 MiB. Bei Überschreitung wird 413 zurückgegeben. `0` deaktiviert das Limit,
muss aber explizit gesetzt werden: einen impliziten unlimited-Pfad gibt es nicht.

## Per-Response-Opt-out

`HttpResponse::setNoCompression()` überschreibt alles (Accept-Encoding, MIME, Size). Anwenden bei:

- Endpoints, an denen Secrets mit reflektiertem User-Input gemischt sind (**BREACH-Mitigation**)
- Payloads, bei denen bereits `Content-Encoding` gesetzt wurde (Handler hat selbst gepackt)
- jeglichen Antworten, die der Server nicht wrappen soll

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // enthält CSRF-Token + reflektierte Suchabfrage, BREACH-sensibel
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

Die Methode ist idempotent.

## Streaming

Wenn der Handler `HttpResponse::send($chunk)` aufruft, wird der Komprimierungs-Wrapper beim ersten
Aufruf transparent eingeschaltet (sofern die Aushandlung es erlaubt) und liefert **einen Downstream-Chunk
pro Source-Chunk** — so bleibt die Framing-Effizienz für H1 Chunked und H2 DATA-Frames erhalten.

## Eingehendes Decoding

`Content-Encoding: gzip` / `br` / `zstd` (und das Legacy-`x-gzip`) wird auf Anfragen transparent
dekodiert. `identity` ist ein No-op. Unbekanntes Coding → 413/415 (siehe unten).

| Situation | Code |
|-----------|-----:|
| Unbekanntes Coding | 415 |
| Anti-Bomb-Cap überschritten | 413 |
| Defekter Inflate | 400 |

Im Handler ist der bereits dekodierte Body über
[`HttpRequest::getBody()`](/de/docs/reference/server/http-request.html#getbody) sichtbar.

## One-Shot Brotli

Seit 0.6.3 verwendet der Server `BrotliEncoderCompress()` für Bodies bekannter Größe (Size-Hint
`BROTLI_PARAM_SIZE_HINT`): Der Encoder wählt sofort die passende Ring-Buffer- und Hash-Tabellen-Größe,
statt den auf beliebige Länge ausgelegten Streaming-Modus zu nutzen. Der Streaming-Pfad bleibt für
chunked / unbekannte Längen erhalten.

## Benchmarks

Die C-seitigen Defaults sind auf Produktion ausgelegt (gzip 6, brotli 4). Die Bench-Aufrufe des Autors
verwenden `setCompressionLevel(1)` / `setBrotliLevel(1)` für Äquivalenz mit Swooles
`BrotliEncoderCompress`-Pfad.

## Siehe auch

- [`HttpServerConfig::setCompressionEnabled()`](/de/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/de/docs/reference/server/http-response.html#setnocompression)
- [Statische Dateien](/de/docs/server/static-files.html): precompressed Sidecars (`.br`, `.gz`, `.zst`)
