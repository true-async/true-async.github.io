---
layout: tutorial
lang: de
path_key: "/tutors/15-context.html"
nav_active: docs
permalink: /de/tutors/15-context.html
page_title: "Context"
description: "Context: wo man \"das aktuelle\" aufbewahrt, sobald globale Variablen nicht mehr funktionieren."
---

# Context

Klassisches PHP lebte sein ganzes Leben nach einer einfachen Regel: ein Prozess, eine Anfrage. Aus
dieser Regel wuchs eine ganze Kultur: globale Variablen, statische Eigenschaften, Singletons. Der
aktuelle Nutzer? Die statische Eigenschaft `Auth::$user`. Eine Request-ID fürs Logging? Eine
globale Variable. Es funktionierte tadellos, weil "das aktuelle" wirklich eine einzige Sache für
den ganzen Prozess war.

TrueAsync hat diese Regel abgeschafft. Nun leben Hunderte von Coroutinen bunt durcheinander in
einem einzigen Prozess und bedienen verschiedene Nutzer. Weise `Auth::$user` in einer Coroutine zu,
und die nächste, die aufwacht, liest ihn wieder aus, und du hast Glück, wenn es überhaupt dieselbe
Anfrage ist. Eine vertraute Geschichte: dasselbe geschah in Kapitel neun, als sich zehn Worker eine
einzige `PDO` teilten. Races ohne Threads, nur jetzt im globalen Zustand.

Stattdessen alles als Parameter übergeben? Ehrlich, aber gnadenlos: du müsstest einen
Autorisierungs-Token durch zwanzig Funktionssignaturen fädeln, obwohl nur eine davon ihn
tatsächlich braucht. Was du wirklich willst, ist ein Speicher, der nicht an den Prozess gebunden
ist, sondern an den logischen Ausführungsfaden. Und wir haben bereits eine Struktur, die für diese
Aufgabe taugt: Coroutinen und Scopes bilden bereits einen Baum.

## Speicher auf einem Baum

`Async\Context` ist ein Schlüssel-Wert-Speicher, der an einen Scope oder an eine Coroutine gebunden
ist. Der Context eines Scopes ist für alle seine Coroutinen verfügbar:

```php
use function Async\current_context;

// Middleware, Beginn der Anfrageverarbeitung
current_context()
    ->set('request_id', bin2hex(random_bytes(8)))
    ->set('user_id', $userId);
```

Und von dort aus, überall, in jeder Aufruftiefe, ohne einen einzigen zusätzlichen Parameter:

```php
function logInfo(string $message): void
{
    $requestId = current_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

Beachte `find`: es sucht den Schlüssel im aktuellen Context, und wenn es ihn nicht findet, klettert
es den Scope-Baum hinauf. Untergeordnete Scopes sehen automatisch die Daten ihrer Eltern, sodass
eine tief innerhalb eines Handlers gestartete Coroutine die `request_id` findet, die ganz am Anfang
der Anfrage gesetzt wurde. Es ist derselbe Mechanismus wie Gos `context.Context`, nur dass du ihn
nicht von Hand nachschlagen und herumreichen musst: der Baum ist bereits da.

Anfragen kommen sich nicht mehr in die Quere: jede hat ihren eigenen Scope und damit ihren eigenen
Context. Tausend nebenläufige Anfragen, tausend unabhängige `request_id`s, und keine einzige globale
Variable.

## Drei Ebenen

Context existiert auf drei Ebenen, von der weitesten zur engsten:

```php
use function Async\root_context;
use function Async\current_context;
use function Async\coroutine_context;

root_context();      // der gesamte Prozess: Konfiguration, von allen geteilt
current_context();   // der aktuelle Scope: Anfrage, Nutzer, Locale
coroutine_context(); // nur diese Coroutine: private Daten
```

`root_context` ist die legitime Heimat für alles, was früher zu Recht eine globale Variable war: der
Anwendungsname, die Einstellungen. Du sprichst ihn explizit an:
`root_context()->find('app_name')`. `coroutine_context` ist der entgegengesetzte Pol: seine Daten
sind für niemanden außer der Coroutine selbst sichtbar, nicht einmal für ihre Nachbarn im selben
Scope. Zwischen den beiden näht `find` die Scope-Ebenen zusammen: lokal nicht gefunden, frag die
Eltern.

Und noch ein angenehmes Detail:

```php
current_context()->set('user_id', 42);
current_context()->set('user_id', 7); // AsyncException: Schlüssel existiert bereits
```

Überschreiben ist verboten, es sei denn, du bittest ausdrücklich darum (`replace: true`). Der
Context schützt sich selbst vor genau der Krankheit der globalen Variablen, mit der dieses Kapitel
begonnen hat: dass jemand, irgendwo, still einen Wert überschreibt.

## Das Ende der Reise

Fünfzehn Kapitel ist es her, dass wir zwei Funktionen "auf einmal" gestartet und uns überrascht
gezeigt haben, dass sich ihre Ausgabe verschränkte. Seitdem hat sich ein ganzes System
herausgebildet, und jede Ebene davon hat ihre eigene Zuständigkeit:

- **Coroutinen, `spawn`, `await`** — die Einheit der Nebenläufigkeit und ein Versprechen auf ein
  Ergebnis.
- **Abbruch, Timeouts, Ausnahmen** — der Unterbrechungsvertrag: nichts läuft ewig, und nichts
  stirbt still.
- **`Future` und Channels** — Verbindungen: ein einzelnes Ergebnis und ein Strom von Werten mit
  Synchronisation.
- **`Scope`, `TaskGroup`, `TaskSet`, `iterate`** — Struktur: jede Coroutine hat einen Besitzer, und
  jede Gruppe hat eine Wartestrategie.
- **Pools** — Ressourcendisziplin: wenige Verbindungen, viele Coroutinen.
- **Threads** — Parallelität für Berechnungen, ohne gemeinsamen Speicher.
- **`Context`** — Daten, die an die Ausführung gebunden sind, nicht an den Prozess.

Beachte, was wir nie lernen mussten: Mutexe, Semaphore, Data Races, Callbacks oder das Einfärben
von Funktionen als async gegenüber sync. Der Code blieb gewöhnliches, sequentielles PHP, das
einfach aufhörte, untätig herumzusitzen.

Von hier aus zwei Wege. Für praktische Übung geht es zur [Dokumentation](/de/docs.html), wo jede
Komponente bis auf die letzte Schraube auseinandergenommen wird. Um zu verstehen, wie das alles
unter der Haube funktioniert, geht es zur [Architektur](/de/architecture.html). Oder am allerbesten,
nimm einfach dein langsamstes Skript und schau, was ein einziges `spawn` damit macht.
