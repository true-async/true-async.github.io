---
layout: docs
lang: es
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /es/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): conexiones full-duplex sobre RFC 6455, topics pub/sub entre workers, contrapresión, keepalive, negociación de subprotocolo, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` registra un manejador para conexiones full-duplex sobre
RFC 6455.

Una conexión empieza como una solicitud HTTP normal, y luego el cliente le pide al servidor que
la cambie a otro protocolo sobre esa misma conexión TCP: eso es un Upgrade. El servidor responde
con el status `101 Switching Protocols`, y desde ese momento la misma conexión transporta
WebSocket, no HTTP. Compatibilidad:

- Upgrade desde HTTP/1.1 (la clásica cabecera `Connection: Upgrade`).
- Upgrade desde HTTP/2 (RFC 8441 Extended CONNECT).
- `wss://` (WebSocket sobre TLS).
- permessage-deflate (RFC 7692), compresión a nivel de mensaje.
- [Topics pub/sub](#topics-publishsubscribe-en-todos-los-workers) que llegan a cada worker del
  proceso, así que un chat no necesita un servidor de un solo worker ni un broker externo.

> La implementación se verifica contra el conformance suite Autobahn|Testsuite y pasa los 246
> tests de la categoría `behavior`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});

// Obligatorio: el servidor se niega a arrancar sin un manejador HTTP, y este es
// el que responde a las solicitudes que no son upgrades.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

Registrar el manejador es lo que activa WebSocket: no hay un interruptor aparte que accionar.

> `HttpServerConfig::enableWebSocket()` parece ese interruptor, pero es un stub sin implementar
> que lanza `HttpServerRuntimeException` cuando se le pasa `true`, y `isWebSocketEnabled()`
> devuelve `false` incluso mientras WebSocket está sirviendo. No llames a ninguno de los dos
> ([server#134](https://github.com/true-async/server/issues/134)).

Cada conexión se atiende en su propia corrutina, el mismo modelo por solicitud que en HTTP.
Un manejador que lanza no se lleva al worker por delante: la excepción se registra en el log y al
peer se le avisa dentro del protocolo, con un status HTTP si el throw se adelantó al upgrade, o un
`CLOSE 1011` una vez que la sesión estaba viva.

El manejador siempre se llama con tres argumentos, y PHP descarta los que no declaraste, así que
`function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)` y la forma de tres
parámetros son todas válidas. Declara solo lo que uses.

## Ciclo de vida

Una conexión permanece abierta hasta que la corrutina del manejador retorna. Si el manejador
simplemente termina (por ejemplo, el bucle `recv()`/`foreach` obtuvo `null` al final), el
servidor cierra la conexión con código `1000 Normal` automáticamente. Un `close()` explícito
antes del `return` solo hace falta cuando se quiere un código distinto o un texto de razón
propio.

## Recibir mensajes: `recv()` y `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

Suspende la corrutina hasta que llega el siguiente mensaje o se cierra la conexión. Devuelve un
[`WebSocketMessage`](/es/docs/reference/server/websocket.html#websocketmessage) o `null` cuando
el cliente cerró la conexión de forma limpia (un código de cierre normal, o una desconexión sin
frame CLOSE explícito):

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` implementa `\Iterator`, así que el mismo bucle se puede escribir de forma más
concisa como `foreach ($ws as $msg) { ... }`. Un cierre limpio simplemente termina el `foreach`;
un cierre con error lanza `WebSocketClosedException` directamente desde el bucle.

Lee los mensajes desde un solo lugar: si llamas a `recv()` desde dos corrutinas en paralelo
sobre la misma conexión, la segunda llamada lanza `WebSocketConcurrentReadException`. Si
necesitas distribuir mensajes a varios manejadores, mantén un único bucle `recv()` y despacha tú
mismo desde ahí.

## Enviar mensajes: `send()`, `trySend()`

`send()` y `sendBinary()` son seguros de llamar desde cualquier corrutina, incluidas varias a la
vez: el servidor garantiza que los datos de llamadas distintas nunca se mezclan en el cable.

```php
$ws->send('text frame');       // el texto DEBE ser UTF-8 válido
$ws->sendBinary($binaryData);  // los datos binarios no tienen restricción de codificación
```

Normalmente estas funciones devuelven el control de inmediato. Si el cliente lee lento y el
buffer de envío se llena, la corrutina se suspende y se reanuda en cuanto el cliente vacía algo
del buffer. Si la espera se prolonga más de `write_timeout_ms`, se lanza
`WebSocketBackpressureException`, y el manejador decide qué hacer: descartar el mensaje, cerrar
la conexión, o reintentar.

Para hacer broadcast de un mensaje a muchos clientes, donde un cliente lento no debe frenar a
los demás, existen variantes no bloqueantes:

```php
if (!$ws->trySend($text)) {
    // el buffer de este cliente está lleno, el mensaje NO se envió, el cliente se está quedando atrás
}
```

`trySend()`/`trySendBinary()` nunca suspenden la corrutina: devuelven `true` de inmediato si el
mensaje fue aceptado, y `false` si el buffer está lleno (en cuyo caso el mensaje simplemente no
se envía). El tamaño del buffer lo fija
[`HttpServerConfig::setStreamWriteBufferBytes()`](/es/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` elimina el límite: `trySend()` siempre envía y devuelve `true`).

## Topics: publish/subscribe en todos los workers

Un worker es un hilo con su propio contexto PHP. Así que la forma obvia de construir un chat
—mantener un array de conexiones y recorrerlo— solo puede llegar a los peers de *un* worker, y por
eso semejante chat tenía que correr sobre `setWorkers(1)`.

Los topics arreglan eso. Viven en el servidor, no en tu manejador: cada worker indexa las
conexiones que posee, y un `publish()` se entrega a cada worker, que luego lo reparte a sus propios
sockets. Sin Redis, sin message broker, sin servidor de un solo worker.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // llega a los suscriptores de TODOS los workers
    }
});
```

Un topic se direcciona por **nombre, en el punto de llamada**. No hay un objeto topic que obtener,
retener o pasar a un manejador.

### Los filtros siguen a MQTT

Los niveles se separan con `/`, `+` casa exactamente un nivel, y un `#` final casa el resto:

