---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "Verifica se la coroutine è completata."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

Verifica se la coroutine ha terminato l'esecuzione. Una coroutine è considerata completata al termine con successo, al termine con un errore o all'annullamento.

## Valore di ritorno

`bool` -- `true` se la coroutine ha terminato l'esecuzione.

## Esempi

### Esempio #1 Verifica del completamento

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### Esempio #2 Controllo di prontezza non bloccante

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// Attendi finché tutti sono completati
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## Vedi anche

- [Coroutine::getResult](/it/docs/reference/coroutine/get-result.html) -- Ottieni il risultato
- [Coroutine::getException](/it/docs/reference/coroutine/get-exception.html) -- Ottieni l'eccezione
- [Coroutine::isCancelled](/it/docs/reference/coroutine/is-cancelled.html) -- Verifica l'annullamento
