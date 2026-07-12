---
layout: tutorial
lang: de
path_key: "/tutors/10-task-group.html"
nav_active: docs
permalink: /de/tutors/10-task-group.html
page_title: "TaskGroup"
description: "TaskGroup: eine Gruppe von Aufgaben mit Ergebnissen und die Wartestrategien all, race, any."
---

# TaskGroup

Angenommen, eine Nutzerprofilseite wird aus drei Quellen zusammengesetzt: Nutzerdaten
aus der Datenbank, Bestellungen aus der Datenbank und Bewertungen aus einer externen
API. Die Quellen hängen nicht voneinander ab, also sollten sie nebenläufig angefordert
werden. Wir wissen bereits, wie das geht:

```php
$user    = spawn(fetchUser(...), $userId);
$orders  = spawn(fetchOrders(...), $userId);
$reviews = spawn(fetchReviews(...), $userId);

$profile = new UserProfile(await($user), await($orders), await($reviews));
```

Erträglich für drei Aufgaben. Aber sieh genau hin: Das ist wieder die manuelle
Buchhaltung aus dem Kapitel über `Scope`, nur brauchen wir jetzt auch die Ergebnisse.
Jede Coroutine muss gemerkt und erwartet werden, und wenn `fetchUser` eine Ausnahme
wirft, laufen `fetchOrders` und `fetchReviews` für nichts weiter: Sie müssten "von
Hand" in einem `catch` abgebrochen werden.

Und es gibt Aufgaben, bei denen der manuelle Ansatz wirklich schmerzhaft wird. Zum
Beispiel das Ergebnis derjenigen Coroutine zu nehmen, die zuerst fertig wird, und die
übrigen abzubrechen. Versuch, das mit `await` in einer Schleife zu schreiben, und du
endest mit einem Knäuel aus Prüfungen und Abbrüchen.

`Scope` hilft hier auch nicht viel: Er verwaltet die Lebensdauer von Coroutinen, weiß
aber nichts über ihre Ergebnisse. Wir brauchen ein Primitiv auf höherer Ebene.

## Eine Gruppe von Aufgaben

`TaskGroup` bündelt Aufgaben zu einem Ganzen: Es lässt sie in seinem eigenen `Scope`
laufen, speichert ihre Ergebnisse und lässt dich auf die Gruppe als eine Einheit
warten:

```php
use Async\TaskGroup;

$group = new TaskGroup();

$group->spawnWithKey('user',    fn() => fetchUser($userId));
$group->spawnWithKey('orders',  fn() => fetchOrders($userId));
$group->spawnWithKey('reviews', fn() => fetchReviews($userId));

$data = $group->all()->await();

$profile = new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Die Methode `all()` gibt ein vertrautes `Future` zurück, das sich zu einem Array von
Ergebnissen auflöst, sobald jede Aufgabe fertig ist. Die Schlüssel haben wir selbst
über `spawnWithKey` vergeben, sodass das Array benannte Einträge statt schlichter
Indizes enthält.

Und da es ein `Future` ist, kommt ein Timeout gratis dazu, über denselben Token wie
immer:

```php
$data = $group->all()->await(timeout(5000));
```

Wirft auch nur eine Aufgabe eine Ausnahme, verhält sich die Gruppe wie der Scope aus
Kapitel acht: Die übrigen Aufgaben werden abgebrochen, und `await` wirft eine
`CompositeException`, die alle Fehler enthält. Die Gruppe sammelt entweder alles oder
nichts: Es gibt keinen Zwischenzustand.

## Wer zuerst fertig ist: race

`all()` ist nur eine der Wartestrategien. Denk zurück an `GeoDirectory`: Es hat drei
Replikate, und eines davon ist manchmal langsam. Der klassische Trick: die Anfrage an
alle Replikate schicken und die erste Antwort nehmen:

```php
$group = new TaskGroup();

foreach (['geo-1', 'geo-2', 'geo-3'] as $host) {
    $group->spawn(fn() => checkAddressAt($host, $address));
}

