---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "Ottieni l'eccezione che si è verificata in una coroutine."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

Restituisce l'eccezione che si è verificata nella coroutine. Se la coroutine si è completata con successo o non è ancora completata, restituisce `null`. Se la coroutine è stata annullata, restituisce un oggetto `AsyncCancellation`.

## Valore di ritorno

`mixed` -- l'eccezione o `null`.

- `null` -- se la coroutine non è completata o si è completata con successo
- `Throwable` -- se la coroutine si è completata con un errore
- `AsyncCancellation` -- se la coroutine è stata annullata

## Errori

Lancia `RuntimeException` se la coroutine è attualmente in esecuzione.

## Esempi

### Esempio #1 Completamento con successo

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "successo";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### Esempio #2 Completamento con errore

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("errore test");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // Catturato durante await
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(11) "errore test"
```

### Esempio #3 Coroutine annullata

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## Vedi anche

- [Coroutine::getResult](/it/docs/reference/coroutine/get-result.html) -- Ottieni il risultato
- [Coroutine::isCancelled](/it/docs/reference/coroutine/is-cancelled.html) -- Verifica l'annullamento
- [Eccezioni](/it/docs/components/exceptions.html) -- Gestione degli errori
