---
layout: docs
lang: es
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /es/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): conexiones full-duplex sobre RFC 6455, contrapresión, keepalive, negociación de subprotocolo, permessage-deflate."
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

$server->start();
```

Cada conexión se atiende en su propia corrutina, el mismo modelo por solicitud que en HTTP.

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
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // el cliente no está leyendo lo bastante rápido
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

Véase [Configuración](/es/docs/server/configuration.html#websocket) para más detalle.

## Véase también

- [`TrueAsync\WebSocket` y clases relacionadas](/es/docs/reference/server/websocket.html): la
  referencia completa
- [`HttpServer::addWebSocketHandler()`](/es/docs/reference/server/http-server.html#addwebsockethandler)
- [Configuración: WebSocket](/es/docs/server/configuration.html#websocket)
