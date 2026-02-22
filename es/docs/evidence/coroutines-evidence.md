---
layout: docs
lang: es
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /es/docs/evidence/coroutines-evidence.html
page_title: "Por qué funcionan las corrutinas"
description: "Evidencia empírica: mediciones del costo de cambio de contexto, comparación de memoria, el problema C10K, investigación académica."
---

# Evidencia empírica: Por qué las corrutinas de un solo hilo funcionan

La afirmación de que la concurrencia cooperativa de un solo hilo es efectiva
para cargas de trabajo con predominio de E/S está respaldada por mediciones, investigación académica
y experiencia operativa con sistemas a gran escala.

---

## 1. Costo de conmutación: Corrutina vs Hilo del SO

La principal ventaja de las corrutinas es que la conmutación cooperativa ocurre
en espacio de usuario, sin invocar el kernel del sistema operativo.

### Mediciones en Linux

| Métrica                | Hilo del SO (Linux NPTL)                 | Corrutina / tarea asíncrona              |
|------------------------|------------------------------------------|------------------------------------------|
| Cambio de contexto     | 1,2–1,5 µs (fijado), ~2,2 µs (no fijado)| ~170 ns (Go), ~200 ns (Rust async)       |
| Creación de tarea      | ~17 µs                                   | ~0,3 µs                                 |
| Memoria por tarea      | ~9,5 KiB (mín), 8 MiB (pila por defecto)| ~0,4 KiB (Rust), 2–4 KiB (Go)           |
| Escalabilidad          | ~80.000 hilos (prueba)                   | 250.000+ tareas async (prueba)           |