| Filtro | Recibe |
|--------|--------|
| `chat/general` | exactamente ese topic |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — un nivel, cualquier valor |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — todo el subárbol |

Los comodines pertenecen a las *suscripciones*. Un **topic de publicación debe ser concreto**: un
mensaje repartido a un patrón no tiene un destino bien definido, así que `publish('chat/+/typing', …)`
lanza `WebSocketException`. Los filtros pueden tener hasta 128 niveles de profundidad.

### La API

```php
$ws->subscribe('chat/+/typing');            // idempotente
$ws->unsubscribe('chat/+/typing');          // idempotente
$ws->getTopics();                           // string[] — los filtros de esta conexión

$ws->publish('chat/general', $text);        // texto, a cada worker
$ws->publishBinary('chat/general', $bytes); // contraparte binaria

$ws->subscriberCount('chat/general');       // a través de todos los workers, comodines incluidos
```

`publish()` **nunca suspende**. Un peer cuya cola de salida va atascada descarta el mensaje en
lugar de frenar la entrega al resto del topic —la misma semántica que `trySend()`—. Cuando
necesitas una garantía de entrega, haz `send()` a esa única conexión en su lugar. Un suscriptor
que casa con varios de sus propios filtros aun así recibe exactamente una copia.

`$excludeSelf` es `true` por defecto —el caso "todos menos el remitente" que quiere un chat—:

```php
$ws->publish('chat/general', $msg->data);                      // el remitente no lo recibe de vuelta
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // el remitente también lo recibe
```

