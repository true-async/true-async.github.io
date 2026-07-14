---
layout: tutorial
lang: de
path_key: "/tutors/08-scope.html"
nav_active: docs
permalink: /de/tutors/08-scope.html
page_title: "Scope"
description: "Scope: wem Coroutinen gehören, wer auf ihr Ende wartet und die ganze Gruppe abbricht."
---

# Scope

Im vorigen Kapitel haben wir zehn Worker gestartet und den Channel geschlossen. Die
Datei ist gelesen, `close()` wurde aufgerufen, und der Hauptfluss ist weitergezogen.
Aber Moment: Die Worker arbeiten den Puffer noch ab. Die Importfunktion hat die
Kontrolle bereits zurückgegeben, und die Arbeit ist nicht erledigt. Würde das
PHP-Skript jetzt sofort enden, blieben einige Adressen ungeprüft.

Und eine zweite Sorge aus demselben Kapitel: Was, wenn `checkAddress` in einem Worker
eine Ausnahme wirft? Aus dem Kapitel über Ausnahmen wissen wir, dass sie im Handle der
Coroutine gespeichert wird und auf ein `await` wartet. Aber niemand hatte vor, die
Worker mit `await` zu erwarten. Der Fehler käme erst ganz am Ende ans Licht, wenn es
zu spät ist, noch etwas zu richten.

Beide Probleme lassen sich von Hand lösen: Coroutinen in ein Array sammeln und jede
einzeln erwarten.

```php
$workers = [];

for ($i = 0; $i < 10; $i++) {
    $workers[] = spawn(worker(...), $queue);
}

// ... die Datei lesen ...

foreach ($workers as $worker) {
    await($worker);
}
```

Es funktioniert. Aber es ist Buchhaltung: Du musst daran denken, das Array
einzurichten, es durch den gesamten Codepfad zu tragen und am Ende darüber zu
iterieren. Und wenn eine Coroutine irgendwo tief in einer aufgerufenen Funktion
gestartet wird, schafft sie es gar nicht erst in dieses Array. Was wir wollen: dass
Coroutinen von selbst wissen, wem sie gehören.

Genau dafür ist `Scope` da.

## Ein Sandkasten für Coroutinen

`Scope` ist ein Raum, in dem Coroutinen leben. Er weiß über jede darin gestartete
Coroutine Bescheid und kann sie als Gruppe behandeln:

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;

$queue = new Channel(100);
$workers = new Scope();

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
$workers->awaitCompletion(timeout(60000));

