---
layout: docs
lang: uk
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /uk/docs/evidence/real-world-statistics.html
page_title: "Статистика конкурентності"
description: "Реальні статистичні дані для розрахунку конкурентності: SQL-запити, затримки БД, пропускна здатність PHP-фреймворків."
---

# Статистичні дані для розрахунку конкурентності

Формули з розділу [Ефективність IO-bound задач](/uk/docs/evidence/concurrency-efficiency.html) оперують
кількома ключовими величинами. Нижче наведено збірку реальних вимірювань,
що дозволяють підставити конкретні числа у формули.

---

## Елементи формул

Закон Літтла:

$$
L = \lambda \cdot W
$$

- `L` — необхідний рівень конкурентності (скільки задач одночасно)
- `λ` — пропускна здатність (запитів на секунду)
- `W` — середній час обробки одного запиту

Формула Гетца:

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — час очікування I/O на запит
- `T_cpu` — час обчислень CPU на запит

Для практичного розрахунку необхідно знати:

1. **Скільки SQL-запитів виконується на один HTTP-запит**
2. **Скільки часу займає один SQL-запит (I/O)**
3. **Скільки часу займає обробка на CPU**
4. **Яка пропускна здатність сервера**
5. **Який загальний час відповіді**

---

## 1. SQL-запити на HTTP-запит

Кількість звернень до бази даних залежить від фреймворку, ORM та складності сторінки.

| Застосунок / Фреймворк              | Запитів на сторінку    | Джерело                                                                                                          |
|--------------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (без плагінів)             | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, середня сторінка) | <30 (поріг профайлера) | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                         |
| Laravel (простий CRUD)               | 5–15                   | Типові значення з Laravel Debugbar                                                                               |
| Laravel (з проблемою N+1)            | 20–50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (без кешу)                    | 80–100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (каталог)                    | 50–200+                | Типово для складної електронної комерції                                                                          |

**Медіана для типового ORM-застосунку: 15–30 запитів на HTTP-запит.**

Symfony використовує поріг у 30 запитів як межу «нормального» — при перевищенні
іконка профайлера стає жовтою.

## 2. Час одного SQL-запиту (T_io на запит)

### Час виконання запиту на сервері БД

Дані з бенчмарків sysbench OLTP від Percona (MySQL):

| Конкурентність | Частка запитів <0,1 мс | 0,1–1 мс | 1–10 мс | >10 мс |
|----------------|------------------------|-----------|---------|--------|
| 1 потік        | 86%                    | 10%       | 3%      | 1%     |
| 32 потоки      | 68%                    | 30%       | 2%      | <1%    |
| 128 потоків    | 52%                    | 35%       | 12%     | 1%     |

LinkBench (Percona, наближення до реального навантаження Facebook):

| Операція      | p50    | p95   | p99    |
|---------------|--------|-------|--------|
| GET_NODE      | 0,4 мс | 39 мс | 77 мс  |
| UPDATE_NODE   | 0,7 мс | 47 мс | 100 мс |

**Джерело:** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### Мережева затримка (round-trip)

| Сценарій                | Round-trip | Джерело |
|-------------------------|------------|---------|
| Unix-socket / localhost | <0,1 мс   | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, один дата-центр    | ~0,5 мс   | CYBERTEC PostgreSQL |
| Хмара, cross-AZ         | 1–5 мс    | CYBERTEC PostgreSQL |
| Між регіонами           | 10–50 мс  | Типові значення |

### Підсумок: повний час одного SQL-запиту

Повний час = час виконання на сервері + мережевий round-trip.

| Середовище        | Простий SELECT (p50) | Середній запит (p50) |
|-------------------|----------------------|----------------------|
| Localhost         | 0,1–0,5 мс          | 0,5–2 мс            |
| LAN (один ДЦ)    | 0,5–1,5 мс          | 1–4 мс              |
| Хмара (cross-AZ) | 2–6 мс              | 3–10 мс             |

Для хмарного середовища **4 мс на середній запит** — обґрунтована оцінка.

## 3. Час CPU на SQL-запит (T_cpu на запит)

Час CPU охоплює: парсинг результату, гідратацію сутностей ORM,
маппінг об'єктів, серіалізацію.

Прямі бенчмарки саме цього значення рідко зустрічаються у відкритих джерелах,
але його можна оцінити за даними профайлерів:

- Blackfire.io розділяє wall time на **I/O time** та **CPU time**
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- У типових PHP-застосунках база даних є основним вузьким місцем,
  а час CPU становить малу частку wall time
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**Непряма оцінка через пропускну здатність:**

Symfony з Doctrine (БД + рендеринг Twig) обробляє ~1000 req/s
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
Це означає час CPU на запит ≈ 1 мс.
При ~20 SQL-запитах на сторінку → **~0,05 мс CPU на SQL-запит**.

