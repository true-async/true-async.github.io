---
layout: architecture
lang: es
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /es/architecture/waker.html
page_title: "Waker -- Mecanismo de Espera y Activacion"
description: "Diseno interno del Waker -- el enlace entre corrutinas y eventos: estados, resume_when, timeout, entrega de errores."
---

# Mecanismo de Espera y Activacion de Corrutinas

Para almacenar el contexto de espera de una corrutina,
`TrueAsync` utiliza la estructura `Waker`.
Sirve como el enlace entre una corrutina y los eventos a los que esta suscrita.
Gracias al `Waker`, una corrutina siempre sabe exactamente que eventos esta esperando.

## Estructura del Waker

Para optimizacion de memoria, el `waker` esta integrado directamente en la estructura de la corrutina (`zend_coroutine_t`),
lo que evita asignaciones adicionales y simplifica la gestion de memoria,
aunque se usa un puntero `zend_async_waker_t *waker` en el codigo por compatibilidad hacia atras.

El `Waker` contiene una lista de eventos esperados y agrega el resultado de espera o la excepcion.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // Events the coroutine is waiting for
    HashTable events;

    // Events that fired on the last iteration
    HashTable *triggered_events;

    // Wake-up result
    zval result;

    // Error (if wake-up was caused by an error)
    zend_object *error;

    // Creation point (for debugging)
    zend_string *filename;
    uint32_t lineno;

    // Destructor
    zend_async_waker_dtor dtor;
};
```

## Estados del Waker

En cada etapa de la vida de una corrutina, el `Waker` se encuentra en uno de cinco estados:

![Estados del Waker](/diagrams/es/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Waker is not active
    ZEND_ASYNC_WAKER_WAITING,   // Coroutine is waiting for events
    ZEND_ASYNC_WAKER_QUEUED,    // Coroutine is queued for execution
    ZEND_ASYNC_WAKER_IGNORED,   // Coroutine was skipped
    ZEND_ASYNC_WAKER_RESULT     // Result is available
} ZEND_ASYNC_WAKER_STATUS;
```

Una corrutina comienza con `NO_STATUS` -- el `Waker` existe pero no esta activo; la corrutina se esta ejecutando.
Cuando la corrutina llama a `SUSPEND()`, el `Waker` transiciona a `WAITING` y comienza a monitorear eventos.

Cuando uno de los eventos se dispara, el `Waker` transiciona a `QUEUED`: el resultado se guarda,
y la corrutina se coloca en la cola del `Scheduler` esperando un cambio de contexto.

El estado `IGNORED` es necesario para casos cuando una corrutina ya esta en la cola pero debe ser destruida.
En ese caso, el `Scheduler` no lanza la corrutina sino que finaliza inmediatamente su estado.

Cuando la corrutina se despierta, el `Waker` transiciona al estado `RESULT`.
En este punto, `waker->error` se transfiere a `EG(exception)`.
Si no hay errores, la corrutina puede usar `waker->result`. Por ejemplo, `result` es lo que
devuelve la funcion `await()`.

## Creacion de un Waker

```c
// Get waker (create if it doesn't exist)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// Reinitialize waker for a new wait
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// With timeout and cancellation
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` destruye el waker existente
y lo reinicia a su estado inicial. Esto permite reutilizar
el waker sin asignaciones.

## Suscripcion a Eventos

El modulo zend_async_API.c proporciona varias funciones listas para vincular una corrutina a un evento:

```c
zend_async_resume_when(
    coroutine,        // Which coroutine to wake
    event,            // Which event to subscribe to
    trans_event,      // Transfer event ownership
    callback,         // Callback function
    event_callback    // Coroutine callback (or NULL)
);
```

`resume_when` es la funcion principal de suscripcion.
Crea un `zend_coroutine_event_callback_t`, lo vincula
al evento y al waker de la corrutina.

Como funcion de callback, se puede usar una de tres estandar,
dependiendo de como se quiera despertar la corrutina:

```c
// Successful result
zend_async_waker_callback_resolve(event, callback, result, exception);

// Cancellation
zend_async_waker_callback_cancel(event, callback, result, exception);

// Timeout
zend_async_waker_callback_timeout(event, callback, result, exception);
```
