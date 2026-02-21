---
layout: docs
lang: it
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /it/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "Ottiene un array di risultati dai task completati."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

Restituisce un array di risultati dai task completati con successo.
Le chiavi dell'array corrispondono a quelle assegnate tramite `spawn()` (auto-incremento) o `spawnWithKey()` (personalizzate).

Il metodo non attende il completamento dei task --- restituisce solo i risultati disponibili al momento della chiamata.

## Valore di ritorno

Un `array<int|string, mixed>` dove la chiave è l'identificatore del task e il valore è il risultato dell'esecuzione.

## Esempi

### Esempio #1 Ottenere i risultati dopo all()

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### Esempio #2 I risultati non contengono errori

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail"); });
    $group->spawn(fn() => "also ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "also ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fail")]

    $group->suppressErrors();
});
```

## Vedi anche

- [TaskGroup::getErrors](/it/docs/reference/task-group/get-errors.html) --- Ottiene un array di errori
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Attende tutti i task
- [TaskGroup::suppressErrors](/it/docs/reference/task-group/suppress-errors.html) --- Contrassegna gli errori come gestiti
