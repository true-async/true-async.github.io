---
layout: architecture
lang: es
path_key: "/architecture/scheduler-reactor.html"
nav_active: architecture
permalink: /es/architecture/scheduler-reactor.html
page_title: "Planificador y Reactor"
description: "Diseno interno del planificador de corrutinas y el reactor de eventos -- colas, cambio de contexto, libuv, pool de fiber."
---

# Corrutinas, Planificador y Reactor

`Scheduler` y `Reactor` son los dos componentes principales del runtime.
`Scheduler` gestiona la cola de corrutinas y el cambio de contexto,
mientras que `Reactor` maneja los eventos de `E/S` a traves del `Event loop`.

![Interaccion entre Planificador y Reactor](/diagrams/es/architecture-scheduler-reactor/architecture.svg)

## Planificador

### Corrutina del Planificador y Minimizacion de Cambios de Contexto

En muchas implementaciones de corrutinas, el `scheduler` usa un hilo separado
o al menos un contexto de ejecucion separado. Una corrutina llama a `yield`,
el control pasa al `scheduler`, que elige la siguiente corrutina y cambia a ella.
Esto resulta en **dos** cambios de contexto por `suspend`/`resume`: corrutina -> scheduler -> corrutina.

En `TrueAsync`, el `Scheduler` tiene **su propia corrutina** (`ZEND_ASYNC_SCHEDULER`)
con un contexto dedicado. Cuando todas las corrutinas de usuario estan dormidas y la cola esta vacia,
el control se pasa a esta corrutina, donde se ejecuta el bucle principal: `reactor tick`, `microtareas`.

Dado que las corrutinas usan un contexto de ejecucion completo (pila + registros),
el cambio de contexto toma aproximadamente 10-20 ns en `x86` moderno.
Por lo tanto, `TrueAsync` optimiza el numero de cambios
permitiendo que algunas operaciones se ejecuten directamente en el contexto de la corrutina actual, sin cambiar al planificador.

Cuando una corrutina llama a una operacion `SUSPEND()`, se invoca `scheduler_next_tick()` directamente en el contexto de la corrutina actual --
una funcion que realiza un tick del planificador: microtareas, reactor, verificacion de cola.
Si hay una corrutina lista en la cola, el `Scheduler` cambia a ella **directamente**,
sin pasar por su propia corrutina. Esto es un `cambio de contexto` en lugar de dos.
Ademas, si la siguiente corrutina en la cola aun no ha iniciado y la actual ya termino,
no se necesita ningun cambio -- la nueva corrutina recibe el contexto actual.

Cambiar a la corrutina del `Scheduler` (via `switch_to_scheduler()`) ocurre **solo** si:
- La cola de corrutinas esta vacia y el reactor necesita esperar eventos
- El cambio a otra corrutina fallo
- Se detecta un deadlock

### Bucle Principal

![Bucle Principal del Planificador](/diagrams/es/architecture-scheduler-reactor/scheduler-loop.svg)

En cada tick, el planificador realiza:

1. **Microtareas** -- procesamiento de la cola `microtasks` (pequenas tareas sin cambio de contexto)
2. **Cola de corrutinas** -- extraccion de la siguiente corrutina de `coroutine_queue`
3. **Cambio de contexto** -- `zend_fiber_switch_context()` a la corrutina seleccionada
4. **Manejo de resultados** -- verificacion del estado de la corrutina despues del retorno
5. **Reactor** -- si la cola esta vacia, llamar a `ZEND_ASYNC_REACTOR_EXECUTE(no_wait)`

### Microtareas

No toda accion merece una corrutina. A veces necesitas hacer algo rapido
entre cambios: actualizar un contador, enviar una notificacion, liberar un recurso.
Crear una corrutina para esto es excesivo, pero la accion necesita realizarse lo antes posible.
Aqui es donde las microtareas son utiles -- handlers ligeros que se ejecutan
directamente en el contexto de la corrutina actual, sin cambio de contexto.

