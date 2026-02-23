---
layout: docs
lang: es
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /es/docs/components/channels.html
page_title: "Canales"
description: "Canales en TrueAsync -- transferencia segura de datos entre corrutinas, colas de tareas y contrapresion."
---

# Canales

Los canales son mas utiles para la comunicacion en un entorno multihilo
que en uno de un solo hilo. Sirven para la transferencia segura de datos de una corrutina a otra.
Si necesitas modificar datos compartidos,
en un entorno de un solo hilo es mas sencillo pasar un objeto a diferentes corrutinas que crear un canal.

Sin embargo, los canales son utiles en los siguientes escenarios:
* organizar una cola de tareas con limites
* organizar pools de objetos (se recomienda usar la primitiva dedicada `Async\Pool`)
* sincronizacion

Por ejemplo, hay muchas URLs para rastrear, pero no mas de N conexiones simultaneamente:

```php
use Async\Channel;
use Async\Scope;

const MAX_CONNECTIONS = 10;
const MAX_QUEUE = 100;

$tasks = new Scope();
$channel = new Channel(MAX_QUEUE);

for($i = 0; $i < MAX_CONNECTIONS; $i++) {
    $tasks->spawn(function() use ($channel) {
        while (!$channel->isClosed()) {
            $url = $channel->recv();
            $content = file_get_contents($url);
            echo "Pagina obtenida {$url}, longitud: " . strlen($content) . "\n";
        }
    });
}

// Llenar el canal con valores
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

La constante `MAX_QUEUE` en este ejemplo actua como un limitador para el productor, creando contrapresion --
una situacion donde el productor no puede enviar datos hasta que el consumidor libere espacio en el canal.

## Canal Sin Buffer (Rendezvous)

Un canal con tamano de buffer `0` funciona en modo rendezvous: `send()` se bloquea hasta que otra corrutina llama a `recv()`, y viceversa. Esto asegura una sincronizacion estricta:

```php
use Async\Channel;

$ch = new Channel(0); // Canal rendezvous

spawn(function() use ($ch) {
    echo "Emisor: antes de send\n";
    $ch->send("hello");
    echo "Emisor: send completado\n"; // Solo despues de recv()
});

spawn(function() use ($ch) {
    echo "Receptor: antes de recv\n";
    $value = $ch->recv();
    echo "Receptor: recibido $value\n";
});
```

## Cancelación de operaciones

Los métodos `recv()` y `send()` aceptan un token de cancelación opcional (`Completable`) que permite interrumpir la espera según una condición arbitraria. Esto es más flexible que un tiempo de espera fijo — se puede cancelar la operación desde otra corrutina, por una señal, por un evento o por tiempo:

```php
use Async\Channel;
use Async\CancelledException;

$ch = new Channel(0);

// Cancelación por tiempo de espera
spawn(function() use ($ch) {
    try {
        $ch->recv(Async\timeout(50)); // Esperar no más de 50 ms
    } catch (CancelledException $e) {
        echo "Nadie envió datos en 50 ms\n";
    }
});

// Cancelación por condición arbitraria
spawn(function() use ($ch) {
    $cancel = new \Async\Future();

    spawn(function() use ($cancel) {
        // Cancelar después de 50 ms
        Async\delay(50);
        $cancel->complete(null);
    });

    try {
        $ch->send("data", $cancel);
    } catch (CancelledException $e) {
        echo "Nadie recibió los datos — operación cancelada\n";
    }
});
```

## Receptores en Competencia

Si multiples corrutinas estan esperando en `recv()` en el mismo canal, cada valor es recibido por **solo una** de ellas. Los valores no se duplican:

```php
use Async\Channel;

$ch = new Channel(0);

// Emisor
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// Receptor A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A recibio: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Receptor B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B recibio: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Cada valor (1, 2, 3) sera recibido solo por A o B, pero no por ambos
```

Este patron es util para implementar pools de workers, donde multiples corrutinas compiten por tareas de una cola compartida.
