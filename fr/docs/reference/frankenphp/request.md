---
layout: docs
lang: fr
path_key: "/docs/reference/frankenphp/request.html"
nav_active: docs
permalink: /fr/docs/reference/frankenphp/request.html
page_title: "FrankenPHP\\Request"
description: "FrankenPHP\\Request class — access HTTP request data (method, URI, headers, body, query parameters, cookies, uploaded files) inside an async worker."
---

# FrankenPHP\Request

(True Async 0.6+)

The `Request` object is passed to your handler callback by `HttpServer::onRequest()`.
It provides read-only access to all HTTP request data.

Each request coroutine receives its own `Request` instance — there are no shared globals,
so concurrent handlers are always safe.

## Class Synopsis

```php
namespace FrankenPHP;

class Request
{
    public function getMethod(): string;
    public function getUri(): string;
    public function getHeader(string $name): ?string;
    public function getHeaders(): array;
    public function getBody(): string;
    public function getQueryParams(): array;
    public function getCookies(): array;
    public function getHost(): string;
    public function getRemoteAddr(): string;
    public function getScheme(): string;
    public function getProtocolVersion(): string;
    public function getParsedBody(): array;
    public function getUploadedFiles(): array;
}
```

## Methods

### getMethod

```php
public Request::getMethod(): string
```

Returns the HTTP method: `GET`, `POST`, `PUT`, `DELETE`, etc.

### getUri

```php
public Request::getUri(): string
```

Returns the full request URI including the query string (e.g. `/api/users?page=2`).

### getHeader

```php
public Request::getHeader(string $name): ?string
```

Returns a single header value by name, or `null` if the header is not present.
Header names are case-insensitive.

### getHeaders

```php
public Request::getHeaders(): array
```

Returns all headers as an associative array `name => value`.
When a header has multiple values they are joined with `, `.

### getBody

```php
public Request::getBody(): string
```

Returns the full request body as a string. The body is read once and cached —
subsequent calls return the same value.

### getQueryParams

```php
public Request::getQueryParams(): array
```

Returns the parsed and URL-decoded query string as an associative array.

### getCookies

```php
public Request::getCookies(): array
```

Returns cookies parsed from the `Cookie` header as an associative array `name => value`.

### getHost

```php
public Request::getHost(): string
```

Returns the value of the `Host` header.

### getRemoteAddr

```php
public Request::getRemoteAddr(): string
```

Returns the client address in `ip:port` format.

### getScheme

```php
public Request::getScheme(): string
```

Returns `http` or `https`.

### getProtocolVersion

```php
public Request::getProtocolVersion(): string
```

Returns the HTTP protocol version, e.g. `HTTP/1.1` or `HTTP/2.0`.

### getParsedBody

```php
public Request::getParsedBody(): array
```

Returns form fields from `application/x-www-form-urlencoded` and `multipart/form-data` bodies
as an associative array.

### getUploadedFiles

```php
public Request::getUploadedFiles(): array
```

Returns uploaded files as an array of [`FrankenPHP\UploadedFile`](/fr/docs/reference/frankenphp/uploaded-file.html) objects.
Multiple files for the same field are returned as an array.

## Examples

### Example #1 Routing by method and path

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $method = $request->getMethod();
    $path   = parse_url($request->getUri(), PHP_URL_PATH);

    if ($method === 'GET' && $path === '/health') {
        $response->setStatus(200);
        $response->write('OK');
        $response->end();
        return;
    }

    $response->setStatus(404);
    $response->write('Not Found');
    $response->end();
});
```

### Example #2 Reading query parameters and cookies

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $cookies = $request->getCookies();
    $params  = $request->getQueryParams();

    $name = $params['name'] ?? $cookies['username'] ?? 'Guest';

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello, {$name}!");
    $response->end();
});
```

### Example #3 Processing a JSON body

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    if ($request->getMethod() !== 'POST') {
        $response->setStatus(405);
        $response->end();
        return;
    }

    $data = json_decode($request->getBody(), true);

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['received' => $data]));
    $response->end();
});
```

## See Also

- [FrankenPHP\Response](/fr/docs/reference/frankenphp/response.html) -- Building and sending responses
- [FrankenPHP\UploadedFile](/fr/docs/reference/frankenphp/uploaded-file.html) -- Working with uploaded files
- [FrankenPHP Integration Guide](/fr/docs/frankenphp.html) -- Installation, configuration, and deployment
