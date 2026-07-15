---
layout: docs
lang: uk
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /uk/docs/server/workers.html
page_title: "TrueAsync Server: multi-worker і bootloader"
description: "setWorkers(N): вбудований пул потоків на Async\\ThreadPool. Bootloader, SO_REUSEPORT, per-request scope, request_context()."
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server за замовчуванням працює в **single-threaded** режимі: один event-loop, один потік,
весь pipeline (accept → parse → dispatch → respond) на одному CPU. Це найшвидша модель для
типових IO-bound навантажень, але не масштабується за ядрами.

`setWorkers(N)` піднімає вбудований пул з N OS-потоків через
[`Async\ThreadPool`](/uk/docs/components/thread-pool.html). Кожен воркер re-bind'ить ті самі listeners,
ядро (Linux/BSD) розподіляє accept через `SO_REUSEPORT`. У кожного воркера власний незалежний
event-loop, власний opcache, власні пули з'єднань.

## Базовий приклад

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['pid' => getmypid()]);
});

$server->start();   // блокує, поки всі воркери не завершаться
```

`HttpServer::start()` у батьку:

1. Спавнить `Async\ThreadPool` потрібного розміру.
2. Через `transfer_obj` копіює config + набір обробників у кожен воркер.
3. Усередині воркера запускає event-loop, який re-bind'ить listeners.
4. Батько `await`ить завершення всіх воркерів.

## Graceful shutdown

`HttpServer::stop()` працює на батьку пула. Він виводить на пенсію всю когорту і **призупиняється,
поки сервер справді не зупиниться** — коли він повертає керування, воркери дренувалися, пул
розібрано, а listen-сокети закрито. Викликайте його з корутини; sig-handler — звичне для цього
місце:

```php
use function Async\spawn;
use function Async\await;
use function Async\signal;
use Async\Signal;

spawn(function () use ($server) {
    await(signal(Signal::SIGTERM));

    $server->stop();       // повертає керування, коли пул справді зупинено
});

$server->start();
```

На **standalone**-сервері (`setWorkers(1)`, за замовчуванням) `stop()` не призупиняється: його
зазвичай викликають з обробника запиту, а shutdown-drain чекає саме цього обробника — тож
блокувальний `stop()` там чекав би сам на себе.

## Hot reload

`HttpServer::reload()` замінює когорту воркерів, не роняючи жодного з'єднання: воркери
доопрацьовують те, що тримають, зупиняються й виходять, а свіжі воркер-потоки заново запускають
bootloader — підхоплюючи змінений код — і перебирають на себе роботу на **тих самих
listen-сокетах**. Він призупиняється, поки стара когорта не дренується; `start()` увесь цей час
продовжує працювати. Лише на батьку пула.

Ви рідко викликаєте його самі. Замість цього під'єднайте тригер:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        require __DIR__ . '/app/bootstrap.php';   // заново запускається в кожному свіжому воркері
    })

    // розробка: стежити за деревом і робити reload, коли зміни вляжуться
    ->enableHotReload([__DIR__ . '/app'], ['php'], debounceMs: 300, maxHoldMs: 2000)

    // production: reload на SIGHUP, який шле deploy-скрипт
    ->enableReloadOnSignal();
```

`enableHotReload()` стежить за кожним шляхом рекурсивно. Сплеск змін, що вляглися, інвалідовує
відстежувані дерева в opcache і викликає `reload()`. `debounceMs` — тихе вікно перед тим, як
сплеск запустить один reload; `maxHoldMs` форсує reload щонайпізніше через стільки після першої
зміни, тож директорія, яка ніколи не затихає, все одно перезавантажиться. `enableReloadOnSignal()`
ставить постійний SIGHUP-handler (не підтримується на Windows).

Обидва — лише в pool-режимі. Хай який тригер, код, який підхоплять нові воркери, — це те, що
завантажує bootloader, тож усе, що ви хочете перезавантажувати, має завантажуватися **там**, а не
на верхівці entry-скрипта, який виконується один раз у батьку і більше ніколи.

> Якщо ви викликаєте `reload()` вручну, спершу інвалідуйте змінені файли
> (`opcache_invalidate()`) або покладіться на opcache timestamp validation — інакше свіжі воркери
> скомпілюють старий код.

## Bootloader

