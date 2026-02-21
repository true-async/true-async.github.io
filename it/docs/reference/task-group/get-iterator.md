---
layout: docs
lang: it
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /it/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "Ottiene un iteratore per scorrere i risultati man mano che i task vengono completati."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

Restituisce un iteratore che produce risultati **man mano che i task vengono completati**.
TaskGroup implementa `IteratorAggregate`, quindi è possibile utilizzare `foreach` direttamente.

## Comportamento dell'iteratore

- `foreach` sospende la coroutine corrente fino a quando il prossimo risultato è disponibile
- La chiave è la stessa assegnata tramite `spawn()` o `spawnWithKey()`
- Il valore è un array `[mixed $result, ?Throwable $error]`:
  - Successo: `[$result, null]`
  - Errore: `[null, $error]`
- L'iterazione termina quando il gruppo è sigillato **e** tutti i task sono stati elaborati
- Se il gruppo non è sigillato, `foreach` si sospende in attesa di nuovi task

> **Importante:** Senza chiamare `seal()`, l'iterazione attenderà indefinitamente.

## Esempi

### Esempio #1 Elaborazione dei risultati man mano che diventano disponibili

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Task $key fallito: {$error->getMessage()}\n";
            continue;
        }
        echo "Task $key completato\n";
    }
});
```

### Esempio #2 Iterazione con chiavi denominate

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: ricevuti " . count($result) . " record\n";
        }
    }
});
```

## Vedi anche

- [TaskGroup::seal](/it/docs/reference/task-group/seal.html) --- Sigilla il gruppo
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Attende tutti i task
- [TaskGroup::getResults](/it/docs/reference/task-group/get-results.html) --- Ottiene un array di risultati
