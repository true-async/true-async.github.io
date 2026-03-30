---
layout: docs
lang: zh
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /zh/docs/frankenphp.html
page_title: "FrankenPHP"
description: "使用 FrankenPHP 运行 TrueAsync PHP — Docker 快速入门、从源代码构建、Caddyfile 配置、异步 Worker 入口点、优雅重启和故障排除。"
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) 是基于 [Caddy](https://caddyserver.com) 构建的 PHP 应用服务器。它将 PHP 运行时直接嵌入到 Go 进程中，消除了独立 FastCGI 代理的开销。

在 TrueAsync 的 FrankenPHP 分支中，单个 PHP 线程可以**同时处理多个请求** — 每个传入的 HTTP 请求都会获得自己的协程，TrueAsync 调度器在它们等待 I/O 时自动切换。

```
传统 FPM / 普通 FrankenPHP：
  1 个请求 → 1 个线程（I/O 期间阻塞）

TrueAsync FrankenPHP：
  N 个请求 → 1 个线程（协程，非阻塞 I/O）
```

## 快速入门 — Docker

最快的体验方式是使用预构建的 Docker 镜像：

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

打开 [http://localhost:8080](http://localhost:8080) — 您将看到实时仪表板，显示 PHP 版本、活动协程数、内存使用和运行时间。

### 可用镜像标签

| 标签 | 描述 |
|------|------|
| `latest-frankenphp` | 最新稳定版，最新 PHP |
| `latest-php8.6-frankenphp` | 最新稳定版，PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | 特定版本 |

### 运行您自己的 PHP 应用

挂载您的应用目录并提供自定义 `Caddyfile`：

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## 从源代码安装

从源代码构建会在 `php` 二进制文件旁边生成一个原生的 `frankenphp` 二进制文件。

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

也可以使用交互模式 — 安装向导会在扩展预设选择过程中询问是否需要 FrankenPHP。

构建需要 Go 1.26+。如果未找到，安装脚本会自动下载并使用它，不会影响您的系统安装。

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

如果需要，Go 会通过 Homebrew 安装。

### 安装内容

构建成功后，两个二进制文件都会放置在 `$INSTALL_DIR/bin/` 中：

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # FrankenPHP server binary
```

## Caddyfile 配置

FrankenPHP 通过 `Caddyfile` 进行配置。以下是异步 TrueAsync Worker 的最小配置：

```caddyfile
{
    admin off
    frankenphp {
        num_threads 4   # total PHP threads across all workers (default: 2× CPU cores)
    }
}

:8080 {
    root * /app
    php_server {
        index off
        file_server off
        worker {
            file /app/entrypoint.php
            num 1
            async
            match /*
        }
    }
}
```

### 全局 `frankenphp` 指令

| 指令 | 描述 |
|------|------|
| `num_threads N` | PHP 线程池总大小。默认为 `2 × CPU 核心数`。所有 Worker 共享此线程池 |

### 关键 Worker 指令

| 指令 | 描述 |
|------|------|
| `file` | PHP 入口脚本的路径 |
| `num` | 分配给此 Worker 的 PHP 线程数。建议从 `1` 开始，根据 CPU 密集型任务的需求进行调优 |
| `async` | **必需** — 启用 TrueAsync 协程模式 |
| `drain_timeout` | 优雅重启期间，等待进行中请求完成的宽限期（默认 `30s`） |
| `match` | 该 Worker 处理的 URL 模式 |

### 多个 Worker

您可以为不同的路由运行不同的入口点：

```caddyfile
:8080 {
    root * /app
    php_server {
        worker {
            file /app/api.php
            num 2
            async
            match /api/*
        }
        worker {
            file /app/web.php
            num 1
            async
            match /*
        }
    }
}
```

## 编写入口点

入口点是一个长期运行的 PHP 脚本。它注册一个请求处理回调，然后将控制权交给 `FrankenPHP`，后者会阻塞直到服务器关闭。

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

set_time_limit(0);

HttpServer::onRequest(function (Request $request, Response $response): void {
    $path = parse_url($request->getUri(), PHP_URL_PATH);

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello from TrueAsync! Path: $path");
    $response->end();
});
```

### Request 对象

所有请求数据通过 CGO 从 Go 的 `http.Request` 对象获取——无 SAPI 全局变量，对并发协程安全。

| 方法 | 返回值 | 描述 |
|------|--------|------|
| `getMethod()` | `string` | HTTP 方法（`GET`、`POST` 等） |
| `getUri()` | `string` | 完整请求 URI（含查询字符串） |
| `getHeader(string $name)` | `?string` | 单个请求头的值，或 `null` |
| `getHeaders()` | `array` | 所有请求头，格式为 `name => value`（多值以 `, ` 连接） |
| `getBody()` | `string` | 完整请求体（一次性读取） |
| `getQueryParams()` | `array` | 已解析并 URL 解码的查询字符串 |
| `getCookies()` | `array` | 从 `Cookie` 头解析并 URL 解码的 Cookie |
| `getHost()` | `string` | Host 头的值 |
| `getRemoteAddr()` | `string` | 客户端地址（`ip:port`） |
| `getScheme()` | `string` | `http` 或 `https` |
| `getProtocolVersion()` | `string` | 协议版本（`HTTP/1.1`、`HTTP/2.0`） |
| `getParsedBody()` | `array` | 表单字段（urlencoded + multipart） |
| `getUploadedFiles()` | `array` | 上传文件，返回 `UploadedFile` 对象 |

### Response 对象

响应头和状态码存储在对象本身（而非 SAPI 全局变量），在 `end()` 时序列化并通过单次 CGO 调用发送到 Go。

| 方法 | 返回值 | 描述 |
|------|--------|------|
| `setStatus(int $code)` | `void` | 设置 HTTP 状态码（默认 200） |
| `getStatus()` | `int` | 读取当前状态码 |
| `setHeader(string $name, string $value)` | `void` | 设置请求头（替换已有值） |
| `addHeader(string $name, string $value)` | `void` | 追加请求头（用于 `Set-Cookie` 等） |
| `removeHeader(string $name)` | `void` | 移除请求头 |
| `getHeader(string $name)` | `?string` | 读取请求头的第一个值，或 `null` |
| `getHeaders()` | `array` | 所有请求头，格式为 `name => [values...]` |
| `isHeadersSent()` | `bool` | `end()` 是否已被调用 |
| `redirect(string $url, int $code = 302)` | `void` | 设置 Location 头 + 状态码 |
| `write(string $data)` | `void` | 缓冲响应体（可多次调用） |
| `end()` | `void` | 发送状态码 + 响应头 + 响应体给客户端。**必须调用。** |

> **重要提示：** 即使响应体为空，也务必调用 `end()`。`write()` 在 PHP 对象中缓冲数据；`end()` 将响应头 + 响应体序列化，并通过单次 CGO 调用复制到 Go。省略 `end()` 将导致请求挂起。

### UploadedFile 对象

`getUploadedFiles()` 返回 `FrankenPHP\UploadedFile` 对象。Go 通过 `http.Request.ParseMultipartForm` 解析 multipart 数据，将文件保存到临时目录，并将元数据传递给 PHP。

| 方法 | 返回值 | 描述 |
|------|--------|------|
| `getName()` | `string` | 原始文件名 |
| `getType()` | `string` | MIME 类型 |
| `getSize()` | `int` | 文件大小（字节） |
| `getTmpName()` | `string` | 临时文件路径 |
| `getError()` | `int` | 上传错误码（`UPLOAD_ERR_OK` = 0） |
| `moveTo(string $path)` | `bool` | 将文件移动到目标路径（重命名或复制+删除） |

同一字段的多个文件以 `UploadedFile` 对象数组形式返回。

### 示例：Cookie 与重定向

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    $cookies = $request->getCookies();

    if (!isset($cookies['session'])) {
        $response->addHeader('Set-Cookie', 'session=abc123; Path=/; HttpOnly');
        $response->addHeader('Set-Cookie', 'theme=dark; Path=/');
        $response->redirect('/welcome');
        $response->end();
        return;
    }

    $params = $request->getQueryParams();
    $name = $params['name'] ?? 'World';

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello, {$name}!");
    $response->end();
});
```

### 示例：文件上传

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    $files = $request->getUploadedFiles();
    $fields = $request->getParsedBody();

    if (isset($files['avatar'])) {
        $file = $files['avatar'];

        if ($file->getError() === UPLOAD_ERR_OK) {
            $file->moveTo('/uploads/' . $file->getName());
            $response->setStatus(200);
            $response->write("Uploaded: {$file->getName()} ({$file->getSize()} bytes)");
        } else {
            $response->setStatus(400);
            $response->write("Upload error: {$file->getError()}");
        }
    } else {
        $response->setStatus(400);
        $response->write('No file uploaded');
    }

    $response->end();
});
```

### 处理器中的异步 I/O

由于每个请求都在自己的协程中运行，您可以自由使用阻塞 I/O 调用 — 它们会让出协程而不是阻塞线程：

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    // Both requests run concurrently in the same PHP thread
    $db   = new PDO('pgsql:host=localhost;dbname=app', 'user', 'pass');
    $rows = $db->query('SELECT * FROM users LIMIT 10')->fetchAll();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($rows));
    $response->end();
});
```

### 生成额外的协程

处理器本身已经是一个协程，因此您可以使用 `spawn()` 派生子任务：

```php
use function Async\spawn;
use function Async\await;

HttpServer::onRequest(function (Request $request, Response $response): void {
    // Fan-out: run two DB queries concurrently
    $users  = spawn(fn() => fetchUsers());
    $totals = spawn(fn() => fetchTotals());

    $data = [
        'users'  => await($users),
        'totals' => await($totals),
    ];

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($data));
    $response->end();
});
```

## 性能调优

### Worker 线程数 (`num`)

每个 PHP 线程运行一个 TrueAsync 调度器循环。单个线程通过协程已经可以处理数千个并发 I/O 密集型请求。仅当您有 CPU 密集型任务需要真正的并行处理时才需要增加线程（由于 ZTS，每个线程都在独立的操作系统线程上运行）。

推荐起点：

```
I/O 密集型 API：  num 1–2
混合负载：        num = CPU 核心数 / 2
CPU 密集型：      num = CPU 核心数
```

## 优雅重启

异步 Worker 支持**蓝绿部署式重启** — 重新加载代码时不会丢弃进行中的请求。

当触发重启时（通过管理 API、文件监视器或配置重新加载）：

1. 旧线程被**分离** — 不再将新请求路由到它们。
2. 进行中的请求获得宽限期（`drain_timeout`，默认 `30s`）来完成处理。
3. 旧线程关闭并释放其资源（通知器、通道）。
4. 新线程使用更新后的 PHP 代码启动。

在排空窗口期间，新请求会收到 `HTTP 503`。一旦新线程就绪，流量恢复正常。

### 通过管理 API 触发

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

Caddy 管理 API 默认监听 `localhost:2019`。要启用它，请从全局配置块中移除 `admin off`（或将其限制为 localhost）：

```caddyfile
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### 配置排空超时

```caddyfile
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## 检查安装

```bash
# Version
frankenphp version

# Start with a config
frankenphp run --config /etc/caddy/Caddyfile

# Validate the Caddyfile without starting
frankenphp adapt --config /etc/caddy/Caddyfile
```

在 PHP 中检查 TrueAsync 是否已激活：

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## 执行模型

- 每个异步线程使用一个 1 槽缓冲通道（默认）。可设置 `buffer_size` 增加每线程请求队列（最大 10）。如果所有线程都处于繁忙状态且所有缓冲区已满，客户端将收到 `503 (ErrAllBuffersFull)`。
- 请求通过通知器（Linux 上的 `eventfd`，其他平台使用 `pipe`）加心跳快速路径唤醒 PHP 调度器，以减少唤醒延迟。
- `Response::write()` 在 PHP 对象中缓冲数据。`end()` 将响应头 + 响应体序列化，并通过一次 CGO 调用复制到 Go。即使响应体为空，也必须调用 `end()`。
- 关闭时通过队列发送哨兵值；PHP 循环释放待写入的引用并恢复心跳处理器。

## 故障排除

### 请求未到达 PHP 处理器

确保 Worker 已启用 `async` **并且** Caddy 匹配器将流量路由到它。如果没有 `match *`（或特定的匹配模式），请求将不会到达异步 Worker。

### 构建时出现 `undefined reference to tsrm_*`

PHP 是使用 `--enable-embed=shared` 编译的。请不带 `=shared` 重新构建：

```bash
./configure --enable-embed --enable-zts --enable-async ...
```

### 请求收到 `HTTP 503`

所有 PHP 线程都处于繁忙状态且宽限期已激活（重启期间的排空窗口），或者线程队列已饱和。增加 `num` 以添加更多线程，或者如果部署时间过长则减小 `drain_timeout`。

## 使用 Delve 调试

Go 1.25+ 会生成 **DWARF v5** 调试信息。如果 Delve 报告兼容性错误，请使用 DWARF v4 重新构建：

```bash
GOEXPERIMENT=nodwarf5 go build -tags "trueasync,nowatcher" -o frankenphp ./caddy/frankenphp
```

运行调试器：

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv exec ./frankenphp
```

## 源代码

| 仓库 | 描述 |
|------|------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | FrankenPHP 的 TrueAsync 分支（`true-async` 分支） |
| [true-async/releases](https://github.com/true-async/releases) | Docker 镜像、安装脚本、构建配置 |

如需深入了解 Go 与 PHP 集成的内部工作原理，请参阅 [FrankenPHP 架构](/zh/architecture/frankenphp.html) 页面。
