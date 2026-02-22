---
layout: docs
lang: uk
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /uk/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "Клас Async\\Coroutine -- створення, життєвий цикл, стани, скасування, налагодження та повний довідник методів."
---

# Клас Async\Coroutine

(PHP 8.6+, True Async 1.0)

## Корутини в TrueAsync

Коли звичайна функція викликає операцію вводу/виводу, як-от `fread` або `fwrite` (читання файлу чи мережевий запит),
управління передається ядру операційної системи, і `PHP` блокується до завершення операції.

Але якщо функція виконується всередині корутини і викликає операцію вводу/виводу,
блокується лише корутина, а не весь процес `PHP`.
Тим часом управління передається іншій корутині, якщо така існує.

У цьому сенсі корутини дуже схожі на потоки операційної системи,
але вони керуються в просторі користувача, а не ядром ОС.

Інша важлива відмінність полягає в тому, що корутини ділять процесорний час по черзі,
добровільно поступаючись управлінням, тоді як потоки можуть бути витіснені в будь-який момент.

Корутини TrueAsync виконуються в одному потоці
і не є паралельними. Це призводить до кількох важливих наслідків:
- Змінні можна вільно читати та модифікувати з різних корутин без блокувань, оскільки вони не виконуються одночасно.
- Корутини не можуть одночасно використовувати кілька ядер процесора.
- Якщо одна корутина виконує тривалу синхронну операцію, вона блокує весь процес, оскільки не поступається управлінням іншим корутинам.

## Створення корутини

Корутина створюється за допомогою функції `spawn()`:

```php
use function Async\spawn;

// Створюємо корутину
$coroutine = spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

// $coroutine -- це об'єкт типу Async\Coroutine
// Корутина вже запланована до виконання
```

Після виклику `spawn` функція буде виконана асинхронно планувальником якнайшвидше.

## Передача параметрів

Функція `spawn` приймає `callable` та будь-які параметри, які будуть передані цій функції
при запуску.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// Передаємо функцію та параметри
$coroutine = spawn(fetchUser(...), 123);
```

## Отримання результату

Для отримання результату корутини використовуйте `await()`:

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Done!";
});

echo "Coroutine started\n";

// Чекаємо результат
$result = await($coroutine);

echo "Result: $result\n";
```

**Важливо:** `await()` блокує виконання **поточної корутини**, але не весь процес `PHP`.
Інші корутини продовжують працювати.

## Життєвий цикл корутини

Корутина проходить через кілька станів:

1. **У черзі** -- створена через `spawn()`, очікує запуску планувальником
2. **Виконується** -- наразі активно виконується
3. **Призупинена** -- на паузі, очікує вводу/виводу або `suspend()`
4. **Завершена** -- закінчила виконання (з результатом або винятком)
5. **Скасована** -- скасована через `cancel()`

### Перевірка стану

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - очікує запуску
var_dump($coro->isStarted());   // false - ще не почала виконання

suspend(); // дозволяємо корутині запуститися

var_dump($coro->isStarted());    // true - корутина почала виконання
var_dump($coro->isRunning());    // false - наразі не виконується
var_dump($coro->isSuspended());  // true - призупинена, чекає на щось
var_dump($coro->isCompleted());  // false - ще не завершилася
var_dump($coro->isCancelled());  // false - не скасована
```

## Призупинення: suspend

Ключове слово `suspend` зупиняє корутину і передає управління планувальнику:

```php
spawn(function() {
    echo "Before suspend\n";

    suspend(); // Зупиняємося тут

    echo "After suspend\n";
});

echo "Main code\n";

// Вивід:
// Before suspend
// Main code
// After suspend
```

Корутина зупинилася на `suspend`, управління повернулося до основного коду. Пізніше планувальник відновив корутину.

### suspend з очікуванням

Зазвичай `suspend` використовується для очікування якоїсь події:

```php
spawn(function() {
    echo "Making an HTTP request\n";

    $data = file_get_contents('https://api.example.com/data');
    // Всередині file_get_contents неявно викликається suspend
    // Поки мережевий запит виконується, корутина призупинена

    echo "Got data: $data\n";
});
```

PHP автоматично призупиняє корутину під час операцій вводу/виводу. Вам не потрібно вручну писати `suspend`.

## Скасування корутини

```php
$coro = spawn(function() {
    try {
        echo "Starting long work\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // Сон 100 мс
            echo "Iteration $i\n";
        }

        echo "Finished\n";
    } catch (Async\AsyncCancellation $e) {
        echo "I was cancelled during iteration\n";
    }
});