Las microtareas deben ser handlers ligeros y rapidos ya que obtienen acceso directo
al bucle del planificador. En versiones tempranas de `TrueAsync`, las microtareas podian residir en PHP-land, pero
debido a reglas estrictas y consideraciones de rendimiento, se decidio mantener este mecanismo
solo para codigo C.

```c
struct _zend_async_microtask_s {
    zend_async_microtask_handler_t handler;
    zend_async_microtask_handler_t dtor;
    bool is_cancelled;
    uint32_t ref_count;
};
```

En `TrueAsync`, las microtareas se procesan mediante una cola FIFO antes de cada cambio de corrutina.
Si una microtarea lanza una excepcion, el procesamiento se interrumpe.
Despues de la ejecucion, la microtarea se elimina inmediatamente de la cola, y su conteo de referencias activas se decrementa en uno.

Las microtareas se usan en escenarios como el iterador concurrente, permitiendo que la iteracion
se transfiera automaticamente a otra corrutina si la anterior entro en estado de espera.

### Prioridades de Corrutinas

Internamente, `TrueAsync` usa el tipo mas simple de cola: un buffer circular. Esta es probablemente la mejor solucion
en terminos de equilibrio entre simplicidad, rendimiento y funcionalidad.

No hay garantia de que el algoritmo de cola no cambie en el futuro. Dicho esto, hay raras ocasiones
en que la prioridad de las corrutinas importa.

Actualmente, se usan dos prioridades:

```c
typedef enum {
    ZEND_COROUTINE_NORMAL = 0,
    ZEND_COROUTINE_HI_PRIORITY = 255
} zend_coroutine_priority;
```

Las corrutinas de alta prioridad se colocan **al inicio** de la cola durante `enqueue`.
La extraccion siempre ocurre desde el inicio. Sin planificacion compleja,
solo orden de insercion. Este es un enfoque deliberadamente simple: dos niveles cubren
las necesidades del mundo real, mientras que colas de prioridad complejas (como en `RTOS`) agregarian sobrecarga
injustificada en el contexto de aplicaciones PHP.

### Suspend y Resume

![Operaciones Suspend y Resume](/diagrams/es/architecture-scheduler-reactor/suspend-resume.svg)

Las operaciones `Suspend` y `Resume` son las tareas centrales del `Scheduler`.

Cuando una corrutina llama a `suspend`, sucede lo siguiente:

1. Los eventos del `waker` de la corrutina se inician (`start_waker_events`).
   Solo en este momento los temporizadores comienzan a contar y los objetos poll
   empiezan a escuchar en los descriptores. Antes de llamar a `suspend`, los eventos no estan activos --
   esto permite preparar todas las suscripciones primero, luego iniciar la espera con una sola llamada.
2. **Sin cambio de contexto**, se llama a `scheduler_next_tick()`:
   - Se procesan las microtareas
   - Se realiza un `reactor tick` (si ha pasado suficiente tiempo)
   - Si hay una corrutina lista en la cola, `execute_next_coroutine()` cambia a ella
   - Si la cola esta vacia, `switch_to_scheduler()` cambia a la corrutina del `scheduler`
3. Cuando el control regresa, la corrutina se despierta con el objeto `waker` que contiene el resultado de `suspend`.

**Ruta de retorno rapido**: si durante `start_waker_events` un evento ya se ha disparado
(por ejemplo, un `Future` ya esta completado), la corrutina **no se suspende en absoluto** --
el resultado esta disponible inmediatamente. Por lo tanto, `await` sobre un
`Future` completado no activa `suspend` y no causa un cambio de contexto, devolviendo el resultado directamente.

## Pool de Contextos

Un contexto es una pila `C` completa (`EG(fiber_stack_size)` por defecto).
Ya que la creacion de pilas es una operacion costosa, `TrueAsync` se esfuerza por optimizar la gestion de memoria.
Consideramos el patron de uso de memoria: las corrutinas mueren y se crean constantemente.
El patron de pool es ideal para este escenario!

