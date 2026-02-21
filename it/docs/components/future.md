---
layout: docs
lang: it
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /it/docs/components/future.html
page_title: "Future"
description: "Future in TrueAsync -- una promessa di risultato, catene di trasformazione map/catch/finally, FutureState e diagnostica."
---

# Future: Una Promessa di Risultato

## Cos'è Future

`Async\Future` è un oggetto che rappresenta il risultato di un'operazione che potrebbe non essere ancora pronta.
Future permette di:

- Attendere il risultato tramite `await()` o `$future->await()`
- Costruire catene di trasformazione tramite `map()`, `catch()`, `finally()`
- Cancellare l'operazione tramite `cancel()`
- Creare Future già completati tramite factory statiche

Future è simile a `Promise` in JavaScript, ma integrato con le coroutine di TrueAsync.

## Future e FutureState

Future è diviso in due classi con una chiara separazione delle responsabilità:

- **`FutureState`** -- un contenitore mutabile attraverso cui viene scritto il risultato
- **`Future`** -- un wrapper di sola lettura attraverso cui il risultato viene letto e trasformato

```php
<?php
use Async\Future;
use Async\FutureState;

// Crea FutureState -- possiede lo stato
$state = new FutureState();

// Crea Future -- fornisce accesso al risultato
$future = new Future($state);

// Passa $future al consumatore
// Passa $state al produttore

// Il produttore completa l'operazione
$state->complete(42);

// Il consumatore ottiene il risultato
$result = $future->await(); // 42
?>
```

Questa separazione garantisce che il consumatore non possa completare accidentalmente il Future -- solo il detentore di `FutureState` ha questo diritto.

## Creazione di un Future

### Tramite FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// Completa in un'altra coroutine
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### Factory Statiche

Per creare Future già completati:

```php
<?php
use Async\Future;

// Future completato con successo
$future = Future::completed(42);
$result = $future->await(); // 42

// Future con un errore
$future = Future::failed(new \RuntimeException('Qualcosa è andato storto'));
$result = $future->await(); // lancia RuntimeException
?>
```

## Catene di Trasformazione

Future supporta tre metodi di trasformazione, funzionanti in modo simile a Promise in JavaScript:

### map() -- Trasformazione del Risultato

Chiamato solo al completamento con successo. Restituisce un nuovo Future con il risultato trasformato:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Risultato: $value");

$state->complete(21);

echo $asString->await(); // "Risultato: 42"
?>
```

### catch() -- Gestione degli Errori

Chiamato solo in caso di errore. Permette il recupero da un'eccezione:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Valore predefinito';
});

$state->error(new \RuntimeException('Errore'));

echo $safe->await(); // "Valore predefinito"
?>
```

### finally() -- Esecuzione su Qualsiasi Esito

Viene sempre chiamato -- sia in caso di successo che di errore. Il risultato del Future genitore viene passato al figlio invariato:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // Rilascia risorse
    echo "Operazione completata\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data" (il risultato viene passato invariato)
?>
```

### Catene Composite

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Sconosciuto')
    ->catch(fn(\Throwable $e) => 'Errore: ' . $e->getMessage())
    ->finally(function($value) {
        // Logging
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### Sottoscrittori Indipendenti

Ogni chiamata a `map()` sullo stesso Future crea una catena **indipendente**. I sottoscrittori non si influenzano a vicenda:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// Due catene indipendenti dallo stesso Future
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### Propagazione degli Errori nelle Catene

Se il Future sorgente si completa con un errore, `map()` viene **saltato**, e l'errore viene passato direttamente a `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "Questo codice non verrà eseguito\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Recuperato: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Errore sorgente'));

echo await($result) . "\n"; // "Recuperato: Errore sorgente"
?>
```

Se un'eccezione si verifica **all'interno** di `map()`, viene catturata dal successivo `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Errore in map');
    })
    ->catch(function(\Throwable $e) {
        return 'Catturato: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Catturato: Errore in map"
?>
```

## Attesa del Risultato

### Tramite la Funzione await()

```php
<?php
use function Async\await;

$result = await($future);
```

### Tramite il Metodo $future->await()

```php
<?php
$result = $future->await();

// Con timeout di cancellazione
$result = $future->await(Async\timeout(5000));
```

## Cancellazione di un Future

```php
<?php
use Async\AsyncCancellation;

// Cancella con messaggio predefinito
$future->cancel();

// Cancella con un errore personalizzato
$future->cancel(new AsyncCancellation('L\'operazione non è più necessaria'));
```

## Soppressione degli Avvisi: ignore()

Se un Future non viene utilizzato (nessuna chiamata a `await()`, `map()`, `catch()` o `finally()`), TrueAsync emetterà un avviso.
Per sopprimere esplicitamente questo avviso:

```php
<?php
$future->ignore();
```

Inoltre, se un Future è completato con un errore e quell'errore non è stato gestito, TrueAsync avviserà al riguardo. `ignore()` sopprime anche questo avviso.

## FutureState: Completamento dell'Operazione

### complete() -- Completamento con Successo

```php
<?php
$state->complete($result);
```

### error() -- Completamento con Errore

```php
<?php
$state->error(new \RuntimeException('Errore'));
```

### Vincoli

- `complete()` e `error()` possono essere chiamati **una sola volta**. Una chiamata ripetuta lancerà `AsyncException`.
- Dopo aver chiamato `complete()` o `error()`, lo stato del Future è immutabile.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## Diagnostica

Entrambe le classi (`Future` e `FutureState`) forniscono metodi diagnostici:

```php
<?php
// Verifica lo stato
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Dove è stato creato il Future
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Dove è stato completato il Future
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" o "unknown"

// Informazioni di attesa
$future->getAwaitingInfo(); // array
```

## Esempio Pratico: Client HTTP

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// Utilizzo
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## Vedi Anche

- [await()](/it/docs/reference/await.html) -- attesa del completamento
- [Coroutine](/it/docs/components/coroutines.html) -- l'unità base della concorrenza
- [Cancellazione](/it/docs/components/cancellation.html) -- il meccanismo di cancellazione
