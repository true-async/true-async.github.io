---
layout: docs
lang: it
path_key: "/docs/evidence/concurrency-efficiency.html"
nav_active: docs
permalink: /it/docs/evidence/concurrency-efficiency.html
page_title: "IO-Bound vs CPU-bound"
description: "Analisi dell'efficienza della concorrenza per task IO-bound e CPU-bound. Legge di Little, formula di Goetz, calcolo del numero ottimale di coroutine."
---

# IO-Bound vs CPU-bound

Quanto la concorrenza o il parallelismo forniscano un guadagno prestazionale dipende dalla natura del carico di lavoro.
Nelle applicazioni server, si distinguono tipicamente due tipi principali di task.

- **IO-bound** — task in cui una parte significativa del tempo viene trascorsa in attesa di operazioni di input/output:
  richieste di rete, query al database, lettura e scrittura di file. Durante questi momenti, la CPU rimane inattiva.
- **CPU-bound** — task che richiedono calcoli intensivi che mantengono il processore occupato quasi costantemente:
  algoritmi complessi, elaborazione dati, crittografia.

Negli ultimi anni, la maggior parte delle applicazioni web si sta spostando verso carichi di lavoro **IO-bound**.
Questo e' dovuto alla crescita dei microservizi, delle `API` remote e dei servizi cloud.
Approcci come Frontend for Backend (`BFF`) e `API Gateway`, che aggregano dati da molteplici sorgenti,
amplificano questo effetto.

Un'applicazione server moderna e' inoltre difficile da immaginare senza logging, telemetria
e monitoraggio in tempo reale. Tutte queste operazioni sono intrinsecamente IO-bound.

## Efficienza dei task IO-bound

L'efficienza dell'esecuzione concorrente dei task `IO-bound` e' determinata dalla
frazione di tempo in cui il task utilizza effettivamente la `CPU`
rispetto a quanto tempo trascorre in attesa del completamento delle operazioni I/O.

### Legge di Little

