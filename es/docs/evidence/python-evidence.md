---
layout: docs
lang: es
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /es/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio en la práctica: Duolingo, Super.com, Instagram, benchmarks de uvloop, contraargumentos."
---

# Python asyncio en la práctica: Mediciones del mundo real

Python es el lenguaje más similar a PHP en cuanto al modelo de ejecución:
interpretado, monohilo (GIL), con predominio de frameworks síncronos.
La transición de Python síncrono (Flask, Django + Gunicorn) a asíncrono
(FastAPI, aiohttp, Starlette + Uvicorn) es una analogía precisa de la transición
de PHP-FPM a un runtime basado en corrutinas.

A continuación se presenta una colección de casos de producción, benchmarks independientes y mediciones.

---

## 1. Producción: Duolingo — Migración a async Python (+40% de rendimiento)

[Duolingo](https://blog.duolingo.com/async-python-migration/) es la mayor
plataforma de aprendizaje de idiomas (más de 500M de usuarios).
El backend está escrito en Python.

En 2025, el equipo comenzó una migración sistemática de servicios de Python
síncrono a asíncrono.

| Métrica                  | Resultado                               |
|--------------------------|-----------------------------------------|
| Rendimiento por instancia | **+40%**                              |
| Ahorro de costos AWS EC2 | **~30%** por servicio migrado           |

Los autores señalan que después de construir la infraestructura asíncrona, migrar
servicios individuales resultó ser "bastante sencillo."

**Fuente:** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. Producción: Super.com — Reducción del 90% en costos

[Super.com](https://www.super.com/) (anteriormente Snaptravel) es un servicio
de búsqueda de hoteles y descuentos. Su motor de búsqueda maneja más de 1.000 req/s,
ingesta más de 1 TB de datos por día y procesa más de $1M en ventas diarias.

**Característica clave de la carga de trabajo:** cada solicitud realiza **más de 40 llamadas de red**
a APIs de terceros. Este es un perfil puramente limitado por E/S — un candidato ideal para corrutinas.

El equipo migró de Flask (síncrono, AWS Lambda) a Quart (ASGI, EC2).

| Métrica                    | Flask (Lambda) | Quart (ASGI)  | Cambio         |
|----------------------------|----------------|---------------|----------------|
| Costos de infraestructura  | ~$1.000/día    | ~$50/día      | **−90%**       |
| Rendimiento                | ~150 req/s     | 300+ req/s    | **2x**         |
| Errores en horas pico      | Línea base     | −95%          | **−95%**       |
| Latencia                   | Línea base     | −50%          | **2x más rápido** |

Ahorro de $950/día × 365 = **~$350.000/año** en un solo servicio.

**Fuente:** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. Producción: Instagram — asyncio a escala de 500M DAU

Instagram atiende a más de 500 millones de usuarios activos diarios
con un backend en Django.

Jimmy Lai (ingeniero de Instagram) describió la migración a asyncio en una charla
en PyCon Taiwan 2018:

- Reemplazaron `requests` por `aiohttp` para llamadas HTTP
- Migraron el RPC interno a `asyncio`
- Lograron una mejora en el rendimiento de la API y una reducción del tiempo de CPU inactivo

**Desafíos:** Alta sobrecarga de CPU de asyncio a la escala de Instagram,
la necesidad de detección automatizada de llamadas bloqueantes mediante
análisis estático de código.

**Fuente:** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. Producción: Feature Store — De hilos a asyncio (−40% de latencia)

El servicio Feature Store migró de multithreading en Python a asyncio.

| Métrica          | Hilos                    | Asyncio              | Cambio                    |
|------------------|--------------------------|----------------------|---------------------------|
| Latencia         | Línea base               | −40%                 | **−40%**                  |
| Consumo de RAM   | 18 GB (cientos de hilos) | Significativamente menos | Reducción sustancial   |

La migración se realizó en tres fases con división del tráfico de producción
50/50 para validación.

**Fuente:** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. Producción: Talk Python — Flask a Quart (−81% de latencia)

[Talk Python](https://talkpython.fm/) es uno de los podcasts y plataformas
de aprendizaje de Python más grandes. El autor (Michael Kennedy) reescribió el sitio
de Flask (síncrono) a Quart (Flask asíncrono).

| Métrica                 | Flask | Quart | Cambio      |
|-------------------------|-------|-------|-------------|
| Tiempo de respuesta (ejemplo) | 42 ms | 8 ms | **−81%** |
| Errores tras la migración | —   | 2     | Mínimos     |

El autor señala: durante las pruebas de carga, el máximo de req/s
difirió de forma insignificante porque las consultas a MongoDB tomaban <1 ms.
La ganancia aparece durante el procesamiento **concurrente** de solicitudes —
cuando múltiples clientes acceden al servidor simultáneamente.

**Fuente:** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — uvloop como estándar

Microsoft incluyó [uvloop](https://github.com/MagicStack/uvloop) —
un bucle de eventos rápido basado en libuv — como predeterminado para Azure Functions
en Python 3.13+.

| Prueba                          | asyncio estándar | uvloop      | Mejora      |
|---------------------------------|------------------|-------------|-------------|
| 10K solicitudes, 50 VU (local)  | 515 req/s        | 565 req/s   | **+10%**    |
| 5 min, 100 VU (Azure)           | 1.898 req/s      | 1.961 req/s | **+3%**     |
| 500 VU (local)                   | 720 req/s        | 772 req/s   | **+7%**     |

El bucle de eventos estándar a 500 VU mostró **~2% de pérdida de solicitudes**.
uvloop — cero errores.

**Fuente:** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. Benchmark: Tareas limitadas por E/S — asyncio 130x más rápido

Comparación directa de modelos de concurrencia en una tarea de descarga de 10.000 URLs:

| Modelo        | Tiempo   | Rendimiento    | Errores   |
|---------------|----------|----------------|-----------|
| Síncrono      | ~1.800 s | ~11 KB/s       | —         |
| Hilos (100)   | ~85 s    | ~238 KB/s      | Bajo      |
| **Asyncio**   | **14 s** | **1.435 KB/s** | **0,06%** |

Asyncio: **130x más rápido** que el código síncrono, **6x más rápido** que los hilos.

Para tareas limitadas por CPU, asyncio no ofrece ninguna ventaja
(tiempo idéntico, +44% de consumo de memoria).

**Fuente:** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. Benchmark: uvloop — Más rápido que Go y Node.js

[uvloop](https://github.com/MagicStack/uvloop) es un reemplazo directo del bucle
de eventos estándar de asyncio, escrito en Cython sobre libuv (la misma biblioteca
que sustenta Node.js).

Servidor TCP echo:

| Implementación      | 1 KiB (req/s) | 100 KiB rendimiento |
|---------------------|---------------|----------------------|
| **uvloop**          | **105.459**   | **2,3 GiB/s**       |
| Go                  | 103.264       | —                    |
| asyncio estándar    | 41.420        | —                    |
| Node.js             | 44.055        | —                    |

Servidor HTTP (300 concurrentes):

| Implementación         | 1 KiB (req/s) |
|------------------------|---------------|
| **uvloop + httptools** | **37.866**    |
| Node.js                | Inferior      |

uvloop: **2,5x más rápido** que asyncio estándar, **2x más rápido** que Node.js,
**a la par con Go**.

**Fuente:** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. Benchmark: aiohttp vs requests — 10x en solicitudes concurrentes

| Biblioteca    | req/s (concurrente) | Tipo  |
|---------------|---------------------|-------|
| **aiohttp**   | **241+**            | Async |
| HTTPX (async) | ~160                | Async |
| Requests      | ~24                 | Sync  |

aiohttp: **10x más rápido** que Requests para solicitudes HTTP concurrentes.

**Fuente:** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. Contraargumento: Cal Paterson — "Async Python no es más rápido"

Es importante presentar también los contraargumentos. Cal Paterson realizó un benchmark exhaustivo
con una **base de datos real** (PostgreSQL, selección aleatoria de filas + JSON):

| Framework                    | Tipo  | req/s     | Latencia P99 |
|------------------------------|-------|-----------|--------------|
| Gunicorn + Meinheld/Bottle   | Sync  | **5.780** | **32 ms**    |
| Gunicorn + Meinheld/Falcon   | Sync  | **5.589** | **31 ms**    |
| Uvicorn + Starlette          | Async | 4.952     | 75 ms        |
| Sanic                        | Async | 4.687     | 85 ms        |
| AIOHTTP                      | Async | 4.501     | 76 ms        |

**Resultado:** los frameworks síncronos con servidores en C mostraron **mayor rendimiento**
y **2–3x mejor latencia de cola** (P99).

### ¿Por qué perdió async?

Razones:

1. **Una sola consulta SQL** por solicitud HTTP — demasiado poca E/S
   para que la concurrencia de corrutinas tenga efecto.
2. **Multitarea cooperativa** con trabajo de CPU entre solicitudes
   crea una distribución "injusta" del tiempo de CPU —
   los cálculos largos bloquean el bucle de eventos para todos.
3. **La sobrecarga de asyncio** (bucle de eventos estándar en Python)
   es comparable a la ganancia de la E/S no bloqueante cuando la E/S es mínima.

### Cuándo async realmente ayuda

El benchmark de Paterson prueba el **escenario más simple** (1 consulta SQL).
Como demuestran los casos de producción anteriores, async proporciona una ganancia dramática cuando:

- Hay **muchas** consultas a BD / APIs externas (Super.com: 40+ llamadas por solicitud)
- La concurrencia es **alta** (miles de conexiones simultáneas)
- La E/S **domina** sobre la CPU (Duolingo, Appwrite)

Esto se alinea con la teoría:
cuanto mayor es el coeficiente de bloqueo (T_io/T_cpu), mayor es el beneficio de las corrutinas.
Con 1 consulta SQL × 2 ms, el coeficiente es demasiado bajo.

**Fuente:** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower: Frameworks de Python

Resultados aproximados de [TechEmpower Round 22](https://www.techempower.com/benchmarks/):

| Framework         | Tipo       | req/s (JSON)            |
|-------------------|------------|-------------------------|
| Uvicorn (raw)     | Async ASGI | El más alto entre Python |
| Starlette         | Async ASGI | ~20.000–25.000          |
| FastAPI           | Async ASGI | ~15.000–22.000          |
| Flask (Gunicorn)  | Sync WSGI  | ~4.000–6.000            |
| Django (Gunicorn) | Sync WSGI  | ~2.000–4.000            |

Frameworks asíncronos: **3–5x** más rápidos que los síncronos en la prueba JSON.

**Fuente:** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## Resumen: Lo que muestran los datos de Python

| Caso                        | Sync → Async                           | Condición                              |
|-----------------------------|----------------------------------------|----------------------------------------|
| Duolingo (producción)       | **+40%** rendimiento, **−30%** costo   | Microservicios, E/S                    |
| Super.com (producción)      | **2x** rendimiento, **−90%** costo     | 40+ llamadas API por solicitud         |
| Feature Store (producción)  | **−40%** latencia                       | Migración de hilos a asyncio           |
| Talk Python (producción)    | **−81%** latencia                       | Flask → Quart                          |
| Limitado por E/S (10K URLs) | **130x** más rápido                    | E/S pura, concurrencia masiva          |
| aiohttp vs requests         | **10x** más rápido                     | Solicitudes HTTP concurrentes          |
| uvloop vs estándar          | **2,5x** más rápido                    | TCP echo, HTTP                         |
| TechEmpower JSON            | **3–5x**                               | FastAPI/Starlette vs Flask/Django      |
| **CRUD simple (1 SQL)**     | **Sync es más rápido**                 | Cal Paterson: P99 2–3x peor para async |
| **Limitado por CPU**        | **Sin diferencia**                     | +44% memoria, 0% ganancia             |

### Conclusión clave

Async Python proporciona el máximo beneficio con un **alto coeficiente de bloqueo**:
cuando el tiempo de E/S supera significativamente el tiempo de CPU.
Con 40+ llamadas de red (Super.com) — 90% de ahorro en costos.
Con 1 consulta SQL (Cal Paterson) — async es más lento.

Esto **confirma la fórmula** de [Eficiencia de tareas limitadas por E/S](/es/docs/evidence/concurrency-efficiency.html):
ganancia ≈ 1 + T_io/T_cpu. Cuando T_io >> T_cpu — de decenas a cientos de veces.
Cuando T_io ≈ T_cpu — mínima o nula.

---

## Conexión con PHP y True Async

Python y PHP se encuentran en una situación similar:

| Característica           | Python               | PHP                 |
|--------------------------|----------------------|---------------------|
| Interpretado             | Sí                   | Sí                  |
| GIL / monohilo           | GIL                  | Monohilo            |
| Modelo dominante         | Sync (Django, Flask) | Sync (FPM)          |
| Runtime asíncrono        | asyncio + uvloop     | Swoole / True Async |
| Framework asíncrono      | FastAPI, Starlette   | Hyperf              |

Los datos de Python muestran que la transición a corrutinas en un lenguaje
interpretado monohilo **funciona**. La escala de la ganancia
está determinada por el perfil de la carga de trabajo, no por el lenguaje.

---

## Referencias

### Casos de producción
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% cost reduction](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop as default (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### Benchmarks
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### Corrutinas vs Hilos
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
