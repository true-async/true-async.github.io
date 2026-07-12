---
layout: tutorial
lang: de
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /de/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler(): unary und streaming, readMessage/writeMessage, Trailer und Deadlines."
---

# gRPC

Bisher haben nur Browser mit unserem Server gesprochen. Aber
`ProfileService` hat auch andere Gesprächspartner: `UserDirectory`,
`GeoDirectory`, das Billing. Dienste reden schon lange nicht über REST,
sondern über gRPC miteinander: strenge Verträge, Streaming in beide
Richtungen, Deadlines und Fehlercodes von Haus aus.

Üblicherweise wird für gRPC ein separater Server auf einem separaten
Port hochgefahren. Frag dich: warum eigentlich? gRPC ist ein Protokoll
über HTTP/2 und HTTP/3. Über das, was für uns bereits lauscht. Der
Server muss solche Anfragen nur am Content-Type `application/grpc`
erkennen und sie an einen separaten Handler übergeben. Und genau das tut
er.

## Contract First

Ein gRPC-Gespräch beginnt nicht mit Code. Es beginnt mit einem Vertrag,
und das ist vielleicht der wichtigste kulturelle Unterschied zu REST.
Beschreiben wir den Profildienst in `profile.proto`:

```protobuf
syntax = "proto3";
package profile;

service ProfileService {
  rpc GetProfile (GetProfileRequest) returns (Profile);
}

message GetProfileRequest { int64 user_id = 1; }

message Profile {
  int64  id     = 1;
  string name   = 2;
  string region = 3;
}
```

Der protobuf-Compiler generiert daraus PHP-Klassen, und die Runtime wird
mit Composer installiert:

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

Jetzt hat das Projekt `Profile\GetProfileRequest` und `Profile\Profile`:
typisierte Getter, Setter, Serialisierung. Und protoc wird genau
dieselben Klassen für einen Client in Go, Java oder Python generieren.
Das ist der ganze Sinn: ein Vertrag, beliebige Sprachen.

## Nachrichten statt Bodies

Wie unterscheidet sich ein gRPC-Handler von einem HTTP-Handler? In der
Kommunikationseinheit. Dort hatten wir einen "Request-Body" und einen
"Response-Body", von jedem einen. Hier ist es ein Strom von Nachrichten
in jeder Richtung: `readMessage()` gibt die Bytes der nächsten
eingehenden zurück oder `null` am Ende, und `writeMessage()` sendet eine
ausgehende. Der Server ist verantwortlich für das gRPC-Framing, die
Längen und die Flags. Die generierten Klassen sind verantwortlich für
den Inhalt:

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // der Anfragepfad benennt die Vertragsmethode
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // Bytes -> Objekt

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // Objekt -> Bytes
});
```

Das Routing ist hier einfach der Pfad: Package, Service, Methode. Ein
Client in einer beliebigen Sprache, der `GetProfile` aufruft, sendet ein
POST an `/profile.ProfileService/GetProfile`. Und der Handler selbst
lebt neben den REST-Routen und sieht denselben aufgewärmten Pool und
Anfragekontext.

Alle vier Formen von gRPC ergeben sich aus derselben API und
unterscheiden sich nur in der Anzahl der Aufrufe:

```php
// Unary: eine Nachricht hin, eine zurück
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server-Streaming: eine hin, viele zurück
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Voll-Duplex: Lesen und Antworten verschränkt
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` legt die Coroutine bis zur nächsten Nachricht schlafen,
und `writeMessage()` antwortet sofort, ohne auf das Ende des
eingehenden Stroms zu warten. Dasselbe Duplex wie bei WebSocket, nur mit
einem Vertrag und nach Standard.

## Fehler übergeben

gRPC hat sein eigenes System von Fehlercodes, und es lebt an einer
Stelle, die anfangs verwirrend ist. Der HTTP-Status der Antwort ist
immer 200. Immer. Das echte Ergebnis reist in den Trailern, Headern, die
HTTP/2 nach dem Body sendet. Wir haben sie im Streaming-Kapitel kurz
gesehen, und hier ist ihr Hauptabnehmer:

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // ein sauberes return: der Server hängt selbst grpc-status: 0 (OK) an
});
```

Auch Abstürze werden behandelt: Eine Ausnahme, die aus dem Handler
fliegt, wird zu `grpc-status: 13` (INTERNAL), statt zu einer getrennten
Verbindung.

## Deadlines

Erinnerst du dich, wie viele Kapitel der ersten Serie wir mit der Idee
verbracht haben, dass "jedes Warten eine Grenze haben muss"? Nun, in
gRPC ist diese Idee zu einem Protokollstandard erhoben. Der Client
übergibt seine Deadline direkt in der Anfrage, über den
`grpc-timeout`-Header, und der Server reicht sie an den Handler weiter:

```php
$deadline = $req->getGrpcTimeout(); // Millisekunden oder null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

Denk darüber nach, wie richtig diese Mechanik ist. Dem Client bleiben
zweihundert Millisekunden Geduld? Dann hat es keinen Sinn, mit einem
Zwei-Sekunden-Timeout zu `GeoDirectory` zu gehen. Die Deadline wird
durch alle internen Wartezeiten gefädelt, durch alle Dienste in der
Kette, und das ganze System respektiert die Geduld des allerersten
Aufrufers.

## Das Ende der zweiten Serie

Das ist die ganze Route. Schauen wir einmal zurück.

Die fünfzehn Kapitel der ersten Serie bauten ein Vokabular auf:
Coroutinen, Abbruch, `Future`, Kanäle, Scope, Gruppen, Pools, Threads,
Kontext. Ehrlich gesagt, stellenweise mochte es sich anfühlen, als wäre
das Vokabular übertrieben. Und dann kam die zweite Serie, und es stellte
sich heraus, dass der Server nur ein Satz ist, aus genau diesen Wörtern
zusammengesetzt. Jede Anfrage ist eine Coroutine. Der Pool schützt die
Datenbank. Scope räumt nach der Anfrage auf. Backpressure hält die
Überlast in Schach. Threads belegen die Kerne. Und obendrauf: statische
Inhalte, SSE, WebSocket und gRPC auf einem Port.

Beachte auch, was in keiner der beiden Serien vorkam: Callbacks,
`.then()`-Ketten, die Schlüsselwörter `async` und `await` in jeder
zweiten Zeile, manuelle Verwaltung der Event-Loop. Der ganze Code ist
gewöhnliches sequentielles PHP. Er hat nur aufgehört, auf nichts zu
warten.

Von hier an bist du auf dich gestellt. Nimm den Dienst, der schon lange
nach einer Überarbeitung verlangt, und beginne mit einem einzigen
Handler. Die Klassenreferenz ist in der
[Server-Dokumentation](/de/docs/server/index.html), und die Interna sind
in der [Architektur](/de/architecture/server.html). Und wenn sich etwas
anders verhält, als diese Kapitel versprochen haben, weißt du jetzt
genug, um einen guten Bug-Report einzureichen.
