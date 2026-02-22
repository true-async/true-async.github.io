---
layout: docs
lang: es
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /es/docs/evidence/real-world-statistics.html
page_title: "Estadísticas de concurrencia"
description: "Datos estadísticos reales para el cálculo de concurrencia: consultas SQL, latencias de BD, rendimiento de frameworks PHP."
---

# Datos estadísticos para el cálculo de concurrencia

Las fórmulas de la sección [Eficiencia de tareas limitadas por E/S](/es/docs/evidence/concurrency-efficiency.html) operan con
varias magnitudes clave. A continuación se presenta una colección de mediciones reales
que permiten insertar números concretos en las fórmulas.

---

## Elementos de las fórmulas

Ley de Little:

$$
L = \lambda \cdot W
$$

- `L` — el nivel de concurrencia requerido (cuántas tareas simultáneamente)
- `λ` — rendimiento (solicitudes por segundo)
- `W` — tiempo promedio de procesamiento de una solicitud

Fórmula de Goetz:

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — tiempo de espera de E/S por solicitud
- `T_cpu` — tiempo de cómputo de CPU por solicitud

Para el cálculo práctico, necesitas conocer:

1. **Cuántas consultas SQL se ejecutan por solicitud HTTP**
2. **Cuánto tarda una consulta SQL (E/S)**
3. **Cuánto tarda el procesamiento de CPU**
4. **Cuál es el rendimiento del servidor**
5. **Cuál es el tiempo total de respuesta**

---

## 1. Consultas SQL por solicitud HTTP

El número de llamadas a la base de datos depende del framework, el ORM y la complejidad de la página.

| Aplicación / Framework            | Consultas por página   | Fuente                                                                                                           |
|-------------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (sin plugins)             | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, página promedio) | <30 (umbral del profiler) | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                       |
| Laravel (CRUD simple)              | 5–15                   | Valores típicos de Laravel Debugbar                                                                              |
| Laravel (con problema N+1)         | 20–50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (sin caché)                 | 80–100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (catálogo)                 | 50–200+                | Típico para e-commerce complejo                                                                                  |

**Mediana para una aplicación ORM típica: 15–30 consultas por solicitud HTTP.**

Symfony utiliza un umbral de 30 consultas como límite "normal" — al superarlo,
el icono del profiler cambia a amarillo.

## 2. Tiempo por consulta SQL (T_io por consulta)

### Tiempo de ejecución de la consulta en el servidor de BD

Datos de los benchmarks OLTP de sysbench de Percona (MySQL):

| Concurrencia   | Porcentaje de consultas <0,1 ms | 0,1–1 ms | 1–10 ms | >10 ms |
|----------------|----------------------------------|----------|---------|--------|
| 1 hilo         | 86%                              | 10%      | 3%      | 1%     |
| 32 hilos       | 68%                              | 30%      | 2%      | <1%    |
| 128 hilos      | 52%                              | 35%      | 12%     | 1%     |

LinkBench (Percona, aproximando la carga de trabajo real de Facebook):

| Operación     | p50    | p95   | p99    |
|---------------|--------|-------|--------|
| GET_NODE      | 0,4 ms | 39 ms | 77 ms  |
| UPDATE_NODE   | 0,7 ms | 47 ms | 100 ms |

**Fuente:** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### Latencia de red (ida y vuelta)

| Escenario                 | Ida y vuelta | Fuente |
|---------------------------|--------------|--------|
| Unix-socket / localhost   | <0,1 ms      | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, mismo centro de datos | ~0,5 ms    | CYBERTEC PostgreSQL |
| Nube, entre zonas (AZ)    | 1–5 ms      | CYBERTEC PostgreSQL |
| Entre regiones             | 10–50 ms    | Valores típicos |

### Total: Tiempo completo por consulta SQL

Tiempo completo = tiempo de ejecución en el servidor + ida y vuelta de red.

| Entorno            | SELECT simple (p50) | Consulta promedio (p50) |
|--------------------|---------------------|-------------------------|
| Localhost          | 0,1–0,5 ms         | 0,5–2 ms               |
| LAN (mismo DC)     | 0,5–1,5 ms         | 1–4 ms                 |
| Nube (entre AZ)    | 2–6 ms             | 3–10 ms                |

Para un entorno en la nube, **4 ms por consulta promedio** es una estimación bien fundamentada.

## 3. Tiempo de CPU por consulta SQL (T_cpu por consulta)

El tiempo de CPU cubre: análisis del resultado, hidratación de entidades del ORM,
mapeo de objetos, serialización.

Los benchmarks directos de este valor específico son escasos en fuentes públicas,
pero pueden estimarse a partir de datos del profiler:

- Blackfire.io separa el wall time en **tiempo de E/S** y **tiempo de CPU**
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- En aplicaciones PHP típicas, la base de datos es el cuello de botella principal,
  y el tiempo de CPU constituye una fracción pequeña del wall time
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**Estimación indirecta mediante rendimiento:**

