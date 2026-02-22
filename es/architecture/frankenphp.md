---
layout: architecture
lang: es
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /es/architecture/frankenphp.html
page_title: "Integracion con FrankenPHP"
description: "Como TrueAsync convierte a FrankenPHP en un servidor completamente asincrono -- una corrutina por solicitud, respuestas sin copia, doble via de notificacion."
---

# TrueAsync + FrankenPHP: Muchas Solicitudes, Un Hilo

En este articulo, examinamos la experiencia de integrar `FrankenPHP` con `TrueAsync`.
`FrankenPHP` es un servidor basado en `Caddy` que ejecuta codigo `PHP` dentro de un proceso `Go`.
Agregamos soporte de `TrueAsync` a `FrankenPHP`, permitiendo que cada hilo `PHP` maneje multiples solicitudes simultaneamente,
usando corrutinas de `TrueAsync` para la orquestacion.

## Como Funciona FrankenPHP

`FrankenPHP` es un proceso que agrupa el mundo `Go` (`Caddy`) y `PHP` juntos.
`Go` es dueno del proceso, mientras que `PHP` actua como un "plugin" con el que `Go` interactua a traves de `SAPI`.
Para que esto funcione, la maquina virtual `PHP` se ejecuta en un hilo separado. `Go` crea estos hilos
y llama a funciones `SAPI` para ejecutar codigo `PHP`.

Para cada solicitud, `Caddy` crea una goroutine separada que maneja la solicitud HTTP.
La goroutine selecciona un hilo `PHP` libre del pool y envia los datos de la solicitud a traves de un canal,
luego entra en estado de espera.

Cuando `PHP` termina de formar la respuesta, la goroutine la recibe a traves del canal y la pasa de vuelta a `Caddy`.

Cambiamos este enfoque para que las goroutines ahora envien multiples solicitudes al mismo hilo `PHP`,
y el hilo `PHP` aprenda a manejar dichas solicitudes de forma asincrona.

### Arquitectura General

![Arquitectura General de FrankenPHP + TrueAsync](/diagrams/es/architecture-frankenphp/architecture.svg)

El diagrama muestra tres capas. Examinemos cada una.

### Integrando Go en el Planificador de TrueAsync

Para que la aplicacion funcione, el `Reactor` y el `Scheduler` de PHP deben integrarse con `Caddy`.
Por lo tanto, necesitamos algun mecanismo de comunicacion entre hilos que sea compatible
tanto con el mundo `Go` como con el de `PHP`. Los canales `Go` son excelentes para la transferencia de datos entre hilos
y son accesibles desde `C-Go`. Pero no son suficientes, ya que el ciclo del `EventLoop` puede dormirse.

Existe un viejo enfoque bien conocido
que se puede encontrar en casi cualquier servidor web: una combinacion de un canal de transferencia
y un `fdevent` (en macOS/Windows se usa un `pipe`).

Si el canal no esta vacio, `PHP` estara leyendo de el, asi que simplemente agregamos otro valor.
Si el canal esta vacio, el hilo `PHP` esta durmiendo y necesita ser despertado. Para eso sirve `Notify()`.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- the fastest option
        // ...
    }
    // Fallback: pipe for macOS/BSD
    syscall.Pipe(fds[:])
}
```

En el lado de `PHP`, el descriptor `eventfd` se registra en el `Reactor`:

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

El `Reactor` (basado en `libuv`) comienza a monitorear el descriptor. Tan pronto como `Go` escribe
en `eventfd`, el `Reactor` se despierta y llama al callback de manejo de solicitudes.

Ahora, cuando una goroutine empaqueta los datos de la solicitud
en una estructura `contextHolder` y los pasa al `Dispatcher` para su entrega al hilo `PHP`.
El `Dispatcher` recorre los hilos `PHP` en round-robin
e intenta enviar el contexto de la solicitud al
canal `Go` con buffer (`requestChan`) vinculado a un hilo especifico.
Si el buffer esta lleno, el `Dispatcher` prueba con el siguiente hilo.
Si todos estan ocupados -- el cliente recibe `HTTP 503`.

```go
start := w.rrIndex.Add(1) % uint32(len(w.threads))
for i := 0; i < len(w.threads); i++ {
    idx := (start + uint32(i)) % uint32(len(w.threads))
    select {
    case thread.requestChan <- ch:
        if len(thread.requestChan) == 1 {
            thread.asyncNotifier.Notify()
        }
        return nil
    default:
        continue
    }
}
return ErrAllBuffersFull // HTTP 503
```

### Integracion con el Planificador

Cuando `FrankenPHP` se inicializa y crea hilos `PHP`,
se integra con el `Reactor`/`Scheduler` usando el `True Async ABI` (`zend_async_API.h`).

La funcion `frankenphp_enter_async_mode()` es responsable de este proceso y se llama una vez
cuando el script `PHP` registra un callback via `HttpServer::onRequest()`:

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Get the notifier FD from Go
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. Register FD in the Reactor (slow path)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. Launch the Scheduler
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. Replace the heartbeat handler (fast path)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. Suspend the main coroutine
    frankenphp_suspend_main_coroutine();

    // --- we only reach here on shutdown ---

    // 6. Restore the heartbeat handler
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. Release resources
    close_request_event();
}
```

