---
layout: docs
lang: uk
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /uk/docs/frankenphp.html
page_title: "FrankenPHP"
description: "Запуск TrueAsync PHP з FrankenPHP — швидкий старт з Docker, збірка з вихідного коду, конфігурація Caddyfile, точка входу асинхронного воркера, плавний перезапуск та усунення неполадок."
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) — це сервер PHP-застосунків, побудований на основі [Caddy](https://caddyserver.com).
Він вбудовує середовище виконання PHP безпосередньо в Go-процес, усуваючи накладні витрати на окремий FastCGI-проксі.

У форку TrueAsync FrankenPHP один потік PHP обробляє **багато запитів одночасно** —
кожен вхідний HTTP-запит отримує власну корутину, а планувальник TrueAsync перемикається між ними,
поки вони очікують на введення/виведення.

```
Traditional FPM / regular FrankenPHP:
  1 request → 1 thread  (blocked during I/O)

TrueAsync FrankenPHP:
  N requests → 1 thread  (coroutines, non-blocking I/O)
```

## Швидкий старт — Docker

Найшвидший спосіб спробувати — використати готовий Docker-образ:

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

Відкрийте [http://localhost:8080](http://localhost:8080) — ви побачите панель моніторингу з версією PHP,
активними корутинами, пам'яттю та часом роботи.

### Доступні теги образів

| Тег | Опис |
|-----|------|
| `latest-frankenphp` | Остання стабільна версія, останній PHP |
| `latest-php8.6-frankenphp` | Остання стабільна версія, PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | Конкретний реліз |

### Запуск власного PHP-застосунку

Змонтуйте каталог застосунку та надайте власний `Caddyfile`:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## Встановлення з вихідного коду

Збірка з вихідного коду дає вам нативний бінарний файл `frankenphp` поряд із бінарним файлом `php`.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Або інтерактивно — майстер запитає про FrankenPHP під час вибору набору розширень.

Для збірки потрібен Go 1.26+. Якщо він не знайдений, інсталятор автоматично завантажує та використовує його, не впливаючи на вашу системну інсталяцію.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Go встановлюється через Homebrew за потреби.

### Що встановлюється

Після успішної збірки обидва бінарні файли розміщуються в `$INSTALL_DIR/bin/`:

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # FrankenPHP server binary
```

## Конфігурація Caddyfile

FrankenPHP налаштовується через `Caddyfile`. Мінімальна конфігурація для асинхронного воркера TrueAsync:

```txt
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

### Глобальні директиви `frankenphp`

| Директива | Опис |
|-----------|------|
| `num_threads N` | Загальний розмір пулу PHP-потоків. За замовчуванням `2 × кількість ядер CPU`. Усі воркери спільно використовують цей пул |

### Ключові директиви воркера

| Директива | Опис |
|-----------|------|
| `file` | Шлях до PHP-скрипта точки входу |
| `num` | Кількість PHP-потоків, призначених цьому воркеру. Почніть з `1` і налаштовуйте залежно від CPU-навантаження |
| `async` | **Обов'язково** — вмикає режим корутин TrueAsync |
| `drain_timeout` | Період очікування для активних запитів під час плавного перезапуску (за замовчуванням `30s`) |
| `match` | URL-шаблон, який обробляє цей воркер |

### Кілька воркерів

Ви можете запускати різні точки входу для різних маршрутів:

```txt
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

## Написання точки входу

Точка входу — це довготривалий PHP-скрипт. Він реєструє callback-обробник запитів і передає керування `FrankenPHP`, який блокується до завершення роботи сервера.

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

### Об'єкт Request

Усі дані запиту отримуються з Go-об'єкта `http.Request` через CGO — без SAPI-глобалів, безпечно для паралельних корутин.

| Метод | Повертає | Опис |
|-------|----------|------|
| `getMethod()` | `string` | HTTP-метод (`GET`, `POST` тощо) |
| `getUri()` | `string` | Повний URI запиту з рядком запиту |
| `getHeader(string $name)` | `?string` | Значення окремого заголовка або `null` |
| `getHeaders()` | `array` | Усі заголовки у вигляді `name => value` (кілька значень об'єднуються через `, `) |
| `getBody()` | `string` | Повне тіло запиту (зчитується один раз) |
| `getQueryParams()` | `array` | Розібрані та URL-декодовані параметри рядка запиту |
| `getCookies()` | `array` | Розібрані та URL-декодовані cookies із заголовка `Cookie` |
| `getHost()` | `string` | Значення заголовка Host |
| `getRemoteAddr()` | `string` | Адреса клієнта (`ip:port`) |
| `getScheme()` | `string` | `http` або `https` |
| `getProtocolVersion()` | `string` | Протокол (`HTTP/1.1`, `HTTP/2.0`) |
| `getParsedBody()` | `array` | Поля форми (urlencoded + multipart) |
| `getUploadedFiles()` | `array` | Завантажені файли як об'єкти `UploadedFile` |

### Об'єкт Response

Заголовки та статус зберігаються в самому об'єкті (не в SAPI-глобалах), серіалізуються та надсилаються в Go одним CGO-викликом при `end()`.

| Метод | Повертає | Опис |
|-------|----------|------|
| `setStatus(int $code)` | `void` | Встановити HTTP-код статусу (за замовчуванням 200) |
| `getStatus()` | `int` | Отримати поточний код статусу |
| `setHeader(string $name, string $value)` | `void` | Встановити заголовок (замінює існуючий) |
| `addHeader(string $name, string $value)` | `void` | Додати заголовок (для `Set-Cookie` тощо) |
| `removeHeader(string $name)` | `void` | Видалити заголовок |
| `getHeader(string $name)` | `?string` | Отримати перше значення заголовка або `null` |
| `getHeaders()` | `array` | Усі заголовки у вигляді `name => [values...]` |
| `isHeadersSent()` | `bool` | Чи було викликано `end()` |
| `redirect(string $url, int $code = 302)` | `void` | Встановити заголовок Location + статус |
| `write(string $data)` | `void` | Буферизувати тіло відповіді (можна викликати кілька разів) |
| `end()` | `void` | Надіслати статус + заголовки + тіло клієнту. **Обов'язково викликати.** |

> **Важливо:** завжди викликайте `end()`, навіть коли тіло відповіді порожнє. `write()` буферизує дані
> в PHP-об'єкті; `end()` серіалізує заголовки + тіло та копіює їх у Go одним CGO-викликом.
> Пропуск `end()` призведе до зависання запиту.

### Об'єкт UploadedFile

`getUploadedFiles()` повертає об'єкти `FrankenPHP\UploadedFile`. Go розбирає multipart через `http.Request.ParseMultipartForm`, зберігає файли у тимчасовий каталог і передає метадані в PHP.

| Метод | Повертає | Опис |
|-------|----------|------|
| `getName()` | `string` | Оригінальне ім'я файлу |
| `getType()` | `string` | MIME-тип |
| `getSize()` | `int` | Розмір файлу в байтах |
| `getTmpName()` | `string` | Шлях до тимчасового файлу |
| `getError()` | `int` | Код помилки завантаження (`UPLOAD_ERR_OK` = 0) |
| `moveTo(string $path)` | `bool` | Перемістити файл до вказаного місця (rename або copy+delete) |

Кілька файлів для одного поля повертаються як масив об'єктів `UploadedFile`.

### Приклад: cookies та редирект

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

### Приклад: завантаження файлів

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

### Асинхронний I/O всередині обробника

Оскільки кожен запит виконується у власній корутині, ви можете вільно використовувати блокуючі виклики I/O —
вони поступляться корутиною замість блокування потоку:

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

### Створення додаткових корутин

Обробник сам по собі вже є корутиною, тому ви можете використовувати `spawn()` для дочірніх завдань:

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

## Налаштування продуктивності

### Кількість потоків воркера (`num`)

Кожен PHP-потік запускає один цикл планувальника TrueAsync. Один потік вже обробляє тисячі
одночасних I/O-запитів через корутини. Додавайте більше потоків лише тоді, коли у вас є CPU-інтенсивна робота,
яка виграє від справжньої паралельності (кожен потік працює в окремому потоці ОС завдяки ZTS).

Рекомендовані початкові значення:

```
I/O-heavy API:   num 1–2
Mixed workload:  num = number of CPU cores / 2
CPU-heavy:       num = number of CPU cores
```

## Плавний перезапуск

Асинхронні воркери підтримують **green-blue перезапуски** — код перезавантажується без втрати активних запитів.

Коли ініціюється перезапуск (через admin API, спостерігач файлів або перезавантаження конфігурації):

1. Старі потоки **від'єднуються** — нові запити до них більше не направляються.
2. Активні запити отримують період очікування (`drain_timeout`, за замовчуванням `30s`) для завершення.
3. Старі потоки завершуються та звільняють свої ресурси (notifier, канали).
4. Нові потоки запускаються з оновленим PHP-кодом.

Під час вікна очікування нові запити отримують `HTTP 503`. Щойно нові потоки будуть готові, трафік відновлюється у звичайному режимі.

### Запуск через Admin API

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

Admin API Caddy за замовчуванням слухає на `localhost:2019`. Щоб увімкнути його, видаліть `admin off` з
глобального блоку (або обмежте його до localhost):

```txt
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Налаштування drain timeout

```txt
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## Перевірка встановлення

```bash
# Version
frankenphp version

# Start with a config
frankenphp run --config /etc/caddy/Caddyfile

# Validate the Caddyfile without starting
frankenphp adapt --config /etc/caddy/Caddyfile
```

Перевірка активності TrueAsync з PHP:

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## Модель виконання

FrankenPHP із TrueAsync використовує модель виконання, що принципово відрізняється від традиційного PHP:

1. **Один потік -- багато запитів.** Кожен PHP-потік запускає цикл подій (event loop) TrueAsync. Вхідні HTTP-запити стають корутинами всередині цього циклу.
2. **Неблокуючий I/O.** Коли корутина виконує операцію вводу/виводу (мережа, файли, БД), вона автоматично поступається управлінням планувальнику, який перемикається на іншу готову корутину.
3. **Справжня паралельність через ZTS.** Якщо налаштовано кілька потоків (`num > 1`), кожен потік працює в окремому потоці ОС завдяки Zend Thread Safety. Це дозволяє обробляти CPU-інтенсивні завдання паралельно.
4. **Ізольований стан запиту.** Кожна корутина має власний контекст -- об'єкти `Request` та `Response` не залежать від глобального стану SAPI, що забезпечує безпеку при одночасному виконанні.
5. **Один CGO-виклик на відповідь.** Заголовки, статус та тіло відповіді буферизуються в PHP і надсилаються в Go одним викликом при `end()`, мінімізуючи накладні витрати на перетин кордону Go/PHP.

## Усунення неполадок

### Запити не потрапляють до PHP-обробника

Переконайтеся, що воркер має увімкнений `async` **і** що matcher Caddy направляє трафік до нього.
Без `match *` (або конкретного шаблону) жоден запит не потрапить до асинхронного воркера.

### `undefined reference to tsrm_*` під час збірки

PHP було скомпільовано з `--enable-embed=shared`. Перезберіть без `=shared`:

```bash
./configure --enable-embed --enable-zts --enable-async ...
```

### Запити отримують `HTTP 503`

Усі PHP-потоки зайняті та активний період очікування (вікно drain під час перезапуску),
або черга потоків перевантажена. Збільшіть `num`, щоб додати більше потоків, або зменшіть `drain_timeout`,
якщо деплої тривають надто довго.

## Налагодження з Delve

Go 1.25+ генерує налагоджувальну інформацію **DWARF v5**. Якщо Delve повідомляє про помилку сумісності, перезберіть
з DWARF v4:

```bash
GOEXPERIMENT=nodwarf5 go build -tags "trueasync,nowatcher" -o frankenphp ./caddy/frankenphp
```

Запустіть налагоджувач:

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv exec ./frankenphp
```

## Вихідний код

| Репозиторій | Опис |
|-------------|------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | Форк TrueAsync FrankenPHP (гілка `true-async`) |
| [true-async/releases](https://github.com/true-async/releases) | Docker-образи, інсталятори, конфігурація збірки |

Для детального огляду внутрішньої роботи інтеграції Go та PHP дивіться сторінку [Архітектура FrankenPHP](/uk/architecture/frankenphp.html).
