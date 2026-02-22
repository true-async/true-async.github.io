---
layout: docs
lang: uk
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /uk/docs/components/cancellation.html
page_title: "Скасування"
description: "Скасування корутин у TrueAsync -- кооперативне скасування, критичні секції з protect(), каскадне скасування через Scope, тайм-аути."
---

# Скасування

Браузер відправив запит, але потім користувач закрив сторінку.
Сервер продовжує обробляти запит, який вже нікому не потрібний.
Було б добре перервати операцію, щоб уникнути зайвих витрат.
Або уявіть, що є тривалий процес копіювання даних, який потрібно раптово скасувати.
Сценаріїв, коли потрібно зупинити операції, безліч.
Зазвичай ця проблема вирішується через змінні-прапорці або токени скасування, що є досить трудомістким. Код повинен знати,
що його можуть скасувати, повинен планувати контрольні точки скасування та коректно обробляти ці ситуації.

## Скасування за замовчуванням

Більшу частину часу застосунок зайнятий читанням даних
з баз даних, файлів або мережі. Перервати читання -- безпечно.
Тому в `TrueAsync` діє наступний принцип: **корутину можна скасувати в будь-який момент зі стану очікування**.
Цей підхід зменшує обсяг коду, оскільки в більшості випадків програмісту не потрібно турбуватися
про скасування.

## Як працює скасування

Для скасування корутини використовується спеціальний виняток -- `Cancellation`.
Виняток `Cancellation` або похідний від нього кидається в точці призупинення (`suspend()`, `await()`, `delay()`).
Виконання також може бути перерване під час операцій вводу/виводу або будь-якої іншої блокуючої операції.

```php
$coroutine = spawn(function() {
    echo "Starting work\n";
    suspend(); // Тут корутина отримає Cancellation
    echo "This won't happen\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Coroutine cancelled\n";
    throw $e;
}
```

## Скасування не можна придушити

`Cancellation` -- це виняток базового рівня, нарівні з `Error` та `Exception`.
Конструкція `catch (Exception $e)` його не перехопить.

Перехоплювати `Cancellation` і продовжувати роботу -- це помилка.
Ви можете використовувати `catch Async\AsyncCancellation` для обробки спеціальних ситуацій,
але маєте переконатися, що коректно повторно кидаєте виняток.
Загалом рекомендується використовувати `finally` для гарантованого очищення ресурсів:

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

## Три сценарії скасування

Поведінка `cancel()` залежить від стану корутини:

**Корутина ще не почала виконання** -- вона ніколи не запуститься.

```php
$coroutine = spawn(function() {
    echo "Won't execute\n";
});
$coroutine->cancel();
```

**Корутина перебуває в стані очікування** -- вона прокинеться з винятком `Cancellation`.

```php
$coroutine = spawn(function() {
    echo "Started work\n";
    suspend(); // Тут вона отримає Cancellation
    echo "Won't execute\n";
});

suspend();
$coroutine->cancel();
```

**Корутина вже завершилася** -- нічого не відбудеться.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // Не помилка, але не має ефекту
```

## Критичні секції: protect()

Не кожну операцію можна безпечно перервати.
Якщо корутина списала гроші з одного рахунку, але ще не зарахувала на інший --
скасування в цей момент призведе до втрати даних.

Функція `protect()` відкладає скасування до завершення критичної секції:

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // Скасування набуде чинності тут -- після виходу з protect()
});

suspend();
$coroutine->cancel();
```

Всередині `protect()` корутина позначається як захищена.
Якщо `cancel()` надійде в цей момент, скасування зберігається,
але не застосовується. Щойно `protect()` завершиться --
відкладене скасування набуде чинності негайно.

## Каскадне скасування через Scope

Коли `Scope` скасовується, усі його корутини та всі дочірні області видимості скасовуються.
Каскад іде **тільки зверху вниз** -- скасування дочірньої області не впливає на батьківську або сусідні.

### Ізоляція: скасування дочірнього не впливає на інших

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// Скасовуємо тільки child1
$child1->cancel();

$parent->isCancelled(); // false -- батьківський не порушений
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- сусідня область не порушена
```

### Каскад вниз: скасування батьківського скасовує всіх нащадків

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // Каскад: скасовує і child1, і child2

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### Корутина може скасувати власну область видимості

Корутина може ініціювати скасування області видимості, в якій вона виконується. Код до найближчої точки призупинення продовжить виконуватися:

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Starting\n";
    $scope->cancel();
    echo "This will still execute\n";
    suspend();
    echo "But this won't\n";
});
```

Після скасування область видимості закривається -- запустити нову корутину в ній вже неможливо.

## Тайм-аути

Особливий випадок скасування -- тайм-аут. Функція `timeout()` створює обмеження за часом:

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "API didn't respond within 5 seconds\n";
}
```

`TimeoutException` -- це підтип `Cancellation`,
тому корутина завершується за тими самими правилами.

## Перевірка стану

Корутина надає два методи для перевірки скасування:

- `isCancellationRequested()` -- скасування було запрошено, але ще не застосовано
- `isCancelled()` -- корутина фактично зупинилася

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- ще не оброблено

suspend();

$coroutine->isCancelled();             // true
```

## Приклад: обробник черги з коректним завершенням

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
        // Усі корутини будуть зупинені тут
        $this->scope->cancel();
    }
}
```

## Що далі?

- [Scope](/uk/docs/components/scope.html) -- керування групами корутин
- [Корутини](/uk/docs/components/coroutines.html) -- життєвий цикл корутин
- [Канали](/uk/docs/components/channels.html) -- обмін даними між корутинами
