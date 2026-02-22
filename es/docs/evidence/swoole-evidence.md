---
layout: docs
lang: es
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /es/docs/evidence/swoole-evidence.html
page_title: "Swoole en la práctica"
description: "Swoole en la práctica: casos de producción de Appwrite e IdleMMO, benchmarks independientes, TechEmpower, comparación con PHP-FPM."
---

# Swoole en la práctica: Mediciones del mundo real

Swoole es una extensión de PHP escrita en C que proporciona un bucle de eventos, corrutinas
y E/S asíncrona. Es la única implementación madura del modelo de corrutinas
en el ecosistema PHP con años de experiencia en producción.

A continuación se presenta una colección de mediciones reales: casos de producción, benchmarks independientes
y datos de TechEmpower.

### Dos fuentes de ganancia de rendimiento

La transición de PHP-FPM a Swoole proporciona **dos ventajas independientes**:

1. **Runtime con estado (stateful)** — la aplicación se carga una vez y permanece en memoria.
   La sobrecarga de re-inicialización (autoload, contenedor DI, configuración)
   en cada solicitud desaparece. Este efecto proporciona ganancia incluso sin E/S.

2. **Concurrencia por corrutinas** — mientras una corrutina espera la respuesta de la BD o una API externa,
   otras procesan solicitudes en el mismo núcleo. Este efecto se manifiesta
   **solo cuando hay E/S** y requiere el uso de clientes asíncronos
   (MySQL basado en corrutinas, Redis, cliente HTTP).

La mayoría de los benchmarks públicos **no separan** estos dos efectos.
Las pruebas sin BD (Hello World, JSON) miden solo el efecto stateful.
Las pruebas con BD miden la **suma de ambos**, pero no permiten aislar la contribución de las corrutinas.

Cada sección a continuación indica qué efecto predomina.

## 1. Producción: Appwrite — Migración de FPM a Swoole (+91%)

> **Qué se mide:** runtime stateful **+** concurrencia por corrutinas.
> Appwrite es un proxy de E/S con trabajo de CPU mínimo. La ganancia proviene de
> ambos factores, pero aislar la contribución de las corrutinas a partir de datos públicos no es posible.

[Appwrite](https://appwrite.io/) es un Backend-as-a-Service (BaaS) de código abierto
escrito en PHP. Appwrite proporciona una API de servidor lista para usar
para tareas comunes de aplicaciones móviles y web:
autenticación de usuarios, gestión de bases de datos,
almacenamiento de archivos, funciones en la nube, notificaciones push.

Por su naturaleza, Appwrite es un **proxy de E/S puro**:
casi cada solicitud HTTP entrante se traduce en una o más
operaciones de E/S (consulta a MariaDB, llamada a Redis,
lectura/escritura de archivos), con un cómputo de CPU propio mínimo.
Este perfil de carga de trabajo extrae el máximo beneficio
de la transición a corrutinas: mientras una corrutina espera la respuesta de la BD,
otras procesan nuevas solicitudes en el mismo núcleo.

En la versión 0.7, el equipo reemplazó Nginx + PHP-FPM por Swoole.

**Condiciones de prueba:**
500 clientes concurrentes, 5 minutos de carga (k6).
Todas las solicitudes a endpoints con autorización y control de abuso.

| Métrica                         | FPM (v0.6.2) | Swoole (v0.7) | Cambio          |
|---------------------------------|--------------|---------------|-----------------|
| Solicitudes por segundo         | 436          | 808           | **+85%**        |
| Total de solicitudes en 5 min   | 131.117      | 242.336       | **+85%**        |
| Tiempo de respuesta (normal)    | 3,77 ms      | 1,61 ms       | **−57%**        |
| Tiempo de respuesta (bajo carga)| 550 ms       | 297 ms        | **−46%**        |
| Tasa de éxito de solicitudes    | 98%          | 100%          | Sin timeouts    |

Mejora general reportada por el equipo: **~91%** en métricas combinadas.

**Fuente:** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)



## 2. Producción: IdleMMO — 35 millones de solicitudes por día en un solo servidor

> **Qué se mide:** predominantemente **runtime stateful**.
> Laravel Octane ejecuta Swoole en modo "una solicitud — un worker",
> sin multiplexación de E/S por corrutinas dentro de una solicitud.
> La ganancia de rendimiento se debe a que Laravel no se recarga en cada solicitud.

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane) es
una aplicación PHP (Laravel Octane + Swoole), un MMORPG con más de 160.000 usuarios.

| Métrica                      | Valor                             |
|------------------------------|-----------------------------------|
| Solicitudes por día          | 35.000.000 (~405 req/s promedio)  |
| Potencial (estimación del autor) | 50.000.000+ req/día           |
| Servidor                     | 1 × 32 vCPU                      |
| Workers de Swoole            | 64 (4 por núcleo)                 |
| Latencia p95 antes del ajuste | 394 ms                           |
| Latencia p95 después de Octane | **172 ms (−56%)**               |

