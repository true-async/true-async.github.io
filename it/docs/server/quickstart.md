---
layout: docs
lang: it
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /it/docs/server/quickstart.html
page_title: "TrueAsync Server: avvio rapido"
description: "Installazione di TrueAsync Server, esempio minimo Hello World e verifica del funzionamento. Linux e Windows."
---

# Avvio rapido di TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

In cinque minuti: installazione dell'estensione, handler minimo e verifica della risposta.

Il server viene distribuito **insieme a TrueAsync PHP** in tutti i pacchetti precompilati. Se hai già
TrueAsync PHP installato tramite l'installer, l'immagine Docker o lo ZIP Windows, basta abilitare
l'estensione in `php.ini` — non serve compilare nulla. Se invece vuoi compilarla manualmente dai
sorgenti (versione di PHP personalizzata, propria catena di dipendenze), consulta la sezione
[Compilazione dai sorgenti](#compilazione-dai-sorgenti).

## Docker

Il modo più rapido per provarlo. L'immagine pronta contiene PHP con TrueAsync e l'estensione
`true_async_server`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

Tag disponibili:

| Tag | Descrizione |
|-----|-------------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, ultima release stabile |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, lightweight |
| `trueasync/php-true-async:0.6.7-php8.6` | Versione specifica |

L'elenco completo dei tag e delle release storiche si trova sulla [pagina di download](/it/download.html#docker).

## Linux / macOS — installazione tramite script

Lo script scarica i sorgenti, compila TrueAsync PHP insieme all'estensione server e installa tutto
in `~/.php-trueasync/bin/`:

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel; richiede Homebrew)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

Dopo l'installazione, `php --ri true_async_server` mostrerà l'elenco dei protocolli e le versioni
delle librerie.

