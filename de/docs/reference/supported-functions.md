---
layout: docs
lang: de
path_key: "/docs/reference/supported-functions.html"
nav_active: docs
permalink: /de/docs/reference/supported-functions.html
page_title: "Unterstützte Funktionen"
description: "Vollständige Liste der PHP-Funktionen, die für den coroutine-fähigen nicht-blockierenden Betrieb in TrueAsync angepasst wurden."
---

# Unterstützte Funktionen

TrueAsync passt **über 70 Standard-PHP-Funktionen** für nicht-blockierenden Betrieb innerhalb von Koroutinen an.
Alle aufgeführten Funktionen werden automatisch asynchron, wenn sie innerhalb einer Koroutine aufgerufen werden.
Außerhalb einer Koroutine funktionieren sie wie gewohnt.

---

## DNS

| Funktion | Beschreibung |
|----------|--------------|
| `gethostbyname()` | Hostname in IP-Adresse auflösen |
| `gethostbyaddr()` | IP-Adresse in Hostname auflösen |
| `gethostbynamel()` | Liste der IP-Adressen für Hostname abrufen |

---

## Datenbanken

### PDO MySQL

| Funktion | Beschreibung |
|----------|--------------|
| `PDO::__construct()` | Nicht-blockierende Verbindung |
| `PDO::prepare()` | Anweisung vorbereiten |
| `PDO::exec()` | Abfrage ausführen |
| `PDOStatement::execute()` | Vorbereitete Anweisung ausführen |
| `PDOStatement::fetch()` | Ergebnisse abrufen |

### PDO PgSQL

| Funktion | Beschreibung |
|----------|--------------|
| `PDO::__construct()` | Nicht-blockierende Verbindung |
| `PDO::prepare()` | Anweisung vorbereiten |
| `PDO::exec()` | Abfrage ausführen |
| `PDOStatement::execute()` | Vorbereitete Anweisung ausführen |
| `PDOStatement::fetch()` | Ergebnisse abrufen |

### PDO Connection Pooling

Transparentes Connection Pooling für PDO über `Async\Pool`-Integration.
Jede Koroutine erhält eine eigene Verbindung aus dem Pool mit automatischer Lebenszyklusverwaltung.

### MySQLi

| Funktion | Beschreibung |
|----------|--------------|
| `mysqli_connect()` | Nicht-blockierende Verbindung |
| `mysqli_query()` | Abfrage ausführen |
| `mysqli_prepare()` | Anweisung vorbereiten |
| `mysqli_stmt_execute()` | Vorbereitete Anweisung ausführen |
| `mysqli_fetch_*()` | Ergebnisse abrufen |

### PostgreSQL (nativ)

| Funktion | Beschreibung |
|----------|--------------|
| `pg_connect()` | Nicht-blockierende Verbindung |
| `pg_query()` | Abfrage ausführen |
| `pg_prepare()` | Anweisung vorbereiten |
| `pg_execute()` | Vorbereitete Anweisung ausführen |
| `pg_fetch_*()` | Ergebnisse abrufen |

Jeder Async-Kontext verwendet eine separate Verbindung für sichere Nebenläufigkeit.

---

## CURL

| Funktion | Beschreibung |
|----------|--------------|
| `curl_exec()` | Anfrage ausführen |
| `curl_multi_exec()` | Mehrere Anfragen ausführen |
| `curl_multi_select()` | Auf Aktivität warten |
| `curl_multi_getcontent()` | Inhalt abrufen |
| `curl_setopt()` | Optionen setzen |
| `curl_getinfo()` | Anfrageinformationen abrufen |
| `curl_error()` | Fehler abrufen |
| `curl_close()` | Handle schließen |

---

## Sockets

| Funktion | Beschreibung |
|----------|--------------|
| `socket_create()` | Socket erstellen |
| `socket_create_pair()` | Socket-Paar erstellen |
| `socket_connect()` | Verbinden |
| `socket_accept()` | Verbindung annehmen |
| `socket_read()` | Daten lesen |
| `socket_write()` | Daten schreiben |
| `socket_send()` | Daten senden |
| `socket_recv()` | Daten empfangen |
| `socket_sendto()` | An Adresse senden |
| `socket_recvfrom()` | Von Adresse empfangen |
| `socket_bind()` | An Adresse binden |
| `socket_listen()` | Lauschen |
| `socket_select()` | Socket-Aktivität überwachen |

---

## Datei- und Stream-E/A

