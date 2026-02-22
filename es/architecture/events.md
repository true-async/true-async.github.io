---
layout: architecture
lang: es
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /es/architecture/events.html
page_title: "Eventos y el Modelo de Eventos"
description: "La estructura base zend_async_event_t -- fundamento de todas las operaciones asincronas, sistema de callbacks, flags, jerarquia de eventos."
---

# Eventos y el Modelo de Eventos

Un evento (`zend_async_event_t`) es una estructura universal
de la cual **todas** las primitivas asincronas heredan:
corrutinas, `future`, canales, temporizadores, eventos `poll`, senales y otros.

La interfaz unificada de eventos permite:
- Suscribirse a cualquier evento mediante callback
- Combinar eventos heterogeneos en una unica espera
- Gestionar el ciclo de vida mediante conteo de referencias

## Estructura Base

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // Offset to additional data

    union {
        uint32_t ref_count;          // For C objects
        uint32_t zend_object_offset; // For Zend objects
    };

    uint32_t loop_ref_count;         // Event loop reference count

    zend_async_callbacks_vector_t callbacks;

    // Methods
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // Nullable
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // Nullable
    zend_async_event_callbacks_notify_t notify_handler; // Nullable
};
```

### Metodos Virtuales de un Evento

Cada evento tiene un pequeno conjunto de metodos virtuales.

| Metodo           | Proposito                                          |
|------------------|----------------------------------------------------|
| `add_callback`   | Suscribir un callback al evento                    |
| `del_callback`   | Desuscribir un callback                            |
| `start`          | Activar el evento en el reactor                    |
| `stop`           | Desactivar el evento                               |
| `replay`         | Re-entregar el resultado (para futures, corrutinas)|
| `dispose`        | Liberar recursos                                   |
| `info`           | Descripcion textual del evento (para depuracion)   |
| `notify_handler` | Hook llamado antes de notificar a los callbacks    |

#### `add_callback`

Agrega un callback al array dinamico `callbacks` del evento.
Llama a `zend_async_callbacks_push()`,
que incrementa el `ref_count` del callback y agrega el puntero al vector.

#### `del_callback`

Elimina un callback del vector (O(1) mediante intercambio con el ultimo elemento)
y llama a `callback->dispose`.

Escenario tipico: durante una espera `select` sobre multiples eventos,
cuando uno se activa, los demas se desuscriben mediante `del_callback`.

#### `start`

Los metodos `start` y `stop` estan destinados a eventos que pueden colocarse en el `EventLoop`.
Por lo tanto, no todas las primitivas implementan este metodo.

Para eventos del EventLoop, `start` incrementa el `loop_ref_count`, lo que permite
que el evento permanezca en el EventLoop mientras alguien lo necesite.

| Tipo                                            | Que hace `start`                                                          |
|-------------------------------------------------|---------------------------------------------------------------------------|
| Corrutina, `Future`, `Channel`, `Pool`, `Scope` | No hace nada                                                              |
| Timer                                           | `uv_timer_start()` + incrementa `loop_ref_count` y `active_event_count`   |
| Poll                                            | `uv_poll_start()` con mascara de eventos (READABLE/WRITABLE)              |
| Signal                                          | Registra el evento en la tabla global de senales                           |
| IO                                              | Incrementa `loop_ref_count` -- el stream libuv inicia via read/write      |

#### `stop`

El metodo espejo de `start`. Decrementa el `loop_ref_count` para eventos de tipo EventLoop.
La ultima llamada a `stop` (cuando `loop_ref_count` llega a 0) detiene realmente el `handle`.

#### `replay`

Permite a los suscriptores tardios recibir el resultado de un evento ya completado.
Solo lo implementan los tipos que almacenan un resultado.

| Tipo          | Que devuelve `replay`                             |
|---------------|---------------------------------------------------|
| **Corrutina** | `coroutine->result` y/o `coroutine->exception`    |
| **Future**    | `future->result` y/o `future->exception`          |

Si se proporciona un `callback`, se llama sincronamente con el resultado.
Si se proporcionan `result`/`exception`, los valores se copian a los punteros.
Sin `replay`, esperar un evento cerrado produce una advertencia.

#### `dispose`

Este metodo intenta liberar el evento decrementando su `ref_count`.
Si el conteo llega a cero, se activa la liberacion real de recursos.

#### `info`

Una cadena legible para depuracion y registro de logs.

| Tipo                  | Cadena de ejemplo                                                         |
|-----------------------|---------------------------------------------------------------------------|
| **Corrutina**         | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**             | `"Scope #5 created at foo.php:10"`                                        |
| **Future**            | `"FutureState(completed)"` o `"FutureState(pending)"`                     |
| **Iterator**          | `"iterator-completion"`                                                   |


#### `notify_handler`

Un hook que intercepta la notificacion **antes** de que los callbacks reciban el resultado.
Por defecto es `NULL` para todos los eventos. Se usa en `Async\Timeout`:

## Ciclo de Vida del Evento

![Ciclo de Vida del Evento](/diagrams/es/architecture-events/lifecycle.svg)

Un evento pasa por varios estados:
- **Creado** -- memoria asignada, `ref_count = 1`, se pueden suscribir callbacks
- **Activo** -- registrado en el `EventLoop` (`start()`), incrementa `active_event_count`
- **Disparado** -- `libuv` llamo al callback. Para eventos periodicos (timer, poll) -- vuelve a **Activo**. Para eventos de un solo uso (DNS, exec, Future) -- transiciona a **Cerrado**
- **Detenido** -- removido temporalmente del `EventLoop` (`stop()`), puede reactivarse
- **Cerrado** -- `flags |= F_CLOSED`, la suscripcion no es posible, cuando se alcanza `ref_count = 0`, se llama a `dispose`

## Interaccion: Evento, Callback, Corrutina

![Evento -> Callback -> Corrutina](/diagrams/es/architecture-events/callback-flow.svg)

## Doble Vida: Objeto C y Objeto Zend

Los eventos a menudo viven en dos mundos simultaneamente.
Un temporizador, handle `poll` o consulta `DNS` es un objeto `C` interno gestionado por el `Reactor`.
Pero una corrutina o `Future` tambien es un objeto `PHP` accesible desde el codigo de usuario.

Las estructuras C en el `EventLoop` pueden vivir mas tiempo que los objetos `PHP` que las referencian, y viceversa.
Los objetos C usan `ref_count`, mientras que los objetos `PHP` usan `GC_ADDREF/GC_DELREF`
con el recolector de basura.

Por lo tanto, `TrueAsync` soporta varios tipos de vinculaciones entre objetos PHP y objetos C.

### Objeto C

Los eventos internos invisibles desde el codigo PHP usan el campo `ref_count`.
Cuando el ultimo propietario libera la referencia, se llama a `dispose`:

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + dispose when reaching 0
```

