---
layout: docs
lang: zh
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /zh/docs/server/quickstart.html
page_title: "TrueAsync Server：快速开始"
description: "安装 TrueAsync Server，编写 Hello World 最小示例并验证运行。覆盖 Linux 和 Windows。"
---

# TrueAsync Server 快速开始

(PHP 8.6+, true_async_server 0.6+)

5 分钟搞定：安装扩展、编写最小处理程序、验证响应。

服务器随所有预构建的 **TrueAsync PHP** 一起分发。如果你已经通过安装器、Docker 镜像或 Windows ZIP
安装了 TrueAsync PHP，只需要在 `php.ini` 里开启扩展即可——无需自行编译。如果你想从源码手工编译
（使用自己的 PHP 版本、自己的依赖链），请见 [从源码编译](#从源码编译)。

## Docker

最快的体验方式。预构建镜像内含带有 TrueAsync 的 PHP 以及 `true_async_server` 扩展：

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

可用标签：

| 标签 | 描述 |
|------|------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM，最新稳定版 |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20，轻量版 |
| `trueasync/php-true-async:0.6.7-php8.6` | 指定版本 |

完整的标签列表和历史版本见[下载页](/zh/download.html#docker)。

## Linux / macOS —— 一键脚本安装

脚本会拉取源码，编译 TrueAsync PHP 及服务器扩展，并把所有产物放到 `~/.php-trueasync/bin/`：

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel；需要 Homebrew)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

安装完成后，`php --ri true_async_server` 会显示支持的协议和依赖库版本。

参数可以通过环境变量在 `bash` 之前传入，或者在非交互模式下使用：

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

更多选项和安装方式见[下载页](/zh/download.html)。

## Windows —— ZIP 包

Windows x64 的预构建 TrueAsync PHP 已包含服务器扩展。从
[GitHub Releases](https://github.com/true-async/releases/releases) 下载形如
`php-trueasync-X.Y.Z-php8.6-windows-x64.zip` 的 ZIP 包，解压后把目录加入 `PATH`，并在 `php.ini` 中开启：

```ini
extension=true_async_server
```

验证：

```cmd
php --ri true_async_server
```

> HTTP/3 的出站批量发送使用了 `UDP_SEGMENT`（Linux GSO），Windows 上没有对应实现。
> Windows 上的 HTTP/3 吞吐会偏低；HTTP/1.1、HTTP/2 和 TLS 不受影响。

## 启用扩展

无论用哪种安装方式，都需要在 `php.ini` 中加入：

```ini
extension=true_async_server
```

然后检查：

```bash
php --ri true_async_server
```

输出会包含协议列表（HTTP/1.1、HTTP/2、HTTP/3、TLS 1.2/1.3）以及运行时的 OpenSSL、nghttp2、ngtcp2、
nghttp3、libuv 版本。

---

## 从源码编译

如果标准发行版不能满足需求，可以手工编译。

### 依赖要求

| 组件 | 最低版本 | 用途 | 备注 |
|------|---------:|------|------|
| PHP | 8.6 | 基础 | 来自 [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | latest `main` | event-loop，HTTP/3 所需的 `udp_bind` | |
| OpenSSL | 3.0（HTTP/3 需要 3.5） | TLS、HTTP/3 | HTTP/3 需要 OpenSSL 3.5 的 QUIC TLS API |
| `libnghttp2` | 1.57 | HTTP/2 | 为 CVE-2023-44487 设置最低版本 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | crypto 后端必须是 `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | 由 TrueAsync 提供 | 基础 | 扩展不直接链接 |
| `llhttp` | 9.3.0 | HTTP/1.1 | 已 vendored 到 `deps/llhttp/` |

> 大多数发行版自带的 OpenSSL/ngtcp2/nghttp3 包通常太老。
> 建议从源码编译 OpenSSL 3.5 + ngtcp2 + nghttp3，统一安装到一个前缀（如 `/usr/local`
> 或 `/opt/h3`），并在 `./configure` 时通过 `PKG_CONFIG_PATH` 指向它。

### Linux

#### 1. 依赖

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # for --enable-tests
```

撰写本文时，多数发行版的仓库还没有 OpenSSL 3.5、ngtcp2 1.22+ 和 nghttp3 1.15+，因此装到 `/usr/local`：

```bash
# OpenSSL 3.5（带 QUIC）
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2（OpenSSL crypto 后端）
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

#### 2. 编译扩展

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

只要依赖齐全，HTTP/2 与 HTTP/3 会自动启用
（H2 需要 `libnghttp2 ≥ 1.57`；H3 需要 `libngtcp2 ≥ 1.22`、`libnghttp3 ≥ 1.15`、OpenSSL ≥ 3.5）。
要关闭则使用 `--disable-http2`、`--disable-http3`。

其他开关：

| 选项 | 作用 |
|------|------|
| `--enable-tests` | 用 libcmocka 编译单元测试 |
| `--enable-coverage` | 启用 gcov 插桩 |
| `--without-openssl` | 不启用 TLS（同时禁用 HTTP/3）|
| `--enable-brotli` | 启用 Brotli（autodetect）|
| `--enable-zstd` | 启用 zstd（autodetect）|

剩下只需在 `php.ini` 中启用扩展并验证，请参考前文
[启用扩展](#启用扩展)一节。

### Windows

通过标准 PHP-SDK 编译。OpenSSL 3.5、nghttp2、ngtcp2、nghttp3 的静态 `.lib` 需要可以从 PHP-SDK 树中的
`deps\` 找到。

```cmd
REM 在 Visual Studio x64 Native Tools 命令提示符里执行
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

编译完成后会在 `x64\Release_TS\`（NTS 是 `Release\`）下产生 `php_true_async_server.dll`。
把它拷贝到 `ext\` 目录，并在 `php.ini` 中加入 `extension=true_async_server`。

## 最小示例

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

$server->start();   // 阻塞，直到 stop()
```

运行：

```bash
php hello.php
```

验证：

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## 下一步

- [配置](/zh/docs/server/configuration.html)：TLS、超时、请求体大小限制
- [多工作进程](/zh/docs/server/workers.html)：`setWorkers(N)` 与 bootloader
- [示例](/zh/docs/server/examples.html)：JSON-API、静态文件、multipart 上传、fan-out
- [`HttpServer` 参考](/zh/docs/reference/server/http-server.html)
