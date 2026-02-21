---
layout: docs
lang: it
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /it/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Crea un Future che si risolve con il risultato del primo task completato."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

Restituisce un `Future` che si risolve con il risultato del primo task completato --- sia con successo che con errore.
Se il task è fallito con un errore, il `Future` viene rifiutato con quell'eccezione.
I task rimanenti **continuano l'esecuzione**.

Se un task completato esiste già, il `Future` si risolve immediatamente.

Il `Future` restituito supporta un token di cancellazione tramite `await(?Completable $cancellation)`.

## Valore di ritorno

`Async\Future` --- un risultato futuro del primo task completato.
Chiama `->await()` per ottenere il valore.

## Errori

- Lancia `Async\AsyncException` se il gruppo è vuoto.
- Il `Future` viene rifiutato con l'eccezione del task se il primo task completato è fallito con un errore.

## Esempi

### Esempio #1 Prima risposta

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "slow"; });
    $group->spawn(fn() => "fast");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "fast"
});
```

### Esempio #2 Richieste hedged con timeout

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Nessuna replica ha risposto entro 2 secondi\n";
    }
});
```

## Vedi anche

- [TaskGroup::any](/it/docs/reference/task-group/any.html) --- Primo risultato riuscito
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Tutti i risultati
