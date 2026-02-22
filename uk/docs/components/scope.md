---
layout: docs
lang: uk
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /uk/docs/components/scope.html
page_title: "Scope"
description: "Scope у TrueAsync -- управління часом життя корутин, ієрархія, групове скасування, обробка помилок та структурована конкурентність."
---

# Scope: Управління часом життя корутин

## Проблема: Явний контроль ресурсів, забуті корутини

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// Функція повернулася, але три корутини все ще працюють!
// Хто за ними стежить? Коли вони завершаться?
// Хто обробить виключення, якщо вони виникнуть?
```

Одна з поширених проблем в асинхронному програмуванні -- корутини, випадково "забуті" розробником.
Вони запущені, виконують роботу, але ніхто не контролює їхній життєвий цикл.
Це може призвести до витоку ресурсів, незавершених операцій та багів, які важко знайти.
Для `stateful`-застосунків ця проблема є значною.

## Рішення: Scope

![Концепція Scope](../../../assets/docs/scope_concept.jpg)

**Scope** -- логічний простір для виконання корутин, який можна порівняти з пісочницею.

Наступні правила гарантують, що корутини під контролем:
* Код завжди знає, в якому `Scope` він виконується
* Функція `spawn()` створює корутину в поточному `Scope`
* `Scope` знає про всі корутини, що йому належать

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // Чекаємо, поки всі корутини в scope завершаться
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// Тепер функція поверне результат тільки коли ВСІ корутини завершаться
```

## Прив'язка до об'єкта

`Scope` зручно прив'язувати до об'єкта, щоб явно виразити володіння групою корутин.
Така семантика безпосередньо виражає намір програміста.

```php
class UserService
{
    // Тільки один унікальний об'єкт буде володіти унікальним Scope
    // Корутини живуть стільки, скільки живе об'єкт UserService
    private Scope $scope;

    public function __construct() {
        // Створюємо купол для всіх корутин сервісу
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Запускаємо корутину всередині нашого купола
        $this->scope->spawn(function() use ($userId) {
            // Ця корутина прив'язана до UserService
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // Коли об'єкт видаляється, ресурси гарантовано очищуються
        // Всі корутини всередині автоматично скасовуються
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// Видаляємо сервіс -- всі його корутини автоматично скасовуються
unset($service);
```

## Ієрархія Scope

Scope може містити інші scope. Коли батьківський scope скасовується,
всі дочірні scope та їхні корутини також скасовуються.

Цей підхід називається **структурована конкурентність**.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Main task\n";

    // Створюємо дочірній scope
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Subtask 1\n";
    });

    $childScope->spawn(function() {
        echo "Subtask 2\n";
    });

    // Чекаємо завершення підзадач
    $childScope->awaitCompletion();

    echo "All subtasks done\n";
});

$mainScope->awaitCompletion();
```

Якщо скасувати `$mainScope`, всі дочірні scope також будуть скасовані. Вся ієрархія.

## Скасування всіх корутин в Scope

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "Working...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "I was cancelled!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Also working...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Me too!\n";
    }
});

// Працює 3 секунди
Async\sleep(3000);

// Скасовуємо ВСІ корутини в scope
$scope->cancel();

// Обидві корутини отримають AsyncCancellation
```

## Обробка помилок у Scope

Коли корутина всередині scope завершується з помилкою, scope може її перехопити:

```php
$scope = new Async\Scope();

// Встановлюємо обробник помилок
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Error in scope: " . $e->getMessage() . "\n";
    // Можна залогувати, відправити в Sentry тощо.
});

$scope->spawn(function() {
    throw new Exception("Something broke!");
});

$scope->spawn(function() {
    echo "I'm working fine\n";
});

$scope->awaitCompletion();

// Виведе:
// Error in scope: Something broke!
// I'm working fine
```

## Finally: Гарантоване очищення

Навіть якщо scope скасовується, блоки finally виконаються:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Starting work\n";
        Async\sleep(10000); // Довга операція
        echo "Finished\n"; // Не виконається
    } finally {
        // Це ГАРАНТОВАНО виконається
        echo "Cleaning up resources\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // Скасовуємо через одну секунду

// Виведе:
// Starting work
// Cleaning up resources
```

## TaskGroup: Scope з результатами

`TaskGroup` -- спеціалізований scope для паралельного виконання завдань
із агрегацією результатів. Підтримує обмеження конкурентності,
іменовані завдання та три стратегії очікування:

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// Отримати всі результати (чекає завершення всіх завдань)
$results = await($group->all());

// Або отримати перший завершений результат
$first = await($group->race());

// Або перший успішний (ігноруючи помилки)
$any = await($group->any());
```

Завдання можна додавати з ключами та ітерувати в міру завершення:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// Ітеруємо результати в міру їх готовності
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Task $key failed: {$error->getMessage()}\n";
    } else {
        echo "Task $key: $result\n";
    }
}
```

## Глобальний Scope: Батько є завжди

Якщо ви не вказуєте scope явно, корутина створюється в **глобальному scope**:

```php
// Без вказівки scope
spawn(function() {
    echo "I'm in global scope\n";
});

