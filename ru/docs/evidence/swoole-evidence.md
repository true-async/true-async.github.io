---
layout: docs
lang: ru
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /ru/docs/evidence/swoole-evidence.html
page_title: "Swoole на практике"
description: "Swoole на практике: production-кейсы Appwrite и IdleMMO, независимые бенчмарки, TechEmpower, сравнение с PHP-FPM."
---

# Swoole на практике: реальные замеры

Swoole — PHP-расширение на C, предоставляющее event loop, корутины
и асинхронный I/O. Это единственная зрелая реализация корутинной модели
в PHP-экосистеме с многолетним production-опытом.

Ниже собраны реальные измерения: production-кейсы, независимые бенчмарки
и данные TechEmpower.

### Два источника выигрыша

Переход с PHP-FPM на Swoole даёт **два независимых** преимущества:

1. **Stateful-рантайм** — приложение загружается один раз и живёт в памяти.
   Исчезает overhead повторной инициализации (autoload, DI-контейнер, конфигурация)
   при каждом запросе. Этот эффект даёт выигрыш даже без I/O.

2. **Корутинная конкурентность** — пока одна корутина ждёт ответа от БД или внешнего API,
   другие обрабатывают запросы на том же ядре. Этот эффект проявляется
   **только при наличии I/O** и требует использования асинхронных клиентов
   (корутинный MySQL, Redis, HTTP-клиент).

Большинство публичных бенчмарков **не разделяют** эти два эффекта.
Тесты без БД (Hello World, JSON) измеряют только stateful-эффект.
Тесты с БД измеряют **сумму обоих**, но не позволяют изолировать вклад корутин.

В каждом разделе ниже указано, какой эффект преобладает.

---

## 1. Production: Appwrite — миграция с FPM на Swoole (+91%)

> **Что измеряется:** stateful-рантайм **+** корутинная конкурентность.
> Appwrite — I/O-прокси с минимальной CPU-работой. Выигрыш складывается
> из обоих факторов, но изолировать вклад корутин из публичных данных нельзя.

[Appwrite](https://appwrite.io/) — open-source Backend-as-a-Service (BaaS),
написанный на PHP. Appwrite предоставляет готовый серверный API
для типовых задач мобильных и веб-приложений:
аутентификация пользователей, управление базой данных,
хранение файлов, облачные функции, push-уведомления.

По своей природе Appwrite — это **чистый I/O-прокси**:
почти каждый входящий HTTP-запрос транслируется в одну или несколько
операций ввода-вывода (запрос к MariaDB, обращение к Redis,
чтение/запись файлов), а собственных CPU-вычислений минимум.
Именно такой профиль нагрузки извлекает максимальную выгоду
из перехода на корутины: пока одна корутина ждёт ответа от БД,
другие обрабатывают новые запросы на том же ядре.

В версии 0.7 команда заменила Nginx + PHP-FPM на Swoole.

**Условия теста:**
500 конкурентных клиентов, 5 минут нагрузки (k6).
Все запросы к эндпоинтам с авторизацией и abuse-контролем.

| Метрика                      | FPM (v0.6.2) | Swoole (v0.7) | Изменение     |
|------------------------------|--------------|---------------|---------------|
| Запросов в секунду           | 436          | 808           | **+85%**      |
| Всего запросов за 5 мин      | 131 117      | 242 336       | **+85%**      |
| Время ответа (норма)         | 3.77 ms      | 1.61 ms       | **−57%**      |
| Время ответа (под нагрузкой) | 550 ms       | 297 ms        | **−46%**      |
| Успешность запросов          | 98%          | 100%          | Нет таймаутов |

Итоговое улучшение, заявленное командой: **~91%** по совокупности метрик.

**Источник:** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)

---

## 2. Production: IdleMMO — 35 миллионов запросов в день на одном сервере

> **Что измеряется:** преимущественно **stateful-рантайм**.
> Laravel Octane запускает Swoole в режиме «один запрос — один воркер»,
> без корутинного мультиплексирования I/O внутри запроса.
> Прирост обусловлен тем, что Laravel не перезагружается при каждом запросе.

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane) —
PHP-приложение (Laravel Octane + Swoole), MMORPG с 160 000+ пользователями.

| Метрика                    | Значение                          |
|----------------------------|-----------------------------------|
| Запросов в день            | 35 000 000 (~405 req/s в среднем) |
| Потенциал (оценка автора)  | 50 000 000+ req/day               |
| Сервер                     | 1 × 32 vCPU                       |
| Swoole workers             | 64 (4 на ядро)                    |
| p95 latency до оптимизации | 394 ms                            |
| p95 latency после Octane   | **172 ms (−56%)**                 |

