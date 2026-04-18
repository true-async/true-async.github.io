---
layout: docs
lang: de
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /de/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — ein Pool von Worker-Threads für die parallele Ausführung CPU-gebundener Aufgaben in TrueAsync."
---

# Async\ThreadPool: Worker-Thread-Pool

## Warum ThreadPool

[`spawn_thread()`](/de/docs/reference/spawn-thread.html) löst das Problem „eine Aufgabe — ein Thread":
Eine schwere Berechnung starten, auf das Ergebnis warten, Thread beendet sich. Das ist bequem, hat
aber einen Preis: **Jeder Thread-Start ist ein vollständiger Systemaufruf**. Eine separate
PHP-Umgebung initialisieren, Opcache-Bytecode laden, einen Stack allozieren — all das geschieht von
Grund auf. Bei Hunderten oder Tausenden solcher Aufgaben wird der Overhead spürbar.

`Async\ThreadPool` löst dieses Problem: Beim Start wird ein fester Satz von **Worker-Threads**
(OS-Threads mit eigener PHP-Umgebung) erstellt, die für die gesamte Lebensdauer des Programms leben
und **wiederholt wiederverwendet** werden, um Aufgaben auszuführen. Jedes `submit()` legt eine
Aufgabe in die Warteschlange, ein freier Worker nimmt sie auf, führt sie aus und gibt das Ergebnis
über [`Async\Future`](/de/docs/components/future.html) zurück.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // 8 Aufgaben an einen Pool mit 4 Workern übermitteln
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

Acht Aufgaben laufen parallel über vier Worker. Während die Worker rechnen, läuft das Hauptprogramm
(andere Coroutinen) weiter: `await($f)` suspendiert nur die wartende Coroutine, nicht den gesamten
Prozess.

## Wann ThreadPool vs. spawn_thread oder Coroutinen verwendet werden sollten

| Szenario                                                  | Werkzeug                 |
|-----------------------------------------------------------|--------------------------|
| Eine schwere Aufgabe, selten gestartet                    | `spawn_thread()`         |
| Viele kurze CPU-Aufgaben in einer Schleife                | `ThreadPool`             |
| Ein fester Thread, der für das gesamte Programm lebt      | `ThreadPool`             |
| I/O: Netzwerk, Datenbank, Dateisystem                     | Coroutinen               |
| Aufgabe sofort benötigt, ohne Warteschlange               | `spawn_thread()`         |

**Schlüsselregel:** Wenn Aufgaben viele und kurz sind — amortisiert ein Pool die Thread-Startkosten.
Wenn es eine Aufgabe gibt, die alle paar Sekunden einmal gestartet wird — ist `spawn_thread()`
ausreichend.

Eine typische Pool-Größe entspricht der Anzahl der physischen CPU-Kerne (`nproc` unter Linux,
`sysconf(_SC_NPROCESSORS_ONLN)` in C). Mehr Worker als Kerne beschleunigen CPU-gebundene Workloads
nicht und erhöhen nur den Kontextwechsel-Overhead.

## Einen Pool erstellen

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| Parameter    | Typ   | Zweck                                                                | Standard          |
|--------------|-------|----------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | Anzahl der Worker-Threads. Alle starten, wenn der Pool erstellt wird | **erforderlich**  |
| `$queueSize` | `int` | Maximale Länge der ausstehenden Aufgaben-Warteschlange               | `workers × 4`     |

Alle Worker-Threads starten **sofort bei der Erstellung** des Pools — `new ThreadPool(4)` erstellt
sofort vier Threads. Das ist eine kleine Vorausinvestition, aber nachfolgende `submit()`-Aufrufe
haben keinen Thread-Start-Overhead.

`$queueSize` begrenzt die Größe der internen Aufgaben-Warteschlange. Wenn die Warteschlange voll
ist (alle Worker sind beschäftigt und bereits `$queueSize` Aufgaben in der Warteschlange), **suspendiert**
das nächste `submit()` **die aufrufende Coroutine**, bis ein Worker verfügbar wird. Ein Wert von
null bedeutet `workers × 4`.

## Aufgaben übermitteln

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

Fügt eine Aufgabe zur Warteschlange des Pools hinzu. Gibt ein [`Async\Future`](/de/docs/components/future.html)
zurück, das:

- **aufgelöst** wird mit dem `return`-Wert von `$task`, wenn der Worker die Ausführung beendet;
- **abgelehnt** wird mit einer Ausnahme, wenn `$task` eine Ausnahme geworfen hat.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // Aufgabe ohne Argumente
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // Aufgabe mit Argumenten — Argumente werden ebenfalls per Wert übergeben (Tiefenkopie)
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

#### Ausnahmen aus einer Aufgabe behandeln

Wenn eine Aufgabe eine Ausnahme wirft, wird der `Future` abgelehnt, und `await()` wirft sie
in der aufrufenden Coroutine erneut:

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

#### Datentransferregeln

