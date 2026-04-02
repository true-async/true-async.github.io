---
layout: docs
lang: en
path_key: "/docs/reference/frankenphp/response.html"
nav_active: docs
permalink: /en/docs/reference/frankenphp/response.html
page_title: "FrankenPHP\\Response"
description: "FrankenPHP\\Response class — set status codes, headers, write body content, redirect, and send the HTTP response from an async worker."
---

# FrankenPHP\Response

(True Async 0.6+)

The `Response` object is passed to your handler callback by `HttpServer::onRequest()`.
It provides methods to set the status code, headers, body, and send the response to the client.

> **Important:** always call `end()` to send the response, even when the body is empty.
> `write()` buffers data in the object; `end()` sends everything to the client.
> Omitting `end()` will hang the request.

## Class Synopsis

```php
namespace FrankenPHP;

class Response
{
    public function setStatus(int $code): void;
    public function getStatus(): int;
    public function setHeader(string $name, string $value): void;
    public function addHeader(string $name, string $value): void;
    public function removeHeader(string $name): void;
    public function getHeader(string $name): ?string;
    public function getHeaders(): array;
    public function isHeadersSent(): bool;
    public function redirect(string $url, int $code = 302): void;
    public function write(string $data): void;
    public function end(): void;
}
```

## Methods

### setStatus

```php
public Response::setStatus(int $code): void
```

Set the HTTP status code. Default is `200`.

### getStatus

```php
public Response::getStatus(): int
```

Returns the current status code.

### setHeader

```php
public Response::setHeader(string $name, string $value): void
```

Set a header, replacing any existing values for that name.

### addHeader

```php
public Response::addHeader(string $name, string $value): void
```

Append a header value. Use this for headers that can have multiple values,
such as `Set-Cookie`.

### removeHeader

```php
public Response::removeHeader(string $name): void
```

Remove a previously set header.

### getHeader

```php
public Response::getHeader(string $name): ?string
```

Returns the first value of a header, or `null` if not set.

### getHeaders

```php
public Response::getHeaders(): array
```

Returns all headers as an associative array `name => [values...]`.

### isHeadersSent

```php
public Response::isHeadersSent(): bool
```

Returns `true` if `end()` has already been called.

### redirect

```php
public Response::redirect(string $url, int $code = 302): void
```

Sets the `Location` header and the status code. You still need to call `end()` after.

### write

```php
public Response::write(string $data): void
```

Buffers response body data. Can be called multiple times — chunks are concatenated.

### end

```php
public Response::end(): void
```

Sends the status code, headers, and buffered body to the client.
**Must be called** to complete the response. After `end()`, further calls to `write()` or
header methods have no effect.

## Examples

### Example #1 Basic text response

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write('Hello, World!');
    $response->end();
});
```

### Example #2 JSON API response

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $data = ['status' => 'ok', 'time' => time()];

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($data));
    $response->end();
});
```

### Example #3 Setting cookies and redirecting

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $cookies = $request->getCookies();

    if (!isset($cookies['session'])) {
        $response->addHeader('Set-Cookie', 'session=abc123; Path=/; HttpOnly');
        $response->addHeader('Set-Cookie', 'theme=dark; Path=/');
        $response->redirect('/welcome');
        $response->end();
        return;
    }

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write('Welcome back!');
    $response->end();
});
```

### Example #4 Streaming-style writes

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');

    // Multiple write() calls — all data is buffered and sent at end()
    $response->write("Line 1\n");
    $response->write("Line 2\n");
    $response->write("Line 3\n");

    $response->end();
});
```

## See Also

- [FrankenPHP\Request](/en/docs/reference/frankenphp/request.html) -- Reading request data
- [FrankenPHP\UploadedFile](/en/docs/reference/frankenphp/uploaded-file.html) -- Working with uploaded files
- [FrankenPHP Integration Guide](/en/docs/frankenphp.html) -- Installation, configuration, and deployment
