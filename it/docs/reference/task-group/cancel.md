---
layout: docs
lang: it
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /it/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "Cancella tutti i task del gruppo."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Cancella tutte le coroutine in esecuzione e i task in coda.
Chiama implicitamente `seal()`. I task in coda non vengono mai avviati.

Le coroutine ricevono un `AsyncCancellation` e terminano.
La cancellazione avviene in modo asincrono --- usa `awaitCompletion()` per garantire il completamento.

## Parametri

**cancellation**
: L'eccezione che funge da motivo della cancellazione. Se `null`, viene utilizzato un `AsyncCancellation` standard con il messaggio "TaskGroup cancelled".

## Esempi

### Esempio #1 Cancellazione con attesa del completamento

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "long task";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "tutti i task cancellati\n";
});
```

### Esempio #2 Cancellazione con motivazione

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("Timeout superato"));
    $group->awaitCompletion();
});
```

## Vedi anche

- [TaskGroup::seal](/it/docs/reference/task-group/seal.html) --- Sigilla senza cancellazione
- [TaskGroup::awaitCompletion](/it/docs/reference/task-group/await-completion.html) --- Attende il completamento
- [TaskGroup::dispose](/it/docs/reference/task-group/dispose.html) --- Elimina lo scope del gruppo
