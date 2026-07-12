---
layout: tutorial
lang: de
path_key: "/tutors/12-iterate.html"
nav_active: docs
permalink: /de/tutors/12-iterate.html
page_title: "Nebenläufiger Iterator"
description: "iterate(): nebenläufiges Durchlaufen einer Sammlung in einer einzigen Zeile, Generatoren und vorzeitiger Abbruch."
---

# Nebenläufiger Iterator

Zählen wir, wie oft wir dasselbe Muster gebaut haben. Im Kapitel über Channels: ein Channel, zehn
Worker, eine `recv`-Schleife. Im Kapitel über TaskGroup: `concurrency: 10`, eine `spawn`-Schleife,
`close()`. Im Kapitel über TaskSet: dasselbe, aber mit verbrauchenden Ergebnissen. Jedes Mal
klang die Aufgabe gleich: eine Sammlung durchlaufen, auf jedem Element nebenläufige Arbeit
verrichten und dabei nie das Limit überschreiten.

Ein so verbreitetes Muster verdient eine eigene Funktion:

```php
use function Async\iterate;

iterate($addresses, checkAddress(...), concurrency: 10);
```

Und das ist der komplette Worker-Pool. `iterate` ruft die Funktion für jedes Element der Sammlung
in einer eigenen Coroutine auf, sorgt dafür, dass nie mehr als zehn nebenläufig laufen, und gibt
die Kontrolle zurück, sobald alles verarbeitet wurde.

## Ein Generator statt eines Arrays

Moment, was ist mit dem Lesen der Datei? Hunderttausend Adressen nur zum Aufruf von `iterate` in
ein Array zu sammeln wäre ein Rückschritt: der Back-Pressure aus dem Kapitel über Channels war
genau das, was uns Speicher gespart hat. Kein Problem: `iterate` akzeptiert nicht nur ein Array,
sondern jedes `Traversable`, einschließlich Generatoren:

```php
function addresses(string $path): Generator
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);
    $addressIndex = array_search('address', $header);

    while (($row = fgetcsv($handle)) !== false) {
        yield $row[$addressIndex];
    }

    fclose($handle);
}

iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
```

Der Generator liest die Datei träge, eine Zeile nach der anderen. `iterate` holt die nächste
Adresse erst, wenn ein Platz frei wird, sodass die Datei nie vollständig im Speicher gehalten
wird. Es ist derselbe Back-Pressure, den dir ein gepufferter Channel gibt, nur dass er jetzt
unsichtbar ist: übrig bleibt eine einzige Zeile, die die Absicht ausdrückt.

## Vorzeitiger Abbruch

Die Handler-Funktion kann den gesamten Durchlauf stoppen, indem sie `false` zurückgibt:

```php
$broken = 0;

iterate(addresses('users.csv'), function (string $address) use (&$broken) {
    if (!checkAddress($address)) {
        $broken++;
    }

    if ($broken >= 100) {
        return false; // die Datei ist beschädigt, kein Grund weiterzumachen
    }
}, concurrency: 10);
```

Hundert ungültige Adressen hintereinander sind ein zuverlässiges Zeichen dafür, dass uns die
falsche Datei untergeschoben wurde. Nach dem `false` starten keine neuen Elemente mehr, die
bereits laufenden Coroutinen bringen zu Ende, was sie tun, und `iterate` kehrt zurück.

Ausnahmen sind strenger, und die Regel kennst du schon von Scope: ein Fehler in irgendeinem
Handler stoppt den Durchlauf, bricht die verbleibenden Coroutinen ab und pflanzt sich nach außen
fort. Standardmäßig gilt "gemeinsam scheitern":

```php
try {
    iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
} catch (RemoteApiException $e) {
    echo "Import abgebrochen: {$e->getMessage()}\n";
}
```

Es steckt keine Magie dahinter: in `iterate` lebt ein ganz gewöhnlicher untergeordneter Scope aus
Kapitel acht, und der hält alles in Ordnung.

## Eine Leiter der Abstraktionen

Über sechs Kapitel hat sich eine ganze Leiter herausgebildet, und es lohnt sich, sie noch einmal
von unten nach oben durchzugehen:

- **Ein Channel + Scope** — die Primitive. Jede Topologie: Pools, Pipelines, Rendezvous,
  Supervisoren. Maximale Kontrolle, maximaler Code.
- **`TaskGroup` / `TaskSet`** — fertige Baugruppen für eine Menge von Tasks, wenn du Ergebnisse
  brauchst: alle davon, das erste, das erste erfolgreiche oder eins nach dem anderen, sobald sie
  fertig werden.
- **`iterate()`** — eine einzige Zeile, wenn du das Ergebnis nicht brauchst und einfach nur eine
  Sammlung nebenläufig durchlaufen willst.

Je höher auf der Leiter, desto weniger Code und desto enger das Szenario. Beginne oben: reicht
`iterate` aus, gibt es keinen Grund, eine Gruppe zu bauen; reicht eine Gruppe nicht aus, steig
hinab zu Channels. Unten kannst du jede beliebige Konstruktion zusammensetzen, oben ist bereits
alles für dich zusammengesetzt.

Beachte, was mit unserem Import geschehen ist: Kapitel für Kapitel ist er immer weiter
geschrumpft, bis er schließlich auf eine einzige Zeile passte. Genau so sollte es sein.
Nebenläufigkeit hört auf, ein Ereignis zu sein, und wird zu einem gewöhnlichen Werkzeug, genau
wie `foreach`.

Aber eine Frage aus Kapitel neun steht noch im Raum. Bei PDO ist der Verbindungspool in den Kern
eingebaut, während `checkAddress` über HTTP mit `GeoDirectory` spricht. Auch dessen Verbindungen
sind es wert, wiederverwendet zu werden, und nicht nur seine: Sockets, Clients, schwere Objekte
im Allgemeinen. Müssen wir wirklich jedes einzelne Mal von Hand einen Pool aus einem Channel
bauen? Zum Glück nicht, und das nächste Kapitel zeigt dir warum.
