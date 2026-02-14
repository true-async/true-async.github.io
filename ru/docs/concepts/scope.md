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

## Проблема: корутины-зомби

Представьте, что вы запустили кучу корутин и забыли про них:

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
// Что если они упадут с ошибкой?
```

Корутины превратились в зомби — они работают где-то там, но никто не знает где и когда они закончатся.

## Решение: Scope

**Scope** — это родитель для корутин. Пока родитель жив, дети работают. Родитель ушел — дети тоже завершаются.

```php
function processUser($userId) {
    $scope = new Async\Scope();

    spawn with $scope sendEmail($userId);
    spawn with $scope updateCache($userId);
    spawn with $scope logActivity($userId);

    // Ждем, пока все корутины в scope завершатся
    $scope->awaitCompletion();

    return "OK";
}

// Теперь функция вернется только когда ВСЕ корутины закончат работу
```

Никаких зомби. Все под контролем.

## Scope = купол для корутин

Думайте о scope как о стеклянном куполе:

- Корутины летают **внутри** купола
- Купол прозрачный — вы видите, что происходит внутри
- Купол можно **поднять** в любой момент — все корутины внутри завершатся
- Новые корутины можно **запускать внутрь** купола
- Купол можно **передать** другому объекту

```php
class UserService {
    private Scope $scope;

    public function __construct() {
        // Создаем купол для всех корутин сервиса
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Запускаем корутину внутрь нашего купола
        spawn with $this->scope function() use ($userId) {
            // Эта корутина привязана к UserService
            sendEmail($userId);
        };
    }

    public function __destruct() {
        // Когда объект удаляется, убираем купол
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

Scope может содержать другие scope. Как матрешки.

```php
$mainScope = new Async\Scope();

spawn with $mainScope function() {
    echo "Главная задача\n";

    // Создаем дочерний scope
    $childScope = Async\Scope::inherit();

    spawn with $childScope function() {
        echo "Подзадача 1\n";
    };

    spawn with $childScope function() {
        echo "Подзадача 2\n";
    };

    // Ждем завершения подзадач
    $childScope->awaitCompletion();

    echo "Все подзадачи готовы\n";
};

$mainScope->awaitCompletion();
```

Если отменить `$mainScope`, отменятся и все дочерние scope. Вся иерархия.

## Отмена всех корутин в scope

```php
$scope = new Async\Scope();

spawn with $scope function() {
    try {
        while (true) {
            echo "Работаю...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Меня отменили!\n";
    }
};

spawn with $scope function() {
    try {
        while (true) {
            echo "Тоже работаю...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "И меня тоже!\n";
    }
};

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
$scope->onException(function(Throwable $e) {
    echo "Ошибка в scope: " . $e->getMessage() . "\n";
    // Можно залогировать, отправить в Sentry, etc
});

spawn with $scope function() {
    throw new Exception("Что-то сломалось!");
};

spawn with $scope function() {
    echo "Я работаю нормально\n";
};

$scope->awaitCompletion();

// Вывод:
// Ошибка в scope: Что-то сломалось!
// Я работаю нормально
```

## Finally: гарантированная очистка

Даже если scope отменяется, finally-блоки выполнятся:

```php
$scope = new Async\Scope();

spawn with $scope function() {
    try {
        echo "Начинаю работу\n";
        Async\sleep(10000); // Долгая операция
        echo "Закончил\n"; // Не выполнится
    } finally {
        // Это ГАРАНТИРОВАННО выполнится
        echo "Очистка ресурсов\n";
        closeConnection();
    }
};

Async\sleep(1000);
$scope->cancel(); // Отменяем через секунду

// Вывод:
// Начинаю работу
// Очистка ресурсов
```

## TaskGroup: scope с результатами

`TaskGroup` — это специальный scope, который собирает результаты всех корутин:

```php
$taskGroup = new Async\TaskGroup(captureResults: true);

spawn with $taskGroup function() {
    return "Результат 1";
};

spawn with $taskGroup function() {
    return "Результат 2";
};

spawn with $taskGroup function() {
    return "Результат 3";
};

// Получаем массив результатов
$results = await($taskGroup);
// ["Результат 1", "Результат 2", "Результат 3"]
```

## Global Scope: всегда есть родитель

Если вы не указали scope явно, корутина создается в **global scope**:

```php
// Без указания scope
spawn(function() {
    echo "Я в global scope\n";
});

// То же самое, что:
spawn with Async\Scope::global() function() {
    echo "Я в global scope\n";
};
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
        return spawn with $this->scope function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        };
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

## Это называется Structured Concurrency

Идея простая: каждая корутина должна иметь родителя. Не должно быть бесхозных корутин.

Как с памятью: в PHP есть garbage collector, который убирает неиспользуемые объекты. Scope — это как GC для корутин.

## Дальше что?

- [Корутины](/ru/docs/concepts/coroutines.html) — как работают сами корутины
- [Отмена](/ru/docs/concepts/cancellation.html) — паттерны отмены операций
