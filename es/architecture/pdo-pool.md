---
layout: architecture
lang: es
path_key: "/architecture/pdo-pool.html"
nav_active: architecture
permalink: /es/architecture/pdo-pool.html
page_title: "Arquitectura del PDO Pool"
description: "Diseno interno del PDO Pool -- componentes, ciclo de vida de conexiones, vinculacion a corrutinas, gestion de credenciales."
---

# Arquitectura del PDO Pool

> Este articulo describe el diseno interno del PDO Pool.
> Si busca una guia de uso, consulte [PDO Pool: Pool de Conexiones](/es/docs/components/pdo-pool.html).

## Arquitectura de Dos Niveles

El PDO Pool consta de dos capas:

**1. Nucleo PDO (`pdo_pool.c`)** -- logica para vincular conexiones a corrutinas,
gestion de transacciones, conteo de referencias de sentencias.

**2. Async Pool (`zend_async_pool_t`)** -- el pool universal de recursos de la extension asincrona.
Gestiona la cola de conexiones libres, limites y healthchecks.
No sabe nada sobre PDO -- trabaja con valores `zval` abstractos.

Esta separacion permite usar el mismo mecanismo de pooling
para cualquier recurso, no solo bases de datos.

## Diagrama de Componentes

![PDO Pool -- Componentes](/diagrams/es/architecture-pdo-pool/components.svg)

## Conexion Plantilla

Al crear un `PDO` con pool, el nucleo **no abre** una conexion TCP real.
En su lugar, se crea una **plantilla** -- un objeto `pdo_dbh_t` que almacena
el DSN, nombre de usuario, contrasena y una referencia al driver. Todas las conexiones reales se crean despues,
bajo demanda, basandose en esta plantilla.

Para la plantilla, se llama a `db_handle_init_methods()` en lugar de `db_handle_factory()`.
Este metodo establece la tabla de metodos del driver (`dbh->methods`)
pero no crea una conexion TCP ni asigna `driver_data`.

## Ciclo de Vida de la Conexion

![Ciclo de Vida de la Conexion en el Pool](/diagrams/es/architecture-pdo-pool/lifecycle.svg)

## Creacion de una Conexion desde el Pool (Secuencia)

![Creacion de una Conexion desde el Pool](/diagrams/es/architecture-pdo-pool/connection-sequence.svg)

## API Interno

### pdo_pool.c -- Funciones Publicas

| Funcion                    | Proposito                                                      |
|----------------------------|----------------------------------------------------------------|
| `pdo_pool_create()`        | Crea un pool para `pdo_dbh_t` basado en atributos del constructor |
| `pdo_pool_destroy()`       | Libera todas las conexiones, cierra el pool, limpia la tabla hash |
| `pdo_pool_acquire_conn()`  | Devuelve una conexion para la corrutina actual (reutilizacion o adquisicion) |
| `pdo_pool_peek_conn()`     | Devuelve la conexion vinculada sin acquire (NULL si no hay ninguna) |
| `pdo_pool_maybe_release()` | Devuelve la conexion al pool si no hay transaccion ni sentencias |
| `pdo_pool_get_wrapper()`   | Devuelve el objeto PHP `Async\Pool` para el metodo `getPool()` |

### pdo_pool.c -- Callbacks Internos

| Callback                    | Cuando se Llama                                              |
|-----------------------------|--------------------------------------------------------------|
| `pdo_pool_factory()`        | El pool necesita una nueva conexion (acquire cuando el pool esta vacio) |
| `pdo_pool_destructor()`     | El pool destruye una conexion (al cerrar o desalojar)        |
| `pdo_pool_healthcheck()`    | Verificacion periodica -- la conexion sigue viva?            |
| `pdo_pool_before_release()` | Antes de devolver al pool -- rollback de transacciones no confirmadas |
| `pdo_pool_free_conn()`      | Cierra la conexion del driver, libera memoria                |

### Vinculacion a una Corrutina

Las conexiones se vinculan a corrutinas mediante una tabla hash `pool_connections`,
donde la clave es el identificador de la corrutina y el valor es un puntero a `pdo_dbh_t`.

El identificador de la corrutina se calcula mediante la funcion `pdo_pool_coro_key()`:
- Si la corrutina es un objeto PHP -- se usa `zend_object.handle` (uint32_t secuencial)
- Para corrutinas internas -- la direccion del puntero desplazada por `ZEND_MM_ALIGNMENT_LOG2`

### Limpieza al Finalizar la Corrutina

Cuando una conexion se vincula a una corrutina, se registra un `pdo_pool_cleanup_callback`
a traves de `coro->event.add_callback()`. Cuando la corrutina finaliza (normalmente o con error),
el callback devuelve automaticamente la conexion al pool. Esto garantiza que no haya fugas de conexiones
incluso con excepciones no manejadas.

### Fijacion: Bloqueo de Conexion

Una conexion se fija a una corrutina y no volvera al pool si se cumple al menos una condicion:

- `conn->in_txn == true` -- una transaccion activa
- `conn->pool_slot_refcount > 0` -- hay sentencias activas (`PDOStatement`) usando esta conexion

El refcount se incrementa cuando se crea una sentencia y se decrementa cuando se destruye.
Cuando ambas condiciones se despejaron, `pdo_pool_maybe_release()` devuelve la conexion al pool.

## Gestion de Credenciales en la Factoria

Al crear una nueva conexion, `pdo_pool_factory()` **copia** las
cadenas de DSN, nombre de usuario y contrasena desde la plantilla via `estrdup()`. Esto es necesario porque
los drivers pueden mutar estos campos durante `db_handle_factory()`:

- **PostgreSQL** -- reemplaza `;` con espacios en `data_source`
- **MySQL** -- asigna `username`/`password` desde el DSN si no fueron proporcionados
- **ODBC** -- reconstruye completamente `data_source`, incrustando credenciales

Despues de una llamada exitosa a `db_handle_factory()`, las copias se liberan via `efree()`.
En caso de error, la liberacion ocurre a traves de `pdo_pool_free_conn()`,
que tambien es utilizado por el destructor del pool.

## Incompatibilidad con Conexiones Persistentes

Las conexiones persistentes (`PDO::ATTR_PERSISTENT`) son incompatibles con el pool.
Una conexion persistente esta vinculada al proceso y sobrevive entre solicitudes,
mientras que el pool crea conexiones a nivel de solicitud con gestion automatica del ciclo de vida.
Intentar habilitar ambos atributos simultaneamente resultara en un error.

## Que Sigue?

- [PDO Pool: Pool de Conexiones](/es/docs/components/pdo-pool.html) -- guia de uso
- [Corrutinas](/es/docs/components/coroutines.html) -- como funcionan las corrutinas
- [Scope](/es/docs/components/scope.html) -- gestion de grupos de corrutinas
