---
layout: docs
lang: ru
path_key: "/docs/concepts/scope.html"
nav_active: docs
permalink: /ru/docs/concepts/scope.html
page_title: "Scope"
description: "Scope в TrueAsync — управление жизнью корутин, иерархия, отмена групп, обработка ошибок и structured concurrency."
---

# Scope: управление жизнью корутин

## Проблема: явный контроль ресурсов, забытые корутины

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// Функция вернулась, но три корутины еще работают!
// Кто за ними следит? Когда они закончатся?
// Кто будет обрабатывать исключения, если они возникнут?
```

Одной из распространённых проблем асинхронного программирования являются корутины, случайно "забытые" разработчиком. 
Они запускаются, выполняют работу, но никто не следит за их жизненным циклом. 
Это может привести к утечкам ресурсов, незавершённым операциям и трудноуловимым багам.
Для `stateful` приложений данная проблема значимая.

## Решение: Scope

![Scope Concept](../../../assets/docs/scope_concept.jpg)

**Scope** — логическое пространство для запуска корутин, которое можно сравнить с песочницей.

Следующие правила гарантируют, что корутины находятся под контролем:
* Код всегда знает в каком `Scope` он выполняется
* Функция `spawn()` создаёт корутину в текущем `Scope`
* `Scope` знает о всех корутинах, которые ему принадлежат

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // Ждем, пока все корутины в scope завершатся
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// Теперь функция вернется только когда ВСЕ корутины закончат работу
```

## Привязка к объекту

`Scope` удобно привязывать к объекту, чтобы явно выразить владение группой корутин.
Такая семантика является прямым выражением намерений программиста.

```php
class UserService 
{
    // Только один уникальный объект будет владеть уникальным Scope
    // Корутины живут так же долго, как и объект UserService
    private Scope $scope;

    public function __construct() {
        // Создаем купол для всех корутин сервиса
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Запускаем корутину внутрь нашего купола
        $this->scope->spawn(function() use ($userId) {
            // Эта корутина привязана к UserService
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // Когда объект удаляется, гарантированно очищаем ресурсы
        // Все корутины внутри автоматически отменяются
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// Удаляем сервис - все его корутины автоматически отменятся
unset($service);
```

## Иерархия scope

Scope может содержать другие scope. Когда родительский scope отменяется, 
все дочерние scope и их корутины тоже отменяются. 

Такой подход называется **структурной конкуренцией**.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Главная задача\n";

    // Создаем дочерний scope
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Подзадача 1\n";
    });

    $childScope->spawn(function() {
        echo "Подзадача 2\n";
    });

    // Ждем завершения подзадач
    $childScope->awaitCompletion();

    echo "Все подзадачи готовы\n";
});

$mainScope->awaitCompletion();
```

Если отменить `$mainScope`, отменятся и все дочерние scope. Вся иерархия.

## Отмена всех корутин в scope

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "Работаю...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Меня отменили!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Тоже работаю...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "И меня тоже!\n";
    }
});

// Работает 3 секунды
Async\sleep(3000);

// Отменяем ВСЕ корутины в scope
$scope->cancel();

// Обе корутины получат AsyncCancellation
```

## Обработка ошибок в scope

Когда корутина внутри scope падает с ошибкой, scope может это поймать:

```php
$scope = new Async\Scope();

// Устанавливаем обработчик ошибок
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Ошибка в scope: " . $e->getMessage() . "\n";
    // Можно залогировать, отправить в Sentry, etc
});

$scope->spawn(function() {
    throw new Exception("Что-то сломалось!");
});

$scope->spawn(function() {
    echo "Я работаю нормально\n";
});

$scope->awaitCompletion();

// Вывод:
// Ошибка в scope: Что-то сломалось!
// Я работаю нормально
```

## Finally: гарантированная очистка

Даже если scope отменяется, finally-блоки выполнятся:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Начинаю работу\n";
        Async\sleep(10000); // Долгая операция
        echo "Закончил\n"; // Не выполнится
    } finally {
        // Это ГАРАНТИРОВАННО выполнится
        echo "Очистка ресурсов\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // Отменяем через секунду

// Вывод:
// Начинаю работу
// Очистка ресурсов
```

## TaskGroup: scope с результатами

`TaskGroup` — специализированный scope для параллельного выполнения задач
с агрегацией результатов. Поддерживает ограничение конкурентности,
именованные задачи и три стратегии ожидания:

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// Получить все результаты (ждёт завершения всех задач)
$results = await($group->all());

// Или получить первый завершившийся результат
$first = await($group->race());

// Или первый успешный (игнорируя ошибки)
$any = await($group->any());
```

Задачи можно добавлять с ключами и итерировать по мере завершения:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// Итерация по результатам по мере их готовности
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Задача $key упала: {$error->getMessage()}\n";
    } else {
        echo "Задача $key: $result\n";
    }
}
```

## Global Scope: всегда есть родитель

Если вы не указали scope явно, корутина создается в **global scope**:

```php
// Без указания scope
spawn(function() {
    echo "Я в global scope\n";
});

