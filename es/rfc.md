---
layout: page
lang: es
path_key: "/rfc.html"
nav_active: rfc
permalink: /es/rfc.html
page_title: "RFC"
description: "Propuestas oficiales para agregar asincronía al núcleo de PHP"
---

## PHP RFC: True Async

El proyecto TrueAsync se ha promovido durante aproximadamente un año a través del proceso oficial de `RFC` en wiki.php.net.
Se han publicado dos `RFC` que describen el modelo básico de concurrencia
y la concurrencia estructurada.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Versión: 1.7</span>
<span>Versión objetivo: PHP 8.6+</span>
<span class="rfc-badge discussion">Draft</span>
</div>

El `RFC` principal que define el modelo de concurrencia para PHP.
Describe corutinas, funciones `spawn()` / `await()` / `suspend()`,
el objeto `Coroutine`, interfaces `Awaitable` y `Completable`,
mecanismo de cancelación cooperativa, integración con `Fiber`,
manejo de errores y apagado elegante.

**Principios clave:**

- Cambios mínimos en el código existente para habilitar la concurrencia
- Las corutinas mantienen la ilusión de ejecución secuencial
- Cambio automático de corutinas en operaciones de I/O
- Cancelación cooperativa — "cancellable by design"
- API C estándar para extensiones

[Leer RFC en wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope y concurrencia estructurada

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Versión: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

Una extensión del RFC base. Introduce la clase `Scope`, vinculando
el tiempo de vida de las corutinas al ámbito léxico.
Describe la jerarquía de scopes, propagación de errores,
política de corutinas "zombi" y secciones críticas mediante `protect()`.

**Qué resuelve:**

- Prevención de fugas de corutinas fuera del scope
- Limpieza automática de recursos al salir del scope
- Cancelación jerárquica: cancelar el padre → cancela todos los hijos
- Protección de secciones críticas contra la cancelación
- Detección de deadlocks y self-await

[Leer RFC en wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## Cómo se relacionan estos RFC

El primer `RFC` define **primitivas de bajo nivel** — corutinas,
funciones base y API C para extensiones. El segundo RFC agrega
**concurrencia estructurada** — mecanismos para gestionar grupos de corutinas
que hacen que el código concurrente sea seguro y predecible.

Juntos forman un modelo completo de programación asíncrona para PHP:

|              | RFC #1: True Async                | RFC #2: Scope                           |
|--------------|-----------------------------------|-----------------------------------------|
| **Nivel**    | Primitivas                        | Gestión                                 |
| **Provee**   | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **Analogías**| Go goroutines, Kotlin coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **Objetivo** | Ejecutar código concurrente       | Gestión segura del ciclo de vida        |

## Estado actual del RFC

Actualmente el proyecto `TrueAsync` se ha enfrentado a incertidumbre en el proceso de `RFC`.
Durante los últimos meses, la discusión se ha detenido prácticamente, y no hay claridad sobre su futuro.
Es bastante obvio que el `RFC` no podrá pasar la votación, y no hay forma de cambiar esto.

Por estas razones, el proceso de `RFC` se considera actualmente congelado,
y el proyecto continuará desarrollándose dentro de la comunidad abierta, sin estatus "oficial".

## Participar en la discusión

Los RFC se discuten en la lista de correo [internals@lists.php.net](mailto:internals@lists.php.net)
y en [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"}.

También únase a la conversación en [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}.
