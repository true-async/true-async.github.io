---
layout: docs
lang: it
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /it/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Crea un Future che si risolve con il risultato del primo task riuscito."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

Restituisce un `Future` che si risolve con il risultato del primo task completato *con successo*.
I task falliti con errore vengono ignorati.
I task rimanenti **continuano l'esecuzione**.

Se tutti i task falliscono con errori, il `Future` viene rifiutato con `CompositeException`.

Il `Future` restituito supporta un token di cancellazione tramite `await(?Completable $cancellation)`.

## Valore di ritorno

`Async\Future` --- un risultato futuro del primo task riuscito.
Chiama `->await()` per ottenere il valore.

## Errori

- Lancia `Async\AsyncException` se il gruppo è vuoto.
- Il `Future` viene rifiutato con `Async\CompositeException` se tutti i task falliscono con errori.

## Esempi

### Esempio #1 Primo riuscito

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fail 1"));
    $group->spawn(fn() => throw new \RuntimeException("fail 2"));
    $group->spawn(fn() => "success!");

    $result = $group->any()->await();
    echo $result . "\n"; // "success!"

    // Gli errori dei task falliti devono essere soppressi esplicitamente
    $group->suppressErrors();
});
```

### Esempio #2 Tutti falliti

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " errori\n"; // "2 errori"
    }
});
```

### Esempio #3 Ricerca resiliente con timeout

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Nessun provider ha risposto entro 3 secondi\n";
    }

    $group->suppressErrors();
});
```

## Vedi anche

- [TaskGroup::race](/it/docs/reference/task-group/race.html) --- Primo completato (successo o errore)
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Tutti i risultati
