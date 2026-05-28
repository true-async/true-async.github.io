---
layout: docs
lang: fr
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /fr/docs/server/compression.html
page_title: "TrueAsync Server : compression HTTP"
description: "gzip, Brotli et zstd dans TrueAsync Server : négociation Accept-Encoding, filtre MIME, limites, protection BREACH, décodage des corps entrants."
---

# Compression HTTP

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server prend en charge trois codecs : **gzip**, **Brotli (br)** et **zstd**, de manière
uniforme dans tous les protocoles : HTTP/1.1, HTTP/2 et HTTP/3.

## Backends

- **gzip** : `zlib-ng` (de préférence, ~2 à 4× plus rapide pour le même niveau de compression) ou
  `zlib` système en fallback. Même code, bascule via macro-shim `zng_*` ↔ `*`.
- **Brotli** : `libbrotli`. Actif uniquement si `--enable-brotli` a trouvé la bibliothèque.
- **zstd** : `libzstd`. Actif uniquement si `--enable-zstd` a trouvé la bibliothèque.

Ce qui est compilé se découvre à l'exécution :

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

La liste contient toujours `"identity"` ; `"gzip"` apparaît en cas de succès de
`--enable-http-compression` ; `"br"` / `"zstd"` apparaissent quand la bibliothèque correspondante
est présente à configure-time.

## Préférence côté serveur

Ordre de préférence du serveur : **`zstd > gzip > brotli > identity`**.

> **Pourquoi gzip devant brotli ?** L'encodeur Brotli ne sait pas réutiliser son état (`libbrotli`
> n'a pas d'API publique de reset). En attendant l'arena allocator (TODO Step 4), le `deflateReset`
> de gzip donne un meilleur défaut. Les clients qui préfèrent explicitement brotli via q-values
> (`br;q=1.0, gzip;q=0.5`) reçoivent toujours brotli.

## Négociation (RFC 9110 §12.5.3)

Le serveur parse le `Accept-Encoding` client : q-values, `identity;q=0`, `*;q=0`. Si l'en-tête est
**absent**, la réponse part sans compression (identity-only). Cela correspond au comportement de
nginx et est plus sûr qu'une lecture stricte de la RFC.

Conditions de **non-compression** :

- statut `1xx`, `204`, `304`
- méthode `HEAD`
- réponse avec `Range`
- le handler a déjà fixé `Content-Encoding`
- MIME hors whitelist
- corps en dessous du seuil

## Configuration

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // master switch (défaut : true)
    ->setCompressionLevel(6)                   // gzip 1..9, défaut 6
    ->setBrotliLevel(4)                        // 0..11, défaut 4
    ->setZstdLevel(3)                          // 1..22, défaut 3
    ->setCompressionMinSize(1024)              // ne pas compresser les corps < 1 KiB
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
    ->setRequestMaxDecompressedSize(10 * 1024 * 1024);  // cap anti zip-bomb
```

### Niveaux de compression

| Codec | Plage | Défaut | Remarques |
|-------|------:|-------:|-----------|
| gzip | 1..9 | 6 | sémantique zlib classique |
| brotli | 0..11 | 4 | quality 11 ≈ 50× plus lent que quality 4 sans gain significatif |
| zstd | 1..22 | 3 | défaut de l'équipe zstd : meilleur ratio et plus rapide que gzip-6 |

### Whitelist MIME

`setCompressionMimeTypes()` **remplace intégralement** la liste (sémantique `gzip_types` de nginx).
Les entrées sont normalisées au setter : les paramètres (`; charset=...`) sont coupés, les espaces
trimmés, tout en minuscule. La comparaison à l'exécution reste exacte et zero-allocation.

### Anti zip-bomb

`setRequestMaxDecompressedSize($bytes)` fixe la limite sur la taille **décodée** du corps entrant.
Par défaut 10 MiB. En cas de dépassement, 413 est renvoyé. `0` désactive la limite, mais il faut
le mettre explicitement : il n'y a pas de chemin implicite-illimité.

## Opt-out par réponse

`HttpResponse::setNoCompression()` prime sur tout (Accept-Encoding, MIME, taille). À utiliser sur :

- les endpoints où des secrets sont mélangés à des entrées utilisateur reflétées (**mitigation BREACH**)
- les payloads avec un `Content-Encoding` déjà positionné (le handler l'a fait lui-même)
- toute réponse que le serveur ne doit pas envelopper

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // contient un token CSRF + une recherche utilisateur reflétée, sensible BREACH
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

La méthode est idempotente.

## Streaming

Quand le handler appelle `HttpResponse::send($chunk)`, le wrapper de compression s'active
transparemment au premier appel (si la négociation l'a permis) et émet **un chunk downstream par
chunk source**, en préservant l'efficacité du framing sur chunked H1 et sur les frames DATA H2.

## Décodage entrant

`Content-Encoding: gzip` / `br` / `zstd` (et le legacy `x-gzip`) sur les requêtes est décodé de
manière transparente. `identity` est un no-op. Coding inconnu → 413/415 (voir ci-dessous).

| Situation | Code |
|-----------|----:|
| Coding inconnu | 415 |
| Cap anti-bomb dépassé | 413 |
| Inflate cassé | 400 |

Dans le handler, le corps déjà décodé est visible via
[`HttpRequest::getBody()`](/fr/docs/reference/server/http-request.html#getbody).

## Brotli one-shot

Depuis 0.6.3 le serveur utilise `BrotliEncoderCompress()` pour les corps de taille connue (size-hint
`BROTLI_PARAM_SIZE_HINT`) : l'encodeur choisit immédiatement la bonne taille de ring-buffer et de
hash-tables au lieu du mode streaming prévu pour une longueur arbitraire. Le chemin streaming reste
en place pour les réponses chunked / unknown-length.

## Benchmarks

Les défauts côté C sont alignés production (gzip 6, brotli 4). Les bench-calls de l'auteur utilisent
`setCompressionLevel(1)` / `setBrotliLevel(1)` pour être équivalents au chemin
`BrotliEncoderCompress` de Swoole.

## Voir aussi

- [`HttpServerConfig::setCompressionEnabled()`](/fr/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/fr/docs/reference/server/http-response.html#setnocompression)
- [Fichiers statiques](/fr/docs/server/static-files.html) : sidecars précompressés (`.br`, `.gz`, `.zst`)
