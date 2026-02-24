---
layout: docs
lang: es
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /es/docs/reference/ini-settings.html
page_title: "Configuración INI"
description: "Directivas de configuración php.ini para la extensión TrueAsync."
---

# Configuración INI

La extensión TrueAsync añade las siguientes directivas a `php.ini`.

## Lista de directivas

| Directiva | Valor predeterminado | Ámbito | Descripción |
|-----------|---------------------|--------|-------------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | Habilita la salida de un informe de diagnóstico al detectar un deadlock |

## async.debug_deadlock

**Tipo:** `bool`
**Valor predeterminado:** `1` (habilitado)
**Ámbito:** `PHP_INI_ALL` — se puede cambiar en `php.ini`, `.htaccess`, `.user.ini` y mediante `ini_set()`.

Cuando está habilitada, esta directiva activa una salida de diagnóstico detallada cuando el planificador detecta un deadlock.
Si el planificador detecta que todas las corrutinas están bloqueadas y no hay eventos activos, imprime un informe antes de lanzar `Async\DeadlockError`.

### Contenido del informe

- Número de corrutinas en espera y eventos activos
- Lista de todas las corrutinas bloqueadas que muestra:
  - Ubicaciones de creación (spawn) y suspensión (suspend)
  - Eventos que espera cada corrutina, con descripciones legibles

### Ejemplo de salida

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

### Ejemplos

#### Deshabilitar mediante php.ini

```ini
async.debug_deadlock = 0
```

#### Deshabilitar mediante ini_set()

```php
<?php
// Deshabilitar diagnóstico de deadlock en tiempo de ejecución
ini_set('async.debug_deadlock', '0');
?>
```

#### Deshabilitar para pruebas

```ini
; phpunit.xml o archivo .phpt
async.debug_deadlock=0
```

## Véase también

- [Excepciones](/es/docs/components/exceptions.html) — `Async\DeadlockError`
