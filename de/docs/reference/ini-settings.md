---
layout: docs
lang: de
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /de/docs/reference/ini-settings.html
page_title: "INI-Einstellungen"
description: "php.ini-Konfigurationsdirektiven für die TrueAsync-Erweiterung."
---

# INI-Einstellungen

Die TrueAsync-Erweiterung fügt die folgenden Direktiven zu `php.ini` hinzu.

## Liste der Direktiven

| Direktive | Standardwert | Bereich | Beschreibung |
|-----------|-------------|---------|--------------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | Aktiviert die Ausgabe eines Diagnoseberichts bei Deadlock-Erkennung |

## async.debug_deadlock

**Typ:** `bool`
**Standardwert:** `1` (aktiviert)
**Bereich:** `PHP_INI_ALL` — kann in `php.ini`, `.htaccess`, `.user.ini` und über `ini_set()` geändert werden.

Wenn aktiviert, gibt diese Direktive eine detaillierte Diagnose aus, wenn der Scheduler einen Deadlock erkennt.
Wenn der Scheduler feststellt, dass alle Koroutinen blockiert sind und keine aktiven Events vorhanden sind, gibt er einen Bericht aus, bevor `Async\DeadlockError` geworfen wird.

### Berichtinhalt

- Anzahl wartender Koroutinen und aktiver Events
- Liste aller blockierten Koroutinen mit Angabe von:
  - Erstellungs- und Suspendierungspositionen
  - Events, auf die jede Koroutine wartet, mit lesbaren Beschreibungen

### Beispielausgabe

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

### Beispiele

#### Deaktivierung über php.ini

```ini
async.debug_deadlock = 0
```

#### Deaktivierung über ini_set()

```php
<?php
// Deadlock-Diagnose zur Laufzeit deaktivieren
ini_set('async.debug_deadlock', '0');
?>
```

#### Deaktivierung für Tests

```ini
; phpunit.xml oder .phpt-Datei
async.debug_deadlock=0
```

## Siehe auch

- [Ausnahmen](/de/docs/components/exceptions.html) — `Async\DeadlockError`
