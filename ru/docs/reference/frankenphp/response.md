---
layout: docs
lang: ru
path_key: "/docs/reference/frankenphp/response.html"
nav_active: docs
permalink: /ru/docs/reference/frankenphp/response.html
page_title: "FrankenPHP\\Response"
description: "Класс FrankenPHP\\Response — установка статуса, заголовков, запись тела ответа, редирект и отправка HTTP-ответа из асинхронного воркера."
---

# FrankenPHP\Response

(True Async 0.6+)

Объект `Response` передаётся в callback-обработчик через `HttpServer::onRequest()`.
Он предоставляет методы для установки кода статуса, заголовков, тела и отправки ответа клиенту.

> **Важно:** всегда вызывайте `end()` для отправки ответа, даже если тело пустое.
> `write()` буферизует данные в объекте; `end()` отправляет всё клиенту.
> Пропуск `end()` приведёт к зависанию запроса.

## Обзор класса

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

## Методы

### setStatus

```php
public Response::setStatus(int $code): void
```

Устанавливает HTTP-код статуса. По умолчанию `200`.

### getStatus

```php
public Response::getStatus(): int
```

Возвращает текущий код статуса.

### setHeader

```php
public Response::setHeader(string $name, string $value): void
```

Устанавливает заголовок, заменяя существующие значения для этого имени.

### addHeader

```php
public Response::addHeader(string $name, string $value): void
```

Добавляет значение заголовка. Используйте для заголовков с несколькими значениями,
таких как `Set-Cookie`.

### removeHeader

```php
public Response::removeHeader(string $name): void
```

Удаляет ранее установленный заголовок.

### getHeader

```php
public Response::getHeader(string $name): ?string
```

Возвращает первое значение заголовка или `null`, если не установлен.

### getHeaders

```php
public Response::getHeaders(): array
```

Возвращает все заголовки в виде ассоциативного массива `name => [values...]`.

### isHeadersSent

```php
public Response::isHeadersSent(): bool
```

Возвращает `true`, если `end()` уже был вызван.

### redirect

```php
public Response::redirect(string $url, int $code = 302): void
```

Устанавливает заголовок `Location` и код статуса. После этого необходимо вызвать `end()`.

### write

```php
public Response::write(string $data): void
```

Буферизует данные тела ответа. Можно вызывать несколько раз — фрагменты объединяются.

### end

```php
public Response::end(): void
```

Отправляет код статуса, заголовки и буферизованное тело клиенту.
**Обязательно вызвать** для завершения ответа. После `end()` дальнейшие вызовы `write()` или
методов заголовков не имеют эффекта.

## Примеры

### Пример #1 Простой текстовый ответ

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

### Пример #2 JSON API ответ

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

### Пример #3 Установка cookies и редирект

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
    $response->write('С возвращением!');
    $response->end();
});
```

### Пример #4 Множественная запись

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');

    // Несколько вызовов write() — все данные буферизуются и отправляются при end()
    $response->write("Строка 1\n");
    $response->write("Строка 2\n");
    $response->write("Строка 3\n");

    $response->end();
});
```

## Смотрите также

- [FrankenPHP\Request](/ru/docs/reference/frankenphp/request.html) -- Чтение данных запроса
- [FrankenPHP\UploadedFile](/ru/docs/reference/frankenphp/uploaded-file.html) -- Работа с загруженными файлами
- [Руководство по FrankenPHP](/ru/docs/frankenphp.html) -- Установка, конфигурация и развёртывание
