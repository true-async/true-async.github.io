---
layout: docs
lang: ru
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /ru/docs/server/workers.html
page_title: "TrueAsync Server: multi-worker и bootloader"
description: "setWorkers(N): встроенный пул потоков на Async\\ThreadPool. Bootloader, SO_REUSEPORT, per-request scope, request_context()."
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server по умолчанию работает в **single-threaded** режиме: один event-loop, один поток,
весь pipeline (accept → parse → dispatch → respond) на одном CPU. Это самая быстрая модель для
типичных IO-bound нагрузок, но не масштабируется по ядрам.

`setWorkers(N)` поднимает встроенный пул из N OS-потоков через
[`Async\ThreadPool`](/ru/docs/components/thread-pool.html). Каждый воркер re-bind'ит те же listeners,
ядро (Linux/BSD) распределяет accept через `SO_REUSEPORT`. У каждого воркера свой независимый
event-loop, свой opcache, свои пулы соединений.

## Базовый пример

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['pid' => getmypid(), 'tid' => /* TID */]);
});

$server->start();   // блокирует, пока все воркеры не завершатся
```

`HttpServer::start()` в родителе:

1. Спавнит `Async\ThreadPool` нужного размера.
2. Через `transfer_obj` копирует config + набор обработчиков в каждый воркер.
3. Внутри воркера запускает event-loop, который re-bind'ит listeners.
4. Родитель `await`ит завершение всех воркеров.

Cross-thread `stop()` пока в roadmap; остановка работает через SIGINT/SIGTERM либо штатное
истощение работы.

## Bootloader

Тяжёлая инициализация воркера (autoload, прогрев пулов, JIT-warmup) должна выполняться **один раз**
при старте, а не на каждый запрос. Для этого есть `setBootloader(?\Closure $cb)`:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // выполняется в каждом воркере один раз перед таск-loop
        require __DIR__ . '/vendor/autoload.php';

        // прогрев пула соединений
        Database::initPool(min: 4, max: 16);

        // прекомпиляция критических роутов
        Router::compile();
    });
```

Замыкание deep-copy'ится один раз и запускается на каждом воркере до того, как тот начинает
принимать задачи. **Брошенное в bootloader исключение фейлит весь пул**: воркер не стартует.

Применяется только при `setWorkers() > 1`. `null` снимает bootloader.

> Требует TrueAsync ABI v0.15+. Тест: `server/core/021-bootloader.phpt`.

## Per-request scope

С 0.6.5 каждая handler-корутина выполняется **в собственном scope**, дочернем для серверного scope.
Это даёт две важные семантики:

- [`Async\request_context()`](/ru/docs/reference/request-context.html) общий контекст по всему
  дереву корутин запроса (handler и дочерние `spawn`'ы).
- [`Async\current_context()`](/ru/docs/reference/current-context.html) остаётся per-coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // Контекст видит вся ветка корутин запроса
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\all([
        spawn(fn() => fetchUser()),   // request_id виден здесь
        spawn(fn() => fetchPosts()),  // и здесь
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Сравните: `current_context()` создаёт значения, видимые **только** в текущей корутине;
`request_context()` даёт общий sub-tree, привязанный к scope запроса.

## SO_REUSEPORT и балансировка

На Linux/BSD ядро равномерно (но недетерминированно) распределяет входящие соединения по всем
сокетам, открытым с `SO_REUSEPORT` на тот же `(host, port)`. Каждый воркер открывает свой;
никакой userspace-load-balancer не нужен, никаких блокировок.

На Windows `SO_REUSEPORT`-эквивалент менее предсказуем; перенесите балансировку выше (LB) либо
используйте single-worker + N процессов с разными портами.

## Cross-thread transfer обработчиков

Если конфигурация поднимается в одном потоке, а сервер запускается в другом, `HttpServer`
поддерживает transfer. С 0.2.0 transfer-путь корректно переносит маски протоколов (баг
"silently dropped every request" исправлен; см. CHANGELOG `core/007-server-transfer-handler-dispatch.phpt`).

## Отладка многопоточного режима

Loud-логирование на неожиданный exit воркера добавлено в 0.6.3. Uncaught `$server->start()` исключения
и clean returns пока await-loop ещё ждёт воркеров теперь видны в stderr (раньше каждый случай тихо
ронял 1/N accept-capacity без сигнала оператору).

Включите INFO-логирование:

```php
$config
    ->setLogSeverity(\TrueAsync\LogSeverity::INFO)
    ->setLogStream(STDERR);
```

## Сколько воркеров?

Правило большого пальца:

- **IO-bound** (стандартный web с БД/HTTP): начинать с `available_parallelism()`,
  смотреть на CPU util.
- **CPU-bound** (рендеринг, compression-heavy, big JSON): `available_parallelism()` или меньше,
  смотреть на p99 latency.
- **Mixed**: оверкоммит на 1–2 воркера (`N+1` или `N+2`) часто даёт лучшую утилизацию ядер на IO-stall.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` возвращает число CPU, доступных процессу (учитывает cgroup quota
> и affinity). Backed by `uv_available_parallelism` с fallback на `uv_cpu_info`.

## См. также

- [`HttpServerConfig::setWorkers()`](/ru/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/ru/docs/reference/server/http-server-config.html#setbootloader)
- [`Async\ThreadPool`](/ru/docs/components/thread-pool.html): внутренности пула
- [`Async\request_context()`](/ru/docs/reference/request-context.html)
- [Backpressure / drain](/ru/docs/server/configuration.html#graceful-drain-step-8)
