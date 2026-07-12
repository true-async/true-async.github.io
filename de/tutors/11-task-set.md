---
layout: tutorial
lang: de
path_key: "/tutors/11-task-set.html"
nav_active: docs
permalink: /de/tutors/11-task-set.html
page_title: "TaskSet"
description: "TaskSet: ein sich selbst leerender Strom von Tasks, joinNext/joinAny/joinAll und eine Supervisor-Schleife."
---

# TaskSet

Das vorige Kapitel hat gezeigt, dass sich `TaskGroup` alles merkt. Das ist kein Zufall, sondern
eine Eigenschaft, auf die du dich verlassen kannst: egal wie oft du die Gruppe nach Ergebnissen
fragst, du bekommst immer dieselbe Antwort. Dieses Verhalten nennt man Idempotenz, und darauf
sind wir schon einmal gestoßen: ein wiederholtes `await` auf einer Coroutine liefert jedes Mal
dasselbe Ergebnis.

Aber Gedächtnis hat seinen Preis. Lass hunderttausend Tasks durch eine Gruppe laufen, und alle
hunderttausend Ergebnisse bleiben darin liegen, selbst wenn jedes einzelne nur ein einziges Mal
gebraucht wurde, genau in dem Moment, in dem es fertig war. Für eine Pipeline, die stundenlang
läuft, ist das kein Speichern mehr, sondern ein Leck.

Was du brauchst, ist ein Zwilling von `TaskGroup` mit dem entgegengesetzten Wesen: das Ergebnis
übergeben und es dann vergessen. Er heißt `TaskSet`.

## Verbrauchen statt speichern

Oberflächlich sieht alles gleich aus: `spawn`, `close`, ein Nebenläufigkeitslimit. Der
Unterschied liegt darin, was mit einem Ergebnis geschieht, nachdem es ausgeliefert wurde:

```php
use Async\TaskSet;

$set = new TaskSet();

$set->spawn(fn() => 'alpha');
$set->spawn(fn() => 'beta');
$set->spawn(fn() => 'gamma');

echo $set->joinNext()->await(); // alpha
echo $set->joinNext()->await(); // beta, schon ein anderes!
echo $set->joinNext()->await(); // gamma

echo $set->count(); // 0, das Set ist leer
```

Jeder Aufruf von `joinNext()` liefert das nächste fertige Ergebnis und entfernt dessen Eintrag
aus dem Set. Vergleiche das mit `race()` bei `TaskGroup`, das immer denselben ersten Gewinner
zurückgibt, egal wie oft du es aufrufst. `TaskSet` verhält sich nicht wie ein Speicher, sondern
wie eine Warteschlange: einmal gelesen, und schon ist es weg. Ja, das ist genau dieselbe
Semantik wie `recv` aus dem Kapitel über Channels, nur dass die Warteschlange jetzt keine Werte
enthält, sondern fertig werdende Tasks.

Die Wartemethoden der Zwillinge reimen sich aufeinander:

- **`joinNext()`** — wie `race()`: der erste, der fertig wird, sein Eintrag wird entfernt.
- **`joinAny()`** — wie `any()`: der erste erfolgreiche, sein Eintrag wird entfernt.
- **`joinAll()`** — wie `all()`: alle Ergebnisse auf einmal, das Set wird geleert.

Das Präfix `join` deutet den Unterschied selbst an: ein Ergebnis wird nicht nur gelesen, es wird
entnommen.

## Eine Pipeline ohne Leck

Schreiben wir den Import von hunderttausend Zeilen mit dem neu Gelernten um:

```php
$set = new TaskSet(concurrency: 10);

spawn(function () use ($set, $handle, $addressIndex) {
    while (($row = fgetcsv($handle)) !== false) {
        $set->spawn(fn() => checkAddress($row[$addressIndex]));
    }
    $set->close();
});

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        error_log("Adresse nicht verifiziert: {$error->getMessage()}");
        continue;
    }
    saveAddress($pdo, $result);
}
```

Eine Coroutine liest die Datei und füttert sie fortlaufend mit Tasks, während der Hauptfluss
Ergebnisse verarbeitet, sobald sie fertig werden. Jeder verarbeitete Eintrag wird sofort aus dem
Set entfernt, sodass der Speicher nur die gerade in Bearbeitung befindlichen Tasks hält: zehn
laufende plus die Warteschlange. Die Datei kann beliebig groß sein, der Speicherverbrauch hängt
nicht von ihr ab.

Beachte, wie sich vertraute Details zu einem neuen Bild zusammenfügen: ein Nebenläufigkeitslimit
statt eines selbstgebauten Worker-Pools, `close()` als Signal dafür, dass "keine weiteren Tasks
mehr kommen", das Paar `[$result, $error]` statt stillschweigend geschluckter Ausnahmen, und die
`PDO` aus Kapitel neun, unbeeindruckt von nebenläufigen Aufrufen von `saveAddress`.

## Supervisor

Es gibt ein zweites Szenario, in dem diese verbrauchende Semantik unverzichtbar ist: Code, der
über langlebige Tasks wacht und reagiert, wenn sie enden.

```php
$set = new TaskSet();

$set->spawnWithKey('mailer',  runMailer(...));
$set->spawnWithKey('metrics', runMetrics(...));
$set->spawnWithKey('cleaner', runCleaner(...));

foreach ($set as $key => [$result, $error]) {
    error_log("Dienst $key gestoppt" . ($error ? ": {$error->getMessage()}" : ''));

    // den ausgefallenen Dienst neu starten
    $set->spawnWithKey($key, restartService($key));
}
```

Das Set wird nie geschlossen, deshalb endet das `foreach` nie, es wartet einfach auf das nächste
Ereignis. Jeder verarbeitete Eintrag wird entfernt, der neu gestartete Dienst wird an seiner
Stelle wieder hinzugefügt, und die Schleife lebt ewig. Der Supervisor braucht keine Historie
jeder Fertigstellung seit Anbeginn der Zeit, er braucht genau dies: einer seiner Schützlinge hat
gestoppt, geh und finde heraus warum und starte ihn neu. Diese Schleife könntest du mit
`TaskGroup` nicht schreiben: ihr `foreach` würde jedes einzelne Mal wieder beim ersten Dienst
beginnen, der gestoppt ist.

Das also ist im Wesentlichen der ganze Unterschied zwischen den Zwillingen: das Gedächtnis. Eine
Gruppe speichert Ergebnisse und beantwortet jede Frage dazu wiederholt, was sie gut für Fälle
macht, in denen die Menge der Tasks festliegt und die Ergebnisse als Ganzes zählen. Ein Set
übergibt jedes Ergebnis einmal und gibt den Speicher sofort frei, weshalb es einen endlosen Strom
von Tasks bewältigen kann. Es gibt eine einfache Regel für die Wahl: lautet deine Frage an die
Tasks "was habt ihr herausgefunden?", greife zu `TaskGroup`; lautet sie "was kommt als
Nächstes?", greife zu `TaskSet`.

Über die letzten vier Kapitel haben wir dasselbe dreimal gebaut: eine Sammlung durchlaufen und
auf jedem Element unter einem Limit nebenläufige Arbeit verrichten. Einmal mit einem Channel und
Workern, einmal mit `TaskGroup`, einmal mit `TaskSet`. Wird es nicht Zeit, dass dieses Muster
einen eigenen Namen bekommt und auf eine einzige Zeile schrumpft?
