---
layout: architecture
lang: es
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /es/architecture/fibers.html
page_title: "Fibers en TrueAsync"
description: "Cómo TrueAsync modifica el comportamiento de Fiber: modo corutina, GC, refcount, parámetros, exit/bailout, destructores."
---

# Fibers en TrueAsync

En `PHP` estándar, un fiber (`Fiber`) es un hilo cooperativo con su propia pila de llamadas.
Cuando la extensión `TrueAsync` está conectada, el fiber cambia al **modo corutina**:
en lugar de conmutar directamente entre pilas, el fiber obtiene su propia corutina,
gestionada por el planificador (`Scheduler`).

Este artículo describe los cambios clave en el comportamiento de los fibers al trabajar con `TrueAsync`.

## Modo corutina del fiber

Al crear `new Fiber(callable)`, si `TrueAsync` está activo, en lugar de inicializar
el contexto de conmutación de pilas se crea una corutina:

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

La llamada a `$fiber->start()` no conmuta la pila directamente, sino que coloca la corutina
en la cola del planificador mediante `ZEND_ASYNC_ENQUEUE_COROUTINE`, tras lo cual el código
que realizó la llamada se suspende en `zend_fiber_await()` hasta que el fiber finalice o se suspenda.

## Ciclo de vida del refcount de la corutina

El fiber mantiene explícitamente su corutina mediante `ZEND_ASYNC_EVENT_ADD_REF`:

```
Después del constructor:  coroutine refcount = 1 (planificador)
Después de start():       coroutine refcount = 2 (planificador + fiber)
```

El `+1` adicional del fiber es necesario para que la corutina permanezca viva
después de finalizar; de lo contrario, `getReturn()`, `isTerminated()` y otros métodos
no podrían acceder al resultado.

La liberación del `+1` ocurre en el destructor del fiber (`zend_fiber_object_destroy`):

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Parámetros de Fiber::start() — copia al heap

El macro `Z_PARAM_VARIADIC_WITH_NAMED` al analizar los argumentos de `Fiber::start()`
establece `fcall->fci.params` como un puntero directamente a la pila del frame de la VM.
En PHP estándar esto es seguro — `zend_fiber_execute` se invoca inmediatamente
mediante conmutación de pila, y el frame de `Fiber::start()` todavía está activo.

En modo corutina, `fcall->fci.params` puede convertirse en
un puntero colgante si la corutina esperada se destruye primero.
No es posible garantizar que esto nunca ocurra.

Por eso, después de analizar los parámetros, los copiamos a memoria heap:

```c
if (fiber->coroutine != NULL && fiber->fcall != NULL) {
    if (fiber->fcall->fci.param_count > 0) {
        uint32_t count = fiber->fcall->fci.param_count;
        zval *heap_params = emalloc(sizeof(zval) * count);
        for (uint32_t i = 0; i < count; i++) {
            ZVAL_COPY(&heap_params[i], &fiber->fcall->fci.params[i]);
        }
        fiber->fcall->fci.params = heap_params;
    }
    if (fiber->fcall->fci.named_params) {
        GC_ADDREF(fiber->fcall->fci.named_params);
    }
}
```

Ahora `coroutine_entry_point`
puede usar y liberar los parámetros de forma segura.

## GC para fibers en modo corutina

En lugar de agregar el objeto de la corutina al buffer del GC, `zend_fiber_object_gc`
recorre directamente la pila de ejecución de la corutina y pasa las variables encontradas:

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Recorrido de la pila — como para un fiber normal
        for (; ex; ex = ex->prev_execute_data) {
            // ... agregamos CV al buffer del GC ...
        }
    }
}
```

Esto solo funciona para el estado `YIELD` (fiber suspendido mediante `Fiber::suspend()`).
Para otros estados (running, awaiting child) la pila está activa y no se puede recorrer.

## Destructores desde el GC

En PHP estándar, los destructores de objetos encontrados por el `GC` se invocan sincrónicamente
en el mismo contexto. En `TrueAsync`, el GC se ejecuta en una corutina GC separada
(véase [Recolección de basura en contexto asíncrono](async-gc.html)).

Esto significa:

1. **Orden de ejecución** — los destructores se ejecutan de forma asíncrona, después de retornar
   de `gc_collect_cycles()`.

2. **`Fiber::suspend()` en un destructor** — no es posible. El destructor se ejecuta
   en la corutina del GC, no en un fiber. Llamar a `Fiber::suspend()` producirá el error
   «Cannot suspend outside of a fiber».

3. **`Fiber::getCurrent()` en un destructor** — devolverá `NULL`, ya que el destructor
   se ejecuta fuera del contexto de un fiber.

Por esta razón, las pruebas que esperan ejecución sincrónica de destructores
desde el GC dentro de un fiber están marcadas como `skip` para `TrueAsync`.

## Generadores durante el shutdown

En PHP estándar, al destruir un fiber, el generador se marca con el flag
`ZEND_GENERATOR_FORCED_CLOSE`. Esto prohíbe `yield from` en bloques finally —
el generador está muriendo y no debe crear nuevas dependencias.

En `TrueAsync`, la corutina recibe una cancelación elegante (graceful cancellation),
no un cierre forzado. El generador no se marca como `FORCED_CLOSE`, y `yield from`
en bloques finally puede ejecutarse. Esta es una diferencia conocida en el comportamiento.

Aún no está claro si conviene cambiar esto o no.