| Funktion | Beschreibung |
|----------|--------------|
| `fopen()` | Datei öffnen |
| `fclose()` | Datei schließen |
| `fread()` | Aus Datei lesen |
| `fwrite()` | In Datei schreiben |
| `fgets()` | Zeile lesen |
| `fgetc()` | Zeichen lesen |
| `fgetcsv()` | CSV-Zeile lesen |
| `fputcsv()` | CSV-Zeile schreiben |
| `fseek()` | Position setzen |
| `ftell()` | Position abrufen |
| `rewind()` | Position zurücksetzen |
| `ftruncate()` | Datei kürzen |
| `fflush()` | Puffer leeren |
| `fscanf()` | Formatiertes Lesen |
| `file_get_contents()` | Gesamte Datei lesen |
| `file_put_contents()` | Gesamte Datei schreiben |
| `file()` | Datei in Array lesen |
| `copy()` | Datei kopieren |
| `tmpfile()` | Temporäre Datei erstellen |
| `readfile()` | Datei ausgeben |
| `fpassthru()` | Rest der Datei ausgeben |
| `stream_get_contents()` | Rest des Streams lesen |
| `stream_copy_to_stream()` | Zwischen Streams kopieren |

---

## Stream-Sockets

| Funktion | Beschreibung |
|----------|--------------|
| `stream_socket_client()` | Client-Verbindung erstellen |
| `stream_socket_server()` | Server-Socket erstellen |
| `stream_socket_accept()` | Verbindung annehmen |
| `stream_select()` | Stream-Aktivität überwachen |
| `stream_context_create()` | Async-fähigen Kontext erstellen |

> **Einschränkung:** `stream_select()` mit Pipe-Streams (z.B. von `proc_open()`) wird unter Windows nicht unterstützt. Unter Linux/macOS funktioniert es nativ über die Event-Schleife.

---

## Prozessausführung

| Funktion | Beschreibung |
|----------|--------------|
| `proc_open()` | Prozess mit Pipes öffnen |
| `proc_close()` | Prozess schließen |
| `exec()` | Externen Befehl ausführen |
| `shell_exec()` | Shell-Befehl ausführen |
| `system()` | Systembefehl ausführen |
| `passthru()` | Ausführen mit direkter Ausgabe |

---

## Timer und Verzögerungen

| Funktion | Beschreibung |
|----------|--------------|
| `sleep()` | Verzögerung in Sekunden |
| `usleep()` | Verzögerung in Mikrosekunden |
| `time_nanosleep()` | Nanosekunden-genaue Verzögerung |
| `time_sleep_until()` | Warten bis Zeitstempel |

---

## Ausgabepufferung

Jede Koroutine erhält einen **isolierten** Ausgabepuffer.

| Funktion | Beschreibung |
|----------|--------------|
| `ob_start()` | Pufferung starten |
| `ob_flush()` | Puffer leeren |
| `ob_clean()` | Puffer bereinigen |
| `ob_get_contents()` | Pufferinhalt abrufen |
| `ob_end_clean()` | Pufferung beenden |

---

## Noch nicht unterstützt

Funktionen, die zur Implementierung geplant oder noch nicht angepasst sind.

### DNS

| Funktion | Beschreibung |
|----------|--------------|
| `dns_check_record()` / `checkdnsrr()` | DNS-Eintrag prüfen |
| `dns_get_mx()` / `getmxrr()` | MX-Einträge abrufen |
| `dns_get_record()` | DNS-Ressourceneinträge abrufen |

### Datenbanken

| Erweiterung | Beschreibung |
|-------------|--------------|
| PDO ODBC | ODBC-Treiber |
| PDO Oracle | Oracle-Treiber |
| PDO SQLite | SQLite-Treiber |
| PDO Firebird | Firebird-Treiber |
| MongoDB | MongoDB-Client |

### Dateioperationen (Metadaten)

| Funktion | Beschreibung |
|----------|--------------|
| `flock()` | Dateisperrung |
| `opendir()` / `readdir()` / `closedir()` | Verzeichnisdurchlauf |
| `unlink()` / `rename()` | Datei löschen und umbenennen |
| `mkdir()` / `rmdir()` | Verzeichnis erstellen und entfernen |
| `stat()` / `lstat()` | Dateiinformationen |
| `readlink()` | Symbolische Links lesen |

> **Hinweis:** Datei-Metadatenoperationen auf lokalen Festplatten werden in Mikrosekunden abgeschlossen. Ihre Asynchronität ist nur bei Netzwerkdateisystemen (NFS) sinnvoll.

---

## Wie geht es weiter?

- [spawn()](/de/docs/reference/spawn.html) — Koroutinen erstellen
- [await()](/de/docs/reference/await.html) — Auf Ergebnisse warten
- [Koroutinen](/de/docs/components/coroutines.html) — Konzepte und Beispiele
