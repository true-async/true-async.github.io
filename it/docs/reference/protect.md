---
layout: docs
lang: it
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /it/docs/reference/protect.html
page_title: "protect()"
description: "protect() — esegui codice in modalità non annullabile per proteggere sezioni critiche."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — Esegue una closure in modalità non annullabile. L'annullamento della coroutine viene posticipato fino al completamento della closure.

## Descrizione

```php
protect(\Closure $closure): mixed
```

Mentre `$closure` è in esecuzione, la coroutine è contrassegnata come protetta. Se una richiesta di annullamento arriva durante questo periodo, `AsyncCancellation` verrà lanciata solo **dopo** il completamento della closure.

## Parametri

**`closure`**
Una closure da eseguire senza interruzione da annullamento.

## Valori di ritorno

Restituisce il valore restituito dalla closure.

## Esempi

### Esempio #1 Protezione di una transazione

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

// Se la coroutine è stata annullata durante protect(),
// AsyncCancellation verrà lanciata qui — dopo il commit()
?>
```

### Esempio #2 Protezione della scrittura su file

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

### Esempio #3 Ottenere un risultato

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

### Esempio #4 Annullamento posticipato e diagnostica

Durante `protect()`, l'annullamento viene salvato ma non applicato. Questo può essere verificato tramite i metodi della coroutine:

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // All'interno di protect() dopo cancel():
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Operazione protetta completata\n";
    });

    // AsyncCancellation viene lanciata qui — dopo protect()
    echo "Questo codice non verrà eseguito\n";
});

suspend(); // Lascia che la coroutine entri in protect()
$coroutine->cancel();
suspend(); // Lascia che protect() termini

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `true` immediatamente dopo `cancel()`, anche all'interno di `protect()`
- `isCancelled()` — `false` mentre `protect()` è in esecuzione, poi `true`

## Note

> **Nota:** Se l'annullamento è avvenuto durante `protect()`, `AsyncCancellation` verrà lanciata immediatamente dopo il ritorno della closure — il valore di ritorno di `protect()` andrà perso in questo caso.

> **Nota:** `protect()` non rende la closure atomica — altre coroutine possono essere eseguite durante le operazioni di I/O al suo interno. `protect()` garantisce solo che l'**annullamento** non interromperà l'esecuzione.

## Vedi anche

- [Cancellazione](/it/docs/components/cancellation.html) — meccanismo di annullamento cooperativo
- [suspend()](/it/docs/reference/suspend.html) — sospensione di una coroutine
