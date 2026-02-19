---
layout: page
lang: de
path_key: "/contributing.html"
nav_active: contributing
permalink: /de/contributing.html
page_title: "Mitmachen"
description: "Wie Sie TrueAsync unterstützen können — Code, Dokumentation, Tests und Community"
---

## Projektstatus

`PHP TrueAsync` ist ein inoffizielles Projekt zur Änderung des `PHP`-Kerns!
Das vorgeschlagene `RFC` befindet sich derzeit in einer ungewissen Situation,
und es ist unklar, ob es in Zukunft angenommen wird.

Dennoch glaube ich als Autor des Projekts, dass das Vorhandensein einer **Wahl** eine wichtige Voraussetzung für **Fortschritt** ist.
Das Projekt `PHP TrueAsync` ist offen für Ideen, Vorschläge und Hilfe.
Sie können mich persönlich per E-Mail kontaktieren: edmondifthen + proton.me,
oder im Forum schreiben: https://github.com/orgs/true-async/discussions

## Möglichkeiten zur Mitarbeit

### Code

- **Bugfixes** — schauen Sie sich [offene Issues](https://github.com/true-async/php-src/issues){:target="_blank"}
  mit dem Label `good first issue` an
- **Neue Features** — besprechen Sie Ihre Idee in den [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  vor der Implementierung
- **Code-Review** — helfen Sie beim Review von Pull Requests, das ist ein wertvoller Beitrag

### Dokumentation

- **Korrekturen** — Ungenauigkeit gefunden? Klicken Sie auf „Seite bearbeiten" unten auf jeder Seite
- **Übersetzungen** — helfen Sie bei der Übersetzung der Dokumentation in andere Sprachen
- **Beispiele** — schreiben Sie API-Nutzungsbeispiele für reale Szenarien
- **Tutorials** — erstellen Sie Schritt-für-Schritt-Anleitungen für bestimmte Aufgaben

### Testen

- **Build-Tests** — probieren Sie [TrueAsync zu installieren](/de/download.html)
  auf Ihrem System und berichten Sie über Probleme
- **Tests schreiben** — erhöhen Sie die Testabdeckung für die vorhandene API
- **Lasttests** — helfen Sie, Performance-Engpässe zu finden

### Community

- **Beantworten Sie Fragen** in [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  und [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Verbreiten Sie das Wort** — Vorträge, Artikel, Blogbeiträge
- **Melden Sie Bugs** — ein detaillierter Fehlerbericht spart Stunden an Entwicklungszeit

## Erste Schritte

### 1. Repository forken

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. Umgebung einrichten

Folgen Sie der [Build-Anleitung](/de/download.html) für Ihre Plattform.
Für die Entwicklung wird ein Debug-Build empfohlen:

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. Branch erstellen

```bash
git checkout -b feature/my-improvement
```

### 4. Änderungen vornehmen

- Folgen Sie dem Code-Stil des Projekts
- Fügen Sie Tests für neue Funktionalität hinzu
- Stellen Sie sicher, dass bestehende Tests bestehen: `make test`

### 5. Pull Request einreichen

- Beschreiben Sie **was** und **warum** Sie geändert haben
- Verweisen Sie auf zugehörige Issues
- Seien Sie bereit für Diskussion und Überarbeitungen

## Repository-Struktur

| Repository | Beschreibung |
|------------|-------------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | PHP-Kern mit Async API |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | Erweiterung mit Implementierung |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | Diese Dokumentationsseite |

## Richtlinien

- **Kleine PRs sind besser als große** — ein PR löst eine Aufgabe
- **Diskutieren vor Implementieren** — erstellen Sie für größere Änderungen zuerst ein Issue oder Discussion
- **Schreiben Sie Tests** — Code ohne Tests ist schwerer zu akzeptieren
- **Dokumentieren Sie** — aktualisieren Sie die Dokumentation bei API-Änderungen

## Kontakt

- **GitHub Discussions** — [Fragen und Ideen](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [Live-Chat](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [Fehlerberichte](https://github.com/true-async/php-src/issues){:target="_blank"}

Vielen Dank für Ihren Beitrag zur Zukunft von PHP!
