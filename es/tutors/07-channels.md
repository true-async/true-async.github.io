---
layout: tutorial
lang: es
path_key: "/tutors/07-channels.html"
nav_active: docs
permalink: /es/tutors/07-channels.html
page_title: "Channels"
description: "Channel: un flujo de valores entre corrutinas, un pool de workers y backpressure."
---

# Channels

`Future` promete exactamente un valor. Pero, ¿qué pasa si hay muchos valores, y
llegan de forma gradual?

Recuerda el archivo CSV del primer capítulo. Ahora la tarea es más seria: mientras
se importa, la dirección de cada usuario debe comprobarse contra `GeoDirectory`.
Ya sabemos usar corrutinas, así que probemos el enfoque directo:

```php
while (($row = fgetcsv($handle)) !== false) {
    spawn(checkAddress(...), $row[$addressIndex]);
}
```

El archivo tiene cien mil filas. Este código creará cien mil
corrutinas, y todas ellas abrirán de forma concurrente una conexión a `GeoDirectory`.
Las corrutinas son baratas, pero las conexiones no. El servicio se ahogará, y nuestra
importación con él.

Lo que queremos en su lugar es que, digamos, diez corrutinas se encarguen de la comprobación, mientras
el resto de direcciones esperan su turno. Necesitamos una cola de la que unas corrutinas
saquen trabajo y otras le añadan trabajo.

Esa cola se llama canal.

## Channel

Un canal conecta corrutinas directamente, como una tubería:

```php
use Async\Channel;
use function Async\spawn;

$channel = new Channel(5);

spawn(function () use ($channel) {
    $channel->send('hello');
});

echo $channel->recv(); // hello
```

- **`send`** — pone un valor en el canal.
- **`recv`** — saca un valor del canal.

Ambas operaciones bloquean, y ahí está todo el meollo. Si el canal está vacío, `recv`
suspende la corrutina hasta que aparecen datos. Si el canal está lleno, es `send`
el que se suspende en su lugar. El `5` del constructor establece el tamaño del búfer:
cuántos valores el canal está dispuesto a retener antes de que alguien los recoja.

## Rendezvous

¿Qué ocurre si creas un canal con un búfer de `0`? No tiene dónde
guardar valores, así que `send` no se completará hasta que otra corrutina llame a `recv`:

```php
$ch = new Channel(0);

spawn(function () use ($ch) {
    echo "before send\n";
    $ch->send('hello');
    echo "after send\n"; // se ejecuta solo después de recv
});

spawn(function () use ($ch) {
    echo "before recv\n";
    echo $ch->recv() . "\n";
});
```

Un canal así se llama rendezvous: el emisor y el receptor están obligados
a encontrarse en el mismo punto en el tiempo, de ahí el nombre.

La diferencia con un canal con búfer es más sutil de lo que parece. Un búfer significa
"enviado" pero no "recibido": `send` deja un valor y sigue adelante, y el emisor
no tiene ni idea de si, ni cuándo, se recoge. Un rendezvous garantiza la entrega:
en cuanto `send` retorna, el valor ya está en manos del receptor. Eso importa
cuando una tarea no puede quedarse esperando en una cola: por ejemplo, entregar trabajo a un
worker solo si está libre en ese momento.

Los datos casi no importan aquí: un rendezvous es sincronización pura.
Dos corrutinas tienen garantizado encontrarse en el mismo instante, aunque todo lo que
se pasaran fuera `null`.

## Pool de workers

Montemos una solución para la importación. Diez corrutinas worker sacan direcciones
de un canal, mientras el flujo principal lee el archivo y alimenta el canal:

```php
use Async\Channel;
use Async\ChannelException;
use function Async\spawn;

$queue = new Channel(100);

for ($i = 0; $i < 10; $i++) {
    spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
```

Cada valor del canal va a exactamente un worker, aunque los diez estén
esperando en `recv`. Los valores nunca se duplican, así que los workers no se pisan
unos a otros: el canal reparte el trabajo entre quien esté libre por sí solo.

