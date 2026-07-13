---
layout: tutorial
lang: de
path_key: "/tutors/14-threads.html"
nav_active: docs
permalink: /de/tutors/14-threads.html
page_title: "Threads"
description: "spawn_thread und ThreadPool: echte Parallelität für Berechnungen, Isolation und Datenkopie."
---

# Threads

All unsere Werkzeuge bisher lebten in einem einzigen Thread des Betriebssystems. Coroutinen haben
den Eindruck erweckt, dass die Dinge auf einmal geschahen, aber zu jedem gegebenen Zeitpunkt führte
genau eine von ihnen tatsächlich Code aus. Für den Import-Job und die Anfragen an `GeoDirectory`
reichte das mehr als aus: die Tasks warteten meistens, und Warten lässt sich wunderbar aufteilen.

Nun kommt eine andere Art von Aufgabe. Einmal am Tag erstellt `ProfileService` einen Jahresbericht:
eine volle Minute reiner Berechnung, ohne einen einzigen Netzwerk- oder Datenbankaufruf. Lass ihn
uns in einer Coroutine laufen lassen, neben unserem vertrauten Ticker:

```php
spawn(function () {
    while (true) {
        echo "tick\n";
        delay(1000);
    }
});

spawn(function () {
    $report = buildYearlyReport($rows); // eine Minute reiner Berechnung
    echo "report ready\n";
});
```

Der Ticker verstummt eine ganze Minute lang. Erinnere dich an Kapitel eins: Coroutinen wechseln an
await-Punkten, bei `sleep`, `delay`, I/O. Aber `buildYearlyReport` hat keinen einzigen await-Punkt,
nur Schleifen und Arithmetik. Der Scheduler bekommt die Kontrolle nie zurück, und der gesamte
Prozess, Ticker, Worker, Anfrageverarbeitung, all das sitzt einfach da und schaut zu, wie eine
Coroutine Zahlen malmt.

Coroutinen geben dir Nebenläufigkeit, nicht Parallelität. Wenn eine Aufgabe durch die CPU begrenzt
ist statt durch Warten, brauchst du einen zweiten Prozessor. Oder genauer gesagt einen zweiten
Thread des Betriebssystems.

## spawn_thread

```php
use function Async\spawn_thread;
use function Async\await;

$thread = spawn_thread(fn() => buildYearlyReport($rows));

$report = await($thread);
```

`spawn_thread` startet die Closure in einem separaten Thread des Betriebssystems, auf einem anderen
CPU-Kern. Der Bericht wird nun wahrhaft parallel berechnet: der Ticker tickt weiter, die Worker
arbeiten weiter, und der Scheduler hat keine Ahnung, dass direkt nebenan schwere Arbeit geschieht.

Von außen sieht ein Thread fast wie eine Coroutine aus: du kannst ihn an das vertraute `await`
übergeben, das nur die wartende Coroutine anhält. Eine Ausnahme aus dem Thread erreicht `await`
ebenfalls, verpackt in `Async\RemoteException`.

## Nichts gemeinsam

Fast wie eine Coroutine, aber mit einem grundlegenden Unterschied. Im Kapitel über Channels haben
wir gesagt, dass Coroutinen in gemeinsamem Speicher leben, du kannst ein Objekt einfach über `use`
übergeben, und Data Races treten innerhalb eines einzigen Threads nicht auf. Nun, dieser Trick
funktioniert bei Threads nicht. Jeder Thread hat seine eigene PHP-Umgebung: seine eigenen
Variablen, seine eigenen Klassen, seine eigenen statischen Eigenschaften. Es gibt überhaupt keinen
gemeinsamen Speicher.

Deshalb wird alles, was in einen Thread übergeben wird, vollständig kopiert:

```php
$rows = loadRows();

$thread = spawn_thread(function () use ($rows) {
    // dies ist eine KOPIE von $rows: Änderungen hier sind außerhalb nicht sichtbar
    return buildYearlyReport($rows);
});
```

Diese Regel bringt auch Einschränkungen mit sich: du kannst keine PHP-Referenz (`&$var`), keine
Ressource wie eine geöffnete Datei und kein Objekt mit dynamischen Eigenschaften in einen Thread
übergeben. Der Versuch, das zu tun, wirft sofort am Anfang eine `ThreadTransferException`, statt
später rätselhaftes Verhalten zu verursachen.

Die Regeln sind streng, aber sie sind ehrlich: ohne gemeinsamen Zustand gibt es keine Races,
Locks, Mutexe oder irgendeinen der anderen Albträume des klassischen Multithreadings.
TrueAsync-Threads kommunizieren auf dieselbe Weise wie Coroutinen: durch Übergabe von Werten, nicht
durch Teilen von Speicher.