Автор отмечает, что для менее CPU-интенсивных приложений (не MMORPG)
тот же сервер мог бы обрабатывать **значительно больше** запросов.

**Источник:** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

---

## 3. Бенчмарк: PHP-FPM vs Swoole (BytePursuits)

> **Что измеряется:** только **stateful-рантайм**.
> Тест возвращает JSON без обращения к БД или внешним сервисам.
> Корутинная конкурентность здесь не задействована — нет I/O, которое можно
> было бы выполнять параллельно. Разница в 2.6–3x обусловлена исключительно
> тем, что Swoole не пересоздаёт приложение при каждом запросе.

Независимый бенчмарк на Mezzio-микрофреймворке (JSON-ответ, без БД).
Intel i7-6700T (4 ядра / 8 потоков), 32 GB RAM, wrk, 10 секунд.

| Конкурентность | PHP-FPM (req/s) | Swoole BASE (req/s) | Разница  |
|----------------|-----------------|---------------------|----------|
| 100            | 3 472           | 9 090               | **2.6x** |
| 500            | 3 218           | 9 159               | **2.8x** |
| 1 000          | 3 065           | 9 205               | **3.0x** |

Средняя задержка при 1000 concurrent:
- FPM: **191 ms**
- Swoole: **106 ms**

**Критический момент:** начиная с 500 concurrent connections
PHP-FPM начал терять запросы (73 793 socket errors при 500, 176 652 при 700).
У Swoole — **ноль ошибок** на всех уровнях конкурентности.

**Источник:** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

---

## 4. Бенчмарк: с базой данных (kenashkov)

> **Что измеряется:** набор тестов с **разными** эффектами.
> - Hello World, Autoload — чистый **stateful-рантайм** (нет I/O).
> - SQL-запрос, реальный сценарий — **stateful + корутины**.
>   Swoole использует корутинный MySQL-клиент, что позволяет обслуживать
>   другие запросы во время ожидания ответа от БД.

Более реалистичный набор тестов: Swoole 4.4.10 vs Apache + mod_php.
ApacheBench, 100–1000 concurrent, 10 000 запросов.

| Сценарий                             | Apache (100 conc.) | Swoole (100 conc.) | Разница  |
|--------------------------------------|--------------------|--------------------|----------|
| Hello World                          | 25 706 req/s       | 66 309 req/s       | **2.6x** |
| Autoload 100 классов                 | 2 074 req/s        | 53 626 req/s       | **25x**  |
| SQL-запрос к БД                      | 2 327 req/s        | 4 163 req/s        | **1.8x** |
| Реальный сценарий (кэш + файлы + БД) | 141 req/s          | 286 req/s          | **2.0x** |

При 1000 concurrent:
- Apache **падал** (connection limit, failed requests)
- Swoole — **ноль ошибок** во всех тестах

**Ключевое наблюдение:** с реальным I/O (БД + файлы) разница
сокращается с 25x до **1.8–2x**. Это ожидаемо:
база данных становится общим узким местом.
Но стабильность под нагрузкой остаётся несопоставимой.

**Источник:** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

---

## 5. Бенчмарк: Symfony 7 — все рантаймы (2024)

> **Что измеряется:** только **stateful-рантайм**.
> Тест без БД — корутины не задействованы.
> Разница >10x при 1000 concurrent объясняется тем, что FPM создаёт
> по процессу на каждый запрос, а Swoole и FrankenPHP держат приложение
> в памяти и обслуживают соединения через event loop.

Тест 9 PHP-рантаймов с Symfony 7 (k6, Docker, 1 CPU / 1 GB RAM, без БД).

| Рантайм                          | vs Nginx + PHP-FPM (при 1000 conc.) |
|----------------------------------|-------------------------------------|
| Apache + mod_php                 | ~0.5x (медленнее)                   |
| Nginx + PHP-FPM                  | 1x (baseline)                       |
| Nginx Unit                       | ~3x                                 |
| RoadRunner                       | >2x                                 |
| **Swoole / FrankenPHP (worker)** | **>10x**                            |

При 1000 concurrent connections Swoole и FrankenPHP в worker-режиме
показали **на порядок выше пропускную способность**,
чем классический Nginx + PHP-FPM.

**Источник:** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

---

## 6. TechEmpower: Swoole — первое место среди PHP

> **Что измеряется:** **stateful + корутины** (в тестах с БД).
> TechEmpower включает как JSON-тест (stateful), так и тесты с множественными
> SQL-запросами (multiple queries, Fortunes), где корутинный доступ к БД
> даёт реальное преимущество. Это один из немногих бенчмарков,
> где эффект корутин проявляется наиболее явно.

