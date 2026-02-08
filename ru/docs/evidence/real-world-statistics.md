---
layout: docs
lang: ru
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /ru/docs/evidence/real-world-statistics.html
page_title: "Статистика конкурентности"
description: "Реальные статистические данные для расчёта конкурентности: SQL-запросы, задержки БД, пропускная способность PHP-фреймворков."
---

# Статистические данные для расчёта конкурентности

Формулы из раздела [Эффективность IO-bound задач](/ru/docs/evidence/concurrency-efficiency.html) оперируют
несколькими ключевыми величинами. Ниже собраны реальные измерения,
позволяющие подставить в формулы конкретные числа.

---

## Элементы формул

Закон Литтла:

$$
L = \lambda \cdot W
$$

- `L` — необходимый уровень конкурентности (сколько задач одновременно)
- `λ` — пропускная способность (запросов в секунду)
- `W` — среднее время обработки одного запроса

Формула Гёца:

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — время ожидания I/O на один запрос
- `T_cpu` — время CPU-вычислений на один запрос

Для практического расчёта нужно знать:

1. **Сколько SQL-запросов выполняется на один HTTP-запрос**
2. **Сколько времени занимает один SQL-запрос (I/O)**
3. **Сколько времени занимает обработка на CPU**
4. **Какова пропускная способность сервера**
5. **Каково общее время ответа**

---

## 1. SQL-запросов на один HTTP-запрос

Количество обращений к БД зависит от фреймворка, ORM и сложности страницы.

| Приложение / фреймворк               | Запросов на страницу   | Источник                                                                                                         |
|--------------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (без плагинов)             | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, средняя страница) | <30 (порог профайлера) | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                         |
| Laravel (простой CRUD)               | 5–15                   | Типичные значения из Laravel Debugbar                                                                            |
| Laravel (с N+1 проблемой)            | 20–50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (без кэша)                    | 80–100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (каталог)                    | 50–200+                | Характерно для сложных e-commerce                                                                                |

**Медиана для типичного ORM-приложения: 15–30 запросов на HTTP-запрос.**

Symfony использует порог в 30 запросов как границу «нормы» — при превышении
иконка профайлера становится жёлтой.

## 2. Время одного SQL-запроса (T_io на запрос)

### Время выполнения запроса на сервере БД

Данные Percona из бенчмарков sysbench OLTP (MySQL):

| Конкурентность   | Доля запросов <0.1 ms | 0.1–1 ms | 1–10 ms | >10 ms |
|------------------|-----------------------|----------|---------|--------|
| 1 поток          | 86%                   | 10%      | 3%      | 1%     |
| 32 потока        | 68%                   | 30%      | 2%      | <1%    |
| 128 потоков      | 52%                   | 35%      | 12%     | 1%     |

LinkBench (Percona, приближённый к реальной нагрузке Facebook):

| Операция    | p50    | p95   | p99    |
|-------------|--------|-------|--------|
| GET_NODE    | 0.4 ms | 39 ms | 77 ms  |
| UPDATE_NODE | 0.7 ms | 47 ms | 100 ms |

**Источник:** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### Сетевая задержка (round-trip)

| Сценарий                | Round-trip | Источник |
|-------------------------|------------|---|
| Unix-socket / localhost | <0.1 ms    | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, один дата-центр    | ~0.5 ms    | CYBERTEC PostgreSQL |
| Облако, cross-AZ        | 1–5 ms     | CYBERTEC PostgreSQL |
| Cross-region            | 10–50 ms   | Типичные значения |

### Итого: полное время одного SQL-запроса

Полное время = время выполнения на сервере + сетевой round-trip.

| Окружение         | Простой SELECT (p50) | Средний запрос (p50) |
|-------------------|----------------------|----------------------|
| Localhost         | 0.1–0.5 ms           | 0.5–2 ms             |
| LAN (один ДЦ)     | 0.5–1.5 ms           | 1–4 ms               |
| Облако (cross-AZ) | 2–6 ms               | 3–10 ms              |

Для облачного окружения **4 ms на средний запрос** — обоснованная оценка.

## 3. Время CPU на один SQL-запрос (T_cpu на запрос)

Время CPU покрывает: разбор результата, гидрацию ORM-сущностей,
маппинг в объекты, сериализацию.

Прямых бенчмарков именно этой величины в публичном доступе мало,
но можно оценить из данных профайлеров:

- Blackfire.io разделяет wall time на **I/O time** и **CPU time**
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- В типичных PHP-приложениях база данных — основной bottleneck,
  а CPU-время составляет малую долю от wall time
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**Косвенная оценка через пропускную способность:**

Symfony с Doctrine (DB + Twig rendering) обрабатывает ~1000 req/s
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
Это значит, что CPU-время на один запрос ≈ 1 ms.
При ~20 SQL-запросах на страницу → **~0.05 ms CPU на один SQL-запрос**.

