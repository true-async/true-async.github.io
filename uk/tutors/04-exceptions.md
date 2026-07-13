---
layout: tutorial
lang: uk
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /uk/tutors/04-exceptions.html
page_title: "Винятки"
description: "Як винятки з корутини поширюються через await()."
---

# Винятки в корутинах

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

Функція `validateToken` з попереднього розділу має кілька проблем.
Якщо `UserDirectory` не відповідає (тайм-аут, немає мережі, DNS не резолвиться), `file_get_contents` повертає `false`.
`json_decode(false)` повертає `null`, а `null->valid` також `null`. Функція повертає щось хибне,
той самий результат, що й із насправді недійсним токеном. `validateToken` не має способу відрізнити "токен прострочено"
від "`UserDirectory` не відповів", хоча це дві абсолютно різні ситуації.

Правильний підхід це викидати виняток, коли сервіс не відповідає:

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

Але що станеться, якщо виняток буде викинуто всередині корутини?
Якщо виняток викидається у звичайному коді `PHP` і ніхто його не ловить, `PHP` завершується з повідомленням Unhandled
Exception. А що з корутиною?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

На перший погляд здається, що різниці немає. Але це далеко не так.
Корутини належать компоненту `Scheduler`, який відповідає за перемикання між ними. Кожна
корутина виконується у власному логічному потоці. Якщо необроблений виняток досягає фінального обробника корутини,
він зберігається в дескрипторі корутини.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

Іншими словами, виняток не завершить програму, доки хтось усе ще утримує посилання
на `$coroutine`. Ця логіка гарантує ідемпотентність операції `await`.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

Повторні виклики `await` для тієї самої корутини дають однакову поведінку, незалежно від того, чи корутина
все ще виконується, чи ні. Це дозволяє поводитися з корутиною як із `Future`, обіцянкою результату,
який можна отримати колись у майбутньому. Якщо результат уже існує, `await` повертає його
негайно.

Тепер ми можемо покращити код, який перевіряє токен та оновлює профіль, додавши обробку винятків:

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // Можливо, варто повторити операцію пізніше?
}
```

> Важливо!
> Після виклику `await` або будь-якої іншої операції `await_*`
> корутина позначається як оброблена, і її виняток більше не спричинить
> завершення програми PHP.
