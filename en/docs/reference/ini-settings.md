---
layout: docs
lang: en
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /en/docs/reference/ini-settings.html
page_title: "INI Settings"
description: "php.ini configuration directives for the TrueAsync extension."
---

# INI Settings

The TrueAsync extension adds the following directives to `php.ini`.

## Directives List

| Directive | Default Value | Scope | Description |
|-----------|--------------|-------|-------------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | Enables diagnostic report output on deadlock detection |

## async.debug_deadlock

**Type:** `bool`
**Default:** `1` (enabled)
**Scope:** `PHP_INI_ALL` — can be changed in `php.ini`, `.htaccess`, `.user.ini`, and via `ini_set()`.

When enabled, this directive activates detailed diagnostic output when the scheduler detects a deadlock.
If the scheduler finds that all coroutines are blocked and there are no active events, it prints a report before throwing `Async\DeadlockError`.

### Report Contents

- Number of waiting coroutines and active events
- List of all blocked coroutines showing:
  - Spawn and suspend locations
  - Events each coroutine is waiting for, with human-readable descriptions

### Example Output

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

### Examples

#### Disabling via php.ini

```ini
async.debug_deadlock = 0
```

#### Disabling via ini_set()

```php
<?php
// Disable deadlock diagnostics at runtime
ini_set('async.debug_deadlock', '0');
?>
```

#### Disabling for tests

```ini
; phpunit.xml or .phpt file
async.debug_deadlock=0
```

## See Also

- [Exceptions](/en/docs/components/exceptions.html) — `Async\DeadlockError`
