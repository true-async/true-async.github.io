---
layout: tutorial
lang: de
path_key: "/tutors-server/09-production.html"
nav_active: docs
permalink: /de/tutors-server/09-production.html
page_title: "Produktion"
description: "Timeouts, Limits, Backpressure beim accept, Kompression, Logs und Graceful Shutdown."
---

# Produktion

Ein guter Server unterscheidet sich von einer Demo nicht darin, wie er
funktioniert. Sondern darin, wie er scheitert. Jeder funktioniert, wenn
die Laune stimmt; die Produktion beginnt dort, wo der schlechte Tag
eintrifft: eine Verkehrsspitze, langsame Clients, ein Deploy im
denkbar ungünstigsten Moment. Dieses Kapitel handelt ausschließlich von
schlechten Tagen.

## Timeouts: Niemand wartet ewig

Aus der ersten Serie haben wir eine eiserne Regel mitgenommen: Jedes
Warten muss eine Grenze haben. Sehen wir uns an, wo eine Verbindung
überhaupt Wartezeiten hat. Der Client sendet eine Anfrage, das ist eins.
Nimmt die Antwort entgegen, das ist zwei. Hängt zwischen den Anfragen
auf Keep-Alive, das ist drei. Jede Phase bekommt ihre eigene Grenze:

```php
$config
    ->setReadTimeout(30)       // die Anfrage braucht länger als 30 Sekunden zum Senden? auf Wiedersehen
    ->setWriteTimeout(60)      // und die Antwort braucht länger als eine Minute zum Abholen? die auch
    ->setKeepAliveTimeout(15); // eine untätige Verbindung lebt höchstens 15 Sekunden
```

Das Read-Timeout betrifft nicht nur langsames Internet. Es gibt einen
Angriff mit einem wunderbaren Namen, slowloris: Der Client sendet eine
Anfrage mit einem Byte pro Minute und belegt die Verbindung für immer.
Hundert solcher Clients und ein Server ohne Timeouts ist erledigt. Mit
einem Timeout sind es einfach hundert getrennte Verbindungen.

Die eine legitime Ausnahme kennst du schon aus dem SSE-Kapitel: Für
Ströme wird das Write-Timeout abgeschaltet, `setWriteTimeout(0)`.

## Limits: Günstig ablehnen

Nun zur Überlast. Die Frage ist nicht "ob", die Frage ist "wann". Und in
diesem Moment hat der Server genau zwei Wege. Weg eins: nimm alle an,
häufe eine Warteschlange an, werde langsam, und am Ende bekommen alle
Timeouts, einschließlich derer, die man hätte bedienen können. Weg zwei:
sag den Überzähligen sofort "besetzt", und bediene die übrigen, als wäre
nichts gewesen.

Der zweite Weg wird so konfiguriert:

```php
$config
    ->setMaxConnections(10_000)          // hartes Verbindungslimit
    ->setMaxInflightRequests(1_000)      // nebenläufig verarbeitete Anfragen
    ->setMaxBodySize(10 * 1024 * 1024);  // Body größer als 10 MiB? 413
```

Sieh dir `setMaxInflightRequests` genau an. Erkennst du es wieder? Es ist
unser alter Freund, das Nebenläufigkeitslimit: `POOL_MAX`, `concurrency`
bei Gruppen, jetzt auf der Ebene eines ganzen Servers. Eine überzählige
Anfrage bekommt ein sofortiges `503 Retry-After: 1`. Sofort ist das
Schlüsselwort: Der Client erfährt die Wahrheit in einer Millisekunde und
wird es später erneut versuchen, statt eine Minute lang in einer
Warteschlange auf ein Timeout zu hängen.

Es gibt auch eine dritte Verteidigungslinie, die eleganteste. Der Server
misst selbst, wie lange Anfragen in der Warteschlange warten. Wächst die
Wartezeit systematisch? Dann kommen wir nicht hinterher, und der Server
hört vorübergehend auf, neue Verbindungen anzunehmen, bis er aufgeholt
hat. Der Algorithmus heißt CoDel, aber du kennst ihn unter einem anderen
Namen: Es ist das Backpressure aus dem Kanal-Kapitel, angewandt auf
`accept()`. Das Internet ist der Produzent, die Handler sind der
Konsument, und der Produzent wird gebremst. Es gibt eine Einstellung:

