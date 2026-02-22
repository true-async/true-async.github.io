---
layout: docs
lang: uk
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /uk/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — призупинення виконання поточної корутини. Повна документація: приклади кооперативної багатозадачності."
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — Призупиняє виконання поточної корутини

## Опис

```php
suspend: void
```

Призупиняє виконання поточної корутини та передає управління планувальнику.
Виконання корутини буде відновлено пізніше, коли планувальник вирішить її запустити.

`suspend()` — це функція, надана розширенням True Async.

## Параметри

Ця конструкція не має параметрів.

## Значення, що повертаються

Функція не повертає значення.

## Приклади

### Приклад #1 Базове використання suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Before suspend\n";
    suspend();
    echo "After suspend\n";
});

echo "Main code\n";
?>
```

**Вивід:**
```
Before suspend
Main code
After suspend
```

### Приклад #2 Декілька suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iteration $i\n";
        suspend();
    }
});

echo "Coroutine started\n";
?>
```

**Вивід:**
```
Iteration 1
Coroutine started
Iteration 2
Iteration 3
```

### Приклад #3 Кооперативна багатозадачність

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine A: $i\n";
        suspend(); // Дати іншим корутинам можливість виконатися
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine B: $i\n";
        suspend();
    }
});
?>
```

**Вивід:**
```
Coroutine A: 1
Coroutine B: 1
Coroutine A: 2
Coroutine B: 2
Coroutine A: 3
Coroutine B: 3
...
```

### Приклад #4 Явна передача управління

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Starting long work\n";

    for ($i = 0; $i < 1000000; $i++) {
        // Обчислення

        if ($i % 100000 === 0) {
            suspend(); // Періодично передавати управління
        }
    }

    echo "Work completed\n";
});

spawn(function() {
    echo "Other coroutine is also working\n";
});
?>
```

### Приклад #5 suspend з вкладених функцій

`suspend()` працює з будь-якої глибини виклику — його не потрібно викликати безпосередньо з корутини:

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Nested function: before suspend\n";
    suspend();
    echo "Nested function: after suspend\n";
}

function deeplyNested() {
    echo "Deep call: start\n";
    nestedSuspend();
    echo "Deep call: end\n";
}

spawn(function() {
    echo "Coroutine: before nested call\n";
    deeplyNested();
    echo "Coroutine: after nested call\n";
});

spawn(function() {
    echo "Other coroutine: working\n";
});
?>
```

**Вивід:**
```
Coroutine: before nested call
Deep call: start
Nested function: before suspend
Other coroutine: working
Nested function: after suspend
Deep call: end
Coroutine: after nested call
```

### Приклад #6 suspend у циклі очікування

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // Чекати, поки прапорець стане true
    while (!$ready) {
        suspend(); // Передати управління
    }

    echo "Condition met!\n";
});

spawn(function() use (&$ready) {
    echo "Preparing...\n";
    Async\sleep(2000);
    $ready = true;
    echo "Ready!\n";
});
?>
```

**Вивід:**
```
Preparing...
Ready!
Condition met!
```

## Примітки

> **Примітка:** `suspend()` — це функція. Виклик як `suspend` (без дужок) є некоректним.

> **Примітка:** У TrueAsync весь виконуваний код розглядається як корутина,
> тому `suspend()` можна викликати будь-де (включаючи головний скрипт).

> **Примітка:** Після виклику `suspend()` виконання корутини не відновиться негайно,
> а коли планувальник вирішить її запустити. Порядок відновлення корутин не гарантується.

> **Примітка:** У більшості випадків явне використання `suspend()` не потрібне.
> Корутини автоматично призупиняються при виконанні операцій введення-виведення
> (читання файлів, мережеві запити тощо).

> **Примітка:** Використання `suspend()`
> у нескінченних циклах без операцій введення-виведення може призвести до високого навантаження на CPU.
> Також можна використовувати `Async\timeout()`.

## Журнал змін

| Версія    | Опис                              |
|-----------|-----------------------------------|
| 1.0.0     | Додано функцію `suspend()`       |

## Дивіться також

- [spawn()](/uk/docs/reference/spawn.html) — Запуск корутини
- [await()](/uk/docs/reference/await.html) — Очікування результату корутини
