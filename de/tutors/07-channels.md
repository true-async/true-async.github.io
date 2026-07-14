---
layout: tutorial
lang: de
path_key: "/tutors/07-channels.html"
nav_active: docs
permalink: /de/tutors/07-channels.html
page_title: "Channels"
description: "Channel: ein Strom von Werten zwischen Coroutinen, ein Worker-Pool und Backpressure."
---

# Channels

`Future` verspricht genau einen Wert. Aber was, wenn es viele Werte gibt und sie
nach und nach eintreffen?

Erinnere dich an die CSV-Datei aus dem ersten Kapitel. Nun ist die Aufgabe ernster:
Beim Import muss die Adresse jedes Nutzers gegen `GeoDirectory` geprüft werden. Wir
wissen bereits, wie man Coroutinen einsetzt, also versuchen wir den direkten Weg:

```php
while (($row = fgetcsv($handle)) !== false) {
    spawn(checkAddress(...), $row[$addressIndex]);
}
```

Die Datei hat hunderttausend Zeilen. Dieser Code erzeugt hunderttausend Coroutinen,
und alle öffnen nebenläufig eine Verbindung zu `GeoDirectory`. Coroutinen sind
billig, Verbindungen sind es nicht. Der Dienst wird ersticken, und unser Import mit
ihm.

Was wir stattdessen wollen: dass etwa zehn Coroutinen die Prüfung übernehmen, während
die übrigen Adressen an der Reihe warten. Wir brauchen eine Warteschlange, aus der
einige Coroutinen Arbeit ziehen und in die andere Arbeit hineinlegen.

Eine solche Warteschlange heißt Channel.

## Channel

Ein Channel verbindet Coroutinen direkt, wie ein Rohr:

```php
use Async\Channel;
use function Async\spawn;

$channel = new Channel(5);

spawn(function () use ($channel) {
    $channel->send('hello');
});

echo $channel->recv(); // hello
```

- **`send`** — legt einen Wert in den Channel.
- **`recv`** — nimmt einen Wert aus dem Channel.

Beide Operationen blockieren, und genau darum geht es. Ist der Channel leer,
pausiert `recv` die Coroutine, bis Daten auftauchen. Ist der Channel voll, ist es
`send`, das stattdessen pausiert wird. Die `5` im Konstruktor legt die Puffergröße
fest: wie viele Werte der Channel zu halten bereit ist, bevor jemand sie abholt.

## Rendezvous

Was passiert, wenn du einen Channel mit einem Puffer von `0` erstellst? Er hat keinen
Platz, um Werte zu speichern, deshalb wird `send` nicht abgeschlossen, bevor eine
andere Coroutine `recv` aufruft:

```php
$ch = new Channel(0);

spawn(function () use ($ch) {
    echo "before send\n";
    $ch->send('hello');
    echo "after send\n"; // läuft erst nach recv
});

spawn(function () use ($ch) {
    echo "before recv\n";
    echo $ch->recv() . "\n";
});
```

Ein solcher Channel heißt Rendezvous: Sender und Empfänger sind gezwungen, sich zum
selben Zeitpunkt zu treffen, daher der Name.

Der Unterschied zu einem gepufferten Channel ist subtiler, als er aussieht. Ein
Puffer bedeutet "gesendet", aber nicht "empfangen": `send` legt einen Wert ab und
zieht weiter, und der Sender hat keine Ahnung, ob oder wann er abgeholt wird. Ein
Rendezvous garantiert die Zustellung: Sobald `send` zurückkehrt, ist der Wert bereits
in den Händen des Empfängers. Das zählt, wenn eine Aufgabe nicht in einer
Warteschlange liegen bleiben darf: zum Beispiel, wenn man einem Worker nur dann Arbeit
übergibt, wenn er gerade frei ist.

Die Daten sind hier fast nebensächlich: Ein Rendezvous ist reine Synchronisation.
Zwei Coroutinen treffen sich garantiert im selben Moment, selbst wenn sie nur `null`
weitergeben.

## Worker-Pool

Bauen wir eine Lösung für den Import zusammen. Zehn Worker-Coroutinen ziehen Adressen
aus einem Channel, während der Hauptfluss die Datei liest und den Channel füttert:

```php
use Async\Channel;
use Async\ChannelException;
use function Async\spawn;

$queue = new Channel(100);

for ($i = 0; $i < 10; $i++) {
    spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
```

Jeder Wert aus dem Channel geht an genau einen Worker, selbst wenn alle zehn auf
`recv` warten. Werte werden nie dupliziert, sodass die Worker einander nicht in die
Quere kommen: Der Channel verteilt die Arbeit ganz von selbst unter denjenigen, die
frei sind.

