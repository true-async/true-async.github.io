---
layout: docs
lang: it
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /it/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — sospende l'esecuzione della coroutine corrente. Documentazione completa: esempi di multitasking cooperativo."
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — Sospende l'esecuzione della coroutine corrente

## Descrizione

```php
suspend: void
```

Sospende l'esecuzione della coroutine corrente e cede il controllo allo scheduler.
L'esecuzione della coroutine verrà ripresa in seguito quando lo scheduler deciderà di eseguirla.

`suspend()` è una funzione fornita dall'estensione True Async.

## Parametri

Questo costrutto non ha parametri.

## Valori di ritorno

La funzione non restituisce un valore.

## Esempi

### Esempio #1 Uso base di suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Prima di suspend\n";
    suspend();
    echo "Dopo suspend\n";
});

echo "Codice principale\n";
?>
```

**Output:**
```
Prima di suspend
Codice principale
Dopo suspend
```

### Esempio #2 Suspend multipli

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iterazione $i\n";
        suspend();
    }
});

echo "Coroutine avviata\n";
?>
```

**Output:**
```
Iterazione 1
Coroutine avviata
Iterazione 2
Iterazione 3
```

### Esempio #3 Multitasking cooperativo

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine A: $i\n";
        suspend(); // Dai alle altre coroutine la possibilità di eseguire
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine B: $i\n";
        suspend();
    }
});
?>
```

**Output:**
```
Coroutine A: 1
Coroutine B: 1
Coroutine A: 2
Coroutine B: 2
Coroutine A: 3
Coroutine B: 3
...
```

### Esempio #4 Cessione esplicita del controllo

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Inizio lavoro lungo\n";

    for ($i = 0; $i < 1000000; $i++) {
        // Calcoli

        if ($i % 100000 === 0) {
            suspend(); // Cedi periodicamente il controllo
        }
    }

    echo "Lavoro completato\n";
});

spawn(function() {
    echo "Anche un'altra coroutine sta lavorando\n";
});
?>
```

### Esempio #5 suspend da funzioni annidate

`suspend()` funziona da qualsiasi profondità di chiamata — non ha bisogno di essere chiamato direttamente dalla coroutine:

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Funzione annidata: prima di suspend\n";
    suspend();
    echo "Funzione annidata: dopo suspend\n";
}

function deeplyNested() {
    echo "Chiamata profonda: inizio\n";
    nestedSuspend();
    echo "Chiamata profonda: fine\n";
}

spawn(function() {
    echo "Coroutine: prima della chiamata annidata\n";
    deeplyNested();
    echo "Coroutine: dopo la chiamata annidata\n";
});

spawn(function() {
    echo "Altra coroutine: in esecuzione\n";
});
?>
```

**Output:**
```
Coroutine: prima della chiamata annidata
Chiamata profonda: inizio
Funzione annidata: prima di suspend
Altra coroutine: in esecuzione
Funzione annidata: dopo suspend
Chiamata profonda: fine
Coroutine: dopo la chiamata annidata
```

### Esempio #6 suspend in un ciclo di attesa

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // Attendi finché il flag diventa true
    while (!$ready) {
        suspend(); // Cedi il controllo
    }

    echo "Condizione soddisfatta!\n";
});

spawn(function() use (&$ready) {
    echo "Preparazione...\n";
    Async\sleep(2000);
    $ready = true;
    echo "Pronto!\n";
});
?>
```

**Output:**
```
Preparazione...
Pronto!
Condizione soddisfatta!
```

## Note

> **Nota:** `suspend()` è una funzione. Chiamarla come `suspend` (senza parentesi) non è corretto.

> **Nota:** In TrueAsync, tutto il codice in esecuzione viene trattato come una coroutine,
> quindi `suspend()` può essere chiamato ovunque (incluso lo script principale).

> **Nota:** Dopo aver chiamato `suspend()`, l'esecuzione della coroutine non riprenderà immediatamente,
> ma quando lo scheduler deciderà di eseguirla. L'ordine di ripresa delle coroutine non è garantito.

> **Nota:** Nella maggior parte dei casi, l'uso esplicito di `suspend()` non è necessario.
> Le coroutine vengono sospese automaticamente durante le operazioni di I/O
> (lettura di file, richieste di rete, ecc.).

> **Nota:** L'uso di `suspend()`
> in cicli infiniti senza operazioni di I/O può portare a un elevato utilizzo della CPU.
> È possibile utilizzare anche `Async\timeout()`.

## Changelog

| Versione  | Descrizione                        |
|-----------|------------------------------------|
| 1.0.0     | Aggiunta la funzione `suspend()`  |

## Vedi anche

- [spawn()](/it/docs/reference/spawn.html) - Avvio di una coroutine
- [await()](/it/docs/reference/await.html) - Attesa del risultato di una coroutine
