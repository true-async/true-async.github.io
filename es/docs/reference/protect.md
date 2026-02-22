---
layout: docs
lang: es
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /es/docs/reference/protect.html
page_title: "protect()"
description: "protect() — ejecutar código en modo no cancelable para proteger secciones críticas."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — Ejecuta un closure en modo no cancelable. La cancelación de la corrutina se difiere hasta que el closure se complete.

## Descripción

```php
protect(\Closure $closure): mixed
```

Mientras `$closure` se está ejecutando, la corrutina se marca como protegida. Si llega una solicitud de cancelación durante este tiempo, `AsyncCancellation` se lanzará solo **después** de que el closure termine.

## Parámetros

**`closure`**
Un closure a ejecutar sin interrupción por cancelación.

## Valores de retorno

Devuelve el valor retornado por el closure.

## Ejemplos

### Ejemplo #1 Proteger una transacción

```php
<?php
use function Async\protect;

$db->beginTransaction();

$result = protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
    return true;
});

// Si la corrutina fue cancelada durante protect(),
// AsyncCancellation se lanzará aquí — después de commit()
?>
```

### Ejemplo #2 Proteger escritura de archivos

```php
<?php
use function Async\protect;

protect(function() {
    $fp = fopen('data.json', 'w');
    fwrite($fp, json_encode($data));
    fclose($fp);
});
?>
```

### Ejemplo #3 Obtener un resultado

```php
<?php
use function Async\protect;

$cached = protect(function() use ($cache, $key) {
    $value = computeExpensiveResult();
    $cache->set($key, $value);
    return $value;
});
?>
```

### Ejemplo #4 Cancelación diferida y diagnóstico

Durante `protect()`, la cancelación se guarda pero no se aplica. Esto se puede verificar mediante métodos de la corrutina:

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // Dentro de protect() después de cancel():
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Operación protegida completada\n";
    });

    // AsyncCancellation se lanza aquí — después de protect()
    echo "Este código no se ejecutará\n";
});

suspend(); // Dejar que la corrutina entre en protect()
$coroutine->cancel();
suspend(); // Dejar que protect() termine

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `true` inmediatamente después de `cancel()`, incluso dentro de `protect()`
- `isCancelled()` — `false` mientras `protect()` se está ejecutando, luego `true`

## Notas

> **Nota:** Si la cancelación ocurrió durante `protect()`, `AsyncCancellation` se lanzará inmediatamente después de que el closure retorne — el valor de retorno de `protect()` se perderá en este caso.

> **Nota:** `protect()` no hace el closure atómico — otras corrutinas pueden ejecutarse durante las operaciones de E/S dentro de él. `protect()` solo garantiza que la **cancelación** no interrumpirá la ejecución.

## Ver también

- [Cancelación](/es/docs/components/cancellation.html) — mecanismo de cancelación cooperativa
- [suspend()](/es/docs/reference/suspend.html) — suspender una corrutina
