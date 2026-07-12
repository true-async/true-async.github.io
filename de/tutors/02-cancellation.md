---
layout: tutorial
lang: de
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /de/tutors/02-cancellation.html
page_title: "Abbruch"
description: "Wie cancel() funktioniert und der kooperative Abbruch von Coroutinen."
---

# Abbruch

Im vorherigen Beispiel gab es einen interessanten Aufruf der Funktion `cancel`,
```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Was passiert, wenn wir ihn entfernen? Probiere es selbst aus.
Die Coroutine `$progress` dreht sich in einer Endlosschleife mit einer Verzögerung von 1 Sekunde.
Wenn `processUsers` fertig ist, geht die Ausführung weiter. Die Coroutine `$progress` läuft weiter.
Für immer. Sie wird niemals anhalten. Der PHP-Prozess wird niemals anhalten (es sei denn, er wird von außen beendet).

`$progress->cancel()` stoppt die Coroutine `$progress`. Aber wie?

```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        
        try {
            delay(1000);
        } catch (Throwable $e) {
            echo get_class($e). PHP_EOL;
            throw $e;
        }
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Ändern wir den Code rund um `delay(1000)` und sehen, was passiert:
```bash
Async\AsyncCancellation
```

Als die Coroutine `$progress` innerhalb von `delay(1000)` schlief und dann `cancel()` aufgerufen wurde,
warf `delay` eine Ausnahme vom Typ `Async\AsyncCancellation`. Interessanterweise funktioniert dieser Trick nicht mit `sleep(1)`,
denn `sleep(1)` wirft keine Ausnahme, während `delay` das tut, und genau darauf verlassen wir uns hier.

Man könnte sagen, dass die Verwendung von `delay` in deinem Code faktisch einen Vertrag begründet, der es anderem Code erlaubt,
die Ausführung der Coroutine zu unterbrechen. Das ist sehr praktisch, denn es trennt einmal mehr die Zuständigkeiten
zwischen verschiedenen Modulen:
1. Die Coroutine weiß nicht, wann ihre Ausführung unterbrochen wird.
2. Der Code, der die Coroutine abbricht, weiß nicht genau, wie die Coroutine unterbrochen wird.

Eine Coroutine hält nicht durch eine Art Magie an, sie hält über eine Ausnahme an.
Eine Coroutine kann nicht mitten in einer beliebigen Operation abgebrochen werden, sondern nur an einer Stelle, an der sie
selbst entscheidet, die Kontrolle abzugeben. Diese Art des Abbruchs wird "kooperativ" genannt.
