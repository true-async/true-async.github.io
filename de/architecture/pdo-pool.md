---
layout: architecture
lang: de
path_key: "/architecture/pdo-pool.html"
nav_active: architecture
permalink: /de/architecture/pdo-pool.html
page_title: "PDO Pool Architektur"
description: "Internes Design des PDO Pool -- Komponenten, Verbindungslebenszyklus, Bindung an Koroutinen, Zugangsdatenverwaltung."
---

# PDO Pool Architektur

> Dieser Artikel beschreibt das interne Design des PDO Pool.
> Wenn Sie eine Nutzungsanleitung suchen, siehe [PDO Pool: Verbindungspool](/de/docs/components/pdo-pool.html).

## Zweistufige Architektur

PDO Pool besteht aus zwei Schichten:

**1. PDO-Kern (`pdo_pool.c`)** -- Logik fuer die Bindung von Verbindungen an Koroutinen,
Transaktionsverwaltung, Statement-Referenzzaehlung.

**2. Async Pool (`zend_async_pool_t`)** -- der universelle Ressourcenpool der Async-Erweiterung.
Verwaltet die Warteschlange freier Verbindungen, Limits und Healthchecks.
Er weiss nichts ueber PDO -- er arbeitet mit abstrakten `zval`-Werten.

Diese Trennung ermoeglicht die Verwendung desselben Pooling-Mechanismus
fuer beliebige Ressourcen, nicht nur Datenbanken.

## Komponentendiagramm

![PDO Pool -- Komponenten](/diagrams/de/architecture-pdo-pool/components.svg)

## Template-Verbindung

Beim Erstellen eines `PDO` mit einem Pool wird **keine** echte TCP-Verbindung geoeffnet.
Stattdessen wird ein **Template** erstellt -- ein `pdo_dbh_t`-Objekt, das
den DSN, Benutzernamen, das Passwort und eine Referenz auf den Treiber speichert. Alle echten Verbindungen werden spaeter
bei Bedarf basierend auf diesem Template erstellt.

Fuer das Template wird `db_handle_init_methods()` anstelle von `db_handle_factory()` aufgerufen.
Diese Methode setzt die Methodentabelle des Treibers (`dbh->methods`),
erstellt aber keine TCP-Verbindung und alloziert kein `driver_data`.

## Verbindungslebenszyklus

![Verbindungslebenszyklus im Pool](/diagrams/de/architecture-pdo-pool/lifecycle.svg)

## Erstellen einer Verbindung aus dem Pool (Sequenz)

![Erstellen einer Verbindung aus dem Pool](/diagrams/de/architecture-pdo-pool/connection-sequence.svg)

## Interne API

### pdo_pool.c -- Oeffentliche Funktionen

| Funktion                   | Zweck                                                          |
|----------------------------|----------------------------------------------------------------|
| `pdo_pool_create()`        | Erstellt einen Pool fuer `pdo_dbh_t` basierend auf Konstruktorattributen |
| `pdo_pool_destroy()`       | Gibt alle Verbindungen frei, schliesst den Pool, leert die Hashtabelle |
| `pdo_pool_acquire_conn()`  | Gibt eine Verbindung fuer die aktuelle Koroutine zurueck (Wiederverwendung oder Acquire) |
| `pdo_pool_peek_conn()`     | Gibt die gebundene Verbindung ohne Acquire zurueck (NULL wenn keine) |
| `pdo_pool_maybe_release()` | Gibt die Verbindung an den Pool zurueck, wenn keine Transaktion oder Statements |
| `pdo_pool_get_wrapper()`   | Gibt das `Async\Pool` PHP-Objekt fuer die `getPool()`-Methode zurueck |

### pdo_pool.c -- Interne Callbacks

