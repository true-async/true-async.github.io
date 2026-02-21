---
layout: architecture
lang: it
path_key: "/architecture/async-gc.html"
nav_active: architecture
permalink: /it/architecture/async-gc.html
page_title: "Garbage Collection nel Contesto Asincrono"
description: "Come il GC di PHP funziona con coroutine, scope e contesti -- handler get_gc, coroutine zombie, riferimenti circolari."
---

# Garbage Collection nel Contesto Asincrono

In `PHP`, il garbage collector normalmente funziona in modo sincrono. Quando il buffer delle possibili radici è pieno,
viene chiamato `gc_collect_cycles()` nel contesto corrente. Il `GC` calcola i riferimenti circolari
e chiama i distruttori degli oggetti in un ciclo per gli oggetti contrassegnati per la cancellazione.

In un ambiente concorrente, questo modello si rompe. Il distruttore di un oggetto potrebbe chiamare `await` --
ad esempio, per chiudere correttamente una connessione al database. Se il `GC` è in esecuzione all'interno di una coroutine,
`await` sospenderà quella coroutine, lasciando il `GC` in uno stato incompleto.
Le altre coroutine vedranno oggetti parzialmente raccolti.

Per questo motivo, `TrueAsync` ha dovuto modificare la logica del garbage collection.

## Coroutine GC

Quando il buffer `gc_possible_root` si riempie e la soglia viene attivata, `zend_gc_collect_cycles()`
si avvia in una coroutine separata.

```c
ZEND_API int zend_gc_collect_cycles(void)
{
    if (UNEXPECTED(ZEND_ASYNC_IS_ACTIVE
        && ZEND_ASYNC_CURRENT_COROUTINE != GC_G(gc_coroutine))) {

        if (GC_G(gc_coroutine)) {
            return 0;  // Il GC è già in esecuzione in un'altra coroutine
        }

        start_gc_in_coroutine();
        return 0;
    }

    // ... raccolta effettiva dei rifiuti
}
```

La coroutine che ha attivato il `GC` non viene bloccata e continua il suo lavoro,
mentre la raccolta dei rifiuti avviene nel prossimo tick dello `Scheduler`.

La coroutine `GC` ottiene il proprio `Scope` di livello superiore (`parent = NULL`).
Questo isola la raccolta dei rifiuti dal codice utente: la cancellazione di uno `Scope` utente
non influenzerà il `GC`.

## Distruttori nelle Coroutine

Il problema principale sorge specificamente quando si chiamano i distruttori, perché i distruttori possono
sospendere inaspettatamente una coroutine. Pertanto, il `GC` utilizza un algoritmo di iteratore concorrente basato su microtask.
Per avviare l'iterazione, il `GC` crea un'ulteriore coroutine iteratrice.
Questo viene fatto per creare l'illusione dell'esecuzione sequenziale, il che semplifica notevolmente il `GC`.

```c
static bool gc_call_destructors_in_coroutine(void)
{
    GC_G(dtor_idx) = GC_FIRST_ROOT;
    GC_G(dtor_end) = GC_G(first_unused);

    // Crea una coroutine figlia per i distruttori
    zend_coroutine_t *coroutine = gc_spawn_destructors_coroutine();

    // La coroutine GC si sospende su dtor_scope
    zend_async_resume_when(GC_G(gc_coroutine), &scope->event, ...);
    ZEND_ASYNC_SUSPEND();   // Il GC dorme mentre i distruttori vengono eseguiti

    return true;
}
```

Il distruttore utilizza il meccanismo Scope non solo per controllare il ciclo di vita delle coroutine, ma anche per
attendere il loro completamento. A questo scopo, viene creato un altro `Scope` figlio
per incapsulare tutte le coroutine distruttore:

```
gc_scope                          <- `GC` di livello superiore
  \-- Coroutine GC                <- marcatura + coordinamento
       \-- dtor_scope             <- scope figlio
            \-- dtor-coroutine[0] <- chiamata dei distruttori (HI_PRIORITY)
```


La coroutine `GC` si iscrive all'evento di completamento di `dtor_scope`. Si risveglierà solo quando
**tutti** i distruttori in `dtor_scope` saranno completati.


![Garbage Collection in una Coroutine Separata](/diagrams/it/architecture-async-gc/gc-coroutine.svg)

## Cosa Succede se un Distruttore Chiama await?

Qui viene utilizzato il classico algoritmo dell'iteratore concorrente basato su microtask:
* Viene registrato un microtask che verrà eseguito se avviene un cambio di contesto
* Se avviene un cambio, il microtask crea un'altra coroutine per l'iterazione

L'iteratore verifica se si trova ancora nella stessa coroutine:

```c
static zend_result gc_call_destructors(uint32_t idx, uint32_t end, ...)
{
    zend_coroutine_t *coroutine = ZEND_ASYNC_CURRENT_COROUTINE;

    while (idx != end) {
        obj->handlers->dtor_obj(obj);   // chiama il distruttore

        // Se la coroutine è cambiata -- il distruttore ha chiamato await
        if (coroutine != NULL && coroutine != *current_coroutine_ptr) {
            return FAILURE;   // interrompe l'attraversamento
        }
        idx++;
    }
    return SUCCESS;
}
```

Se `ZEND_ASYNC_CURRENT_COROUTINE` è cambiato, significa che il distruttore ha chiamato `await`
e la coroutine corrente è andata a dormire. In questo caso, l'iteratore semplicemente esce, e il prossimo passo dell'iterazione
verrà lanciato in una nuova coroutine.
