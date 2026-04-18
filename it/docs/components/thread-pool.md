---
layout: docs
lang: it
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /it/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — un pool di thread worker per l'esecuzione parallela di attività CPU-bound in TrueAsync."
---

# Async\ThreadPool: pool di thread worker

## Perché ThreadPool

[`spawn_thread()`](/it/docs/reference/spawn-thread.html) risolve il problema "un'attività — un thread":
avvia un calcolo pesante, attendi il risultato, il thread termina. Questo è conveniente, ma ha un
costo: **ogni avvio di thread è una system call completa**. Inizializzare un ambiente PHP separato,
caricare il bytecode di Opcache, allocare uno stack — tutto questo avviene da zero. Con centinaia o
migliaia di tali attività, l'overhead diventa percepibile.

`Async\ThreadPool` risolve questo problema: all'avvio, viene creato un insieme fisso di **thread
worker** (thread OS con il proprio ambiente PHP), che vivono per l'intera durata del programma e vengono
**riutilizzati ripetutamente** per eseguire le attività. Ogni `submit()` inserisce un'attività nella
coda, un worker libero la raccoglie, la esegue e restituisce il risultato tramite
[`Async\Future`](/it/docs/components/future.html).

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // Invia 8 attività a un pool di 4 worker
    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $sum = 0;
            for ($k = 0; $k < 1_000_000; $k++) {
                $sum += sqrt($k);
            }
            return ['task' => $i, 'sum' => (int) $sum];
        });
    }

    foreach ($futures as $f) {
        $result = await($f);
        echo "task {$result['task']}: {$result['sum']}\n";
    }

    $pool->close();
});
```

Otto attività vengono eseguite in parallelo su quattro worker. Mentre i worker calcolano — il programma
principale (altre coroutine) continua a girare: `await($f)` sospende solo la coroutine in attesa, non
l'intero processo.

## Quando usare ThreadPool vs spawn_thread o coroutine

| Scenario                                                 | Strumento                |
|----------------------------------------------------------|--------------------------|
| Un'attività pesante, avviata raramente                   | `spawn_thread()`         |
| Molte attività CPU brevi in un ciclo                     | `ThreadPool`             |
| Un thread fisso che vive per l'intero programma          | `ThreadPool`             |
| I/O: rete, database, filesystem                          | Coroutine                |
| Attività necessaria immediatamente, senza coda           | `spawn_thread()`         |

**Regola chiave:** se le attività sono molte e brevi — un pool ammortizza il costo di avvio dei thread.
Se c'è un'attività avviata una volta ogni pochi secondi — `spawn_thread()` è sufficiente.

Una dimensione tipica del pool è pari al numero di core CPU fisici (`nproc` su Linux,
`sysconf(_SC_NPROCESSORS_ONLN)` in C). Più worker dei core non accelera i carichi di lavoro CPU-bound
e aggiunge solo overhead di cambio di contesto.

## Creazione di un pool

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| Parametro    | Tipo  | Scopo                                                                | Predefinito       |
|--------------|-------|----------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | Numero di thread worker. Tutti si avviano alla creazione del pool    | **obbligatorio**  |
| `$queueSize` | `int` | Lunghezza massima della coda di attività in sospeso                  | `workers × 4`     |

Tutti i thread worker si avviano **immediatamente alla creazione** del pool — `new ThreadPool(4)` crea
quattro thread subito. Questo è un piccolo investimento iniziale, ma le successive chiamate `submit()`
non hanno overhead di avvio del thread.

`$queueSize` limita la dimensione della coda interna delle attività. Se la coda è piena (tutti i
worker sono occupati e ci sono già `$queueSize` attività nella coda), il prossimo `submit()` **sospende
la coroutine chiamante** finché un worker non diventa disponibile. Un valore pari a zero significa
`workers × 4`.

## Invio di attività

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

Aggiunge un'attività alla coda del pool. Restituisce un [`Async\Future`](/it/docs/components/future.html)
che:

- **si risolve** con il valore di `return` di `$task` quando il worker termina l'esecuzione;
- **viene rifiutato** con un'eccezione se `$task` ha lanciato un'eccezione.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // Attività senza argomenti
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // Attività con argomenti — gli argomenti vengono anche passati per valore (copia profonda)
    $f2 = $pool->submit(function(int $n, string $prefix) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return "$prefix: $sum";
    }, 1_000_000, 'result');

    echo await($f1), "\n";
    echo await($f2), "\n";

    $pool->close();
});
```

