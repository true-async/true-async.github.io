---
layout: docs
lang: de
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /de/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — Code in einem separaten parallelen Thread ausführen: Datentransfer, WeakReference/WeakMap, ThreadChannel, Future zwischen Threads."
---

# Async\Thread: PHP in einem separaten Thread ausführen

## Warum Threads benötigt werden

Coroutinen lösen das Konkurrenzproblem für **I/O-gebundene** Workloads — ein einzelner Prozess kann
Tausende gleichzeitiger Netzwerk- oder Disk-Warteoperationen verwalten. Aber Coroutinen haben eine
Einschränkung: Sie laufen alle **im selben PHP-Prozess** und empfangen abwechselnd die Kontrolle
vom Scheduler. Wenn eine Aufgabe **CPU-gebunden** ist — Komprimierung, Parsing, Kryptographie,
schwere Berechnungen — blockiert eine einzelne solche Coroutine den Scheduler, und alle anderen
Coroutinen warten, bis sie abgeschlossen ist.

Threads lösen diese Einschränkung. `Async\Thread` führt einen Closure in einem **separaten parallelen
Thread** mit seiner **eigenen isolierten PHP-Laufzeitumgebung** aus: eigene Variablen, eigener
Autoloader, eigene Klassen und Funktionen. Zwischen Threads wird nichts direkt geteilt — jegliche
Daten werden **per Wert** übergeben, durch Tiefenkopierung.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Ticker in der Haupt-Coroutine — beweist, dass der parallele Thread
// das Hauptprogramm nicht an der Fortsetzung hindert
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // Schwere Berechnung in einem separaten Thread
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

Der Ticker schließt seine 5 „Ticks" ruhig und nebenläufig mit der schweren Arbeit des Threads ab —
das Hauptprogramm muss nicht warten.

## Wann Threads vs. Coroutinen verwendet werden sollten

| Aufgabe                                                | Werkzeug                      |
|--------------------------------------------------------|-------------------------------|
| Viele nebenläufige HTTP/DB/Datei-Anfragen              | Coroutinen                    |
| Lange CPU-gebundene Arbeit (Parsing, Krypto)           | Threads                       |
| Isolierung von instabilem Code                         | Threads                       |
| Parallele Arbeit über mehrere CPU-Kerne                | Threads                       |
| Datenaustausch zwischen Aufgaben                       | Coroutinen + Channels         |

Ein Thread ist eine **relativ teure Entität**: Das Starten eines neuen Threads ist eine
Größenordnung aufwändiger als das Starten einer Coroutine. Deshalb erstellt man keine Tausende
davon: Das typische Modell sind einige langlebige Worker-Threads (oft gleich der Anzahl der
CPU-Kerne) oder ein Thread für eine bestimmte schwere Aufgabe.

## Lebenszyklus

```php
// Erstellung — der Thread startet und beginnt sofort mit der Ausführung
$thread = spawn_thread(fn() => compute());

// Warten auf das Ergebnis. Die aufrufende Coroutine wartet; andere laufen weiter
$result = await($thread);

// Oder eine nicht-blockierende Prüfung
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` implementiert das `Completable`-Interface und kann daher an `await()`,
`await_all()`, `await_any()` und `Task\Group` übergeben werden — genauso wie eine reguläre Coroutine.

### Zustände

| Methode           | Was sie prüft                                                        |
|-------------------|----------------------------------------------------------------------|
| `isRunning()`     | Der Thread wird noch ausgeführt                                      |
| `isCompleted()`   | Der Thread hat beendet (erfolgreich oder mit einer Ausnahme)         |
| `isCancelled()`   | Der Thread wurde abgebrochen                                         |
| `getResult()`     | Das Ergebnis, falls erfolgreich beendet; sonst `null`                |
| `getException()`  | Die Ausnahme, falls mit einem Fehler beendet; sonst `null`           |

### Ausnahmebehandlung

Eine innerhalb eines Threads geworfene Ausnahme wird aufgefangen und in `Async\RemoteException`
eingehüllt an den Elternteil geliefert:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

`getRemoteException()` kann `null` zurückgeben, wenn die Ausnahmeklasse im Eltern-Thread nicht
geladen werden konnte (zum Beispiel ist sie eine benutzerdefinierte Klasse, die nur im
empfangenden Thread existiert).

## Datentransfer zwischen Threads

Dies ist der wichtigste Teil des Modells. **Alles wird durch Kopieren übertragen** — keine
gemeinsamen Referenzen.

### Was übertragen werden kann

| Typ                                                     | Verhalten                                                              |
|---------------------------------------------------------|------------------------------------------------------------------------|
| Skalare (`int`, `float`, `string`, `bool`, `null`)      | Kopiert                                                                |
| Arrays                                                  | Tiefenkopie; verschachtelte Objekte bewahren Identität                 |
| Objekte mit deklarierten Eigenschaften (`public $x` etc.)| Tiefenkopie; auf der Empfängerseite von Grund auf neu erstellt        |
| `Closure`                                               | Der Funktionskörper wird zusammen mit allen `use(...)`-Variablen übertragen |
| `WeakReference`                                         | Zusammen mit dem Referenten übertragen (siehe unten)                   |
| `WeakMap`                                               | Mit allen Schlüsseln und Werten übertragen (siehe unten)               |
| `Async\FutureState`                                     | Nur einmal, um ein Ergebnis aus dem Thread zu schreiben (siehe unten)  |

