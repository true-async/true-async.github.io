---
layout: docs
lang: de
path_key: "/docs/components/introduction.html"
nav_active: docs
permalink: /de/docs/components/introduction.html
page_title: "Warum Asynchronitaet?"
description: "Was ist Asynchronitaet und warum braucht man sie?"
---

## Wie traditionelles PHP (FPM) funktioniert

![FPM-Modell](../../../assets/docs/fpm_model.jpg)

Wenn eine PHP-Serveranwendung ein Restaurant waere, wuerde sie wahrscheinlich als ein Elite-Etablissement gelten,
in dem jeder Tisch von einem eigenen Kellner bedient wird.

Jede neue Anfrage an den Server wird von einer separaten PHP-VM, einem Prozess oder Thread bearbeitet,
danach wird der Zustand zerstoert.
Das ist so, als wuerde ein Kellner einen Tisch bedienen und dann entlassen oder sein Gedaechtnis geloescht.

Dieses Modell hat einen Vorteil: Wenn ein PHP-Fehler auftritt, ein Speicherleck,
eine vergessene Datenbankverbindung -- es beeinflusst andere Anfragen nicht. Jede Anfrage ist isoliert.
Das bedeutet, die Entwicklung ist einfacher, das Debugging ist einfacher und es gibt eine hohe Fehlertoleranz.

In den letzten Jahren hat die PHP-Community versucht, ein zustandsbehaftetes Modell einzufuehren,
bei dem eine einzelne PHP-VM mehrere Anfragen bedienen kann und den Zustand zwischen ihnen bewahrt.
Zum Beispiel erreicht das Laravel Octane-Projekt, das Swoole oder RoadRunner verwendet, eine bessere Leistung,
indem es den Zustand zwischen Anfragen bewahrt.
Aber das ist bei weitem nicht die Grenze des Moeglichen.

Einen Kellner nach jeder Bestellung zu entlassen ist zu teuer.
Da Gerichte langsam in der Kueche zubereitet werden, verbringt der Kellner die meiste Zeit mit Warten.
Das Gleiche passiert mit PHP-FPM: Die PHP-VM sitzt untaetig herum.
Es gibt mehr Kontextwechsel,
mehr Overhead fuer das Erstellen und Zerstoeren von Prozessen oder Threads,
und mehr Ressourcenverbrauch.

```php
// Traditionelles PHP-FPM
$user = file_get_contents('https://api/user/123');     // stehen und warten 300ms
$orders = $db->query('SELECT * FROM orders');          // stehen und warten 150ms
$balance = file_get_contents('https://api/balance');   // stehen und warten 200ms

// Verbraucht: 650ms reines Warten
// CPU ist untaetig. Speicher ist untaetig. Alles wartet.
```

## Nebenlaeufigkeit

![Nebenlaeufigkeitsmodell](../../../assets/docs/concurrency_model.jpg)

Da die Kueche Gerichte nicht sofort zubereiten kann
und der Kellner Leerlaufzeiten zwischen den Zubereitungen hat,
gibt es die Moeglichkeit, Bestellungen von mehreren Kunden zu bearbeiten.

Dieses Schema kann ziemlich flexibel funktionieren:
Tisch 1 bestellte drei Gerichte.
Tisch 2 bestellte zwei Gerichte.
Der Kellner bringt das erste Gericht zu Tisch 1, dann das erste Gericht zu Tisch 2.
Oder vielleicht hat er es geschafft, zwei Gerichte zum ersten Tisch und eines zum zweiten zu bringen. Oder umgekehrt!

Das ist Nebenlaeufigkeit: Die gemeinsame Nutzung einer einzelnen Ressource (`CPU`) zwischen verschiedenen logischen Ausfuehrungsstroemen,
die Koroutinen genannt werden.

```php
use function Async\spawn;
use function Async\await;

// Alle drei Anfragen "nebenlaeufig" starten
$userTask = spawn(file_get_contents(...), 'https://api/user/123');
$ordersTask = spawn($db->query(...), 'SELECT * FROM orders');
$balanceTask = spawn(file_get_contents(...), 'https://api/balance');

// Waehrend eine Anfrage auf eine Antwort wartet, erledigen wir andere!
$user = await($userTask);
$orders = await($ordersTask);
$balance = await($balanceTask);

// Verbraucht: 300ms (die Zeit der langsamsten Anfrage)
```

## Nebenlaeufigkeit ist nicht Parallelitaet

Es ist wichtig, den Unterschied zu verstehen.

**Nebenlaeufigkeit** -- wie in `True Async`, `JavaScript`, `Python`:
- Ein Kellner wechselt schnell zwischen Tischen
- Ein PHP-Thread wechselt zwischen Aufgaben
- Aufgaben werden **verschachtelt**, werden aber nicht gleichzeitig ausgefuehrt
- Keine Race Conditions -- nur eine Koroutine laeuft zu jedem Zeitpunkt

**Parallelitaet** -- das ist Multithreading (`Go`):
- Mehrere Kellner arbeiten gleichzeitig
- Mehrere Threads werden auf verschiedenen CPU-Kernen ausgefuehrt
- Aufgaben werden **wirklich gleichzeitig** ausgefuehrt
- Mutexe, Locks, all dieser Schmerz ist erforderlich

## Was kommt als Naechstes?

Jetzt verstehen Sie das Wesentliche. Sie koennen tiefer eintauchen:

- [Effizienz](../evidence/concurrency-efficiency.md) -- wie viele Koroutinen fuer maximale Leistung benoetigt werden
- [Evidenzbasis](../evidence/coroutines-evidence.md) -- Messungen, Benchmarks und Forschung, die die Effektivitaet von Koroutinen bestaetigen
- [Swoole in der Praxis](../evidence/swoole-evidence.md) -- echte Messungen: Appwrite +91%, IdleMMO 35M req/Tag, Benchmarks mit DB
- [Python asyncio in der Praxis](../evidence/python-evidence.md) -- Duolingo +40%, Super.com -90% Kosten, Instagram, uvloop Benchmarks
- [Koroutinen](coroutines.md) -- wie sie unter der Haube funktionieren
- [Scope](scope.md) -- wie man Gruppen von Koroutinen verwaltet
- [Scheduler](scheduler.md) -- wer entscheidet, welche Koroutine ausgefuehrt wird
