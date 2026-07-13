---
layout: tutorial
lang: es
path_key: "/tutors-server/01-first-server.html"
nav_active: docs
permalink: /es/tutors-server/01-first-server.html
page_title: "Tu primer servidor"
description: "Un servidor HTTP dentro de PHP: HttpServer, HttpServerConfig y tu primer handler."
---

# Tu primer servidor

Recordemos cómo PHP suele atender una petición. Nginx acepta la
conexión y se la pasa a PHP-FPM. FPM toma un proceso libre. El proceso
despierta, carga clases, abre una conexión con la base de datos,
ensambla la respuesta, la envía. Y muere. Todo lo que logró construir,
cada conexión, cada caché, todos esos pools tan bien precalentados de
la primera serie, va a la basura. Un milisegundo después llega la
siguiente petición, y toda la historia se repite desde cero. Cien
veces por segundo. Mil.

Mientras tanto, en la primera serie construimos todo un arsenal de
cosas para las que semejante vida está contraindicada: un pool de
conexiones es bueno cuando vive mucho tiempo, y un `Future` memoizado
no tiene sentido si muere junto con el proceso.

Así que el plan de esta serie es simple: eliminar a los
intermediarios. `TrueAsync Server` es una extensión que ejecuta un
servidor `HTTP` directamente dentro del proceso de `PHP`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    new HttpServerConfig()->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

```bash
$ php server.php &
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
Content-Length: 13

Hello, World!
```

`addListener` abre un puerto, `addHttpHandler` registra una función
handler, y `start()` lanza el bucle de eventos y nunca retorna. Cada
petición entrante ejecuta el handler.

## Un handler es una corrutina

Cada invocación del handler se ejecuta en su propia corrutina
(`spawn`). ¿Qué significa eso en la práctica? Hagamos un experimento.
Añadiremos al servidor una ruta deliberadamente lenta:

```php
use function Async\delay;

$server->addHttpHandler(function ($request, $response) {
    if ($request->getPath() === '/slow') {
        delay(5000); // cinco segundos de trabajo de E/S "pesado"
        $response->setBody("was slow\n");
        return;
    }

    $response->setBody("fast\n");
});
```

Ahora abre dos terminales. En la primera, pide `/slow`. Se queda
colgada, esperando a que pasen sus cinco segundos. Sin esperar a que
termine, pide `/` en la segunda terminal:

```bash
$ curl http://localhost:8080/
fast
```

Al instante.

Si leíste la primera serie, ya entiendes lo que pasó. La corrutina de
`/slow` se durmió en `delay`, el planificador pasó el control, y el
servidor atendió tranquilamente la segunda petición. Son los mismos
contadores "A" y "B" del primer capítulo, solo que ahora se llaman
peticiones HTTP. Un hilo. Un bucle de eventos. Miles de clientes
concurrentes.

Ahora imagina lo que ese mismo `/slow` le haría a un FPM clásico.
Cinco segundos de sueño son cinco segundos durante los cuales un worker
entero queda fuera de servicio. Una docena de peticiones así y el pool
de workers se agota. Todo el sitio se detiene y espera mientras alguien
termina su siesta.

## Un proceso que no muere

La segunda consecuencia es más interesante que la primera, aunque
parezca de lo más mundana. `start()` nunca retorna. Lo que significa
que todo lo creado antes vive tanto como el servidor:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX     => 10,
]);

$directory = new RegionsDirectory(); // memoización del capítulo seis

$server->addHttpHandler(function ($request, $response) use ($pdo, $directory) {
    // el pool ya está caliente, el directorio ya está cargado
});

$server->start();
```

El pool de conexiones se abre una vez. El directorio de regiones se
carga una vez. Las rutas se compilan una vez. ¿Recuerdas cuánto
esfuerzo dedicó la primera serie a las herramientas de reutilización?
Aquí es donde todo eso por fin encuentra su lugar. El arranque en frío
no se hizo más rápido. Desapareció.

Para ser justos, la vida larga tiene un precio, y conviene decirlo de
entrada. Una fuga de memoria ya no se perdona con la muerte del proceso
tras la petición. Una variable global ya no es "para una sola
petición", es para siempre y para todos. No hay que entrar en pánico:
el scope, los pools y el contexto de la primera serie se inventaron
justo para esto, y cubriremos los detalles específicos del servidor en
un capítulo aparte.

Por ahora nuestro servidor tiene un problema más simple: responde lo
mismo a todo. `GET /profile/42`, `POST /profile/42/address`, una errata
en la URL, da igual. Un `ProfileService` de verdad tendrá que aprender
a leer la petición. Eso es lo que abordaremos a continuación.
