---
layout: tutorial
lang: de
path_key: "/tutors-server/05-static.html"
nav_active: docs
permalink: /de/tutors-server/05-static.html
page_title: "Statische Dateien"
description: "StaticHandler: Dateien ohne PHP-Koroutine ausliefern, Caching und Sicherheitsrichtlinien."
---

# Statische Dateien

`ProfileService` hat ein Frontend bekommen. HTML, CSS, Skripte,
Avatare, das Übliche. Früher wurden sie von nginx ausgeliefert, aber
nginx haben wir im ersten Kapitel feierlich verabschiedet. Wer liefert
sie jetzt aus?

Der erste Impuls ist verständlich: einen Handler schreiben, der Dateien
per URL öffnet. Halt. Überlege, was das bedeutet: tausende Anfragen für
das Logo pro Tag, und für jede eine Koroutine, Eintritt in PHP,
`fopen`, Austritt. PHP tut hier nichts, wofür man PHP braucht.

Der Server löst das radikal. Eine statische Route wird vollständig in C
ausgeliefert. Eine Anfrage an sie betritt PHP überhaupt nicht:

```php
use TrueAsync\StaticHandler;

$server->addStaticHandler(
    new StaticHandler('/assets/', '/var/www/profile/public')
);
```

Ein URL-Präfix, ein Verzeichnis auf der Festplatte, fertig. `GET
/assets/css/app.css` verwandelt sich in einen asynchronen Lesevorgang
der Datei direkt in den Socket, durch libuv, an PHP vorbei. Die Handler
aus den vorherigen Kapiteln erhalten weiterhin alles andere. Es kann
mehrere Mounts geben, und Übereinstimmungen werden in
Registrierungsreihenfolge gesucht. Die gesamte HTTP-Etikette aus
`sendFile` ist auch hier: `Content-Type`, `ETag` mit 304, fortgesetzte
Downloads über `Range`.

## Ein Mount konfigurieren

`StaticHandler` wird mit einer Kette konfiguriert, bevor er an den
Server angehängt wird:

```php
$static = (new StaticHandler('/assets/', '/var/www/profile/public'))
    ->setCacheControl('public, max-age=86400')
    ->enablePrecompressed('br', 'zstd', 'gzip')
    ->hide('*.map', 'drafts/**')
    ->setOnMissing(StaticOnMissing::NEXT);

$server->addStaticHandler($static);
```

Gehen wir Zeile für Zeile durch.

**`setCacheControl`** — der Caching-Header auf jeder Antwort. Zusammen
mit dem standardmäßig aktiven `ETag` lädt der Browser eine Datei nur
dann erneut herunter, wenn sich die Datei tatsächlich geändert hat.

**`enablePrecompressed`** — mein Lieblingspunkt. Wenn `app.css.br` neben
`app.css` liegt, bekommt ein Client mit passendem `Accept-Encoding` die
fertige komprimierte Datei. Denk an die Wirtschaftlichkeit: Du
komprimierst einmal in der Frontend-Build-Phase, auf der teuersten und
hochwertigsten Stufe, und lieferst sie millionenfach aus, ohne einen
einzigen Zyklus für die Komprimierung auszugeben.

**`hide`** — Globs, die einen 404 erhalten, unabhängig davon, ob die
Datei existiert. Source-Maps und Entwürfe gehen nicht hinaus.

**`setOnMissing(NEXT)`** — das Schicksal von Anfragen, die eine Datei
verfehlen. Standardmäßig antwortet eine Fehlanfrage mit 404 direkt aus
C. `NEXT` reicht die Anfrage stattdessen weiter, an einen gewöhnlichen
PHP-Handler. Warum? SPA. Die Datei `/assets/app.js` wird von der
Festplatte ausgeliefert, während ein nicht existierendes
`/assets/whatever` in die Anwendung durchfällt, die mit ihrer eigenen
`index.html` antwortet.

Nach `addStaticHandler` ist das Objekt gesperrt: Der Server hat daraus
bereits seine Hot-Path-Strukturen gebaut. Ein Versuch, danach einen
Setter anzufassen, ist eine Exception.

## Standardmäßig sicher

Ein kleiner Exkurs. Dateien per URL auszuliefern ist historisch eines
der ergiebigsten Löcher in Webservern. `../../etc/passwd` in der
Adresszeile ist ein Trick, der älter ist als viele Leser dieses
Kapitels.

Deshalb ist die Richtlinie ab Werk paranoid. Anfragen mit `..`
bekommen einen 404. Pfade über Dateien mit einem führenden Punkt
bekommen einen 404: Weder `.env` noch `.git` gelangen nach außen,
selbst wenn sie versehentlich im Verzeichnis landen. Symbolische Links
werden überhaupt nicht dereferenziert: Die Datei muss physisch
innerhalb des Mount-Roots liegen, und kein Symlink kann sie
herausziehen.

All das lässt sich bewusst lockern (`setDotfilePolicy`,
`setSymlinkPolicy`), aber die Standardwerte sind so gewählt, dass die
Option "einstecken und vergessen" sicher ist.

## Wenn es viele Dateien gibt

Für heiße Mounts gibt es noch einen Hebel:

```php
$static->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

Der Cache merkt sich den aufgelösten Pfad, die Metadaten und die Header
der jüngsten Dateien und verkürzt den Syscall-Durchlauf bei wiederholten
Anfragen. Bei einem großen Verzeichnis oder einem
Netzwerk-Dateisystem ist das spürbar. Bei einer kleinen lokalen Seite
nicht, weshalb es standardmäßig ausgeschaltet ist.

Das ist das ganze Kapitel, ich hatte ein kurzes versprochen. Statisches
fliegt an PHP vorbei, und PHP macht mit seiner Arbeit weiter. Und jetzt,
da der Service ein Gesicht hat, ist es Zeit, ihn zum Leben zu erwecken.
Erinnerst du dich an den Fortschrittsbalken aus dem allerersten Kapitel
der ersten Serie, den, der im Terminal gezeichnet wurde? Er zieht gleich
in den Browser um. Und der Server selbst wird ihn zeichnen.
