---
layout: docs
lang: de
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /de/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — ein threadsicherer Kanal zur Datenübertragung zwischen OS-Threads in TrueAsync."
---

# Async\ThreadChannel: Kanäle zwischen OS-Threads

## Unterschied zu einem regulären Channel

`Async\Channel` funktioniert **innerhalb eines einzelnen Threads** — zwischen Coroutinen desselben Schedulers. Seine Daten liegen im **thread-lokalen Speicher**, und die Sicherheit wird dadurch gewährleistet, dass immer nur eine Coroutine gleichzeitig auf den Kanal zugreift.

`Async\ThreadChannel` ist für die Datenübertragung **zwischen OS-Threads** konzipiert. Der Kanalpuffer liegt im **gemeinsamen Speicher**, der für alle Threads zugänglich ist, nicht im Speicher eines einzelnen Threads. Jeder gesendete Wert wird in diesen gemeinsamen Speicher tiefkopiert und auf der Empfängerseite zurück in den thread-lokalen Speicher. Die Synchronisation erfolgt über einen threadsicheren Mutex, sodass `send()` und `recv()` aus verschiedenen OS-Threads heraus gleichzeitig aufgerufen werden können.

| Eigenschaft                        | `Async\Channel`                        | `Async\ThreadChannel`                        |
|------------------------------------|----------------------------------------|----------------------------------------------|
| Geltungsbereich                    | Einzelner OS-Thread                    | Zwischen OS-Threads                          |
| Speicherort der gepufferten Daten  | Thread-lokaler Speicher                | Gemeinsamer Speicher, sichtbar für alle Threads |
| Synchronisation                    | Coroutinen-Scheduler (kooperativ)      | Mutex (threadsicher)                         |
| Rendezvous (capacity=0)            | Unterstützt                            | Nein — immer gepuffert                       |
| Mindestkapazität                   | 0                                      | 1                                            |

Wenn alles in einem einzigen Thread läuft — verwenden Sie `Async\Channel`, er ist leichtgewichtiger. `ThreadChannel` ist nur sinnvoll, wenn wirklich ein Datenaustausch zwischen OS-Threads benötigt wird.

## Einen Kanal erstellen

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — Puffergröße (mindestens `1`). Größere Werte puffern Bursts vom Produzenten besser, verbrauchen jedoch mehr Speicher für die aktive Warteschlange.

## Einfaches Beispiel: Produzent + Konsument

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // Produzent — ein separater OS-Thread
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // Konsument — im Haupt-Thread (eine Coroutine)
    try {
        while (true) {
            $msg = $ch->recv();
            echo "got: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "channel closed\n";
    }

    await($producer);
});
```

```
got: item-1
got: item-2
got: item-3
got: item-4
got: item-5
channel closed
```

Der Produzent schreibt aus einem separaten Thread in den Kanal; der Haupt-Thread liest via `recv()` — nichts Besonderes, es sieht genauso aus wie ein normaler `Channel`.

## send / recv

### `send($value[, $cancellation])`

Sendet einen Wert in den Kanal. Wenn der Puffer voll ist — **suspendiert die aktuelle Coroutine** (kooperative Suspension — andere Coroutinen in diesem Scheduler laufen weiter), bis ein anderer Thread Platz freigibt.

Der Wert wird **tiefkopiert in den gemeinsamen Speicher des Kanals**, nach denselben Regeln wie Variablen, die via `use(...)` in `spawn_thread()` übergeben werden. Objekte mit dynamischen Eigenschaften, PHP-Referenzen und Ressourcen werden mit `Async\ThreadTransferException` abgelehnt.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // Array
$ch->send(new Point(3, 4));                    // Objekt mit deklarierten Eigenschaften
$ch->send($futureState);                       // Async\FutureState (einmalig!)
```

Wenn der Kanal bereits geschlossen ist — wirft `send()` eine `Async\ThreadChannelException`.

### `recv([$cancellation])`

Liest einen Wert aus dem Kanal. Wenn der Puffer leer ist — suspendiert die aktuelle Coroutine, bis Daten ankommen **oder** der Kanal geschlossen wird.

- Wenn Daten ankommen — gibt den Wert zurück.
- Wenn der Kanal geschlossen und der Puffer leer ist — wirft `Async\ThreadChannelException`.
- Wenn der Kanal geschlossen ist, aber der Puffer noch Einträge enthält — **leert zuerst die verbleibenden Daten**, und wirft `ThreadChannelException` erst, wenn der Puffer leer ist.

Dadurch kann ein Kanal nach dem Schließen korrekt geleert werden.

