---
layout: docs
lang: ko
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /ko/docs/server/quickstart.html
page_title: "TrueAsync Server: 빠른 시작"
description: "TrueAsync Server 설치, 최소 Hello World 예제, 동작 확인. Linux와 Windows."
---

# TrueAsync Server 빠른 시작

(PHP 8.6+, true_async_server 0.6+)

5분 안에: 확장 설치, 최소 핸들러, 응답 확인.

서버는 모든 사전 빌드 패키지에서 **TrueAsync PHP와 함께** 제공됩니다. 인스톨러, Docker 이미지,
Windows ZIP을 통해 TrueAsync PHP가 이미 설치되어 있다면 `php.ini`에서 확장을 활성화하기만 하면
됩니다 — 별도 빌드는 필요 없습니다. 직접 소스에서 빌드하고 싶다면(자체 PHP 버전, 자체 의존성
체인) [소스에서 빌드](#소스에서-빌드) 섹션을 참고하세요.

## Docker

가장 빠르게 시도하는 방법입니다. 미리 빌드된 이미지에는 TrueAsync가 적용된 PHP와
`true_async_server` 확장이 포함되어 있습니다.

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

사용 가능한 태그:

| 태그 | 설명 |
|-----|----------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, 최신 안정 릴리스 |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, 경량 |
| `trueasync/php-true-async:0.6.7-php8.6` | 특정 버전 |

태그와 과거 릴리스의 전체 목록은 [다운로드 페이지](/ko/download.html#docker)에 있습니다.

## Linux / macOS — 스크립트 설치

스크립트가 소스를 내려받아 서버 확장과 함께 TrueAsync PHP를 빌드하고 모든 결과물을
`~/.php-trueasync/bin/`에 둡니다.

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel; Homebrew 필요)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

설치 후 `php --ri true_async_server`로 프로토콜과 라이브러리 버전을 확인할 수 있습니다.

매개변수(`bash` 앞에 환경 변수로 전달하거나 비대화형 모드에서 사용):

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

옵션과 설치 제어는 [다운로드 페이지](/ko/download.html)에 설명되어 있습니다.

## Windows — ZIP

Windows x64용 TrueAsync PHP 사전 빌드 패키지에는 서버 확장이 포함되어 있습니다.
[GitHub Releases](https://github.com/true-async/releases/releases)에서 ZIP을 내려받고
(`php-trueasync-X.Y.Z-php8.6-windows-x64.zip` 형식), 압축을 풀고, 디렉터리를 `PATH`에 추가한 뒤
`php.ini`에 다음을 활성화합니다.

```ini
extension=true_async_server
```

확인:

```cmd
php --ri true_async_server
```

> HTTP/3 outbound batching은 `UDP_SEGMENT`(Linux GSO)를 사용하며, Windows에는 동등한 것이 없습니다.
> Windows에서 HTTP/3 처리량은 더 낮습니다. HTTP/1.1, HTTP/2, TLS는 손실 없이 동작합니다.

## 확장 활성화

모든 설치 방법에서 `php.ini`에 다음을 추가해야 합니다.

```ini
extension=true_async_server
```

그리고 확인:

```bash
php --ri true_async_server
```

출력에는 프로토콜(HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3)과 런타임의 OpenSSL, nghttp2, ngtcp2,
nghttp3, libuv 버전이 표시됩니다.

---

## 소스에서 빌드

표준 빌드가 적합하지 않다면 직접 빌드할 수 있습니다.

### 요구 사항

| 컴포넌트 | 최소 버전 | 용도 | 비고 |
|-----------|--------:|-------|------------|
| PHP | 8.6 | 기반 | [TrueAsync php-src](https://github.com/true-async/php-src)에서 빌드 |
| `ext-async` | 최신 `main` | event-loop, HTTP/3용 `udp_bind` | |
| OpenSSL | 3.0 (HTTP/3에는 3.5) | TLS, HTTP/3 | HTTP/3에는 OpenSSL 3.5의 QUIC TLS API가 필요 |
| `libnghttp2` | 1.57 | HTTP/2 | CVE-2023-44487 대응 floor |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | crypto 백엔드는 반드시 `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | TrueAsync 경유 | 기반 | 확장과 직접 링크되지 않음 |
| `llhttp` | 9.3.0 | HTTP/1.1 | `deps/llhttp/`에 vendored |

> 배포판의 OpenSSL/ngtcp2/nghttp3 패키지는 보통 너무 오래된 버전입니다.
> 단일 prefix(`/usr/local` 또는 `/opt/h3`) 아래에 OpenSSL 3.5 + ngtcp2 + nghttp3를
> 소스에서 빌드하고, `./configure` 시 `PKG_CONFIG_PATH`로 지정하는 것을 권장합니다.

### Linux

#### 1. 의존성

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # --enable-tests용
```

OpenSSL 3.5, ngtcp2 1.22+, nghttp3 1.15+는 작성 시점에 대부분의 배포판 저장소에 없으므로
`/usr/local` 아래에 빌드합니다.

```bash
# QUIC가 포함된 OpenSSL 3.5
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2 (OpenSSL crypto 백엔드)
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

#### 2. 확장 빌드

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

HTTP/2와 HTTP/3은 의존성이 있으면 자동으로 활성화됩니다
(H2는 `libnghttp2 ≥ 1.57`, H3은 `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5).
끄려면 `--disable-http2`, `--disable-http3`.

추가 플래그:

| 플래그 | 효과 |
|------|--------|
| `--enable-tests` | libcmocka로 단위 테스트 빌드 |
| `--enable-coverage` | gcov 계측 |
| `--without-openssl` | TLS 없음 (HTTP/3도 꺼짐) |
| `--enable-brotli` | Brotli 활성화 (autodetect) |
| `--enable-zstd` | zstd 활성화 (autodetect) |

이후 `php.ini`에서 확장을 활성화하고 확인하면 됩니다 — 위
[확장 활성화](#확장-활성화) 섹션을 참고하세요.

### Windows

표준 PHP-SDK를 통한 빌드. OpenSSL 3.5, nghttp2, ngtcp2, nghttp3의 정적 `.lib`이
PHP-SDK 트리의 `deps\` 아래에 있어야 합니다.

```cmd
REM Visual Studio x64 Native Tools prompt에서
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

빌드된 `php_true_async_server.dll`은 `x64\Release_TS\`(또는 NTS의 경우 `Release\`)에 나타납니다.
이를 `ext\`로 복사하고 `php.ini`에 `extension=true_async_server`를 추가하세요.

## 최소 서버

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

$server->start();   // stop()까지 블로킹
```

실행:

```bash
php hello.php
```

확인:

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## 다음 단계

- [구성](/ko/docs/server/configuration.html): TLS, 타임아웃, 본문 한도
- [Multi-worker](/ko/docs/server/workers.html): `setWorkers(N)`과 bootloader
- [예제](/ko/docs/server/examples.html): JSON-API, 정적 파일, multipart 업로드, fan-out
- [`HttpServer` 레퍼런스](/ko/docs/reference/server/http-server.html)