Важка ініціалізація воркера (autoload, прогрів пулів, JIT-warmup) має виконуватися **один раз**
при старті, а не на кожен запит. Для цього є `setBootloader(?\Closure $cb)`:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // виконується в кожному воркері один раз перед таск-loop
        require __DIR__ . '/vendor/autoload.php';

        // прогрів пулу з'єднань
        Database::initPool(min: 4, max: 16);

        // прекомпіляція критичних роутів
        Router::compile();
    });
```

Замикання deep-copy'ється один раз і запускається в кожному воркері до того, як той починає
приймати завдання. **Кинутий у bootloader виняток фейлить увесь пул**: воркер не стартує.

Застосовується лише при `setWorkers() > 1`. `null` знімає bootloader.

> Потребує TrueAsync ABI v0.15+. Тест: `server/core/021-bootloader.phpt`.

## Per-request scope

З 0.6.5 кожна handler-корутина виконується **у власному scope**, дочірньому до серверного scope.
Це дає дві важливі семантики:

- [`Async\request_context()`](/uk/docs/reference/request-context.html) спільний контекст по всьому
  дереву корутин запиту (handler і дочірні `spawn`'и).
- [`Async\current_context()`](/uk/docs/reference/current-context.html) лишається per-coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // Контекст бачить уся гілка корутин запиту
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\await_all([
        spawn(fn() => fetchUser()),   // request_id видно тут
        spawn(fn() => fetchPosts()),  // і тут
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Порівняйте: `current_context()` створює значення, видимі **лише** в поточній корутині;
`request_context()` дає спільне sub-tree, прив'язане до scope запиту.

Дочірній scope коштує дві алокації на запит. `setRequestScope(false)` прибирає його і
переуживає connection-scope напряму — але тоді `request_context()` повертає `null`, тож беріть
`?->`, якщо вимикаєте його.

## SO_REUSEPORT і балансування

На Linux/BSD ядро рівномірно (але недетерміновано) розподіляє вхідні з'єднання між усіма
сокетами, відкритими з `SO_REUSEPORT` на той самий `(host, port)`. Кожен воркер відкриває свій;
жодного userspace-load-balancer'а не потрібно, жодних блокувань.

На Windows `SO_REUSEPORT`-еквівалент менш передбачуваний; перенесіть балансування вище (LB) або
використовуйте single-worker + N процесів з різними портами.

## Cross-thread transfer обробників

Якщо конфігурація піднімається в одному потоці, а сервер запускається в іншому, `HttpServer`
підтримує transfer. З 0.2.0 transfer-шлях коректно переносить маски протоколів (баг
"silently dropped every request" виправлено; див. CHANGELOG `core/007-server-transfer-handler-dispatch.phpt`).

## Налагодження багатопотокового режиму

Loud-логування на несподіваний exit воркера додано в 0.6.3. Uncaught `$server->start()` винятки
і clean returns поки await-loop ще чекає воркерів тепер видно в stderr (раніше кожен випадок тихо
ронив 1/N accept-capacity без сигналу оператору).

Увімкніть INFO-логування:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::INFO],
]);
```

> **Не використовуйте `setLogStream()` під пулом воркерів.** PHP stream-ресурс, відкритий
> батьком, не може перетнути межу воркер-потоку: sink лишається активним на батьку і
> пропускається у воркерах, з повідомленням при старті. Використовуйте sink, який кожен воркер
> може відкрити сам — `stderr`, `stdout` або `file` (кожен воркер переоткриває шлях у режимі
> append). Див. [Спостережуваність](/uk/docs/server/observability.html).

## Скільки воркерів?

Правило великого пальця:

- **IO-bound** (стандартний web з БД/HTTP): починати з `available_parallelism()`,
  дивитися на CPU util.
- **CPU-bound** (рендеринг, compression-heavy, big JSON): `available_parallelism()` або менше,
  дивитися на p99 latency.
- **Mixed**: оверкомміт на 1–2 воркери (`N+1` або `N+2`) часто дає кращу утилізацію ядер на IO-stall.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` повертає число CPU, доступних процесу (враховує cgroup quota
> і affinity). Backed by `uv_available_parallelism` з fallback на `uv_cpu_info`.

## Див. також

- [`HttpServerConfig::setWorkers()`](/uk/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/uk/docs/reference/server/http-server-config.html#setbootloader)
- [Спостережуваність](/uk/docs/server/observability.html): cross-worker статистика, логування під пулом
- [`Async\ThreadPool`](/uk/docs/components/thread-pool.html): внутрішня будова пулу
- [`Async\request_context()`](/uk/docs/reference/request-context.html)
- [Backpressure / drain](/uk/docs/server/configuration.html#graceful-drain-step-8)