**Fuentes:**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  mediciones directas del costo de conmutación de hilos en Linux y comparación con goroutines
- [Jim Blandy, context-switch (benchmark en Rust)](https://github.com/jimblandy/context-switch) —
  conmutación de tareas async en ~0,2 µs vs ~1,7 µs para un hilo (**8,5x** más rápido),
  creación en 0,3 µs vs 17 µs (**56x** más rápido), consume 0,4 KiB vs 9,5 KiB (**24x** menos)

### Qué significa esto en la práctica

Conmutar una corrutina cuesta **~200 nanosegundos** — un orden de magnitud más barato
que conmutar un hilo del SO (~1,5 µs).
Pero, lo que es aún más importante, la conmutación de corrutinas **no incurre en costos indirectos**:
vaciado de caché TLB, invalidación del predictor de ramas, migración entre núcleos —
todo esto es característico de los hilos, pero no de las corrutinas dentro de un solo hilo.

Para un bucle de eventos que maneja 80 corrutinas por núcleo,
la sobrecarga total de conmutación es:

```
80 × 200 ns = 16 µs para un ciclo completo a través de todas las corrutinas
```

Esto es insignificante comparado con 80 ms de tiempo de espera de E/S.

---

## 2. Memoria: Escala de diferencias

Los hilos del SO asignan una pila de tamaño fijo (8 MiB por defecto en Linux).
Las corrutinas almacenan solo su estado — variables locales y el punto de reanudación.

| Implementación                | Memoria por unidad de concurrencia                        |
|-------------------------------|-----------------------------------------------------------|
| Hilo de Linux (pila por defecto) | 8 MiB virtual, ~10 KiB RSS mínimo                    |
| Goroutine de Go               | 2–4 KiB (pila dinámica, crece según sea necesario)       |
| Corrutina de Kotlin            | decenas de bytes en el heap; ratio hilo:corrutina ≈ 6:1  |
| Tarea async de Rust            | ~0,4 KiB                                                 |
| Marco de corrutina C++ (Pigweed) | 88–408 bytes                                           |
| Corrutina asyncio de Python    | ~2 KiB (vs ~5 KiB + 32 KiB de pila para un hilo)        |

**Fuentes:**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — ratio de memoria 6:1
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — comparación en Python
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — pila dinámica de goroutines

### Implicaciones para servidores web

Para 640 tareas concurrentes (8 núcleos × 80 corrutinas):

- **Hilos del SO**: 640 × 8 MiB = 5 GiB de memoria virtual
  (en realidad menos debido a la asignación diferida, pero la presión sobre el planificador del SO es significativa)
- **Corrutinas**: 640 × 4 KiB = 2,5 MiB
  (una diferencia de **tres órdenes de magnitud**)

---

## 3. El problema C10K y los servidores reales

### El problema

En 1999, Dan Kegel formuló el
[problema C10K](https://www.kegel.com/c10k.html):
los servidores que utilizaban el modelo "un hilo por conexión" no podían atender
10.000 conexiones simultáneas.
La causa no eran las limitaciones del hardware, sino la sobrecarga de los hilos del SO.

### La solución

El problema se resolvió mediante la transición a una arquitectura dirigida por eventos:
en lugar de crear un hilo por cada conexión,
un único bucle de eventos atiende miles de conexiones en un solo hilo.

Este es exactamente el enfoque implementado por **nginx**, **Node.js**, **libuv** y — en el contexto de PHP — **True Async**.

### Benchmarks: nginx (dirigido por eventos) vs Apache (hilo por solicitud)

| Métrica (1000 conexiones concurrentes) | nginx        | Apache                            |
|----------------------------------------|--------------|-----------------------------------|
| Solicitudes por segundo (estático)     | 2.500–3.000  | 800–1.200                         |
| Rendimiento HTTP/2                     | >6.000 req/s | ~826 req/s                        |
| Estabilidad bajo carga                 | Estable      | Degradación a >150 conexiones     |

nginx sirve **2–4x** más solicitudes que Apache,
consumiendo significativamente menos memoria.
Apache con arquitectura de hilo por solicitud no acepta más de 150 conexiones simultáneas
(por defecto), después de lo cual los nuevos clientes esperan en cola.

**Fuentes:**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — planteamiento del problema
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — benchmarks
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — experiencia de la industria

---

## 4. Investigación académica

### SEDA: Arquitectura dirigida por eventos por etapas (Welsh et al., 2001)

Matt Welsh, David Culler y Eric Brewer de UC Berkeley propusieron
SEDA — una arquitectura de servidor basada en eventos y colas entre etapas de procesamiento.

**Resultado clave**: El servidor SEDA en Java superó
a Apache (C, hilo por conexión) en rendimiento con 10.000+ conexiones simultáneas.
Apache no podía aceptar más de 150 conexiones simultáneas.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Comparación de arquitecturas de servidores web (Pariag et al., 2007)

La comparación más exhaustiva de arquitecturas fue realizada por Pariag et al.
de la Universidad de Waterloo. Compararon tres servidores sobre la misma base de código:

- **µserver** — dirigido por eventos (SYMPED, proceso único)
- **Knot** — hilo por conexión (biblioteca Capriccio)
- **WatPipe** — híbrido (pipeline, similar a SEDA)

**Resultado clave**: El µserver dirigido por eventos y WatPipe basado en pipeline
entregaron **~18% más rendimiento** que Knot basado en hilos.
WatPipe necesitó 25 hilos de escritura para alcanzar el mismo rendimiento
que µserver con 10 procesos.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream: Procesamiento acelerado de eventos con corrutinas (2022)

Un estudio publicado en arXiv realizó una comparación directa
de corrutinas e hilos para el procesamiento de flujos de datos (procesamiento basado en eventos).

**Resultado clave**: Las corrutinas entregaron **al menos 2x de rendimiento**
en comparación con los hilos convencionales para el procesamiento de flujos de eventos.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. Escalabilidad: 100.000 tareas

### Kotlin: 100.000 corrutinas en 100 ms

En el benchmark de [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/),
crear y lanzar 100.000 corrutinas tomó ~100 ms de sobrecarga.
Un número equivalente de hilos requeriría ~1,7 segundos solo para la creación
(100.000 × 17 µs) y ~950 MiB de memoria para las pilas.

### Rust: 250.000 tareas async

En el [benchmark context-switch](https://github.com/jimblandy/context-switch),
se lanzaron 250.000 tareas async en un solo proceso,
mientras que los hilos del SO alcanzaron su límite en ~80.000.

### Go: Millones de goroutines

Go ejecuta rutinariamente cientos de miles y millones de goroutines en sistemas de producción.
Esto es lo que permite que servidores como Caddy, Traefik y CockroachDB
manejen decenas de miles de conexiones simultáneas.

---

## 6. Resumen de la evidencia

| Afirmación                                         | Confirmación                                              |
|----------------------------------------------------|-----------------------------------------------------------|
| La conmutación de corrutinas es más barata que la de hilos | ~200 ns vs ~1500 ns — **7–8x** (Bendersky 2018, Blandy) |
| Las corrutinas consumen menos memoria               | 0,4–4 KiB vs 9,5 KiB–8 MiB — **24x+** (Blandy, Go FAQ) |
| El servidor dirigido por eventos escala mejor       | nginx 2–4x de rendimiento vs Apache (benchmarks)         |
| Dirigido por eventos > hilo por conexión (académicamente) | +18% rendimiento (Pariag 2007), C10K resuelto (Kegel 1999) |
| Corrutinas > hilos para procesamiento de eventos    | 2x rendimiento (AEStream 2022)                           |
| Cientos de miles de corrutinas en un solo proceso   | 250K tareas async (Rust), 100K corrutinas en 100ms (Kotlin)|
| La fórmula N ≈ 1 + T_io/T_cpu es correcta          | Goetz 2006, Zalando, Ley de Little                       |

---

## Referencias

### Mediciones y benchmarks
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### Artículos académicos
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### Experiencia de la industria
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### Ver también
- [Python asyncio en la práctica](/es/docs/evidence/python-evidence.html) — casos de producción (Duolingo, Super.com, Instagram), benchmarks de uvloop, contraargumentos de Cal Paterson
- [Swoole en la práctica](/es/docs/evidence/swoole-evidence.html) — casos de producción y benchmarks para corrutinas PHP
