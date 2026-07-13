---
layout: tutorial
lang: de
path_key: "/tutors/06-future.html"
nav_active: docs
permalink: /de/tutors/06-future.html
page_title: "Future"
description: "Future und FutureState: ein Versprechen auf ein Ergebnis, das nicht an eine Coroutine gebunden ist."
---

# Future

In den vorigen Kapiteln haben wir festgestellt, dass sich eine Coroutine wie ein
Versprechen auf ein Ergebnis verhält: `await` lässt sich beliebig oft aufrufen und
liefert immer dasselbe zurück. Doch eine Coroutine unterliegt einer harten
Einschränkung: Das Ergebnis stammt immer von der Funktion, die `spawn` gestartet
hat. Ein Aufruf, eine Funktion, ein Ergebnis.

Aber was, wenn das Ergebnis gar nicht von einer Funktion kommt?

Kehren wir zurück zu `ProfileService`. Ein Nutzer ändert seine Lieferadresse, und
bevor sie gespeichert wird, muss die Adresse gegen ein Verzeichnis der vom Dienst
`GeoDirectory` bedienten Regionen geprüft werden:

```php
function loadRegions(): array {
    $response = file_get_contents('https://geodirectory.example.com/api/regions');
    return json_decode($response, true);
}
```

Das Verzeichnis ist groß, lädt langsam und ist für alle gleich. Zugleich benötigt
es jede Anfrage zur Profilaktualisierung, und Anfragen werden nebenläufig
bearbeitet. Ein `spawn(loadRegions(...))` in jeder einzelnen davon bedeutet,
`GeoDirectory` mit identischen Anfragen für eine identische Antwort zu bombardieren.
Verschwenderisch.

Wünschenswert wäre, dass die erste Anfrage das Verzeichnis tatsächlich lädt, während
alle anderen auf ihr Ergebnis warten. Dafür brauchen wir einen Ort, an dem ein Stück
Code das Ergebnis ablegt und ein anderes es abholt.

Dieser Ort kann ein `Future` sein.

## FutureState und Future

`Future` ist ein Versprechen und ein Behälter für ein Ergebnis. Es ist nicht an eine
Coroutine gebunden, funktioniert aber mit dem bereits bekannten `await`.

`Future` besteht aus zwei Objekten:

```php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);
```

- **`FutureState`** — schreibt das Ergebnis. Es bleibt bei demjenigen, der das Ergebnis erzeugt.
- **`Future`** — liest das Ergebnis. Es wird demjenigen übergeben, der auf das Ergebnis wartet.

Der Erzeuger schließt die Operation ab, der Verbraucher wartet mit dem vertrauten
`await` darauf:

```php
use function Async\await;

$state->complete(42);

echo await($future); // 42
```

Warum zwei Objekte statt einem? Die Aufteilung schützt vor Fehlern. Wer ein `Future`
hält, kann die Operation physisch nicht abschließen: Eine solche Methode gibt es
darauf nicht. Nur der Besitzer des `FutureState` darf das Ergebnis schreiben, und
das nur ein einziges Mal:

```php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

Schlägt die Operation fehl, wird statt eines Ergebnisses eine Ausnahme geschrieben,
und `await` wirft sie für alle, die warten:

```php
$state->error(new RemoteApiException('GeoDirectory did not respond'));

await($future); // wirft RemoteApiException
```

## Das Verzeichnisproblem lösen

Nun können wir ein Laden des Verzeichnisses bauen, das nebenläufige Anfragen
untereinander teilen:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

final class RegionsDirectory
{
    private ?Future $future = null;

    public function regions(): Future
    {
        if ($this->future !== null) {
            return $this->future;
        }

        $state = new FutureState();
        $this->future = new Future($state);

        spawn(function () use ($state) {
            try {
                $state->complete(loadRegions());
            } catch (Exception $e) {
                $state->error($e);
            }
        });

        return $this->future;
    }
}
```

Der erste Aufruf von `regions` startet eine Coroutine, die das eigentliche Laden
erledigt. Jeder weitere Aufruf erhält dasselbe `Future` und wartet auf ein einziges
gemeinsames Ergebnis. Sobald das Verzeichnis geladen ist, liefert `await` es sofort
zurück, egal wie oft danach gefragt wird:

```php
$regions = await($directory->regions());

if (profileExists($userId) && isset($regions[$changes['region']])) {
    updateProfile($userId, $changes);
}
```