Por muchas filas que haya en el archivo, nunca hay más de diez conexiones
a `GeoDirectory`. El número de workers es exactamente el límite de concurrencia,
y lo fija una única constante en el bucle.

## Backpressure

¿Por qué un búfer de exactamente `100`? Imagina que los workers comprueban direcciones más despacio
que la velocidad a la que el flujo principal lee el archivo. Sin un límite, la cola seguiría creciendo
hasta que el archivo entero de cien mil filas cupiera en memoria.

Con un búfer de `100`, ocurre algo distinto: en cuanto cien
direcciones se acumulan en el canal, `send` suspende el flujo principal. La lectura del
archivo se pausa y se reanuda una vez que los workers liberan espacio. El productor
se ajusta automáticamente a la velocidad de los consumidores.

Este mecanismo se llama backpressure. Fíjate en que no lo programamos
nosotros mismos: cae por sí solo de la naturaleza bloqueante de `send`. Basta con elegir un tamaño
de búfer, y todo lo demás se equilibra solo.

## Cerrar un canal

Una vez leído el archivo, los workers siguen esperando en `recv`. Una situación familiar:
en el capítulo sobre la cancelación, la corrutina de progreso también seguía girando para siempre.
Pero aquí no necesitamos `cancel()` en cada worker; un canal tiene una herramienta
más precisa:

```php
$queue->close();
```

`close` anuncia: no vienen valores nuevos. Los workers primero terminan de leer
lo que quede en el búfer, y luego `recv` lanza `ChannelException`,
poniendo fin al bucle `while (true)`. Fíjate en el orden: cerrar no corta el trabajo
en seco, deja que termine correctamente.

Y un detalle más ya familiar: `recv` y `send` aceptan el mismo token de cancelación
que el `await` del capítulo sobre timeouts:

```php
$address = $queue->recv(timeout(5000));
```

Si no aparece nada en el canal en cinco segundos, el worker recibe una
`AsyncCancellation` y puede, por ejemplo, registrar una advertencia.

## ¿Pasar datos o sincronizar?

Miremos más de cerca lo que el canal estaba haciendo en realidad en este capítulo.
`recv` sobre un canal vacío durmió a un worker hasta que apareció trabajo. `send` sobre
un canal lleno durmió la lectura del archivo hasta que los workers vaciaron la cola.
El rendezvous juntó dos corrutinas en el mismo instante en el tiempo. Cada
operación bloqueante resultó ser un punto donde las corrutinas se ajustan entre sí.

Y aquí conviene señalar una sutileza del mundo de un solo hilo. Para pasar
datos como tal, no se requiere un canal: las corrutinas viven en memoria compartida, y un
objeto puede simplemente entregárseles mediante `use`. Las condiciones de carrera sobre datos no ocurren dentro de
un solo hilo; dos corrutinas nunca se ejecutan exactamente en el mismo instante.
Un canal se usa para otra cosa: una cola acotada, repartir trabajo entre
workers libres, señalar "no hay más trabajo" mediante `close`.

Así que es más preciso pensar en un canal de esta forma: es una manera de sincronizar
corrutinas que, de paso, mueve datos, no al revés. En
código multihilo, sin embargo, donde las corrutinas se reparten entre distintos
hilos, un canal se vuelve indispensable en ambos papeles: allí no hay memoria compartida,
y sigue siendo el único puente seguro.

Ahora tenemos dos maneras de enlazar corrutinas entre sí. `Future` promete un valor.
Un canal transporta todo un flujo de valores y, por el camino, marca un ritmo compartido
para el trabajo: el productor no sabe quién recogerá los datos ni cuándo,
el consumidor no sabe de dónde vinieron, pero nadie inunda a nadie de trabajo.

Queda un pensamiento inquietante. Arrancamos diez workers y seguimos adelante. ¿Y si
uno de ellos muere con una excepción a mitad de la importación? ¿Quién vigila en realidad
todas estas corrutinas? Averigüémoslo en el próximo capítulo.
