---
layout: docs
lang: it
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /it/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — ottieni l'oggetto della coroutine attualmente in esecuzione."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — Restituisce l'oggetto della coroutine attualmente in esecuzione.

## Descrizione

```php
current_coroutine(): Async\Coroutine
```

## Valori di ritorno

Un oggetto `Async\Coroutine` che rappresenta la coroutine corrente.

## Errori/Eccezioni

`Async\AsyncException` — se chiamata al di fuori di una coroutine.

## Esempi

### Esempio #1 Ottenere l'ID della coroutine

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Coroutine #" . $coro->getId() . "\n";
});
?>
```

### Esempio #2 Diagnostica

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Creata da: " . $coro->getSpawnLocation() . "\n";
    echo "Stato: " . ($coro->isRunning() ? 'in esecuzione' : 'sospesa') . "\n";
});
?>
```

## Vedi anche

- [get_coroutines()](/it/docs/reference/get-coroutines.html) — elenco di tutte le coroutine
- [Coroutine](/it/docs/components/coroutines.html) — il concetto di coroutine
