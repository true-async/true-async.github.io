---
layout: tutorial
lang: de
path_key: "/tutors/09-pdo-pool.html"
nav_active: docs
permalink: /de/tutors/09-pdo-pool.html
page_title: "PDO Pool"
description: "Warum Coroutinen sich kein einzelnes PDO teilen können und wie der eingebaute Verbindungspool das transparent löst."
---

# PDO Pool

Der Import ist fast fertig: Die Worker prüfen Adressen über `GeoDirectory`. Es bleibt
nur noch, die geprüften Adressen in der Datenbank zu speichern. Klingt trivial:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret');

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue, $pdo) {
        try {
            while (true) {
                $address = $queue->recv();
                checkAddress($address);
                saveAddress($pdo, $address);
            }
        } catch (ChannelException) {
        }
    });
}
```

Ein `PDO`-Objekt, geteilt von zehn Coroutinen. Im Kapitel über Channels haben wir
gesagt, dass Datenwettläufe innerhalb eines einzelnen Threads nicht auftreten, also
sollte das in Ordnung sein, oder?

Nein. Das gilt für den Speicher. Aber eine Datenbankverbindung ist kein Speicher,
sondern ein Protokoll auf einem Socket: Anfrage, Antwort, Anfrage, Antwort, streng der
Reihe nach. Jede Datenbankabfrage ist ein Wartepunkt, an dem eine Coroutine schlafen
geht und die Kontrolle an eine andere übergeht. Und diese andere schreibt ihre eigene
Abfrage in genau denselben Socket:

```php
// Worker 1
$pdo->beginTransaction();
$pdo->exec("INSERT INTO addresses ...");
// Wartepunkt: Worker 1 geht schlafen, Worker 2 wacht auf

// Worker 2
$pdo->beginTransaction(); // auf derselben Verbindung!
$pdo->exec("UPDATE ...");
$pdo->commit(); // committet sowohl die eigene Transaktion als auch die eines anderen
```

Die Antworten geraten durcheinander, Transaktionen committen die Arbeit der jeweils
anderen. Die Wettläufe sind zurück, nur leben sie jetzt in der Verbindung statt im
Speicher.

Gut, geben wir also jeder Coroutine ihre eigene Verbindung?

```php
$workers->spawn(function () use ($queue) {
    $pdo = new PDO(/* ... */); // eine eigene Verbindung
    // ...
});
```

Passt für zehn Worker. Aber stell dir keinen Importauftrag vor, sondern einen Server,
bei dem für jede Anfrage eine Coroutine erzeugt wird. Tausend Coroutinen bedeuten
tausend TCP-Verbindungen. MySQL erlaubt standardmäßig 151, PostgreSQL 100. Und eine
Verbindung für ein paar Millisekunden Arbeit zu öffnen ist schlicht teuer: Der
Handshake mit der Datenbank kann länger dauern als die Abfrage selbst.

Kommt dir bekannt vor? Das Kapitel über Channels hatte dieselbe Weggabelung:
hunderttausend Verbindungen zu `GeoDirectory` oder eine Warteschlange für zehn.

## Ein Pool: eine Warteschlange rückwärts

Die Lösung heißt Verbindungspool: N Verbindungen im Voraus öffnen und sie den
Coroutinen für die Dauer ihrer Arbeit überlassen. Wie es sich trifft, wissen wir
bereits, wie man einen baut. Ein Pool ist ein Channel, der Verbindungen hält:

```php
$pool = new Channel(5);

for ($i = 0; $i < 5; $i++) {
    $pool->send(new PDO(/* ... */));
}

// Innerhalb einer Coroutine:
$pdo = $pool->recv();   // eine Verbindung nehmen
saveAddress($pdo, $address);
$pool->send($pdo);      // sie zurückgeben
```

Freie Verbindungen liegen im Puffer. Sind alle belegt, legt `recv` die Coroutine
schlafen, bis jemand eine Verbindung zurückgibt. Dieselbe Synchronisation aus dem
vorigen Kapitel, nur hält die Warteschlange Ressourcen statt Aufgaben.

Das Schema funktioniert, hat aber eine Schwachstelle: Du musst daran denken, die
Verbindung zurückzugeben, egal was passiert, einschließlich einer Ausnahme oder eines
Abbruchs. Und dann sind da noch Transaktionen, abgebrochene Verbindungen,
Neuverbindungen. Für PDO ist all das bereits erledigt, direkt im Kern.

## PDO Pool

Der Pool ist in `PDO` selbst eingebaut und wird über Konstruktor-Attribute
eingeschaltet:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 2,
    PDO::ATTR_POOL_MAX     => 10,
]);
```