```php
$config->setBackpressureTargetMs(20); // welche Wartezeit in der Warteschlange als normal gelten soll
```

## Kompression

Gute Nachricht: Die Kompression der Antworten funktioniert bereits. Der
Server verhandelt mit dem Client über `Accept-Encoding` und wählt den
besten der verfügbaren Codecs: zstd, brotli, gzip. Meistens gibt es hier
nichts zu tun, aber drei Hebel sind es wert, gekannt zu werden:

```php
$config
    ->setCompressionMinSize(1024)   // Kleinkram nicht komprimieren: der Overhead kostet mehr
    ->setZstdLevel(3)               // Geschwindigkeits-/Verhältnis-Balance pro Codec
    ->setCompressionMimeTypes([...]); // Whitelist: Text wird komprimiert, JPEG ohnehin nicht
```

Plus ein Hebel auf der Antwortseite: `$res->setNoCompression()` für
Endpunkte, an denen Kompression schädlich ist. Die SSE-Helfer rufen ihn
übrigens von selbst auf; ein puffernder gzip würde die ganze
Unmittelbarkeit der Zustellung töten.

## Logs

Solange alles gut ist, schweigt der Server. Einverstanden, wir hören
lieber nicht von den Benutzern von Ärger:

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::WARN)
    ->setLogStream(STDERR);
```

`WARN` deckt fehlgeschlagene TLS-Handshakes, getrennte Clients,
verschluckte Ausnahmen ab. `INFO` fügt den Lebenszyklus hinzu: Start,
Ports, Worker. Die Senke ist ein gewöhnlicher PHP-Stream: stderr für
systemd und Docker, eine Datei, was auch immer.

## Ein anmutiger Stopp

Und der letzte schlechte Tag, der eigentlich ein guter ist: der Deploy.
Ein Bild, das eines Ölgemäldes würdig wäre: Der Server hat tausend
lebende Verbindungen, hundert davon mitten im Schreiben in die
Datenbank, und da kommt die neue Version. `kill -9`? Freu dich auf
hundert abgebrochene Transaktionen und eine Menge Benutzer mit kaputten
Uploads.

Die anmutige Version sieht so aus:

```php
$config->setShutdownTimeout(30);
```

Beim Empfang von `stop()` oder SIGTERM hört der Server zuerst auf, neue
anzunehmen, und lässt die laufenden ihr Leben zu Ende leben, bis zu
dreißig Sekunden. Wer es nicht geschafft hat, wird abgebrochen. Und hier
zahlt sich zum letzten Mal in dieser Serie die Scope-Disziplin aus: Der
Abbruch geht kooperativ durch den Baum jeder Anfrage, die
`finally`-Blöcke geben Ressourcen frei, der Pool rollt nicht
geschlossene Transaktionen zurück. Graceful Shutdown wurde nicht als
Feature geschrieben. Es fiel aus der Architektur heraus.

Für langlebige Verbindungen hinter einem Load Balancer gibt es noch
einen Handgriff, `setMaxConnectionAgeMs()`: Eine Verbindung, die älter
als das angegebene Alter ist, wird anmutig geschlossen (`Connection:
close`, GOAWAY), damit sich die Clients über die Maschinen neu verteilen,
statt jahrelang an einer zu hängen.

Jetzt ist das Produktion. Überlast trifft auf eine schnelle Ablehnung,
langsame Clients laufen in Timeouts, ein Deploy reißt keine
Transaktionen auseinander, und der Server meldet seine Probleme selbst.
Eine letzte Grenze bleibt für die ganze Serie: Bislang haben nur Browser
und curl mit unserem Server gesprochen. Es ist Zeit, andere
Gesprächspartner hereinzulassen, die benachbarten Dienste, in ihrer
Muttersprache.
