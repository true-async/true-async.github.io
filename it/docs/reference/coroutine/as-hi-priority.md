---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "Contrassegna la coroutine come ad alta priorità per lo scheduler."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

Contrassegna la coroutine come ad alta priorità. Lo scheduler darà la preferenza a queste coroutine nella selezione del prossimo task da eseguire.

Il metodo restituisce lo stesso oggetto coroutine, abilitando un'interfaccia fluida.

## Valore di ritorno

`Coroutine` -- lo stesso oggetto coroutine (interfaccia fluida).

## Esempi

### Esempio #1 Impostazione della priorità

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "task importante";
})->asHiPriority();
```

### Esempio #2 Interfaccia fluida

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## Vedi anche

- [spawn()](/it/docs/reference/spawn.html) -- Crea una coroutine