Symfony con Doctrine (BD + renderizado Twig) procesa ~1000 req/s
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
Esto significa que el tiempo de CPU por solicitud ≈ 1 ms.
Con ~20 consultas SQL por página → **~0,05 ms de CPU por consulta SQL**.

Laravel API endpoint (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
Tiempo de CPU por solicitud ≈ 2,3 ms. Con ~15 consultas → **~0,15 ms de CPU por consulta SQL**.

## 4. Rendimiento (λ) de aplicaciones PHP

Benchmarks ejecutados en 30 vCPU / 120 GB RAM, nginx + PHP-FPM,
15 conexiones concurrentes ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)):

| Aplicación | Tipo de página             | req/s (PHP 8.4) |
|------------|----------------------------|-----------------|
| Laravel    | Welcome (sin BD)           | ~700            |
| Laravel    | API + Eloquent + Auth      | ~440            |
| Symfony    | Doctrine + Twig            | ~1.000          |
| WordPress  | Página principal (sin plugins) | ~148        |
| Drupal 10  | —                          | ~1.400          |

Nótese que WordPress es significativamente más lento
porque cada solicitud es más pesada (más consultas SQL, renderizado más complejo).

---

## 5. Tiempo total de respuesta (W) en producción

Datos de LittleData (2023, 2.800 sitios de e-commerce):

| Plataforma              | Tiempo promedio de respuesta del servidor |
|-------------------------|-------------------------------------------|
| Shopify                 | 380 ms                                    |
| Promedio de e-commerce  | 450 ms                                    |
| WooCommerce (WordPress) | 780 ms                                    |
| Magento                 | 820 ms                                    |

**Fuente:** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

Benchmarks de la industria:

| Categoría               | Tiempo de respuesta API |
|-------------------------|-------------------------|
| Excelente               | 100–300 ms              |
| Aceptable               | 300–600 ms              |
| Necesita optimización   | >600 ms                 |

## Cálculo práctico usando la Ley de Little

### Escenario 1: Laravel API en la nube

**Datos de entrada:**
- λ = 440 req/s (rendimiento objetivo)
- W = 80 ms (calculado: 20 SQL × 4 ms E/S + 1 ms CPU)
- Núcleos: 8

**Cálculo:**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ tareas concurrentes}
$$

En 8 núcleos, eso es ~4,4 tareas por núcleo. Esto coincide con el hecho de que Laravel con 15
workers PHP-FPM concurrentes ya alcanza 440 req/s. Hay margen de mejora.

### Escenario 2: Laravel API en la nube, 2000 req/s (objetivo)

**Datos de entrada:**
- λ = 2000 req/s (rendimiento objetivo)
- W = 80 ms
- Núcleos: 8

**Cálculo:**

$$
L = 2000 \times 0.080 = 160 \text{ tareas concurrentes}
$$

PHP-FPM no puede manejar 160 workers en 8 núcleos — cada worker es un proceso separado
con ~30–50 MB de memoria. Total: ~6–8 GB solo para workers.

Con corrutinas: 160 tareas × ~4 KiB ≈ **640 KiB**. Una diferencia de **cuatro órdenes de magnitud**.

### Escenario 3: Usando la fórmula de Goetz

**Datos de entrada:**
- T_io = 80 ms (20 consultas × 4 ms)
- T_cpu = 1 ms
- Núcleos: 8

**Cálculo:**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ corrutinas}
$$

**Rendimiento** (mediante la Ley de Little):

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

Este es el techo teórico con utilización completa de 8 núcleos.
En la práctica, será menor debido a la sobrecarga del planificador, GC, límites del pool de conexiones.
Pero incluso el 50% de este valor (4.000 req/s) es
**un orden de magnitud mayor** que 440 req/s de PHP-FPM en los mismos 8 núcleos.

## Resumen: De dónde vienen los números

| Magnitud                              | Valor            | Fuente                                     |
|---------------------------------------|------------------|--------------------------------------------|
| Consultas SQL por solicitud HTTP      | 15–30            | WordPress ~17, umbral de Symfony <30       |
| Tiempo por consulta SQL (nube)        | 3–6 ms           | Percona p50 + CYBERTEC ida y vuelta        |
| CPU por consulta SQL                  | 0,05–0,15 ms    | Cálculo inverso desde benchmarks de rendimiento |
| Rendimiento de Laravel                | ~440 req/s (API) | Benchmarks de Sevalla/Kinsta, PHP 8.4      |
| Tiempo de respuesta e-commerce (promedio) | 450 ms       | LittleData, 2.800 sitios                  |
| Tiempo de respuesta API (norma)       | 100–300 ms       | Benchmark de la industria                  |

---

## Referencias

### Benchmarks de frameworks PHP
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — rendimiento para WordPress, Laravel, Symfony, Drupal
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel welcome + API endpoint

### Benchmarks de bases de datos
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — p50/p95/p99 por operación
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — distribución de latencia a diferentes niveles de concurrencia
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — latencias de red por entorno
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — umbrales <10ms / >100ms

### Tiempos de respuesta de sistemas en producción
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2.800 sitios de e-commerce

### Perfilado de PHP
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — desglose del wall time en E/S y CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — APM para aplicaciones PHP
