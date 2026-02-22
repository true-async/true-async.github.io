---
layout: docs
lang: uk
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /uk/docs/reference/signal.html
page_title: "signal()"
description: "signal() — очікування сигналу ОС з підтримкою скасування через Completable."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — Очікує сигнал ОС. Повертає `Future`, який розв'язується значенням `Signal` при отриманні сигналу.

## Опис

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

Створює одноразовий обробник сигналу ОС. Кожен виклик `signal()` створює новий `Future`, який розв'язується при першому отриманні вказаного сигналу.
Якщо надано параметр `$cancellation`, `Future` буде відхилено, коли спрацює скасування (наприклад, при тайм-ауті).

Декілька викликів `signal()` з тим самим сигналом працюють незалежно — кожен отримає сповіщення.

## Параметри

**`signal`**
Значення enum `Async\Signal`, що вказує очікуваний сигнал. Наприклад: `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
Необов'язковий об'єкт, що реалізує `Async\Completable` (наприклад, результат виклику `timeout()`). Якщо об'єкт скасування спрацює до надходження сигналу, `Future` буде відхилено з відповідним винятком (наприклад, `Async\TimeoutException`).

Якщо об'єкт скасування вже завершено на момент виклику, `signal()` негайно повертає відхилений `Future`.

## Значення, що повертаються

Повертає `Async\Future<Async\Signal>`. При отриманні сигналу `Future` розв'язується значенням enum `Async\Signal`, що відповідає отриманому сигналу.

## Помилки/Винятки

- `Async\TimeoutException` — якщо тайм-аут спрацював до отримання сигналу.
- `Async\AsyncCancellation` — якщо скасування відбулося з іншої причини.

## Приклади

### Приклад #1 Очікування сигналу з тайм-аутом

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Signal received: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Signal not received within 5 seconds\n";
}
?>
```

### Приклад #2 Отримання сигналу з іншої корутини

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "Signal received: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### Приклад #3 Плавне завершення при SIGTERM

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM received, shutting down...\n";
    graceful_shutdown();
});
?>
```

### Приклад #4 Вже минулий тайм-аут

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // Тайм-аут вже минув

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## Примітки

> **Примітка:** Кожен виклик `signal()` створює **одноразовий** обробник. Щоб очікувати той самий сигнал знову, викличте `signal()` повторно.

> **Примітка:** `Signal::SIGINT` та `Signal::SIGBREAK` працюють на всіх платформах, включаючи Windows. Сигнали `SIGUSR1`, `SIGUSR2` та інші POSIX-сигнали доступні лише в Unix-системах.

> **Примітка:** `Signal::SIGKILL` та `Signal::SIGSEGV` не можуть бути перехоплені — це обмеження операційної системи.

## Signal

Enum `Async\Signal` визначає доступні сигнали ОС:

| Значення | Сигнал | Опис |
|----------|--------|------|
| `Signal::SIGHUP` | 1 | Втрата з'єднання з терміналом |
| `Signal::SIGINT` | 2 | Переривання (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | Завершення з дампом ядра |
| `Signal::SIGILL` | 4 | Неприпустима інструкція |
| `Signal::SIGABRT` | 6 | Аварійне завершення |
| `Signal::SIGFPE` | 8 | Помилка арифметики з плаваючою точкою |
| `Signal::SIGKILL` | 9 | Безумовне завершення |
| `Signal::SIGUSR1` | 10 | Користувацький сигнал 1 |
| `Signal::SIGSEGV` | 11 | Порушення доступу до пам'яті |
| `Signal::SIGUSR2` | 12 | Користувацький сигнал 2 |
| `Signal::SIGTERM` | 15 | Запит на завершення |
| `Signal::SIGBREAK` | 21 | Break (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | Аварійне завершення (альтернативний) |
| `Signal::SIGWINCH` | 28 | Зміна розміру вікна терміналу |

## Дивіться також

- [timeout()](/uk/docs/reference/timeout.html) — створення тайм-ауту для обмеження очікування
- [await()](/uk/docs/reference/await.html) — очікування результату Future
- [graceful_shutdown()](/uk/docs/reference/graceful-shutdown.html) — плавне завершення планувальника
- [Cancellation](/uk/docs/components/cancellation.html) — механізм скасування