Nella teoria delle code, una delle formule fondamentali
e' la Legge di Little ([Little's Law](https://en.wikipedia.org/wiki/Little%27s_law)):

$$
L = \lambda \cdot W
$$

Dove:
- `L` — il numero medio di task nel sistema
- `λ` — il tasso medio di richieste in arrivo
- `W` — il tempo medio che un task trascorre nel sistema

Questa legge e' universale e non dipende dall'implementazione specifica del sistema:
non importa se si utilizzano thread, coroutine o callback asincroni.
Descrive la relazione fondamentale tra carico, latenza
e livello di concorrenza.

Quando si stima la concorrenza per un'applicazione server, si sta essenzialmente
risolvendo il problema di
quanti task devono essere nel sistema contemporaneamente
affinche' le risorse vengano utilizzate in modo efficiente.

Per i carichi di lavoro `IO-bound`, il tempo medio di elaborazione delle richieste e' elevato
rispetto al tempo dedicato al calcolo attivo.
Pertanto, per evitare che la CPU rimanga inattiva, deve esserci
un numero sufficiente di task concorrenti nel sistema.

Questa e' esattamente la quantita' che l'analisi formale ci permette di stimare,
mettendo in relazione:
- il tempo di attesa,
- il throughput,
- e il livello di concorrenza richiesto.

Un approccio simile viene utilizzato nell'industria per calcolare
la dimensione ottimale del pool di thread (vedi Brian Goetz, *"Java Concurrency in Practice"*).

> I dati statistici effettivi per ogni elemento di queste formule
> (numero di query SQL per richiesta HTTP, latenze del DB, throughput dei framework PHP)
> sono raccolti in un documento separato:
> [Dati statistici per il calcolo della concorrenza](/it/docs/evidence/real-world-statistics.html).

### Utilizzo base della CPU

Per calcolare quale frazione del tempo il processore
sta effettivamente svolgendo lavoro utile durante l'esecuzione di un singolo task, si puo' utilizzare la seguente formula:

$$
U = \frac{T_{cpu}}{T_{cpu} + T_{io}}
$$

- `T_cpu` — il tempo dedicato ai calcoli sulla CPU
- `T_io` — il tempo trascorso in attesa delle operazioni I/O

La somma `T_cpu + T_io` rappresenta il tempo totale di vita di un task
dall'inizio al completamento.

Il valore `U` varia da 0 a 1 e indica il grado
di utilizzo del processore:
- `U → 1` caratterizza un task ad alto carico computazionale (`CPU-bound`)
- `U → 0` caratterizza un task che trascorre la maggior parte del tempo in attesa di I/O (`IO-bound`)

Pertanto, la formula fornisce una valutazione quantitativa di
quanto efficientemente viene utilizzata la `CPU`
e se il carico di lavoro in questione e' `IO-bound` o `CPU-bound`.

### Impatto della concorrenza

Quando si eseguono piu' task `IO-bound` in modo concorrente, la `CPU` puo' utilizzare
il tempo di attesa `I/O` di un task per eseguire calcoli per **un altro**.

L'utilizzo della CPU con `N` task concorrenti puo' essere stimato come:

$$
U_N = \min\left(1,\; N \cdot \frac{T_{cpu}}{T_{cpu} + T_{io}}\right)
$$

Aumentare la concorrenza migliora l'utilizzo della `CPU`,
ma solo fino a un certo limite.

### Limite di efficienza

Il guadagno massimo dalla concorrenza e' limitato dal rapporto
tra il tempo di attesa `I/O` e il tempo di calcolo:

$$
E(N) \approx \min\left(N,\; 1 + \frac{T_{io}}{T_{cpu}}\right)
$$

In pratica, questo significa che il numero di task concorrenti
realmente utili e' approssimativamente uguale al rapporto `T_io / T_cpu`.

### Concorrenza ottimale

$$
N_{opt} \approx 1 + \frac{T_{io}}{T_{cpu}}
$$

L'uno nella formula tiene conto del task attualmente in esecuzione sulla `CPU`.
Con un rapporto `T_io / T_cpu` elevato (tipico dei carichi di lavoro `IO-bound`),
il contributo dell'uno e' trascurabile, e la formula viene spesso semplificata a `T_io / T_cpu`.

Questa formula e' un caso speciale (per un singolo core) della classica
formula per la dimensione ottimale del pool di thread proposta da Brian Goetz
nel libro *"Java Concurrency in Practice"* (2006):

$$
N_{threads} = N_{cores} \times \left(1 + \frac{T_{wait}}{T_{service}}\right)
$$

Il rapporto `T_wait / T_service` e' noto come **coefficiente di blocco**.
Piu' alto e' questo coefficiente, piu' task concorrenti
possono essere effettivamente utilizzati da un singolo core.

A questo livello di concorrenza, il processore trascorre la maggior parte del suo tempo
svolgendo lavoro utile, e un ulteriore aumento del numero di task
non produce piu' un guadagno apprezzabile.

Questo e' precisamente il motivo per cui i modelli di esecuzione asincrona
sono piu' efficaci per i carichi di lavoro web `IO-bound`.

## Esempio di calcolo per una tipica applicazione web

Consideriamo un modello semplificato ma abbastanza realistico di un'applicazione web server media.
Supponiamo che l'elaborazione di una singola richiesta `HTTP` coinvolga principalmente l'interazione con un database
e non contenga operazioni computazionalmente complesse.

### Ipotesi iniziali

- Vengono eseguite circa **20 query SQL** per richiesta HTTP
- Il calcolo e' limitato al mapping dei dati, alla serializzazione della risposta e al logging
- Il database si trova al di fuori del processo dell'applicazione (I/O remoto)

> **Perche' 20 query?**
> Questa e' la stima mediana per applicazioni ORM di complessita' moderata.
> Per confronto:
> * WordPress genera ~17 query per pagina,
> * Drupal senza cache — da 80 a 100,
> * e una tipica applicazione Laravel/Symfony — da 10 a 30.
>
> La principale fonte di crescita e' il pattern N+1, dove l'ORM carica le entita' correlate
> con query separate.

### Stima del tempo di esecuzione

Per la stima, utilizzeremo valori medi:

- Una query SQL:
    - Tempo di attesa I/O: `T_io ≈ 4 ms`
    - Tempo di calcolo CPU: `T_cpu ≈ 0.05 ms`

Totale per richiesta HTTP:

- `T_io = 20 × 4 ms = 80 ms`
- `T_cpu = 20 × 0.05 ms = 1 ms`

> **Sui valori di latenza scelti.**
> Il tempo di I/O per una singola query `SQL` e' composto dalla latenza di rete (`round-trip`)
> e dal tempo di esecuzione della query sul server DB.
> Il round-trip di rete all'interno di un singolo data center e' ~0,5 ms,
> e per ambienti cloud (cross-AZ, managed RDS) — 1–5 ms.
> Tenendo conto del tempo di esecuzione di una query moderatamente complessa,
> i risultanti 4 ms per query sono una stima realistica per un ambiente cloud.
> Il tempo CPU (0,05 ms) copre il mapping dei risultati ORM, l'hydration delle entita'
> e la logica di elaborazione di base.

### Caratteristiche del carico di lavoro

Il rapporto tra tempo di attesa e tempo di calcolo:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{1} = 80
$$

Questo significa che il task e' prevalentemente **IO-bound**:
il processore trascorre la maggior parte del suo tempo inattivo,
in attesa del completamento delle operazioni I/O.

### Stima del numero di coroutine

Il numero ottimale di coroutine concorrenti per core CPU
e' approssimativamente uguale al rapporto tra il tempo di attesa I/O e il tempo di calcolo:

$$
N_{coroutines} \approx \frac{T_{io}}{T_{cpu}} \approx 80
$$

In altre parole, circa **80 coroutine per core** consentono di nascondere virtualmente tutta
la latenza I/O mantenendo un elevato utilizzo della CPU.

Per confronto: [Zalando Engineering](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)
fornisce un esempio con un microservizio in cui il tempo di risposta e' 50 ms e il tempo di elaborazione e' 5 ms
su una macchina dual-core: `2 × (1 + 50/5) = 22 thread` — lo stesso principio, la stessa formula.

### Scalabilita' per numero di core

Per un server con `C` core:

$$
N_{total} \approx C \cdot \frac{T_{io}}{T_{cpu}}
$$

Ad esempio, per un processore a 8 core:

$$
N_{total} \approx 8 \times 80 = 640 \text{ coroutine}
$$

Questo valore riflette il **livello utile di concorrenza**,
non un limite rigido.

### Sensibilita' all'ambiente

Il valore di 80 coroutine per core non e' una costante universale,
ma il risultato di ipotesi specifiche sulla latenza I/O.
A seconda dell'ambiente di rete, il numero ottimale di task concorrenti
puo' differire significativamente:

| Ambiente                        | T_io per query SQL | T_io totale (×20) | N per core |
|---------------------------------|--------------------|-------------------|------------|
| Localhost / Unix-socket         | ~0,1 ms            | 2 ms              | ~2         |
| LAN (singolo data center)      | ~1 ms              | 20 ms             | ~20        |
| Cloud (cross-AZ, RDS)          | ~4 ms              | 80 ms             | ~80        |
| Server remoto / cross-region   | ~10 ms             | 200 ms            | ~200       |

Maggiore e' la latenza, piu' coroutine sono necessarie
per utilizzare completamente la CPU con lavoro utile.

### PHP-FPM vs Coroutine: calcolo approssimativo

Per stimare il beneficio pratico delle coroutine,
confrontiamo due modelli di esecuzione sullo stesso server
con lo stesso carico di lavoro.

#### Dati iniziali

**Server:** 8 core, ambiente cloud (cross-AZ RDS).

**Carico di lavoro:** tipico endpoint API Laravel —
autorizzazione, query Eloquent con eager loading, serializzazione JSON.

Basato sui dati di benchmark di
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)
e [Kinsta](https://kinsta.com/blog/php-benchmarks/):

| Parametro                                        | Valore     | Fonte             |
|--------------------------------------------------|------------|-------------------|
| Throughput API Laravel (30 vCPU, localhost DB)    | ~440 req/s | Sevalla, PHP 8.3  |
| Numero di worker PHP-FPM nel benchmark           | 15         | Sevalla           |
| Tempo di risposta (W) nel benchmark              | ~34 ms     | L/λ = 15/440      |
| Memoria per worker PHP-FPM                       | ~40 MB     | Valore tipico     |

#### Passo 1: Stima di T_cpu e T_io

Nel benchmark **Sevalla**, il database gira su localhost (latenza <0,1 ms).
Con ~10 query SQL per endpoint, l'I/O totale e' inferiore a 1 ms.

Dato che:
- Throughput: λ ≈ 440 req/s
- Numero di richieste servite contemporaneamente (worker PHP-FPM): L = 15
- Database su localhost, quindi T_io ≈ 0

Per la Legge di Little:

$$
W = \frac{L}{\lambda} = \frac{15}{440} \approx 0.034 \, \text{s} \approx 34 \, \text{ms}
$$

Poiche' in questo benchmark il database gira su `localhost`
e l'`I/O` totale e' inferiore a 1 ms,
il tempo medio di risposta risultante riflette quasi interamente
il tempo di elaborazione `CPU` per richiesta:

$$
T_{cpu} \approx W \approx 34 \, \text{ms}
$$

Questo significa che in condizioni `localhost`, quasi tutto il tempo di risposta (~34 ms) e' `CPU`:
framework, `middleware`, `ORM`, serializzazione.


Spostiamo lo stesso endpoint in un **ambiente cloud** con 20 query `SQL`:

$$
T_{cpu} = 34 \text{ ms (framework + logica)}
$$

$$
T_{io} = 20 \times 4 \text{ ms} = 80 \text{ ms (tempo di attesa DB)}
$$

$$
W = T_{cpu} + T_{io} = 114 \text{ ms}
$$

Coefficiente di blocco:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{34} \approx 2.4
$$

#### Passo 2: PHP-FPM

Nel modello `PHP-FPM`, ogni worker e' un processo OS separato.
Durante l'attesa `I/O`, il worker si blocca e non puo' elaborare altre richieste.

Per utilizzare completamente 8 core, servono abbastanza worker
in modo che in ogni momento, 8 di essi stiano svolgendo lavoro `CPU`:

$$
N_{workers} = 8 \times \left(1 + \frac{80}{34}\right) = 8 \times 3.4 = 27
$$

| Metrica                             | Valore         |
|-------------------------------------|----------------|
| Worker                              | 27             |
| Memoria (27 × 40 MB)               | **1,08 GB**    |
| Throughput (27 / 0,114)             | **237 req/s**  |
| Utilizzo CPU                        | ~100%          |

In pratica, gli amministratori spesso impostano `pm.max_children = 50–100`,
che e' al di sopra dell'ottimo. I worker in eccesso competono per la CPU,
aumentano il numero di context switch del sistema operativo
e consumano memoria senza aumentare il throughput.

#### Passo 3: Coroutine (event loop)

Nel modello a coroutine, un singolo thread (per core) serve
molte richieste. Quando una coroutine attende I/O,
lo scheduler passa a un'altra in ~200 nanosecondi
(vedi [base di evidenza](/it/docs/evidence/coroutines-evidence.html)).

Il numero ottimale di coroutine e' lo stesso:

$$
N_{coroutines} = 8 \times 3.4 = 27
$$

| Metrica                 | Valore         |
|-------------------------|----------------|
| Coroutine               | 27             |
| Memoria (27 × ~2 MiB)  | **54 MiB**     |
| Throughput              | **237 req/s**  |
| Utilizzo CPU            | ~100%          |

Il throughput e' **lo stesso** — perche' la CPU e' il collo di bottiglia.
Ma la memoria per la concorrenza: **54 MiB vs 1,08 GB** — una differenza di **~20x**.

> **Sulla dimensione dello stack delle coroutine.**
> L'impronta di memoria di una coroutine in PHP e' determinata dalla dimensione dello stack C riservato.
> Per impostazione predefinita e' ~2 MiB, ma puo' essere ridotto a 128 KiB.
> Con uno stack di 128 KiB, la memoria per 27 coroutine sarebbe solo ~3,4 MiB.

#### Passo 4: E se il carico CPU fosse inferiore?

Il framework `Laravel` in modalita' `FPM` spende ~34 ms di `CPU` per richiesta,
che include la re-inizializzazione dei servizi ad ogni richiesta.

In un runtime stateful (che `True Async` e'), questi costi sono significativamente ridotti:
le rotte sono compilate, il container delle dipendenze e' inizializzato,
i pool di connessioni sono riutilizzati.

Se `T_cpu` scende da 34 ms a 5 ms (realistico per la modalita' stateful),
il quadro cambia drasticamente:

| T_cpu | Coeff. blocco | N (8 core) | λ (req/s) | Memoria (FPM) | Memoria (coroutine) |
|-------|---------------|------------|-----------|---------------|---------------------|
| 34 ms | 2,4           | 27         | 237       | 1,08 GB       | 54 MiB              |
| 10 ms | 8             | 72         | 800       | 2,88 GB       | 144 MiB             |
| 5 ms  | 16            | 136        | 1 600     | 5,44 GB       | 272 MiB             |
| 1 ms  | 80            | 648        | 8 000     | **25,9 GB**   | **1,27 GiB**        |

Con `T_cpu = 1 ms` (handler leggero, overhead minimo):
- PHP-FPM richiederebbe **648 processi e 25,9 GB di RAM** — irrealistico
- Le coroutine richiedono gli stessi 648 task e **1,27 GiB** — **~20x in meno**

#### Passo 5: Legge di Little — verifica attraverso il throughput

Verifichiamo il risultato per `T_cpu = 5 ms`:

$$
\lambda = \frac{L}{W} = \frac{136}{0.085} = 1\,600 \text{ req/s}
$$

Per raggiungere lo stesso throughput, PHP-FPM necessita di 136 worker.
Ciascuno occupa ~40 MB:

$$
136 \times 40 \text{ MB} = 5,44 \text{ GB solo per i worker}
$$

Coroutine:

$$
136 \times 2 \text{ MiB} = 272 \text{ MiB}
$$

I ~5,2 GB liberati possono essere destinati a cache,
pool di connessioni DB o gestione di piu' richieste.

#### Riepilogo: quando le coroutine forniscono un beneficio

| Condizione                                       | Beneficio dalle coroutine                                                |
|--------------------------------------------------|--------------------------------------------------------------------------|
| Framework pesante, DB localhost (T_io ≈ 0)       | Minimo — il carico di lavoro e' CPU-bound                                |
| Framework pesante, DB cloud (T_io = 80 ms)       | Moderato — ~20x risparmio di memoria a parita' di throughput             |
| Handler leggero, DB cloud                        | **Massimo** — aumento del throughput fino a 13x, ~20x risparmio memoria |
| Microservizio / API Gateway                      | **Massimo** — quasi puro I/O, decine di migliaia di req/s su un server  |

**Conclusione:** maggiore e' la quota di I/O nel tempo totale della richiesta e piu' leggera e' l'elaborazione CPU,
maggiore e' il beneficio dalle coroutine.
Per le applicazioni IO-bound (che sono la maggioranza dei servizi web moderni),
le coroutine permettono di utilizzare la stessa CPU in modo molto piu' efficiente,
consumando ordini di grandezza meno memoria.

### Note pratiche

- Aumentare il numero di coroutine oltre il livello ottimale raramente fornisce un beneficio,
  ma non e' nemmeno un problema: le coroutine sono leggere, e l'overhead delle coroutine
  "in eccesso" e' incomparabilmente piccolo rispetto al costo dei thread del sistema operativo
- Le limitazioni reali diventano:
    - pool di connessioni al database
    - latenza di rete
    - meccanismi di back-pressure
    - limiti dei descrittori di file aperti (ulimit)
- Per questi carichi di lavoro, il modello *event loop + coroutine* si dimostra
  significativamente piu' efficiente del classico modello bloccante

### Conclusione

Per una tipica applicazione web moderna
in cui predominano le operazioni I/O,
il modello di esecuzione asincrono consente di:
- nascondere efficacemente la latenza I/O
- migliorare significativamente l'utilizzo della CPU
- ridurre la necessita' di un gran numero di thread

E' precisamente in questi scenari che i vantaggi dell'asincronia
sono dimostrati nel modo piu' evidente.

---

### Approfondimenti

- [Swoole in pratica: misurazioni reali](/it/docs/evidence/swoole-evidence.html) — casi di produzione (Appwrite +91%, IdleMMO 35M req/giorno), benchmark indipendenti con e senza DB, TechEmpower
- [Python asyncio in pratica](/it/docs/evidence/python-evidence.html) — Duolingo +40%, Super.com −90% costi, benchmark uvloop, contro-argomenti
- [Base di evidenza: perche' le coroutine single-threaded funzionano](/it/docs/evidence/coroutines-evidence.html) — misurazioni del costo del context switch, confronto con i thread del sistema operativo, ricerca accademica e benchmark industriali

---

### Riferimenti e letteratura

- Brian Goetz, *Java Concurrency in Practice* (2006) — formula per la dimensione ottimale del pool di thread: `N = cores × (1 + W/S)`
- [Zalando Engineering: How to set an ideal thread pool size](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html) — applicazione pratica della formula di Goetz con esempi e derivazione tramite la Legge di Little
- [Backendhance: The Optimal Thread-Pool Size in Java](https://backendhance.com/en/blog/2023/optimal-thread-pool-size/) — analisi dettagliata della formula tenendo conto dell'utilizzo target della CPU
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — misurazioni dell'impatto della latenza di rete sulle prestazioni di PostgreSQL
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — linee guida per le latenze accettabili delle query SQL nelle applicazioni web
