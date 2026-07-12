---
layout: tutorial
lang: de
path_key: "/tutors-laravel/04-unsafe-patterns.html"
nav_active: docs
permalink: /de/tutors-laravel/04-unsafe-patterns.html
page_title: "Was du innerhalb einer Coroutine nicht tun darfst"
description: "Veränderliche statische Eigenschaften, once() auf einem Singleton und Number::useLocale(): die üblichen Wege, wie Zustand zwischen Anfragen ausläuft, und wie man sie mit statischer Analyse findet."
---

# Was du innerhalb einer Coroutine nicht tun darfst

Die vorherigen Kapitel haben konkrete Zustandslecks behoben: `auth`/
`session` über Kontext, den Transaktionszähler über einen Trait.
`laravel-spawn` hat diese Löcher für dich geschlossen. Aber das Framework
ist groß, Pakete von Drittanbietern sind noch zahlreicher, und morgen
schreibt jemand in deinem Team seinen eigenen Dienst. Was du brauchst,
ist eine Regel, die du auf den ersten Blick anwenden kannst, um Code, der
sicher für nebenläufige Coroutinen ist, von Code zu unterscheiden, der
eines Tages einem Benutzer die Daten eines anderen gibt.

## Eine Regel: nach dem Start nicht in static schreiben

Jedes Beispiel unten ist ein Spezialfall desselben Fehlers: irgendetwas
schreibt einen Wert in Speicher, der von jeder Coroutine im Prozess
geteilt wird, und dieser Wert gehört zu einer bestimmten Anfrage.

**Eine veränderliche statische Eigenschaft auf einem Dienst.**

```php
// Gefährlich
class PriceCalculator
{
    private static array $cache = [];

    public function forProduct(int $id): float
    {
        return self::$cache[$id] ??= $this->computeExpensive($id);
    }
}
```

Es sieht wie eine harmlose Memoisierung aus. In Wirklichkeit ist es ein
Array, das von jeder Coroutine geteilt wird. Wenn `computeExpensive()`
von irgendetwas abhängt, das sich zwischen Anfragen ändert, der Währung
eines Benutzers, einem regionalen Aufschlag, entscheidet die erste
Anfrage über das Schicksal des Caches für jede nachfolgende Anfrage. Die
Lösung ist einfach: eine Instanz-Eigenschaft statt `static`, wobei der
Dienst pro Anfrage aufgelöst wird ("Ansatz eins" aus dem ersten Kapitel).

**Was, wenn der Dienst dein eigener ist und du absichtlich Zustand pro
Anfrage brauchst?** Du musst nicht darauf warten, dass `laravel-spawn`
einen `ScopedService` und einen Proxy dafür bereitstellt, es ist derselbe
Trick, der das Transaktionszähler-Problem im zweiten Kapitel gelöst hat,
nur eine Ebene höher: nicht `coroutine_context()` für eine einzelne
Coroutine, sondern `request_context()`, geteilt über den gesamten
Coroutine-Baum einer Anfrage.

```php
class PriceCalculator  // bleibt ein Singleton
{
    private const CTX_CACHE = 'price.cache';

    public function forProduct(int $id): float
    {
        $cache = request_context()->find(self::CTX_CACHE) ?? [];

        return $cache[$id] ??= $this->computeExpensive($id, $cache);
    }
}
```

Der Unterschied zum vorherigen Beispiel wirkt klein, ist aber
grundlegend: das Array lebt nicht mehr auf einer klassenweiten `static`-
Eigenschaft, die vom gesamten Prozess geteilt wird, es lebt im
Scope-Kontext einer bestimmten Anfrage. Zwei nebenläufige Anfragen rufen
dieselbe `PriceCalculator`-Instanz auf, doch jede bekommt ihren eigenen
`$cache`, weil `request_context()` für jede von ihnen einen anderen
Scope auflöst. Eine ausführliche Betrachtung von `coroutine_context()`
und `request_context()` findet sich im
[zweiten Kapitel](/de/tutors-laravel/02-pool-transactions.html).

**`once()` auf einem Singleton.**

```php
// Gefährlich
class CurrentUserService  // als Singleton registriert
{
    public function get()
    {
        return once(fn() => Auth::user());  // cached den ERSTEN Benutzer, für immer
    }
}
```

`once()` cached das Ergebnis der Closure in einer `WeakMap`, die nach
dem Objekt indiziert ist, zu dem der Aufruf gehört. Bei einem Singleton
ist dieses Objekt eines für den gesamten Prozess, also ist auch der
Cache einer. Die erste Anfrage berechnet den Benutzer, jede folgende
Anfrage bekommt denselben. Bei Objekten pro Anfrage (Controller,
`Eloquent`-Models) ist `once()` vollkommen sicher, weil das Objekt selbst
dort bei jeder Anfrage frisch ist.

**Eine globale Mutation wie `Number::useLocale()`.**

```php
// Gefährlich
Number::useLocale('de');
$price = Number::format(1234.5);       // was, wenn die Coroutine vor dieser Zeile einschläft?

// Sicher
$price = Number::format(1234.5, locale: 'de');
```

`useLocale()` ändert eine statische Variable auf der `Number`-Klasse.
Zwischen dem Aufruf von `useLocale()` und `format()` kann ein `await`,
ein `delay()`, jeder Ausflug zur Datenbank passieren, mit anderen Worten
ein Punkt, an dem der Scheduler die Kontrolle an eine andere Coroutine
übergibt. Ruft diese Coroutine ebenfalls `Number::format()` ohne
explizites Locale auf, bekommt sie, welches Locale auch immer gerade
jemand anders gesetzt hat. Der explizite `locale:`-Parameter beseitigt
die Möglichkeit eines Wettlaufs vollständig: es gibt nichts zu schützen,
weil es nichts zu teilen gibt.

