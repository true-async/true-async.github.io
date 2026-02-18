---
layout: docs
lang: ru
path_key: "/docs/concepts/coroutines.html"
nav_active: docs
permalink: /ru/docs/concepts/coroutines.html
page_title: "Async\\Coroutine"
description: "Класс Async\\Coroutine — создание, жизненный цикл, состояния, отмена, отладка и полный справочник методов."
---

# Класс Async\Coroutine

(PHP 8.6+, True Async 1.0)

## Корутины в TrueAsync

Когда обычная функция вызывает операцию ввода-вывода `fread`, `fwrite` (чтение файла или сетевой запрос),
управление передаётся ядру операционной системы, и `PHP` блокируется, пока операция не завершится.

Но если функция выполняется в корутине и вызывает операцию ввода-вывода,
блокируется только корутина, а не весь процесс `PHP`.
При этом управление передаётся другой корутине, если такая имеется.

В этом смысле корутины очень похожи на потоки операционной системы (threads),
но управляются в пользовательском пространстве, а не ядром ОС.

Ещё одно важное отличие состоит в том, что корутины разделяют процессорное время по очереди,
самостоятельно уступая управление, в то время как потоки могут быть прерваны в любой момент.

Корутины `TrueAsync` выполняются в рамках одного потока,
не являются параллельными. Из этого следует несколько важных последствий:
- Переменные можно свободно читать и изменять из разных корутин без блокировок, так как они не выполняются одновременно.
- Корутины не могут одновременно использовать несколько ядер процессора.
- Если одна корутина выполняет долгую синхронную операцию, она блокирует весь процесс, так как не уступает управление другим корутинам.

## Создание корутины

Корутина создаётся с помощью функции `spawn()`:

```php
use function Async\spawn;

// Создаем корутину
$coroutine = spawn(function() {
    echo "Привет из корутины!\n";
    return 42;
});

// $coroutine - это объект типа Async\Coroutine
// Корутина уже запланирована к выполнению
```

После того как `spawn` вызван, функция будет выполнена асинхронно планировщиком так скоро как только возможно.

## Передача параметров

Функция `spawn` принимает `callable` и любые параметры, которые будут переданы в эту функцию,
передаются `callable` в момент старта функции.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// Передаем функцию и параметры
$coroutine = spawn(fetchUser(...), 123);
```

## Получение результата

Чтобы получить результат корутины, используйте `await()`:

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Готово!";
});

echo "Корутина запущена\n";

// Ждем результата
$result = await($coroutine);

echo "Результат: $result\n";
```

**Важно:** `await()` блокирует выполнение **текущей корутины**, но не весь PHP процесс. Другие корутины продолжают работать.

## Жизненный цикл корутины

Корутина проходит несколько состояний:

1. **Queued** — создана через `spawn()`, ожидает запуска планировщиком
2. **Running** — выполняется в данный момент
3. **Suspended** — приостановлена, ожидает I/O или `suspend()`
4. **Completed** — завершила выполнение (с результатом или исключением)
5. **Cancelled** — отменена через `cancel()`

### Проверка состояния

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - ожидает запуска
var_dump($coro->isStarted());   // false - ещё не начала

suspend(); // даём корутине запуститься

var_dump($coro->isStarted());    // true - корутина начала работу
var_dump($coro->isRunning());    // false - сейчас не выполняется
var_dump($coro->isSuspended());  // true - приостановлена, ждёт чего-то
var_dump($coro->isCompleted());  // false - ещё не закончила
var_dump($coro->isCancelled());  // false - не отменена
```

## Приостановка: suspend

Ключевое слово `suspend` останавливает корутину и передает управление планировщику:

```php
spawn(function() {
    echo "До suspend\n";

    suspend(); // Останавливаемся здесь

    echo "После suspend\n";
});

echo "Основной код\n";