El autor señala que para aplicaciones menos intensivas en CPU (no un MMORPG),
el mismo servidor podría manejar **significativamente más** solicitudes.

**Fuente:** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

## 3. Benchmark: PHP-FPM vs Swoole (BytePursuits)

> **Qué se mide:** solo **runtime stateful**.
> La prueba devuelve JSON sin acceder a BD ni servicios externos.
> La concurrencia por corrutinas no interviene aquí — no hay E/S que pueda
> ejecutarse en paralelo. La diferencia de 2,6–3x se debe enteramente a que
> Swoole no recrea la aplicación en cada solicitud.

Benchmark independiente sobre el microframework Mezzio (respuesta JSON, sin BD).
Intel i7-6700T (4 núcleos / 8 hilos), 32 GB RAM, wrk, 10 segundos.

| Concurrencia | PHP-FPM (req/s) | Swoole BASE (req/s) | Diferencia |
|--------------|-----------------|---------------------|------------|
| 100          | 3.472           | 9.090               | **2,6x**   |
| 500          | 3.218           | 9.159               | **2,8x**   |
| 1.000        | 3.065           | 9.205               | **3,0x**   |

Latencia promedio a 1000 concurrentes:
- FPM: **191 ms**
- Swoole: **106 ms**

**Punto crítico:** a partir de 500 conexiones concurrentes,
PHP-FPM comenzó a perder solicitudes (73.793 errores de socket a 500, 176.652 a 700).
Swoole tuvo **cero errores** en todos los niveles de concurrencia.

**Fuente:** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

## 4. Benchmark: Con base de datos (kenashkov)

> **Qué se mide:** un conjunto de pruebas con **diferentes** efectos.
> - Hello World, Autoload — puro **runtime stateful** (sin E/S).
> - Consulta SQL, escenario real — **stateful + corrutinas**.
> - Swoole usa un cliente MySQL basado en corrutinas, lo que permite atender
> - otras solicitudes mientras espera la respuesta de la BD.

Un conjunto de pruebas más realista: Swoole 4.4.10 vs Apache + mod_php.
ApacheBench, 100–1000 concurrentes, 10.000 solicitudes.

| Escenario                                | Apache (100 conc.) | Swoole (100 conc.) | Diferencia |
|------------------------------------------|--------------------|--------------------|------------|
| Hello World                              | 25.706 req/s       | 66.309 req/s       | **2,6x**   |
| Autoload 100 clases                      | 2.074 req/s        | 53.626 req/s       | **25x**    |
| Consulta SQL a BD                        | 2.327 req/s        | 4.163 req/s        | **1,8x**   |
| Escenario real (caché + archivos + BD)   | 141 req/s          | 286 req/s          | **2,0x**   |

A 1000 concurrentes:
- Apache **se cayó** (límite de conexiones, solicitudes fallidas)
- Swoole — **cero errores** en todas las pruebas

**Observación clave:** con E/S real (BD + archivos), la diferencia
baja de 25x a **1,8–2x**. Esto es esperado:
la base de datos se convierte en el cuello de botella común.
Pero la estabilidad bajo carga sigue siendo incomparable.

**Fuente:** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

## 5. Benchmark: Symfony 7 — Todos los runtimes (2024)

> **Qué se mide:** solo **runtime stateful**.
> Prueba sin BD — las corrutinas no intervienen.
> La diferencia de >10x a 1000 concurrentes se explica porque FPM crea
> un proceso por solicitud, mientras que Swoole y FrankenPHP mantienen la aplicación
> en memoria y sirven conexiones a través de un bucle de eventos.

Prueba de 9 runtimes PHP con Symfony 7 (k6, Docker, 1 CPU / 1 GB RAM, sin BD).

| Runtime                           | vs Nginx + PHP-FPM (a 1000 conc.) |
|-----------------------------------|-------------------------------------|
| Apache + mod_php                  | ~0,5x (más lento)                  |
| Nginx + PHP-FPM                   | 1x (línea base)                    |
| Nginx Unit                        | ~3x                                |
| RoadRunner                        | >2x                                |
| **Swoole / FrankenPHP (worker)**  | **>10x**                           |

A 1000 conexiones concurrentes, Swoole y FrankenPHP en modo worker
mostraron **un orden de magnitud mayor de rendimiento**
que el clásico Nginx + PHP-FPM.

**Fuente:** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

## 6. TechEmpower: Swoole — Primer lugar entre PHP

> **Qué se mide:** **stateful + corrutinas** (en pruebas con BD).
> TechEmpower incluye tanto una prueba JSON (stateful) como pruebas con múltiples
> consultas SQL (multiple queries, Fortunes), donde el acceso a BD basado en corrutinas
> proporciona una ventaja real. Este es uno de los pocos benchmarks
> donde el efecto de las corrutinas es más claramente visible.

