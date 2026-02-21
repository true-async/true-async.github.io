---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "Den lokalen Kontext einer Coroutine abrufen."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

Gibt den lokalen Kontext der Coroutine zurueck. Der Kontext wird beim ersten Zugriff lazy erstellt.

Der Kontext ermoeglicht das Speichern von Daten, die an eine bestimmte Coroutine gebunden sind, und deren Weitergabe an Kind-Coroutinen.

## Rueckgabewert

`Async\Context` -- das Kontextobjekt der Coroutine.

## Beispiele

### Beispiel #1 Zugriff auf den Kontext

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## Siehe auch

- [Context](/de/docs/components/context.html) -- Kontext-Konzept
- [current_context()](/de/docs/reference/current-context.html) -- Den Kontext der aktuellen Coroutine abrufen
