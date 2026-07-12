---
layout: tutorial
lang: es
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /es/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler(): unario y streaming, readMessage/writeMessage, trailers y deadlines."
---

# gRPC

Hasta ahora solo los navegadores han hablado con nuestro servidor. Pero
`ProfileService` tiene también otros interlocutores: `UserDirectory`,
`GeoDirectory`, facturación. Los servicios llevan mucho hablando entre
sí no sobre REST sino sobre gRPC: contratos estrictos, streaming en
ambas direcciones, deadlines y códigos de error de fábrica.

Normalmente se levanta un servidor aparte para gRPC en un puerto aparte.
Pregúntate: ¿por qué, en realidad? gRPC es un protocolo sobre HTTP/2 y
HTTP/3. Sobre lo que ya está escuchando para nosotros. El servidor solo
necesita distinguir tales peticiones por el content-type
`application/grpc` y entregarlas a un handler aparte. Y eso es
exactamente lo que hace.

## El contrato primero

Una conversación gRPC no empieza con código. Empieza con un contrato, y
esa es quizás la principal diferencia cultural con REST. Describamos el
servicio de perfiles en `profile.proto`:

```protobuf
syntax = "proto3";
package profile;

service ProfileService {
  rpc GetProfile (GetProfileRequest) returns (Profile);
}

message GetProfileRequest { int64 user_id = 1; }

message Profile {
  int64  id     = 1;
  string name   = 2;
  string region = 3;
}
```

El compilador de protobuf genera clases PHP a partir de esto, y el
runtime se instala con Composer:

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

Ahora el proyecto tiene `Profile\GetProfileRequest` y `Profile\Profile`:
getters, setters y serialización tipados. Y protoc generará exactamente
las mismas clases para un cliente en Go, Java o Python. Ese es todo el
sentido: un contrato, cualquier lenguaje.

## Mensajes en lugar de cuerpos

¿En qué se diferencia un handler gRPC de un handler HTTP? En la unidad
de comunicación. Allí teníamos un "cuerpo de la petición" y un "cuerpo
de la respuesta", uno de cada. Aquí es un flujo de mensajes en cada
dirección: `readMessage()` devuelve los bytes del siguiente entrante o
`null` al final, y `writeMessage()` envía uno saliente. El servidor es
responsable del framing de gRPC, las longitudes y los flags. Las clases
generadas son responsables del contenido:

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // la ruta de la petición nombra el método del contrato
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // bytes -> objeto

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // objeto -> bytes
});
```

El enrutamiento aquí es solo la ruta: paquete, servicio, método. Un
cliente en cualquier lenguaje, al llamar a `GetProfile`, envía un POST a
`/profile.ProfileService/GetProfile`. Y el handler mismo vive junto a
las rutas REST y ve el mismo pool ya calentado y el contexto de la
petición.

Las cuatro formas de gRPC salen de esta misma API y difieren solo en el
número de llamadas:

```php
// Unario: un mensaje allá, uno de vuelta
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server streaming: uno allá, muchos de vuelta
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Full duplex: leer y responder intercalados
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` duerme a la corrutina hasta el siguiente mensaje, y
`writeMessage()` responde de inmediato, sin esperar el final del flujo
entrante. El mismo dúplex que WebSocket, solo que con un contrato y por
el estándar.

## Pasar los errores

gRPC tiene su propio sistema de códigos de error, y vive en un lugar que
al principio confunde. El status HTTP de la respuesta es siempre 200.
Siempre. El resultado real viaja en los trailers, cabeceras que HTTP/2
envía después del cuerpo. Los vislumbramos en el capítulo de streaming, y
aquí está su principal consumidor:

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // un return limpio: el propio servidor añade grpc-status: 0 (OK)
});
```

Los fallos también se manejan: una excepción que sale volando del
handler se convierte en `grpc-status: 13` (INTERNAL), en lugar de una
conexión descartada.

## Deadlines

¿Recuerdas cuántos capítulos de la primera serie dedicamos a la idea de
que "toda espera debe tener un límite"? Pues bien, en gRPC esa idea se
eleva a estándar del protocolo. El cliente pasa su deadline justo en la
petición, vía la cabecera `grpc-timeout`, y el servidor se lo entrega al
handler:

```php
$deadline = $req->getGrpcTimeout(); // milisegundos o null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

Piensa en lo acertada que es esta mecánica. ¿Al cliente le quedan
doscientos milisegundos de paciencia? Entonces no tiene sentido ir a
`GeoDirectory` con un timeout de dos segundos. El deadline se hila a
través de todas las esperas internas, a través de todos los servicios de
la cadena, y todo el sistema respeta la paciencia del primerísimo que
llamó.

## El fin de la segunda serie

Esa es toda la ruta. Echemos una mirada atrás una vez.

Los quince capítulos de la primera serie iban construyendo un
vocabulario: corrutinas, cancelación, `Future`, canales, scope, grupos,
pools, hilos, contexto. Honestamente, en algunos puntos pudo parecer que
el vocabulario era excesivo. Y luego llegó la segunda serie, y resultó
que el servidor no es más que una frase compuesta de esas mismas
palabras. Cada petición es una corrutina. El pool protege la base de
datos. El scope limpia tras la petición. El backpressure contiene la
sobrecarga. Los hilos ocupan los núcleos. Y encima, estático, SSE,
WebSocket y gRPC en un puerto.

Nota también lo que no estuvo en ninguna de las series: callbacks,
cadenas de `.then()`, las palabras clave `async` y `await` en línea sí y
línea también, la gestión manual del event loop. Todo el código es PHP
secuencial corriente. Simplemente dejó de esperar por nada.

De aquí en adelante estás por tu cuenta. Toma el servicio que lleva
tiempo pidiendo una remodelación, y empieza con un solo handler. La
referencia de clases está en la [documentación del
servidor](/es/docs/server/index.html), y las tripas están en la
[arquitectura](/es/architecture/server.html). Y si algo se comporta de
forma distinta a lo que prometieron estos capítulos, ya sabes lo
suficiente para presentar un buen reporte de bug.
