---
layout: tutorial
lang: de
path_key: "/tutors-laravel/05-third-party.html"
nav_active: docs
permalink: /de/tutors-laravel/05-third-party.html
page_title: "Pakete von Drittanbietern"
description: "Debugbar, Telescope, Inertia, spatie/permission, Socialite: was bereits für Coroutinen angepasst ist und was es wert ist, deaktiviert zu werden."
---

# Pakete von Drittanbietern

Wir haben Laravels Kern und deinen eigenen Code abgedeckt. Aber die
Abhängigkeitsliste eines echten Projekts hört dort nicht auf: `Debugbar`
in der Entwicklung, `Telescope` für Logs, `Inertia` für das Frontend,
`spatie/laravel-permission` für Rollen. Jedes davon wurde lange bevor
sich jemand Hunderte nebenläufige Anfragen innerhalb eines einzigen
Prozesses vorstellte geschrieben, und jedes davon hat seinen eigenen
Singleton, der Zustand trägt. Die gute Nachricht: für die gängigsten
Pakete ist diese Arbeit bereits erledigt. Die schlechte Nachricht: nicht
für alle, und es ist wichtig, das eine vom anderen unterscheiden zu
können.

## Bereits angepasst

**`spatie/laravel-permission`.** `PermissionRegistrar` hält die aktuelle
`team ID` und einen Wildcard-Berechtigungsindex in seinen eigenen
Eigenschaften, genau das Muster, das im Kapitel über unsichere Muster
behandelt wurde. `AsyncPermissionRegistrar` verschiebt beides in
`current_context()`:

```php
class AsyncPermissionRegistrar extends PermissionRegistrar
{
    public function setPermissionsTeamId(int|string|Model|null $id): void
    {
        current_context()->set(self::CTX_TEAM_ID, $id, replace: true);
    }

    public function getPermissionsTeamId(): int|string|null
    {
        return current_context()->find(self::CTX_TEAM_ID);
    }

    // clearPermissionsCollection() wird zum No-Op: die Berechtigungsliste
    // selbst ist nach dem Laden nur lesbar und wird sicher zwischen
    // Anfragen geteilt.
}
```

An deinem eigenen Code ändert sich nichts: `Auth::user()->can(...)`,
`setPermissionsTeamId()` in Middleware, alles funktioniert genau so, wie
es die Dokumentation des Pakets beschreibt.

**`inertiajs/inertia-laravel`.** `AsyncResponseFactory` verschiebt
`sharedProps`, `rootView`, `version` und `encryptHistory`, alles, was
sich früher auf den Eigenschaften des `ResponseFactory`-Singletons
angesammelt hätte und über das Ende einer Anfrage hinaus in die nächste
überlebt hätte, in den Kontext.

**`barryvdh/laravel-debugbar`.** Die Lösung hier ist etwas
differenzierter. `Debugbar` sammelt Daten über die gesamte Anfrage
hinweg: SQL-Abfragen, Nachrichten, Timings, ein klassischer
akkumulierender Collector, der in sich selbst für den gesamten
Bearbeitungszyklus schreibt, einschließlich Pausen bei `await`.
`AsyncDebugbar` löst keine neue Instanz pro Anfrage auf (das würde
einmalige Event-Subscriptions zerstören), es behält eine `Debugbar` pro
Worker, macht aber die Collectors selbst kontextbewusst:

```php
class AsyncDebugbar extends LaravelDebugbar
{
    public function __construct(Application $app, Request $request)
    {
        parent::__construct($app, $request);

        // Diese sammeln über jede I/O-Pause der Anfrage hinweg Daten,
        // der Speicher muss also pro Coroutine liegen, nicht pro Instanz.
        $this->messagesCollector   = new AsyncMessagesCollector();
        $this->timeCollector       = new AsyncTimeDataCollector(...);
        $this->exceptionsCollector = new AsyncExceptionsCollector();
    }
}
```

