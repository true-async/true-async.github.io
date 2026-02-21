---
layout: docs
lang: it
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /it/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "Attende il completamento di tutti i task senza lanciare eccezioni."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

Attende che tutti i task del gruppo siano completamente terminati.
A differenza di `all()`, non restituisce risultati e non lancia eccezioni in caso di errori nei task.

Il gruppo deve essere sigillato prima di chiamare questo metodo.

Un caso d'uso tipico è attendere che le coroutine terminino effettivamente dopo `cancel()`.
Il metodo `cancel()` avvia la cancellazione, ma le coroutine possono terminare in modo asincrono.
`awaitCompletion()` garantisce che tutte le coroutine si siano fermate.

## Errori

Lancia `Async\AsyncException` se il gruppo non è sigillato.

## Esempi

### Esempio #1 Attesa dopo la cancellazione

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "result";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "tutte le coroutine terminate\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### Esempio #2 Ottenere i risultati dopo l'attesa

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();
    $group->awaitCompletion();

    // Nessuna eccezione — controlla manualmente
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "Riusciti: " . count($results) . "\n"; // 1
    echo "Errori: " . count($errors) . "\n";    // 1
});
```

## Vedi anche

- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Attende tutti i task e ottiene i risultati
- [TaskGroup::cancel](/it/docs/reference/task-group/cancel.html) --- Cancella tutti i task
- [TaskGroup::seal](/it/docs/reference/task-group/seal.html) --- Sigilla il gruppo
