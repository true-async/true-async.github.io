---
layout: docs
lang: fr
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /fr/docs/reference/ini-settings.html
page_title: "Paramètres INI"
description: "Directives de configuration php.ini pour l'extension TrueAsync."
---

# Paramètres INI

L'extension TrueAsync ajoute les directives suivantes à `php.ini`.

## Liste des directives

| Directive | Valeur par défaut | Portée | Description |
|-----------|------------------|--------|-------------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | Active la sortie d'un rapport de diagnostic lors de la détection d'un deadlock |

## async.debug_deadlock

**Type :** `bool`
**Valeur par défaut :** `1` (activé)
**Portée :** `PHP_INI_ALL` — modifiable dans `php.ini`, `.htaccess`, `.user.ini` et via `ini_set()`.

Lorsqu'elle est activée, cette directive produit une sortie de diagnostic détaillée quand l'ordonnanceur détecte un deadlock.
Si l'ordonnanceur constate que toutes les coroutines sont bloquées et qu'il n'y a pas d'événements actifs, il affiche un rapport avant de lancer `Async\DeadlockError`.

### Contenu du rapport

- Nombre de coroutines en attente et d'événements actifs
- Liste de toutes les coroutines bloquées indiquant :
  - Les emplacements de création (spawn) et de suspension (suspend)
  - Les événements attendus par chaque coroutine, avec des descriptions lisibles

### Exemple de sortie

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

### Exemples

#### Désactivation via php.ini

```ini
async.debug_deadlock = 0
```

#### Désactivation via ini_set()

```php
<?php
// Désactiver le diagnostic de deadlock à l'exécution
ini_set('async.debug_deadlock', '0');
?>
```

#### Désactivation pour les tests

```ini
; phpunit.xml ou fichier .phpt
async.debug_deadlock=0
```

## Voir aussi

- [Exceptions](/fr/docs/components/exceptions.html) — `Async\DeadlockError`
