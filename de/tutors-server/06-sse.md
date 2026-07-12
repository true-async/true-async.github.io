---
layout: tutorial
lang: de
path_key: "/tutors-server/06-sse.html"
nav_active: docs
permalink: /de/tutors-server/06-sse.html
page_title: "Server-Sent Events"
description: "SSE: ein Ereignisstrom zum Browser, Import-Fortschritt und Heartbeat über sseComment()."
---

# Server-Sent Events

Der Adressimport startet jetzt also mit einem Klick auf einen Button auf
der Seite. Der Benutzer hat geklickt, die Datei ging raus, die
Verarbeitung begann. Sie läuft etwa zehn Minuten. Was sieht der Benutzer
die ganze Zeit über?

Richtig, einen sich drehenden Spinner. Zehn Minuten lang. Ohne das
kleinste Lebenszeichen. So gegen die dritte Minute wird er entscheiden,
dass alles hängt, die Seite neu laden und den Import ein zweites Mal
starten. Wir brauchen einen Fortschrittsbalken.

Die klassische Lösung ist Polling: Der Browser fragt einmal pro Sekunde
`/import/progress` ab, der Server antwortet mit einer Zahl. Funktioniert
das? Es funktioniert. Aber rechne nach: sechshundert Anfragen in zehn
Minuten, mit Headern, mit einem vollständigen Verarbeitungszyklus, und
in jeder ist die Nutzlast eine einzige Zahl. Was wir lieber hätten, ist
das Gegenteil: Der Browser verbindet sich einmal, und von da an sendet
der Server die Zahl von sich aus, wann immer sie sich ändert.

Genau das macht `SSE`, `Server-Sent Events`. Kein neues Protokoll. Eine
ganz normale `HTTP`-Antwort, die der Server nicht schließt, sondern an
die er ständig Ereignisse anhängt. Auf der Browserseite werden sie vom
eingebauten `EventSource` empfangen, ganz ohne Bibliothek.

## Fortschritt zum Browser

```php
use function Async\delay;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    if ($req->getPath() !== '/import/progress') { /* ... Routing ... */ }

    $import = currentImport(); // derselbe ImportService aus der ersten Serie

    $res->sseStart();
    $res->sseRetry(3000); // bricht der Strom ab, verbindet sich der Browser nach 3 Sekunden neu

    while (!$import->isFinished()) {
        $res->sseEvent(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!$res->sendable()) {
            break; // der Tab wurde geschlossen, es gibt niemanden, für den man zeichnen könnte
        }

        delay(1000);
    }

    $res->sseEvent(event: 'finished', data: 'ok');
    $res->end();
});
```

Und im Browser:

```js
const es = new EventSource('/import/progress');
es.addEventListener('progress', e => {
    const {done, total} = JSON.parse(e.data);
    bar.style.width = (100 * done / total) + '%';
});
es.addEventListener('finished', () => es.close());
```

Sieh dir die Struktur des Handlers genau an. Eine Schleife. Ein
Messwert. `delay(1000)`. Kommt dir das bekannt vor? Es ist die
Fortschritts-Coroutine aus dem allerersten Kapitel, Buchstabe für
Buchstabe. Nur die letzte Zeile hat sich geändert: statt `echo` ins
Terminal jetzt `sseEvent()` in eine offene Antwort. Fünfzehn Kapitel
später erreichte der Fortschrittsbalken den Browser, und der Code
änderte sich kaum. Und wie damals weiß der Fortschritt nichts vom
Import, und der Import weiß nichts vom Fortschritt.

Unter der Haube steckt auch keine Magie: Die SSE-Methoden sind eine
dünne Formatierung über `send()` aus dem vierten Kapitel. Daraus ergeben
sich zwei Gratisgeschenke. Backpressure: Ein langsamer Tab frisst nicht
den Speicher des Servers auf. Und Protokollunabhängigkeit: Derselbe
Handler funktioniert über `HTTP/1.1`, `HTTP/2` und `HTTP/3`, und der
Browser wählt aus.

## Lange Stille und der Heartbeat

Eine `SSE`-Verbindung lebt Minuten und Stunden. Ein langes Leben hat wie
üblich seine eigenen Leiden. Hier gibt es zwei davon.

Das erste: das Schreib-Timeout. Standardmäßig begrenzt der Server, wie
lange eine Antwort zum Senden brauchen darf, und das ist richtig so.
Aber eine SSE-Antwort wird für immer "gesendet", das ist ihre Natur. Für
einen Dienst mit Strömen schaltest du die Begrenzung ab:

```php
$config->setWriteTimeout(0);
```

Das zweite Leiden ist subtiler. Angenommen, der Import stockt für lange
Zeit: Er berechnet etwas Schweres, es gehen keine Ereignisse raus. Für
uns ist es eine Pause, aber für irgendeinen Proxy zwischen Server und
Browser ist es eine tote Verbindung, die abgeräumt gehört. Und er wird
sie abräumen, nginx nimmt dafür standardmäßig sechzig Sekunden.

Die Kur ist in ihrer Einfachheit fast komisch:

```php
$res->sseComment(); // auf der Leitung: ":\n\n"
```

Ein Kommentar. Ein Ereignis, das der Browser stillschweigend ignoriert,
das aber durch die Leitung reist und jeden Vermittler davon überzeugt,
dass die Verbindung lebt. Sende ihn während der Pausen per Timer, und
der Strom überlebt jede Stille.

## Abbrüche und Wiederherstellung

Das Mobilfunknetz hat geblinzelt, der Strom ist abgebrochen. Was tun?
Nichts. Im Ernst: `EventSource` stellt die Verbindung selbst wieder her,
nachdem es das Intervall aus `sseRetry()` abgewartet hat.

Das Einzige, wobei es sich lohnt zu helfen, ist, nicht bei null
anzufangen. Gib den Ereignissen Nummern:

```php
$res->sseEvent(data: $update, id: (string) $sequence);
```

Beim erneuten Verbinden sendet der Browser einen `Last-Event-ID`-Header
mit der letzten empfangenen Nummer, und der Handler setzt genau ab
diesem Punkt fort:

```php
$since = (int) ($req->getHeader('last-event-id') ?? 0);
foreach (updatesSince($since) as $sequence => $update) {
    $res->sseEvent(data: $update, id: (string) $sequence);
}
```

Zustellung, erneutes Verbinden, Nachholen des Verpassten. Ein ehrlicher
Benachrichtigungskanal, und das alles über ganz gewöhnliches HTTP.

Mit einem Vorbehalt: Der Kanal ist einseitig. Der Server spricht, der
Browser hört zu. Für einen Fortschrittsbalken ist das ideal. Aber für
einen Support-Chat, in dem beide Seiten schreiben? Für einen Chat
brauchst du etwas Ernsthafteres.