En [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
(Round 22, 2023), Swoole obtuvo el **primer lugar** entre todos los frameworks PHP
en la prueba de MySQL.

TechEmpower prueba escenarios reales: serialización JSON,
consultas simples a BD, consultas múltiples, ORM, Fortunes
(plantillas + BD + ordenamiento + escape).

**Fuente:** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

## 7. Hyperf: 96.000 req/s en un framework Swoole

> **Qué se mide:** **runtime stateful** (el benchmark es Hello World).
> Hyperf está completamente construido sobre corrutinas de Swoole, y en producción,
> la concurrencia por corrutinas se utiliza para llamadas a BD, Redis y gRPC.
> Sin embargo, la cifra de 96K req/s se obtuvo con Hello World sin E/S,
> lo que significa que refleja el efecto del runtime stateful.

[Hyperf](https://hyperf.dev/) es un framework PHP basado en corrutinas construido sobre Swoole.
En el benchmark (4 hilos, 100 conexiones):

- **96.563 req/s**
- Latencia: 7,66 ms

Hyperf se posiciona para microservicios y afirma una
ventaja de **5–10x** sobre los frameworks PHP tradicionales.

**Fuente:** [Hyperf GitHub](https://github.com/hyperf/hyperf)

## Resumen: Lo que muestran los datos reales

| Tipo de prueba                    | FPM → Swoole                    | Efecto principal     | Nota                                          |
|-----------------------------------|---------------------------------|----------------------|-----------------------------------------------|
| Hello World / JSON                | **2,6–3x**                      | Stateful             | BytePursuits, kenashkov                       |
| Autoload (stateful vs stateless)  | **25x**                         | Stateful             | Sin E/S — efecto puro de preservación de estado |
| Con base de datos                 | **1,8–2x**                      | Stateful + corrutinas | kenashkov (MySQL con corrutinas)             |
| API en producción (Appwrite)      | **+91%** (1,85x)                | Stateful + corrutinas | Proxy de E/S, ambos factores                 |
| Producción (IdleMMO)              | p95: **−56%**                   | Stateful             | Workers de Octane, no corrutinas              |
| Alta concurrencia (1000+)         | **Swoole estable, FPM se cae**  | Bucle de eventos     | Todos los benchmarks                          |
| Runtimes Symfony (1000 conc.)     | **>10x**                        | Stateful             | Sin BD en la prueba                           |
| TechEmpower (pruebas con BD)      | **#1 entre PHP**                | Stateful + corrutinas | Múltiples consultas SQL                      |

## Conexión con la teoría

Los resultados se alinean bien con los cálculos de [Eficiencia de tareas limitadas por E/S](/es/docs/evidence/concurrency-efficiency.html):

**1. Con base de datos, la diferencia es más modesta (1,8–2x) que sin ella (3–10x).**
Esto confirma: con E/S real, el cuello de botella pasa a ser la propia BD,
no el modelo de concurrencia. El coeficiente de bloqueo en las pruebas con BD es menor
porque el trabajo de CPU del framework es comparable al tiempo de E/S.

**2. Con alta concurrencia (500–1000+), FPM se degrada mientras Swoole no.**
PHP-FPM está limitado por el número de workers. Cada worker es un proceso del SO (~40 MB).
Con 500+ conexiones concurrentes, FPM alcanza su límite
y comienza a perder solicitudes. Swoole sirve miles de conexiones
en docenas de corrutinas sin aumentar el consumo de memoria.

**3. El runtime stateful elimina la sobrecarga de re-inicialización.**
La diferencia de 25x en la prueba de autoload demuestra el costo
de recrear el estado de la aplicación en cada solicitud en FPM.
En producción, esto se manifiesta como la diferencia entre T_cpu = 34 ms (FPM)
y T_cpu = 5–10 ms (stateful), lo que cambia dramáticamente el coeficiente de bloqueo
y consecuentemente la ganancia por corrutinas
(ver [tabla en Eficiencia de tareas limitadas por E/S](/es/docs/evidence/concurrency-efficiency.html)).

**4. La fórmula se confirma.**
Appwrite: FPM 436 req/s → Swoole 808 req/s (1,85x).
Si T_cpu bajó de ~30 ms a ~15 ms (stateful)
y T_io permaneció en ~30 ms, entonces el coeficiente de bloqueo aumentó de 1,0 a 2,0,
lo que predice un aumento de rendimiento de aproximadamente 1,5–2x. Esto coincide.

## Referencias

### Casos de producción
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### Benchmarks independientes
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark — Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### Frameworks y runtimes
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf — framework PHP basado en corrutinas](https://github.com/hyperf/hyperf)
- [OpenSwoole benchmark](https://openswoole.com/benchmark)
- [Swoole source (GitHub)](https://github.com/swoole/swoole-src)
