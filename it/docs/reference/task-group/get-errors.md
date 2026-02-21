---
layout: docs
lang: it
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /it/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "Ottiene un array di errori dai task falliti."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

Restituisce un array di eccezioni (`Throwable`) dai task che sono falliti con un errore.
Le chiavi dell'array corrispondono alle chiavi dei task assegnate tramite `spawn()` o `spawnWithKey()`.

Il metodo non attende il completamento dei task --- restituisce solo gli errori disponibili al momento della chiamata.

## Valore di ritorno

Un `array<int|string, Throwable>` dove la chiave è l'identificatore del task e il valore è l'eccezione.

## Esempi

### Esempio #1 Visualizzazione degli errori

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Connection timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Connection timeout

    $group->suppressErrors();
});
```

## Errori non gestiti

Se rimangono errori non gestiti quando un TaskGroup viene distrutto, il distruttore lo segnala.
Gli errori sono considerati gestiti se:

- `all()` viene chiamato con `ignoreErrors: false` (predefinito) e lancia un `CompositeException`
- Viene chiamato `suppressErrors()`
- Gli errori vengono gestiti attraverso l'iteratore (`foreach`)

## Vedi anche

- [TaskGroup::getResults](/it/docs/reference/task-group/get-results.html) --- Ottiene un array di risultati
- [TaskGroup::suppressErrors](/it/docs/reference/task-group/suppress-errors.html) --- Contrassegna gli errori come gestiti
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Attende tutti i task