Usamos un `heartbeat handler`, un callback especial del `Scheduler`, para agregar nuestro propio handler
para cada tick del `Scheduler`. Este handler permite a `FrankenPHP` crear nuevas
corrutinas para el procesamiento de solicitudes.

![Sistema de Doble Notificacion](/diagrams/es/architecture-frankenphp/notification.svg)

Ahora el `Scheduler` llama al `heartbeat handler` en cada tick. Este handler
verifica el canal `Go` a traves de `CGo`:

```c
void frankenphp_scheudler_tick_handler(void) {
    uint64_t request_id;
    while ((request_id = go_async_worker_check_requests(thread_index)) != 0) {
        if (request_id == UINT64_MAX) {
            ZEND_ASYNC_SHUTDOWN();
            return;
        }
        frankenphp_handle_request_async(request_id);
    }
    if (old_heartbeat_handler) old_heartbeat_handler();
}
```

Sin llamadas al sistema, sin `epoll_wait`, una llamada directa a una funcion `Go` via `CGo`.
Retorno instantaneo si el canal esta vacio.
La operacion mas economica posible, que es un requisito obligatorio para el `heartbeat handler`.

Si todas las corrutinas estan dormidas, el `Scheduler` pasa el control al `Reactor`,
y el `heartbeat` deja de pulsar. Entonces el `AsyncNotifier` entra en accion:
el `Reactor` espera en `epoll`/`kqueue` y se despierta cuando `Go` escribe en el descriptor.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

Los dos sistemas se complementan entre si: `heartbeat` proporciona latencia minima bajo carga,
mientras que el `poll event` asegura consumo cero de `CPU` durante periodos de inactividad.

### Creacion de una Corrutina de Solicitud

La funcion `frankenphp_request_coroutine_entry()` es responsable de crear la corrutina de manejo de solicitudes:

![Ciclo de Vida de la Solicitud](/diagrams/es/architecture-frankenphp/request-lifecycle.svg)

```c
void frankenphp_handle_request_async(uint64_t request_id) {
    zend_async_scope_t *request_scope =
        ZEND_ASYNC_NEW_SCOPE(ZEND_ASYNC_CURRENT_SCOPE);

    zend_coroutine_t *coroutine =
        ZEND_ASYNC_NEW_COROUTINE(request_scope);

    coroutine->internal_entry = frankenphp_request_coroutine_entry;
    coroutine->extended_data = (void *)(uintptr_t)request_id;

    ZEND_ASYNC_ENQUEUE_COROUTINE(coroutine);
}
```

Se crea un **`Scope` separado** para cada solicitud. Este es un contexto aislado
que permite controlar el ciclo de vida de la corrutina y sus recursos.
Cuando un `Scope` se completa, todas las corrutinas dentro de el se cancelan.

### Interaccion con el Codigo PHP

Para crear corrutinas, `FrankenPHP` necesita conocer la funcion handler.
La funcion handler debe ser definida por el programador PHP.
Esto requiere codigo de inicializacion en el lado de `PHP`. La funcion `HttpServer::onRequest()`
sirve como este inicializador, registrando un callback `PHP` para manejar solicitudes `HTTP`.

Desde el lado de `PHP`, todo se ve simple:

```php
use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response) {
    $uri = $request->getUri();
    $body = $request->getBody();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['uri' => $uri]));
    $response->end();
});
```

La inicializacion ocurre en la corrutina principal.
El programador debe crear un objeto `HttpServer`, llamar a `onRequest()` y "arrancar" explicitamente el servidor.
Despues de eso, `FrankenPHP` toma el control y bloquea la corrutina principal hasta que el servidor se apague.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // always false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

Para enviar resultados de vuelta a `Caddy`, el codigo `PHP` usa el objeto `Response`,
que proporciona los metodos `write()` y `end()`.
Internamente, la memoria se copia y los resultados se envian al canal.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## Codigo Fuente

El repositorio de integracion es un fork de `FrankenPHP` con la rama `true-async`:

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) -- repositorio de integracion

Archivos clave:

| Archivo                                                                                                     | Descripcion                                                                  |
|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | Integracion con `Scheduler`/`Reactor`: heartbeat, poll event, creacion de corrutinas |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | Clases PHP `HttpServer`, `Request`, `Response`                                |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Lado Go: `round-robin`, `requestChan`, `responseChan`, exports `CGo`          |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`: `eventfd` (Linux) / `pipe` (macOS)                           |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | Documentacion de la integracion                                               |

ABI de TrueAsync usado por la integracion:

| Archivo                                                                                                  | Descripcion                                        |
|----------------------------------------------------------------------------------------------------------|----------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.h) | Definicion del API: macros, punteros a funciones, tipos |
| [`Zend/zend_async_API.c`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.c) | Infraestructura: registro, implementaciones stub    |
