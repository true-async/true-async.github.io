---
layout: docs
lang: ru
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /ru/docs/evidence/coroutines-evidence.html
page_title: "Почему корутины работают"
description: "Эмпирическая база: измерения стоимости переключения, сравнение памяти, проблема C10K, академические исследования."
---

# Эмпирическая база: почему корутины в одном потоке работают

Утверждение о том, что однопоточная кооперативная конкурентность эффективна
для IO-bound нагрузок, подтверждается измерениями, академическими исследованиями
и опытом эксплуатации крупных систем.

---

## 1. Стоимость переключения: корутина vs поток ОС

Главное преимущество корутин — кооперативное переключение происходит
в пользовательском пространстве, без обращения к ядру ОС.

### Измерения на Linux

| Метрика                | Поток ОС (Linux NPTL)                   | Корутина / async-задача            |
|------------------------|-----------------------------------------|------------------------------------|
| Переключение контекста | 1.2–1.5 µs (pinned), ~2.2 µs (unpinned) | ~170 ns (Go), ~200 ns (Rust async) |
| Создание задачи        | ~17 µs                                  | ~0.3 µs                            |
| Память на задачу       | ~9.5 KiB (min), 8 MiB (default stack)   | ~0.4 KiB (Rust), 2–4 KiB (Go)      |
| Масштабируемость       | ~80 000 потоков (тест)                  | 250 000+ async-задач (тест)        |

