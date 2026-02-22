---
layout: docs
lang: es
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /es/docs/reference/context/set.html
page_title: "Context::set"
description: "Establecer un valor en el contexto por clave."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

Establece un valor en el contexto actual con la clave especificada. Por defecto, si la clave
ya existe, el valor **no se sobreescribe**. Para forzar la sobreescritura, use
el parámetro `replace = true`.

El método devuelve el objeto `Context`, permitiendo el encadenamiento de métodos.

## Parámetros

**key**
: La clave para establecer el valor. Puede ser una cadena o un objeto.
  Las claves de objeto son útiles para evitar conflictos de nombres entre bibliotecas.

**value**
: El valor a almacenar. Puede ser de cualquier tipo.

**replace**
: Si `false` (por defecto) --- no sobreescribir un valor existente.
  Si `true` --- sobreescribir el valor aunque la clave ya exista.

## Valor de retorno

El objeto `Context` para encadenamiento de métodos.

## Ejemplos

### Ejemplo #1 Establecer valores con claves de cadena

```php
<?php

use function Async\current_context;

// Encadenamiento de métodos
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### Ejemplo #2 Comportamiento sin sobreescritura

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Establecer de nuevo sin replace — el valor NO cambia
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// Con replace = true — el valor se sobreescribe
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### Ejemplo #3 Claves de objeto para aislamiento de bibliotecas

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Cada biblioteca usa su propia clave de objeto
class LoggerContext {
    public static object $key;
}
LoggerContext::$key = new stdClass();

class CacheContext {
    public static object $key;
}
CacheContext::$key = new stdClass();

current_context()
    ->set(LoggerContext::$key, new FileLogger('/var/log/app.log'))
    ->set(CacheContext::$key, new RedisCache('localhost:6379'));

spawn(function() {
    $logger = current_context()->find(LoggerContext::$key);
    $cache = current_context()->find(CacheContext::$key);

    $logger->info('Caché inicializado');
});
```

### Ejemplo #4 Pasar contexto a corrutinas hijas

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Contexto padre
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Las corrutinas hijas heredan valores a través de find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Procesando solicitud: {$traceId}\n";

    // La corrutina hija agrega su propio valor
    current_context()->set('handler', 'user_controller');
});
```

## Ver también

- [Context::unset](/es/docs/reference/context/unset.html) --- Eliminar valor por clave
- [Context::find](/es/docs/reference/context/find.html) --- Buscar valor por clave
- [Context::get](/es/docs/reference/context/get.html) --- Obtener valor (lanza excepción)
- [current_context()](/es/docs/reference/current-context.html) --- Obtener el contexto actual del Scope