$verdict = $group->race()->await();
```

`race()` löst sich mit dem Ergebnis derjenigen Aufgabe auf, die zuerst fertig wird, ob
das nun Erfolg oder Misserfolg ist. Genau das Szenario "nimm die erste und warte nicht
auf die übrigen", das so schmerzhaft von Hand zu schreiben ist.

## Wer zuerst erfolgreich ist: any

`race()` hat eine harte Kante: Ist die erste fertige Aufgabe zufällig eine
fehlgeschlagene, bekommst du ihre Ausnahme. Manchmal brauchst du etwas Sanfteres:
mehrere Anbieter ausprobieren und die erste erfolgreiche Antwort nehmen, wobei man über
Fehlschläge hinwegsieht:

```php
$group = new TaskGroup();

$group->spawn(fn() => geocodeViaGoogle($address));
$group->spawn(fn() => geocodeViaOsm($address));
$group->spawn(fn() => geocodeViaYandex($address));

$coords = $group->any()->await();
$group->suppressErrors();
```

`any()` ignoriert die Fehlschläge und gibt den ersten Gewinner zurück. Eine Ausnahme
bekommst du nur, wenn jede Aufgabe fehlschlägt, und es wird eine `CompositeException`
mit der vollständigen Liste der Ursachen sein. Beachte den Aufruf `suppressErrors()`:
Niemand hat die Fehler der unterlegenen Anbieter behandelt, und die Gruppe will eine
ausdrückliche Bestätigung, dass das beabsichtigt war. Ein vertrautes Prinzip aus dem
Kapitel über Ausnahmen: Ein Fehler kann nicht einfach still verschwinden.

## Nebenläufigkeitsgrenze

Und jetzt etwas Unerwartetes. Erinnerst du dich an den Worker-Pool aus dem Kapitel
über Channels: ein Channel, zehn Coroutinen, eine `recv`-Schleife? `TaskGroup` kann
dasselbe in ein paar Zeilen:

```php
$group = new TaskGroup(concurrency: 10);

while (($row = fgetcsv($handle)) !== false) {
    $group->spawn(fn() => checkAddress($row[$addressIndex]));
}

$group->close();

foreach ($group as $key => [$result, $error]) {
    // Ergebnisse treffen ein, sobald sie bereit sind
}
```

Der Parameter `concurrency: 10` begrenzt, wie viele Aufgaben gleichzeitig laufen: Die
übrigen warten in der Reihe und starten nicht einmal eine Coroutine, bis ein Platz frei
wird. `close()` spielt dieselbe Rolle wie bei einem Channel: Es verkündet, dass keine
neuen Aufgaben mehr kommen. Und `foreach` gibt Ergebnisse aus, sobald sie bereit sind,
ohne auf das Ende der ganzen Gruppe zu warten.

Heißt das, der Channel wurde am Ende gar nicht gebraucht? Nein. Ein Channel ist ein
Synchronisationsprimitiv, aus dem sich alles bauen lässt. `TaskGroup` ist eine
fertige Baugruppe für den häufigsten Fall: "eine Menge von Aufgaben ausführen und die
Ergebnisse holen". Passt eine Aufgabe zu diesem Muster, greif zu `TaskGroup`; brauchst
du eine ungewöhnliche Topologie, sind Channels und Scope weiterhin in deinen Händen.

Fazit: `TaskGroup` ist ein Scope plus Ergebnisse. Eine Gruppe von Aufgaben verwandelt
sich in einen einzelnen Wert, den du um alles auf einmal, um die erste fertige oder um
die erste erfolgreiche bitten kannst.

Ein letztes Detail: `TaskGroup` bewahrt alle Ergebnisse sorgfältig auf. Rufe `race()`
zweimal auf, und du bekommst beide Male dieselbe Antwort. Iteriere die Gruppe erneut
mit `foreach`, und sie gibt alles noch einmal von Anfang an heraus. Für eine
Profilseite ist das bequem. Stell dir nun eine Pipeline vor, die hunderttausend
Aufgaben durch eine Gruppe laufen lässt. Alles, was die Gruppe sich merkt, lebt im
Speicher. Siehst du den Haken? Darüber sprechen wir im nächsten Kapitel.