Parametri (passali tramite variabili d'ambiente prima di `bash` o in modalità non interattiva):

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

Le opzioni e la gestione dell'installazione sono descritte nella [pagina di download](/it/download.html).

## Windows — ZIP

Il pacchetto precompilato di TrueAsync PHP per Windows x64 contiene l'estensione server. Scarica lo
ZIP dalle [GitHub Releases](https://github.com/true-async/releases/releases) (un file del tipo
`php-trueasync-X.Y.Z-php8.6-windows-x64.zip`), estrailo, aggiungi la cartella al `PATH` e abilita
in `php.ini`:

```ini
extension=true_async_server
```

Verifica:

```cmd
php --ri true_async_server
```

> Il batching in uscita di HTTP/3 usa `UDP_SEGMENT` (GSO di Linux) e su Windows non c'è un equivalente.
> Il throughput HTTP/3 su Windows è più basso; HTTP/1.1, HTTP/2 e TLS funzionano senza penalità.

## Abilitazione dell'estensione

In tutte le varianti di installazione bisogna aggiungere a `php.ini`:

```ini
extension=true_async_server
```

E verificare:

```bash
php --ri true_async_server
```

L'output mostrerà i protocolli (HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3) e le versioni di OpenSSL,
nghttp2, ngtcp2, nghttp3 e libuv usate a runtime.

---

## Compilazione dai sorgenti

Se i pacchetti standard non vanno bene, puoi compilare manualmente.

### Requisiti

| Componente | Minimo | A cosa serve | Note |
|------------|-------:|--------------|------|
| PHP | 8.6 | base | compilazione dai sorgenti di [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | ultimo `main` | event loop, `udp_bind` per HTTP/3 | |
| OpenSSL | 3.0 (3.5 per HTTP/3) | TLS, HTTP/3 | HTTP/3 richiede l'API QUIC TLS di OpenSSL 3.5 |
| `libnghttp2` | 1.57 | HTTP/2 | soglia per CVE-2023-44487 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | il backend crypto deve essere proprio `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | tramite TrueAsync | base | non viene linkata direttamente dall'estensione |
| `llhttp` | 9.3.0 | HTTP/1.1 | vendored in `deps/llhttp/` |

> I pacchetti di distribuzione di OpenSSL/ngtcp2/nghttp3 sono di solito troppo vecchi.
> Si consiglia di compilare OpenSSL 3.5 + ngtcp2 + nghttp3 dai sorgenti in un unico prefix
> (`/usr/local` o `/opt/h3`) e indicarlo in `PKG_CONFIG_PATH` durante `./configure`.

### Linux

#### 1. Dipendenze

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # per --enable-tests
```

OpenSSL 3.5, ngtcp2 1.22+ e nghttp3 1.15+ al momento non sono presenti nei repository della maggior
parte delle distribuzioni, quindi li compiliamo sotto `/usr/local`:

```bash
# OpenSSL 3.5 con QUIC
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2 (backend crypto OpenSSL)
git clone --recursive https://github.com/ngtcp2/ngtcp2
cd ngtcp2 && autoreconf -i \
  && ./configure --prefix=/usr/local --with-openssl --with-libnghttp3 \
                 PKG_CONFIG_PATH=/usr/local/lib/pkgconfig \
  && make -j$(nproc) && sudo make install

# nghttp3
git clone --recursive https://github.com/ngtcp2/nghttp3
cd nghttp3 && autoreconf -i \
  && ./configure --prefix=/usr/local && make -j$(nproc) && sudo make install
```

#### 2. Compilazione dell'estensione

```bash
git clone https://github.com/true-async/server true-async-server
cd true-async-server
phpize
./configure \
    --enable-http-server \
    --with-php-config="$(which php-config)" \
    PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
make -j$(nproc)
sudo make install
```

HTTP/2 e HTTP/3 vengono abilitati automaticamente se sono presenti le dipendenze
(`libnghttp2 ≥ 1.57` per H2; `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5 per H3).
Per disabilitarli: `--disable-http2`, `--disable-http3`.

Flag aggiuntivi:

| Flag | Effetto |
|------|---------|
| `--enable-tests` | compila i test unit con libcmocka |
| `--enable-coverage` | strumentazione gcov |
| `--without-openssl` | senza TLS (disattiva anche HTTP/3) |
| `--enable-brotli` | abilita Brotli (autodetect) |
| `--enable-zstd` | abilita zstd (autodetect) |

Restano solo da abilitare l'estensione in `php.ini` e verificare — vedi la sezione
[Abilitazione dell'estensione](#abilitazione-dellestensione) sopra.

### Windows

Compilazione tramite l'SDK PHP standard. I `.lib` statici per OpenSSL 3.5, nghttp2, ngtcp2, nghttp3
devono essere disponibili in `deps\` all'interno dell'albero del PHP SDK.

```cmd
REM dal prompt Visual Studio x64 Native Tools
phpsdk_buildtree phpdev
git clone https://github.com/true-async/php-src.git
cd php-src
git clone https://github.com/true-async/server ext\true_async_server

buildconf.bat
configure.bat ^
    --disable-all ^
    --enable-cli ^
    --enable-async=shared ^
    --enable-http-server=shared ^
    --with-openssl=shared

nmake
```

Il `php_true_async_server.dll` finito comparirà in `x64\Release_TS\` (o `Release\` per NTS).
Copialo in `ext\` e aggiungi `extension=true_async_server` a `php.ini`.

## Server minimo

```php
<?php
// hello.php

use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/plain')
        ->setBody('Hello, World!');
});

$server->start();   // blocca fino a stop()
```

Avvio:

```bash
php hello.php
```

Verifica:

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## Prossimi passi

- [Configurazione](/it/docs/server/configuration.html): TLS, timeout, limiti del corpo
- [Multi-worker](/it/docs/server/workers.html): `setWorkers(N)` e bootloader
- [Esempi](/it/docs/server/examples.html): API JSON, file statici, upload multipart, fan-out
- [Riferimento `HttpServer`](/it/docs/reference/server/http-server.html)
