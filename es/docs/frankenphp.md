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

```txt
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

```txt
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

Todos los datos de la solicitud se obtienen del objeto `http.Request` de Go vía CGO — sin variables globales SAPI, seguro para corrutinas concurrentes.

| Método | Retorno | Descripción |
|--------|---------|-------------|
| `getMethod()` | `string` | Método HTTP (`GET`, `POST`, etc.) |
| `getUri()` | `string` | URI completa de la solicitud con query string |
| `getHeader(string $name)` | `?string` | Valor de un encabezado o `null` |
| `getHeaders()` | `array` | Todos los encabezados como `name => value` (valores múltiples unidos con `, `) |
| `getBody()` | `string` | Cuerpo completo de la solicitud (se lee una vez) |
| `getQueryParams()` | `array` | Parámetros de query string analizados y decodificados |
| `getCookies()` | `array` | Cookies analizadas y decodificadas del encabezado `Cookie` |
| `getHost()` | `string` | Valor del encabezado Host |
| `getRemoteAddr()` | `string` | Dirección del cliente (`ip:port`) |
| `getScheme()` | `string` | `http` o `https` |
| `getProtocolVersion()` | `string` | Protocolo (`HTTP/1.1`, `HTTP/2.0`) |
| `getParsedBody()` | `array` | Campos del formulario (urlencoded + multipart) |
| `getUploadedFiles()` | `array` | Archivos cargados como objetos `UploadedFile` |

### Objeto Response

Los encabezados y el estado se almacenan en el propio objeto (no en variables globales SAPI), se serializan y se envían a Go en una única llamada CGO en `end()`.

| Método | Retorno | Descripción |
|--------|---------|-------------|
| `setStatus(int $code)` | `void` | Establecer el estado HTTP (por defecto 200) |
| `getStatus()` | `int` | Obtener el código de estado actual |
| `setHeader(string $name, string $value)` | `void` | Establecer un encabezado (reemplaza el existente) |
| `addHeader(string $name, string $value)` | `void` | Agregar un encabezado (para `Set-Cookie`, etc.) |
| `removeHeader(string $name)` | `void` | Eliminar un encabezado |
| `getHeader(string $name)` | `?string` | Obtener el primer valor de un encabezado o `null` |
| `getHeaders()` | `array` | Todos los encabezados como `name => [values...]` |
| `isHeadersSent()` | `bool` | Si ya se llamó a `end()` |
| `redirect(string $url, int $code = 302)` | `void` | Establecer encabezado Location + estado |
| `write(string $data)` | `void` | Almacenar el cuerpo de la respuesta en buffer (se puede llamar varias veces) |
| `end()` | `void` | Enviar estado + encabezados + cuerpo al cliente. **Obligatorio llamar.** |

> **Importante:** siempre llame a `end()`, incluso cuando el cuerpo esté vacío. `write()` almacena los datos en buffer
> en el objeto PHP; `end()` serializa los encabezados y el cuerpo y los copia a Go en una única llamada CGO.
> Omitir `end()` dejará la solicitud colgada.

### Objeto UploadedFile

`getUploadedFiles()` devuelve objetos `FrankenPHP\UploadedFile`. Go analiza multipart mediante `http.Request.ParseMultipartForm`, guarda los archivos en un directorio temporal y pasa los metadatos a PHP.

| Método | Retorno | Descripción |
|--------|---------|-------------|
| `getName()` | `string` | Nombre original del archivo |
| `getType()` | `string` | Tipo MIME |
| `getSize()` | `int` | Tamaño del archivo en bytes |
| `getTmpName()` | `string` | Ruta al archivo temporal |
| `getError()` | `int` | Código de error de carga (`UPLOAD_ERR_OK` = 0) |
| `moveTo(string $path)` | `bool` | Mover el archivo (rename o copy+delete) |

Varios archivos para un mismo campo se devuelven como un array de objetos `UploadedFile`.

### Ejemplo: Cookies y redirección

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    // Leer cookies de la solicitud
    $cookies = $request->getCookies();

    if (!isset($cookies['session'])) {
        // Establecer varias cookies
        $response->addHeader('Set-Cookie', 'session=abc123; Path=/; HttpOnly');
        $response->addHeader('Set-Cookie', 'theme=dark; Path=/');
        $response->redirect('/welcome');
        $response->end();
        return;
    }

    // Parámetros de query string
    $params = $request->getQueryParams();
    $name = $params['name'] ?? 'World';

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello, {$name}!");
    $response->end();
});
```

### Ejemplo: Carga de archivos

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    $files = $request->getUploadedFiles();
    $fields = $request->getParsedBody();

    if (isset($files['avatar'])) {
        $file = $files['avatar'];

        if ($file->getError() === UPLOAD_ERR_OK) {
            $file->moveTo('/uploads/' . $file->getName());
            $response->setStatus(200);
            $response->write("Uploaded: {$file->getName()} ({$file->getSize()} bytes)");
        } else {
            $response->setStatus(400);
            $response->write("Upload error: {$file->getError()}");
        }
    } else {
        $response->setStatus(400);
        $response->write('No file uploaded');
    }

    $response->end();
});
```

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

```txt
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Configurar el tiempo de drenaje

```txt
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

## Modelo de ejecución

- Cada hilo asíncrono utiliza un canal con buffer de 1 slot (por defecto). Establezca `buffer_size` para aumentar la cola de solicitudes por hilo (máximo 10). Si todos los hilos están ocupados y todos los buffers están llenos, el cliente recibe `503 (ErrAllBuffersFull)`.
- Las solicitudes despiertan al planificador PHP a través de un notificador (`eventfd` en Linux, `pipe` en otras plataformas) más una vía rápida mediante heartbeat para reducir la latencia de activación.
- `Response::write()` almacena los datos en buffer en el objeto PHP. `end()` serializa los encabezados y el cuerpo y los copia a Go en una única llamada CGO. Siempre llame a `end()`, incluso para un cuerpo vacío.
- Al apagarse, se envía un valor centinela a la cola; el bucle PHP libera las escrituras pendientes y restaura el manejador de heartbeat.

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