**Superglobals.** `$_GET`, `$_POST`, `$_SERVER`, `$_SESSION` waren unter
PHP-FPM sicher, einfach weil sie für eine Anfrage lebten. In einem
Coroutine-Worker sind sie Variablen, die vom gesamten Prozess geteilt
werden, und der Server aktualisiert sie, nicht PHP bei jeder neuen
Verbindung, wie du es gewohnt bist. Verwende das `Request`-Objekt, das
`laravel-spawn` bereits über `current_context()` isoliert, und lass die
Superglobals in Ruhe.

## Wann static tatsächlich sicher ist

Genauso wichtig ist es, nicht ins andere Extrem zu verfallen und jedes
`static` zum Verbrechen zu erklären. Diese sind sicher:

- **`readonly static`**, wenn sich ein Wert nach der Initialisierung nie
  mehr ändert, ist es nicht gefährlicher, ihn zwischen Coroutinen zu
  teilen, als eine Konstante zu teilen.
- **Konfiguration zur Startzeit**, ein `static`, das einmal beim Start
  des Workers gesetzt und danach nur gelesen wird (Routen, kompilierte
  Templates, registrierte Makros).
- **Deterministische Caches**, wenn das Ergebnis nur von den
  Eingabeargumenten abhängt und nicht von der "aktuellen" Anfrage
  (etwa ist der `Str::camel()`-Cache für einen bestimmten String immer
  derselbe String), beschädigt ein Wettlauf um seine Befüllung keine
  Daten, schlimmstenfalls wird etwas zweimal berechnet.
- **Monotone Zähler ohne Semantik**, ein Auto-Increment-Alias wie ein
  interner Zähler für eindeutige SQL-Aliase: selbst wenn zwei Anfragen
  dieselbe Zahl greifen, führt die Kollision nicht zu falschen Daten,
  höchstens zu einem weniger hübschen Alias.

Der Unterschied ist immer derselbe: wird *ein berechnetes Ergebnis, das
nicht von der Anfrage abhängt* geteilt, oder *Zustand, der zu einer
bestimmten Anfrage gehört*? Das erste ist eine Optimierung. Das zweite
ist ein Leck.

## Statische Analyse statt sorgfältigem Lesen

Manuell jedes Drittanbieter-Paket auf der Suche nach `private static`
ohne `readonly` durchzuscrollen ist genau die Art von Arbeit, die man
gerne einem Linter überlässt. Das Paket liefert dafür eine gebaute
`PHPStan`-Regel:

```php
final class MutableStaticPropertyRule implements Rule
{
    public function getNodeType(): string
    {
        return Property::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (! $node->isStatic() || $node->isReadonly()) {
            return [];
        }

        // ... Meldung "potenzielles Zustandsleck zwischen Coroutinen"
    }
}
```

Die Regel ist so einfach, wie es nur geht: sie findet jede `static`-
Eigenschaft ohne den `readonly`-Modifikator und markiert sie. Es wird
jede Menge falsch-positive Treffer geben, genau die "sicheren" Fälle aus
dem vorherigen Abschnitt, aber das ist ein bewusster Kompromiss: ein
echtes Leck zu verpassen ist teurer, als einmal eine Liste von
Kandidaten manuell durchzugehen.

```bash
phpstan analyse app/ --configuration=phpstan.neon
phpstan analyse vendor/some/package/src --configuration=phpstan.neon
```

Lässt man die Regel gegen das Laravel-Framework selbst laufen, findet
man mehr als dreihundert Treffer. Die überwältigende Mehrheit sind genau
die sicheren `static`-Fälle aus dem vorherigen Abschnitt: kompilierte
`BladeCompiler`-Caches, Konfigurationsflags, die einmal in `boot()`
gesetzt werden, Resolver, die intern in ein bereits isoliertes
`$app['request']` greifen. Dreihundert Zeilen einmal durchzusortieren
ist eine Viertelstunde Arbeit. Auch nur eine zu verpassen und in der
Produktion auf ein Leck zu stoßen, bedeutet Stunden damit zu verbringen,
den Bugreport von jemand anderem zu debuggen, der lautet: "Ich sehe das
Profil eines anderen Benutzers."

## Fazit

Bevor du ein `static` (oder einen Singleton mit einer veränderlichen
Eigenschaft) in Code belässt, der innerhalb eines Anfrage-Handlers läuft,
stelle dir eine Frage: wird dieser Wert das Ende der aktuellen Anfrage
überleben und dabei für die nächste immer noch korrekt sein? Wenn ja,
ist er sicher. Wenn er eigentlich zusammen mit der Anfrage ablaufen
sollte, physisch aber im geteilten Prozessspeicher weiterlebt, ist er
ein Kandidat für `ScopedService`,
`request_context()`/`coroutine_context()` (siehe das
[zweite Kapitel](/de/tutors-laravel/02-pool-transactions.html)), oder
eine gewöhnliche Instanz-Eigenschaft, die pro Anfrage neu erstellt wird.

Wir haben deinen eigenen Code und das Standard-Laravel abgedeckt. Aber
ein echtes Projekt hat üblicherweise `spatie/laravel-permission`,
`Telescope`, `Inertia` und `Debugbar` direkt daneben laufen, jedes mit
seiner eigenen Geschichte veränderlichen Zustands. Welche davon bereits
angepasst sind und welche es wert sind, im Async-Modus deaktiviert zu
werden, ist das Thema des nächsten Kapitels.