В [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
(Round 22, 2023) Swoole занял **первое место** среди всех PHP-фреймворков
в тесте с MySQL.

TechEmpower тестирует реальные сценарии: JSON-сериализацию,
одиночные запросы к БД, множественные запросы, ORM, Fortunes
(шаблонизация + БД + сортировка + экранирование).

**Источник:** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

---

## 7. Hyperf: 96 000 req/s на Swoole-фреймворке

> **Что измеряется:** **stateful-рантайм** (бенчмарк — Hello World).
> Hyperf полностью построен на корутинах Swoole, и в production
> корутинная конкурентность задействована при обращениях к БД, Redis,
> gRPC. Но цифра 96K req/s получена на Hello World без I/O,
> то есть отражает эффект stateful-рантайма.

[Hyperf](https://hyperf.dev/) — корутинный PHP-фреймворк, построенный на Swoole.
В бенчмарке (4 потока, 100 соединений):

- **96 563 req/s**
- Латентность: 7.66 ms

Hyperf позиционируется для микросервисов и заявляет
**5–10x** преимущество над традиционными PHP-фреймворками.

**Источник:** [Hyperf GitHub](https://github.com/hyperf/hyperf)

---

## Сводка: что показывают реальные данные

| Тип теста                        | FPM → Swoole                    | Основной эффект     | Примечание                                   |
|----------------------------------|---------------------------------|---------------------|----------------------------------------------|
| Hello World / JSON               | **2.6–3x**                      | Stateful            | BytePursuits, kenashkov                      |
| Autoload (stateful vs stateless) | **25x**                         | Stateful            | Нет I/O — чистый эффект сохранения состояния |
| С базой данных                   | **1.8–2x**                      | Stateful + корутины | kenashkov (корутинный MySQL)                 |
| Production API (Appwrite)        | **+91%** (1.85x)                | Stateful + корутины | I/O-прокси, оба фактора                      |
| Production (IdleMMO)             | p95: **−56%**                   | Stateful            | Octane workers, не корутины                  |
| Высокая конкурентность (1000+)   | **Swoole стабилен, FPM падает** | Event loop          | Все бенчмарки                                |
| Symfony рантаймы (1000 conc.)    | **>10x**                        | Stateful            | Нет БД в тесте                               |
| TechEmpower (DB tests)           | **#1 среди PHP**                | Stateful + корутины | Множественные SQL-запросы                    |

---

## Связь с теорией

Результаты хорошо согласуются с расчётами из [Эффективность IO-bound задач](/ru/docs/evidence/concurrency-efficiency.html):

**1. С базой данных разница скромнее (1.8–2x), чем без неё (3–10x).**
Это подтверждает: при реальном I/O узким местом становится сама БД,
а не модель конкурентности. Blocking coefficient в тестах с БД ниже,
потому что CPU-работа фреймворка сопоставима с временем I/O.

**2. При высокой конкурентности (500–1000+) FPM деградирует, Swoole — нет.**
PHP-FPM ограничен числом воркеров. Каждый воркер — процесс ОС (~40 MB).
При 500+ concurrent connections FPM достигает лимита
и начинает терять запросы. Swoole обслуживает тысячи соединений
в десятках корутин без роста потребления памяти.

**3. Stateful-рантайм убирает overhead повторной инициализации.**
Разница в 25x на autoload-тесте демонстрирует стоимость
пересоздания состояния приложения при каждом запросе в FPM.
В production это проявляется как разница между T_cpu = 34 ms (FPM)
и T_cpu = 5–10 ms (stateful), что радикально меняет blocking coefficient
и, следовательно, выигрыш от корутин
(см. [таблицу в Эффективность IO-bound задач](/ru/docs/evidence/concurrency-efficiency.html)).

**4. Формула подтверждается.**
Appwrite: FPM 436 req/s → Swoole 808 req/s (1.85x).
Если T_cpu снизился с ~30 ms до ~15 ms (stateful),
а T_io осталось ~30 ms, то blocking coefficient вырос с 1.0 до 2.0,
что предсказывает рост throughput примерно в 1.5–2x. Совпадает.

---

## Ссылки

### Production-кейсы
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### Независимые бенчмарки
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark — Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### Фреймворки и рантаймы
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf — корутинный PHP-фреймворк](https://github.com/hyperf/hyperf)
- [OpenSwoole benchmark](https://openswoole.com/benchmark)
- [Swoole source (GitHub)](https://github.com/swoole/swoole-src)
