---
layout: tutorial
lang: es
path_key: "/tutors-server/05-static.html"
nav_active: docs
permalink: /es/tutors-server/05-static.html
page_title: "Archivos estáticos"
description: "StaticHandler: servir archivos sin una corrutina de PHP, caché y políticas de seguridad."
---

# Archivos estáticos

`ProfileService` ha desarrollado un frontend. HTML, CSS, scripts,
avatares, lo de siempre. Antes los servía nginx, pero despedimos a
nginx con ceremonia en el primer capítulo. ¿Quién los sirve ahora?

El primer impulso es comprensible: escribir un handler que abra
archivos por URL. Alto. Piensa en lo que eso significa: miles de
peticiones del logo al día, y para cada una una corrutina, entrada en
PHP, `fopen`, salida. PHP aquí no hace nada que requiera PHP.

El servidor resuelve esto de forma radical. Una ruta estática se sirve
enteramente en C. Una petición a ella nunca entra en PHP en absoluto:

```php
use TrueAsync\StaticHandler;

$server->addStaticHandler(
    new StaticHandler('/assets/', '/var/www/profile/public')
);
```

Un prefijo de URL, un directorio en disco, listo. `GET
/assets/css/app.css` se convierte en una lectura asíncrona del archivo
directamente al socket, a través de libuv, sin pasar por PHP. Los
handlers de los capítulos anteriores siguen recibiendo todo lo demás.
Puede haber varios montajes, y las coincidencias se buscan en el orden
de registro. Toda la etiqueta HTTP de `sendFile` está aquí también:
`Content-Type`, `ETag` con 304, descargas reanudables mediante `Range`.

## Configurar un montaje

`StaticHandler` se configura con una cadena, antes de adjuntarlo al
servidor:

```php
$static = (new StaticHandler('/assets/', '/var/www/profile/public'))
    ->setCacheControl('public, max-age=86400')
    ->enablePrecompressed('br', 'zstd', 'gzip')
    ->hide('*.map', 'drafts/**')
    ->setOnMissing(StaticOnMissing::NEXT);

$server->addStaticHandler($static);
```

Vamos línea por línea.

**`setCacheControl`** — la cabecera de caché en cada respuesta.
Combinada con el `ETag` que está activo por defecto, el navegador vuelve
a descargar un archivo solo cuando el archivo realmente ha cambiado.

**`enablePrecompressed`** — mi elemento favorito. Si `app.css.br` está
junto a `app.css`, un cliente con un `Accept-Encoding` adecuado recibe
el archivo comprimido ya listo. Piensa en la economía: comprimes una
vez en la etapa de build del frontend, al nivel más caro y de mayor
calidad, y lo sirves un millón de veces sin gastar un solo ciclo en
compresión.

**`hide`** — globs que reciben un 404 independientemente de si el
archivo existe. Los source maps y los borradores no saldrán.

**`setOnMissing(NEXT)`** — el destino de las peticiones que no
encuentran un archivo. Por defecto un fallo responde 404 directamente
desde C. `NEXT` en cambio pasa la petición adelante, a un handler de
PHP ordinario. ¿Por qué? SPA. El archivo `/assets/app.js` se sirve
desde disco, mientras que un `/assets/whatever` inexistente cae hasta la
aplicación, que responde con su propio `index.html`.

Después de `addStaticHandler` el objeto queda bloqueado: el servidor ya
ha construido a partir de él sus estructuras de ruta caliente. Un
intento de tocar un setter después de eso es una excepción.

## Seguro por defecto

Una pequeña digresión. Servir archivos por URL es históricamente uno de
los agujeros más fértiles en los servidores web. `../../etc/passwd` en
la barra de direcciones es un truco más viejo que muchos lectores de
este capítulo.

Por eso la política de fábrica es paranoica. Las peticiones con `..`
reciben un 404. Las rutas a través de archivos con un punto inicial
reciben un 404: ni `.env` ni `.git` se filtrarán, aunque acaben por
accidente en el directorio. Los enlaces simbólicos no se desreferencian
en absoluto: el archivo debe estar físicamente dentro de la raíz del
montaje, y ningún symlink puede sacarlo de ahí.

Todo esto se puede relajar deliberadamente (`setDotfilePolicy`,
`setSymlinkPolicy`), pero los valores por defecto están elegidos para
que la opción de "enchúfalo y olvídate" sea segura.

## Cuando hay muchos archivos

Para los montajes calientes hay una palanca más:

```php
$static->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

La caché recuerda la ruta resuelta, los metadatos y las cabeceras de
los archivos más recientes y recorta el recorrido de syscalls en las
peticiones repetidas. En un directorio grande o en un sistema de
archivos de red se nota. En un sitio local pequeño no, y por eso está
desactivada por defecto.

Ese es todo el capítulo, prometí uno corto. Lo estático pasa volando
por delante de PHP, y PHP sigue con su trabajo. Y ahora que el servicio
tiene cara, es hora de darle vida. ¿Recuerdas la barra de progreso del
primer capítulo de la primera serie, la que se dibujaba en la terminal?
Está a punto de mudarse al navegador. Y el propio servidor la dibujará.