### Was nicht übertragen werden kann

| Typ                                                    | Warum                                                                              |
|--------------------------------------------------------|------------------------------------------------------------------------------------|
| `stdClass` und alle Objekte mit dynamischen Eigenschaften | Dynamische Eigenschaften haben keine Deklaration auf Klassenebene und können im empfangenden Thread nicht korrekt neu erstellt werden |
| PHP-Referenzen (`&$var`)                               | Eine gemeinsame Referenz zwischen Threads widerspricht dem Modell                  |
| Ressourcen (`resource`)                                | Datei-Deskriptoren, Curl-Handles, Sockets sind an einen bestimmten Thread gebunden |

Der Versuch, eines davon zu übertragen, wirft sofort `Async\ThreadTransferException` in der Quelle:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // dynamische Eigenschaften
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

### Objektidentität bleibt erhalten

Dasselbe Objekt, das mehrfach in einem Datengraphen referenziert wird, wird **nur einmal im
empfangenden Thread erstellt**, und alle Referenzen zeigen darauf. Innerhalb einer einzelnen
Übertragungsoperation (alle Variablen aus `use(...)` eines Closures, ein Channel-Send, ein
Thread-Ergebnis) wird die Identität bewahrt:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// Die Klasse muss in der Umgebung des empfangenden Threads deklariert sein — wir tun dies über einen Bootloader
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // Dieselbe Instanz in zwei verschiedenen Variablen
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // Eine Mutation über eine Referenz ist über die andere sichtbar
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

Dasselbe gilt für verknüpfte Objekte innerhalb eines einzelnen Graphen: Ein Array mit Referenzen
auf gemeinsame verschachtelte Objekte bewahrt die Identität nach der Übertragung.

### Zyklen

Ein Graph mit einem Zyklus durch reguläre Objekte kann übertragen werden. Die Einschränkung ist,
dass sehr tief verschachtelte Zyklen das interne Übertragungstiefenlimit (Hunderte von Ebenen)
erreichen können. In der Praxis tritt dies fast nie auf. Zyklen der Form
`$node->weakParent = WeakReference::create($node)` — d. h. ein Objekt, das sich selbst über eine
`WeakReference` referenziert — stoßen derzeit auf dasselbe Limit, daher ist es besser, sie nicht
innerhalb eines einzelnen übertragenen Graphen zu verwenden.

## WeakReference zwischen Threads

`WeakReference` hat eine besondere Übertragungslogik. Das Verhalten hängt davon ab, was sonst
noch zusammen damit übertragen wird.

### Referent wird ebenfalls übertragen — Identität bleibt erhalten

Wenn das Objekt selbst zusammen mit der `WeakReference` übertragen wird (direkt, innerhalb eines
Arrays oder als Eigenschaft eines anderen Objekts), gibt `$wr->get()` auf der Empfängerseite
**genau jene** Instanz zurück, die in den anderen Referenzen gelandet ist:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### Referent wird nicht übertragen — WeakReference wird ungültig

Wenn nur die `WeakReference` übertragen wird, nicht aber das Objekt selbst, hält im empfangenden
Thread niemand eine starke Referenz auf dieses Objekt. Nach PHP-Regeln bedeutet dies, dass das
Objekt sofort zerstört wird und die `WeakReference` **ungültig** wird (`$wr->get() === null`). Dies
ist genau dasselbe Verhalten wie in einzel-threaded PHP: Ohne einen starken Eigentümer wird das
Objekt eingesammelt.

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj wird NICHT übertragen
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### Quelle ist bereits ungültig

Wenn die `WeakReference` zum Zeitpunkt der Übertragung in der Quelle bereits ungültig war
(`$wr->get() === null`), wird sie auch im empfangenden Thread als ungültig ankommen.

### Singleton

`WeakReference::create($obj)` gibt ein Singleton zurück: Zwei Aufrufe für dasselbe Objekt ergeben
**dieselbe** `WeakReference`-Instanz. Diese Eigenschaft bleibt bei der Übertragung erhalten —
im empfangenden Thread gibt es auch genau eine `WeakReference`-Instanz pro Objekt.

## WeakMap zwischen Threads

`WeakMap` wird mit all seinen Einträgen übertragen. Aber es gilt dieselbe Regel wie in einzel-threaded
PHP: **Ein `WeakMap`-Schlüssel lebt nur so lange, wie jemand eine starke Referenz darauf hält**.

### Schlüssel sind im Graphen — Einträge überleben

Wenn die Schlüssel separat übertragen werden (oder durch andere übertragene Objekte erreichbar
sind), enthält die `WeakMap` im empfangenden Thread alle Einträge:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### Nur WeakMap — Einträge verschwinden

