---
layout: docs
lang: es
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /es/docs/components/context.html
page_title: "Contexto"
description: "Contexto en TrueAsync -- almacenamiento de datos en la jerarquia de scopes, valores locales y heredados, analogo a Go context.Context."
---

# Context: Contextos de Ejecucion

## Por Que Se Necesita

Hay una `API` con una clase de servicio que necesita realizar acciones vinculadas a un token de autorizacion.
Sin embargo, pasar el token a cada metodo del servicio es una mala idea.
En `PHP`, este problema se resuelve mediante variables globales o propiedades estaticas de clase.
Pero en un entorno asincrono, donde un solo proceso puede manejar diferentes solicitudes, este enfoque no funciona,
porque en el momento de la llamada, no se sabe que solicitud se esta manejando.

`Async\Context` permite almacenar datos asociados con una corrutina o `Scope` y construir la logica de la aplicacion
basandose en el contexto de ejecucion.

## Que es Context

`Async\Context` es un almacen clave-valor vinculado a un `Scope` o corrutina.
Los contextos forman una jerarquia: al leer un valor, la busqueda sube por el arbol de scopes.

Esto es analogo a `context.Context` en `Go` o `CoroutineContext` en `Kotlin`.
Un mecanismo para pasar datos a traves de la jerarquia sin pasar parametros explicitamente.

## Tres Niveles de Contexto

`TrueAsync` proporciona tres funciones para acceder a los contextos:

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// Contexto del Scope actual
$scopeCtx = current_context();

// Contexto de la corrutina actual
$coroCtx = coroutine_context();

// Contexto raiz global
$rootCtx = root_context();
?>
```

### current_context()

Devuelve el contexto del `Scope` actual. Si el contexto aun no ha sido creado, lo crea automaticamente.
Los valores establecidos aqui son visibles para todas las corrutinas en este Scope.

### coroutine_context()

Devuelve el contexto de la corrutina actual. Este es un contexto **privado** que pertenece solo a esta corrutina.
Otras corrutinas no pueden ver los datos establecidos aqui.

### root_context()

Devuelve el contexto global, compartido en toda la solicitud. Los valores aqui son visibles via `find()` desde cualquier contexto.

## Claves

Una clave puede ser una **cadena** o un **objeto**:

```php
<?php
use function Async\current_context;

$ctx = current_context();

// Clave de cadena
$ctx->set('request_id', 'abc-123');

// Objeto como clave (util para tokens unicos)
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

Las claves de objeto se almacenan por referencia en el contexto, lo que garantiza su unicidad.

## Lectura: Local y Jerarquica

### find() / get() / has() -- Busqueda Jerarquica

Busca un valor primero en el contexto actual, luego en el padre, y asi sucesivamente hasta la raiz:

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() busca hacia arriba en la jerarquia
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- encontrado en root_context
});
?>
```

### findLocal() / getLocal() / hasLocal() -- Solo Contexto Actual

Busca un valor **solo** en el contexto actual, sin subir por la jerarquia:

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- este valor no esta establecido en el Scope actual

$inherited = current_context()->find('app_name');
// "MyApp" -- encontrado en el scope padre
?>
```

## Escritura y Eliminacion

### set()

```php
<?php
$ctx = current_context();

// Establecer un valor (por defecto replace = false)
$ctx->set('key', 'value');

// set repetido sin replace -- error
$ctx->set('key', 'new_value'); // Error: A context key already exists

// Con replace = true explicito
$ctx->set('key', 'new_value', replace: true); // OK
```

El metodo `set()` devuelve `$this`, permitiendo el encadenamiento de metodos:

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'en');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

El metodo `unset()` tambien devuelve `$this`.

## Ejemplos Practicos

### Pasar un ID de Solicitud

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// El middleware establece el request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// Cualquier corrutina en este scope puede leerlo
spawn(function() {
    $requestId = current_context()->find('request_id');
    // Usar en el registro de logs
    error_log("[$requestId] Procesando solicitud...");
});
?>
```

### Contexto de Corrutina como Almacenamiento Privado

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... realizar trabajo
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // No puede ver 'step' de c1
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### Configuracion via root_context

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Establecer al inicio de la solicitud
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// Disponible desde cualquier corrutina
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## Vea Tambien

- [Scope](/es/docs/components/scope.html) -- gestion del ciclo de vida de las corrutinas
- [Corrutinas](/es/docs/components/coroutines.html) -- la unidad basica de concurrencia
- [current_context()](/es/docs/reference/current-context.html) -- obtener el contexto del Scope actual