Der Unterschied zu `ScopedServiceProxy` aus dem ersten Kapitel ist
wichtig: dort wurde der gesamte Dienst pro Anfrage neu aufgelöst; hier
bleibt der Dienst eine einzige Instanz (er ist teuer neu zu erstellen:
Event-Subscriptions, Konfiguration), und nur die konkreten akkumulierenden
Collectors darin werden kontextbewusst. Dieselbe Diagnose wie im Kapitel
über unsichere Muster ("schreibe nicht in Zustand, der zwischen Anfragen
geteilt wird"), nur eine Heilung, die auf die besondere Anatomie dieses
Pakets zugeschnitten ist.

**`laravel/telescope`.** Ähnlich: `entriesQueue`, `updatesQueue` und das
`shouldRecord`-Flag wandern über einen `CoroutineSafeRecording`-Trait in
den Kontext, und die Entscheidung, ob eine bestimmte Anfrage protokolliert
wird, wird pro Coroutine getroffen.

**`laravel/socialite`.** Hier ist es einfacher: `SocialiteManager` cached
Treiber zusammen mit der Konfiguration derjenigen Anfrage, die sie
zuerst erreicht hat. Die Lösung ist kein Adapter, sondern ein
`scopedSingleton`, dasselbe "Ansatz eins" aus dem ersten Kapitel: ein
frischer Manager pro Anfrage, überhaupt kein Kontext nötig.

## Sicher ohne Anpassung

`Cache`, `Queue`, `Mail`, `Log`, `Validation`, `Filesystem`, `HTTP
Client`, `Notifications`, `Encryption`, `Hashing`, `Pagination`,
`Sanctum`, `Passport`, `Scout`, `Cashier`, `Horizon`, diese haben
ebenfalls Singletons, aber was sie halten, ist Konfiguration und Clients,
nicht Daten pro Anfrage. `CacheManager` cached das `Redis`-Client-Objekt,
nicht die Werte, die du hineinsteckst; `MailManager` cached den
konfigurierten `Mailer`, nicht die E-Mails. Dieselbe Frage wie im Kapitel
über unsichere Muster: überlebt der Zustand das Ende einer Anfrage, ohne
dabei falsch zu werden? Hier ist die Antwort ja, weil der Zustand
Verbindungskonfiguration ist, nicht die Daten eines Benutzers.

## Inkompatibel: abschalten

**`livewire/livewire`.** Hier lohnt es sich, innezuhalten und den bisherigen
Optimismus nicht weiterzutragen. `LivewireManager` sammelt Zustand pro
Anfrage tief in sich selbst an, und `wire:stream` baut auf Annahmen über
eine gepufferte, einmalige Antwort auf, die das nebenläufige
Coroutine-Modell selbst durchbricht. Es stückweise anzupassen hat nicht
funktioniert, weder für `laravel-spawn` noch zuvor für `Laravel Octane`.
Die einzige Empfehlung, die tatsächlich standhält, ist, `Livewire` im
Async-Modus überhaupt nicht zu aktivieren. Für interaktive Oberflächen
auf diesem Stack verwende `Inertia`, es ist bereits angepasst und oben
behandelt. `Filament`, das auf `Livewire` aufbaut, erbt dieselbe
Einschränkung.

## Über dein eigenes Paket entscheiden

Wenn das Paket, das du brauchst, auf keiner der beiden Listen steht, ist
die Frage dieselbe wie im vorherigen Kapitel, nur diesmal auf den Code
eines anderen gerichtet: hält der Singleton des Pakets veränderlichen
Zustand, der nur für eine Anfrage korrekt sein soll? Wenn ja, gibt es
drei Wege, und sie sind nicht gleichwertig.

Der schnellste ist `scoped_services` in der Konfiguration, "Ansatz eins":
das Paket wird bei jeder Anfrage frisch aufgelöst, und sein eigener Code
bleibt unangetastet.

```php
// config/async.php
'scoped_services' => [
    \SomePackage\Manager::class,
],
```

Wenn eine Neuerstellung teuer ist (das Paket ist aufwendig zu
initialisieren, oder es cached selbst etwas Nützliches über Anfragen
hinweg), schreibe einen gezielten Adapter nach dem Muster von
`AsyncPermissionRegistrar` oder `AsyncDebugbar` aus diesem Kapitel:
leite eine Unterklasse ab, füge ein `bootCompleted()` hinzu, verschiebe
nur das, was sich tatsächlich von Anfrage zu Anfrage ändert, in
`current_context()`, lass den Rest wie er ist.

Und wenn es kein eigenständiger Dienst ist, sondern ein tief
verwurzeltes Muster wie `Livewire`, verbring keine Woche damit, es
anzupassen, nur um eine Woche später festzustellen, dass `wire:stream`
aus architektonischen Gründen kaputt ist. Lass die
`MutableStaticPropertyRule` aus dem vorherigen Kapitel gegen den
Quellcode des Pakets laufen: wenn die Treffer in die Dutzende gehen und
den eigentlichen Kern des Pakets treffen statt sicherer Caches zur
Startzeit, ist das ein Signal, es aus dem Async-Modus auszuschließen,
nicht es zu reparieren.

Wir haben deinen eigenen Code, Laravels Kern und sein umgebendes
Ökosystem abgedeckt. Was bleibt, ist ein Blick auf die Zahlen: um wie
viel schneller wird eine Anwendung tatsächlich, sobald all das an Ort
und Stelle ist.