Von außen hat sich nichts geändert: Genau das erste Beispiel, bei dem ein einzelnes
`$pdo` an zehn Worker hinausgeht, ist nun korrekt. Das `$pdo`-Objekt ist keine
Verbindung mehr, sondern eine Fassade für den Pool. Wenn eine Coroutine ihre erste
Abfrage ausführt, übergibt ihr der Pool eine dedizierte Verbindung, und alle Abfragen
dieser Coroutine laufen darüber. Sobald die Coroutine fertig ist, geht die Verbindung
zurück in den Pool, bereit für die nächste Coroutine.

Kein manuelles `recv` und `send`: Das Beschaffen und Zurückgeben geschehen von selbst,
zu den richtigen Momenten, egal wie es ausgeht. Der Code sieht aus wie ganz
gewöhnliches synchrones PHP mit einem ganz gewöhnlichen PDO, und genau das war die
Idee.

## Transaktionen

Eine Transaktion ist Zustand, der zu einer Verbindung gehört, deshalb behandelt der
Pool sie gesondert: Solange eine Transaktion offen ist, ist die Verbindung an ihre
Coroutine gebunden und geht nicht zurück in den Pool:

```php
$workers->spawn(function () use ($pdo, $queue) {
    // ...
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO addresses (user_id, region) VALUES (...)");
    $pdo->exec("UPDATE users SET address_checked = 1 WHERE id = ...");
    $pdo->commit();
    // erst jetzt kann die Verbindung in den Pool zurückkehren
});
```

Was, wenn eine Coroutine endet, ohne `commit` aufzurufen? Erinnere dich an das Kapitel
über Scope: Ein Worker könnte mitten in einer Transaktion abgebrochen werden, und das
ist ein normales Szenario, keine Katastrophe. Bevor die Verbindung zurückgegeben wird,
führt der Pool automatisch ein `ROLLBACK` aus. Eine unvollendete Transaktion sickert
weder in die nächste Coroutine durch noch bleibt sie in der Datenbank hängen.

## Wenn eine Verbindung abbricht

Ein Import kann eine Stunde laufen. Innerhalb einer Stunde könnte die Datenbank neu
starten, das Netzwerk kurz aussetzen oder ein DBA eine Sitzung beenden. Im klassischen
PHP würde das Skript einfach abstürzen, aber eine langlaufende Anwendung muss
weiterarbeiten können.

Der Pool prüft Verbindungen, wenn sie zurückgegeben werden: Eine kaputte wird zerstört,
statt an die nächste Coroutine übergeben zu werden. Und schlägt eine Abfrage wegen
einer abgebrochenen Verbindung fehl, genügt es, sie auf demselben `$pdo` einfach erneut
zu versuchen, der Pool übergibt der Coroutine eine frische Verbindung:

```php
try {
    saveAddress($pdo, $address);
} catch (PDOException $e) {
    saveAddress($pdo, $address); // der Pool hat bereits eine neue Verbindung eingesetzt
}
```

Keine Notwendigkeit, Reconnect-Logik zu schreiben, keine Notwendigkeit, das
`PDO`-Objekt neu zu erzeugen. Wiederhole einfach die Abfrage, um alles andere kümmert
sich der Pool.

Am Ende funktioniert der Code, als hätte jede Coroutine ihre eigene
Datenbankverbindung. In Wirklichkeit gibt es nur zehn Verbindungen, und der Pool reicht
sie ständig von Hand zu Hand, behält Transaktionen im Auge und wirft die toten weg.
Aber nichts von dieser Küchenarbeit zeigt sich von außen, und das ist der Hauptnutzen:
Wir schreiben einfach gewöhnlichen Code mit PDO.

Übrigens arbeiten unsere Worker noch halb blind: Sie prüfen Adressen und speichern
sie, aber niemand zählt, wie viele Adressen sich als schlecht herausgestellt haben oder
welche. Wie holen wir Ergebnisse aus Coroutinen zurück und sammeln sie bequem ein? Das
gehen wir im nächsten Kapitel an.