```
HELLO FROM WORKER
result: 499999500000
```

#### Gestione delle eccezioni da un'attività

Se un'attività lancia un'eccezione, il `Future` viene rifiutato e `await()` la rilancia nella
coroutine chiamante:

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        throw new RuntimeException('something went wrong in the worker');
    });

    try {
        await($f);
    } catch (RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
    }

    $pool->close();
});
```

```
Caught: something went wrong in the worker
```

#### Regole di trasferimento dei dati

L'attività (`$task`) e tutti i `...$args` vengono **copiati in profondità** nel thread worker — le
stesse regole di `spawn_thread()`. Non puoi passare `stdClass`, riferimenti PHP (`&$var`) o risorse;
il tentativo di farlo causerà alla sorgente il lancio di `Async\ThreadTransferException`. Maggiori
dettagli: [«Trasferimento di dati tra thread»](/it/docs/components/threads.html#trasferimento-di-dati-tra-thread).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

Applica `$task` a ogni elemento di `$items` in parallelo usando i worker del pool. **Blocca** la
coroutine chiamante finché tutte le attività non sono completate. Restituisce un array di risultati
nello stesso ordine dei dati di input.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} lines\n";
    }

    $pool->close();
});
```

Se almeno un'attività lancia un'eccezione, `map()` la rilancia nella coroutine chiamante.
L'ordine dei risultati corrisponde sempre all'ordine degli elementi di input, indipendentemente
dall'ordine in cui i worker terminano.

## Monitoraggio dello stato del pool

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // Avvia diverse attività
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // Simula lavoro
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // Controlla i contatori mentre le attività sono in esecuzione
    delay(50); // dai ai worker il tempo di avviarsi
    echo "workers:   ", $pool->getWorkerCount(), "\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    foreach ($futures as $f) {
        await($f);
    }

    echo "--- after all done ---\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    $pool->close();
});
```

```
workers:   3
pending:   3
running:   3
completed: 0
--- after all done ---
pending:   0
running:   0
completed: 6
```

| Metodo                | Cosa restituisce                                                                        |
|-----------------------|-----------------------------------------------------------------------------------------|
| `getWorkerCount()`    | Numero di thread worker (impostato nel costruttore)                                     |
| `getPendingCount()`   | Attività nella coda, non ancora raccolte da un worker                                   |
| `getRunningCount()`   | Attività attualmente in esecuzione da un worker                                         |
| `getCompletedCount()` | Totale attività completate dalla creazione del pool (monotonicamente crescente)         |
| `isClosed()`          | `true` se il pool è stato chiuso tramite `close()` o `cancel()`                        |

I contatori sono implementati come variabili atomiche — sono accurati in qualsiasi momento, anche
quando i worker girano in thread paralleli.

## Arresto del pool

I thread worker vivono finché il pool non viene esplicitamente fermato. Chiama sempre `close()`
o `cancel()` quando hai finito — altrimenti i thread continueranno a girare fino alla fine del processo.

### close() — arresto graduale

```php
$pool->close();
```

Dopo aver chiamato `close()`:

- Le nuove chiamate `submit()` lanciano immediatamente `Async\ThreadPoolException`.
- Le attività già nella coda o in esecuzione dai worker **si completano normalmente**.
- Il metodo ritorna solo dopo che tutte le attività in corso sono terminate e tutti i worker si sono fermati.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        return 'finished';
    });

    $pool->close();

    echo await($f), "\n"; // Garantito di ottenere il risultato

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
    }
});
```

```
finished
Error: Cannot submit task: thread pool is closed
```

### cancel() — arresto forzato

```php
$pool->cancel();
```

Dopo aver chiamato `cancel()`:

- Le nuove chiamate `submit()` lanciano `Async\ThreadPoolException`.
- Le attività nella coda (non ancora raccolte da un worker) vengono **immediatamente rifiutate** —
  i corrispondenti oggetti `Future` passano allo stato "rifiutato".
