---
layout: docs
lang: it
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /it/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "La classe Async\\Coroutine -- creazione, ciclo di vita, stati, cancellazione, debugging e riferimento completo dei metodi."
---

# La Classe Async\Coroutine

(PHP 8.6+, True Async 1.0)

## Le Coroutine in TrueAsync

Quando una funzione regolare chiama un'operazione di I/O come `fread` o `fwrite` (lettura di un file o richiesta di rete),
il controllo viene passato al kernel del sistema operativo, e `PHP` si blocca fino al completamento dell'operazione.

Ma se una funzione viene eseguita all'interno di una coroutine e chiama un'operazione di I/O,
solo la coroutine si blocca, non l'intero processo `PHP`.
Nel frattempo, il controllo viene passato a un'altra coroutine, se ne esiste una.

In questo senso, le coroutine sono molto simili ai thread del sistema operativo,
ma sono gestite nello spazio utente anziché dal kernel del SO.

Un'altra differenza importante è che le coroutine condividono il tempo CPU a turno,
cedendo volontariamente il controllo, mentre i thread possono essere interrotti in qualsiasi momento.

Le coroutine di TrueAsync vengono eseguite all'interno di un singolo thread
e non sono parallele. Questo porta a diverse conseguenze importanti:
- Le variabili possono essere liberamente lette e modificate da diverse coroutine senza lock, poiché non vengono eseguite simultaneamente.
- Le coroutine non possono utilizzare simultaneamente più core della CPU.
- Se una coroutine esegue una lunga operazione sincrona, blocca l'intero processo, poiché non cede il controllo alle altre coroutine.

## Creazione di una Coroutine

Una coroutine viene creata usando la funzione `spawn()`:

```php
use function Async\spawn;

// Crea una coroutine
$coroutine = spawn(function() {
    echo "Ciao dalla coroutine!\n";
    return 42;
});

// $coroutine è un oggetto di tipo Async\Coroutine
// La coroutine è già pianificata per l'esecuzione
```

Una volta chiamato `spawn`, la funzione verrà eseguita in modo asincrono dallo scheduler il prima possibile.

## Passaggio di Parametri

La funzione `spawn` accetta un `callable` e qualsiasi parametro che verrà passato a quella funzione
quando viene avviata.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// Passa la funzione e i parametri
$coroutine = spawn(fetchUser(...), 123);
```

## Ottenere il Risultato

Per ottenere il risultato di una coroutine, usa `await()`:

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Fatto!";
});

echo "Coroutine avviata\n";

// Attendi il risultato
$result = await($coroutine);

echo "Risultato: $result\n";
```

**Importante:** `await()` blocca l'esecuzione della **coroutine corrente**, ma non dell'intero processo `PHP`.
Le altre coroutine continuano a funzionare.

## Ciclo di Vita della Coroutine

Una coroutine attraversa diversi stati:

1. **In coda** -- creata tramite `spawn()`, in attesa di essere avviata dallo scheduler
2. **In esecuzione** -- attualmente in esecuzione
3. **Sospesa** -- in pausa, in attesa di I/O o `suspend()`
4. **Completata** -- ha terminato l'esecuzione (con un risultato o un'eccezione)
5. **Cancellata** -- cancellata tramite `cancel()`

### Controllo dello Stato

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - in attesa di avvio
var_dump($coro->isStarted());   // false - non ancora avviata

suspend(); // lascia avviare la coroutine

var_dump($coro->isStarted());    // true - la coroutine è stata avviata
var_dump($coro->isRunning());    // false - non in esecuzione al momento
var_dump($coro->isSuspended());  // true - sospesa, in attesa di qualcosa
var_dump($coro->isCompleted());  // false - non ancora terminata
var_dump($coro->isCancelled());  // false - non cancellata
```

## Sospensione: suspend

La parola chiave `suspend` ferma la coroutine e passa il controllo allo scheduler:

```php
spawn(function() {
    echo "Prima di suspend\n";

    suspend(); // Ci fermiamo qui

    echo "Dopo suspend\n";
});

echo "Codice principale\n";