El valor de retorno es el número de suscriptores atendidos **solo en el worker que llama**. La
entrega a los otros workers es asíncrona y no se puede contar en el punto de llamada, así que este
es un número local, no de todo el proceso. `subscriberCount()` es el de todo el proceso, pero como
cada worker responde con su propio recuento y las respuestas se suman, es una instantánea más que
un contador en vivo, y un worker que no responde a tiempo queda fuera.

Una conexión que se cierra se da de baja de todo por su cuenta.

### Límites

Ambos están off por defecto, que es lo que envía todo broker self-hosted (EMQX
`max_subscriptions` / `messages_rate`, NATS `max_subs`): solo la aplicación sabe cuántos topics
necesita.

```php
$config
    ->setWsMaxSubscriptions(32)          // filtros distintos que una conexión puede mantener
    ->setWsPublishRateLimit(50, burst: 100);
```

Fija `setWsMaxSubscriptions()` siempre que la entrada del cliente llegue a `subscribe()` —por
ejemplo `$ws->subscribe($msg->data)`— para que un peer no pueda hacer crecer sin fin el árbol de
topics del worker. Superado el tope, `subscribe()` lanza `WebSocketException` y la conexión sigue
en pie.

`setWsPublishRateLimit()` es un token bucket por conexión. `publish()` es la única llamada
WebSocket que un peer sin privilegios puede convertir en trabajo en *cada* worker del proceso;
`send()` y `trySend()` solo tocan su propio socket. Sin medir, un cliente en bucle sobre un mensaje
retransmitido llena el inbox de cada worker, y los descartes que siguen se llevan por delante
también el tráfico de *otros* topics. Superada la tasa, `publish()` lanza
`WebSocketBackpressureException` y la conexión sigue en pie: al remitente se le avisa, en lugar de
que el mensaje se esfume en un mailbox lleno donde nadie puede verlo.

`$burst` es la profundidad del bucket en mensajes —cuánto puede adelantarse un manejador respecto a
la tasa sostenida—. `0` significa el equivalente a un segundo.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### Qué cuesta

Cada worker resume sus suscripciones en un counting Bloom filter de prefijos de topic, y un
publisher se salta los workers que demostrablemente no tienen ningún suscriptor en lugar de
despertarlos a todos. Un publish a un topic que nadie del proceso escucha cuesta cero wake-ups
entre workers. `HttpServer::getRuntimeStats()` reporta el resultado: `ws_topic_posted`,
`ws_topic_skipped` (el filtro ganándose el sueldo) y `ws_topic_dropped` (el mailbox de un worker
estaba lleno: ese es pérdida de datos).

Los topics funcionan en todos los transportes WebSocket, no solo en HTTP/1 en texto claro: sobre
TLS, sobre HTTP/2 Extended CONNECT, y con permessage-deflate, donde un mismo `publish()` atiende
a un peer comprimido y a uno en claro codo con codo, cada uno con el framing que negoció.

## La dirección del cliente

```php
$ws->getRemoteAddress();   // "203.0.113.7" o "2001:db8::1" — IP pelada, sin puerto
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` devuelve la **IP pelada**: sin puerto, y sin corchetes alrededor de un literal
IPv6 —la misma forma que `$_SERVER['REMOTE_ADDR']`—, así que alimenta directamente a
`filter_var(…, FILTER_VALIDATE_IP)`, a una ACL o a un rate limiter. Ambos devuelven `null` en un
listener de socket Unix, que no tiene un peer con IP.

Este es el peer de la conexión TCP. **No** se deriva de `X-Forwarded-For`: detrás de un proxy,
parsea esa cabecera tú mismo, y solo cuando confías en el proxy que la puso.

> **Cambio incompatible.** `getRemoteAddress()` antes devolvía `"host:port"` (y `""` cuando no
> había peer con IP). Ahora devuelve la IP pelada, y `null`. Usa `getRemotePort()` para el puerto.

## Cerrar una conexión: `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

