---
layout: tutorial
lang: de
path_key: "/tutors-server/07-websocket.html"
nav_active: docs
permalink: /de/tutors-server/07-websocket.html
page_title: "WebSocket"
description: "WebSocket: die recv-Schleife, ein Chatraum, Senden aus anderen Coroutinen und trySend gegen langsame Clients."
---

# WebSocket

In einem Support-Chat schreiben beide Seiten. Der Benutzer stellt eine
Frage, der Operator antwortet, und keiner wartet auf den anderen:
Nachrichten gehen in beide Richtungen, wann immer sie geschrieben
werden.

Können wir so einen Chat aus Werkzeugen zusammensetzen, die wir schon
kennen? Nach unten, vom Server zum Browser, trägt SSE ihn, das können
wir seit dem Kapitel von gestern. Und nach oben? Nach oben müssten wir
für jede Zeile des Benutzers ein separates POST senden. Eine neue
Anfrage, Header, eine Antwort, eine Trennung. Und so weiter für jedes
"danke, das hat geholfen". Es würde funktionieren, aber nicht besonders
gut.

Für ein Gespräch in beide Richtungen gibt es ein eigenes Protokoll,
WebSocket.

Es ist überraschend bescheiden gebaut. Der Client sendet eine ganz
normale HTTP-Anfrage mit einem `Upgrade`-Header: ein Vorschlag, zu einem
anderen Protokoll zu wechseln. Der Server stimmt zu: `101 Switching
Protocols`. Das war's, HTTP ist vorbei. Über dieselbe TCP-Verbindung
reisen Nachrichten nun in beide Richtungen, ohne Anfragen und ohne
Antworten.

```php
use TrueAsync\WebSocket;

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});
```

Der Server nimmt den Handshake vollständig auf sich: Der Handler wird
aufgerufen, sobald die Verbindung bereits umgeschaltet ist, und er
erhält ein fertiges Objekt. Das Modell ist vertraut: eine Verbindung,
eine Coroutine. `WebSocket` implementiert `Iterator`, und es ist der
Iterator, der die Coroutine bis zur nächsten Nachricht schlafen legt.
Der Client ging, die Schleife endete, der Server schloss die Verbindung
selbst mit dem Code `1000 Normal`. Und gewöhnliche HTTP-Handler arbeiten
weiter daneben, auf demselben Port.

## Ein Chatraum

Echo ist ein Aufwärmen. In einem echten Chat muss die Nachricht eines
Teilnehmers alle anderen erreichen. Halte einen Moment inne bei dem, was
das technisch bedeutet: Die Coroutine, die eine Verbindung bedient, muss
in andere schreiben. Klingt nach einer Quelle von Problemen? Schau:

```php
use TrueAsync\HttpRequest;

/** @var SplObjectStorage<WebSocket, string> $room */
$room = new SplObjectStorage();

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) use ($room) {
    $name = $req->getQueryParam('name', 'guest');
    $room->attach($ws, $name);
    $ws->send("Willkommen, Leute im Raum: {$room->count()}");

    try {
        foreach ($ws as $msg) {
            foreach ($room as $peer) {
                if ($peer !== $ws) {
                    $peer->trySend("$name: {$msg->data}");
                }
            }
        }
    } finally {
        $room->detach($ws);
    }
});
```

Dreißig Zeilen, und in ihnen kommen drei Fäden aus der ersten Serie auf
einmal zusammen. Eile nicht darüber hinweg, jeder verdient einen Halt.

Der erste: Der Raum ist einfach ein Objekt. Ein gewöhnliches
`SplObjectStorage`, über alle Coroutinen geteilt, ohne einen einzigen
Lock. Das Kapitel über Kanäle versprach, dass dies innerhalb eines
Threads erlaubt ist, und hier ist es in Aktion.

Der zweite: `finally`. Ein Teilnehmer kann anmutig gehen, kann zusammen
mit dem WLAN verschwinden, oder die Coroutine kann beim Herunterfahren
vom Server selbst abgebrochen werden. Drei Szenarien, ein `finally`, und
es ist garantiert, dass kein Geist im Raum zurückbleibt. Kooperativer
Abbruch, wie er ist.

Der dritte: In die Verbindung eines anderen zu schreiben ist aus jeder
Coroutine erlaubt. `send()` und `trySend()` sind dafür sicher; der
Server selbst sorgt dafür, dass sich Frames verschiedener Absender nicht
auf der Leitung vermischen. Lesen dagegen nur aus einer. Ein zweites
nebenläufiges `recv()` auf derselben Verbindung bekommt eine Ausnahme,
und das zu Recht: Ein Bytestrom hat keine sinnvolle Semantik für zwei
Leser.

## Ein langsamer Client hält den Raum nicht auf