// То же самое, что:
Async\Scope::global()->spawn(function() {
    echo "Я в global scope\n";
});
```

Global scope живет весь запрос. Когда PHP завершается, все корутины в global scope отменяются gracefully.

## Реальный пример: HTTP-клиент

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // Отменяем все активные запросы
        $this->scope->cancel();
    }

    public function __destruct() {
        // При удалении клиента все запросы автоматически отменяются
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// Отменяем все запросы
$client->cancelAll();

// Или просто удаляем клиент - эффект тот же
unset($client);
```

## Structured Concurrency

`Scope` реализует принцип **Structured Concurrency** (структурная конкуренция) —
набор правил управления конкурентными задачами, проверенный в production-рантаймах
`Kotlin`, `Swift` и `Java`.

### API для управления временем жизни

`Scope` даёт возможность явно контролировать время жизни иерархии корутин
с помощью следующих методов:

| Метод                                    | Что делает                                                    |
|------------------------------------------|---------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Запускает корутину внутри Scope                               |
| `$scope->awaitCompletion($cancellation)` | Ожидает завершения всех корутин в Scope                       |
| `$scope->cancel()`                       | Отправляет сигнал отмены всем корутинам                       |
| `$scope->dispose()`                      | Закрывает Scope и принудительно отменяет все корутины         |
| `$scope->disposeSafely()`                | Закрывает Scope; корутины не отменяются, а помечаются zombie  |

Эти методы позволяют реализовать три ключевых паттерна:

**1. Родитель ждёт все дочерние задачи**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* задача 1 */ });
$scope->spawn(function() { /* задача 2 */ });

// Управление не вернётся, пока обе задачи не завершатся
$scope->awaitCompletion();
```

В Kotlin то же самое делает `coroutineScope { }`,
в Swift — `withTaskGroup { }`.

**2. Родитель отменяет все дочерние задачи**

```php
$scope->cancel();
// Все корутины в $scope получат сигнал отмены.
// Дочерние Scope тоже будут отменены — рекурсивно, на любую глубину.
```

**3. Родитель закрывает Scope и освобождает ресурсы**

`dispose()` закрывает Scope и принудительно отменяет все его корутины:

```php
$scope->dispose();
// Scope закрыт. Все корутины отменены.
// Новые корутины в этот Scope добавить нельзя.
```

Если нужно закрыть Scope, но позволить текущим корутинам **доработать**,
используйте `disposeSafely()` — корутины помечаются как zombie
(не отменяются, продолжают выполнение, но Scope считается завершённым по активным задачам):

```php
$scope->disposeSafely();
// Scope закрыт. Корутины продолжают работать как zombie.
// Scope отслеживает их, но не считает активными.
```

### Обработка ошибок: две стратегии

Необработанное исключение в корутине не теряется — оно всплывает в родительский Scope.
Разные рантаймы предлагают разные стратегии:

| Стратегия                                                        | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **Fail-together**: ошибка одного ребёнка отменяет всех остальных | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (по умолчанию)             |
| **Независимые дети**: ошибка одного не влияет на остальных       | `supervisorScope` | отдельные `Task`        | `$scope->setExceptionHandler(...)` |

Возможность выбрать стратегию — ключевое отличие от «запустил и забыл».

### Наследование контекста

Дочерние задачи автоматически получают контекст родителя:
приоритет, дедлайны, метаданные — без явной передачи параметров.

В Kotlin дочерние корутины наследуют `CoroutineContext` родителя (диспетчер, имя, `Job`).
В Swift дочерние `Task` наследуют приоритет и task-local values.

### Где это уже работает

| Язык       | API                                                             | Production с   |
|------------|-----------------------------------------------------------------|----------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018           |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021           |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (preview) |

TrueAsync привносит этот подход в PHP через `Async\Scope`.

## Дальше что?

- [Корутины](/ru/docs/concepts/coroutines.html) — как работают сами корутины
- [Отмена](/ru/docs/concepts/cancellation.html) — паттерны отмены операций