Übrigens weiß ein alter Bekannter, wie man die Thread-Grenze auf sinnvolle Weise überquert.
`FutureState` aus Kapitel sechs kann in einen Thread übergeben werden, während sein `Future`
zurückbleibt:

```php
$state  = new FutureState();
$future = new Future($state);

spawn_thread(function () use ($state) {
    $state->complete(buildYearlyReport(loadRows()));
});

$report = await($future);
```

Der Producer ist in einem Thread, der Consumer in einem anderen, und der Vertrag ist genau
derselbe. Genau deshalb wurde `Future` überhaupt erst in zwei getrennte Objekte aufgeteilt: die
Grenze zwischen ihnen erwies sich als robust genug, um eine Thread-Grenze genau daran entlang
verlaufen zu lassen.

## ThreadPool

Ein Thread ist eine teure Entität: seine eigene PHP-Umgebung muss erstellt, initialisiert und
aufgewärmt werden. Eine Aufgabe pro Minute, sicher, kein Problem, aber für jede winzige Aufgabe
einen Thread hochzufahren ist genauso verschwenderisch, wie bei jeder Anfrage eine
Datenbankverbindung zu öffnen.

Du weißt schon, was man mit teuren Ressourcen macht. Richtig, sie in einen Pool stecken:

```php
use Async\ThreadPool;

$pool = new ThreadPool(workers: 8);

$futures = [];
foreach ($uploads as $path) {
    $futures[] = $pool->submit(makeThumbnail(...), $path);
}

foreach ($futures as $future) {
    echo await($future), "\n";
}

$pool->close();
```

Acht Worker-Threads werden einmal erstellt und leben so lange wie der Pool. `submit` legt eine
Aufgabe in die Warteschlange, ein freier Worker greift sie auf und liefert das Ergebnis. Und schau,
was `submit` zurückgibt: ein `Future`, ein Versprechen auf ein Ergebnis, das jemand anderes
erzeugen wird. In Kapitel sechs war dieser "jemand anderes" eine Coroutine; jetzt ist es ein ganzer
separater Thread, und der Vertrag hat sich kein bisschen geändert.

Die Warteschlange des Pools hat ein Limit, und sobald sie voll ist, hält `submit` die aufrufende
Coroutine an. Erkennst du das wieder? Es ist der Back-Pressure aus dem Kapitel über Channels: der
Aufgabenproduzent passt sein Tempo automatisch an die Geschwindigkeit der Worker an.

Halte die Anzahl der Worker nahe an der Anzahl der CPU-Kerne: anders als Warten braucht Berechnung
echte physische Kerne, und zwanzig Threads auf acht Kernen werden sich nur gegenseitig aus dem Weg
drängeln. Standardmäßig, ohne den Parameter `workers`, ermittelt der Pool die verfügbare
Parallelität von selbst, sogar unter Berücksichtigung von Container-Quotas.

Und für den häufigsten Fall, "eine Liste parallel verarbeiten", gibt es eine einzeilige Form, die
du schon von `iterate` kennst:

```php
$thumbs = $pool->map($uploads, makeThumbnail(...));
```

`map` verteilt die Elemente unter den Workern, wartet auf alle und liefert die Ergebnisse in ihrer
ursprünglichen Reihenfolge zurück.

So stellt sich heraus, dass Nebenläufigkeit zwei Dimensionen hat. Coroutinen komprimieren das
Warten: Tausende von Tasks teilen sich einen einzigen Thread und kommen sich beim Warten nicht in
die Quere. Threads fügen echte Parallelität hinzu: Berechnung verteilt sich über die CPU-Kerne.
Diese Werkzeuge konkurrieren nicht miteinander, sie ergänzen einander: wo Code wartet, greife zu
einer Coroutine; wo er rechnet, greife zu einem Thread; und sobald du viele von beiden hast, kommt
ein Pool zur Rettung.

Wirf zum Schluss einen Blick darauf, was aus unserem Prozess geworden ist: Hunderte von Coroutinen,
alle bunt durcheinander, die verschiedene Nutzer bedienen, Tasks, die zwischen Workern und Threads
hin- und herspringen. Und in diesem Gewühl erweist sich eine einfache Frage als überraschend
schwer: wo bewahrst du "das aktuelle" auf? Den aktuellen Nutzer, die aktuelle Sprache, die
Request-ID? Es gibt eine globale Variable für alle, und es gibt Tausende von Coroutinen. Darum geht
es im letzten Kapitel.
