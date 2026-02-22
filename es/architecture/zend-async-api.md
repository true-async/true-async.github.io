---
layout: architecture
lang: es
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /es/architecture/zend-async-api.html
page_title: "TrueAsync ABI"
description: "Arquitectura del ABI asincrono del nucleo PHP -- punteros a funciones, registro de extensiones, estado global y macros ZEND_ASYNC_*."
---

# TrueAsync ABI

El `ABI` de `TrueAsync` esta construido sobre una clara separacion de **definicion** e **implementacion**:

| Capa            | Ubicacion               | Responsabilidad                                    |
|-----------------|-------------------------|----------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h` | Definicion de tipos, estructuras, punteros a funciones |
| **Extension**   | `ext/async/`            | Implementacion de todas las funciones, registro via API |

El nucleo de `PHP` no llama directamente a funciones de la extension.
En su lugar, usa macros `ZEND_ASYNC_*` que invocan `punteros a funciones`
registrados por la extension en tiempo de carga.

Este enfoque cumple dos objetivos:
1. El motor asincrono puede funcionar con cualquier numero de extensiones que implementen el `ABI`
2. Las macros reducen la dependencia de los detalles de implementacion y minimizan la refactorizacion

## Estado Global

La porcion del estado global relacionada con la asincronia reside en el nucleo de PHP
y tambien es accesible mediante la macro `ZEND_ASYNC_G(v)`, asi como otras especializadas,
como `ZEND_ASYNC_CURRENT_COROUTINE`.

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // Scheduler heartbeat flag
    bool in_scheduler_context;          // TRUE if currently in the scheduler
    bool graceful_shutdown;             // TRUE during shutdown
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // Current coroutine
    zend_async_scope_t *main_scope;     // Root scope
    zend_coroutine_t *scheduler;        // Scheduler coroutine
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### Arranque

Actualmente, `TrueAsync` no arranca inmediatamente sino que lo hace de forma perezosa en el momento "adecuado".
(Este enfoque cambiara en el futuro, ya que practicamente cualquier funcion de E/S de PHP activa el `Scheduler`.)

Cuando un script `PHP` comienza su ejecucion, `TrueAsync` esta en el estado `ZEND_ASYNC_READY`.
En la primera llamada a una funcion que requiere el `Scheduler` mediante la macro `ZEND_ASYNC_SCHEDULER_LAUNCH()`,
el planificador se inicializa y transiciona al estado `ZEND_ASYNC_ACTIVE`.

En este punto, el codigo que se estaba ejecutando termina en la corrutina principal,
y se crea una corrutina separada para el `Scheduler`.

Ademas de `ZEND_ASYNC_SCHEDULER_LAUNCH()`, que activa explicitamente el `Scheduler`,
`TrueAsync` tambien intercepta el control en las funciones `php_execute_script_ex` y `php_request_shutdown`.

```c
    // php_execute_script_ex

    if (prepend_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, prepend_file_p) == SUCCESS;
    }
    if (result) {
        result = zend_execute_script(ZEND_REQUIRE, retval, primary_file) == SUCCESS;
    }
    if (append_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, append_file_p) == SUCCESS;
    }

    ZEND_ASYNC_RUN_SCHEDULER_AFTER_MAIN();
    ZEND_ASYNC_INITIALIZE;
```

Este codigo permite pasar el control al `Scheduler` despues de que el hilo principal termina la ejecucion.
El `Scheduler` a su vez puede lanzar otras corrutinas si existen.

Este enfoque asegura no solo un 100% de transparencia de TrueAsync para el programador PHP,
sino tambien compatibilidad total con `PHP SAPI`. Los clientes que usan `PHP SAPI` continuan tratando a `PHP` como sincrono,
aunque un `EventLoop` este ejecutandose internamente.

En la funcion `php_request_shutdown`, ocurre la intercepcion final para ejecutar corrutinas en destructores,
despues de lo cual el `Scheduler` se cierra y libera recursos.

## Registro de Extensiones

Dado que el `TrueAsync ABI` es parte del nucleo de `PHP`, esta disponible para todas las extensiones `PHP` en la etapa mas temprana.
Por lo tanto, las extensiones tienen la oportunidad de inicializar correctamente `TrueAsync` antes de que el `Motor PHP`
sea lanzado para ejecutar codigo.

Una extension registra sus implementaciones a traves de un conjunto de funciones `_register()`.
Cada funcion acepta un conjunto de punteros a funciones y los escribe
en las variables globales `extern` del nucleo.

Dependiendo de los objetivos de la extension, `allow_override` permite re-registrar legalmente los punteros a funciones.
Por defecto, `TrueAsync` prohibe que dos extensiones definan los mismos grupos de `API`.

`TrueAsync` se divide en varias categorias, cada una con su propia funcion de registro:
* `Scheduler` -- API relacionado con la funcionalidad central. Contiene la mayoria de las diferentes funciones
* `Reactor` -- API para trabajar con el `Event loop` y eventos. Contiene funciones para crear diferentes tipos de eventos y gestionar el ciclo de vida del reactor
* `ThreadPool` -- API para gestionar el pool de hilos y la cola de tareas
* `Async IO` -- API para E/S asincrona, incluyendo descriptores de archivo, sockets y UDP
* `Pool` -- API para gestionar pools universales de recursos, con soporte de healthcheck y circuit breaker

```c
zend_async_scheduler_register(
    char *module,                    // Module name
    bool allow_override,             // Allow overwrite
    zend_async_scheduler_launch_t,   // Launch scheduler
    zend_async_new_coroutine_t,      // Create coroutine
    zend_async_new_scope_t,          // Create scope
    zend_async_new_context_t,        // Create context
    zend_async_spawn_t,              // Spawn coroutine
    zend_async_suspend_t,            // Suspend
    zend_async_enqueue_coroutine_t,  // Enqueue
    zend_async_resume_t,             // Resume
    zend_async_cancel_t,             // Cancel
    // ... and others
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // Initialize event loop
    zend_async_reactor_shutdown_t,   // Shut down event loop
    zend_async_reactor_execute_t,    // One reactor tick
    zend_async_reactor_loop_alive_t, // Are there active events
    zend_async_new_socket_event_t,   // Create poll event
    zend_async_new_timer_event_t,    // Create timer
    zend_async_new_signal_event_t,   // Subscribe to signal
    // ... and others
);
```