```c
struct _async_fiber_context_s {
    zend_fiber_context context;     // Native C fiber (stack + registers)
    zend_vm_stack vm_stack;         // Zend VM stack
    zend_execute_data *execute_data;// Current execute_data
    uint8_t flags;                  // Fiber state
};
```

En lugar de crear y destruir memoria constantemente, el Scheduler devuelve los contextos al pool
y los reutiliza una y otra vez.

Se planifican algoritmos inteligentes de gestion del tamano del pool
que se adaptaran dinamicamente a la carga de trabajo
para minimizar tanto la latencia de `mmap`/`mprotect` como el uso total de memoria.

### Switch Handlers

En `PHP`, muchos subsistemas se basan en una suposicion simple:
el codigo se ejecuta de principio a fin sin interrupcion.
El buffer de salida (`ob_start`), los destructores de objetos, las variables globales --
todo esto funciona linealmente: inicio -> fin.

Las corrutinas rompen este modelo. Una corrutina puede dormirse en medio de su trabajo
y despertar despues de miles de otras operaciones. Entre `LEAVE` y `ENTER`
en el mismo hilo, docenas de otras corrutinas habran ejecutado.

Los `Switch Handlers` son hooks vinculados a una **corrutina especifica**.
A diferencia de las microtareas (que se activan en cualquier cambio),
un `switch handler` se llama solo al entrar y salir de "su" corrutina:

```c
typedef bool (*zend_coroutine_switch_handler_fn)(
    zend_coroutine_t *coroutine,
    bool is_enter,    // true = enter, false = exit
    bool is_finishing // true = coroutine is finishing
    // return: true = keep handler, false = remove
);
```

El valor de retorno controla el tiempo de vida del handler:
* `true` -- el `handler` permanece y sera llamado nuevamente.
* `false` -- el `Scheduler` lo eliminara.

El `Scheduler` llama a los handlers en tres puntos:

```c
ZEND_COROUTINE_ENTER(coroutine)  // Coroutine received control
ZEND_COROUTINE_LEAVE(coroutine)  // Coroutine yielded control (suspend)
ZEND_COROUTINE_FINISH(coroutine) // Coroutine is finishing permanently
```

#### Ejemplo: Buffer de Salida

La funcion `ob_start()` usa una unica pila de handlers.
Cuando una corrutina llama a `ob_start()` y luego se duerme, otra corrutina puede ver el buffer del otro si no se hace nada.
(Por cierto, **Fiber** no maneja correctamente `ob_start()`.)

Un `switch handler` de un solo uso resuelve esto al iniciar la corrutina:
mueve el `OG(handlers)` global al contexto de la corrutina y limpia el estado global.
Despues de esto, cada corrutina trabaja con su propio buffer, y `echo` en una no se mezcla con otra.

#### Ejemplo: Destructores Durante el Cierre

Cuando `PHP` se cierra, se llama a `zend_objects_store_call_destructors()` --
recorriendo el almacen de objetos y llamando a destructores. Normalmente esto es un proceso lineal.

Pero un destructor puede contener `await`. Por ejemplo, un objeto de conexion a base de datos
quiere cerrar correctamente la conexion -- lo cual es una operacion de red.
La corrutina llama a `await` dentro del destructor y se duerme.

Los destructores restantes necesitan continuar. El `switch handler` captura el momento `LEAVE`
y genera una nueva corrutina de alta prioridad que continua el recorrido
desde el objeto donde la anterior se detuvo.

#### Registro

```c
// Add handler to a specific coroutine
ZEND_COROUTINE_ADD_SWITCH_HANDLER(coroutine, handler);

// Add to the current coroutine (or to main if Scheduler hasn't started yet)
ZEND_ASYNC_ADD_SWITCH_HANDLER(handler);

// Add handler that fires when the main coroutine starts
ZEND_ASYNC_ADD_MAIN_COROUTINE_START_HANDLER(handler);
```

