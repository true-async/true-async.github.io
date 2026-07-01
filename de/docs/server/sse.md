---
layout: docs
lang: de
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /de/docs/server/sse.html
page_title: "TrueAsync Server: Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry(): fertige text/event-stream-Helfer über HTTP/1.1, HTTP/2 und HTTP/3."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE (Server-Sent Events) ist eine einfache Möglichkeit, Text-Events über eine normale
HTTP-Verbindung an den Browser zu streamen, nur in eine Richtung: vom Server zum Browser. Anders
als WebSocket braucht es kein eigenes Protokoll und keinen Upgrade-Handshake: der Server hält die
Antwort einfach offen und hängt neue Events an, sobald sie bereit sind. Der Browser konsumiert sie
über die eingebaute `EventSource`-API, ohne zusätzliche Bibliotheken.

`HttpResponse` bietet vier Methoden für `text/event-stream`: `sseStart()`, `sseEvent()`,
`sseComment()` und `sseRetry()`. Das ist eine dünne Formatierungsschicht über derselben
[`send()`-Pipeline](/de/docs/server/streaming.html), sodass derselbe Handler unverändert über
HTTP/1.1, HTTP/2 und HTTP/3 funktioniert, das Protokoll wählt der Client.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // langlebiger Stream: kein Write-Deadline

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // optional: der erste sseEvent()/sseComment() startet den Stream ebenfalls
    $res->sseRetry(3000);      // Browser-Hinweis, nach 3s bei Abbruch erneut zu verbinden
    $res->sseComment('stream open');   // Heartbeat, hält Proxys davon ab, die Verbindung zu idlen

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // Client ist weg, warten lohnt sich nicht
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

Browser-Seite:

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

Schaltet die Antwort in den SSE-Modus und schreibt die Header fest: `Content-Type:
text/event-stream`, `Cache-Control: no-cache, no-transform` und `X-Accel-Buffering: no` (Letzteres
sagt nginx, die Antwort nicht zu puffern; ohne diesen Header stauen sich Events hinter dem
Proxy-Puffer, bis dieser voll ist). Die Antwort wird außerdem als nicht komprimierbar markiert: ein
puffernder gzip-Stream würde den Sinn der Echtzeit-Zustellung zunichtemachen.

Der Aufruf ist optional: der erste `sseEvent()`/`sseComment()` startet den Stream ebenfalls. Aber
`sseStart()` allein flusht Statuszeile und Header **nicht** auf den Draht, das Commit ist lazy und
erfolgt beim ersten echten Event. Um den Stream sofort zu öffnen (zum Beispiel, um das `onopen` des
Browsers freizuschalten, bevor ein echtes Event bereit ist), senden Sie ein leeres `sseComment()`:
das startet den Stream und committet die Header sofort.

Wirft `HttpServerInvalidArgumentException`, wenn der Handler bereits einen eigenen `Content-Type`
gesetzt hat, und `HttpServerRuntimeException`, wenn die Antwort bereits streamt, geschlossen ist
oder mit `sendFile()` beschäftigt ist.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

Formatiert und sendet ein SSE-Event, startet den Stream bei Bedarf. Mehrzeiliges `$data` wird an
`\n` / `\r\n` / `\r` aufgeteilt und als mehrere `data:`-Felder gesendet (WHATWG §9.2). `$event`,
`$id` und `$retry` werden nur eingefügt, wenn sie nicht `null` sind. Der Datensatz endet mit einer
Leerzeile, damit der Browser das Event sofort verarbeitet.

- `$event` und `$id` dürfen kein `\r`/`\n` enthalten (sonst würde der Parser das als
  Feld-/Datensatztrenner lesen), und `$id` darf kein NUL enthalten (laut WHATWG lässt ein NUL den
  Parser die gesamte id ignorieren): Verstöße werfen `HttpServerInvalidArgumentException`.
- `$retry` muss nicht-negativ sein.
- Ein leerer String `$data === ''` ist ebenfalls gültig, er löst ein leeres `MessageEvent` aus.
- Alle vier Argumente auf `null` gesetzt ist ein No-op. Der `EventSource`-Parser überspringt ein
  Event ohne `data` und ohne `retry` stillschweigend.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

Sendet eine Kommentarzeile (ein Datensatz, der mit `:` beginnt). Browser ignorieren Kommentare,
aber sie halten die Verbindung durch die Idle-Timeouts zwischengeschalteter Proxys am Leben
(nginx' `proxy_read_timeout`, standardmäßig 60s). Rufen Sie sie periodisch als Heartbeat auf. Der
kanonische Payload ist ein leerer String, der auf dem Draht zu `:\n\n` wird. `$text` darf kein
`\r`/`\n` enthalten.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

Sendet eine `retry:`-Direktive, die dem Browser mitteilt, wie viele Millisekunden er warten soll,
bevor er nach einem Abbruch des Streams erneut verbindet. Zucker für `sseEvent(retry:
$milliseconds)` ohne Payload.

## Backpressure: `sendable()`

Wie `send()` suspendiert jede SSE-Methode die Handler-Coroutine nur unter echter Backpressure,
also wenn der Zwischenpuffer des Streams voll ist. Der `sendable()`-Check ist nicht-blockierend
und beratend: `false` bedeutet, der nächste Aufruf würde suspendieren, die Antwort ist bereits
geschlossen, oder dieser Antworttyp unterstützt Streaming überhaupt nicht. Praktisch, um nicht auf
einen langsamen Client warten zu müssen, wenn es andere Arbeit gibt.

## Siehe auch

- [`HttpResponse::sseStart()`](/de/docs/reference/server/http-response.html#ssestart) und die
  übrigen SSE-Methoden in der Referenz
- [Streaming](/de/docs/server/streaming.html): das Low-Level-`send()`/`sendable()`, auf dem SSE
  aufbaut
- [Beispiele](/de/docs/server/examples.html#sse-server-sent-events)