Wie viele Anfragen auch nebenläufig bearbeitet werden, `GeoDirectory` wird genau
einmal getroffen, während `RegionsDirectory` ein ganz gewöhnlicher Dienst bleibt: Er
lässt sich in einem DI-Container verdrahten, in Tests austauschen, und sein gesamter
Zustand lebt in einem einzigen `$future`-Feld. Beachte, dass `await` mit einer
Coroutine und mit einem `Future` auf dieselbe Weise arbeitet, einschließlich des
Timeouts aus dem vorigen Kapitel:

```php
$regions = await($directory->regions(), timeout(2000));
```

## Ein Ergebnis, das du schon hast

Manchmal ist das Ergebnis im Voraus bekannt. Zum Beispiel wird das Regionsverzeichnis
beim Start des Dienstes vorgewärmt und liegt bereits im Speicher. Es hat keinen Sinn,
für einen schon bekannten Wert ein `FutureState` und eine Coroutine zu erzeugen,
deshalb gibt es dafür Fabrikmethoden:

```php
// das Ergebnis ist bereits da
$future = Future::completed($regionsFromWarmup);

// der Fehler ist bereits bekannt
$future = Future::failed(new RemoteApiException('GeoDirectory did not respond'));
```

Die Methode `regions` kann ein solches `Future` zurückgeben, und der Verbraucher
bemerkt keinen Unterschied: Er ruft weiterhin `await` auf und erhält das Ergebnis
sofort.

## Eine klassische Technik: Memoisierung

`RegionsDirectory` setzt bereits eine klassische Technik namens Memoisierung um: das
Ergebnis einmal berechnen und es an jeden wiederholten Aufruf herausgeben. Die
Technik ist allgemein genug, um sich um jede Funktion mit Argumenten wickeln zu
lassen:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function memoize(callable $fn): callable
{
    $cache = [];

    return function (mixed ...$args) use ($fn, &$cache): Future {
        $key = serialize($args);

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $state = new FutureState();
        $cache[$key] = new Future($state);

        spawn(function () use ($state, $fn, $args) {
            try {
                $state->complete($fn(...$args));
            } catch (Throwable $e) {
                $state->error($e);
            }
        });

        return $cache[$key];
    };
}
```

```php
$regionsOf = memoize(loadRegionsOf(...));

$de = await($regionsOf('DE')); // eine Anfrage an GeoDirectory
$fr = await($regionsOf('FR')); // eine Anfrage an GeoDirectory
$de = await($regionsOf('DE')); // sofort, aus dem Cache
```

Beachte eine Feinheit: Der Cache hält das `Future` selbst, nicht einen einfachen
Wert. Eine naive Memoisierung in nebenläufigem Code litte unter einem Wettlauf:
Während der erste Aufruf auf die Antwort von `GeoDirectory` wartet, prüft ein zweiter
Aufruf den Cache, findet ihn leer und feuert eine doppelte Anfrage ab. Diese Lücke
gibt es hier nicht. Das `Future` landet sofort im Cache, noch bevor die Berechnung
überhaupt beginnt, sodass der zweite Aufruf es findet und einfach wartet.

Die Technik hat eine Grenze: Memoisierung funktioniert nur für Daten, die sich über
die Lebensdauer des Prozesses nicht ändern. Eine Token-Prüfung oder einen Wechselkurs
auf diese Weise zwischenzuspeichern wäre ein Fehler: Sie hängen von der Zeit ab, und
ein solcher Cache braucht eine Lebensdauer, nach der das Ergebnis erneut geholt wird.
Aus demselben Grund verdienen Fehler eine gesonderte Überlegung: Ein fehlgeschlagenes
`Future` bliebe ebenfalls für immer im Cache, und meist ist es besser, es zu
entfernen, damit der nächste Aufruf einen erneuten Versuch unternimmt.

Die Hauptsache aus diesem Kapitel: Eine Coroutine beantwortet die Frage "wie komme
ich an das Ergebnis", während ein `Future` schlicht verspricht, dass ein Ergebnis
existieren wird. Woher es kommt, aus einer Coroutine, einem Cache oder einem anderen
Thread, geht den Verbraucher nichts an. Erzeuger und Verbraucher haben sich auf ein
Ergebnis geeinigt und wissen sonst nichts voneinander.

Aber was, wenn es nicht nur ein Ergebnis gibt, sondern einen ganzen Strom von Werten,
die von Coroutine zu Coroutine wandern müssen? Dafür gibt es ein eigenes Werkzeug,
und das ist das Thema des nächsten Kapitels.