Die Aufgabe (`$task`) und alle `...$args` werden **tief kopiert** in den Worker-Thread — dieselben
Regeln wie bei `spawn_thread()`. Man kann kein `stdClass`, PHP-Referenzen (`&$var`) oder Ressourcen
übergeben; der Versuch wird dazu führen, dass die Quelle `Async\ThreadTransferException` wirft.
Mehr Details: [«Datentransfer zwischen Threads»](/de/docs/components/threads.html#datentransfer-zwischen-threads).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

Wendet `$task` auf jedes Element von `$items` parallel mit den Workern des Pools an. **Blockiert**
die aufrufende Coroutine, bis alle Aufgaben abgeschlossen sind. Gibt ein Array von Ergebnissen in
derselben Reihenfolge wie die Eingabedaten zurück.

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

Wenn mindestens eine Aufgabe eine Ausnahme wirft, wirft `map()` sie in der aufrufenden Coroutine
erneut. Die Ergebnisreihenfolge entspricht immer der Eingabereihenfolge, unabhängig davon, in
welcher Reihenfolge die Worker fertig werden.

## Pool-Zustand überwachen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // Mehrere Aufgaben starten
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // Arbeit simulieren
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // Zähler prüfen, während Aufgaben laufen
    delay(50); // Workern Zeit zum Starten geben
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

| Methode               | Was zurückgegeben wird                                                                    |
|-----------------------|-------------------------------------------------------------------------------------------|
| `getWorkerCount()`    | Anzahl der Worker-Threads (im Konstruktor festgelegt)                                     |
| `getPendingCount()`   | Aufgaben in der Warteschlange, noch nicht von einem Worker aufgenommen                    |
| `getRunningCount()`   | Aufgaben, die gerade von einem Worker ausgeführt werden                                   |
| `getCompletedCount()` | Insgesamt abgeschlossene Aufgaben seit der Pool-Erstellung (monoton steigend)             |
| `isClosed()`          | `true`, wenn der Pool über `close()` oder `cancel()` geschlossen wurde                   |

Die Zähler sind als atomare Variablen implementiert — sie sind zu jedem Zeitpunkt akkurat, auch
wenn Worker in parallelen Threads laufen.

## Den Pool herunterfahren

Worker-Threads laufen, bis der Pool explizit gestoppt wird. Rufe immer `close()` oder `cancel()`
auf, wenn du fertig bist — sonst laufen Threads bis zum Ende des Prozesses weiter.

### close() — sauberes Herunterfahren

```php
$pool->close();
```

Nach dem Aufruf von `close()`:

- Neue `submit()`-Aufrufe werfen sofort `Async\ThreadPoolException`.
- Aufgaben, die bereits in der Warteschlange sind oder von Workern ausgeführt werden, **werden normal abgeschlossen**.
- Die Methode gibt erst zurück, nachdem alle laufenden Aufgaben beendet und alle Worker gestoppt sind.

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

    echo await($f), "\n"; // Ergebnis ist garantiert

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

### cancel() — hartes/erzwungenes Herunterfahren

```php
$pool->cancel();
```

Nach dem Aufruf von `cancel()`:

- Neue `submit()`-Aufrufe werfen `Async\ThreadPoolException`.
- Aufgaben in der Warteschlange (noch nicht von einem Worker aufgenommen) werden **sofort abgelehnt** —
  die entsprechenden `Future`-Objekte wechseln in den „abgelehnt"-Zustand.
- Aufgaben, die bereits von Workern ausgeführt werden, **laufen bis zum Abschluss** der aktuellen
  Iteration (das gewaltsame Unterbrechen von PHP-Code innerhalb eines Threads ist nicht möglich).
- Worker stoppen sofort nach Abschluss der aktuellen Aufgabe und nehmen keine neuen auf.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Warteschlange mit Aufgaben füllen
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Sofort abbrechen — Aufgaben in der Warteschlange werden abgelehnt
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

### Vergleich von close() und cancel()

| Aspekt                          | `close()`                          | `cancel()`                              |
|---------------------------------|------------------------------------|-----------------------------------------|
| Neue submit()-Aufrufe           | Wirft `ThreadPoolException`        | Wirft `ThreadPoolException`             |
| Aufgaben in der Warteschlange   | Werden normal ausgeführt           | Sofort abgelehnt                        |
| Gerade ausgeführte Aufgaben     | Werden normal abgeschlossen        | Werden normal abgeschlossen (aktuelle Iteration) |
| Wann Worker stoppen             | Nachdem die Warteschlange geleert ist | Nach der aktuellen Aufgabe           |

## Einen Pool zwischen Threads übergeben

Das `ThreadPool`-Objekt ist selbst thread-sicher: Es kann via `use()` in `spawn_thread()` übergeben
werden, und jeder Thread kann `submit()` auf demselben Pool aufrufen.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // Den Pool einmalig im Haupt-Thread erstellen
    $pool = new ThreadPool(workers: 4);

    // Einen OS-Thread starten, der ebenfalls den Pool verwendet
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

Dies ermöglicht Architekturen, bei denen mehrere OS-Threads oder Coroutinen **einen einzelnen Pool
teilen** und unabhängig voneinander Aufgaben an ihn übermitteln.

## Vollständiges Beispiel: parallele Bildverarbeitung

Der Pool wird einmalig erstellt. Jeder Worker erhält einen Dateipfad, öffnet das Bild über GD,
skaliert es auf die angegebenen Abmessungen herunter, konvertiert es in Graustufen und speichert
es im Ausgabeverzeichnis. Der Haupt-Thread sammelt Ergebnisse, sobald sie bereit sind.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// Diese Funktion wird in einem Worker-Thread ausgeführt.
// GD-Operationen sind CPU-gebunden — genau die Art von Aufgaben, die von Threads profitieren.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // Quelle öffnen
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // Skalieren unter Beibehaltung des Seitenverhältnisses
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // In Graustufen konvertieren
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // Im Ausgabeverzeichnis speichern
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

    // Liste der zu verarbeitenden Dateien
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() bewahrt die Reihenfolge — results[i] entspricht files[i]
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

## Siehe auch

- [`spawn_thread()`](/de/docs/reference/spawn-thread.html) — eine einzelne Aufgabe in einem separaten Thread starten
- [`Async\Thread`](/de/docs/components/threads.html) — OS-Threads und Datentransferregeln
- [`Async\ThreadChannel`](/de/docs/components/thread-channels.html) — thread-sichere Channels
- [`Async\Future`](/de/docs/components/future.html) — auf ein Aufgabenergebnis warten
