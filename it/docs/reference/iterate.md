---
layout: docs
lang: it
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /it/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — iterazione concorrente su un array o Traversable con controllo della concorrenza e gestione del ciclo di vita delle coroutine create."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — Itera in modo concorrente su un array o `Traversable`, chiamando un `callback` per ogni elemento.

## Descrizione

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

Esegue il `callback` per ogni elemento di `iterable` in una coroutine separata.
Il parametro `concurrency` consente di limitare il numero di callback in esecuzione simultanea.
La funzione blocca la coroutine corrente fino al completamento di tutte le iterazioni.

Tutte le coroutine create tramite `iterate()` vengono eseguite in uno `Scope` figlio isolato.

## Parametri

**`iterable`**
Un array o un oggetto che implementa `Traversable` (inclusi generatori e `ArrayIterator`).

**`callback`**
Una funzione chiamata per ogni elemento. Accetta due argomenti: `(mixed $value, mixed $key)`.
Se il callback restituisce `false`, l'iterazione si interrompe.

**`concurrency`**
Numero massimo di callback in esecuzione simultanea. Il valore predefinito è `0` — il limite predefinito,
tutti gli elementi vengono elaborati contemporaneamente. Un valore di `1` significa esecuzione in una singola coroutine.

**`cancelPending`**
Controlla il comportamento delle coroutine figlie create all'interno del callback (tramite `spawn()`) dopo il completamento dell'iterazione.
- `true` (predefinito) — tutte le coroutine create non terminate vengono annullate con `AsyncCancellation`.
- `false` — `iterate()` attende il completamento di tutte le coroutine create prima di tornare.

## Valori di ritorno

La funzione non restituisce un valore.

## Errori/Eccezioni

- `Error` — se chiamata fuori da un contesto asincrono o dal contesto dello scheduler.
- `TypeError` — se `iterable` non è un array e non implementa `Traversable`.
- Se il callback lancia un'eccezione, l'iterazione si interrompe, le coroutine rimanenti vengono annullate e l'eccezione viene propagata al codice chiamante.

## Esempi

### Esempio #1 Iterazione base su un array

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " byte\n";
    });

    echo "Tutte le richieste completate\n";
});
?>
```

### Esempio #2 Limitazione della concorrenza

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // Elabora non più di 10 utenti contemporaneamente
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "Utente $userId caricato\n";
    }, concurrency: 10);

    echo "Tutti gli utenti elaborati\n";
});
?>
```

### Esempio #3 Interruzione dell'iterazione per condizione

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Elaborazione: $item\n";

        if ($item === 'cherry') {
            return false; // Interrompi l'iterazione
        }
    });

    echo "Iterazione terminata\n";
});
?>
```

**Output:**
```
Elaborazione: apple
Elaborazione: banana
Elaborazione: cherry
Iterazione terminata
```

### Esempio #4 Iterazione su un generatore

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: elaborazione valore $value\n";
    }, concurrency: 2);

    echo "Tutti i task completati\n";
});
?>
```

### Esempio #5 Annullamento delle coroutine create (cancelPending = true)

Per impostazione predefinita, le coroutine create tramite `spawn()` all'interno del callback vengono annullate dopo il completamento dell'iterazione:

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // Avvia un task in background
        spawn(function() use ($value) {
            try {
                echo "Task in background $value avviato\n";
                suspend();
                suspend();
                echo "Task in background $value terminato\n"; // Non verrà eseguito
            } catch (AsyncCancellation) {
                echo "Task in background $value annullato\n";
            }
        });
    });

    echo "Iterazione terminata\n";
});
?>
```

**Output:**
```
Task in background 1 avviato
Task in background 2 avviato
Task in background 3 avviato
Task in background 1 annullato
Task in background 2 annullato
Task in background 3 annullato
Iterazione terminata
```

### Esempio #6 Attesa delle coroutine create (cancelPending = false)

Se passi `cancelPending: false`, `iterate()` attenderà il completamento di tutte le coroutine create:

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // Avvia un task in background
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // Tutti i task in background sono completati
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**Output:**
```
result-1, result-2, result-3
```

### Esempio #7 Gestione degli errori

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Errore nell'elaborazione dell'elemento $value");
            }
            echo "Elaborato: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Catturato: " . $e->getMessage() . "\n";
    }
});
?>
```

## Note

> **Nota:** `iterate()` crea uno Scope figlio isolato per tutte le coroutine create.

> **Nota:** Quando viene passato un array, `iterate()` ne crea una copia prima dell'iterazione.
> Modificare l'array originale all'interno del callback non influisce sull'iterazione.

> **Nota:** Se il `callback` restituisce `false`, l'iterazione si interrompe,
> ma le coroutine già in esecuzione continuano fino al completamento (o all'annullamento, se `cancelPending = true`).

## Changelog

| Versione | Descrizione                         |
|----------|-------------------------------------|
| 1.0.0    | Aggiunta la funzione `iterate()`.  |

## Vedi anche

- [spawn()](/it/docs/reference/spawn.html) - Avvio di una coroutine
- [await_all()](/it/docs/reference/await-all.html) - Attesa di coroutine multiple
- [Scope](/it/docs/components/scope.html) - Il concetto di Scope
- [Cancellazione](/it/docs/components/cancellation.html) - Annullamento delle coroutine
