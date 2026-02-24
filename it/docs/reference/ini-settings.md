---
layout: docs
lang: it
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /it/docs/reference/ini-settings.html
page_title: "Impostazioni INI"
description: "Direttive di configurazione php.ini per l'estensione TrueAsync."
---

# Impostazioni INI

L'estensione TrueAsync aggiunge le seguenti direttive a `php.ini`.

## Elenco delle direttive

| Direttiva | Valore predefinito | Ambito | Descrizione |
|-----------|-------------------|--------|-------------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | Abilita l'output del rapporto diagnostico al rilevamento di un deadlock |

## async.debug_deadlock

**Tipo:** `bool`
**Valore predefinito:** `1` (abilitato)
**Ambito:** `PHP_INI_ALL` — modificabile in `php.ini`, `.htaccess`, `.user.ini` e tramite `ini_set()`.

Quando abilitata, questa direttiva attiva un output diagnostico dettagliato quando lo scheduler rileva un deadlock.
Se lo scheduler rileva che tutte le coroutine sono bloccate e non ci sono eventi attivi, stampa un rapporto prima di lanciare `Async\DeadlockError`.

### Contenuto del rapporto

- Numero di coroutine in attesa e di eventi attivi
- Elenco di tutte le coroutine bloccate che mostra:
  - Posizioni di creazione (spawn) e sospensione (suspend)
  - Eventi attesi da ciascuna coroutine, con descrizioni leggibili

### Esempio di output

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

### Esempi

#### Disabilitazione tramite php.ini

```ini
async.debug_deadlock = 0
```

#### Disabilitazione tramite ini_set()

```php
<?php
// Disabilitare la diagnostica dei deadlock a runtime
ini_set('async.debug_deadlock', '0');
?>
```

#### Disabilitazione per i test

```ini
; phpunit.xml o file .phpt
async.debug_deadlock=0
```

## Vedi anche

- [Eccezioni](/it/docs/components/exceptions.html) — `Async\DeadlockError`
