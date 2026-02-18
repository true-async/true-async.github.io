---
layout: docs
lang: ru
path_key: "/docs/concepts/cancellation.html"
nav_active: docs
permalink: /ru/docs/concepts/cancellation.html
page_title: "Отмена"
description: "Отмена корутин в TrueAsync — кооперативная отмена, критические секции protect(), каскадная отмена через Scope, таймауты."
---

# Cancellation

Браузер послал запрос, но после пользователь закрыл страницу. 
Сервер продолжает работать над запросом, который не нужен.
Хорошо было бы прервать операцию, чтобы избежать ненужных затрат.
Или пусть есть длительный процесс копирования данных, который требуется внезапно отменить.
Существует много сценариев, когда требуется остановить выполнение операций. 
Обычно данную задача решают с помощью переменных флагов или токенов отмены, что достаточно трудоёмко. Код должен знать, 
о том, что его отменят, должен продумать точки контроля отмены и корректно обрабатывать эти ситуации. 

## Cancellable by design

Большую часть времени приложение занято чтением данных
из базы, из файлов, по сети. Прервать чтение можно безопасно.
Поэтому в `TrueAsync` действует принцип: **корутина может быть отменена в любой момент из состояния ожидания**.
Такой подход позволяет сократить количество кода, так как в большинстве случаев, программисту не требуется заботится
об отмене.

## Как работает отмена

Для отмены корутины используется специальное исключение — `Cancellation`.
Исключение `Cancellation` или производное выбрасывается в точке остановки (`suspend()`, `await()`, `delay()`).
Выполнение так же может быть прервано на операциях ввода-вывода или любой другой блокирующей операции.

```php
$coroutine = spawn(function() {
    echo "Начинаю работу\n";
    suspend(); // Здесь корутина получит Cancellation
    echo "Этого не будет\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Корутина отменена\n";
    throw $e;
}
```

## Cancellation нельзя подавлять

`Cancellation` — это исключение базового уровня, наравне с `Error` и `Exception`.
Конструкция `catch (Exception $e)` его не перехватит.

Перехватывать `Cancellation` и продолжать работу — ошибка.
Вы можете использовать конструкцию `catch Async\AsyncCancellation` с целью обрабатывания особенных ситуаций,
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
Каскад идёт **только сверху вниз** — отмена дочернего scope не затрагивает родителя и соседние scope.

### Изоляция: отмена потомка не затрагивает остальных

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// Отменяем только child1
$child1->cancel();

$parent->isCancelled(); // false — родитель не затронут
$child1->isCancelled(); // true
$child2->isCancelled(); // false — соседний scope не затронут
```

### Каскад вниз: отмена родителя отменяет всех потомков

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // Каскад: отменяет и child1, и child2

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### Корутина может отменить свой scope

Корутина может инициировать отмену scope, в котором работает. Код до ближайшей точки приостановки продолжит выполнение:

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Начинаю\n";
    $scope->cancel();
    echo "Это ещё выполнится\n";
    suspend();
    echo "А это уже нет\n";
});
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
