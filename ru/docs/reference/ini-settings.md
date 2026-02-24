---
layout: docs
lang: ru
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /ru/docs/reference/ini-settings.html
page_title: "INI-настройки"
description: "Конфигурационные директивы php.ini для расширения TrueAsync."
---

# INI-настройки

Расширение TrueAsync добавляет следующие директивы в `php.ini`.

## Список директив

| Директива | Значение по умолчанию | Область | Описание |
|-----------|----------------------|---------|----------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | Включает вывод диагностического отчёта при обнаружении дедлока |

## async.debug_deadlock

**Тип:** `bool`
**Значение по умолчанию:** `1` (включено)
**Область:** `PHP_INI_ALL` — можно менять в `php.ini`, `.htaccess`, `.user.ini` и через `ini_set()`.

Когда включена, эта директива активирует подробный диагностический вывод при обнаружении дедлока в планировщике.
Если планировщик обнаруживает, что все корутины заблокированы и нет активных событий, он выводит отчёт перед тем, как выбросить `Async\DeadlockError`.

### Что содержит отчёт

- Количество ожидающих корутин и активных событий
- Список всех заблокированных корутин с указанием:
  - Места создания (`spawn`) и приостановки (`suspend`)
  - Событий, которых ожидает каждая корутина, с человекочитаемым описанием

### Пример вывода

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

### Примеры

#### Отключение через php.ini

```ini
async.debug_deadlock = 0
```

#### Отключение через ini_set()

```php
<?php
// Отключить диагностику дедлоков в рантайме
ini_set('async.debug_deadlock', '0');
?>
```

#### Отключение для тестов

```ini
; phpunit.xml или .phpt файл
async.debug_deadlock=0
```

## Смотрите также

- [Исключения](/ru/docs/components/exceptions.html) — `Async\DeadlockError`
