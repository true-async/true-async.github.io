---
layout: docs
lang: it
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /it/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "Contrassegna tutti gli errori correnti come gestiti."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

Contrassegna tutti gli errori correnti nel gruppo come gestiti.

Quando un TaskGroup viene distrutto, verifica la presenza di errori non gestiti. Se gli errori non sono stati gestiti
(tramite `all()`, `foreach` o `suppressErrors()`), il distruttore segnala la perdita di errori.
Chiamare `suppressErrors()` è una conferma esplicita che gli errori sono stati gestiti.

## Esempi

### Esempio #1 Soppressione degli errori dopo gestione selettiva

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail 1"); });
    $group->spawn(function() { throw new \LogicException("fail 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // Gestisci gli errori manualmente
    foreach ($group->getErrors() as $key => $error) {
        log_error("Task $key: {$error->getMessage()}");
    }

    // Contrassegna gli errori come gestiti
    $group->suppressErrors();
});
```

## Vedi anche

- [TaskGroup::getErrors](/it/docs/reference/task-group/get-errors.html) --- Ottiene un array di errori
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Attende tutti i task
