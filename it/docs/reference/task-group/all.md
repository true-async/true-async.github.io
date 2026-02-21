---
layout: docs
lang: it
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /it/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Crea un Future che si risolve con un array di tutti i risultati dei task."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

Restituisce un `Future` che si risolve con un array di risultati quando tutti i task sono completati.
Le chiavi dell'array corrispondono a quelle assegnate tramite `spawn()` / `spawnWithKey()`.

Se i task sono già completati, il `Future` si risolve immediatamente.

Il `Future` restituito supporta un token di cancellazione tramite `await(?Completable $cancellation)`,
permettendo di impostare un timeout o un'altra strategia di cancellazione.

## Parametri

**ignoreErrors**
: Se `false` (predefinito) e ci sono errori, il `Future` viene rifiutato con `CompositeException`.
  Se `true`, gli errori vengono ignorati e il `Future` si risolve solo con i risultati riusciti.
  Gli errori possono essere recuperati tramite `getErrors()`.

## Valore di ritorno

`Async\Future` --- un risultato futuro contenente l'array dei risultati dei task.
Chiama `->await()` per ottenere il valore.

## Errori

Il `Future` viene rifiutato con `Async\CompositeException` se `$ignoreErrors = false` e almeno un task è fallito con un errore.

## Esempi

### Esempio #1 Utilizzo base

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### Esempio #2 Gestione degli errori

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    try {
        $group->all()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### Esempio #3 Ignorare gli errori

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### Esempio #4 Attesa con timeout

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Impossibile ottenere i dati entro 5 secondi\n";
    }
});
```

## Vedi anche

- [TaskGroup::awaitCompletion](/it/docs/reference/task-group/await-completion.html) --- Attende il completamento senza eccezioni
- [TaskGroup::getResults](/it/docs/reference/task-group/get-results.html) --- Ottiene i risultati senza attendere
- [TaskGroup::getErrors](/it/docs/reference/task-group/get-errors.html) --- Ottiene gli errori