### Objeto Zend

Una corrutina es un objeto `PHP` que implementa la interfaz `Awaitable`.
En lugar de `ref_count`, usan el campo `zend_object_offset`,
que apunta al offset de la estructura `zend_object`.

Las macros `ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` funcionan correctamente en todos los casos.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

El `zend_object` es parte de la estructura C del evento
y puede recuperarse usando `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT`.

```c
// Get event from PHP object (accounting for event reference)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// Get PHP object from event
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## Referencia de Evento

Algunos eventos enfrentan un problema arquitectonico: no pueden ser objetos `Zend` directamente.

Por ejemplo, un temporizador. El `PHP GC` puede decidir recolectar el objeto en cualquier momento, pero `libuv` requiere
el cierre asincrono del handle mediante `uv_close()` con un callback. Si el `GC` llama al destructor
mientras `libuv` no ha terminado de trabajar con el handle, obtenemos `use-after-free`.

En este caso, se utiliza el enfoque de **Referencia de Evento**: el objeto `PHP` almacena no el evento en si, sino un puntero a el:

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // Pointer to the actual event
} zend_async_event_ref_t;
```

Con este enfoque, los tiempos de vida del objeto `PHP` y el evento C son **independientes**.
El objeto `PHP` puede ser recolectado por el `GC` sin afectar al `handle`,
y el `handle` se cerrara asincronamente cuando este listo.

