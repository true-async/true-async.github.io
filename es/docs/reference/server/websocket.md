---
layout: docs
lang: es
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /es/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode, y la jerarquía de excepciones de WebSocket."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

Las clases detrás de las conexiones full-duplex sobre RFC 6455. Guía con ejemplos:
[WebSocket](/es/docs/server/websocket.html).

## TrueAsync\WebSocket

Una conexión WebSocket. La crea el servidor justo después de que se confirma el handshake de
upgrade, y se pasa como primer argumento al manejador registrado mediante
[`HttpServer::addWebSocketHandler()`](/es/docs/reference/server/http-server.html#addwebsockethandler).

```php
namespace TrueAsync;

final class WebSocket implements \Iterator
{
    public function recv(): ?WebSocketMessage;

    public function send(string $text): void;
    public function sendBinary(string $data): void;
    public function trySend(string $text): bool;
    public function trySendBinary(string $data): bool;

    public function ping(string $payload = ''): void;
    public function close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void;

    public function isClosed(): bool;
    public function getSubprotocol(): ?string;
    public function getRemoteAddress(): string;

    // Iterator
    public function current(): ?WebSocketMessage;
    public function key(): int;
    public function next(): void;
    public function rewind(): void;
    public function valid(): bool;
}
```

Las instancias solo las construye el servidor; `new WebSocket` no está disponible para el
código de usuario.

### Ciclo de vida

La conexión está ligada a la corrutina del manejador. Cuando el manejador devuelve el control
por cualquier motivo, incluido un `return` desde un bucle `recv()` al recibir `null`, el
servidor cierra la conexión con código `1000 Normal`. Un `close()` explícito antes del `return`
solo hace falta para un código o texto de razón distinto del predeterminado.

### Modelo de concurrencia

- `send()`, `sendBinary()` y `ping()` son seguros de llamar desde cualquier corrutina en el
  mismo hilo. Los productores encolan frames serializados de forma atómica; un único flusher
  cooperativo los escribe al socket uno a uno, así que los frames de distintos llamantes nunca
  se entrelazan.
- `recv()` admite un solo lector: una segunda llamada concurrente a `recv()` lanza
  `WebSocketConcurrentReadException`, porque la conexión es un único stream de bytes y no hay
  semántica definida para varios lectores.
- `close()` es idempotente y se puede llamar desde cualquier corrutina.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

Recibe el siguiente mensaje de texto o binario. Suspende la corrutina llamante hasta que llega
un mensaje completo o se cierra la conexión.

Devuelve un [`WebSocketMessage`](#websocketmessage) o `null` cuando el cliente cerró de forma
limpia: un código CLOSE normal (`1000`/`1001`/`1005`) o una desconexión sin frame CLOSE. Bucle
típico: `while (($m = $ws->recv()) !== null) { ... }`.

El método lanza:

- `WebSocketClosedException` ante un error de protocolo o un código de cierre de error
  explícito; `$closeCode`/`$closeReason` llevan el código y la razón de RFC 6455.
- `WebSocketConcurrentReadException` si otra corrutina ya está esperando dentro de `recv()` en
  esta conexión.

### send

```php
public WebSocket::send(string $text): void
```

Envía un frame de texto. `$text` **debe** ser UTF-8 válido: los datos inválidos se rechazan de
antemano para que el receptor nunca vea un frame que viole RFC 6455 §5.6.

Devuelve el control de inmediato en el caso común, mientras el buffer de envío no esté lleno.
Suspende la corrutina llamante en cuanto el buffer se llena, y se reanuda cuando el cliente ha
leído lo suficiente como para hacer espacio de nuevo. Si la suspensión dura más que
`write_timeout_ms`, el método lanza `WebSocketBackpressureException`, y el manejador puede
entonces descartar el mensaje, cerrar la conexión, o reintentar.

El método también lanza `WebSocketClosedException` si la conexión ya está cerrada.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

Envía un frame binario. Los payloads binarios no tienen restricción de UTF-8. El comportamiento
de contrapresión es idéntico al de `send()`.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

Envío no bloqueante. Encola un frame de texto y devuelve `true` cuando el buffer de envío no
está lleno; devuelve `false` sin encolar nada si el buffer está lleno, de modo que el llamante
puede descartar el mensaje, frenar, o cerrar la conexión. A diferencia de `send()`, `trySend()`
nunca suspende la corrutina llamante, lo que la convierte en la herramienta correcta para un
bucle de broadcast donde un cliente lento no debe frenar la entrega a los demás.

El tamaño del buffer lo fija
[`HttpServerConfig::setStreamWriteBufferBytes()`](/es/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` elimina el límite: `trySend()` entonces siempre encola el frame y devuelve `true`).

La función devuelve `true` si el mensaje fue aceptado en la cola, y `false` si el buffer de
envío está lleno y el cliente no está siguiendo el ritmo. Lanza `WebSocketClosedException` si la
conexión ya está cerrada.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

Envío binario no bloqueante. Se comporta igual que `trySend()`.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

Envía un frame PING. Según RFC 6455 §5.5.2 el peer está obligado a responder con PONG. El código
de la aplicación rara vez necesita llamar esto a mano: el temporizador de keepalive del servidor
(`HttpServerConfig::setWsPingIntervalMs()`) envía pings automáticamente cuando está configurado.

`$payload` acepta hasta 125 bytes (RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

Inicia el handshake de cierre y derriba la conexión. Idempotente: las llamadas repetidas no
hacen nada.

- `$code` es un valor `WebSocketCloseCode`, o un entero directo en `4000..4999` (reservado para
  códigos específicos de la aplicación, RFC 6455 §7.4.2).
- `$reason` es texto UTF-8, hasta 123 bytes.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`true` después de haber llamado a `close()`, o después de procesar el frame CLOSE del cliente.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

El subprotocolo negociado durante el upgrade, o `null` si no se eligió ninguno.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

La dirección del peer en forma `host:port` (IPv4) o `[host]:port` (IPv6) para conexiones TCP.
Una cadena vacía para conexiones sobre un socket Unix.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

Permite escribir `foreach ($ws as $msg)` en vez de un bucle `recv()` manual. En cada paso el
bucle extrae el siguiente mensaje; un cierre correcto simplemente termina el `foreach`, y un
cierre con error lanza `WebSocketClosedException` directamente desde el bucle.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

Un mensaje completamente reensamblado, tal como lo entrega `WebSocket::recv()`. Los mensajes de
texto ya han sido validados como UTF-8, así que puedes usar `$data` tal cual sin comprobarlo de
nuevo.

- **`$data`** es el payload del mensaje. Para mensajes de texto, es una cadena UTF-8 válida.
- **`$binary`** vale `true` si el mensaje se envió como frame binario, `false` para un frame de
  texto.

Las instancias solo las construye el servidor. Se obtienen a través de `WebSocket::recv()`; no
hay forma de construir `new WebSocketMessage` por cuenta propia.

## TrueAsync\WebSocketUpgrade

```php
namespace TrueAsync;

final class WebSocketUpgrade
{
    public function reject(int $status, string $reason = ''): void;
    public function setSubprotocol(string $name): void;
    public function getOfferedSubprotocols(): array;
    public function getOfferedExtensions(): array;
}
```

El identificador de una negociación de upgrade en curso. Existe desde el momento en que se
invoca el manejador hasta que se llama a `reject()` o el manejador retorna con éxito (en cuyo
caso el servidor envía `101` con el subprotocolo elegido mediante `setSubprotocol()`).

Disponible solo para manejadores registrados con tres parámetros:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

El servidor detecta cuántos parámetros declara el manejador; un manejador de dos parámetros se
salta este objeto por completo y el upgrade se acepta con la configuración por defecto.

Una vez confirmado el handshake, cualquier llamada sobre este objeto lanza excepción:
`Sec-WebSocket-Protocol` ya está en el cable y el subprotocolo ya no puede cambiar.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

Rechaza el upgrade con el status HTTP indicado. La respuesta `101` nunca se envía; el cliente
recibe el status elegido en su lugar, y la conexión se cierra. Tras `reject()` el manejador debe
retornar de inmediato: no se permite más E/S.

- `$status` es el código de status HTTP (debe ser 4xx o 5xx).
- `$reason` es un cuerpo de respuesta opcional.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

Elige un subprotocolo de la lista que ofreció el cliente. El valor elegido se devuelve en la
cabecera de respuesta `Sec-WebSocket-Protocol`. Debe llamarse antes de que el manejador retorne
y antes de `reject()`. El servidor no verifica que el valor elegido estuviera realmente en
`getOfferedSubprotocols()`; eso queda a cargo del manejador.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

Devuelve los subprotocolos (`string[]`) que el cliente envió en la cabecera
`Sec-WebSocket-Protocol`, en el orden de preferencia del cliente. Un array vacío si el cliente
no ofreció ninguno.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

Devuelve las extensiones (`string[]`) de la cabecera `Sec-WebSocket-Extensions`, en el orden de
preferencia del cliente. permessage-deflate (RFC 7692, compresión de mensajes) la negocia el
propio servidor mediante `HttpServerConfig::setWsPermessageDeflate()`; el resto de los valores
ofrecidos son solo informativos. Un array vacío si el cliente no ofreció ninguna.

## TrueAsync\WebSocketCloseCode

```php
namespace TrueAsync;

enum WebSocketCloseCode: int
{
    case NORMAL                = 1000;
    case GOING_AWAY            = 1001;
    case PROTOCOL_ERROR        = 1002;
    case UNSUPPORTED_DATA      = 1003;
    case NO_STATUS             = 1005;  // RESERVADO
    case ABNORMAL_CLOSURE      = 1006;  // RESERVADO
    case INVALID_FRAME_PAYLOAD = 1007;
    case POLICY_VIOLATION      = 1008;
    case MESSAGE_TOO_BIG       = 1009;
    case MANDATORY_EXTENSION   = 1010;
    case INTERNAL_SERVER_ERROR = 1011;
    case TLS_HANDSHAKE         = 1015;  // RESERVADO
}
```

El registro de códigos de cierre de RFC 6455 §7.4.1. Los códigos específicos de la aplicación
(`4000..4999`, RFC 6455 §7.4.2) siguen disponibles: `WebSocket::close()` acepta un `int` directo
junto a este enum.

## Excepciones

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // final
              ├── WebSocketBackpressureException    // final
              └── WebSocketConcurrentReadException  // final
```

### TrueAsync\WebSocketException

```php
class WebSocketException extends HttpServerException {}
```

La excepción base para todos los errores de WebSocket. Extiende la `HttpServerException` común
del proyecto, así que los manejadores catch-all existentes siguen funcionando.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

La conexión se cerró por un motivo distinto de un handshake normal iniciado por el cliente: un
error de protocolo, o un código de error explícito del cliente. `$closeCode` lleva el código de
cierre de RFC 6455 (o `1006 Abnormal Closure` si no llegó ningún frame CLOSE, por ejemplo ante
una caída de red). `$closeReason` lleva el texto de razón UTF-8 del frame CLOSE del cliente, o
una cadena vacía si no se dio ninguno.

Un cierre limpio por parte del cliente (código `1000`) no lanza excepción: `WebSocket::recv()`
simplemente devuelve `null` en ese caso.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

Se lanza desde `send()`/`sendBinary()` cuando el buffer de envío se mantiene lleno más tiempo
que `write_timeout_ms`. Es la señal para la aplicación de que el cliente está leyendo demasiado
lento: cierra la conexión, o descarta el mensaje y continúa.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

Un error de programación: una segunda corrutina llamó a `recv()` mientras otra ya estaba
esperando dentro de `recv()` en el mismo `WebSocket`. Una sola conexión solo se puede leer desde
un lugar a la vez; si necesitas distribuir mensajes a varios manejadores, construye un único
bucle `recv()` y despacha los mensajes tú mismo desde ahí.

## Véase también

- [Guía: WebSocket](/es/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/es/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`: opciones de WebSocket](/es/docs/reference/server/http-server-config.html#websocket)
- [Excepciones de TrueAsync Server](/es/docs/reference/server/exceptions.html)
