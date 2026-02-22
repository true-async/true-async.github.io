---
layout: architecture
lang: es
path_key: "/architecture/async-gc.html"
nav_active: architecture
permalink: /es/architecture/async-gc.html
page_title: "Recoleccion de Basura en Contexto Asincrono"
description: "Como funciona el GC de PHP con corrutinas, scope y contextos -- handlers get_gc, corrutinas zombie, referencias circulares."
---

# Recoleccion de Basura en Contexto Asincrono

En `PHP`, el recolector de basura normalmente funciona de forma sincrona. Cuando el buffer de posibles raices se llena,
se invoca `gc_collect_cycles()` en el contexto actual. El `GC` calcula las referencias circulares
y llama a los destructores de objetos en un bucle para los objetos marcados para eliminacion.

En un entorno concurrente, este modelo falla. El destructor de un objeto puede llamar a `await` --
por ejemplo, para cerrar correctamente una conexion a base de datos. Si el `GC` se ejecuta dentro de una corrutina,
`await` suspendera esa corrutina, dejando al `GC` en un estado incompleto.
Otras corrutinas veran objetos parcialmente recolectados.

Por esta razon, `TrueAsync` tuvo que modificar la logica de recoleccion de basura.

## Corrutina del GC

Cuando el buffer `gc_possible_root` se llena y se activa el umbral, `zend_gc_collect_cycles()`
se ejecuta en una corrutina separada.

```c
ZEND_API int zend_gc_collect_cycles(void)
{
    if (UNEXPECTED(ZEND_ASYNC_IS_ACTIVE
        && ZEND_ASYNC_CURRENT_COROUTINE != GC_G(gc_coroutine))) {

        if (GC_G(gc_coroutine)) {
            return 0;  // GC is already running in another coroutine
        }

        start_gc_in_coroutine();
        return 0;
    }

    // ... actual garbage collection
}
```

La corrutina que activo el `GC` no se bloquea y continua su trabajo,
mientras que la recoleccion de basura ocurre en el siguiente tick del `Scheduler`.

La corrutina del `GC` obtiene su propio `Scope` de nivel superior (`parent = NULL`).
Esto aisla la recoleccion de basura del codigo de usuario: cancelar un `Scope` de usuario
no afectara al `GC`.

## Destructores en Corrutinas

El problema principal surge especificamente al llamar destructores, porque los destructores pueden suspender
inesperadamente una corrutina. Por lo tanto, el `GC` utiliza un algoritmo de iterador concurrente basado en microtareas.
Para iniciar la iteracion, el `GC` crea otra corrutina iteradora.
Esto se hace para crear la ilusion de ejecucion secuencial, lo que simplifica considerablemente el `GC`.

```c
static bool gc_call_destructors_in_coroutine(void)
{
    GC_G(dtor_idx) = GC_FIRST_ROOT;
    GC_G(dtor_end) = GC_G(first_unused);

    // Create child coroutine for destructors
    zend_coroutine_t *coroutine = gc_spawn_destructors_coroutine();

    // GC coroutine suspends on dtor_scope
    zend_async_resume_when(GC_G(gc_coroutine), &scope->event, ...);
    ZEND_ASYNC_SUSPEND();   // GC sleeps while destructors run

    return true;
}
```

El destructor utiliza el mecanismo de Scope no solo para controlar el tiempo de vida de las corrutinas, sino tambien para
esperar su finalizacion. Para este proposito, se crea otro `Scope` hijo
que encapsula todas las corrutinas de destructores:

```
gc_scope                          <- `GC` de nivel superior
  \-- GC coroutine                <- marcado + coordinacion
       \-- dtor_scope             <- scope hijo
            \-- dtor-coroutine[0] <- llamada a destructores (HI_PRIORITY)
```


La corrutina del `GC` se suscribe al evento de finalizacion de `dtor_scope`. Se despertara solo cuando
**todos** los destructores en `dtor_scope` hayan completado.


![Recoleccion de Basura en una Corrutina Separada](/diagrams/es/architecture-async-gc/gc-coroutine.svg)

## Que Pasa Si un Destructor Llama a await?

Aqui se utiliza el algoritmo clasico de iterador concurrente basado en microtareas:
* Se registra una microtarea que se ejecutara si ocurre un cambio de contexto
* Si ocurre un cambio, la microtarea crea otra corrutina para la iteracion

El iterador verifica si todavia esta en la misma corrutina:

```c
static zend_result gc_call_destructors(uint32_t idx, uint32_t end, ...)
{
    zend_coroutine_t *coroutine = ZEND_ASYNC_CURRENT_COROUTINE;

    while (idx != end) {
        obj->handlers->dtor_obj(obj);   // call destructor

        // If the coroutine changed -- the destructor called await
        if (coroutine != NULL && coroutine != *current_coroutine_ptr) {
            return FAILURE;   // abort traversal
        }
        idx++;
    }
    return SUCCESS;
}
```

Si `ZEND_ASYNC_CURRENT_COROUTINE` ha cambiado, significa que el destructor llamo a `await`
y la corrutina actual se durmio. En este caso, el iterador simplemente sale, y el siguiente paso de iteracion
se lanzara en una nueva corrutina.
