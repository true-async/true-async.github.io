---
layout: tutorial
lang: es
path_key: "/tutors-server/09-production.html"
nav_active: docs
permalink: /es/tutors-server/09-production.html
page_title: "Producción"
description: "Timeouts, límites, backpressure en accept, compresión, logs y apagado ordenado."
---

# Producción

Un buen servidor no se diferencia de una demo en cómo funciona. En cómo
falla. Todos funcionan cuando el ánimo acompaña; la producción empieza
donde llega el día malo: un pico de tráfico, clientes lentos, un
despliegue en el momento más inoportuno. Este capítulo trata enteramente
sobre los días malos.

## Timeouts: nadie espera para siempre

De la primera serie nos llevamos una regla de hierro: toda espera debe
tener un límite. Veamos dónde tiene esperas siquiera una conexión. El
cliente envía una petición, eso es una. Toma la respuesta, eso es dos.
Cuelga entre peticiones en keep-alive, eso es tres. Cada etapa recibe su
propio límite:

```php
$config
    ->setReadTimeout(30)       // ¿la petición tarda más de 30 segundos en enviarse? adiós
    ->setWriteTimeout(60)      // ¿y la respuesta tarda más de un minuto en recogerse? esa también
    ->setKeepAliveTimeout(15); // una conexión ociosa vive como mucho 15 segundos
```

El timeout de lectura no es solo sobre internet lento. Hay un ataque con
un nombre maravilloso, slowloris: el cliente envía una petición a un
byte por minuto y ocupa la conexión para siempre. Cien clientes así y un
servidor sin timeouts está acabado. Con un timeout no es más que cien
conexiones descartadas.

La única excepción legítima que ya conoces del capítulo de SSE: para los
flujos el timeout de escritura se apaga, `setWriteTimeout(0)`.

## Límites: rechazar barato

Ahora sobre la sobrecarga. La pregunta no es "si", la pregunta es
"cuándo". Y en ese momento el servidor tiene exactamente dos caminos.
Camino uno: aceptar a todos, acumular una cola, ralentizarse, y al final
todos reciben timeouts, incluidos los que se podrían haber atendido.
Camino dos: decirles "ocupado" de inmediato a los que sobran, y atender
al resto como si nada hubiera pasado.

El segundo camino se configura así:

```php
$config
    ->setMaxConnections(10_000)          // límite duro de conexiones
    ->setMaxInflightRequests(1_000)      // peticiones procesadas de forma concurrente
    ->setMaxBodySize(10 * 1024 * 1024);  // ¿cuerpo mayor de 10 MiB? 413
```

Fíjate bien en `setMaxInflightRequests`. ¿Lo reconoces? Es nuestro viejo
amigo, el límite de concurrencia: `POOL_MAX`, `concurrency` en los
grupos, ahora al nivel de todo un servidor. Una petición de más recibe
un `503 Retry-After: 1` instantáneo. Instantáneo es la palabra clave: el
cliente conoce la verdad en un milisegundo y reintentará más tarde, en
lugar de colgar en una cola durante un minuto esperando un timeout.

Hay también una tercera línea de defensa, la más elegante. El propio
servidor mide cuánto esperan las peticiones en la cola. ¿La espera crece
sistemáticamente? Entonces no damos abasto, y el servidor deja de
aceptar temporalmente nuevas conexiones hasta que se pone al día. El
algoritmo se llama CoDel, pero lo conoces con otro nombre: es el
backpressure del capítulo de canales, aplicado a `accept()`. Internet es
el productor, los handlers son el consumidor, y al productor se le
ralentiza. Hay un ajuste:

```php
$config->setBackpressureTargetMs(20); // qué tiempo de espera en la cola considerar normal
```

## Compresión

Buenas noticias: la compresión de respuestas ya funciona. El servidor
negocia con el cliente vía `Accept-Encoding` y elige el mejor de los
codecs disponibles: zstd, brotli, gzip. Normalmente no hay nada que
hacer aquí, pero vale la pena conocer tres palancas:

```php
$config
    ->setCompressionMinSize(1024)   // no comprimir cosas pequeñas: el overhead cuesta más
    ->setZstdLevel(3)               // balance velocidad/ratio por codec
    ->setCompressionMimeTypes([...]); // whitelist: el texto se comprime, un jpeg ya no
```

Más una palanca del lado de la respuesta: `$res->setNoCompression()`
para los endpoints donde la compresión es perjudicial. Los helpers de
SSE, por cierto, la llaman ellos mismos; un gzip con buffering mataría
toda la instantaneidad de la entrega.

## Logs

Mientras todo va bien, el servidor calla. De acuerdo, preferiríamos
enterarnos de los problemas no por los usuarios:

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::WARN)
    ->setLogStream(STDERR);
```

`WARN` cubre handshakes de TLS fallidos, clientes descartados,
excepciones tragadas. `INFO` añade el ciclo de vida: arranque, puertos,
workers. El sumidero es un stream PHP corriente: stderr para systemd y
Docker, un archivo, lo que sea.

## Una parada ordenada

Y el último día malo, que en realidad es uno bueno: el despliegue. Una
estampa digna de óleos: el servidor tiene mil conexiones vivas, cien de
ellas a mitad de escritura en la base de datos, y aquí llega la nueva
versión. ¿`kill -9`? Disfruta de cien transacciones abortadas y una
multitud de usuarios con subidas rotas.

La versión ordenada se ve así:

```php
$config->setShutdownTimeout(30);
```

Al recibir `stop()` o SIGTERM, el servidor primero deja de aceptar
nuevas, y deja que las actuales vivan sus vidas, hasta treinta segundos.
Quien no llegue a tiempo será cancelado. Y aquí, por última vez en esta
serie, la disciplina de scope da sus frutos: la cancelación pasa de
forma cooperativa a través del árbol de cada petición, los bloques
`finally` liberan recursos, el pool revierte las transacciones sin
cerrar. El apagado ordenado no se escribió como una funcionalidad. Cayó
por su propio peso de la arquitectura.

Para conexiones de larga vida detrás de un balanceador de carga hay un
toque más, `setMaxConnectionAgeMs()`: una conexión más vieja que la edad
dada se cierra de forma ordenada (`Connection: close`, GOAWAY), para que
los clientes se redistribuyan entre máquinas en lugar de colgar en una
sola durante años.

Ahora sí esto es producción. La sobrecarga se topa con un rechazo
rápido, los clientes lentos chocan con los timeouts, un despliegue no
desgarra las transacciones, y el servidor reporta sus problemas él
mismo. Queda una última frontera para toda la serie: hasta ahora solo
los navegadores y curl han hablado con nuestro servidor. Es hora de
dejar entrar a otros interlocutores, los servicios vecinos, en su lengua
materna.