La ultima macro es necesaria para subsistemas que se inicializan antes de que arranque el `Scheduler`.
Registran un handler globalmente, y cuando el `Scheduler` crea la corrutina `main`,
todos los handlers globales se copian en ella y se disparan como `ENTER`.

## Reactor

### Por que libuv?

`TrueAsync` usa `libuv`, la misma biblioteca que impulsa `Node.js`.

La eleccion es deliberada. `libuv` proporciona:
- Un `API` unificado para `Linux` (`epoll`), macOS (`kqueue`), Windows (`IOCP`)
- Soporte integrado para temporizadores, senales, `DNS`, procesos hijo, E/S de archivos
- Un codigo base maduro probado por miles de millones de solicitudes en produccion

Se consideraron alternativas (`libev`, `libevent`, `io_uring`),
pero `libuv` gana en usabilidad.

### Estructura

```c
// Reactor global data (in ASYNC_G)
uv_loop_t uvloop;
bool reactor_started;
uint64_t last_reactor_tick;

// Signal management
HashTable *signal_handlers;  // signum -> uv_signal_t*
HashTable *signal_events;    // signum -> HashTable* (events)
HashTable *process_events;   // SIGCHLD process events
```

### Tipos de Eventos y Wrappers

Cada evento en `TrueAsync` tiene una naturaleza dual: una estructura `ABI` definida en el nucleo de `PHP`,
y un `libuv handle` que realmente interactua con el `SO`. El `Reactor` los "une",
creando wrappers donde ambos mundos coexisten:

| Tipo de Evento   | Estructura ABI                  | libuv handle                  |
|------------------|---------------------------------|-------------------------------|
| Poll (fd/socket) | `zend_async_poll_event_t`       | `uv_poll_t`                   |
| Timer            | `zend_async_timer_event_t`      | `uv_timer_t`                  |
| Signal           | `zend_async_signal_event_t`     | `uv_signal_t` global          |
| Filesystem       | `zend_async_filesystem_event_t` | `uv_fs_event_t`               |
| DNS              | `zend_async_dns_addrinfo_t`     | `uv_getaddrinfo_t`            |
| Process          | `zend_async_process_event_t`    | `HANDLE` (Win) / `waitpid`    |
| Thread           | `zend_async_thread_event_t`     | `uv_thread_t`                 |
| Exec             | `zend_async_exec_event_t`       | `uv_process_t` + `uv_pipe_t` |
| Trigger          | `zend_async_trigger_event_t`    | `uv_async_t`                  |

Para mas detalles sobre la estructura de eventos, consulte [Eventos y el Modelo de Eventos](/es/architecture/events.html).

### Async IO

Para operaciones en flujo, se usa un `async_io_t` unificado:

```c
struct _async_io_t {
    zend_async_io_t base;   // ABI: event + fd/socket + type + state
    int crt_fd;             // CRT file descriptor
    async_io_req_t *active_req;
    union {
        uv_stream_t stream;
        uv_pipe_t pipe;
        uv_tty_t tty;
        uv_tcp_t tcp;
        uv_udp_t udp;
        struct { zend_off_t offset; } file;
    } handle;
};
```

La misma interfaz (`ZEND_ASYNC_IO_READ/WRITE/CLOSE`) funciona con `PIPE`, `FILE`, `TCP`, `UDP`, `TTY`.
La implementacion especifica se selecciona al momento de crear el handle segun el `type`.

### Bucle del Reactor

`reactor_execute(no_wait)` llama a un tick del `event loop` de `libuv`:
- `no_wait = true` -- llamada no bloqueante, procesa solo eventos listos
- `no_wait = false` -- bloquea hasta el siguiente evento

El `Scheduler` usa ambos modos. Entre cambios de corrutinas -- un tick no bloqueante
para recoger eventos que ya se dispararon. Cuando la cola de corrutinas esta vacia --
una llamada bloqueante para evitar desperdiciar CPU en un bucle inactivo.