// Дозволяємо корутині працювати 1 секунду
Async\sleep(1000);

// Скасовуємо
$coro->cancel();

// Корутина отримає AsyncCancellation при наступному await/suspend
```

**Важливо:** Скасування працює кооперативно. Корутина повинна перевіряти скасування (через `await`, `sleep` або `suspend`). Примусово "вбити" корутину неможливо.

## Кілька корутин

Запускайте скільки завгодно:

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// Чекаємо всі корутини
$results = array_map(fn($t) => await($t), $tasks);

echo "Loaded " . count($results) . " results\n";
```

Усі 10 запитів виконуються конкурентно. Замість 10 секунд (по секунді кожен) завершується за ~1 секунду.

## Обробка помилок

Помилки в корутинах обробляються звичайним `try-catch`:

```php
$coro = spawn(function() {
    throw new Exception("Oops!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Caught error: " . $e->getMessage() . "\n";
}
```

Якщо помилка не перехоплена, вона піднімається до батьківської області видимості:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Error in coroutine!");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Error bubbled up to scope: " . $e->getMessage() . "\n";
}
```

## Корутина = Об'єкт

Корутина -- це повноцінний об'єкт PHP. Ви можете передавати її куди завгодно:

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // Тривала робота
        Async\sleep(10000);
        return "Result";
    });
}

$task = startBackgroundTask();

// Передаємо в іншу функцію
processTask($task);

// Або зберігаємо в масиві
$tasks[] = $task;

// Або у властивості об'єкта
$this->backgroundTask = $task;
```

## Вкладені корутини

Корутини можуть запускати інші корутини:

```php
spawn(function() {
    echo "Parent coroutine\n";

    $child1 = spawn(function() {
        echo "Child coroutine 1\n";
        return "Result 1";
    });

    $child2 = spawn(function() {
        echo "Child coroutine 2\n";
        return "Result 2";
    });

    // Чекаємо обидві дочірні корутини
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Parent received: $result1 and $result2\n";
});
```

## Finally: гарантоване очищення

Навіть якщо корутину скасовано, `finally` виконається:

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // Тут може бути скасування
        }
    } finally {
        // Файл буде закрито в будь-якому випадку
        fclose($file);
        echo "File closed\n";
    }
});
```

## Налагодження корутин

### Отримати стек викликів

```php
$coro = spawn(function() {
    doSomething();
});

// Отримати стек викликів корутини
$trace = $coro->getTrace();
print_r($trace);
```

### Дізнатися, де була створена корутина

```php
$coro = spawn(someFunction(...));

// Де було викликано spawn()
echo "Coroutine created at: " . $coro->getSpawnLocation() . "\n";
// Вивід: "Coroutine created at: /app/server.php:42"

// Або як масив [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### Дізнатися, де корутина призупинена

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // призупиняється тут
});

suspend(); // дозволяємо корутині запуститися

echo "Suspended at: " . $coro->getSuspendLocation() . "\n";
// Вивід: "Suspended at: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### Інформація про очікування

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// Дізнатися, на що чекає корутина
$info = $coro->getAwaitingInfo();
print_r($info);
```

Дуже корисно для налагодження -- можна одразу побачити, звідки прийшла корутина і де вона зупинилася.

## Корутини vs Потоки

| Корутини                      | Потоки                        |
|-------------------------------|-------------------------------|
| Легковісні                    | Важковісні                    |
| Швидке створення (<1мкс)      | Повільне створення (~1мс)     |
| Один потік ОС                 | Кілька потоків ОС             |
| Кооперативна багатозадачність  | Витісняюча багатозадачність    |
| Немає гонок даних             | Можливі гонки даних           |
| Потрібні точки await           | Можуть бути витіснені будь-де |
| Для операцій вводу/виводу      | Для обчислювальних задач       |

## Відкладене скасування з protect()

Якщо корутина перебуває всередині захищеної секції через `protect()`, скасування відкладається до завершення захищеного блоку:

```php
$coro = spawn(function() {
    $result = protect(function() {
        // Критична операція -- скасування відкладено
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "saved";
    });

    // Скасування відбудеться тут, після виходу з protect()
    echo "Result: $result\n";
});

