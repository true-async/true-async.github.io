---
layout: docs
lang: en
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /en/docs/server/quickstart.html
page_title: "TrueAsync Server: quick start"
description: "Install TrueAsync Server, a minimal Hello World example, and a sanity check. Linux and Windows."
---

# TrueAsync Server quick start

(PHP 8.6+, true_async_server 0.6+)

Five minutes: install the extension, write a minimal handler, and verify the response.

The server ships **together with TrueAsync PHP** in every pre-built distribution. If you already
have TrueAsync PHP from the installer, a Docker image, or the Windows ZIP, all you need to do is
enable the extension in `php.ini` — nothing to build. If you want to build it from source yourself
(your own PHP, your own dependency chain), see [Building from source](#building-from-source).

## Docker

The fastest way to try it. The pre-built image contains PHP with TrueAsync and the
`true_async_server` extension:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

Available tags:

| Tag | Description |
|-----|-------------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, latest stable release |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, lightweight |
| `trueasync/php-true-async:0.6.7-php8.6` | Specific version |

A full list of tags and old releases is on the [downloads page](/en/download.html#docker).

## Linux / macOS — install via script

The script downloads the sources, builds TrueAsync PHP along with the server extension, and
installs everything into `~/.php-trueasync/bin/`:

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel; requires Homebrew)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

After installation, `php --ri true_async_server` shows the supported protocols and library
versions.

Parameters (pass via environment variables before `bash`, or in non-interactive mode):

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

Available options are described on the [downloads page](/en/download.html).

## Windows — ZIP

The pre-built TrueAsync PHP distribution for Windows x64 includes the server extension.
Download the ZIP from
[GitHub Releases](https://github.com/true-async/releases/releases) (file name like
`php-trueasync-X.Y.Z-php8.6-windows-x64.zip`), extract it, add the directory to `PATH`, and enable
the extension in `php.ini`:

```ini
extension=true_async_server
```

Verify:

```cmd
php --ri true_async_server
```

> HTTP/3 outbound batching uses `UDP_SEGMENT` (Linux GSO); there is no equivalent on Windows.
> HTTP/3 throughput on Windows is lower. HTTP/1.1, HTTP/2, and TLS work without any loss.

## Enabling the extension

For every install method, add this line to `php.ini`:

```ini
extension=true_async_server
```

And verify:

```bash
php --ri true_async_server
```

The output lists the supported protocols (HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3) and the runtime
versions of OpenSSL, nghttp2, ngtcp2, nghttp3, and libuv.

---

## Building from source

If the pre-built distributions do not fit your needs, you can build the extension manually.

### Requirements

| Component | Minimum | Why | Note |
|-----------|--------:|-----|------|
| PHP | 8.6 | base | build from [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | latest `main` | event loop, `udp_bind` for HTTP/3 | |
| OpenSSL | 3.0 (3.5 for HTTP/3) | TLS, HTTP/3 | HTTP/3 requires the QUIC TLS API from OpenSSL 3.5 |
| `libnghttp2` | 1.57 | HTTP/2 | floor for CVE-2023-44487 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | crypto backend must be `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | via TrueAsync | base | not linked directly into the extension |
| `llhttp` | 9.3.0 | HTTP/1.1 | vendored in `deps/llhttp/` |

> Distribution packages of OpenSSL/ngtcp2/nghttp3 are usually too old.
> The recommended approach is to build OpenSSL 3.5 + ngtcp2 + nghttp3 from source under a single
> prefix (`/usr/local` or `/opt/h3`) and point `PKG_CONFIG_PATH` at it during `./configure`.

### Linux

#### 1. Dependencies

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # for --enable-tests
```

OpenSSL 3.5, ngtcp2 1.22+, and nghttp3 1.15+ are not in the repositories of most distributions
at the time of writing, so build them into `/usr/local`:

```bash
# OpenSSL 3.5 with QUIC
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2 (OpenSSL crypto backend)
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

#### 2. Building the extension

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

HTTP/2 and HTTP/3 are enabled automatically when the dependencies are present
(`libnghttp2 ≥ 1.57` for H2; `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5 for H3).
To disable them: `--disable-http2`, `--disable-http3`.

Additional flags:

| Flag | Effect |
|------|--------|
| `--enable-tests` | build unit tests with libcmocka |
| `--enable-coverage` | gcov instrumentation |
| `--without-openssl` | no TLS (also disables HTTP/3) |
| `--enable-brotli` | enable Brotli (autodetect) |
| `--enable-zstd` | enable zstd (autodetect) |

After that, enable the extension in `php.ini` and verify it — see
[Enabling the extension](#enabling-the-extension) above.

### Windows

Build via the standard PHP SDK. Static `.lib` files for OpenSSL 3.5, nghttp2, ngtcp2, and nghttp3
must be available under `deps\` in the PHP SDK tree.

```cmd
REM from a Visual Studio x64 Native Tools prompt
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

The resulting `php_true_async_server.dll` appears in `x64\Release_TS\` (or `Release\` for NTS).
Copy it to `ext\` and add `extension=true_async_server` to `php.ini`.

## Minimal server

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

$server->start();   // blocks until stop()
```

Run:

```bash
php hello.php
```

Verify:

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## Next

- [Configuration](/en/docs/server/configuration.html): TLS, timeouts, body limits
- [Multi-worker](/en/docs/server/workers.html): `setWorkers(N)` and bootloader
- [Examples](/en/docs/server/examples.html): JSON API, static, multipart upload, fan-out
- [`HttpServer` reference](/en/docs/reference/server/http-server.html)