// Те саме що:
Async\Scope::global()->spawn(function() {
    echo "I'm in global scope\n";
});
```

Глобальний scope живе протягом усього запиту. Коли PHP завершується, всі корутини в глобальному scope граціозно скасовуються.

## Реальний приклад: HTTP-клієнт

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
        // Скасувати всі активні запити
        $this->scope->cancel();
    }

    public function __destruct() {
        // Коли клієнт знищується, всі запити автоматично скасовуються
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// Скасувати всі запити
$client->cancelAll();

// Або просто знищити клієнт -- той самий ефект
unset($client);
```

## Структурована конкурентність

`Scope` реалізує принцип **Structured Concurrency** --
набір правил для управління конкурентними задачами, перевірений у production-середовищах
`Kotlin`, `Swift` та `Java`.

### API для управління часом життя

`Scope` надає можливість явно контролювати час життя ієрархії корутин
за допомогою таких методів:

| Метод                                    | Що робить                                                        |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Запускає корутину всередині Scope                                |
| `$scope->awaitCompletion($cancellation)` | Чекає завершення всіх корутин у Scope                            |
| `$scope->cancel()`                       | Надсилає сигнал скасування всім корутинам                        |
| `$scope->dispose()`                      | Закриває Scope і примусово скасовує всі корутини                 |
| `$scope->disposeSafely()`               | Закриває Scope; корутини не скасовуються, а позначаються zombie  |
| `$scope->awaitAfterCancellation()`       | Чекає завершення всіх корутин, включаючи zombie                  |
| `$scope->disposeAfterTimeout(int $ms)`   | Скасовує корутини після таймауту                                 |

Ці методи дозволяють реалізувати три ключові патерни:

**1. Батько чекає завершення всіх дочірніх задач**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* задача 1 */ });
$scope->spawn(function() { /* задача 2 */ });

// Управління не повернеться, поки обидві задачі не завершаться
$scope->awaitCompletion();
```

У Kotlin те саме робиться через `coroutineScope { }`,
у Swift -- через `withTaskGroup { }`.

**2. Батько скасовує всі дочірні задачі**

```php
$scope->cancel();
// Всі корутини в $scope отримають сигнал скасування.
// Дочірні Scope також будуть скасовані -- рекурсивно, на будь-яку глибину.
```

**3. Батько закриває Scope і звільняє ресурси**

`dispose()` закриває Scope і примусово скасовує всі його корутини:

```php
$scope->dispose();
// Scope закрито. Всі корутини скасовані.
// Нові корутини не можуть бути додані до цього Scope.
```

Якщо потрібно закрити Scope, але дозволити поточним корутинам **завершити роботу**,
використовуйте `disposeSafely()` -- корутини позначаються як zombie
(не скасовуються, продовжують виконання, але Scope вважається завершеним за активними задачами):

```php
$scope->disposeSafely();
// Scope закрито. Корутини продовжують працювати як zombie.
// Scope відстежує їх, але не враховує як активні.
```

### Обробка помилок: Дві стратегії

Необроблене виключення в корутині не втрачається -- воно спливає до батьківського Scope.
Різні рантайми пропонують різні стратегії:

| Стратегія                                                        | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **Fail-together**: помилка однієї дитини скасовує всіх інших     | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (за замовчуванням)         |
| **Незалежні діти**: помилка однієї не впливає на інших            | `supervisorScope` | окремий `Task`          | `$scope->setExceptionHandler(...)` |

Можливість обирати стратегію -- ключова відмінність від "fire and forget".

### Успадкування контексту

Дочірні задачі автоматично отримують контекст батька:
пріоритет, дедлайни, метадані -- без явної передачі параметрів.

У Kotlin дочірні корутини успадковують `CoroutineContext` батька (диспетчер, ім'я, `Job`).
У Swift дочірні `Task` успадковують пріоритет та task-local значення.

### Де це вже працює

| Мова       | API                                                             | У production з  |
|------------|-----------------------------------------------------------------|-----------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018            |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021            |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (preview)  |

TrueAsync привносить цей підхід у PHP через `Async\Scope`.

## Що далі?

- [Корутини](/uk/docs/components/coroutines.html) -- як працюють корутини
- [Скасування](/uk/docs/components/cancellation.html) -- патерни скасування
- [Zombie-корутини](/uk/docs/components/zombie-coroutines.html) -- толерантність до стороннього коду
