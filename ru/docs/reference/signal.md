---
layout: docs
lang: ru
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /ru/docs/reference/signal.html
page_title: "signal()"
description: "signal() — ожидание OS-сигнала с поддержкой отмены через Completable."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — Ожидает получение OS-сигнала. Возвращает `Future`, который разрешается значением `Signal` при получении сигнала.

## Описание

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

Создаёт одноразовый обработчик OS-сигнала. Каждый вызов `signal()` создаёт новый `Future`, который разрешается при первом получении указанного сигнала.
Если передан параметр `$cancellation`, `Future` будет отклонён при срабатывании отмены (например, по таймауту).

Несколько вызовов `signal()` с одним и тем же сигналом работают независимо — каждый получит уведомление.

## Параметры

**`signal`**
Значение перечисления `Async\Signal`, определяющее ожидаемый сигнал. Например: `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
Опциональный объект, реализующий `Async\Completable` (например, результат вызова `timeout()`). Если объект отмены срабатывает раньше, чем придёт сигнал, `Future` будет отклонён с соответствующим исключением (например, `Async\TimeoutException`).

Если объект отмены уже завершён на момент вызова, `signal()` немедленно возвращает отклонённый `Future`.

## Возвращаемое значение

Возвращает `Async\Future<Async\Signal>`. При получении сигнала `Future` разрешается значением перечисления `Async\Signal`, соответствующим полученному сигналу.

## Ошибки/Исключения

- `Async\TimeoutException` — если сработал таймаут до получения сигнала.
- `Async\AsyncCancellation` — если отмена произошла по другой причине.

## Примеры

### Пример #1 Ожидание сигнала с таймаутом

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Получен сигнал: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Сигнал не получен за 5 секунд\n";
}
?>
```

### Пример #2 Получение сигнала из другой корутины

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
echo "Получен сигнал: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### Пример #3 Graceful shutdown по SIGTERM

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM получен, завершаемся...\n";
    graceful_shutdown();
});
?>
```

### Пример #4 Уже истёкший таймаут

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // Таймаут уже истёк

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## Примечания

> **Примечание:** Каждый вызов `signal()` создаёт **одноразовый** обработчик. Для повторного ожидания того же сигнала вызовите `signal()` снова.

> **Примечание:** `Signal::SIGINT` и `Signal::SIGBREAK` работают на всех платформах, включая Windows. Сигналы `SIGUSR1`, `SIGUSR2` и другие POSIX-сигналы доступны только на Unix-системах.

> **Примечание:** `Signal::SIGKILL` и `Signal::SIGSEGV` не могут быть перехвачены — это ограничение операционной системы.

## Signal

Перечисление `Async\Signal` определяет доступные OS-сигналы:

| Значение | Сигнал | Описание |
|----------|--------|----------|
| `Signal::SIGHUP` | 1 | Потеря связи с терминалом |
| `Signal::SIGINT` | 2 | Прерывание (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | Выход с дампом ядра |
| `Signal::SIGILL` | 4 | Недопустимая инструкция |
| `Signal::SIGABRT` | 6 | Аварийное завершение |
| `Signal::SIGFPE` | 8 | Ошибка арифметики с плавающей точкой |
| `Signal::SIGKILL` | 9 | Безусловное завершение |
| `Signal::SIGUSR1` | 10 | Пользовательский сигнал 1 |
| `Signal::SIGSEGV` | 11 | Нарушение доступа к памяти |
| `Signal::SIGUSR2` | 12 | Пользовательский сигнал 2 |
| `Signal::SIGTERM` | 15 | Запрос на завершение |
| `Signal::SIGBREAK` | 21 | Прерывание (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | Аварийное завершение (альтернативный) |
| `Signal::SIGWINCH` | 28 | Изменение размера окна терминала |

## См. также

- [timeout()](/ru/docs/reference/timeout.html) — создание таймаута для ограничения ожидания
- [await()](/ru/docs/reference/await.html) — ожидание результата Future
- [graceful_shutdown()](/ru/docs/reference/graceful-shutdown.html) — корректное завершение планировщика
- [Отмена](/ru/docs/concepts/cancellation.html) — механизм отмены
