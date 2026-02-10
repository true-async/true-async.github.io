---
layout: docs
lang: ru
path_key: "/docs/concepts/cancellation.html"
nav_active: docs
permalink: /ru/docs/concepts/cancellation.html
page_title: "Отмена"
description: "Отмена корутин в TrueAsync — кооперативная отмена, критические секции protect(), каскадная отмена через Scope, таймауты."
---

# Отмена (Cancellation)

Необходимость отмены асинхронных операций — частая задача.
Допустим, пользователь закрыл страницу, а сервер продолжает составлять ответ.
Логично было бы прервать операцию.

В True Async для этого существует метод `cancel()`.

## Cancellable by design

В True Async действует принцип: корутина по умолчанию может быть отменена в любой момент,
и это не должно нарушать целостность данных.

Причина такого решения проста: большую часть времени приложение занято чтением данных —
из базы, из файлов, по сети. Прервать чтение можно безболезненно,
никаких дополнительных усилий для этого не требуется.

Если же корутина выполняет критическую операцию — например, запись —
это указывается явно. Об этом чуть позже.

## Как работает отмена

Для отмены корутины используется специальное исключение — `Cancellation`.
Корутина отменяется в момент ожидания — будь то вызов `suspend()`, `await()`, `delay()`,
операция ввода-вывода или любая другая блокирующая операция.
Корутине посылается `Cancellation`. Когда выполнение корутины возобновляется, 
она получает это исключение и выбрасывает его в точке остановки.

```php
$coroutine = spawn(function() {
    echo "Начинаю работу\n";
    suspend();
    echo "Этого не будет\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (Async\Cancellation $e) {
    echo "Корутина отменена\n";
    throw $e;
}
```

## Cancellation нельзя подавлять

`Cancellation` — это исключение базового уровня, наравне с `Error` и `Exception`.
Конструкция `catch (Exception $e)` его не перехватит.

Перехватывать `Cancellation` и продолжать работу — ошибка.
Вы можете использовать конструкцию `catch Async\Cancellation` с целью обрабатывания особенных ситуаций, 
но обязаны следить за тем, чтобы корректно выбросить исключение дальше.
В общем случае рекомендуется использовать `finally` для гарантированного освобождения ресурсов:

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## Три сценария отмены

Поведение `cancel()` зависит от состояния корутины:

**Корутина ещё не начала работу** — она никогда не запустится.

```php
$coroutine = spawn(function() {
    echo "Не выполнится\n";
});
$coroutine->cancel();
```

**Корутина находится в ожидании** — она проснётся с исключением `Cancellation`.

```php
$coroutine = spawn(function() {
    echo "Начала работу\n";
    suspend(); // Здесь получит Cancellation
    echo "Не выполнится\n";
});

suspend();
$coroutine->cancel();
```

**Корутина уже завершилась** — ничего не произойдёт.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // Не ошибка, но и не эффект
```

## Критические секции: protect()

Не всякую операцию можно безопасно прервать.
Если корутина списала деньги с одного счёта, но ещё не зачислила на другой —
отмена в этот момент приведёт к потере данных.

Функция `protect()` откладывает отмену до завершения критической секции:

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // Отмена сработает здесь — после выхода из protect()
});

suspend();
$coroutine->cancel();
```

Внутри `protect()` корутина помечается как защищённая.
Если в этот момент приходит `cancel()`, отмена сохраняется,
но не применяется. Как только `protect()` завершается —
отложенная отмена срабатывает немедленно.

## Каскадная отмена через Scope

При отмене `Scope` отменяются все его корутины и все дочерние scope.
Каскад идёт сверху вниз — отмена дочернего scope не затрагивает родителя.

```php
$parent = new Async\Scope();
$child = Async\Scope::inherit($parent);

$parent->spawn(function() {
    suspend();
    echo "Не выполнится\n";
});

$child->spawn(function() {
    suspend();
    echo "Тоже не выполнится\n";
});

suspend();
$parent->cancel(); // Отменяет и parent, и child
```

После отмены scope закрывается — запустить в нём новую корутину уже нельзя.

## Таймауты

Частный случай отмены — тайм-аут. Функция `timeout()` создаёт ограничение по времени:

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "API не ответил за 5 секунд\n";
}
```

`TimeoutException` является подтипом `Cancellation`,
поэтому корутина завершается по тем же правилам.

## Проверка состояния

Корутина предоставляет два метода для проверки отмены:

- `isCancellationRequested()` — отмена запрошена, но ещё не применена
- `isCancelled()` — корутина фактически остановлена

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false — ещё не обработана

suspend();

$coroutine->isCancelled();             // true
```

## Пример: обработчик очереди с graceful shutdown

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void 
    {
        // Все корутины будут остановлены здесь
        $this->scope->cancel();
    }
}
```

## Дальше что?

- [Scope](/ru/docs/concepts/scope.html) — управление группами корутин
- [Корутины](/ru/docs/concepts/coroutines.html) — жизненный цикл корутин
- [Каналы](/ru/docs/concepts/channels.html) — обмен данными между корутинами