- Le attività già in esecuzione dai worker **vengono eseguite fino al completamento** dell'iterazione
  corrente (interrompere forzatamente il codice PHP all'interno di un thread non è possibile).
- I worker si fermano immediatamente dopo aver completato l'attività corrente e non raccolgono nuove attività.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Riempi la coda con attività
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Annulla immediatamente — le attività nella coda verranno rifiutate
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";
    echo "cancelled: $cancelled\n";
});
```

```
done:      2
cancelled: 6
```

### Confronto tra close() e cancel()

| Aspetto                         | `close()`                          | `cancel()`                            |
|---------------------------------|------------------------------------|---------------------------------------|
| Nuove chiamate submit()         | Lancia `ThreadPoolException`       | Lancia `ThreadPoolException`          |
| Attività nella coda             | Eseguite normalmente               | Rifiutate immediatamente              |
| Attività attualmente in esecuzione | Completate normalmente          | Completate normalmente (iterazione corrente) |
| Quando si fermano i worker      | Dopo lo svuotamento della coda     | Dopo il completamento dell'attività corrente |

## Passare un pool tra thread

L'oggetto `ThreadPool` è di per sé thread-safe: può essere passato in `spawn_thread()` tramite `use()`,
e qualsiasi thread può chiamare `submit()` sullo stesso pool.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // Crea il pool una volta nel thread principale
    $pool = new ThreadPool(workers: 4);

    // Avvia un thread OS che utilizzerà anche il pool
    $producer = spawn_thread(function() use ($pool) {
        $futures = [];
        for ($i = 0; $i < 10; $i++) {
            $futures[] = $pool->submit(function() use ($i) {
                return $i * $i;
            });
        }
        $results = [];
        foreach ($futures as $f) {
            $results[] = await($f);
        }
        return $results;
    });

    $squares = await($producer);
    echo implode(', ', $squares), "\n";

    $pool->close();
});
```

```
0, 1, 4, 9, 16, 25, 36, 49, 64, 81
```

Questo consente architetture in cui più thread OS o coroutine **condividono un singolo pool**,
inviando attività ad esso indipendentemente l'uno dall'altro.

## Esempio completo: elaborazione parallela di immagini

Il pool viene creato una volta. Ogni worker riceve un percorso file, apre l'immagine tramite GD,
la ridimensiona alle dimensioni specificate, la converte in scala di grigi e la salva nella directory
di output. Il thread principale raccoglie i risultati man mano che diventano disponibili.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// Questa funzione viene eseguita in un thread worker.
// Le operazioni GD sono CPU-bound — esattamente il tipo di attività che beneficia dei thread.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // Apri sorgente
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // Ridimensiona preservando le proporzioni
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // Converti in scala di grigi
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // Salva nella directory di output
    $outPath = $outDir . '/' . basename($src, '.' . pathinfo($src, PATHINFO_EXTENSION)) . '_thumb.jpg';
    imagejpeg($resized, $outPath, quality: 85);
    $outSize = filesize($outPath);
    imagedestroy($resized);

    return [
        'src'     => $src,
        'out'     => $outPath,
        'size_kb' => round($outSize / 1024, 1),
        'width'   => $newW,
        'height'  => $newH,
    ];
}

spawn(function() {
    $srcDir  = '/var/www/uploads/originals';
    $outDir  = '/var/www/uploads/thumbs';
    $maxW    = 800;

    // Lista di file da elaborare
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() preserva l'ordine — results[i] corrisponde a files[i]
    $results = $pool->map($files, fn(string $path) => processImage($path, $outDir, $maxW));

    $totalKb = 0;
    foreach ($results as $r) {
        echo sprintf("%-40s → %s  (%dx%d, %.1f KB)\n",
            basename($r['src']), basename($r['out']),
            $r['width'], $r['height'], $r['size_kb']
        );
        $totalKb += $r['size_kb'];
    }

    echo sprintf("\nProcessed: %d files, total %.1f KB\n", count($results), $totalKb);
    $pool->close();
});
```

```
photo_001.jpg                            → photo_001_thumb.jpg  (800x533, 42.3 KB)
photo_002.png                            → photo_002_thumb.jpg  (800x600, 38.7 KB)
photo_003.jpg                            → photo_003_thumb.jpg  (800x450, 51.2 KB)
...
Processed: 20 files, total 876.4 KB
```

## Vedi anche

- [`spawn_thread()`](/it/docs/reference/spawn-thread.html) — avvio di una singola attività in un thread separato
- [`Async\Thread`](/it/docs/components/threads.html) — thread OS e regole di trasferimento dati
- [`Async\ThreadChannel`](/it/docs/components/thread-channels.html) — canali thread-safe
- [`Async\Future`](/it/docs/components/future.html) — attesa del risultato di un'attività
