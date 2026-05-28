---
layout: docs
lang: es
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /es/docs/server/quickstart.html
page_title: "TrueAsync Server: inicio rápido"
description: "Instalación de TrueAsync Server, ejemplo mínimo Hello World y verificación del funcionamiento. Linux y Windows."
---

# Inicio rápido de TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

En cinco minutos: instalación de la extensión, manejador mínimo y comprobación de la respuesta.

El servidor se distribuye **junto con TrueAsync PHP** en todas las builds preparadas. Si ya tienes
instalado TrueAsync PHP desde el instalador, la imagen Docker o el ZIP de Windows, basta con
activar la extensión en `php.ini`; no hace falta compilar nada. Si en cambio prefieres compilarlo
manualmente desde el código fuente (tu propia versión de PHP, tu propia cadena de dependencias),
consulta la sección [Compilación desde el código fuente](#compilación-desde-el-código-fuente).

## Docker

La forma más rápida de probarlo. La imagen preparada contiene PHP con TrueAsync y la extensión
`true_async_server`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

Etiquetas disponibles:

| Etiqueta | Descripción |
|----------|-------------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, última versión estable |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, ligera |
| `trueasync/php-true-async:0.6.7-php8.6` | Versión específica |

La lista completa de etiquetas y de releases antiguos está en la
[página de descargas](/es/download.html#docker).

## Linux / macOS — instalación mediante script

El script descarga el código fuente, compila TrueAsync PHP junto con la extensión del servidor y
lo deja todo en `~/.php-trueasync/bin/`:

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel; requiere Homebrew)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

Tras la instalación, `php --ri true_async_server` muestra la lista de protocolos y las versiones de
las bibliotecas.

Parámetros (pásalos mediante variables de entorno antes de `bash` o en modo no interactivo):

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

Las opciones y el control de la instalación están descritos en la
[página de descargas](/es/download.html).

## Windows — ZIP

La build preparada de TrueAsync PHP para Windows x64 contiene la extensión del servidor. Descarga
el ZIP de [GitHub Releases](https://github.com/true-async/releases/releases) (un archivo del estilo
`php-trueasync-X.Y.Z-php8.6-windows-x64.zip`), descomprímelo, añade el directorio a `PATH` y
activa la extensión en `php.ini`:

```ini
extension=true_async_server
```

Verificación:

```cmd
php --ri true_async_server
```

> El batching de salida HTTP/3 usa `UDP_SEGMENT` (GSO de Linux); no hay equivalente en Windows.
> El rendimiento de HTTP/3 en Windows es inferior; HTTP/1.1, HTTP/2 y TLS funcionan sin pérdidas.

## Activación de la extensión

En cualquiera de las opciones de instalación hay que añadir a `php.ini`:

```ini
extension=true_async_server
```

Y comprobar:

```bash
php --ri true_async_server
```

La salida muestra los protocolos (HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3) y las versiones en
runtime de OpenSSL, nghttp2, ngtcp2, nghttp3 y libuv.

---

## Compilación desde el código fuente

Si las builds estándar no encajan, se puede compilar a mano.

### Requisitos

| Componente | Mínimo | Para qué | Notas |
|------------|-------:|----------|-------|
| PHP | 8.6 | base | build desde [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | último `main` | event-loop, `udp_bind` para HTTP/3 | |
| OpenSSL | 3.0 (3.5 para HTTP/3) | TLS, HTTP/3 | HTTP/3 requiere la API QUIC TLS de OpenSSL 3.5 |
| `libnghttp2` | 1.57 | HTTP/2 | mínimo por CVE-2023-44487 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | el backend crypto debe ser `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | a través de TrueAsync | base | no se enlaza directamente desde la extensión |
| `llhttp` | 9.3.0 | HTTP/1.1 | vendored en `deps/llhttp/` |

> Los paquetes de distribución de OpenSSL/ngtcp2/nghttp3 suelen ser demasiado antiguos.
> Se recomienda compilar OpenSSL 3.5 + ngtcp2 + nghttp3 desde el código fuente bajo un prefijo
> común (`/usr/local` o `/opt/h3`) e indicarlo en `PKG_CONFIG_PATH` al hacer `./configure`.

### Linux

#### 1. Dependencias

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # para --enable-tests
```

OpenSSL 3.5, ngtcp2 1.22+ y nghttp3 1.15+ no están todavía en los repositorios de la mayoría de
distribuciones, así que los compilamos bajo `/usr/local`:

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

#### 2. Compilación de la extensión

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

HTTP/2 y HTTP/3 se activan automáticamente si están presentes las dependencias
(`libnghttp2 ≥ 1.57` para H2; `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5 para H3).
Para desactivarlos: `--disable-http2`, `--disable-http3`.

Flags adicionales:

| Flag | Efecto |
|------|--------|
| `--enable-tests` | compila los tests unitarios con libcmocka |
| `--enable-coverage` | instrumentación gcov |
| `--without-openssl` | sin TLS (desactiva también HTTP/3) |
| `--enable-brotli` | activar Brotli (autodetección) |
| `--enable-zstd` | activar zstd (autodetección) |

Solo queda activar la extensión en `php.ini` y comprobarla, véase la sección
[Activación de la extensión](#activación-de-la-extensión) más arriba.

### Windows

La compilación se hace mediante el PHP-SDK estándar. Los `.lib` estáticos de OpenSSL 3.5, nghttp2,
ngtcp2 y nghttp3 deben estar disponibles en `deps\` dentro del árbol del PHP-SDK.

```cmd
REM desde el prompt Visual Studio x64 Native Tools
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

El `php_true_async_server.dll` resultante aparece en `x64\Release_TS\` (o `Release\` para NTS).
Cópialo a `ext\` y añade `extension=true_async_server` en `php.ini`.

## Servidor mínimo

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

$server->start();   // bloquea hasta stop()
```

Ejecución:

```bash
php hello.php
```

Comprobación:

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## Siguientes pasos

- [Configuración](/es/docs/server/configuration.html): TLS, timeouts, límites de cuerpo
- [Multi-worker](/es/docs/server/workers.html): `setWorkers(N)` y bootloader
- [Ejemplos](/es/docs/server/examples.html): JSON-API, estáticos, subida multipart, fan-out
- [Referencia de `HttpServer`](/es/docs/reference/server/http-server.html)