suspend();

$coro->cancel(); // Скасування відкладено -- protect() завершиться повністю
```

Прапорець `isCancellationRequested()` стає `true` негайно, тоді як `isCancelled()` стає `true` лише після фактичного завершення корутини.

## Огляд класу

```php
final class Async\Coroutine implements Async\Completable {

    /* Ідентифікація */
    public getId(): int

    /* Пріоритет */
    public asHiPriority(): Coroutine

    /* Контекст */
    public getContext(): Async\Context

    /* Результат та помилки */
    public getResult(): mixed
    public getException(): mixed

    /* Стан */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* Управління */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* Налагодження */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## Зміст

- [Coroutine::getId](/uk/docs/reference/coroutine/get-id.html) -- Отримати унікальний ідентифікатор корутини
- [Coroutine::asHiPriority](/uk/docs/reference/coroutine/as-hi-priority.html) -- Позначити корутину як високопріоритетну
- [Coroutine::getContext](/uk/docs/reference/coroutine/get-context.html) -- Отримати локальний контекст корутини
- [Coroutine::getResult](/uk/docs/reference/coroutine/get-result.html) -- Отримати результат виконання
- [Coroutine::getException](/uk/docs/reference/coroutine/get-exception.html) -- Отримати виняток корутини
- [Coroutine::isStarted](/uk/docs/reference/coroutine/is-started.html) -- Перевірити, чи почала корутина виконання
- [Coroutine::isQueued](/uk/docs/reference/coroutine/is-queued.html) -- Перевірити, чи корутина в черзі
- [Coroutine::isRunning](/uk/docs/reference/coroutine/is-running.html) -- Перевірити, чи корутина зараз виконується
- [Coroutine::isSuspended](/uk/docs/reference/coroutine/is-suspended.html) -- Перевірити, чи корутина призупинена
- [Coroutine::isCompleted](/uk/docs/reference/coroutine/is-completed.html) -- Перевірити, чи корутина завершилася
- [Coroutine::isCancelled](/uk/docs/reference/coroutine/is-cancelled.html) -- Перевірити, чи корутину скасовано
- [Coroutine::isCancellationRequested](/uk/docs/reference/coroutine/is-cancellation-requested.html) -- Перевірити, чи запрошено скасування
- [Coroutine::cancel](/uk/docs/reference/coroutine/cancel.html) -- Скасувати корутину
- [Coroutine::finally](/uk/docs/reference/coroutine/on-finally.html) -- Зареєструвати обробник завершення
- [Coroutine::getTrace](/uk/docs/reference/coroutine/get-trace.html) -- Отримати стек викликів призупиненої корутини
- [Coroutine::getSpawnFileAndLine](/uk/docs/reference/coroutine/get-spawn-file-and-line.html) -- Отримати файл і рядок створення корутини
- [Coroutine::getSpawnLocation](/uk/docs/reference/coroutine/get-spawn-location.html) -- Отримати місце створення як рядок
- [Coroutine::getSuspendFileAndLine](/uk/docs/reference/coroutine/get-suspend-file-and-line.html) -- Отримати файл і рядок призупинення корутини
- [Coroutine::getSuspendLocation](/uk/docs/reference/coroutine/get-suspend-location.html) -- Отримати місце призупинення як рядок
- [Coroutine::getAwaitingInfo](/uk/docs/reference/coroutine/get-awaiting-info.html) -- Отримати інформацію про очікування

## Що далі

- [Scope](/uk/docs/components/scope.html) -- керування групами корутин
- [Скасування](/uk/docs/components/cancellation.html) -- деталі скасування та protect()
- [spawn()](/uk/docs/reference/spawn.html) -- повна документація
- [await()](/uk/docs/reference/await.html) -- повна документація
