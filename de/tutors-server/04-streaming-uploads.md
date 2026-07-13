---
layout: tutorial
lang: de
path_key: "/tutors-server/04-streaming-uploads.html"
nav_active: docs
permalink: /de/tutors-server/04-streaming-uploads.html
page_title: "Byte-Streams"
description: "send() und sendable(), den Body streamen, Datei-Uploads und sendFile()."
---

# Byte-Streams

Bisher waren unsere Antworten klein und ganzheitlich, gebaut mit
`setBody()` und `json()`. Für eine API ist das genau das, was man will.

Aber `ProfileService` hat Aufgaben eines anderen Kalibers aufgenommen.
Die Buchhaltung will einen Jahresexport, und das sind Hunderte von
Megabyte `CSV`. Benutzer laden Import-Dateien hoch, und die sind auch
nicht klein. Rechnen wir grob: fünfzig nebenläufige Anfragen, jede hält
hundert Megabyte im Speicher... nein, rechnen wir nicht weiter, es ist
schon klar, wie das endet.

Wir müssen lernen, mit Bodies in Teilen zu arbeiten. In beide
Richtungen.

## Die Antwort in Teilen: send()

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->setStatusCode(200)
        ->setHeader('Content-Type', 'text/csv');

    foreach (exportRows() as $row) {
        $res->send(implode(',', $row) . "\n");
    }
});
```

Das erste `send()` fixiert Status und Header, danach gehen die Chunks
zum Client, sobald sie fertig sind: chunked bei HTTP/1.1, DATA-Frames
bei HTTP/2. Zu jedem Zeitpunkt lebt eine einzige Zeile im Speicher. Ein
Byte-Strom zum Client nimmt Gestalt an!

Jetzt eine Frage, um deinen Verstand zu testen. Wir erzeugen Zeilen aus
der Datenbank mit, sagen wir, einem Gigabit pro Sekunde. Und der Client
lädt über mobiles Internet in einem Zug herunter. Wohin gehen die
überzähligen Zeilen?

Wenn du das Kapitel über Kanäle gelesen hast, hast du die Antwort
bereits: Backpressure. Wenn der Stream-Puffer sich füllt, suspendiert
`send()` die Handler-Koroutine. Der Client hat die Warteschlange
geleert, die Koroutine ist aufgewacht, die Erzeugung ging weiter. Der
Export stimmt sich selbst auf die Geschwindigkeit des schmalsten
Engpasses ab, und wohlgemerkt, wir haben dafür keine einzige Zeile
geschrieben!

Auf einen langsamen Client zu warten ist allerdings nicht immer das,
was man will:

```php
if (!$res->sendable()) {
    // send() würde gerade jetzt blockieren. Sagen wir, dass wir nicht warten.
}
```

`send()` ist immer sicher. `sendable()` warnt dich nur: Der nächste
Aufruf wird einschlafen. Was du dann tust, liegt bei dir.

> Es gibt noch eine beliebte Art von Angriff mit langsamen Clients: Sie
> öffnen eine Verbindung und lesen nicht, bis der Server blockiert.
> Für einen Koroutinen-Server ist das weniger beängstigend, da jede
> Koroutine weit weniger kostet als ein Prozess oder ein Thread.
> Dennoch ist das globale Koroutinen-Limit ein wichtiger Parameter,
> ebenso wie die anderen zusätzlichen Sicherheitsoptionen!
>

## Der Anfrage-Body in Teilen: readBody()

Die umgekehrte Situation. Ein Benutzer lädt eine Gigabyte-CSV hoch, und
standardmäßig wird der Handler aufgerufen, sobald der gesamte Body
gelesen wurde. Das Wort "Gigabyte" und die Worte "in den Speicher" in
einem Satz sind genau das, was wir zu vermeiden vereinbart haben.

Wir schalten den Streaming-Modus ein:

```php
$config->setBodyStreamingEnabled(true);
```

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $file = fopen('/var/imports/' . bin2hex(random_bytes(8)) . '.csv', 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($file, $chunk);
        $total += strlen($chunk);
    }

    fclose($file);
    $res->json(['received' => $total]);
});
```

Im `TrueAsync`-Server startet der Handler gleich nach den Headern, früh
genug. Tatsächlich geschieht die Arbeit der Koroutine genau im
Gleichschritt mit dem Empfang der Daten aus dem Socket. Deshalb passt
das Arbeiten mit dem Datenstrom hier ganz natürlich.

Wenn du fünfzig nebenläufige Uploads zu je 20 MiB laufen lässt, wäre
der Speicherhöchststand 1170 MiB gewesen und wurde zu 197. Der
Durchsatz wuchs fast auf das Dreifache, weil die Verarbeitung beginnt,
ohne auf das Ende des Uploads zu warten. Nicht schlecht für eine Zeile
Konfiguration.

## Formulare mit Dateien: UploadedFile

Das klassische HTML-Formular mit einer Datei ist der einfachere Fall,
und dafür musst du nichts einschalten. Multipart wird immer als Stream
geparst, und der Handler erhält fertige Objekte:

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $csv = $req->getFile('import');

    if ($csv === null || !$csv->isValid()) {
        throw new HttpException('File is required', 422);
    }

    $csv->moveTo('/var/imports/' . $csv->getClientFilename());
    $res->json(['size' => $csv->getSize()]);
});
```

Wer PSR-7 gesehen hat, fühlt sich zu Hause: `moveTo()`, `getSize()`,
`getClientFilename()`. Mehrere Dateien in einem Feld (`photos[]`)
kommen als Array über `getFiles()`.

## Dateien ausliefern: sendFile()

Bleibt das Ausliefern fertiger Dateien. Das ist die eine Sache, die du
nicht von Hand aus `fopen` und `send()` zusammenbauen solltest, und hier
ist der Grund:

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->sendFile('/var/reports/2026-06.csv', new SendFileOptions(
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: 'report-june.csv',
        cacheControl: 'private, max-age=3600',
    ));
});
```

Hinter diesem einen Aufruf verbergen sich rund dreißig Jahre
HTTP-Geschichte. `Content-Type` aus der Erweiterung. `ETag` und
`Last-Modified`, damit eine wiederholte Anfrage mit einem kurzen 304
davonkommt. Fortgesetzte Downloads über `Range`, wenn der Client
mittendrin abgebrochen ist. Das Ausliefern eines vorkomprimierten
Nachbarn (`report.csv.gz`), wenn der Client gzip versteht. Und all das
mit asynchronen Lesevorgängen von der Festplatte, ohne die
Ereignisschleife aufzuhalten. Das von Hand zu schreiben bedeutet,
mindestens die Hälfte davon zu vergessen.

Eine Regel: Nach `sendFile()` ist die Antwort versiegelt. Noch etwas
hineinzuschreiben funktioniert nicht, du bekommst eine Exception.

Wir können jetzt sowohl eine Gigabyte-Datei annehmen als auch
ausliefern. Aber beachte, wem wir all das über einen PHP-Handler
ausliefern: Berichte, die durch Zugriffsrechte geschützt sind, Dateien
hinter Einmal-Links. Und CSS? Und das Logo? Sie sind für alle gleich,
und für jede von ihnen eine Koroutine hochzufahren fühlt sich ein wenig
umständlich an. Das ist das nächste Kapitel, und es wird kurz.