Laravel API endpoint (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
Час CPU на запит ≈ 2,3 мс. При ~15 запитах → **~0,15 мс CPU на SQL-запит**.

## 4. Пропускна здатність (λ) PHP-застосунків

Бенчмарки на 30 vCPU / 120 ГБ RAM, nginx + PHP-FPM,
15 одночасних з'єднань ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)):

| Застосунок | Тип сторінки            | req/s (PHP 8.4) |
|------------|-------------------------|-----------------|
| Laravel    | Welcome (без БД)        | ~700            |
| Laravel    | API + Eloquent + Auth   | ~440            |
| Symfony    | Doctrine + Twig         | ~1 000          |
| WordPress  | Головна (без плагінів)  | ~148            |
| Drupal 10  | —                       | ~1 400          |

Зверніть увагу, що WordPress значно повільніший,
оскільки кожен запит важчий (більше SQL-запитів, складніший рендеринг).

---

## 5. Загальний час відповіді (W) у продакшні

Дані LittleData (2023, 2 800 сайтів електронної комерції):

| Платформа               | Середній час відповіді сервера |
|-------------------------|-------------------------------|
| Shopify                 | 380 мс                        |
| Середнє е-комерція      | 450 мс                        |
| WooCommerce (WordPress) | 780 мс                        |
| Magento                 | 820 мс                        |

**Джерело:** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

Галузеві орієнтири:

| Категорія              | Час відповіді API |
|------------------------|-------------------|
| Відмінно               | 100–300 мс        |
| Прийнятно              | 300–600 мс        |
| Потребує оптимізації    | >600 мс           |

## Практичний розрахунок за законом Літтла

### Сценарій 1: Laravel API у хмарі

**Вхідні дані:**
- λ = 440 req/s (цільова пропускна здатність)
- W = 80 мс (розрахунок: 20 SQL × 4 мс I/O + 1 мс CPU)
- Ядра: 8

**Розрахунок:**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ одночасних задач}
$$

На 8 ядрах це ~4,4 задачі на ядро. Це відповідає тому, що Laravel з 15 одночасними
PHP-FPM воркерами вже досягає 440 req/s. Є запас.

### Сценарій 2: Laravel API у хмарі, 2000 req/s (ціль)

**Вхідні дані:**
- λ = 2000 req/s (цільова пропускна здатність)
- W = 80 мс
- Ядра: 8

**Розрахунок:**

$$
L = 2000 \times 0.080 = 160 \text{ одночасних задач}
$$

PHP-FPM не може обслужити 160 воркерів на 8 ядрах — кожен воркер це окремий процес
з ~30–50 МБ пам'яті. Разом: ~6–8 ГБ лише для воркерів.

З корутинами: 160 задач × ~4 КіБ ≈ **640 КіБ**. Різниця у **чотири порядки**.

### Сценарій 3: за формулою Гетца

**Вхідні дані:**
- T_io = 80 мс (20 запитів × 4 мс)
- T_cpu = 1 мс
- Ядра: 8

**Розрахунок:**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ корутин}
$$

**Пропускна здатність** (за законом Літтла):

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

Це теоретична стеля при повному завантаженні 8 ядер.
На практиці буде менше через накладні витрати планувальника, GC, ліміти пулу з'єднань.
Але навіть 50% від цього значення (4 000 req/s) —
це **на порядок більше**, ніж 440 req/s від PHP-FPM на тих самих 8 ядрах.

## Підсумок: звідки беруться числа

| Величина                           | Значення         | Джерело                                     |
|------------------------------------|------------------|---------------------------------------------|
| SQL-запитів на HTTP-запит          | 15–30            | WordPress ~17, поріг Symfony <30            |
| Час SQL-запиту (хмара)             | 3–6 мс           | Percona p50 + CYBERTEC round-trip           |
| CPU на SQL-запит                   | 0,05–0,15 мс     | Зворотний розрахунок з бенчмарків пропускної здатності |
| Пропускна здатність Laravel        | ~440 req/s (API) | Бенчмарки Sevalla/Kinsta, PHP 8.4           |
| Час відповіді е-комерції (середній)| 450 мс           | LittleData, 2 800 сайтів                   |
| Час відповіді API (норма)          | 100–300 мс       | Галузевий орієнтир                          |

---

## Посилання

### Бенчмарки PHP-фреймворків
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — пропускна здатність для WordPress, Laravel, Symfony, Drupal
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel welcome + API endpoint

### Бенчмарки баз даних
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — p50/p95/p99 на операцію
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — розподіл затримок при різній конкурентності
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — мережеві затримки за середовищем
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — пороги <10мс / >100мс

### Час відповіді продакшн-систем
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2 800 сайтів електронної комерції

### Профілювання PHP
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — розподіл wall time на I/O та CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — APM для PHP-застосунків
