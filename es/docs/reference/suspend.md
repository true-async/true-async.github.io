---
layout: docs
lang: es
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /es/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — suspender la ejecución de la corrutina actual. Documentación completa: ejemplos de multitarea cooperativa."
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — Suspende la ejecución de la corrutina actual

## Descripción

```php
suspend: void
```

Suspende la ejecución de la corrutina actual y cede el control al planificador.
La ejecución de la corrutina se reanudará más tarde cuando el planificador decida ejecutarla.

`suspend()` es una función proporcionada por la extensión True Async.

## Parámetros

Esta construcción no tiene parámetros.

## Valores de retorno

La función no devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Uso básico de suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Antes de suspend\n";
    suspend();
    echo "Después de suspend\n";
});

echo "Código principal\n";
?>
```

**Salida:**
```
Antes de suspend
Código principal
Después de suspend
```

### Ejemplo #2 Múltiples suspends

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iteración $i\n";
        suspend();
    }
});

echo "Corrutina iniciada\n";
?>
```

**Salida:**
```
Iteración 1
Corrutina iniciada
Iteración 2
Iteración 3
```

### Ejemplo #3 Multitarea cooperativa

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Corrutina A: $i\n";
        suspend(); // Dar oportunidad a otras corrutinas de ejecutarse
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Corrutina B: $i\n";
        suspend();
    }
});
?>
```

**Salida:**
```
Corrutina A: 1
Corrutina B: 1
Corrutina A: 2
Corrutina B: 2
Corrutina A: 3
Corrutina B: 3
...
```

### Ejemplo #4 Cesión explícita de control

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Iniciando trabajo largo\n";

    for ($i = 0; $i < 1000000; $i++) {
        // Cálculos

        if ($i % 100000 === 0) {
            suspend(); // Ceder control periódicamente
        }
    }

    echo "Trabajo completado\n";
});

spawn(function() {
    echo "Otra corrutina también está trabajando\n";
});
?>
```

### Ejemplo #5 suspend desde funciones anidadas

`suspend()` funciona desde cualquier profundidad de llamada — no necesita ser llamado directamente desde la corrutina:

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Función anidada: antes de suspend\n";
    suspend();
    echo "Función anidada: después de suspend\n";
}

function deeplyNested() {
    echo "Llamada profunda: inicio\n";
    nestedSuspend();
    echo "Llamada profunda: fin\n";
}

spawn(function() {
    echo "Corrutina: antes de llamada anidada\n";
    deeplyNested();
    echo "Corrutina: después de llamada anidada\n";
});

spawn(function() {
    echo "Otra corrutina: trabajando\n";
});
?>
```

**Salida:**
```
Corrutina: antes de llamada anidada
Llamada profunda: inicio
Función anidada: antes de suspend
Otra corrutina: trabajando
Función anidada: después de suspend
Llamada profunda: fin
Corrutina: después de llamada anidada
```

### Ejemplo #6 suspend en un bucle de espera

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // Esperar hasta que la bandera sea true
    while (!$ready) {
        suspend(); // Ceder control
    }

    echo "¡Condición cumplida!\n";
});

spawn(function() use (&$ready) {
    echo "Preparando...\n";
    Async\sleep(2000);
    $ready = true;
    echo "¡Listo!\n";
});
?>
```

**Salida:**
```
Preparando...
¡Listo!
¡Condición cumplida!
```

## Notas

> **Nota:** `suspend()` es una función. Llamarla como `suspend` (sin paréntesis) es incorrecto.

> **Nota:** En TrueAsync, todo el código en ejecución se trata como una corrutina,
> por lo que `suspend()` puede llamarse en cualquier lugar (incluyendo el script principal).

> **Nota:** Después de llamar a `suspend()`, la ejecución de la corrutina no se reanudará inmediatamente,
> sino cuando el planificador decida ejecutarla. El orden de reanudación de las corrutinas no está garantizado.

> **Nota:** En la mayoría de los casos, no se requiere el uso explícito de `suspend()`.
> Las corrutinas se suspenden automáticamente al realizar operaciones de E/S
> (lectura de archivos, solicitudes de red, etc.).

> **Nota:** Usar `suspend()`
> en bucles infinitos sin operaciones de E/S puede llevar a un alto uso de CPU.
> También puede usar `Async\timeout()`.

## Registro de cambios

| Versión   | Descripción                         |
|-----------|-------------------------------------|
| 1.0.0     | Se añadió la función `suspend()`   |

## Ver también

- [spawn()](/es/docs/reference/spawn.html) - Lanzar una corrutina
- [await()](/es/docs/reference/await.html) - Esperar el resultado de una corrutina
