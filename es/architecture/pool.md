---
layout: architecture
lang: es
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /es/architecture/pool.html
page_title: "Arquitectura de Async\\Pool"
description: "Diseno interno del pool universal de recursos Async\\Pool -- estructuras de datos, algoritmos de acquire/release, healthcheck, circuit breaker."
---

# Arquitectura de Async\Pool

> Este articulo describe el diseno interno del pool universal de recursos.
> Si busca una guia de uso, consulte [Async\Pool](/es/docs/components/pool.html).
> Para la capa especifica de PDO, consulte [Arquitectura del PDO Pool](/es/architecture/pdo-pool.html).

## Estructura de Datos

El pool esta implementado en dos capas: una estructura ABI publica en el nucleo de PHP
y una estructura interna extendida en la extension asincrona.

![Estructuras de Datos del Pool](/diagrams/es/architecture-pool/data-structures.svg)

## Dos Rutas de Creacion

Un pool puede crearse desde codigo PHP (mediante el constructor `Async\Pool`)
o desde una extension C (mediante el API interno).

| Ruta  | Funcion                             | Callbacks                      | Usado por              |
|-------|-------------------------------------|--------------------------------|------------------------|
| PHP   | `zend_async_pool_create()`          | `zend_fcall_t*` (PHP callable) | Codigo de usuario      |
| C API | `zend_async_pool_create_internal()` | punteros a funciones           | PDO, otras extensiones |

La diferencia esta en `handler_flags`. Cuando el flag esta establecido, el pool llama a la funcion C directamente,
evitando la sobrecarga de llamar un PHP callable a traves de `zend_call_function()`.

## Acquire: Obtencion de un Recurso

![acquire() -- Algoritmo Interno](/diagrams/es/architecture-pool/acquire.svg)

### Espera por un Recurso

Cuando todos los recursos estan ocupados y se alcanza `max_size`, la corrutina se suspende
mediante `ZEND_ASYNC_SUSPEND()`. El mecanismo de espera es similar a los canales:

1. Se crea una estructura `zend_async_pool_waiter_t`
2. El waiter se agrega a la cola FIFO `waiters`
3. Se registra un callback para la activacion
4. Si se establece un timeout -- se registra un temporizador
5. `ZEND_ASYNC_SUSPEND()` -- la corrutina cede el control

La activacion ocurre cuando otra corrutina llama a `release()`.

## Release: Devolucion de un Recurso

![release() -- Algoritmo Interno](/diagrams/es/architecture-pool/release.svg)

## Healthcheck: Monitoreo en Segundo Plano

Si `healthcheckInterval > 0`, se inicia un temporizador periodico cuando se crea el pool.
El temporizador se integra con el reactor mediante `ZEND_ASYNC_NEW_TIMER_EVENT`.

![Healthcheck -- Verificacion Periodica](/diagrams/es/architecture-pool/healthcheck.svg)

El healthcheck verifica **unicamente** los recursos libres. Los recursos ocupados no se afectan.
Si, despues de eliminar los recursos muertos, el conteo total cae por debajo de `min`, el pool crea reemplazos.

## Buffer Circular

Los recursos libres se almacenan en un buffer circular -- un ring buffer con capacidad fija.
La capacidad inicial es de 8 elementos, expandiendose segun sea necesario.

Las operaciones `push` y `pop` se ejecutan en O(1). El buffer usa dos punteros (`head` y `tail`),
permitiendo la adicion y extraccion eficiente de recursos sin mover elementos.

## Integracion con el Sistema de Eventos

El pool hereda de `zend_async_event_t` e implementa un conjunto completo de handlers de eventos:

| Handler        | Proposito                                                  |
|----------------|------------------------------------------------------------|
| `add_callback` | Registrar un callback (para waiters)                       |
| `del_callback` | Eliminar un callback                                       |
| `start`        | Iniciar el evento (NOP)                                    |
| `stop`         | Detener el evento (NOP)                                    |
| `dispose`      | Limpieza completa: liberar memoria, destruir callbacks     |

Esto permite:
- Suspender y reanudar corrutinas mediante callbacks de eventos
- Integrar el temporizador de healthcheck con el reactor
- Liberar correctamente los recursos a traves de la eliminacion de eventos

## Recoleccion de Basura

El wrapper PHP del pool (`async_pool_obj_t`) implementa un `get_gc` personalizado
que registra todos los recursos del buffer de inactivos como raices del GC.
Esto previene la recoleccion prematura de recursos libres
que no tienen referencias explicitas desde el codigo PHP.

## Circuit Breaker

El pool implementa la interfaz `CircuitBreaker` con tres estados:

![Estados del Circuit Breaker](/diagrams/es/architecture-pool/circuit-breaker.svg)

Las transiciones pueden ser manuales o automaticas mediante `CircuitBreakerStrategy`:
- `reportSuccess()` se llama en un `release` exitoso (el recurso paso `beforeRelease`)
- `reportFailure()` se llama cuando `beforeRelease` devolvio `false`
- La estrategia decide cuando cambiar de estado

## Close: Cierre del Pool

Cuando el pool se cierra:

1. El evento del pool se marca como CLOSED
2. El temporizador de healthcheck se detiene
3. Todas las corrutinas en espera se despiertan con un `PoolException`
4. Todos los recursos libres se destruyen mediante `destructor`
5. Los recursos ocupados continuan viviendo -- seran destruidos al hacer `release`

## API en C para Extensiones

Las extensiones (PDO, Redis, etc.) usan el pool a traves de macros:

| Macro                                            | Funcion                          |
|--------------------------------------------------|----------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | Crear pool con callbacks en C    |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | Crear wrapper PHP para el pool   |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | Adquirir un recurso              |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | Liberar un recurso               |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | Cerrar el pool                   |

Todas las macros llaman a punteros de funciones registrados por la extension asincrona en tiempo de carga.
Esto asegura el aislamiento: el nucleo de PHP no depende de la implementacion especifica del pool.

## Secuencia: Ciclo Completo de Acquire-Release

![Ciclo Completo acquire -> uso -> release](/diagrams/es/architecture-pool/full-cycle.svg)

## Que Sigue?

- [Async\Pool: Guia](/es/docs/components/pool.html) -- como usar el pool
- [Arquitectura del PDO Pool](/es/architecture/pdo-pool.html) -- capa especifica de PDO
- [Corrutinas](/es/docs/components/coroutines.html) -- como funcionan las corrutinas
