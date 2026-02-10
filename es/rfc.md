---
layout: page
lang: es
path_key: "/rfc.html"
nav_active: rfc
permalink: /es/rfc.html
page_title: "RFC"
description: "Propuestas oficiales para añadir capacidades asíncronas al núcleo de PHP"
---

## PHP RFC: True Async

El proyecto TrueAsync avanza a través del proceso oficial de `RFC` en wiki.php.net.
Hasta el momento se han publicado dos `RFC` que describen el modelo básico de concurrencia
y la concurrencia estructurada.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Versión: 1.7</span>
<span>Versión objetivo: PHP 8.6+</span>
<span class="rfc-badge discussion">Under Discussion</span>
</div>

El RFC principal que define el modelo de concurrencia para PHP.
Describe corrutinas, funciones `spawn()` / `await()` / `suspend()`,
el objeto `Coroutine`, las interfaces `Awaitable` y `Completable`,
el mecanismo de cancelación cooperativa, la integración con `Fiber`,
manejo de errores y graceful shutdown.

**Principios clave:**

- Cambios mínimos en el código existente para habilitar la concurrencia
- Las corrutinas mantienen la ilusión de ejecución secuencial
- Cambio automático de corrutinas en operaciones de I/O
- Cancelación cooperativa — «cancellable by design»
- API C estándar para extensiones

[Leer RFC en wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope y concurrencia estructurada

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Versión: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

Extensión del RFC base. Introduce la clase `Scope`, que vincula
el tiempo de vida de las corrutinas al ámbito léxico.
Describe la jerarquía de scopes, propagación de errores,
la política de corrutinas «zombi» y secciones críticas mediante `protect()`.

**Qué resuelve:**

- Prevención de fugas de corrutinas fuera del scope
- Limpieza automática de recursos al salir del scope
- Cancelación jerárquica: cancelar el padre → cancela todos los hijos
- Protección de secciones críticas contra la cancelación
- Detección de deadlocks y self-await

[Leer RFC en wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## Cómo se relacionan estos RFC

El primer RFC define **primitivas de bajo nivel** — corrutinas,
funciones base y API C para extensiones. El segundo RFC añade
**concurrencia estructurada** — mecanismos para gestionar grupos de corrutinas
que hacen el código concurrente seguro y predecible.

Juntos forman un modelo completo de programación asíncrona para PHP:

|              | RFC #1: True Async                | RFC #2: Scope                           |
|--------------|-----------------------------------|-----------------------------------------|
| **Nivel**    | Primitivas                        | Gestión                                 |
| **Ofrece**   | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **Analogías**| Go goroutines, Kotlin coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **Objetivo** | Ejecutar código concurrente       | Gestión segura del ciclo de vida        |

## Participa en la discusión

Los RFC se discuten en la lista de correo [internals@lists.php.net](mailto:internals@lists.php.net)
y en [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"}.

También únete a la conversación en [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}.
