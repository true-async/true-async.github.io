---
layout: architecture
lang: es
path_key: "/architecture.html"
nav_active: architecture
permalink: /es/architecture.html
page_title: "Arquitectura"
description: "Diseno interno de los componentes de TrueAsync -- pool de recursos, PDO Pool, diagramas y API en C."
---

## Descripcion general

La seccion de arquitectura describe el diseno interno de los componentes clave de TrueAsync
a nivel de codigo C: estructuras de datos, algoritmos, integracion con Zend Engine
e interaccion entre el nucleo de PHP y la extension asincrona.

Estos materiales estan destinados a desarrolladores que desean comprender
como funciona TrueAsync "bajo el capo" o planean crear sus propias
extensiones.

### [TrueAsync ABI](/es/architecture/zend-async-api.html)

El corazon del ABI asincrono: punteros a funciones, sistema de registro de extensiones,
estado global (`zend_async_globals_t`), macros `ZEND_ASYNC_*`
y versionado del API.

### [Corrutinas, Planificador y Reactor](/es/architecture/scheduler-reactor.html)

Diseno interno del planificador de corrutinas y el reactor de eventos:
colas (buffers circulares), cambio de contexto mediante fiber,
microtareas, bucle de eventos libuv, pool de contextos fiber y apagado ordenado.

### [Eventos y el Modelo de Eventos](/es/architecture/events.html)

`zend_async_event_t` -- la estructura de datos base de la cual
heredan todas las primitivas asincronas. Sistema de callbacks, conteo de referencias,
referencia de evento, flags, jerarquia de tipos de evento.

### [Waker -- Mecanismo de Espera y Activacion](/es/architecture/waker.html)

El Waker es el enlace entre una corrutina y los eventos.
Estados, `resume_when`, callbacks de corrutinas, entrega de errores,
estructura `zend_coroutine_t` y switch handlers.

### [Recoleccion de Basura en Contexto Asincrono](/es/architecture/async-gc.html)

Como funciona el GC de PHP con corrutinas, scope y contextos: handlers `get_gc`,
recorrido de la pila fiber, corrutinas zombie, contexto jerarquico
y proteccion contra referencias circulares.

## Componentes

### [Async\Pool](/es/architecture/pool.html)

Pool universal de recursos. Temas cubiertos:
- Estructura de datos de dos niveles (ABI en el nucleo + interna en la extension)
- Algoritmos de acquire/release con cola FIFO de corrutinas en espera
- Healthcheck mediante temporizador periodico
- Circuit Breaker con tres estados
- API en C para extensiones (macros `ZEND_ASYNC_POOL_*`)

### [PDO Pool](/es/architecture/pdo-pool.html)

Capa especifica de PDO sobre `Async\Pool`. Temas cubiertos:
- Conexion plantilla y creacion diferida de conexiones reales
- Vinculacion de conexiones a corrutinas mediante HashTable
- Fijacion durante transacciones activas y sentencias
- Rollback automatico y limpieza al finalizar la corrutina
- Gestion de credenciales en la factoria