Esta es una estrategia clasica del mundo de los servidores orientados a eventos: `nginx`, `Node.js`,
y `Tokio` usan el mismo principio: sondear sin esperar mientras hay trabajo por hacer,
y dormir cuando no hay trabajo.

## Eficiencia de Cambio: TrueAsync en el Contexto de la Industria

### Stackful vs Stackless: Dos Mundos

Existen dos enfoques fundamentalmente diferentes para implementar corrutinas:

**Stackful** (Go, Erlang, Java Loom, PHP Fibers) -- cada corrutina tiene su propia pila C.
El cambio implica guardar/restaurar registros y el puntero de pila.
La ventaja principal: **transparencia**. Cualquier funcion en cualquier profundidad de llamada puede invocar `suspend`
sin requerir anotaciones especiales. El programador escribe codigo sincrono ordinario.

**Stackless** (Rust async/await, Kotlin, C# async) -- el compilador transforma una funcion `async`
en una maquina de estados. "Suspender" es simplemente un `return` de la funcion,
y "reanudar" es una llamada al metodo con un nuevo numero de estado. La pila no se cambia en absoluto.
El costo: **"coloracion de funciones"** (`async` infecta toda la cadena de llamadas).

| Propiedad                                 | Stackful                          | Stackless                          |
|-------------------------------------------|-----------------------------------|------------------------------------|
| Suspension desde llamadas anidadas        | Si                                | No -- solo desde funciones `async` |
| Costo de cambio                           | 15-200 ns (guardado de registros) | 10-50 ns (escritura de campos en objeto) |
| Memoria por corrutina                     | 4-64 KiB (pila separada)         | Tamano exacto de la maquina de estados |
| Optimizacion del compilador a traves de yield | No es posible (pila es opaca) | Posible (inline, HALO)             |

Las `corrutinas PHP` son corrutinas **stackful** basadas en `Boost.Context fcontext_t`.

### Compromiso Arquitectonico

`TrueAsync` elige el modelo **stackful de un solo hilo**:

- **Stackful** -- porque el ecosistema `PHP` es enorme, y "colorear" millones de lineas
  de codigo existente con `async` es costoso. Las corrutinas stackful permiten usar funciones C regulares, lo cual es un requisito critico para PHP.
- **Un solo hilo** -- PHP es historicamente de un solo hilo (sin estado mutable compartido),
  y esta propiedad es mas facil de preservar que lidiar con sus consecuencias.
  Los hilos aparecen solo en el `ThreadPool` para tareas `CPU-bound`.

Dado que `TrueAsync` actualmente reutiliza el `Fiber API` de bajo nivel,
el costo del cambio de contexto es relativamente alto y puede mejorarse en el futuro.

## Apagado Ordenado

Un script `PHP` puede terminar en cualquier momento: una excepcion no manejada, `exit()`,
una senal del SO. Pero en el mundo asincrono, docenas de corrutinas pueden tener conexiones abiertas,
buffers no escritos y transacciones no confirmadas.

`TrueAsync` maneja esto mediante un apagado controlado:

1. `ZEND_ASYNC_SHUTDOWN()` -> `start_graceful_shutdown()` -- establece el flag
2. Todas las corrutinas reciben una `CancellationException`
3. Las corrutinas obtienen la oportunidad de ejecutar bloques `finally` -- cerrar conexiones, vaciar buffers
4. `finally_shutdown()` -- limpieza final de corrutinas restantes y microtareas
5. El Reactor se detiene

```c
#define TRY_HANDLE_EXCEPTION() \
    if (UNEXPECTED(EG(exception) != NULL)) { \
        if (ZEND_ASYNC_GRACEFUL_SHUTDOWN) { \
            finally_shutdown(); \
            break; \
        } \
        start_graceful_shutdown(); \
    }
```