**Источники:**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  прямые измерения стоимости переключения потоков Linux и сравнение с goroutines
- [Jim Blandy, context-switch (Rust benchmark)](https://github.com/jimblandy/context-switch) —
  async-задача переключается за ~0.2 µs vs ~1.7 µs у потока (**8.5x** быстрее),
  создаётся за 0.3 µs vs 17 µs (**56x** быстрее), занимает 0.4 KiB vs 9.5 KiB (**24x** меньше)

### Что это означает на практике

Переключение корутины стоит **~200 наносекунд** — это на порядок дешевле,
чем переключение потока ОС (~1.5 µs).
Но ещё важнее, что переключение корутины **не вызывает косвенных расходов**:
сброс TLB-кэша, инвалидация branch predictor, миграция между ядрами —
всё это свойственно потокам, но не корутинам в одном потоке.

Для event loop, обрабатывающего 80 корутин на ядро,
суммарные расходы на переключение составляют:

```
80 × 200 ns = 16 µs на полный цикл обхода всех корутин
```

Это ничтожно мало по сравнению с 80 ms ожидания I/O.

---

## 2. Память: масштаб различий

Потоки ОС выделяют стек фиксированного размера (по умолчанию 8 MiB на Linux).
Корутины хранят только своё состояние — локальные переменные и точку возобновления.

| Реализация                    | Память на единицу конкурентности                         |
|-------------------------------|----------------------------------------------------------|
| Поток Linux (default stack)   | 8 MiB виртуальной, ~10 KiB RSS минимум                   |
| Go goroutine                  | 2–4 KiB (динамический стек, растёт по необходимости)     |
| Kotlin coroutine              | десятки байт на heap; соотношение thread:coroutine ≈ 6:1 |
| Rust async task               | ~0.4 KiB                                                 |
| C++ coroutine frame (Pigweed) | 88–408 байт                                              |
| Python asyncio coroutine      | ~2 KiB (vs ~5 KiB + 32 KiB stack для потока)             |

**Источники:**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — соотношение 6:1 по памяти
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — сравнение в Python
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — динамический стек goroutine

### Следствие для веб-серверов

Для 640 конкурентных задач (8 ядер × 80 корутин):

- **Потоки ОС**: 640 × 8 MiB = 5 GiB виртуальной памяти
  (реально меньше благодаря lazy allocation, но давление на планировщик ОС значительное)
- **Корутины**: 640 × 4 KiB = 2.5 MiB
  (разница — **три порядка**)

---

## 3. Проблема C10K и реальные серверы

### Проблема

В 1999 году Дэн Кегел сформулировал
[проблему C10K](https://www.kegel.com/c10k.html):
серверы с моделью «один поток на соединение» не способны обслужить
10 000 одновременных подключений.
Причина не в аппаратных ограничениях, а в overhead потоков ОС.

### Решение

Проблема была решена переходом к event-driven архитектуре:
вместо создания потока на каждое соединение,
один цикл событий (event loop) обслуживает тысячи соединений в одном потоке.

Именно этот подход реализуют **nginx**, **Node.js**, **libuv**, и — в контексте PHP — **True Async**.

### Бенчмарки: nginx (event-driven) vs Apache (thread-per-request)

| Метрика (1000 concurrent connections) | nginx        | Apache                         |
|---------------------------------------|--------------|--------------------------------|
| Запросов в секунду (статика)          | 2 500–3 000  | 800–1 200                      |
| HTTP/2 throughput                     | >6 000 req/s | ~826 req/s                     |
| Стабильность под нагрузкой            | Стабилен     | Деградация при >150 соединений |

nginx обслуживает **в 2–4 раза** больше запросов, чем Apache,
при этом потребляя значительно меньше памяти.
Apache с thread-per-request архитектурой принимает не более 150 соединений одновременно
(по умолчанию), после чего новые клиенты ждут в очереди.

**Источники:**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — постановка проблемы
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — бенчмарки
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — промышленный опыт

---

## 4. Академические исследования

### SEDA: Staged Event-Driven Architecture (Welsh et al., 2001)

Мэтт Уэлш, Дэвид Каллер и Эрик Брюер из UC Berkeley предложили
SEDA — серверную архитектуру, основанную на событиях и очередях между стадиями обработки.

**Ключевой результат**: SEDA-сервер на Java превзошёл по пропускной способности
Apache (C, thread-per-connection) при 10 000+ одновременных соединений.
Apache не мог принять более 150 соединений одновременно.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Сравнение архитектур веб-серверов (Pariag et al., 2007)

Наиболее тщательное сравнение архитектур провели Pariag et al.
из University of Waterloo. Они сравнили три сервера на одной кодовой базе:

- **µserver** — event-driven (SYMPED, один процесс)
- **Knot** — thread-per-connection (библиотека Capriccio)
- **WatPipe** — гибрид (pipeline, аналог SEDA)

**Ключевой результат**: event-driven µserver и pipeline-based WatPipe
обеспечили **на ~18% больше пропускной способности**, чем thread-based Knot.
При этом WatPipe потребовал 25 writer-потоков для достижения той же производительности,
что и µserver с 10 процессами.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream: ускорение обработки событий с помощью корутин (2022)

Исследование, опубликованное на arXiv, провело прямое сравнение
корутин и потоков для обработки потоковых данных (event-based processing).

**Ключевой результат**: корутины обеспечили **минимум 2x пропускной способности**
по сравнению с конвенциональными потоками при обработке потока событий.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. Масштабируемость: 100 000 задач

### Kotlin: 100 000 корутин за 100 ms

В бенчмарке [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
создание и запуск 100 000 корутин заняло ~100 ms overhead.
Эквивалентное количество потоков потребовало бы ~1.7 секунды только на создание
(100 000 × 17 µs) и ~950 MiB памяти на стеки.

### Rust: 250 000 async-задач

В [бенчмарке context-switch](https://github.com/jimblandy/context-switch)
удалось запустить 250 000 async-задач в одном процессе,
в то время как потоки ОС достигли предела на ~80 000.

### Go: миллионы goroutines

Go рутинно запускает сотни тысяч и миллионы горутин в production-системах.
Именно это позволяет серверам вроде Caddy, Traefik и CockroachDB
обрабатывать десятки тысяч одновременных соединений.

---

## 6. Сводка доказательной базы

| Утверждение                                         | Подтверждение                                              |
|-----------------------------------------------------|------------------------------------------------------------|
| Переключение корутин дешевле потоков                | ~200 ns vs ~1500 ns — **7–8x** (Bendersky 2018, Blandy)    |
| Корутины расходуют меньше памяти                    | 0.4–4 KiB vs 9.5 KiB–8 MiB — **24x+** (Blandy, Go FAQ)     |
| Event-driven сервер масштабируется лучше            | nginx 2–4x throughput vs Apache (бенчмарки)                |
| Event-driven > thread-per-connection (академически) | +18% throughput (Pariag 2007), C10K решена (Kegel 1999)    |
| Корутины > потоки для event processing              | 2x throughput (AEStream 2022)                              |
| Сотни тысяч корутин в одном процессе                | 250K async tasks (Rust), 100K coroutines за 100ms (Kotlin) |
| Формула N ≈ 1 + T_io/T_cpu корректна                | Goetz 2006, Zalando, Little's Law                          |

---

## Ссылки

### Измерения и бенчмарки
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### Академические работы
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### Промышленный опыт
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### См. также
- [Python asyncio на практике](/ru/docs/evidence/python-evidence.html) — production-кейсы (Duolingo, Super.com, Instagram), бенчмарки uvloop, контр-аргументы Cal Paterson
- [Swoole на практике](/ru/docs/evidence/swoole-evidence.html) — production-кейсы и бенчмарки PHP-корутин