| Callback                    | Wann aufgerufen                                               |
|-----------------------------|---------------------------------------------------------------|
| `pdo_pool_factory()`        | Pool benoetigt eine neue Verbindung (Acquire bei leerem Pool) |
| `pdo_pool_destructor()`     | Pool zerstoert eine Verbindung (beim Schliessen oder Eviction) |
| `pdo_pool_healthcheck()`    | Periodische Pruefung -- lebt die Verbindung noch?             |
| `pdo_pool_before_release()` | Vor der Rueckgabe an den Pool -- uncommitted Transaktionen zurueckrollen |
| `pdo_pool_free_conn()`      | Schliesst die Treiberverbindung, gibt Speicher frei           |

### Bindung an eine Koroutine

Verbindungen werden ueber eine `pool_connections`-Hashtabelle an Koroutinen gebunden,
wobei der Schluessel die Koroutinenkennung und der Wert ein Zeiger auf `pdo_dbh_t` ist.

Die Koroutinenkennung wird von der Funktion `pdo_pool_coro_key()` berechnet:
- Wenn die Koroutine ein PHP-Objekt ist -- wird `zend_object.handle` (sequentielles uint32_t) verwendet
- Fuer interne Koroutinen -- die Zeigeradresse verschoben um `ZEND_MM_ALIGNMENT_LOG2`

### Bereinigung bei Koroutinen-Abschluss

Wenn eine Verbindung an eine Koroutine gebunden wird, wird ein `pdo_pool_cleanup_callback`
ueber `coro->event.add_callback()` registriert. Wenn die Koroutine abschliesst (normal oder mit einem Fehler),
gibt der Callback die Verbindung automatisch an den Pool zurueck. Dies garantiert keine Verbindungslecks,
selbst bei unbehandelten Ausnahmen.

### Pinning: Verbindungssperrung

Eine Verbindung ist an eine Koroutine gepinnt und wird nicht an den Pool zurueckgegeben, wenn mindestens eine Bedingung erfuellt ist:

- `conn->in_txn == true` -- eine aktive Transaktion
- `conn->pool_slot_refcount > 0` -- es gibt aktive Statements (`PDOStatement`), die diese Verbindung verwenden

Der Refcount wird beim Erstellen eines Statements inkrementiert und beim Zerstoeren dekrementiert.
Wenn beide Bedingungen erfuellt sind, gibt `pdo_pool_maybe_release()` die Verbindung an den Pool zurueck.

## Zugangsdatenverwaltung in der Factory

Beim Erstellen einer neuen Verbindung **kopiert** `pdo_pool_factory()` die
DSN-, Benutzernamen- und Passwort-Strings vom Template ueber `estrdup()`. Dies ist notwendig, da
Treiber diese Felder waehrend `db_handle_factory()` mutieren koennen:

- **PostgreSQL** -- ersetzt `;` durch Leerzeichen in `data_source`
- **MySQL** -- alloziert `username`/`password` aus DSN, wenn sie nicht uebergeben wurden
- **ODBC** -- baut `data_source` komplett um und bettet Zugangsdaten ein

Nach einem erfolgreichen `db_handle_factory()`-Aufruf werden die Kopien ueber `efree()` freigegeben.
Bei Fehlern erfolgt die Freigabe ueber `pdo_pool_free_conn()`,
die auch vom Destruktor des Pools verwendet wird.

## Inkompatibilitaet mit persistenten Verbindungen

Persistente Verbindungen (`PDO::ATTR_PERSISTENT`) sind mit dem Pool inkompatibel.
Eine persistente Verbindung ist an den Prozess gebunden und ueberlebt Anfragen,
waehrend der Pool Verbindungen auf Anfrageebene mit automatischem Lebenszyklus-Management erstellt.
Der Versuch, beide Attribute gleichzeitig zu aktivieren, fuehrt zu einem Fehler.

## Was kommt als Naechstes?

- [PDO Pool: Verbindungspool](/de/docs/components/pdo-pool.html) -- Nutzungsanleitung
- [Koroutinen](/de/docs/components/coroutines.html) -- wie Koroutinen funktionieren
- [Scope](/de/docs/components/scope.html) -- Verwaltung von Koroutinengruppen