Wie viele Zeilen auch in der Datei stehen, es gibt nie mehr als zehn Verbindungen zu
`GeoDirectory`. Die Anzahl der Worker ist exakt die Nebenläufigkeitsgrenze, und sie
wird durch eine einzige Konstante in der Schleife festgelegt.

## Backpressure

Warum ein Puffer von genau `100`? Stell dir vor, die Worker prüfen Adressen langsamer,
als der Hauptfluss die Datei liest. Ohne Grenze würde die Warteschlange immer weiter
wachsen, bis die gesamte hunderttausend Zeilen große Datei im Speicher läge.

Mit einem Puffer von `100` passiert etwas anderes: Sobald sich hundert Adressen im
Channel angesammelt haben, pausiert `send` den Hauptfluss. Das Lesen der Datei hält
an und setzt fort, sobald die Worker Platz freimachen. Der Erzeuger passt sich
automatisch an das Tempo der Verbraucher an.

Dieser Mechanismus heißt Backpressure. Beachte, dass wir ihn nicht selbst programmiert
haben: Er ergibt sich aus der blockierenden Natur von `send`. Wähle einfach eine
Puffergröße, und alles andere balanciert sich selbst aus.

## Einen Channel schließen

Sobald die Datei gelesen ist, warten die Worker weiter auf `recv`. Eine vertraute
Situation: Im Kapitel über das Abbrechen drehte sich auch die Fortschritts-Coroutine
für immer weiter. Aber hier brauchen wir kein `cancel()` auf jedem Worker; ein Channel
hat ein präziseres Werkzeug:

```php
$queue->close();
```

`close` verkündet: Es kommen keine neuen Werte mehr. Die Worker lesen zunächst zu
Ende, was noch im Puffer liegt, und dann wirft `recv` eine `ChannelException`, was
die `while (true)`-Schleife beendet. Beachte die Reihenfolge: Das Schließen bricht die
Arbeit nicht ab, sondern lässt sie ordentlich zu Ende kommen.

Und noch ein vertrautes Detail: `recv` und `send` akzeptieren denselben Abbruch-Token
wie das `await` aus dem Timeout-Kapitel:

```php
$address = $queue->recv(timeout(5000));
```

Taucht innerhalb von fünf Sekunden nichts im Channel auf, erhält der Worker eine
`AsyncCancellation` und kann zum Beispiel eine Warnung protokollieren.

## Daten übergeben oder synchronisieren?

Sehen wir uns genauer an, was der Channel in diesem Kapitel eigentlich getan hat.
`recv` auf einem leeren Channel legte einen Worker schlafen, bis Arbeit auftauchte.
`send` auf einem vollen Channel legte das Lesen der Datei schlafen, bis die Worker die
Warteschlange geleert hatten. Das Rendezvous brachte zwei Coroutinen im selben Moment
zusammen. Jede blockierende Operation erwies sich als ein Punkt, an dem sich Coroutinen
aufeinander einstellen.

Und hier lohnt es sich, eine Feinheit der Single-Thread-Welt festzuhalten. Für das
bloße Übergeben von Daten ist ein Channel nicht erforderlich: Coroutinen leben im
gemeinsamen Speicher, und ein Objekt lässt sich ihnen einfach per `use` übergeben.
Datenwettläufe treten innerhalb eines einzelnen Threads nicht auf; zwei Coroutinen
laufen nie im exakt selben Moment. Ein Channel wird für etwas anderes verwendet: eine
beschränkte Warteschlange, das Verteilen von Arbeit unter freie Worker, das Signal
"keine Arbeit mehr" über `close`.

Deshalb ist es treffender, einen Channel so zu sehen: Er ist eine Art, Coroutinen zu
synchronisieren, die dabei zufällig Daten transportiert, nicht umgekehrt. In
Multithread-Code hingegen, wo Coroutinen über verschiedene Threads verteilt sind,
wird ein Channel in beiden Rollen unentbehrlich: Dort gibt es keinen gemeinsamen
Speicher, und er bleibt die eine sichere Brücke.

Nun haben wir zwei Wege, Coroutinen miteinander zu verbinden. `Future` verspricht
einen Wert. Ein Channel trägt einen ganzen Strom von Werten und gibt der Arbeit dabei
einen gemeinsamen Rhythmus vor: Der Erzeuger weiß nicht, wer die Daten wann abholt,
der Verbraucher weiß nicht, woher sie kamen, aber niemand überschwemmt einen anderen
mit Arbeit.

Ein nagender Gedanke bleibt. Wir haben zehn Worker gestartet und sind weitergezogen.
Was, wenn einer von ihnen mitten im Import mit einer Ausnahme stirbt? Wer wacht
eigentlich über all diese Coroutinen? Finden wir es im nächsten Kapitel heraus.
