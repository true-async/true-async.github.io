---
layout: tutorial
lang: es
path_key: "/tutors-server/04-streaming-uploads.html"
nav_active: docs
permalink: /es/tutors-server/04-streaming-uploads.html
page_title: "Flujos de bytes"
description: "send() y sendable(), transmisión del cuerpo, subida de archivos y sendFile()."
---

# Flujos de bytes

Hasta ahora nuestras respuestas han sido pequeñas y enteras,
construidas con `setBody()` y `json()`. Para una API eso es justo lo
que quieres.

Pero `ProfileService` ha asumido tareas de otro calibre. Contabilidad
quiere una exportación de todo el año, y eso son cientos de megabytes
de `CSV`. Los usuarios suben archivos de importación, y esos tampoco
son pequeños. Hagamos las cuentas a grandes rasgos: cincuenta
peticiones concurrentes, cada una reteniendo cien megabytes en memoria...
no, mejor no seguimos contando, ya está claro cómo termina eso.

Necesitamos aprender a trabajar con los cuerpos por partes. En ambas
direcciones.

## La respuesta por partes: send()

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->setStatusCode(200)
        ->setHeader('Content-Type', 'text/csv');

    foreach (exportRows() as $row) {
        $res->send(implode(',', $row) . "\n");
    }
});
```

El primer `send()` fija el estado y las cabeceras, tras lo cual los
fragmentos van al cliente a medida que están listos: chunked en
HTTP/1.1, tramas DATA en HTTP/2. En cualquier momento vive en memoria
una sola fila. ¡Un flujo de bytes hacia el cliente toma forma!

Ahora una pregunta para poner a prueba tu ingenio. Generamos filas
desde la base de datos a, digamos, un gigabit por segundo. Y el cliente
está descargando por internet móvil en un tren. ¿A dónde van las filas
de más?

Si leíste el capítulo sobre canales, ya tienes la respuesta:
backpressure. Cuando el búfer del flujo se llena, `send()` suspende la
corrutina del handler. El cliente vació la cola, la corrutina despertó,
la generación continuó. La exportación se ajusta sola a la velocidad
del cuello de botella más estrecho, y fíjate, ¡no escribimos una sola
línea para ello!

Esperar a un cliente lento, sin embargo, no siempre es lo que quieres:

```php
if (!$res->sendable()) {
    // send() bloqueará ahora mismo. Digamos que no vamos a esperar.
}
```

`send()` siempre es seguro. `sendable()` solo te avisa: la siguiente
llamada se irá a dormir. Qué hacer a continuación depende de ti.

> Todavía existe un tipo popular de ataque con clientes lentos: abren
> una conexión y no leen, hasta que el servidor se bloquea.
> Para un servidor de corrutinas esto es menos temible, ya que cada
> corrutina cuesta mucho menos que un proceso o un hilo.
> Aun así, el límite general de corrutinas es un parámetro importante,
> igual que las demás opciones de seguridad adicionales.
>

## El cuerpo de la petición por partes: readBody()

La situación inversa. Un usuario sube un CSV de un gigabyte, y por
defecto el handler se llama una vez que se ha leído el cuerpo entero.
La palabra "gigabyte" y las palabras "en memoria" en una misma frase
son justo lo que acordamos evitar.

Activamos el modo de streaming:

```php
$config->setBodyStreamingEnabled(true);
```

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $file = fopen('/var/imports/' . bin2hex(random_bytes(8)) . '.csv', 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($file, $chunk);
        $total += strlen($chunk);
    }

    fclose($file);
    $res->json(['received' => $total]);
});
```

En el servidor `TrueAsync` el handler arranca justo después de las
cabeceras, lo bastante pronto. De hecho, el trabajo de la corrutina
ocurre precisamente al ritmo de la recepción de datos desde el socket.
Por eso trabajar aquí con el flujo de datos encaja de forma natural.

Si ejecutas cincuenta subidas concurrentes de 20 MiB, el pico de
memoria habría sido de 1170 MiB y pasó a ser 197. El rendimiento creció
casi el triple, porque el procesamiento comienza sin esperar a que
termine la subida. Nada mal para una línea de configuración.

## Formularios con archivos: UploadedFile

El clásico formulario HTML con un archivo es un caso más fácil, y para
él no necesitas activar nada. El multipart siempre se analiza como un
flujo, y el handler recibe objetos listos para usar:

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $csv = $req->getFile('import');

    if ($csv === null || !$csv->isValid()) {
        throw new HttpException('File is required', 422);
    }

    $csv->moveTo('/var/imports/' . $csv->getClientFilename());
    $res->json(['size' => $csv->getSize()]);
});
```

Cualquiera que haya visto PSR-7 se siente como en casa: `moveTo()`,
`getSize()`, `getClientFilename()`. Varios archivos en un mismo campo
(`photos[]`) llegan como un array a través de `getFiles()`.

## Servir archivos: sendFile()

Queda servir archivos ya listos. Esto es lo único que no deberías
montar a mano a partir de `fopen` y `send()`, y he aquí por qué:

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->sendFile('/var/reports/2026-06.csv', new SendFileOptions(
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: 'report-june.csv',
        cacheControl: 'private, max-age=3600',
    ));
});
```

Detrás de esa única llamada se esconden unos treinta años de historia
de HTTP. `Content-Type` a partir de la extensión. `ETag` y
`Last-Modified`, para que una petición repetida se resuelva con un
breve 304. Descargas reanudables mediante `Range` cuando el cliente se
cayó a la mitad. Servir un vecino precomprimido (`report.csv.gz`) si el
cliente entiende gzip. Y todo ello con lecturas asíncronas desde disco,
sin retener el bucle de eventos. Escribir esto a mano significa olvidar
al menos la mitad.

Una regla: después de `sendFile()` la respuesta queda sellada.
Escribir algo más en ella no funcionará, obtendrás una excepción.

Ahora podemos tanto recibir como servir un archivo de un gigabyte. Pero
fíjate a quién le servimos todo esto a través de un handler de PHP:
informes protegidos por permisos de acceso, archivos tras enlaces de un
solo uso. ¿Y el CSS? ¿Y el logo? Son los mismos para todos, y levantar
una corrutina para cada uno de ellos resulta un poco incómodo. Ese es
el siguiente capítulo, y será corto.