// Вывод:
// До suspend
// Основной код
// После suspend
```

Корутина остановилась на `suspend`, управление вернулось в основной код. Позже планировщик возобновил корутину.

### suspend с ожиданием

Обычно `suspend` используется для ожидания какого-то события:

```php
spawn(function() {
    echo "Делаю HTTP-запрос\n";

    $data = file_get_contents('https://api.example.com/data');
    // Внутри file_get_contents неявно вызывается suspend
    // Пока идет сетевой запрос, корутина приостановлена

    echo "Получил данные: $data\n";
});
```

PHP автоматически приостанавливает корутину на I/O операциях. Вам не нужно вручную писать `suspend`.

## Отмена корутины

```php
$coro = spawn(function() {
    try {
        echo "Начинаю долгую работу\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // Спим 100ms
            echo "Итерация $i\n";
        }

        echo "Закончил\n";
    } catch (Async\AsyncCancellation $e) {
        echo "Меня отменили на итерации\n";
    }
});

// Даем корутине поработать 1 секунду
Async\sleep(1000);

// Отменяем
$coro->cancel();

// Корутина получит AsyncCancellation при следующем await/suspend
```

**Важно:** Отмена работает кооперативно. Корутина должна проверять отмену (через `await`, `sleep`, или `suspend`). Нельзя убить корутину силой.

## Множественные корутины

Запускайте сколько угодно:

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// Ждем все корутины
$results = array_map(fn($t) => await($t), $tasks);

echo "Загрузили " . count($results) . " результатов\n";
```

Все 10 запросов идут конкурентно. Вместо 10 секунд (по секунде каждый) выполнится за ~1 секунду.

## Обработка ошибок

Ошибки в корутинах обрабатываются обычным `try-catch`:

```php
$coro = spawn(function() {
    throw new Exception("Упс!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Поймали ошибку: " . $e->getMessage() . "\n";
}
```

Если не поймать ошибку, она всплывет в родительский scope:

```php
$scope = new Async\Scope();

spawn with $scope function() {
    throw new Exception("Ошибка в корутине!");
};

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Ошибка всплыла в scope: " . $e->getMessage() . "\n";
}
```

## Корутина = объект

Корутина — это полноценный PHP объект. Можно передавать куда угодно:

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // Долгая работа
        Async\sleep(10000);
        return "Результат";
    });
}

$task = startBackgroundTask();

// Передаем в другую функцию
processTask($task);

// Или сохраняем в массив
$tasks[] = $task;

// Или в свойство объекта
$this->backgroundTask = $task;
```

## Вложенные корутины

Корутины могут запускать другие корутины:

```php
spawn(function() {
    echo "Родительская корутина\n";

    $child1 = spawn(function() {
        echo "Дочерняя корутина 1\n";
        return "Результат 1";
    });

    $child2 = spawn(function() {
        echo "Дочерняя корутина 2\n";
        return "Результат 2";
    });

    // Ждем обе дочерние корутины
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Родитель получил: $result1 и $result2\n";
});
```

## Finally: гарантированная очистка

Даже если корутину отменят, `finally` выполнится:

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // Может быть отменено здесь
        }
    } finally {
        // Гарантированно закроем файл
        fclose($file);
        echo "Файл закрыт\n";
    }
});
```

## Отладка корутин

### Получить стек вызовов

```php
$coro = spawn(function() {
    doSomething();
});

// Получаем стек вызовов корутины
$trace = $coro->getTrace();
print_r($trace);
```

### Узнать, где корутина создана

```php
$coro = spawn(someFunction(...));

// Где был вызван spawn()
echo "Корутина создана в: " . $coro->getSpawnLocation() . "\n";
// Вывод: "Корутина создана в: /app/server.php:42"

// Или как массив [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### Узнать, где корутина приостановлена

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // suspend здесь
});

suspend(); // даём корутине запуститься

echo "Приостановлена в: " . $coro->getSuspendLocation() . "\n";
// Вывод: "Приостановлена в: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### Информация об ожидании

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// Узнать, что корутина ожидает
$info = $coro->getAwaitingInfo();
print_r($info);
```

Очень полезно для отладки — сразу видно, откуда взялась корутина и где она остановилась.

## Корутины vs Потоки

| Корутины                      | Потоки (threads)            |
|-------------------------------|-----------------------------|
| Легковесные (~KB памяти)      | Тяжелые (~MB памяти)        |
| Быстрое создание (<1μs)       | Медленное создание (~1ms)   |
| Один поток ОС                 | Много потоков ОС            |
| Кооперативная многозадачность | Вытесняющая многозадачность |
| Нет race conditions           | Есть race conditions        |
| Нужны await точки             | Могут прерваться где угодно |
| Для I/O операций              | Для CPU-вычислений          |