Ist dir aufgefallen, dass der Broadcast `trySend` verwendet, nicht
`send`? Das ist kein Tippfehler, es ist eine Entscheidung, und es lohnt
sich, sie durchzusprechen.

Was macht `send()` bei einem vollen Puffer? Richtig, Backpressure: Es
legt die Coroutine schlafen, bis der Client den Rückstau abgearbeitet
hat. Für eine persönliche Antwort ist das genau, was du willst. Nun
stell dir das in einer Broadcast-Schleife vor. Ein Teilnehmer ist mit
seinem mobilen Internet in einen Tunnel gefahren, sein Puffer ist voll,
und... der ganze Raum wartet. Hundert Leute bekommen keine Nachrichten,
weil einer schlechten Empfang hat.

`trySend()` wartet nie. Entweder wird die Nachricht in den Puffer
aufgenommen und `true`, oder der Puffer ist voll und `false`, die
Nachricht verworfen. Der Chat opfert bewusst die Nachrichten des
Nachzüglers, um nicht alle zu bestrafen. Grausam? Für einen Chat nein:
Eine verpasste Zeile in einem Raum ist keine Tragödie. Wenn in deiner
Aufgabe kein Verlust erlaubt ist, verwende `send()` und nimm die Pausen
in Kauf, oder baue eine Warteschlange pro Client. Beide Strategien sind
ehrlich, die Wahl liegt bei dir.

Als letzter Ausweg gibt es auch eine Absicherung: Wenn `send()` länger
als das Schreib-Timeout in der Warteschleife hängt, wirft es
`WebSocketBackpressureException`. Dies betrifft einen Client, der die
Verbindung offen hält, aber überhaupt nicht liest.

## Räume, ohne die Buchführung

Das `SplObjectStorage` hat funktioniert, aber zähl, was es uns gekostet
hat: ein geteiltes Objekt, eine Broadcast-Schleife und ein `finally`, um
die Geister hinauszufegen. Alles nur, damit eine Zeile, die einer tippt,
die anderen erreicht. Es ist ein so verbreiteter Wunsch, dass der Server
ihn direkt erfüllt. Eine Verbindung **abonniert** einen Namen; eine
Nachricht, die auf diesen Namen **veröffentlicht** wird, erreicht alle,
die ihn abonniert haben. Derselbe Chat, ohne die Buchführung:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = $req->getQueryParam('room', 'lobby');
    $name = $req->getQueryParam('name', 'guest');

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", "$name: {$msg->data}");
    }
});
```

Das `SplObjectStorage` ist weg, und mit ihm die Schleife und das
`finally`. `subscribe()` setzt diese Verbindung in den Raum, `publish()`
sendet eine Zeile an alle darin, und eine Verbindung, die sich schließt,
verlässt ihre Räume von selbst. `publish()` hält dieselbe Abmachung, die
`trySend()` gerade getroffen hat: Ein Peer, dessen Puffer sich staut,
verwirft die Zeile, statt den Raum aufzuhalten, und blockiert nie den
Absender.

Der Name ist nicht nur eine Beschriftung, er ist ein Filter im Stil von
MQTT. Ebenen werden durch `/` getrennt, `+` passt auf eine Ebene und `#`
auf den Rest. Abonniere `chat/+/typing`, und du hörst das Tipp-Signal
aus jedem Raum auf einmal; `subscriberCount("chat/general")` sagt dir,
wie viele zuhören. Und noch eine Sache, still wichtig, die wir im
nächsten Kapitel einlösen werden: Ein Topic ist nicht an eine Verbindung
gebunden, nicht einmal an ein Array im Speicher. Halte daran fest.

## Wer hat die in den Chat gelassen?

Im Moment kann jeder den Raum betreten. Wenn du an der Tür prüfen
willst, deklariere einen dritten Parameter am Handler, und der Server
übergibt das Handshake-Objekt:

```php
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(
    function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade) use ($room) {
        if (authenticate($req) === null) {
            $upgrade->reject(401, 'auth required');
            return;
        }

        // ... der Raum ...
    }
);
```

`reject()` antwortet mit einem gewöhnlichen HTTP-Fehler, statt das
Protokoll umzuschalten. Über dasselbe Objekt wird auch ein Subprotokoll
ausgehandelt, falls der Client eines anbietet.

Der Chat ist fertig: der Raum im Speicher, sofortiger Broadcast,
Nachzügler bremsen niemanden. Merk dir die Formel, auf der alles ruht:
"geteilter Zustand im Speicher des Prozesses". Merk sie dir gut. Im
nächsten Kapitel schalten wir mehrere Worker ein, um alle Kerne der
Maschine zu belegen, und diese harmlose Formel wird als Erste in die
Luft fliegen.
