---
layout: docs
lang: de
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /de/docs/server/quickstart.html
page_title: "TrueAsync Server: Schnellstart"
description: "Installation von TrueAsync Server, Hello-World-Minimalbeispiel und Funktionstest. Linux und Windows."
---

# Schnellstart TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

In fünf Minuten: Extension installieren, minimalen Handler schreiben und die Antwort prüfen.

Der Server wird **zusammen mit TrueAsync PHP** in allen Fertig-Builds ausgeliefert. Wenn Sie
TrueAsync PHP bereits aus dem Installer, dem Docker-Image oder dem Windows-ZIP installiert haben,
genügt es, die Extension in der `php.ini` zu aktivieren — es muss nichts kompiliert werden.
Möchten Sie selbst aus dem Quellcode bauen (eigene PHP-Version, eigene Dependency-Toolchain),
siehe Abschnitt [Aus dem Quellcode bauen](#aus-dem-quellcode-bauen).

## Docker

Der schnellste Weg zum Ausprobieren. Das fertige Image enthält PHP mit TrueAsync und der Extension
`true_async_server`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

Verfügbare Tags:

| Tag | Beschreibung |
|-----|--------------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, letzter stabiler Release |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, lightweight |
| `trueasync/php-true-async:0.6.7-php8.6` | Konkrete Version |

Die vollständige Liste der Tags und älterer Releases finden Sie auf der [Download-Seite](/de/download.html#docker).

## Linux / macOS — Skriptinstallation

Das Skript lädt den Quellcode herunter, baut TrueAsync PHP zusammen mit der Server-Extension und
legt alles in `~/.php-trueasync/bin/` ab:

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel; Homebrew erforderlich)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

Nach der Installation zeigt `php --ri true_async_server` die Liste der Protokolle und Bibliotheksversionen an.

Parameter (über Umgebungsvariablen vor `bash` oder im non-interactive Modus):

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

Optionen und Installationssteuerung sind auf der [Download-Seite](/de/download.html) beschrieben.

## Windows — ZIP

Der fertige TrueAsync-PHP-Build für Windows x64 enthält die Server-Extension. Laden Sie das ZIP von
den [GitHub Releases](https://github.com/true-async/releases/releases) (Datei der Form
`php-trueasync-X.Y.Z-php8.6-windows-x64.zip`) herunter, entpacken Sie es, fügen Sie das Verzeichnis
zur `PATH` hinzu und aktivieren Sie in der `php.ini`:

```ini
extension=true_async_server
```

Überprüfung:

```cmd
php --ri true_async_server
```

> Das HTTP/3-Outbound-Batching nutzt `UDP_SEGMENT` (Linux GSO); ein Windows-Äquivalent existiert nicht.
> Der HTTP/3-Durchsatz unter Windows ist niedriger; HTTP/1.1, HTTP/2 und TLS funktionieren verlustfrei.

## Extension aktivieren

In allen Installationsvarianten muss in der `php.ini` ergänzt werden:

```ini
extension=true_async_server
```

Und prüfen:

```bash
php --ri true_async_server
```

In der Ausgabe erscheinen die Protokolle (HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3) sowie die
Runtime-Versionen von OpenSSL, nghttp2, ngtcp2, nghttp3 und libuv.

---

## Aus dem Quellcode bauen

Wenn die Standard-Builds nicht passen, kann manuell kompiliert werden.

### Voraussetzungen

| Komponente | Minimum | Wofür | Hinweis |
|------------|--------:|-------|---------|
| PHP | 8.6 | Basis | Build aus [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | latest `main` | Event-Loop, `udp_bind` für HTTP/3 | |
| OpenSSL | 3.0 (3.5 für HTTP/3) | TLS, HTTP/3 | HTTP/3 benötigt die QUIC TLS API aus OpenSSL 3.5 |
| `libnghttp2` | 1.57 | HTTP/2 | Floor für CVE-2023-44487 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | Crypto-Backend genau `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | über TrueAsync | Basis | wird nicht direkt von der Extension gelinkt |
| `llhttp` | 9.3.0 | HTTP/1.1 | vendored in `deps/llhttp/` |

> Distributionspakete von OpenSSL/ngtcp2/nghttp3 sind meist zu alt.
> Empfohlen: OpenSSL 3.5 + ngtcp2 + nghttp3 aus dem Quellcode unter einem gemeinsamen Präfix bauen
> (`/usr/local` oder `/opt/h3`) und es per `PKG_CONFIG_PATH` an `./configure` übergeben.

### Linux

#### 1. Abhängigkeiten

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # für --enable-tests
```

OpenSSL 3.5, ngtcp2 1.22+ und nghttp3 1.15+ sind zum Zeitpunkt der Erstellung in den Repositories
der meisten Distributionen nicht enthalten, daher Build unter `/usr/local`:

```bash
# OpenSSL 3.5 mit QUIC
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2 (OpenSSL crypto Backend)
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

#### 2. Extension bauen

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

HTTP/2 und HTTP/3 werden automatisch aktiviert, sofern die Abhängigkeiten vorhanden sind
(`libnghttp2 ≥ 1.57` für H2; `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5 für H3).
Zum Deaktivieren: `--disable-http2`, `--disable-http3`.

Zusätzliche Flags:

| Flag | Effekt |
|------|--------|
| `--enable-tests` | Unit-Tests mit libcmocka bauen |
| `--enable-coverage` | gcov-Instrumentierung |
| `--without-openssl` | ohne TLS (deaktiviert auch HTTP/3) |
| `--enable-brotli` | Brotli aktivieren (Autodetect) |
| `--enable-zstd` | zstd aktivieren (Autodetect) |

Anschließend genügt es, die Extension in der `php.ini` zu aktivieren und zu prüfen — siehe
Abschnitt [Extension aktivieren](#extension-aktivieren) oben.

### Windows

Build über das Standard-PHP-SDK. Statische `.lib`-Dateien für OpenSSL 3.5, nghttp2, ngtcp2, nghttp3
müssen unter `deps\` im PHP-SDK-Baum verfügbar sein.

```cmd
REM aus Visual Studio x64 Native Tools prompt
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

Die fertige `php_true_async_server.dll` erscheint unter `x64\Release_TS\` (oder `Release\` für NTS).
Kopieren Sie sie nach `ext\` und ergänzen Sie `extension=true_async_server` in der `php.ini`.

## Minimaler Server

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

$server->start();   // blockiert bis stop()
```

Start:

```bash
php hello.php
```

Test:

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## Weiter

- [Konfiguration](/de/docs/server/configuration.html): TLS, Timeouts, Body-Limits
- [Multi-Worker](/de/docs/server/workers.html): `setWorkers(N)` und Bootloader
- [Beispiele](/de/docs/server/examples.html): JSON-API, Statik, Multipart Upload, Fan-Out
- [`HttpServer`-Referenz](/de/docs/reference/server/http-server.html)
