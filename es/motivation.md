---
layout: page
lang: es
path_key: "/motivation.html"
nav_active: motivation
permalink: /es/motivation.html
page_title: "Motivación"
description: "Por qué PHP necesita capacidades asíncronas integradas"
---

## ¿Por qué PHP necesita asincronía?

`PHP` es uno de los últimos grandes lenguajes que aún carece de soporte integrado
para la ejecución concurrente **a nivel de lenguaje**. Python tiene `asyncio`, `JavaScript` está nativamente
construido sobre un event loop, `Go` tiene goroutines, `Kotlin` tiene coroutines. `PHP` permanece
en el paradigma «una petición — un proceso», a pesar de que la mayoría de
las aplicaciones reales pasan la mayor parte del tiempo esperando `I/O` (`IO Bound`).

## El problema de la fragmentación

Hoy en día, la asincronía en `PHP` se implementa mediante extensiones: `Swoole`, `AMPHP`, `ReactPHP`.
Cada una crea **su propio ecosistema** con `APIs` incompatibles,
sus propios controladores de bases de datos, clientes `HTTP` y servidores.

Esto genera problemas críticos:

- **Duplicación de código** — cada extensión se ve obligada a reescribir controladores
  para `MySQL`, `PostgreSQL`, `Redis` y otros sistemas
- **Incompatibilidad** — una biblioteca escrita para `Swoole` no funciona con `AMPHP`,
  y viceversa
- **Limitaciones** — las extensiones no pueden hacer que las funciones estándar de `PHP`
  (`file_get_contents`, `fread`, `curl_exec`) sean no bloqueantes,
  porque no tienen acceso al núcleo
- **Barrera de entrada** — los desarrolladores necesitan aprender un ecosistema separado
  en lugar de usar herramientas familiares

## La solución: integración en el núcleo

`TrueAsync` propone un enfoque diferente — **asincronía a nivel del núcleo de PHP**.
Esto significa:

### Transparencia

El código síncrono existente funciona en corrutinas sin cambios.
`file_get_contents()`, `PDO::query()`, `curl_exec()` — todas estas funciones
se vuelven automáticamente no bloqueantes cuando se ejecutan dentro de una corrutina.

```php
// ¡Este código ya se ejecuta de forma concurrente!
spawn(function() {
    $data = file_get_contents('https://api.example.com/users');
    // la corrutina se suspende durante la petición HTTP,
    // otras corrutinas continúan ejecutándose
});
```

### Sin funciones coloreadas

A diferencia de Python (`async def` / `await`) y JavaScript (`async` / `await`),
`TrueAsync` no requiere marcar las funciones como asíncronas.
Cualquier función puede ejecutarse en una corrutina — no hay separación
entre un mundo «síncrono» y «asíncrono».

### Un estándar unificado

El `True Async ABI` estándar como parte de `Zend` permite a **cualquier** extensión soportar `I/O` no bloqueante:
`MySQL`, `PostgreSQL`, `Redis`, operaciones de archivos, sockets — todo a través de una única interfaz.
Ya no es necesario duplicar controladores para cada framework asíncrono.

### Compatibilidad con versiones anteriores

El código existente sigue funcionando, pero ahora todo el código PHP
es asíncrono por defecto. En todas partes.

## PHP workload: por qué esto es importante ahora

Una aplicación PHP típica (Laravel, Symfony, WordPress) pasa
**70–90% del tiempo esperando I/O**: consultas a la BD, llamadas HTTP a APIs externas,
lectura de archivos. Todo ese tiempo, la CPU permanece inactiva.

Con corrutinas, este tiempo se utiliza eficientemente:

| Escenario                         | Sin corrutinas  | Con corrutinas   |
|-----------------------------------|-----------------|------------------|
| 3 consultas BD de 20ms cada una   | 60ms            | ~22ms            |
| HTTP + BD + archivo               | secuencial      | paralelo         |
| 10 llamadas a API                 | 10 × latencia   | ~1 × latencia    |

Más información:
[IO-Bound vs CPU-Bound](/es/docs/evidence/concurrency-efficiency.html),
[Estadísticas de concurrencia](/es/docs/evidence/real-world-statistics.html).

## Escenarios prácticos

- **Servidores web** — procesamiento de múltiples peticiones en un solo proceso
  (`FrankenPHP`, `RoadRunner`)
- **API Gateway** — agregación paralela de datos desde múltiples microservicios
- **Tareas en segundo plano** — procesamiento concurrente de colas
- **Tiempo real** — servidores WebSocket, chatbots, streaming

## Ver también:

- [PHP RFC: True Async &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}
- [RFC: Scope y concurrencia estructurada](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}
- [Documentación de TrueAsync](/es/docs.html)
- [Demo interactiva de corrutinas](/es/interactive/coroutine-demo.html)