## Отложенная отмена с protect()

Если корутина находится внутри защищённой секции `protect()`, отмена откладывается до завершения защищённого блока:

```php
$coro = spawn(function() {
    $result = protect(function() {
        // Критическая операция — отмена отложена
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "saved";
    });

    // Отмена произойдёт здесь, после выхода из protect()
    echo "Результат: $result\n";
});

suspend();

$coro->cancel(); // Отмена отложена — protect() завершится полностью
```

Флаг `isCancellationRequested()` становится `true` сразу, а `isCancelled()` — только после фактического завершения корутины.

## Обзор класса

```php
final class Async\Coroutine implements Async\Completable {

    /* Идентификация */
    public getId(): int

    /* Приоритет */
    public asHiPriority(): Coroutine

    /* Контекст */
    public getContext(): Async\Context

    /* Результат и ошибки */
    public getResult(): mixed
    public getException(): mixed

    /* Состояние */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* Управление */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public onFinally(\Closure $callback): void

    /* Отладка */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## Содержание

- [Coroutine::getId](/ru/docs/reference/coroutine/get-id.html) — Получить уникальный идентификатор корутины
- [Coroutine::asHiPriority](/ru/docs/reference/coroutine/as-hi-priority.html) — Пометить корутину как высокоприоритетную
- [Coroutine::getContext](/ru/docs/reference/coroutine/get-context.html) — Получить локальный контекст корутины
- [Coroutine::getResult](/ru/docs/reference/coroutine/get-result.html) — Получить результат выполнения
- [Coroutine::getException](/ru/docs/reference/coroutine/get-exception.html) — Получить исключение корутины
- [Coroutine::isStarted](/ru/docs/reference/coroutine/is-started.html) — Проверить, запущена ли корутина
- [Coroutine::isQueued](/ru/docs/reference/coroutine/is-queued.html) — Проверить, ожидает ли корутина в очереди
- [Coroutine::isRunning](/ru/docs/reference/coroutine/is-running.html) — Проверить, выполняется ли корутина прямо сейчас
- [Coroutine::isSuspended](/ru/docs/reference/coroutine/is-suspended.html) — Проверить, приостановлена ли корутина
- [Coroutine::isCompleted](/ru/docs/reference/coroutine/is-completed.html) — Проверить, завершена ли корутина
- [Coroutine::isCancelled](/ru/docs/reference/coroutine/is-cancelled.html) — Проверить, была ли корутина отменена
- [Coroutine::isCancellationRequested](/ru/docs/reference/coroutine/is-cancellation-requested.html) — Проверить, запрошена ли отмена
- [Coroutine::cancel](/ru/docs/reference/coroutine/cancel.html) — Отменить корутину
- [Coroutine::onFinally](/ru/docs/reference/coroutine/on-finally.html) — Зарегистрировать обработчик завершения
- [Coroutine::getTrace](/ru/docs/reference/coroutine/get-trace.html) — Получить стек вызовов приостановленной корутины
- [Coroutine::getSpawnFileAndLine](/ru/docs/reference/coroutine/get-spawn-file-and-line.html) — Получить файл и строку создания
- [Coroutine::getSpawnLocation](/ru/docs/reference/coroutine/get-spawn-location.html) — Получить место создания как строку
- [Coroutine::getSuspendFileAndLine](/ru/docs/reference/coroutine/get-suspend-file-and-line.html) — Получить файл и строку приостановки
- [Coroutine::getSuspendLocation](/ru/docs/reference/coroutine/get-suspend-location.html) — Получить место приостановки как строку
- [Coroutine::getAwaitingInfo](/ru/docs/reference/coroutine/get-awaiting-info.html) — Получить информацию об ожидании

## Дальше

- [Scope](/ru/docs/concepts/scope.html) — управление группами корутин
- [Отмена](/ru/docs/concepts/cancellation.html) — подробности об отмене и protect()
- [spawn()](/ru/docs/reference/spawn.html) — полная документация
- [await()](/ru/docs/reference/await.html) — полная документация
