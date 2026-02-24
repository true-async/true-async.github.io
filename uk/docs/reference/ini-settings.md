---
layout: docs
lang: uk
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /uk/docs/reference/ini-settings.html
page_title: "INI-налаштування"
description: "Конфігураційні директиви php.ini для розширення TrueAsync."
---

# INI-налаштування

Розширення TrueAsync додає наступні директиви до `php.ini`.

## Список директив

| Директива | Значення за замовчуванням | Область | Опис |
|-----------|--------------------------|---------|------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | Вмикає виведення діагностичного звіту при виявленні дедлоку |

## async.debug_deadlock

**Тип:** `bool`
**Значення за замовчуванням:** `1` (увімкнено)
**Область:** `PHP_INI_ALL` — можна змінювати в `php.ini`, `.htaccess`, `.user.ini` та через `ini_set()`.

Коли увімкнена, ця директива активує детальний діагностичний вивід при виявленні дедлоку в планувальнику.
Якщо планувальник виявляє, що всі корутини заблоковані і немає активних подій, він виводить звіт перед тим, як викинути `Async\DeadlockError`.

### Вміст звіту

- Кількість корутин, що очікують, та активних подій
- Список усіх заблокованих корутин із зазначенням:
  - Місця створення (spawn) та призупинення (suspend)
  - Подій, на які очікує кожна корутина, з людиночитабельними описами

### Приклад виводу

```
=== DEADLOCK REPORT START ===
Coroutines waiting: 2, active_events: 0

Coroutine 1
  spawn: /app/server.php:15
  suspend: /app/server.php:22
  waiting for:
    - Channel recv (capacity: 0, senders: 0, receivers: 1)

Coroutine 2
  spawn: /app/server.php:28
  suspend: /app/server.php:35
  waiting for:
    - Channel recv (capacity: 0, senders: 0, receivers: 1)

=== DEADLOCK REPORT END ===

Fatal error: Uncaught Async\DeadlockError: ...
```

### Приклади

#### Вимкнення через php.ini

```ini
async.debug_deadlock = 0
```

#### Вимкнення через ini_set()

```php
<?php
// Вимкнути діагностику дедлоків під час виконання
ini_set('async.debug_deadlock', '0');
?>
```

#### Вимкнення для тестів

```ini
; phpunit.xml або .phpt файл
async.debug_deadlock=0
```

## Дивіться також

- [Винятки](/uk/docs/components/exceptions.html) — `Async\DeadlockError`
