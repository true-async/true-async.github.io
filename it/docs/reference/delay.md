---
layout: docs
lang: it
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /it/docs/reference/delay.html
page_title: "delay()"
description: "delay() — sospende una coroutine per un dato numero di millisecondi."
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — Sospende l'esecuzione della coroutine corrente per il numero di millisecondi specificato.

## Descrizione

```php
delay(int $ms): void
```

Sospende la coroutine, cedendo il controllo allo scheduler. Dopo `$ms` millisecondi, la coroutine verrà ripresa.
Le altre coroutine continuano a essere eseguite durante l'attesa.

## Parametri

**`ms`**
Tempo di attesa in millisecondi. Se `0`, la coroutine cede semplicemente il controllo allo scheduler (simile a `suspend()`, ma con accodamento).

## Valori di ritorno

Nessun valore di ritorno.

## Esempi

### Esempio #1 Uso base

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Inizio\n";
    delay(1000); // Attendi 1 secondo
    echo "1 secondo trascorso\n";
});
?>
```

### Esempio #2 Esecuzione periodica

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "Controllo stato...\n";
        delay(5000); // Ogni 5 secondi
    }
});
?>
```

## Note

> **Nota:** `delay()` non blocca l'intero processo PHP — solo la coroutine corrente viene bloccata.

> **Nota:** `delay()` avvia automaticamente lo scheduler se non è stato ancora avviato.

## Vedi anche

- [suspend()](/it/docs/reference/suspend.html) — cedere il controllo senza ritardo
- [timeout()](/it/docs/reference/timeout.html) — creare un timeout per limitare l'attesa
