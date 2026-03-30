---
layout: docs
lang: ru
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /ru/docs/frankenphp.html
page_title: "FrankenPHP"
description: "Запуск TrueAsync PHP с FrankenPHP — быстрый старт с Docker, сборка из исходников, конфигурация Caddyfile, асинхронный воркер, плавный перезапуск и устранение неполадок."
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) — это сервер приложений PHP, построенный на основе [Caddy](https://caddyserver.com).
Он встраивает среду выполнения PHP непосредственно в Go-процесс, устраняя накладные расходы на отдельный FastCGI-прокси.

В форке TrueAsync FrankenPHP один PHP-поток обрабатывает **множество запросов одновременно** —
каждый входящий HTTP-запрос получает собственную корутину, а планировщик TrueAsync переключается между ними,
пока они ожидают ввод-вывод.

```
Традиционный FPM / обычный FrankenPHP:
  1 запрос → 1 поток  (заблокирован во время I/O)

TrueAsync FrankenPHP:
  N запросов → 1 поток  (корутины, неблокирующий I/O)
```

## Быстрый старт — Docker

Самый быстрый способ попробовать — использовать готовый Docker-образ:

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

Откройте [http://localhost:8080](http://localhost:8080) — вы увидите панель мониторинга с версией PHP,
активными корутинами, памятью и временем работы.

### Доступные теги образов

| Тег | Описание |
|-----|----------|
| `latest-frankenphp` | Последний стабильный релиз, последняя версия PHP |
| `latest-php8.6-frankenphp` | Последний стабильный релиз, PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | Конкретный релиз |

### Запуск собственного PHP-приложения

Смонтируйте каталог приложения и укажите собственный `Caddyfile`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## Установка из исходников

Сборка из исходников даёт нативный бинарник `frankenphp` наряду с бинарником `php`.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Или в интерактивном режиме — мастер установки спросит о FrankenPHP в процессе выбора пресета расширений.

Для сборки требуется Go 1.26+. Если он не найден, установщик автоматически скачает и использует его,
не затрагивая системную установку.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Go устанавливается через Homebrew при необходимости.

### Что устанавливается

После успешной сборки оба бинарника размещаются в `$INSTALL_DIR/bin/`:

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # Бинарник сервера FrankenPHP
```

## Конфигурация Caddyfile

FrankenPHP настраивается через `Caddyfile`. Минимальная конфигурация для асинхронного воркера TrueAsync:

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

### Глобальные директивы `frankenphp`

| Директива | Описание |
|-----------|----------|
| `num_threads N` | Общий размер пула PHP-потоков. По умолчанию `2 × количество ядер CPU`. Все воркеры разделяют этот пул |

### Ключевые директивы воркера

| Директива | Описание |
|-----------|----------|
| `file` | Путь к PHP-скрипту точки входа |
| `num` | Количество PHP-потоков, выделенных этому воркеру. Начните с `1` и настраивайте в зависимости от CPU-нагрузки |
| `async` | **Обязательно** — включает режим корутин TrueAsync |
| `drain_timeout` | Период ожидания для активных запросов при плавном перезапуске (по умолчанию `30s`) |
| `match` | URL-шаблон, обрабатываемый этим воркером |

### Несколько воркеров

Вы можете запускать разные точки входа для разных маршрутов:

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

## Написание точки входа

Точка входа — это долгоживущий PHP-скрипт. Он регистрирует callback-обработчик запросов и затем
передаёт управление `FrankenPHP`, который блокируется до остановки сервера.

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

### Объект Request

Все данные запроса извлекаются из Go-объекта `http.Request` через CGO — без SAPI-глобалов, безопасно для параллельных корутин.

| Метод | Возврат | Описание |
|-------|---------|----------|
| `getMethod()` | `string` | HTTP-метод (`GET`, `POST` и т.д.) |
| `getUri()` | `string` | Полный URI запроса с query string |
| `getHeader(string $name)` | `?string` | Значение одного заголовка или `null` |
| `getHeaders()` | `array` | Все заголовки в виде `name => value` (множественные значения объединяются через `, `) |
| `getBody()` | `string` | Полное тело запроса (читается один раз) |
| `getQueryParams()` | `array` | Разобранные и декодированные параметры query string |
| `getCookies()` | `array` | Разобранные и декодированные cookies из заголовка `Cookie` |
| `getHost()` | `string` | Значение заголовка Host |
| `getRemoteAddr()` | `string` | Адрес клиента (`ip:port`) |
| `getScheme()` | `string` | `http` или `https` |
| `getProtocolVersion()` | `string` | Протокол (`HTTP/1.1`, `HTTP/2.0`) |
| `getParsedBody()` | `array` | Поля формы (urlencoded + multipart) |
| `getUploadedFiles()` | `array` | Загруженные файлы в виде объектов `UploadedFile` |

### Объект Response

Заголовки и статус хранятся в самом объекте (не в SAPI-глобалах), сериализуются и отправляются в Go одним CGO-вызовом при `end()`.

| Метод | Возврат | Описание |
|-------|---------|----------|
| `setStatus(int $code)` | `void` | Установить HTTP-статус (по умолчанию 200) |
| `getStatus()` | `int` | Получить текущий код статуса |
| `setHeader(string $name, string $value)` | `void` | Установить заголовок (заменяет существующий) |
| `addHeader(string $name, string $value)` | `void` | Добавить заголовок (для `Set-Cookie` и т.д.) |
| `removeHeader(string $name)` | `void` | Удалить заголовок |
| `getHeader(string $name)` | `?string` | Получить первое значение заголовка или `null` |
| `getHeaders()` | `array` | Все заголовки в виде `name => [values...]` |
| `isHeadersSent()` | `bool` | Был ли уже вызван `end()` |
| `redirect(string $url, int $code = 302)` | `void` | Установить заголовок Location + статус |
| `write(string $data)` | `void` | Буферизовать тело ответа (можно вызывать несколько раз) |
| `end()` | `void` | Отправить статус + заголовки + тело клиенту. **Обязательно вызвать.** |

> **Важно:** всегда вызывайте `end()`, даже если тело ответа пустое. `write()` буферизует данные
> в PHP-объекте; `end()` сериализует заголовки и тело и копирует их в Go одним CGO-вызовом.
> Пропуск `end()` приведёт к зависанию запроса.

### Объект UploadedFile

`getUploadedFiles()` возвращает объекты `FrankenPHP\UploadedFile`. Go разбирает multipart через `http.Request.ParseMultipartForm`, сохраняет файлы во временный каталог и передаёт метаданные в PHP.

| Метод | Возврат | Описание |
|-------|---------|----------|
| `getName()` | `string` | Оригинальное имя файла |
| `getType()` | `string` | MIME-тип |
| `getSize()` | `int` | Размер файла в байтах |
| `getTmpName()` | `string` | Путь к временному файлу |
| `getError()` | `int` | Код ошибки загрузки (`UPLOAD_ERR_OK` = 0) |
| `moveTo(string $path)` | `bool` | Переместить файл (rename или copy+delete) |

Несколько файлов для одного поля возвращаются как массив объектов `UploadedFile`.

### Пример: cookies и редирект

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    // Чтение cookies из запроса
    $cookies = $request->getCookies();

    if (!isset($cookies['session'])) {
        // Установка нескольких cookies
        $response->addHeader('Set-Cookie', 'session=abc123; Path=/; HttpOnly');
        $response->addHeader('Set-Cookie', 'theme=dark; Path=/');
        $response->redirect('/welcome');
        $response->end();
        return;
    }

    // Параметры query string
    $params = $request->getQueryParams();
    $name = $params['name'] ?? 'World';

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello, {$name}!");
    $response->end();
});
```

### Пример: загрузка файлов

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

### Асинхронный I/O внутри обработчика

Поскольку каждый запрос выполняется в собственной корутине, вы можете свободно использовать блокирующие I/O-вызовы —
они приостановят корутину вместо блокировки потока:

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

### Создание дополнительных корутин

Сам обработчик уже является корутиной, поэтому вы можете порождать дочерние задачи с помощью `spawn()`:

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

## Настройка производительности

### Количество потоков воркера (`num`)

Каждый PHP-поток запускает один цикл планировщика TrueAsync. Один поток уже способен обрабатывать тысячи
одновременных I/O-запросов через корутины. Добавляйте больше потоков только при наличии CPU-интенсивной работы,
которая выигрывает от настоящего параллелизма (каждый поток работает в отдельном потоке ОС благодаря ZTS).

Хорошая отправная точка:

```
I/O-нагруженный API:   num 1–2
Смешанная нагрузка:    num = количество ядер CPU / 2
CPU-нагруженный:       num = количество ядер CPU
```

## Плавный перезапуск

Асинхронные воркеры поддерживают **сине-зелёный перезапуск** — код перезагружается без потери активных запросов.

При инициации перезапуска (через Admin API, отслеживание файлов или перезагрузку конфигурации):

1. Старые потоки **отсоединяются** — новые запросы к ним не направляются.
2. Активные запросы получают период ожидания (`drain_timeout`, по умолчанию `30s`) для завершения.
3. Старые потоки останавливаются и освобождают свои ресурсы (нотификатор, каналы).
4. Новые потоки запускаются с обновлённым PHP-кодом.

Во время периода ожидания новые запросы получают `HTTP 503`. Как только новые потоки готовы, трафик возобновляется в штатном режиме.

### Запуск через Admin API

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

Admin API Caddy по умолчанию слушает на `localhost:2019`. Чтобы включить его, удалите `admin off` из
глобального блока (или ограничьте доступ localhost):

```caddyfile
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Настройка drain timeout

```caddyfile
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## Проверка установки

```bash
# Версия
frankenphp version

# Запуск с конфигурацией
frankenphp run --config /etc/caddy/Caddyfile

# Проверка Caddyfile без запуска
frankenphp adapt --config /etc/caddy/Caddyfile
```

Проверка того, что TrueAsync активен из PHP:

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## Модель выполнения

- Каждый асинхронный поток использует буферизованный канал с 1 слотом (по умолчанию). Установите `buffer_size`, чтобы увеличить очередь запросов на поток (максимум 10). Если все потоки заняты и все буферы заполнены, клиент получает `503 (ErrAllBuffersFull)`.
- Запросы будят планировщик PHP через нотификатор (`eventfd` на Linux, `pipe` на других платформах) плюс быстрый путь через heartbeat для снижения задержки пробуждения.
- `Response::write()` буферизует данные в PHP-объекте. `end()` сериализует заголовки и тело и копирует их в Go одним CGO-вызовом. Всегда вызывайте `end()`, даже для пустого тела.
- При завершении работы в очередь отправляется sentinel-значение; цикл PHP освобождает ожидающие записи и восстанавливает heartbeat-обработчик.

## Устранение неполадок

### Запросы не доходят до PHP-обработчика

Убедитесь, что у воркера включён `async` **и** что маршрутизатор Caddy направляет трафик к нему.
Без `match *` (или конкретного шаблона) запросы не попадают в асинхронный воркер.

### `undefined reference to tsrm_*` при сборке

PHP был скомпилирован с `--enable-embed=shared`. Пересоберите без `=shared`:

```bash
./configure --enable-embed --enable-zts --enable-async ...
```

### Запросы получают `HTTP 503`

Все PHP-потоки заняты и активен период ожидания (окно завершения при перезапуске),
либо очередь потоков переполнена. Увеличьте `num`, чтобы добавить больше потоков, или уменьшите `drain_timeout`,
если деплои занимают слишком много времени.

## Отладка с Delve

Go 1.25+ генерирует отладочную информацию **DWARF v5**. Если Delve сообщает об ошибке совместимости, пересоберите
с DWARF v4:

```bash
GOEXPERIMENT=nodwarf5 go build -tags "trueasync,nowatcher" -o frankenphp ./caddy/frankenphp
```

Запуск отладчика:

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv exec ./frankenphp
```

## Исходный код

| Репозиторий | Описание |
|-------------|----------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | Форк FrankenPHP для TrueAsync (ветка `true-async`) |
| [true-async/releases](https://github.com/true-async/releases) | Docker-образы, установщики, конфигурация сборки |

Для подробного изучения внутренней работы интеграции Go и PHP смотрите страницу
[Архитектура FrankenPHP](/ru/architecture/frankenphp.html).
