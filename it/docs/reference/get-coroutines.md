---
layout: docs
lang: it
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /it/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — ottieni un elenco di tutte le coroutine attive per la diagnostica."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — Restituisce un array di tutte le coroutine attive. Utile per la diagnostica e il monitoraggio.

## Descrizione

```php
get_coroutines(): array
```

## Valori di ritorno

Un array di oggetti `Async\Coroutine` — tutte le coroutine registrate nella richiesta corrente.

## Esempi

### Esempio #1 Monitoraggio delle coroutine

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// Lascia che le coroutine si avviino
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Coroutine #%d: %s, creata a %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'sospesa' : 'in esecuzione',
        $coro->getSpawnLocation()
    );
}
?>
```

### Esempio #2 Rilevamento di leak

```php
<?php
use function Async\get_coroutines;

// Alla fine di una richiesta, controlla le coroutine non terminate
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Coroutine non terminata: " . $coro->getSpawnLocation());
    }
}
?>
```

## Vedi anche

- [current_coroutine()](/it/docs/reference/current-coroutine.html) — coroutine corrente
- [Coroutine](/it/docs/components/coroutines.html) — il concetto di coroutine