// Output:
// Prima di suspend
// Codice principale
// Dopo suspend
```

La coroutine si è fermata a `suspend`, il controllo è tornato al codice principale. Successivamente, lo scheduler ha ripreso la coroutine.

### suspend con attesa

Tipicamente `suspend` viene usato per attendere qualche evento:

```php
spawn(function() {
    echo "Esecuzione di una richiesta HTTP\n";

    $data = file_get_contents('https://api.example.com/data');
    // All'interno di file_get_contents, suspend viene chiamato implicitamente
    // Mentre la richiesta di rete è in corso, la coroutine è sospesa

    echo "Dati ricevuti: $data\n";
});
```

PHP sospende automaticamente la coroutine sulle operazioni di I/O. Non è necessario scrivere manualmente `suspend`.

## Cancellazione di una Coroutine

```php
$coro = spawn(function() {
    try {
        echo "Inizio lavoro lungo\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // Pausa di 100ms
            echo "Iterazione $i\n";
        }

        echo "Terminato\n";
    } catch (Async\AsyncCancellation $e) {
        echo "Sono stato cancellato durante un'iterazione\n";
    }
});

// Lascia lavorare la coroutine per 1 secondo
Async\sleep(1000);

// Cancellala
$coro->cancel();

// La coroutine riceverà AsyncCancellation al prossimo await/suspend
```

**Importante:** La cancellazione funziona in modo cooperativo. La coroutine deve verificare la cancellazione (tramite `await`, `sleep` o `suspend`). Non è possibile terminare forzatamente una coroutine.

## Coroutine Multiple

Lancia quante ne vuoi:

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// Attendi tutte le coroutine
$results = array_map(fn($t) => await($t), $tasks);

echo "Caricati " . count($results) . " risultati\n";
```

Tutte le 10 richieste vengono eseguite concorrentemente. Invece di 10 secondi (un secondo ciascuna), si completa in ~1 secondo.

## Gestione degli Errori

Gli errori nelle coroutine vengono gestiti con il normale `try-catch`:

```php
$coro = spawn(function() {
    throw new Exception("Ops!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Errore catturato: " . $e->getMessage() . "\n";
}
```

Se l'errore non viene catturato, si propaga allo scope genitore:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Errore nella coroutine!");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Errore propagato allo scope: " . $e->getMessage() . "\n";
}
```

## Coroutine = Oggetto

Una coroutine è un oggetto PHP a tutti gli effetti. Puoi passarla ovunque:

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // Lavoro lungo
        Async\sleep(10000);
        return "Risultato";
    });
}

$task = startBackgroundTask();

// Passa a un'altra funzione
processTask($task);

// O memorizza in un array
$tasks[] = $task;

// O in una proprietà di un oggetto
$this->backgroundTask = $task;
```

## Coroutine Annidate

Le coroutine possono lanciare altre coroutine:

```php
spawn(function() {
    echo "Coroutine genitore\n";

    $child1 = spawn(function() {
        echo "Coroutine figlia 1\n";
        return "Risultato 1";
    });

    $child2 = spawn(function() {
        echo "Coroutine figlia 2\n";
        return "Risultato 2";
    });

    // Attendi entrambe le coroutine figlie
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Il genitore ha ricevuto: $result1 e $result2\n";
});
```

## Finally: Pulizia Garantita

Anche se una coroutine viene cancellata, `finally` verrà eseguito:

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // Potrebbe essere cancellata qui
        }
    } finally {
        // Il file verrà chiuso in ogni caso
        fclose($file);
        echo "File chiuso\n";
    }
});
```

## Debug delle Coroutine

### Ottenere lo Stack delle Chiamate

```php
$coro = spawn(function() {
    doSomething();
});

// Ottieni lo stack delle chiamate della coroutine
$trace = $coro->getTrace();
print_r($trace);
```

### Scoprire Dove È Stata Creata una Coroutine

```php
$coro = spawn(someFunction(...));

// Dove è stato chiamato spawn()
echo "Coroutine creata in: " . $coro->getSpawnLocation() . "\n";
// Output: "Coroutine creata in: /app/server.php:42"

// O come array [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### Scoprire Dove È Sospesa una Coroutine

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // si sospende qui
});

suspend(); // lascia avviare la coroutine

echo "Sospesa in: " . $coro->getSuspendLocation() . "\n";
// Output: "Sospesa in: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### Informazioni di Attesa

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// Scopri cosa sta attendendo la coroutine
$info = $coro->getAwaitingInfo();
print_r($info);
```

Molto utile per il debugging -- puoi vedere immediatamente da dove proviene una coroutine e dove si è fermata.

## Coroutine vs Thread

| Coroutine                     | Thread                        |
|-------------------------------|-------------------------------|
| Leggere                       | Pesanti                       |
| Creazione rapida (<1us)       | Creazione lenta (~1ms)        |
| Singolo thread del SO         | Thread multipli del SO        |
| Multitasking cooperativo      | Multitasking preemptivo       |
| Nessuna race condition        | Race condition possibili      |
| Richiede punti di await       | Può essere interrotto ovunque |
| Per operazioni di I/O         | Per calcoli CPU-bound         |

## Cancellazione Posticipata con protect()

Se una coroutine si trova all'interno di una sezione protetta tramite `protect()`, la cancellazione viene posticipata fino al completamento del blocco protetto:

```php
$coro = spawn(function() {
    $result = protect(function() {
        // Operazione critica -- la cancellazione è posticipata
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "salvato";
    });

    // La cancellazione avverrà qui, dopo l'uscita da protect()
    echo "Risultato: $result\n";
});