La macro `ZEND_ASYNC_OBJECT_TO_EVENT()` reconoce automaticamente una referencia
por el prefijo `flags` y sigue el puntero.

## Sistema de Callbacks

Suscribirse a eventos es el mecanismo principal de interaccion entre las corrutinas y el mundo exterior.
Cuando una corrutina quiere esperar un temporizador, datos de un socket o la finalizacion de otra corrutina,
registra un `callback` en el evento correspondiente.

Cada evento almacena un array dinamico de suscriptores:

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // Pointer to the active iterator index (or NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` resuelve el problema de eliminar callbacks de forma segura durante la iteracion.

### Estructura del Callback

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

Un callback tambien es una estructura con conteo de referencias. Esto es necesario porque un unico `callback`
puede ser referenciado tanto por el vector del evento como por el `waker` de la corrutina simultaneamente.
`ref_count` asegura que la memoria se libere solo cuando ambos lados liberen su referencia.

### Callback de Corrutina

La mayoria de los callbacks en `TrueAsync` se usan para despertar una corrutina.
Por lo tanto, almacenan informacion sobre la corrutina y el evento al que se suscribieron:

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // Inheritance
    zend_coroutine_t *coroutine;         // Who to wake
    zend_async_event_t *event;           // Where it came from
};
```

Esta vinculacion es la base del mecanismo [Waker](/es/architecture/waker.html):

## Flags de Evento

Los flags de bits en el campo `flags` controlan el comportamiento del evento en cada etapa de su ciclo de vida:

| Flag                  | Proposito                                                                        |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | El evento esta completo. `start`/`stop` ya no funcionan, la suscripcion no es posible |
| `F_RESULT_USED`       | Alguien esta esperando el resultado -- no se necesita advertencia de resultado no utilizado |
| `F_EXC_CAUGHT`        | El error sera capturado -- suprimir advertencia de excepcion no manejada          |
| `F_ZVAL_RESULT`       | El resultado en el callback es un puntero a `zval` (no `void*`)                  |
| `F_ZEND_OBJ`          | El evento es un objeto `Zend` -- cambia `ref_count` a `GC_ADDREF`                |
| `F_NO_FREE_MEMORY`    | `dispose` no debe liberar memoria (el objeto no fue asignado via `emalloc`)       |
| `F_EXCEPTION_HANDLED` | La excepcion fue manejada -- no es necesario re-lanzar                            |
| `F_REFERENCE`         | La estructura es una `Referencia de Evento`, no un evento real                    |
| `F_OBJ_REF`           | En `extra_offset` hay un puntero a `zend_object`                                 |
| `F_CLOSE_FD`          | Cerrar el descriptor de archivo al destruir                                       |
| `F_HIDDEN`            | Evento oculto -- no participa en la `Deteccion de Deadlock`                       |

### Deteccion de Deadlock

`TrueAsync` rastrea el numero de eventos activos en el `EventLoop` mediante `active_event_count`.
Cuando todas las corrutinas estan suspendidas y no hay eventos activos -- esto es un `deadlock`:
ningun evento puede despertar ninguna corrutina.

Pero algunos eventos siempre estan presentes en el `EventLoop` y no estan relacionados con la logica de usuario:
temporizadores de `healthcheck` en segundo plano, handlers del sistema. Si se cuentan como "activos",
la `deteccion de deadlock` nunca se activara.

Para tales eventos, se usa el flag `F_HIDDEN`:

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // Mark as hidden
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, but only if NOT hidden
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, but only if NOT hidden
```

## Jerarquia de Eventos

En `C` no hay herencia de clases, pero existe una tecnica: si el primer campo de una estructura
es `zend_async_event_t`, entonces un puntero a la estructura puede convertirse de forma segura
en un puntero a `zend_async_event_t`. Asi es exactamente como todos los eventos especializados
"heredan" de la base:

```
zend_async_event_t
|-- zend_async_poll_event_t      -- polling de fd/socket
|   \-- zend_async_poll_proxy_t  -- proxy para filtrado de eventos
|-- zend_async_timer_event_t     -- temporizadores (de un solo uso y periodicos)
|-- zend_async_signal_event_t    -- senales POSIX
|-- zend_async_process_event_t   -- espera de terminacion de proceso
|-- zend_async_thread_event_t    -- hilos en segundo plano
|-- zend_async_filesystem_event_t -- cambios en el sistema de archivos
|-- zend_async_dns_nameinfo_t    -- DNS inverso
|-- zend_async_dns_addrinfo_t    -- resolucion DNS
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- socket servidor TCP
|-- zend_async_trigger_event_t   -- activacion manual (seguro entre hilos)
|-- zend_async_task_t            -- tarea del pool de hilos
|-- zend_async_io_t              -- E/S unificada
|-- zend_coroutine_t             -- corrutina
|-- zend_future_t                -- future
|-- zend_async_channel_t         -- canal
|-- zend_async_group_t           -- grupo de tareas
|-- zend_async_pool_t            -- pool de recursos
\-- zend_async_scope_t           -- scope
```

Gracias a esto, un `Waker` puede suscribirse a **cualquiera** de estos eventos
con la misma llamada `event->add_callback`, sin conocer el tipo especifico.

### Ejemplos de Estructuras Especializadas

Cada estructura agrega a la base del evento solo aquellos campos
que son especificos de su tipo:

**Timer** -- extension minima:
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // Milliseconds
    bool is_periodic;
};
```

**Poll** -- seguimiento de E/S en un descriptor:
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // What to track: READABLE|WRITABLE|...
    async_poll_event triggered_events; // What actually happened
};
```

**Filesystem** -- monitoreo del sistema de archivos:
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // Which file changed
};
```

**Exec** -- ejecucion de comandos externos:
```c
struct _zend_async_exec_event_s {
    zend_async_event_t base;
    zend_async_exec_mode exec_mode;    // exec/system/passthru/shell_exec
    bool terminated;
    char *cmd;
    zval *return_value;
    zend_long exit_code;
    int term_signal;
};
```

## Poll Proxy

Imagine una situacion: dos corrutinas en un unico socket TCP -- una leyendo, la otra escribiendo.
Necesitan diferentes eventos (`READABLE` vs `WRITABLE`), pero el socket es uno.

`Poll Proxy` resuelve este problema. En lugar de crear dos handles `uv_poll_t`
para el mismo fd (lo cual es imposible en `libuv`), se crea un unico `poll_event`
junto con varios proxies con diferentes mascaras:

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // Parent poll
    async_poll_event events;               // Event subset for this proxy
    async_poll_event triggered_events;     // What fired
};
```

El `Reactor` agrega las mascaras de todos los proxies activos y pasa la mascara combinada a `uv_poll_start`.
Cuando `libuv` reporta un evento, el `Reactor` verifica cada proxy
y notifica solo aquellos cuya mascara coincidio.

## Async IO

Para operaciones de E/S en flujo (lectura de un archivo, escritura en un socket, trabajo con pipes),
`TrueAsync` proporciona un `handle` unificado:

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // For PIPE/FILE
        zend_socket_t socket;        // For TCP/UDP
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

La misma interfaz `ZEND_ASYNC_IO_READ/WRITE/CLOSE` funciona con cualquier tipo,
y la implementacion especifica se selecciona al momento de crear el `handle` segun el `type`.

Todas las operaciones de E/S son asincronas y devuelven un `zend_async_io_req_t` -- una solicitud de un solo uso:

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // Operation error (or NULL)
    char *buf;                 // Data buffer
    bool completed;            // Operation complete?
    void (*dispose)(zend_async_io_req_t *req);
};
```

Una corrutina llama a `ZEND_ASYNC_IO_READ`, recibe un `req`,
se suscribe a su finalizacion mediante el `Waker`, y se duerme.
Cuando `libuv` completa la operacion, `req->completed` se convierte en `true`,
el callback despierta la corrutina, y esta recupera los datos de `req->buf`.
