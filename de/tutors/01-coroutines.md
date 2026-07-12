---
layout: tutorial
lang: de
path_key: "/tutors/01-coroutines.html"
nav_active: docs
permalink: /de/tutors/01-coroutines.html
page_title: "Coroutinen"
description: "Ein erster Blick auf Coroutinen: spawn() und nebenläufige Ausführung."
---

# Coroutinen erstellen

```php
function counter(string $name): void {
    for ($i = 1; $i <= 5; $i++) {
        echo "$name: $i\n";
        sleep(1);
    }
}

counter('A');
```

Die Funktion `counter` gibt einen Zähler auf dem Bildschirm aus, mit einer Pause von einer Sekunde:

```bash
A: 1
A: 2
A: 3
A: 4
A: 5
```

Jedes Mal, wenn `sleep` aufgerufen wird, legt sich der PHP-Thread für die angegebene Dauer schlafen.
In dieser Zeit tut er buchstäblich nichts.
Das PHP-Skript läuft 5 Sekunden lang, genau so lange, wie die Funktion selbst wartet.

Was passiert, wenn wir die Funktion `counter` innerhalb einer Coroutine ausführen?

```php
use function Async\spawn;

spawn(counter(...), 'B');
counter('A');
```

Die Ausgabe wechselt sich jetzt ab:
```bash
A: 1
B: 1
A: 2
B: 2
A: 3
B: 3
A: 4
B: 4
A: 5
B: 5
```

Die Gesamtlaufzeit des Skripts beträgt weiterhin etwa 5 Sekunden, dennoch verhält sich das Skript nun so, als würde es zwei Funktionen "nebenläufig" ausführen.
Was geht hier also tatsächlich vor sich?

`spawn` erzeugt einen zweiten logischen Ausführungsstrang, "B", in dem die Funktion `counter` läuft.
Wenn Strang "A" auf `sleep` trifft, blockiert er nicht ganz PHP, sondern übergibt die Kontrolle an den anderen logischen
Strang, "B". Und so weiter:

```text
A sleep -> B
B sleep -> A
A sleep -> B
...
```

## Worin liegt der Vorteil?

Stell dir vor, die Funktion `counter` ist ganz gewöhnlicher sequenzieller Code, der I/O-Operationen und
Timer-Arbeit (`sleep`) ausführt. I/O-Operationen werden vom Kernel des Betriebssystems abgewickelt, daher muss PHP-Code
auf sie warten. Währenddessen könnte PHP etwas anderes tun.
Coroutinen erlauben es dir, diese Wartezeit mit nützlicher Arbeit zu füllen, ohne separate Prozesse, Threads,
Synchronisation, Data Races und die vielen anderen Schrecken der parallelen Programmierung zu erzeugen.

Sehen wir uns ein praktisches Beispiel an:

```php
function processUsers(string $path, &$counter): void 
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);

    $loginIndex = array_search('login', $header);
    $emailIndex = array_search('email', $header);

    while (($row = fgetcsv($handle)) !== false) {
        $login = $row[$loginIndex];
        $email = $row[$emailIndex];        
        $counter++;
    }

    fclose($handle);
}
```

Die Funktion `processUsers` liest eine CSV-Datei und verarbeitet jede Zeile.
Die Datei ist groß, und es besteht kein Bedarf, jede Zeile auf dem Bildschirm auszugeben, aber es wäre schön, den Fortschritt zu sehen.
Wir könnten den Fortschrittsbalken bei jeder Iteration neu zeichnen, doch das würde die Verarbeitungsleistung beeinträchtigen.
Wir könnten ihn alle 100 Iterationen neu zeichnen, aber die Verarbeitung von Zeilen kann unterschiedlich lange dauern.
Wie zeigen wir den Fortschritt gleichmäßig, in etwa regelmäßigen Abständen, an?

```php
use function Async\spawn;
use function Async\delay;

function printProgress(int $current, int $total, int $width = 30): void
{
    $ratio = $total > 0 ? $current / $total : 1;
    $filled = (int) round($ratio * $width);

    $bar = str_repeat('=', $filled) . str_repeat(' ', $width - $filled);

    echo "\r[$bar] " . round($ratio * 100) . "%";
}

$counter = 0;
$total = 100_000;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Das lässt sich mit der Coroutine `$progress` erreichen, die einmal pro Sekunde den aktuellen Fortschritt anzeigt.
Sie stützt sich auf die Variable `$counter`, die innerhalb der Funktion `processUsers` hochgezählt und
per Referenz an die Coroutine übergeben wird.

```bash
[====>                         ] 15%
```

Das Schöne an dieser Lösung ist, dass `printProgress` nichts über `processUsers` weiß, und umgekehrt.
Sie hängen nicht voneinander ab, arbeiten aber trotzdem zusammen.

Mit anderen Worten: Coroutinen erzeugen nicht nur die Illusion nebenläufiger Ausführung, sie helfen auch,
Zuständigkeiten voneinander zu trennen.

Ist dir `$progress->cancel()` aufgefallen? Wofür genau ist das da?
