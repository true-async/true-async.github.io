---
layout: docs
lang: es
path_key: "/docs/evidence/concurrency-efficiency.html"
nav_active: docs
permalink: /es/docs/evidence/concurrency-efficiency.html
page_title: "IO-Bound vs CPU-bound"
description: "An&aacute;lisis de eficiencia de concurrencia para tareas IO-bound y CPU-bound. Ley de Little, f&oacute;rmula de Goetz, c&aacute;lculo del n&uacute;mero &oacute;ptimo de corrutinas."
---

# IO-Bound vs CPU-bound

Cu&aacute;nta concurrencia o paralelismo proporciona una ganancia de rendimiento depende de la naturaleza de la carga de trabajo.
En las aplicaciones de servidor, se distinguen t&iacute;picamente dos tipos principales de tareas.

- **IO-bound** -- tareas donde una parte significativa del tiempo se dedica a esperar operaciones de entrada/salida:
  solicitudes de red, consultas a bases de datos, lectura y escritura de archivos. Durante estos momentos, la CPU permanece inactiva.
- **CPU-bound** -- tareas que requieren c&aacute;lculos intensivos que mantienen al procesador ocupado casi constantemente:
  algoritmos complejos, procesamiento de datos, criptograf&iacute;a.

En los &uacute;ltimos a&ntilde;os, la mayor&iacute;a de las aplicaciones web se han desplazado hacia cargas de trabajo **IO-bound**.
Esto es impulsado por el crecimiento de microservicios, `API`s remotas y servicios en la nube.
Enfoques como Frontend for Backend (`BFF`) y `API Gateway`, que agregan datos de m&uacute;ltiples fuentes,
amplifican este efecto.

Una aplicaci&oacute;n de servidor moderna tambi&eacute;n es dif&iacute;cil de imaginar sin logging, telemetr&iacute;a
y monitoreo en tiempo real. Todas estas operaciones son inherentemente IO-bound.

## Eficiencia de las tareas IO-bound

La eficiencia de la ejecuci&oacute;n concurrente de tareas `IO-bound` est&aacute; determinada por
qu&eacute; fracci&oacute;n de tiempo la tarea realmente utiliza la `CPU`
versus cu&aacute;nto tiempo pasa esperando que se completen las operaciones de I/O.

### Ley de Little

