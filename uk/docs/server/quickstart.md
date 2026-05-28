---
layout: docs
lang: uk
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /uk/docs/server/quickstart.html
page_title: "TrueAsync Server: швидкий старт"
description: "Встановлення TrueAsync Server, мінімальний приклад Hello World і перевірка роботи. Linux і Windows."
---

# Швидкий старт TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

За п'ять хвилин: встановлення розширення, мінімальний обробник і перевірка відповіді.

Сервер постачається **разом з TrueAsync PHP** у всіх готових збірках. Якщо у вас уже стоїть
TrueAsync PHP з інсталятора, Docker-образу чи Windows ZIP, достатньо увімкнути розширення в
`php.ini` — збирати нічого не потрібно. Якщо ж ви хочете зібрати його руками з вихідного коду
(власна версія PHP, власний ланцюжок залежностей), див. розділ [Збірка з вихідного коду](#збірка-з-вихідного-коду).

## Docker

Найшвидший спосіб спробувати. Готовий образ містить PHP з TrueAsync і розширенням
`true_async_server`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

Доступні теги:

| Тег | Опис |
|-----|------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, останній стабільний реліз |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, lightweight |
| `trueasync/php-true-async:0.6.7-php8.6` | Конкретна версія |

Повний список тегів і старих релізів див. на [сторінці завантаження](/uk/download.html#docker).

## Linux / macOS — встановлення скриптом

Скрипт завантажує вихідний код, збирає TrueAsync PHP разом з розширенням сервера і кладе все
в `~/.php-trueasync/bin/`:

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel; потрібен Homebrew)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

Після встановлення `php --ri true_async_server` покаже список протоколів і версії бібліотек.

Параметри (передавайте через змінні середовища перед `bash` або в non-interactive режимі):

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

Опції та керування встановленням описані на [сторінці завантаження](/uk/download.html).

## Windows — ZIP

Готова збірка TrueAsync PHP для Windows x64 містить розширення сервера. Завантажте ZIP з
[GitHub Releases](https://github.com/true-async/releases/releases) (файл виду
`php-trueasync-X.Y.Z-php8.6-windows-x64.zip`), розпакуйте, додайте каталог у `PATH` і в `php.ini`
увімкніть:

```ini
extension=true_async_server
```

Перевірка:

```cmd
php --ri true_async_server
```

> HTTP/3 outbound batching використовує `UDP_SEGMENT` (Linux GSO), еквівалента у Windows немає.
> Пропускна спроможність HTTP/3 на Windows нижча; HTTP/1.1, HTTP/2 і TLS працюють без втрат.

## Увімкнення розширення

У всіх варіантах встановлення в `php.ini` потрібно додати:

```ini
extension=true_async_server
```

І перевірити:

```bash
php --ri true_async_server
```

У виводі будуть протоколи (HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3) і версії OpenSSL, nghttp2, ngtcp2,
nghttp3, libuv у runtime.

---

## Збірка з вихідного коду

Якщо стандартні збірки не підходять, можна зібрати руками.

### Вимоги

| Компонент | Мінімум | Навіщо | Примітка |
|-----------|--------:|--------|----------|
| PHP | 8.6 | базис | збірка з [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | latest `main` | event-loop, `udp_bind` для HTTP/3 | |
| OpenSSL | 3.0 (3.5 для HTTP/3) | TLS, HTTP/3 | HTTP/3 потребує QUIC TLS API з OpenSSL 3.5 |
| `libnghttp2` | 1.57 | HTTP/2 | floor для CVE-2023-44487 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | бекенд crypto саме `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | через TrueAsync | базис | напряму розширенням не лінкується |
| `llhttp` | 9.3.0 | HTTP/1.1 | vendored у `deps/llhttp/` |

> Дистрибутивні пакети OpenSSL/ngtcp2/nghttp3 зазвичай надто старі.
> Рекомендується зібрати OpenSSL 3.5 + ngtcp2 + nghttp3 з вихідного коду під єдиний префікс (`/usr/local`
> або `/opt/h3`) і вказати його в `PKG_CONFIG_PATH` при `./configure`.

### Linux

#### 1. Залежності

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # для --enable-tests
```

OpenSSL 3.5, ngtcp2 1.22+ і nghttp3 1.15+ на момент написання відсутні в репозиторіях більшості
дистрибутивів, тому збираємо під `/usr/local`:

```bash
# OpenSSL 3.5 з QUIC
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2 (OpenSSL crypto бекенд)
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

#### 2. Збірка розширення

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

HTTP/2 і HTTP/3 вмикаються автоматично за наявності залежностей
(`libnghttp2 ≥ 1.57` для H2; `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5 для H3).
Щоб вимкнути: `--disable-http2`, `--disable-http3`.

Додаткові прапорці:

| Прапорець | Ефект |
|-----------|-------|
| `--enable-tests` | збірка unit-тестів з libcmocka |
| `--enable-coverage` | інструментування gcov |
| `--without-openssl` | без TLS (вимикає і HTTP/3) |
| `--enable-brotli` | увімкнути Brotli (autodetect) |
| `--enable-zstd` | увімкнути zstd (autodetect) |

Далі лишається увімкнути розширення в `php.ini` і перевірити — див. розділ
[Увімкнення розширення](#увімкнення-розширення) вище.

### Windows

Збірка через стандартний PHP-SDK. Статичні `.lib` для OpenSSL 3.5, nghttp2, ngtcp2, nghttp3
мають бути доступні під `deps\` у дереві PHP-SDK.

```cmd
REM з Visual Studio x64 Native Tools prompt
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

Готовий `php_true_async_server.dll` з'явиться в `x64\Release_TS\` (або `Release\` для NTS).
Скопіюйте його в `ext\` і додайте `extension=true_async_server` у `php.ini`.

## Мінімальний сервер

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

$server->start();   // блокує до stop()
```

Запуск:

```bash
php hello.php
```

Перевірка:

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## Далі

- [Конфігурація](/uk/docs/server/configuration.html): TLS, таймаути, ліміти тіла
- [Multi-worker](/uk/docs/server/workers.html): `setWorkers(N)` і bootloader
- [Приклади](/uk/docs/server/examples.html): JSON-API, статика, multipart upload, fan-out
- [Довідник `HttpServer`](/uk/docs/reference/server/http-server.html)
