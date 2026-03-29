---
layout: docs
lang: es
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /es/docs/frankenphp.html
page_title: "FrankenPHP"
description: "Ejecutar TrueAsync PHP con FrankenPHP — inicio rápido con Docker, compilación desde el código fuente, configuración de Caddyfile, punto de entrada del worker asíncrono, reinicio gradual y solución de problemas."
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) es un servidor de aplicaciones PHP construido sobre [Caddy](https://caddyserver.com).
Incorpora el entorno de ejecución de PHP directamente en un proceso Go, eliminando la sobrecarga de un proxy FastCGI separado.

En el fork TrueAsync de FrankenPHP, un solo hilo PHP maneja **muchas solicitudes simultáneamente** —
cada solicitud HTTP entrante obtiene su propia corrutina, y el planificador de TrueAsync alterna entre ellas
mientras esperan operaciones de E/S.

```
FPM tradicional / FrankenPHP estándar:
  1 solicitud → 1 hilo  (bloqueado durante E/S)

TrueAsync FrankenPHP:
  N solicitudes → 1 hilo  (corrutinas, E/S no bloqueante)
```

## Inicio rápido — Docker

La forma más rápida de probar la configuración es con la imagen Docker preconstruida:

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

Abra [http://localhost:8080](http://localhost:8080) — verá el panel en vivo mostrando la versión de PHP,
las corrutinas activas, la memoria y el tiempo de actividad.

### Etiquetas de imagen disponibles

| Etiqueta | Descripción |
|----------|-------------|
| `latest-frankenphp` | Última estable, último PHP |
| `latest-php8.6-frankenphp` | Última estable, PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | Versión específica |

### Ejecutar su propia aplicación PHP

Monte el directorio de su aplicación y proporcione un `Caddyfile` personalizado:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## Instalación desde el código fuente

Compilar desde el código fuente le proporciona un binario nativo `frankenphp` junto con el binario `php`.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

O de forma interactiva — el asistente le preguntará sobre FrankenPHP como parte de la selección del conjunto de extensiones.

Se requiere Go 1.26+ para la compilación. Si no se encuentra, el instalador lo descarga y lo usa automáticamente
sin afectar la instalación del sistema.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Go se instala a través de Homebrew si es necesario.

### Qué se instala

Tras una compilación exitosa, ambos binarios se colocan en `$INSTALL_DIR/bin/`:

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # FrankenPHP server binary
```

## Configuración de Caddyfile

FrankenPHP se configura mediante un `Caddyfile`. La configuración mínima para un worker asíncrono de TrueAsync:

```caddyfile
{
    admin off
    frankenphp {
        num_threads 4   # total PHP threads across all workers (default: 2× CPU cores)
    }
}

:8080 {
    root * /app
    php_server {
        index off
        file_server off
        worker {
            file /app/entrypoint.php
            num 1
            async
            match /*
        }
    }
}
```

### Directivas globales de `frankenphp`

| Directiva | Descripción |
|-----------|-------------|
| `num_threads N` | Tamaño total del pool de hilos PHP. Por defecto `2 × núcleos de CPU`. Todos los workers comparten este pool |

### Directivas clave del worker

| Directiva | Descripción |
|-----------|-------------|
| `file` | Ruta al script PHP de punto de entrada |
| `num` | Número de hilos PHP asignados a este worker. Comience con `1` y ajuste según la carga de trabajo vinculada a CPU |
| `async` | **Obligatorio** — habilita el modo de corrutinas de TrueAsync |
| `drain_timeout` | Período de gracia para solicitudes en curso durante el reinicio gradual (por defecto `30s`) |
| `match` | Patrón de URL manejado por este worker |

### Múltiples workers

Puede ejecutar diferentes puntos de entrada para diferentes rutas:

```caddyfile
:8080 {
    root * /app
    php_server {
        worker {
            file /app/api.php
            num 2
            async
            match /api/*
        }
        worker {
            file /app/web.php
            num 1
            async
            match /*
        }
    }
}
```

## Escritura del punto de entrada

El punto de entrada es un script PHP de larga ejecución. Registra un callback para manejar solicitudes y luego
cede el control a `FrankenPHP`, que se bloquea hasta que el servidor se apaga.

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

set_time_limit(0);

HttpServer::onRequest(function (Request $request, Response $response): void {
    $path = parse_url($request->getUri(), PHP_URL_PATH);

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello from TrueAsync! Path: $path");
    $response->end();
});
```

### Objeto Request

```php
$request->getMethod();    // GET, POST, ...
$request->getUri();       // Full request URI
$request->getHeaders();   // Array of all HTTP headers
$request->getHeader($name); // Single header value
$request->getBody();      // Raw request body string
```

### Objeto Response

```php
$response->setStatus(int $code);
$response->setHeader(string $name, string $value);
$response->write(string $data);   // Can be called multiple times (streaming)
$response->end();                 // Finalize and send the response
```

> **Importante:** siempre llame a `end()`, incluso cuando el cuerpo esté vacío. `write()` pasa el buffer de PHP
> directamente a Go sin copiar; `end()` libera la referencia de escritura pendiente y señala
> que la respuesta está completa. Omitir `end()` dejará la solicitud colgada.

`getBody()` lee el cuerpo completo de la solicitud de una vez y lo devuelve como cadena. El cuerpo se almacena en buffer
del lado de Go, por lo que la lectura no es bloqueante desde la perspectiva de PHP.

### E/S asíncrona dentro del handler

Dado que cada solicitud se ejecuta en su propia corrutina, puede usar llamadas de E/S bloqueantes libremente —
cederán la corrutina en lugar de bloquear el hilo:

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    // Both requests run concurrently in the same PHP thread
    $db   = new PDO('pgsql:host=localhost;dbname=app', 'user', 'pass');
    $rows = $db->query('SELECT * FROM users LIMIT 10')->fetchAll();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($rows));
    $response->end();
});
```

### Lanzar corrutinas adicionales

El handler en sí ya es una corrutina, por lo que puede usar `spawn()` para trabajo secundario:

```php
use function Async\spawn;
use function Async\await;

HttpServer::onRequest(function (Request $request, Response $response): void {
    // Fan-out: run two DB queries concurrently
    $users  = spawn(fn() => fetchUsers());
    $totals = spawn(fn() => fetchTotals());

    $data = [
        'users'  => await($users),
        'totals' => await($totals),
    ];

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($data));
    $response->end();
});
```

## Optimización

### Número de hilos del worker (`num`)

Cada hilo PHP ejecuta un bucle del planificador de TrueAsync. Un solo hilo ya maneja miles de
solicitudes concurrentes vinculadas a E/S mediante corrutinas. Agregue más hilos solo cuando tenga trabajo vinculado a CPU
que se beneficie del verdadero paralelismo (cada hilo se ejecuta en un hilo del sistema operativo separado gracias a ZTS).

Un buen punto de partida:

```
API con mucha E/S:       num 1–2
Carga mixta:             num = número de núcleos de CPU / 2
Uso intensivo de CPU:    num = número de núcleos de CPU
```

## Reinicio gradual

Los workers asíncronos admiten **reinicios azul-verde** — el código se recarga sin descartar las solicitudes en curso.

Cuando se activa un reinicio (a través de la API de administración, un observador de archivos o la recarga de configuración):

1. Los hilos antiguos se **desconectan** — no se les enrutan nuevas solicitudes.
2. Las solicitudes en curso obtienen un período de gracia (`drain_timeout`, por defecto `30s`) para finalizar.
3. Los hilos antiguos se apagan y liberan sus recursos (notificador, canales).
4. Los hilos nuevos arrancan con el código PHP actualizado.

Durante la ventana de drenaje, las nuevas solicitudes reciben `HTTP 503`. Una vez que los nuevos hilos están listos, el tráfico se reanuda normalmente.

### Activar mediante la API de administración

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

La API de administración de Caddy escucha en `localhost:2019` por defecto. Para habilitarla, elimine `admin off` de
su bloque global (o restrínjala a localhost):

```caddyfile
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Configurar el tiempo de drenaje

```caddyfile
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## Verificar la instalación

```bash
# Version
frankenphp version

# Start with a config
frankenphp run --config /etc/caddy/Caddyfile

# Validate the Caddyfile without starting
frankenphp adapt --config /etc/caddy/Caddyfile
```

Verifique que TrueAsync está activo desde PHP:

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## Solución de problemas

### Las solicitudes nunca llegan al handler PHP

Asegúrese de que el worker tenga `async` habilitado **y** que el matcher de Caddy enrute el tráfico hacia él.
Sin `match *` (o un patrón específico), ninguna solicitud llega al worker asíncrono.

### `undefined reference to tsrm_*` durante la compilación

PHP fue compilado con `--enable-embed=shared`. Recompile sin `=shared`:

```bash
./configure --enable-embed --enable-zts --enable-async ...
```

### Las solicitudes reciben `HTTP 503`

Todos los hilos PHP están ocupados y el período de gracia está activo (ventana de drenaje durante un reinicio),
o la cola de hilos está saturada. Aumente `num` para agregar más hilos, o reduzca `drain_timeout`
si los despliegues están tardando demasiado.

## Depuración con Delve

Go 1.25+ genera información de depuración **DWARF v5**. Si Delve reporta un error de compatibilidad, recompile
con DWARF v4:

```bash
GOEXPERIMENT=nodwarf5 go build -tags "trueasync,nowatcher" -o frankenphp ./caddy/frankenphp
```

Ejecute el depurador:

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv exec ./frankenphp
```

## Código fuente

| Repositorio | Descripción |
|-------------|-------------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | Fork TrueAsync de FrankenPHP (rama `true-async`) |
| [true-async/releases](https://github.com/true-async/releases) | Imágenes Docker, instaladores, configuración de compilación |

Para una inmersión profunda en cómo funciona internamente la integración Go ↔ PHP, consulte la página [Arquitectura de FrankenPHP](/es/architecture/frankenphp.html).
