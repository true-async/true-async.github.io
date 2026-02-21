---
layout: docs
lang: it
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /it/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — crea un oggetto timeout per limitare il tempo di attesa."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — Crea un oggetto `Async\Timeout` che si attiva dopo il numero di millisecondi specificato.

## Descrizione

```php
timeout(int $ms): Async\Awaitable
```

Crea un timer che lancia `Async\TimeoutException` dopo `$ms` millisecondi.
Utilizzato come limitatore del tempo di attesa in `await()` e altre funzioni.

## Parametri

**`ms`**
Tempo in millisecondi. Deve essere maggiore di 0.

## Valori di ritorno

Restituisce un oggetto `Async\Timeout` che implementa `Async\Completable`.

## Errori/Eccezioni

- `ValueError` — se `$ms` <= 0.

## Esempi

### Esempio #1 Timeout su await()

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "La richiesta non si è completata entro 3 secondi\n";
}
?>
```

### Esempio #2 Timeout su un gruppo di task

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Non tutte le richieste sono state completate entro 5 secondi\n";
}
?>
```

### Esempio #3 Annullamento di un timeout

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// L'operazione si è completata prima — annulla il timer
$timer->cancel();
?>
```

## Vedi anche

- [delay()](/it/docs/reference/delay.html) — sospensione di una coroutine
- [await()](/it/docs/reference/await.html) — attesa con annullamento