suspend();

$coro->cancel(); // La cancellazione è posticipata -- protect() verrà completato interamente
```

Il flag `isCancellationRequested()` diventa `true` immediatamente, mentre `isCancelled()` diventa `true` solo dopo che la coroutine è effettivamente terminata.

## Panoramica della Classe

```php
final class Async\Coroutine implements Async\Completable {

    /* Identificazione */
    public getId(): int

    /* Priorità */
    public asHiPriority(): Coroutine

    /* Contesto */
    public getContext(): Async\Context

    /* Risultato ed errori */
    public getResult(): mixed
    public getException(): mixed

    /* Stato */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* Controllo */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* Debug */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## Contenuti

- [Coroutine::getId](/it/docs/reference/coroutine/get-id.html) -- Ottieni l'identificatore univoco della coroutine
- [Coroutine::asHiPriority](/it/docs/reference/coroutine/as-hi-priority.html) -- Marca la coroutine come ad alta priorità
- [Coroutine::getContext](/it/docs/reference/coroutine/get-context.html) -- Ottieni il contesto locale della coroutine
- [Coroutine::getResult](/it/docs/reference/coroutine/get-result.html) -- Ottieni il risultato dell'esecuzione
- [Coroutine::getException](/it/docs/reference/coroutine/get-exception.html) -- Ottieni l'eccezione della coroutine
- [Coroutine::isStarted](/it/docs/reference/coroutine/is-started.html) -- Verifica se la coroutine è stata avviata
- [Coroutine::isQueued](/it/docs/reference/coroutine/is-queued.html) -- Verifica se la coroutine è in coda
- [Coroutine::isRunning](/it/docs/reference/coroutine/is-running.html) -- Verifica se la coroutine è attualmente in esecuzione
- [Coroutine::isSuspended](/it/docs/reference/coroutine/is-suspended.html) -- Verifica se la coroutine è sospesa
- [Coroutine::isCompleted](/it/docs/reference/coroutine/is-completed.html) -- Verifica se la coroutine è completata
- [Coroutine::isCancelled](/it/docs/reference/coroutine/is-cancelled.html) -- Verifica se la coroutine è stata cancellata
- [Coroutine::isCancellationRequested](/it/docs/reference/coroutine/is-cancellation-requested.html) -- Verifica se è stata richiesta la cancellazione
- [Coroutine::cancel](/it/docs/reference/coroutine/cancel.html) -- Cancella la coroutine
- [Coroutine::finally](/it/docs/reference/coroutine/on-finally.html) -- Registra un handler di completamento
- [Coroutine::getTrace](/it/docs/reference/coroutine/get-trace.html) -- Ottieni lo stack delle chiamate di una coroutine sospesa
- [Coroutine::getSpawnFileAndLine](/it/docs/reference/coroutine/get-spawn-file-and-line.html) -- Ottieni il file e la riga dove la coroutine è stata creata
- [Coroutine::getSpawnLocation](/it/docs/reference/coroutine/get-spawn-location.html) -- Ottieni la posizione di creazione come stringa
- [Coroutine::getSuspendFileAndLine](/it/docs/reference/coroutine/get-suspend-file-and-line.html) -- Ottieni il file e la riga dove la coroutine è stata sospesa
- [Coroutine::getSuspendLocation](/it/docs/reference/coroutine/get-suspend-location.html) -- Ottieni la posizione di sospensione come stringa
- [Coroutine::getAwaitingInfo](/it/docs/reference/coroutine/get-awaiting-info.html) -- Ottieni informazioni di attesa

## Cosa Leggere Dopo

- [Scope](/it/docs/components/scope.html) -- gestione di gruppi di coroutine
- [Cancellazione](/it/docs/components/cancellation.html) -- dettagli sulla cancellazione e protect()
- [spawn()](/it/docs/reference/spawn.html) -- documentazione completa
- [await()](/it/docs/reference/await.html) -- documentazione completa
