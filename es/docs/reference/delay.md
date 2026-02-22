---
layout: docs
lang: es
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /es/docs/reference/delay.html
page_title: "delay()"
description: "delay() — suspende una corrutina durante un número determinado de milisegundos."
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — Suspende la ejecución de la corrutina actual durante el número especificado de milisegundos.

## Descripción

```php
delay(int $ms): void
```

Suspende la corrutina, cediendo el control al planificador. Después de `$ms` milisegundos, la corrutina se reanudará.
Otras corrutinas continúan ejecutándose durante la espera.

## Parámetros

**`ms`**
Tiempo de espera en milisegundos. Si es `0`, la corrutina simplemente cede el control al planificador (similar a `suspend()`, pero con encolamiento).

## Valores de retorno

No devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Inicio\n";
    delay(1000); // Esperar 1 segundo
    echo "Pasó 1 segundo\n";
});
?>
```

### Ejemplo #2 Ejecución periódica

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "Verificando estado...\n";
        delay(5000); // Cada 5 segundos
    }
});
?>
```

## Notas

> **Nota:** `delay()` no bloquea todo el proceso PHP — solo la corrutina actual es bloqueada.

> **Nota:** `delay()` inicia automáticamente el planificador si aún no se ha iniciado.

## Ver también

- [suspend()](/es/docs/reference/suspend.html) — ceder el control sin retardo
- [timeout()](/es/docs/reference/timeout.html) — crear un timeout para limitar la espera