Laravel API endpoint (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
CPU-время на запрос ≈ 2.3 ms. При ~15 запросах → **~0.15 ms CPU на SQL-запрос**.

## 4. Пропускная способность (λ) PHP-приложений

Бенчмарки проведены на 30 vCPU / 120 GB RAM, nginx + PHP-FPM,
15 конкурентных соединений ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)):

| Приложение | Тип страницы           | req/s (PHP 8.4) |
|------------|------------------------|-----------------|
| Laravel    | Welcome (без БД)       | ~700            |
| Laravel    | API + Eloquent + Auth  | ~440            |
| Symfony    | Doctrine + Twig        | ~1 000          |
| WordPress  | Главная (без плагинов) | ~148            |
| Drupal 10  | —                      | ~1 400          |

Обратите внимание: WordPress значительно медленнее,
потому что каждый запрос тяжелее (больше SQL-запросов, сложнее рендеринг).

---

## 5. Общее время ответа (W) в production

Данные LittleData (2023, 2 800 e-commerce сайтов):

| Платформа               | Среднее время ответа сервера |
|-------------------------|------------------------------|
| Shopify                 | 380 ms                       |
| Среднее по e-commerce   | 450 ms                       |
| WooCommerce (WordPress) | 780 ms                       |
| Magento                 | 820 ms                       |

**Источник:** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

Индустриальные ориентиры:

| Категория           | Время ответа API |
|---------------------|------------------|
| Отлично             | 100–300 ms       |
| Приемлемо           | 300–600 ms       |
| Требует оптимизации | >600 ms          |

## Практический расчёт по закону Литтла

### Сценарий 1: Laravel API в облаке

**Исходные данные:**
- λ = 440 req/s (целевая пропускная способность)
- W = 80 ms (из расчёта: 20 SQL × 4 ms I/O + 1 ms CPU)
- Ядер: 8

**Расчёт:**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ конкурентных задач}
$$

На 8 ядрах это ~4.4 задачи на ядро. Совпадает с тем, что Laravel при 15 конкурентных
PHP-FPM воркерах уже достигает 440 req/s. Запас есть.

### Сценарий 2: Laravel API в облаке, 2000 req/s (target)

**Исходные данные:**
- λ = 2000 req/s (целевая пропускная способность)
- W = 80 ms
- Ядер: 8

**Расчёт:**

$$
L = 2000 \times 0.080 = 160 \text{ конкурентных задач}
$$

PHP-FPM не потянет 160 воркеров на 8 ядрах — каждый воркер это отдельный процесс
с ~30–50 MB памяти. Итого: ~6–8 GB только на воркеры.

С корутинами: 160 задач × ~4 KiB ≈ **640 KiB**. Разница — **четыре порядка**.

### Сценарий 3: по формуле Гёца

**Исходные данные:**
- T_io = 80 ms (20 запросов × 4 ms)
- T_cpu = 1 ms
- Ядер: 8

**Расчёт:**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ корутин}
$$

**Пропускная способность** (через закон Литтла):

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

Это теоретический потолок при полной утилизации 8 ядер.
На практике он будет ниже из-за overhead планировщика, GC, пула соединений.
Но даже 50% от этого значения (4 000 req/s) —
**на порядок больше**, чем 440 req/s у PHP-FPM на тех же 8 ядрах.

## Сводка: откуда взялись числа

| Величина                          | Значение         | Откуда                                   |
|-----------------------------------|------------------|------------------------------------------|
| SQL-запросов на HTTP-запрос       | 15–30            | WordPress ~17, Symfony порог <30         |
| Время одного SQL-запроса (облако) | 3–6 ms           | Percona p50 + CYBERTEC round-trip        |
| CPU на один SQL-запрос            | 0.05–0.15 ms     | Обратный расчёт из throughput benchmarks |
| Пропускная способность Laravel    | ~440 req/s (API) | Sevalla/Kinsta benchmarks, PHP 8.4       |
| Время ответа e-commerce (среднее) | 450 ms           | LittleData, 2 800 сайтов                 |
| Время ответа API (норма)          | 100–300 ms       | Индустриальный ориентир                  |

---

## Ссылки

### Бенчмарки PHP-фреймворков
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — throughput WordPress, Laravel, Symfony, Drupal
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel welcome + API endpoint

### Бенчмарки баз данных
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — p50/p95/p99 по операциям
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — распределение latency при разной конкурентности
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — сетевые задержки по окружениям
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — пороги <10ms / >100ms

### Время ответа production-систем
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2 800 e-commerce сайтов

### Профилирование PHP
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — разделение wall time на I/O и CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — APM для PHP-приложений
