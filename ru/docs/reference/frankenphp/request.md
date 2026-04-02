---
layout: docs
lang: ru
path_key: "/docs/reference/frankenphp/request.html"
nav_active: docs
permalink: /ru/docs/reference/frankenphp/request.html
page_title: "FrankenPHP\\Request"
description: "Класс FrankenPHP\\Request — доступ к данным HTTP-запроса (метод, URI, заголовки, тело, параметры, cookies, загруженные файлы) внутри асинхронного воркера."
---

# FrankenPHP\Request

(True Async 0.6+)

Объект `Request` передаётся в callback-обработчик через `HttpServer::onRequest()`.
Он предоставляет доступ только для чтения ко всем данным HTTP-запроса.

Каждая корутина запроса получает собственный экземпляр `Request` — общих глобальных переменных нет,
поэтому параллельные обработчики всегда безопасны.

## Обзор класса

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

## Методы

### getMethod

```php
public Request::getMethod(): string
```

Возвращает HTTP-метод: `GET`, `POST`, `PUT`, `DELETE` и т.д.

### getUri

```php
public Request::getUri(): string
```

Возвращает полный URI запроса, включая query string (например, `/api/users?page=2`).

### getHeader

```php
public Request::getHeader(string $name): ?string
```

Возвращает значение одного заголовка по имени или `null`, если заголовок отсутствует.
Имена заголовков нечувствительны к регистру.

### getHeaders

```php
public Request::getHeaders(): array
```

Возвращает все заголовки в виде ассоциативного массива `name => value`.
Если заголовок имеет несколько значений, они объединяются через `, `.

### getBody

```php
public Request::getBody(): string
```

Возвращает полное тело запроса в виде строки. Тело читается один раз и кешируется —
последующие вызовы возвращают то же значение.

### getQueryParams

```php
public Request::getQueryParams(): array
```

Возвращает разобранные и декодированные параметры query string в виде ассоциативного массива.

### getCookies

```php
public Request::getCookies(): array
```

Возвращает cookies, разобранные из заголовка `Cookie`, в виде ассоциативного массива `name => value`.

### getHost

```php
public Request::getHost(): string
```

Возвращает значение заголовка `Host`.

### getRemoteAddr

```php
public Request::getRemoteAddr(): string
```

Возвращает адрес клиента в формате `ip:port`.

### getScheme

```php
public Request::getScheme(): string
```

Возвращает `http` или `https`.

### getProtocolVersion

```php
public Request::getProtocolVersion(): string
```

Возвращает версию HTTP-протокола, например `HTTP/1.1` или `HTTP/2.0`.

### getParsedBody

```php
public Request::getParsedBody(): array
```

Возвращает поля формы из тел `application/x-www-form-urlencoded` и `multipart/form-data`
в виде ассоциативного массива.

### getUploadedFiles

```php
public Request::getUploadedFiles(): array
```

Возвращает загруженные файлы в виде массива объектов [`FrankenPHP\UploadedFile`](/ru/docs/reference/frankenphp/uploaded-file.html).
Несколько файлов для одного поля возвращаются как массив.

## Примеры

### Пример #1 Маршрутизация по методу и пути

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

### Пример #2 Чтение параметров запроса и cookies

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

### Пример #3 Обработка JSON-тела

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

## Смотрите также

- [FrankenPHP\Response](/ru/docs/reference/frankenphp/response.html) -- Формирование и отправка ответов
- [FrankenPHP\UploadedFile](/ru/docs/reference/frankenphp/uploaded-file.html) -- Работа с загруженными файлами
- [Руководство по FrankenPHP](/ru/docs/frankenphp.html) -- Установка, конфигурация и развёртывание