Wenn nur die `WeakMap` übertragen wird und ihre Schlüssel nirgendwo sonst im Graphen auftauchen,
ist die `WeakMap` **im empfangenden Thread leer**. Das ist kein Fehler; es ist eine direkte Folge
der schwachen Semantik: Ohne einen starken Eigentümer wird der Schlüssel sofort nach dem Laden
zerstört und der entsprechende Eintrag verschwindet.

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost wird nicht übertragen
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

Damit ein Eintrag die Übertragung „überlebt", muss sein Schlüssel separat übertragen werden (oder
als Teil eines anderen Objekts, das selbst im Graphen enthalten ist).

### Verschachtelte Strukturen

Eine `WeakMap` kann andere `WeakMap`s, `WeakReference`s, Arrays und reguläre Objekte als Werte
enthalten — alles wird rekursiv übertragen. Zyklen der Form `$wm[$obj] = $wm` werden korrekt
behandelt.

## Future zwischen Threads

Die direkte Übertragung eines `Async\Future` zwischen Threads ist **nicht möglich**: Ein `Future`
ist ein Warte-Objekt, dessen Ereignisse an den Scheduler des Threads gebunden sind, in dem er
erstellt wurde. Stattdessen kann die „Schreiber"-Seite übertragen werden — `Async\FutureState` —
und zwar nur **einmal**.

Das typische Muster: Der Elternteil erstellt ein `FutureState` + `Future`-Paar, übergibt
`FutureState` selbst via `use(...)`-Variable an den Thread, der Thread ruft `complete()` oder
`error()` auf, und der Elternteil empfängt das Ergebnis über seinen `Future`:

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        // Schwere Arbeit simulieren
        $data = "computed in thread";
        $state->complete($data);
    });

    // Der Elternteil wartet über seinen eigenen Future — das Ereignis kommt hier an,
    // wenn der Thread $state->complete() aufruft
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

**Wichtige Einschränkungen:**

1. `FutureState` kann nur an **einen** Thread übertragen werden. Ein zweiter Übertragungsversuch wirft eine Ausnahme.
2. Die Übertragung des `Future` selbst ist nicht erlaubt — er gehört dem Eltern-Thread und kann
   nur seinen eigenen Eigentümer aufwecken.
3. Nachdem `FutureState` übertragen wurde, bleibt das ursprüngliche Objekt im Elternteil gültig:
   Wenn der Thread `complete()` aufruft, wird diese Änderung durch den `Future` im Elternteil
   sichtbar — `await($future)` wird entsperrt.

Dies ist der einzige Standardweg, ein **einzelnes Ergebnis** von einem Thread zurück an den Aufrufer
zu liefern, außer dem gewöhnlichen `return` aus `spawn_thread()`. Wenn viele Werte gestreamt werden
müssen, verwende `ThreadChannel`.

## Bootloader: die Thread-Umgebung vorbereiten

Ein Thread hat **seine eigene Umgebung** und erbt keine Klassen-, Funktions- oder Konstantendefinitionen,
die im Eltern-Skript deklariert wurden. Wenn ein Closure eine benutzerdefinierte Klasse verwendet,
muss diese Klasse entweder neu deklariert oder über Autoload geladen werden — dafür gibt es den
`bootloader`-Parameter:

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config muss im Thread existieren
        return $config->name;
    },
    bootloader: function() {
        // Wird im empfangenden Thread VOR dem Haupt-Closure ausgeführt
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

Der Bootloader wird garantiert im empfangenden Thread ausgeführt, bevor die `use(...)`-Variablen
geladen werden und bevor der Haupt-Closure aufgerufen wird. Typische Bootloader-Aufgaben: Autoload
registrieren, Klassen via `eval` deklarieren, Ini-Optionen setzen, Bibliotheken laden.

## Randfälle

### Superglobals

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV` sind im Thread eigene — sie werden frisch initialisiert,
wie bei einer neuen Anfrage. In der aktuellen Version von TrueAsync ist die Befüllung in empfangenden
Threads vorübergehend deaktiviert (geplant, später aktiviert zu werden) — beachte das CHANGELOG.

### Statische Funktionsvariablen

Jeder Thread hat seinen eigenen Satz statischer Funktions- und Klassenvariablen. Änderungen in
einem Thread sind für andere nicht sichtbar — das ist Teil der allgemeinen Isolation.

### Opcache

Opcache teilt seinen kompilierten Bytecode-Cache zwischen Threads als Read-Only: Skripte werden
einmal für den gesamten Prozess kompiliert, und jeder neue Thread verwendet den fertigen Bytecode
wieder. Dies macht den Thread-Start schneller.

## Siehe auch

- [`spawn_thread()`](/de/docs/reference/spawn-thread.html) — einen Closure in einem Thread ausführen
- [`Async\ThreadChannel`](/de/docs/components/thread-channels.html) — Channels zwischen Threads
- [`await()`](/de/docs/reference/await.html) — auf ein Thread-Ergebnis warten
- [`Async\RemoteException`](/de/docs/components/exceptions.html) — Wrapper für Fehler im empfangenden Thread
