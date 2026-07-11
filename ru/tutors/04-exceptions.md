---
layout: tutorial
lang: ru
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /ru/tutors/04-exceptions.html
page_title: "Исключения"
description: "Как исключения из корутины пробрасываются через await()."
---

# Исключения в корутинах

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

У функции `validateToken` из прошлой главы есть несколько проблем.
Если `UserDirectory` не ответит (таймаут, сеть упала, DNS не резолвится), `file_get_contents` вернёт `false`. 
`json_decode(false)` вернёт `null`, а `null->valid` тоже `null`. Функция вернёт что-то falsy, то есть тот же 
результат, что и при реально невалидном токене. `validateToken` не умеет отличить "токен просрочен" от 
"UserDirectory не ответил", хотя это две совершенно разные ситуации.

Правильный путь: бросить исключение, когда сервис не ответил:

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory не ответил');
    }

    return json_decode($response)->valid;
}
```

Но что происходит, если внутри корутины выбросить исключение?
Если исключение выбросить в обычном `PHP` и его никто не поймает, `PHP` завершится с сообщением Unhandled Exception.
А корутина?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Что-то пошло не так');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Что-то пошло не так in /path/to/script.php
```

На вид кажется, что разницы нет. Однако это совсем не так.
Корутины принадлежат компоненту `Scheduler`, который отвечает за переключение. Каждая корутина выполняется 
в отдельном логическом потоке. Если необработанное исключение достигает финального обработчика корутины,
он сохраняет его в дескрипторе корутины. 

```php
$coroutine = spawn(function () {
    throw new Exception('Что-то пошло не так');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

То есть исключение не прервёт выполнение программы до тех пор,
пока кто-то держит ссылку на `$coroutine`. Такая логика гарантирует идемпотентность для операции `await`.

```php
$coroutine = spawn(function () {
    throw new Exception('Что-то пошло не так');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Поймали исключение: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Второй раз поймали исключение: {$e->getMessage()}\n";    
}
```

Повторные вызовы `await` над одной и той же корутиной приведут к одному и тому же поведению вне зависимости 
от того, работает ли корутина сейчас или нет. Это позволяет работать с корутиной как с `Future`, обещанием
результата, которое может быть получено в будущем. Если результат уже существует, `await` вернёт его немедленно.

Теперь можно улучшить качество кода, который проверяет токен и обновляет профиль, добавив обработку исключений:

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // Возможно, стоит повторить операцию позже?
}
```

> Важно!
> После вызова операции `await` либо любой другой `await_*` 
> корутина помечается как обработанная и её исключение не будет приводить 
> к завершению PHP-программы