Inicia el cierre de la conexión. Seguro de llamar más de una vez: las llamadas posteriores no
hacen nada. El código de cierre es un valor
[`WebSocketCloseCode`](/es/docs/reference/server/websocket.html#websocketclosecode) o un entero
en el rango `4000..4999` (reservado para códigos específicos de la aplicación). `$reason` acepta
texto UTF-8, hasta 123 bytes.

`isClosed()` devuelve `true` después de `close()`, o después de que el cliente envíe su propia
señal de cierre.

## Ping y keepalive

```php
$ws->ping('optional payload');   // hasta 125 bytes, RFC 6455 §5.5
```

El código de la aplicación rara vez necesita llamar esto a mano: el temporizador de keepalive
del servidor (`HttpServerConfig::setWsPingIntervalMs()`) envía PINGs automáticamente. Si el
cliente no responde a tiempo (`setWsPongTimeoutMs()`), el servidor cierra la conexión por su
cuenta. Véase [Configuración](/es/docs/server/configuration.html#websocket) para los detalles.

## Negociación y rechazo de subprotocolo: `WebSocketUpgrade`

Por defecto el manejador solo recibe `WebSocket $ws`. Para decidir tú mismo si aceptar la
conexión y qué subprotocolo elegir, registra el manejador con tres parámetros: el servidor
detecta la cantidad de parámetros y, en ese caso, pasa un tercer objeto, `WebSocketUpgrade`:

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // desde la cabecera Sec-WebSocket-Protocol

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // debe llamarse antes de return o de reject()

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` vive desde el momento en que se llama al manejador hasta `reject()` o un
`return` exitoso (momento en el que el servidor termina el handshake con el subprotocolo
elegido). Después de eso, cualquier llamada sobre este objeto lanza excepción: la respuesta ya
está en el cable y el subprotocolo ya no puede cambiar.

`getOfferedExtensions()` devuelve la lista de extensiones que ofreció el cliente.
permessage-deflate (RFC 7692, compresión de mensajes) la negocia el propio servidor mediante
`HttpServerConfig::setWsPermessageDeflate()`; el resto de los valores ofrecidos son solo
informativos.

## Códigos de cierre y excepciones

`WebSocketCloseCode` es un enum con los códigos de cierre estándar de RFC 6455 (`NORMAL`,
`GOING_AWAY`, `PROTOCOL_ERROR`, `MESSAGE_TOO_BIG`, y otros). La jerarquía de excepciones:

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException            // también: filtro de topic inválido, tope de suscripciones
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // lector lento — o publish() por encima de su rate limit
              └── WebSocketConcurrentReadException  // segundo recv() en paralelo
```

Un cierre limpio por parte del cliente aparece como `null` desde `recv()`, no como una
excepción. Solo se lanza una excepción ante un error de protocolo o un cierre con código de
error explícito; `$closeCode`/`$closeReason` llevan la razón. Véase la
[referencia](/es/docs/reference/server/websocket.html) para más detalle.

## Configuración

| Método | Por defecto | Propósito |
|--------|-------------|-----------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | tamaño máximo del mensaje reensamblado, si no `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | tamaño máximo de un solo frame, protege contra una avalancha de fragmentos diminutos |
| `setWsPingIntervalMs($ms)` | 30000 | cada cuánto el servidor hace ping a una conexión inactiva, `0` lo desactiva |
| `setWsPongTimeoutMs($ms)` | 60000 | cuánto esperar el PONG antes de cerrar (`1001`) |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, opt-in por su coste de CPU |
| `setWsMaxSubscriptions($count)` | `0` (sin límite) | filtros de topic distintos que una conexión puede mantener |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (off) | token bucket por conexión sobre `publish()` |

Véase [Configuración](/es/docs/server/configuration.html#websocket) para más detalle.

## Véase también

- [`TrueAsync\WebSocket` y clases relacionadas](/es/docs/reference/server/websocket.html): la
  referencia completa
- [`HttpServer::addWebSocketHandler()`](/es/docs/reference/server/http-server.html#addwebsockethandler)
- [Configuración: WebSocket](/es/docs/server/configuration.html#websocket)