En la teor&iacute;a de colas, una de las f&oacute;rmulas fundamentales
es la Ley de Little ([Little's Law](https://en.wikipedia.org/wiki/Little%27s_law)):

$$
L = \lambda \cdot W
$$

Donde:
- `L` -- el n&uacute;mero promedio de tareas en el sistema
- `&lambda;` -- la tasa promedio de solicitudes entrantes
- `W` -- el tiempo promedio que una tarea pasa en el sistema

Esta ley es universal y no depende de la implementaci&oacute;n espec&iacute;fica del sistema:
no importa si se utilizan hilos, corrutinas o callbacks as&iacute;ncronos.
Describe la relaci&oacute;n fundamental entre carga, latencia
y el nivel de concurrencia.

Al estimar la concurrencia para una aplicaci&oacute;n de servidor, esencialmente
est&aacute;s resolviendo el problema de
cu&aacute;ntas tareas deben estar en el sistema simult&aacute;neamente
para que los recursos se utilicen eficientemente.

Para cargas de trabajo `IO-bound`, el tiempo promedio de procesamiento de solicitudes es grande
en comparaci&oacute;n con el tiempo dedicado a c&aacute;lculos activos.
Por lo tanto, para que la CPU no permanezca inactiva, debe haber
un n&uacute;mero suficiente de tareas concurrentes en el sistema.

Esta es exactamente la cantidad que el an&aacute;lisis formal permite estimar,
relacionando:
- tiempo de espera,
- throughput,
- y el nivel requerido de concurrencia.

Un enfoque similar se utiliza en la industria para calcular
el tama&ntilde;o &oacute;ptimo del pool de hilos (ver Brian Goetz, *"Java Concurrency in Practice"*).

> Los datos estad&iacute;sticos reales para cada elemento de estas f&oacute;rmulas
> (n&uacute;mero de consultas SQL por solicitud HTTP, latencias de BD, throughput de frameworks PHP)
> est&aacute;n recopilados en un documento separado:
> [Datos estad&iacute;sticos para el c&aacute;lculo de concurrencia](/es/docs/evidence/real-world-statistics.html).

### Utilizaci&oacute;n b&aacute;sica de CPU

Para calcular qu&eacute; fracci&oacute;n de tiempo el procesador
realmente realiza trabajo &uacute;til al ejecutar una sola tarea, se puede usar la siguiente f&oacute;rmula:

$$
U = \frac{T_{cpu}}{T_{cpu} + T_{io}}
$$

- `T_cpu` -- el tiempo dedicado a realizar c&aacute;lculos en la CPU
- `T_io` -- el tiempo dedicado a esperar operaciones de I/O

La suma `T_cpu + T_io` representa el tiempo de vida total de una tarea
desde el inicio hasta la finalizaci&oacute;n.

El valor `U` var&iacute;a de 0 a 1 e indica el grado
de utilizaci&oacute;n del procesador:
- `U &rarr; 1` caracteriza una tarea computacionalmente pesada (`CPU-bound`)
- `U &rarr; 0` caracteriza una tarea que pasa la mayor parte del tiempo esperando I/O (`IO-bound`)

As&iacute;, la f&oacute;rmula proporciona una evaluaci&oacute;n cuantitativa de
c&oacute;mo se est&aacute; utilizando eficientemente la `CPU`
y si la carga de trabajo en cuesti&oacute;n es `IO-bound` o `CPU-bound`.

### Impacto de la concurrencia

Al ejecutar m&uacute;ltiples tareas `IO-bound` concurrentemente, la `CPU` puede usar
el tiempo de espera de `I/O` de una tarea para realizar c&aacute;lculos para **otra**.

La utilizaci&oacute;n de CPU con `N` tareas concurrentes se puede estimar como:

$$
U_N = \min\left(1,\; N \cdot \frac{T_{cpu}}{T_{cpu} + T_{io}}\right)
$$

Aumentar la concurrencia mejora la utilizaci&oacute;n de la `CPU`,
pero solo hasta un cierto l&iacute;mite.

### L&iacute;mite de eficiencia

La ganancia m&aacute;xima de la concurrencia est&aacute; limitada por la relaci&oacute;n
entre el tiempo de espera de `I/O` y el tiempo de c&aacute;lculo:

$$
E(N) \approx \min\left(N,\; 1 + \frac{T_{io}}{T_{cpu}}\right)
$$

En la pr&aacute;ctica, esto significa que el n&uacute;mero de tareas
concurrentes realmente &uacute;tiles es aproximadamente igual a la relaci&oacute;n `T_io / T_cpu`.

### Concurrencia &oacute;ptima

$$
N_{opt} \approx 1 + \frac{T_{io}}{T_{cpu}}
$$

El uno en la f&oacute;rmula tiene en cuenta la tarea que actualmente se ejecuta en la `CPU`.
Con una relaci&oacute;n `T_io / T_cpu` grande (lo cual es t&iacute;pico para cargas `IO-bound`),
la contribuci&oacute;n de uno es despreciable, y la f&oacute;rmula a menudo se simplifica a `T_io / T_cpu`.

Esta f&oacute;rmula es un caso especial (para un solo n&uacute;cleo) de la cl&aacute;sica
f&oacute;rmula para el tama&ntilde;o &oacute;ptimo del pool de hilos propuesta por Brian Goetz
en el libro *"Java Concurrency in Practice"* (2006):

$$
N_{threads} = N_{cores} \times \left(1 + \frac{T_{wait}}{T_{service}}\right)
$$

La relaci&oacute;n `T_wait / T_service` se conoce como el **coeficiente de bloqueo**.
Cuanto mayor sea este coeficiente, m&aacute;s tareas concurrentes
pueden ser utilizadas eficazmente por un solo n&uacute;cleo.

A este nivel de concurrencia, el procesador pasa la mayor parte del tiempo
realizando trabajo &uacute;til, y aumentar a&uacute;n m&aacute;s el n&uacute;mero de tareas
ya no produce una ganancia notable.

Esta es precisamente la raz&oacute;n por la que los modelos de ejecuci&oacute;n as&iacute;ncrona
son m&aacute;s efectivos para cargas de trabajo web `IO-bound`.

## C&aacute;lculo de ejemplo para una aplicaci&oacute;n web t&iacute;pica

Consideremos un modelo simplificado pero bastante realista de una aplicaci&oacute;n web promedio del lado del servidor.
Supongamos que el procesamiento de una sola solicitud `HTTP` implica principalmente la interacci&oacute;n con una base de datos
y no contiene operaciones computacionalmente complejas.

### Suposiciones iniciales

- Se ejecutan aproximadamente **20 consultas SQL** por solicitud HTTP
- El c&aacute;lculo se limita al mapeo de datos, serializaci&oacute;n de respuesta y logging
- La base de datos est&aacute; fuera del proceso de la aplicaci&oacute;n (I/O remoto)

> **&iquest;Por qu&eacute; 20 consultas?**
> Esta es la estimaci&oacute;n mediana para aplicaciones ORM de complejidad moderada.
> Para comparaci&oacute;n:
> * WordPress genera ~17 consultas por p&aacute;gina,
> * Drupal sin cach&eacute; -- de 80 a 100,
> * y una aplicaci&oacute;n t&iacute;pica Laravel/Symfony -- de 10 a 30.
>
> La principal fuente de crecimiento es el patr&oacute;n N+1, donde el ORM carga entidades relacionadas
> con consultas separadas.

### Estimaci&oacute;n del tiempo de ejecuci&oacute;n

Para la estimaci&oacute;n, usaremos valores promediados:

- Una consulta SQL:
    - Tiempo de espera I/O: `T_io &asymp; 4 ms`
    - Tiempo de c&aacute;lculo CPU: `T_cpu &asymp; 0,05 ms`

Total por solicitud HTTP:

- `T_io = 20 &times; 4 ms = 80 ms`
- `T_cpu = 20 &times; 0,05 ms = 1 ms`

> **Sobre los valores de latencia elegidos.**
> El tiempo de I/O para una sola consulta `SQL` consiste en la latencia de red (`round-trip`)
> y el tiempo de ejecuci&oacute;n de la consulta en el servidor de BD.
> El round-trip de red dentro de un solo centro de datos es ~0,5 ms,
> y para entornos cloud (cross-AZ, RDS gestionado) -- 1--5 ms.
> Teniendo en cuenta el tiempo de ejecuci&oacute;n de una consulta moderadamente compleja,
> los resultantes 4 ms por consulta son una estimaci&oacute;n realista para un entorno cloud.
> El tiempo de CPU (0,05 ms) cubre el mapeo de resultados ORM, la hidrataci&oacute;n de entidades
> y la l&oacute;gica de procesamiento b&aacute;sica.

### Caracter&iacute;sticas de la carga de trabajo

La relaci&oacute;n entre el tiempo de espera y el tiempo de c&aacute;lculo:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{1} = 80
$$

Esto significa que la tarea es predominantemente **IO-bound**:
el procesador pasa la mayor parte del tiempo inactivo,
esperando que se completen las operaciones de I/O.

### Estimaci&oacute;n del n&uacute;mero de corrutinas

El n&uacute;mero &oacute;ptimo de corrutinas concurrentes por n&uacute;cleo de CPU
es aproximadamente igual a la relaci&oacute;n entre el tiempo de espera de I/O y el tiempo de c&aacute;lculo:

$$
N_{coroutines} \approx \frac{T_{io}}{T_{cpu}} \approx 80
$$

En otras palabras, aproximadamente **80 corrutinas por n&uacute;cleo** permiten ocultar virtualmente por completo
la latencia de I/O mientras se mantiene una alta utilizaci&oacute;n de CPU.

Para comparaci&oacute;n: [Zalando Engineering](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)
proporciona un ejemplo con un microservicio donde el tiempo de respuesta es 50 ms y el tiempo de procesamiento es 5 ms
en una m&aacute;quina de doble n&uacute;cleo: `2 &times; (1 + 50/5) = 22 hilos` -- el mismo principio, la misma f&oacute;rmula.

### Escalado por n&uacute;mero de n&uacute;cleos

Para un servidor con `C` n&uacute;cleos:

$$
N_{total} \approx C \cdot \frac{T_{io}}{T_{cpu}}
$$

Por ejemplo, para un procesador de 8 n&uacute;cleos:

$$
N_{total} \approx 8 \times 80 = 640 \text{ corrutinas}
$$

Este valor refleja el **nivel &uacute;til de concurrencia**,
no un l&iacute;mite r&iacute;gido.

### Sensibilidad al entorno

El valor de 80 corrutinas por n&uacute;cleo no es una constante universal,
sino el resultado de suposiciones espec&iacute;ficas sobre la latencia de I/O.
Dependiendo del entorno de red, el n&uacute;mero &oacute;ptimo de tareas concurrentes
puede diferir significativamente:

| Entorno                         | T_io por consulta SQL | T_io total (&times;20) | N por n&uacute;cleo |
|---------------------------------|-----------------------|-------------------------|------------|
| Localhost / Unix-socket         | ~0,1 ms               | 2 ms                    | ~2         |
| LAN (centro de datos &uacute;nico)   | ~1 ms                 | 20 ms                   | ~20        |
| Cloud (cross-AZ, RDS)          | ~4 ms                 | 80 ms                   | ~80        |
| Servidor remoto / cross-region | ~10 ms                | 200 ms                  | ~200       |

Cuanto mayor sea la latencia, m&aacute;s corrutinas se necesitan
para utilizar completamente la CPU con trabajo &uacute;til.

### PHP-FPM vs Corrutinas: C&aacute;lculo aproximado

Para estimar el beneficio pr&aacute;ctico de las corrutinas,
comparemos dos modelos de ejecuci&oacute;n en el mismo servidor
con la misma carga de trabajo.

#### Datos iniciales

**Servidor:** 8 n&uacute;cleos, entorno cloud (cross-AZ RDS).

**Carga de trabajo:** endpoint t&iacute;pico de API Laravel --
autorizaci&oacute;n, consultas Eloquent con eager loading, serializaci&oacute;n JSON.

Basado en datos de benchmarks de
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)
y [Kinsta](https://kinsta.com/blog/php-benchmarks/):

| Par&aacute;metro                                        | Valor      | Fuente            |
|-------------------------------------------------|------------|-------------------|
| Throughput de API Laravel (30 vCPU, DB localhost) | ~440 req/s | Sevalla, PHP 8.3  |
| N&uacute;mero de workers PHP-FPM en el benchmark        | 15         | Sevalla           |
| Tiempo de respuesta (W) en el benchmark          | ~34 ms     | L/&lambda; = 15/440      |
| Memoria por worker PHP-FPM                       | ~40 MB     | Valor t&iacute;pico      |

#### Paso 1: Estimaci&oacute;n de T_cpu y T_io

En el benchmark de **Sevalla**, la base de datos se ejecuta en localhost (latencia <0,1 ms).
Con ~10 consultas SQL por endpoint, el I/O total es menos de 1 ms.

Dado:
- Throughput: &lambda; &asymp; 440 req/s
- N&uacute;mero de solicitudes servidas simult&aacute;neamente (workers PHP-FPM): L = 15
- Base de datos en localhost, por lo que T_io &asymp; 0

Por la Ley de Little:

$$
W = \frac{L}{\lambda} = \frac{15}{440} \approx 0,034 \, \text{s} \approx 34 \, \text{ms}
$$

Dado que en este benchmark la base de datos se ejecuta en `localhost`
y el `I/O` total es menos de 1 ms,
el tiempo de respuesta promedio resultante refleja casi completamente
el tiempo de procesamiento `CPU` por solicitud:

$$
T_{cpu} \approx W \approx 34 \, \text{ms}
$$

Esto significa que bajo condiciones de `localhost`, casi todo el tiempo de respuesta (~34 ms) es `CPU`:
framework, `middleware`, `ORM`, serializaci&oacute;n.


Movamos el mismo endpoint a un **entorno cloud** con 20 consultas `SQL`:

$$
T_{cpu} = 34 \text{ ms (framework + l&oacute;gica)}
$$

$$
T_{io} = 20 \times 4 \text{ ms} = 80 \text{ ms (tiempo de espera BD)}
$$

$$
W = T_{cpu} + T_{io} = 114 \text{ ms}
$$

Coeficiente de bloqueo:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{34} \approx 2,4
$$

#### Paso 2: PHP-FPM

En el modelo `PHP-FPM`, cada worker es un proceso del SO separado.
Durante la espera de `I/O`, el worker se bloquea y no puede procesar otras solicitudes.

Para utilizar completamente 8 n&uacute;cleos, se necesitan suficientes workers
para que en cualquier momento dado, 8 de ellos est&eacute;n realizando trabajo `CPU`:

$$
N_{workers} = 8 \times \left(1 + \frac{80}{34}\right) = 8 \times 3,4 = 27
$$

| M&eacute;trica                             | Valor         |
|-------------------------------------|---------------|
| Workers                            | 27            |
| Memoria (27 &times; 40 MB)               | **1,08 GB**   |
| Throughput (27 / 0,114)            | **237 req/s** |
| Utilizaci&oacute;n de CPU                  | ~100%         |

En la pr&aacute;ctica, los administradores a menudo establecen `pm.max_children = 50--100`,
que est&aacute; por encima del &oacute;ptimo. Los workers adicionales compiten por CPU,
aumentan el n&uacute;mero de cambios de contexto del SO
y consumen memoria sin aumentar el throughput.

#### Paso 3: Corrutinas (event loop)

En el modelo de corrutinas, un solo hilo (por n&uacute;cleo) sirve
muchas solicitudes. Cuando una corrutina espera I/O,
el planificador cambia a otra en ~200 nanosegundos
(ver [base de evidencia](/es/docs/evidence/coroutines-evidence.html)).

El n&uacute;mero &oacute;ptimo de corrutinas es el mismo:

$$
N_{coroutines} = 8 \times 3,4 = 27
$$

| M&eacute;trica                 | Valor         |
|------------------------|---------------|
| Corrutinas             | 27            |
| Memoria (27 &times; ~2 MiB) | **54 MiB**    |
| Throughput             | **237 req/s** |
| Utilizaci&oacute;n de CPU     | ~100%         |

El throughput es **el mismo** -- porque la CPU es el cuello de botella.
Pero la memoria para concurrencia: **54 MiB vs 1,08 GB** -- una diferencia de **~20x**.

> **Sobre el tama&ntilde;o del stack de corrutinas.**
> El consumo de memoria de una corrutina en PHP est&aacute; determinado por el tama&ntilde;o reservado del C-stack.
> Por defecto es ~2 MiB, pero puede reducirse a 128 KiB.
> Con un stack de 128 KiB, la memoria para 27 corrutinas ser&iacute;a solo ~3,4 MiB.

#### Paso 4: &iquest;Qu&eacute; pasa si la carga de CPU es menor?

El framework `Laravel` en modo `FPM` consume ~34 ms de `CPU` por solicitud,
lo que incluye la reinicializaci&oacute;n de servicios en cada solicitud.

En un runtime con estado (que es lo que es `True Async`), estos costos se reducen significativamente:
las rutas est&aacute;n compiladas, el contenedor de dependencias est&aacute; inicializado,
los pools de conexiones se reutilizan.

Si `T_cpu` baja de 34 ms a 5 ms (lo cual es realista para el modo con estado),
el panorama cambia dr&aacute;sticamente:

| T_cpu | Coef. bloqueo | N (8 n&uacute;cleos) | &lambda; (req/s) | Memoria (FPM) | Memoria (corrutinas) |
|-------|---------------|------------|-----------|--------------|---------------------|
| 34 ms | 2,4           | 27         | 237       | 1,08 GB      | 54 MiB              |
| 10 ms | 8             | 72         | 800       | 2,88 GB      | 144 MiB             |
| 5 ms  | 16            | 136        | 1 600     | 5,44 GB      | 272 MiB             |
| 1 ms  | 80            | 648        | 8 000     | **25,9 GB**  | **1,27 GiB**        |

Con `T_cpu = 1 ms` (handler liviano, overhead m&iacute;nimo):
- PHP-FPM necesitar&iacute;a **648 procesos y 25,9 GB RAM** -- poco realista
- Las corrutinas requieren las mismas 648 tareas y **1,27 GiB** -- **~20x menos**

#### Paso 5: Ley de Little -- verificaci&oacute;n a trav&eacute;s del throughput

Verifiquemos el resultado para `T_cpu = 5 ms`:

$$
\lambda = \frac{L}{W} = \frac{136}{0,085} = 1\,600 \text{ req/s}
$$

Para lograr el mismo throughput, PHP-FPM necesita 136 workers.
Cada uno ocupa ~40 MB:

$$
136 \times 40 \text{ MB} = 5,44 \text{ GB solo para workers}
$$

Corrutinas:

$$
136 \times 2 \text{ MiB} = 272 \text{ MiB}
$$

Los ~5,2 GB liberados pueden dirigirse hacia cach&eacute;s,
pools de conexiones de BD o el manejo de m&aacute;s solicitudes.

#### Resumen: Cu&aacute;ndo las corrutinas proporcionan un beneficio

| Condici&oacute;n                                       | Beneficio de las corrutinas                                              |
|-------------------------------------------------|--------------------------------------------------------------------------|
| Framework pesado, BD localhost (T_io &asymp; 0)       | M&iacute;nimo -- la carga es CPU-bound                                          |
| Framework pesado, BD cloud (T_io = 80 ms)       | Moderado -- ~20x ahorro de memoria al mismo throughput                   |
| Handler liviano, BD cloud                       | **M&aacute;ximo** -- aumento de throughput hasta 13x, ~20x ahorro de memoria    |
| Microservicio / API Gateway                     | **M&aacute;ximo** -- I/O casi puro, decenas de miles de req/s en un servidor    |

**Conclusi&oacute;n:** cuanto mayor sea la proporci&oacute;n de I/O en el tiempo total de solicitud y m&aacute;s ligero sea el procesamiento CPU,
mayor ser&aacute; el beneficio de las corrutinas.
Para aplicaciones IO-bound (que son la mayor&iacute;a de los servicios web modernos),
las corrutinas permiten utilizar la misma CPU varias veces m&aacute;s eficientemente,
consumiendo &oacute;rdenes de magnitud menos memoria.

### Notas pr&aacute;cticas

- Aumentar el n&uacute;mero de corrutinas por encima del nivel &oacute;ptimo rara vez proporciona un beneficio,
  pero tampoco es un problema: las corrutinas son ligeras, y el overhead de corrutinas "extra"
  es incomparablemente peque&ntilde;o comparado con el costo de los hilos del SO
- Las limitaciones reales se convierten en:
    - pool de conexiones de base de datos
    - latencia de red
    - mecanismos de back-pressure
    - l&iacute;mites de descriptores de archivo abiertos (ulimit)
- Para tales cargas de trabajo, el modelo *event loop + corrutinas* resulta ser
  significativamente m&aacute;s eficiente que el modelo cl&aacute;sico de bloqueo

### Conclusi&oacute;n

Para una aplicaci&oacute;n web moderna t&iacute;pica
donde predominan las operaciones de I/O,
el modelo de ejecuci&oacute;n as&iacute;ncrona permite:
- ocultar efectivamente la latencia de I/O
- mejorar significativamente la utilizaci&oacute;n de CPU
- reducir la necesidad de un gran n&uacute;mero de hilos

Es precisamente en tales escenarios donde las ventajas de la asincron&iacute;a
se demuestran m&aacute;s claramente.

---

### Lectura adicional

- [Swoole en la pr&aacute;ctica: Mediciones reales](/es/docs/evidence/swoole-evidence.html) -- casos de producci&oacute;n (Appwrite +91%, IdleMMO 35M req/d&iacute;a), benchmarks independientes con y sin BD, TechEmpower
- [Python asyncio en la pr&aacute;ctica](/es/docs/evidence/python-evidence.html) -- Duolingo +40%, Super.com -90% costos, benchmarks uvloop, contraargumentos
- [Base de evidencia: Por qu&eacute; funcionan las corrutinas single-threaded](/es/docs/evidence/coroutines-evidence.html) -- mediciones del costo de cambio de contexto, comparaci&oacute;n con hilos del SO, investigaci&oacute;n acad&eacute;mica y benchmarks industriales

---

### Referencias y literatura

- Brian Goetz, *Java Concurrency in Practice* (2006) -- f&oacute;rmula para el tama&ntilde;o &oacute;ptimo del pool de hilos: `N = cores &times; (1 + W/S)`
- [Zalando Engineering: How to set an ideal thread pool size](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html) -- aplicaci&oacute;n pr&aacute;ctica de la f&oacute;rmula de Goetz con ejemplos y derivaci&oacute;n mediante la Ley de Little
- [Backendhance: The Optimal Thread-Pool Size in Java](https://backendhance.com/en/blog/2023/optimal-thread-pool-size/) -- an&aacute;lisis detallado de la f&oacute;rmula considerando la utilizaci&oacute;n objetivo de CPU
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) -- mediciones del impacto de la latencia de red en el rendimiento de PostgreSQL
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) -- directrices para latencias aceptables de consultas SQL en aplicaciones web