echo "Import finished, all addresses checked\n";
```

Der Unterschied zum vorigen Kapitel sind zwei Zeilen: `$workers->spawn()` statt
`spawn()` und `awaitCompletion()` am Ende. Die Methode `awaitCompletion` wartet, bis
jede Coroutine im Scope beendet ist, wie viele es auch sind. Kein Array, keine
Buchhaltung: Der Scope führt selbst Buch.

Der Abbruch-Token ist hier nicht optional, sondern ein Pflichtargument: Ein Scope
lässt dich bewusst nicht ohne Grenze auf eine Gruppe warten. Das vertraute `timeout`
passt gut, und schafft es der Import nicht innerhalb einer Minute, wird das Warten mit
einer `OperationCanceledException` unterbrochen, und es liegt an dir zu entscheiden:
noch etwas länger warten oder die Gruppe abbrechen.

## Fehler gehen nicht mehr verloren

Kehren wir zum abgestürzten Worker zurück. Eine Coroutine innerhalb eines Scope kann
nicht still sterben: Eine unbehandelte Ausnahme steigt zum übergeordneten Scope auf.
Standardmäßig reagiert ein Scope streng: Ein Fehler in einer Coroutine bricht alle
anderen ab, und die Ausnahme wird demjenigen zugestellt, der in `awaitCompletion`
wartet.

```php
try {
    $workers->awaitCompletion(timeout(60000));
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

Diese Strategie heißt Fail-together: Die Gruppe kommt entweder als Ganzes zu Ende oder
stoppt als Ganzes. Für den Import ist das vernünftig: Fällt `GeoDirectory` aus, hat es
keinen Sinn, es mit den restlichen neun Workern zu bombardieren.

Aber Strenge ist nicht immer das, was du willst. Eine einzige schlechte Adresse in der
Datei ist kein Grund, die anderen neunundneunzigtausend aufzugeben. In diesem Fall
weist du dem Scope einen Fehlerbehandler zu, und die Coroutinen werden unabhängig: Die
fehlgeschlagene wird protokolliert, die übrigen arbeiten weiter:

```php
$workers->setExceptionHandler(function ($scope, $coroutine, Throwable $e) {
    error_log("Address not checked: {$e->getMessage()}");
});
```

Neben der Ausnahme selbst erhält der Behandler den Scope und die fehlgeschlagene
Coroutine: praktisch, um herauszufinden, wer genau gestorben ist, oder um die Arbeit
neu zu starten.

Die Wahl der Strategie liegt bei dir, und das ist der Hauptunterschied zu einem
schlichten `spawn`: Dort ist die einzige Strategie "abfeuern und vergessen".

## Die ganze Gruppe abbrechen

Im Kapitel über das Abbrechen haben wir eine einzelne Coroutine mit `cancel()`
gestoppt. Ein Scope tut dasselbe für eine ganze Gruppe auf einmal:

```php
$workers->cancel();
```

Jede Coroutine darin erhält an ihrem eigenen Wartepunkt die vertraute
`AsyncCancellation`: einige in `recv`, einige in `delay`. Der Mechanismus ist derselbe,
kooperativ, nur geht das Signal an alle auf einmal hinaus.

Ein Scope kann untergeordnete Scopes enthalten, und der Abbruch fließt rekursiv die
Hierarchie hinab: Brich den übergeordneten ab, und der ganze Zweig wird abgebrochen.
Coroutinen sind kein verstreuter Haufen unabhängiger Aufgaben mehr, sondern bilden
einen Baum, in dem jede einen Platz und einen Besitzer hat. Dieser Ansatz heißt
strukturierte Nebenläufigkeit, und er hat sich in Kotlin, Swift und Java bereits
bewährt. TrueAsync bringt ihn nach PHP.

## Ein Scope gehört einem Objekt

Die eleganteste Verwendung eines Scope: den Besitz daran einem Objekt übergeben.

```php
use Async\Scope;

final class ImportService
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function import(string $path): void
    {
        $this->scope->spawn(/* Worker und Dateilesen */);
        $this->scope->spawn(/* die Fortschritts-Coroutine aus dem ersten Kapitel */);
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}
```

Die Lebensdauer der Coroutinen entspricht nun der Lebensdauer des Dienstes. Solange
das Objekt existiert, arbeiten seine Coroutinen weiter. Zerstöre das Objekt, und
`dispose()` bricht alles ab, was es zu starten geschafft hat.

Erinnerst du dich an `$progress->cancel()` aus dem ersten Kapitel? Wir haben den
Moment, in dem die Fortschritts-Coroutine überflüssig wurde, von Hand abgefangen. Mit
einem Scope entfällt diese Frage einfach: Fortschritt wird so lange gebraucht, wie der
Import läuft, und der läuft genau so lange, wie `ImportService` lebt. Der Besitz wird
direkt im Code ausgedrückt, und es gibt schlicht keinen Ort mehr, eine Coroutine zu
vergessen.

## Der ganze Import, von Anfang bis Ende

Fügen wir alles, was wir über acht Kapitel angesammelt haben, zu einer
funktionierenden Klasse zusammen: die Coroutinen und den Fortschritt aus dem ersten
Kapitel, den backpressure-bewussten Channel aus dem siebten, den Scope aus diesem.

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;
use function Async\delay;
use function Async\timeout;

final class ImportService
{
    private Scope $scope;

    public function __construct(private readonly int $workers = 10)
    {
        $this->scope = new Scope();
    }

    public function import(string $path, int $total): void
    {
        $queue = new Channel(100);
        $counter = 0;

        // Worker: ziehen Adressen aus dem Channel, nie mehr als $this->workers nebenläufig
        for ($i = 0; $i < $this->workers; $i++) {
            $this->scope->spawn(function () use ($queue, &$counter) {
                foreach ($queue as $address) {
                        checkAddress($address);
                        $counter++;
                }
            });
        }

        // Fortschritt: zeigt den Stand einmal pro Sekunde, bis der Import fertig ist
        $this->scope->spawn(function () use (&$counter, $total) {
            while ($counter < $total) {
                printProgress($counter, $total);
                delay(1000);
            }
            printProgress($total, $total);
        });

        // Erzeuger: liest die Datei, der Backpressure des Channels schützt den Speicher
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $addressIndex = array_search('address', $header);

        while (($row = fgetcsv($handle)) !== false) {
            $queue->send($row[$addressIndex]);
        }

        fclose($handle);
        $queue->close();

        // Auf alles warten: sowohl die Worker als auch die Fortschritts-Coroutine
        $this->scope->awaitCompletion(timeout(600000));
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}

$importer = new ImportService();
$importer->import('users.csv', 100_000);
```

Ein paar Details sind einen genaueren Blick wert. Der Fortschritt ist keine
Endlosschleife mehr: Die Bedingung `while ($counter < $total)` beendet ihn kooperativ,
sobald die letzte Adresse verarbeitet ist, sodass `awaitCompletion` auf alles wartet,
ohne ein einziges `cancel`. Und `dispose()` im Destruktor spielt im Normalbetrieb
überhaupt keine Rolle: Es ist ein Sicherheitsnetz für den Fall, dass der Import eine
Ausnahme wirft oder das Objekt mittendrin verworfen wird.

Das sind die Grundzüge von Scope. `spawn` beantwortet nur die Frage "wie starte ich
nebenläufige Arbeit". Scope kümmert sich um die Fragen, die unmittelbar danach kommen:
wer auf diese Arbeit wartet, wer von einem Fehler erfährt und wer sie stoppt. Ohne
einen Scope ist eine Coroutine auf sich allein gestellt; innerhalb eines Scope hat sie
einen Besitzer und einen Platz in der Struktur des Programms.

Bisher haben die Worker nur aus der Außenwelt gelesen. Aber geprüfte Adressen müssen
noch in einer Datenbank gespeichert werden. Können wir einfach zehn Coroutinen ein
einziges `PDO`-Objekt in die Hand geben? Eine gute Frage, um das nächste Kapitel zu
eröffnen.