## Kanalzustand

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacity: ", $ch->capacity(), "\n";
    echo "empty: ", ($ch->isEmpty() ? "yes" : "no"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "count after 2 sends: ", count($ch), "\n";
    echo "full: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $ch->send('c');
    echo "full after 3: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "drained: ", implode(',', $got), "\n";

    $ch->close();
    echo "closed: ", ($ch->isClosed() ? "yes" : "no"), "\n";
});
```

```
capacity: 3
empty: yes
count after 2 sends: 2
full: no
full after 3: yes
drained: a,b,c
closed: yes
```

| Methode        | Rückgabe                                            |
|----------------|-----------------------------------------------------|
| `capacity()`   | Im Konstruktor festgelegte Puffergröße              |
| `count()`      | Aktuelle Anzahl der Nachrichten im Puffer           |
| `isEmpty()`    | `true`, wenn der Puffer leer ist                    |
| `isFull()`     | `true`, wenn der Puffer bis zur Kapazität gefüllt ist |
| `isClosed()`   | `true`, wenn der Kanal geschlossen wurde            |

`ThreadChannel` implementiert `Countable`, daher funktioniert `count($ch)`.

## close()

```php
$ch->close();
```

Nach dem Schließen:

- `send()` wirft sofort `Async\ThreadChannelException`.
- `recv()` **leert die verbleibenden Werte**, beginnt dann `ThreadChannelException` zu werfen.
- Alle in `send()` oder `recv()` suspendierten Coroutinen/Threads werden **mit `ThreadChannelException` geweckt**.

Ein Kanal kann nur einmal geschlossen werden. Ein erneuter Aufruf ist ein sicheres No-op.

## Muster: Worker-Pool

Zwei Kanäle — einer für Jobs, einer für Ergebnisse. Worker-Threads lesen Jobs aus dem ersten und legen Ergebnisse in den zweiten.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 Worker-Threads
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // CPU-Last simulieren
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // Jobs-Kanal geschlossen — Worker beendet sich
            }
        });
    }

    // 6 Jobs verteilen
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // Warten, bis alle Worker-Threads fertig sind
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // Ergebnisse leeren
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w processed $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

Jeder Worker hat 2 Jobs bearbeitet — die Last wurde auf drei Threads verteilt.

### Hinweis zur Verteilung

Wenn der Produzent schneller in den Kanal schreibt als die Worker lesen (oder wenn die Worker kaum CPU-Zeit benötigen), **kann der erste Worker alle Jobs sofort übernehmen**, da sein `recv()` zuerst aufwacht und die nächste Nachricht abgreift, bevor die anderen Worker ihr `recv()` erreichen. Dies ist normales Verhalten einer konkurrierenden Warteschlange — faire Verteilung ist nicht garantiert.

Wenn strikte Gleichmäßigkeit erforderlich ist — teilen Sie Aufgaben vorab auf (Shard-by-Hash), oder geben Sie jedem Worker seinen eigenen dedizierten Kanal.

## Komplexe Daten durch den Kanal übertragen

`ThreadChannel` kann alles übertragen, was der threadübergreifende Datentransfer unterstützt (siehe [Daten zwischen Threads übertragen](/de/docs/components/threads.html#passing-data-between-threads)):

- Skalare, Arrays, Objekte mit deklarierten Eigenschaften
- `Closure` (Closures)
- `WeakReference` und `WeakMap` (mit denselben Strong-Owner-Regeln wie in `spawn_thread`)
- `Async\FutureState` (einmalig)

Jeder `send()`-Aufruf ist eine unabhängige Operation mit eigener Identitätstabelle. **Die Identität wird innerhalb einer einzelnen Nachricht bewahrt**, aber nicht über separate `send()`-Aufrufe hinweg. Wenn zwei Empfänger "dasselbe" Objekt sehen sollen — senden Sie es einmal in einem Array, nicht als zwei separate Nachrichten.

## Einschränkungen

- **Mindestkapazität ist 1.** Rendezvous (capacity=0) wird nicht unterstützt, im Gegensatz zu `Async\Channel`.
- **`ThreadChannel` unterstützt keine Serialisierung.** Kanalobjekte können nicht in eine Datei gespeichert oder über das Netzwerk gesendet werden — ein Kanal existiert nur innerhalb eines laufenden Prozesses.
- **Ein Kanalhandle kann übergeben werden** via `spawn_thread` oder verschachtelt in einem anderen Kanal — das Objekthandle für `ThreadChannel` überträgt korrekt, und beide Seiten sehen denselben internen Puffer.

## Siehe auch

- [`Async\Thread`](/de/docs/components/threads.html) — OS-Threads in TrueAsync
- [`spawn_thread()`](/de/docs/reference/spawn-thread.html) — eine Closure in einem neuen Thread starten
- [`Async\Channel`](/de/docs/components/channels.html) — Kanäle zwischen Coroutinen im selben Thread
