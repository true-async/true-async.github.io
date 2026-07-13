---
layout: docs
lang: it
path_key: "/docs.html"
nav_active: docs
permalink: /it/docs.html
page_title: "Documentazione"
description: "Documentazione TrueAsync. Scopri come installare e utilizzare vere primitive asincrone per PHP."
---

## Introduzione {#introduction}

`PHP TrueAsync` è un progetto che implementa la vera asincronia in PHP modificando il nucleo Zend, la libreria di I/O,
le librerie per database, le librerie per socket e altre funzioni.

`PHP TrueAsync` implementa il paradigma dell'asincronia trasparente senza funzioni colorate,
che minimizza le modifiche al codice ed elimina la segmentazione delle librerie.
In altre parole, utilizzando le coroutine, si usano le stesse funzioni senza modifiche o con modifiche minime.

## Supporto per l'IDE {#ide-support}

Per l'autocompletamento, la documentazione inline e gli stub per l'analisi statica, installa il pacchetto di sviluppo [`true-async/ide-helper`](https://github.com/true-async/ide-helper). Copre il core async, il server HTTP e il client ClickHouse e funziona con PhpStorm, PHPStan e Psalm.

```bash
composer require --dev true-async/ide-helper
```
