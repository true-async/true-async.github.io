---
layout: docs
lang: it
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /it/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — avvia una funzione in una nuova coroutine. Documentazione completa: parametri, valore di ritorno, esempi."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — Avvia una funzione per l'esecuzione in una nuova coroutine. Crea una coroutine.

## Descrizione

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

Crea e avvia una nuova coroutine. La coroutine verrà eseguita in modo asincrono.

## Parametri

**`callback`**
Una funzione o closure da eseguire nella coroutine. Può essere qualsiasi tipo callable valido.

**`args`**
Parametri opzionali passati a `callback`. I parametri vengono passati per valore.

## Valori di ritorno

Restituisce un oggetto `Async\Coroutine` che rappresenta la coroutine avviata. L'oggetto può essere utilizzato per:
- Ottenere il risultato tramite `await()`
- Annullare l'esecuzione tramite `cancel()`
- Controllare lo stato della coroutine

## Esempi

### Esempio #1 Uso base di spawn()

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// La coroutine viene eseguita in modo asincrono
echo "Coroutine avviata\n";

$result = await($coroutine);
echo "Risultato ricevuto\n";
?>
```

### Esempio #2 Coroutine multiple

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// Tutte le richieste vengono eseguite contemporaneamente
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Scaricati: " . strlen($content) . " byte\n";
}
?>
```

### Esempio #3 Uso con una closure

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### Esempio #4 spawn con Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine 1\n";
});

$scope->spawn(function() {
    echo "Coroutine 2\n";
});

// Attendi il completamento di tutte le coroutine nello scope
$scope->awaitCompletion();
?>
```

### Esempio #5 Passaggio di parametri

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Somma: $result\n"; // Somma: 60
?>
```

### Esempio #6 Gestione degli errori

Un modo per gestire un'eccezione da una coroutine è utilizzare la funzione `await()`:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Errore casuale");
    }
    return "Successo";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Errore: " . $e->getMessage();
}
?>
```

## Note

> **Nota:** Le coroutine create tramite `spawn()` vengono eseguite in modo concorrente, ma non in parallelo.
> PHP TrueAsync utilizza un modello di esecuzione a thread singolo.

> **Nota:** I parametri vengono passati alla coroutine per valore.
> Per passare per riferimento, utilizzare una closure con `use (&$var)`.

## Changelog

| Versione | Descrizione                      |
|----------|----------------------------------|
| 1.0.0    | Aggiunta la funzione `spawn()`  |

## Vedi anche

- [await()](/it/docs/reference/await.html) - Attesa del risultato di una coroutine
- [suspend()](/it/docs/reference/suspend.html) - Sospensione dell'esecuzione di una coroutine
