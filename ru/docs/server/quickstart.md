---
layout: docs
lang: ru
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /ru/docs/server/quickstart.html
page_title: "TrueAsync Server: быстрый старт"
description: "Установка TrueAsync Server, минимальный пример Hello World и проверка работы. Linux и Windows."
---

# Быстрый старт TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

За пять минут: установка расширения, минимальный обработчик и проверка ответа.

Сервер поставляется **вместе с TrueAsync PHP** во всех готовых сборках. Если у вас уже стоит
TrueAsync PHP из инсталлятора, Docker-образа или Windows ZIP, достаточно включить расширение в
`php.ini` — собирать ничего не нужно. Если же вы хотите собрать его руками из исходников
(своя версия PHP, своя цепочка зависимостей), см. раздел [Сборка из исходников](#сборка-из-исходников).

## Docker

Самый быстрый способ попробовать. Готовый образ содержит PHP с TrueAsync и расширением
`true_async_server`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

Доступные теги:

| Тег | Описание |
|-----|----------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, последний стабильный релиз |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, lightweight |
| `trueasync/php-true-async:0.6.7-php8.6` | Конкретная версия |

Полный список тегов и старых релизов см. на [странице загрузки](/ru/download.html#docker).

## Linux / macOS — установка скриптом

Скрипт скачивает исходники, собирает TrueAsync PHP вместе с расширением сервера и кладёт всё
в `~/.php-trueasync/bin/`:

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel; требуется Homebrew)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

После установки `php --ri true_async_server` покажет список протоколов и версии библиотек.

Параметры (передавайте через переменные окружения перед `bash` или в non-interactive режиме):

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

Опции и управление установкой описаны на [странице загрузки](/ru/download.html).

## Windows — ZIP

Готовая сборка TrueAsync PHP для Windows x64 содержит расширение сервера. Скачайте ZIP с
[GitHub Releases](https://github.com/true-async/releases/releases) (файл вида
`php-trueasync-X.Y.Z-php8.6-windows-x64.zip`), распакуйте, добавьте каталог в `PATH` и в `php.ini`
включите:

```ini
extension=true_async_server
```

Проверка:

```cmd
php --ri true_async_server
```

> HTTP/3 outbound batching использует `UDP_SEGMENT` (Linux GSO), эквивалента в Windows нет.
> Пропускная способность HTTP/3 на Windows ниже; HTTP/1.1, HTTP/2 и TLS работают без потерь.

## Включение расширения

Во всех вариантах установки в `php.ini` нужно дописать:

```ini
extension=true_async_server
```

И проверить:

```bash
php --ri true_async_server
```

В выводе будут протоколы (HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3) и версии OpenSSL, nghttp2, ngtcp2,
nghttp3, libuv в рантайме.

---

## Сборка из исходников

Если стандартные сборки не подходят, можно собрать руками.

### Требования

| Компонент | Минимум | Зачем | Примечание |
|-----------|--------:|-------|------------|
| PHP | 8.6 | базис | сборка из [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | latest `main` | event-loop, `udp_bind` для HTTP/3 | |
| OpenSSL | 3.0 (3.5 для HTTP/3) | TLS, HTTP/3 | HTTP/3 требует QUIC TLS API из OpenSSL 3.5 |
| `libnghttp2` | 1.57 | HTTP/2 | floor для CVE-2023-44487 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | бэкенд crypto именно `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | через TrueAsync | базис | напрямую расширением не линкуется |
| `llhttp` | 9.3.0 | HTTP/1.1 | vendored в `deps/llhttp/` |

> Дистрибутивные пакеты OpenSSL/ngtcp2/nghttp3 обычно слишком старые.
> Рекомендуется собрать OpenSSL 3.5 + ngtcp2 + nghttp3 из исходников под единый префикс (`/usr/local`
> или `/opt/h3`) и указать его в `PKG_CONFIG_PATH` при `./configure`.

### Linux

#### 1. Зависимости

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # для --enable-tests
```

OpenSSL 3.5, ngtcp2 1.22+ и nghttp3 1.15+ на момент написания отсутствуют в репозиториях большинства
дистрибутивов, поэтому собираем под `/usr/local`:

```bash
# OpenSSL 3.5 с QUIC
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2 (OpenSSL crypto бэкенд)
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

#### 2. Сборка расширения

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

HTTP/2 и HTTP/3 включаются автоматически при наличии зависимостей
(`libnghttp2 ≥ 1.57` для H2; `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5 для H3).
Чтобы отключить: `--disable-http2`, `--disable-http3`.

Дополнительные флаги:

| Флаг | Эффект |
|------|--------|
| `--enable-tests` | сборка unit-тестов с libcmocka |
| `--enable-coverage` | инструментирование gcov |
| `--without-openssl` | без TLS (выключает и HTTP/3) |
| `--enable-brotli` | включить Brotli (autodetect) |
| `--enable-zstd` | включить zstd (autodetect) |

Дальше остаётся включить расширение в `php.ini` и проверить — см. раздел
[Включение расширения](#включение-расширения) выше.

### Windows

Сборка через стандартный PHP-SDK. Статические `.lib` для OpenSSL 3.5, nghttp2, ngtcp2, nghttp3
должны быть доступны под `deps\` в дереве PHP-SDK.

```cmd
REM из Visual Studio x64 Native Tools prompt
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

Готовый `php_true_async_server.dll` появится в `x64\Release_TS\` (или `Release\` для NTS).
Скопируйте его в `ext\` и добавьте `extension=true_async_server` в `php.ini`.

## Минимальный сервер

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

$server->start();   // блокирует до stop()
```

Запуск:

```bash
php hello.php
```

Проверка:

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## Дальше

- [Конфигурация](/ru/docs/server/configuration.html): TLS, таймауты, лимиты тела
- [Multi-worker](/ru/docs/server/workers.html): `setWorkers(N)` и bootloader
- [Примеры](/ru/docs/server/examples.html): JSON-API, статика, multipart upload, fan-out
- [Справочник `HttpServer`](/ru/docs/reference/server/http-server.html)
