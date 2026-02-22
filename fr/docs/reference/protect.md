---
layout: docs
lang: fr
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /fr/docs/reference/protect.html
page_title: "protect()"
description: "protect() — exécuter du code en mode non annulable pour protéger les sections critiques."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — Exécute une closure en mode non annulable. L'annulation de la coroutine est différée jusqu'à la fin de la closure.

## Description

```php
protect(\Closure $closure): mixed
```

Pendant l'exécution de `$closure`, la coroutine est marquée comme protégée. Si une demande d'annulation arrive pendant ce temps, `AsyncCancellation` ne sera levée qu'**après** la fin de la closure.

## Paramètres

**`closure`**
Une closure à exécuter sans interruption par l'annulation.

## Valeurs de retour

Retourne la valeur retournée par la closure.

## Exemples

### Exemple #1 Protection d'une transaction

```php
<?php
use function Async\protect;

$db->beginTransaction();

$result = protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
    return true;
});

// Si la coroutine a été annulée pendant protect(),
// AsyncCancellation sera levée ici — après commit()
?>
```

### Exemple #2 Protection de l'écriture de fichiers

```php
<?php
use function Async\protect;

protect(function() {
    $fp = fopen('data.json', 'w');
    fwrite($fp, json_encode($data));
    fclose($fp);
});
?>
```

### Exemple #3 Obtenir un résultat

```php
<?php
use function Async\protect;

$cached = protect(function() use ($cache, $key) {
    $value = computeExpensiveResult();
    $cache->set($key, $value);
    return $value;
});
?>
```

### Exemple #4 Annulation différée et diagnostics

Pendant `protect()`, l'annulation est enregistrée mais pas appliquée. Cela peut être vérifié via les méthodes de la coroutine :

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // À l'intérieur de protect() après cancel() :
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Protected operation completed\n";
    });

    // AsyncCancellation est levée ici — après protect()
    echo "This code will not execute\n";
});

suspend(); // Laisser la coroutine entrer dans protect()
$coroutine->cancel();
suspend(); // Laisser protect() se terminer

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `true` immédiatement après `cancel()`, même à l'intérieur de `protect()`
- `isCancelled()` — `false` pendant l'exécution de `protect()`, puis `true`

## Notes

> **Note :** Si l'annulation s'est produite pendant `protect()`, `AsyncCancellation` sera levée immédiatement après le retour de la closure — la valeur de retour de `protect()` sera perdue dans ce cas.

> **Note :** `protect()` ne rend pas la closure atomique — d'autres coroutines peuvent s'exécuter pendant les opérations d'E/S à l'intérieur. `protect()` garantit uniquement que l'**annulation** n'interrompra pas l'exécution.

## Voir aussi

- [Cancellation](/fr/docs/components/cancellation.html) — Mécanisme d'annulation coopérative
- [suspend()](/fr/docs/reference/suspend.html) — Suspension d'une coroutine
