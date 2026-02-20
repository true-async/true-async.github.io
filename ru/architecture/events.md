---
layout: architecture
lang: ru
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /ru/architecture/events.html
page_title: "События и событийная модель"
description: "Базовая структура zend_async_event_t — фундамент всех асинхронных операций, callback-система, флаги, иерархия событий."
---

# События и событийная модель

Событие (`zend_async_event_t`) — это универсальная структура,
от которой наследуют **все** асинхронные примитивы:
корутины, `future`, каналы, таймеры, `poll`-события, сигналы и другие.

Единый интерфейс событий позволяет:
- Подписываться на любое событие через callback
- Комбинировать разнородные события в одном ожидании
- Управлять жизненным циклом через ref-counting

## Базовая структура

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // Смещение к дополнительным данным

    union {
        uint32_t ref_count;          // Для C-объектов
        uint32_t zend_object_offset; // Для Zend-объектов
    };

    uint32_t loop_ref_count;         // Счётчик ссылок event loop

    zend_async_callbacks_vector_t callbacks;

    // Методы
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // Nullable
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // Nullable
    zend_async_event_callbacks_notify_t notify_handler; // Nullable
};
```

### Виртуальные методы события

Каждое событие обладает небольшим набором виртуальных методов.

| Метод            | Назначение                                         |
|------------------|----------------------------------------------------|
| `add_callback`   | Подписать callback на событие                      |
| `del_callback`   | Отписать callback                                  |
| `start`          | Активировать событие в reactor                     |
| `stop`           | Деактивировать событие                             |
| `replay`         | Повторно доставить результат (для future, корутин) |
| `dispose`        | Освободить ресурсы                                 |
| `info`           | Текстовое описание события (для отладки)           |
| `notify_handler` | Хук, вызываемый перед нотификацией callback'ов     |

#### `add_callback`

Добавляет callback в динамический массив `callbacks` события.
Вызывает `zend_async_callbacks_push()`,
которая увеличивает `ref_count` callback'а и добавляет указатель в вектор.

#### `del_callback`

Удаляет callback из вектора (O(1) через swap с последним элементом)
и вызывает `callback->dispose`.

Типичный сценарий: при `select`-ожидании нескольких событий,
когда одно сработало, остальные отписываются через `del_callback`.

#### `start`

Методы `start` и `stop` служат для событий, которые могут быть помещены в `EventLoop`.
Поэтому данный метод реализуют не все примитивы.

Для EventLoop событий, `start` увеличивает значение `loop_ref_count`, что позволяет 
оставаться события в EventLoop до тех пор, пока оно кому-то требуется.

| Тип                                            | Что делает `start`                                                       |
|------------------------------------------------|--------------------------------------------------------------------------|
| Корутина, `Future`, `Channel`, `Pool`, `Scope` | Ничего не делает                                                         |
| Timer                                          | `uv_timer_start()` + увеличивает `loop_ref_count` и `active_event_count` |
| Poll                                           | `uv_poll_start()` с маской событий (READABLE/WRITABLE)                   |
| Signal                                         | Регистрирует событие в глобальной таблице сигналов                       |
| IO                                             | Увеличивает `loop_ref_count` — libuv stream запускается через read/write |

#### `stop`

Зеркальный метод по смыслу `start`. Уменьшает счётчик `loop_ref_count` для событий типа `EventLoop`.
Последний вызов `stop` (когда `loop_ref_count` достигает 0) реально останавливает `handle`.

#### `replay`

Позволяет поздним подписчикам получить результат уже завершённого события.
Реализован только у типов, хранящих результат.

| Тип          | Что возвращает `replay`                          |
|--------------|--------------------------------------------------|
| **Корутина** | `coroutine->result` и/или `coroutine->exception` |
| **Future**   | `future->result` и/или `future->exception`       |

Если передан `callback` — вызывает его синхронно с результатом.
Если передан `result`/`exception` — копирует значения в указатели.
Без `replay` ожидание закрытого события выдаёт предупреждение.

#### `dispose`

Метод делает попытку освободить событие, уменьшая его счётчик `ref_count`.
Если счётчик достигает нуля, вызывается реальное освобождение ресурсов.

#### `info`

Человекочитаемая строка для отладки и логирования.

| Тип                  | Пример строки                                                            |
|----------------------|--------------------------------------------------------------------------|
| **Корутина**         | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` или `"FutureState(pending)"`                  |
| **Iterator**         | `"iterator-completion"`                                                  |


#### `notify_handler`

Хук, перехватывающий нотификацию **до** того, как callback'и получат результат.
По умолчанию `NULL` у всех событий. Используется в `Async\Timeout`:

## Жизненный цикл события

![Жизненный цикл события](/diagrams/ru/architecture-events/lifecycle.svg)

Событие проходит через несколько состояний:
- **Создано** — выделена память, `ref_count = 1`, можно подписывать callback'и
- **Активно** — зарегистрировано в `EventLoop` (`start()`), увеличивает `active_event_count`
- **Сработало** — `libuv` вызвал callback. Для периодических событий (таймер, poll) — возвращается в **Активно**. Для одноразовых (DNS, exec, Future) — переходит в **Закрыто**
- **Остановлено** — временно убрано из `EventLoop` (`stop()`), может быть снова активировано
- **Закрыто** — `flags |= F_CLOSED`, подписка невозможна, при достижении `ref_count = 0` вызывается `dispose`

## Взаимодействие: событие, callback, корутина

![Событие → Callback → Корутина](/diagrams/ru/architecture-events/callback-flow.svg)

## Двойная жизнь: C-объект и Zend-объект

Часто события живут в двух мирах одновременно.
Таймер, `poll`-handle или `DNS`-запрос — это внутренний `C`-объект, которым управляет `Reactor`.
Но корутина или `Future` — ещё и `PHP`-объект, доступный из пользовательского кода.

С-структуры `EventLoop` могут жить дольше, чем `PHP`-объекты, которые на них ссылаются, и наоборот.
C-объекты используют `ref_count`, а `PHP`-объекты — `GC_ADDREF/GC_DELREF`
с участием сборщика мусора. 

Поэтому `TrueAsync` поддерживает несколько типов связей между PHP-объектами и C-объектами.

### C-объект

Внутренние события, невидимые из PHP-кода, используют поле `ref_count`.
Когда последний владелец отпускает ссылку, вызывается `dispose`:

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + dispose при достижении 0
```

### Zend-объект

Корутина — это `PHP`-объект, реализующий интерфейс `Awaitable`.
У них вместо `ref_count` используется поле `zend_object_offset`, 
которое указывает на смещение к структуре `zend_object`.

Макросы `ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` будут работать корректно во всех случаях.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    → is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    → is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

`zend_object` является при этом частью С-структуры события,
и может быть восстановлен с помощью `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT`.

```c
// Из PHP-объекта получить event (с учётом event reference)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// Из event получить PHP-объект
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## Event Reference

У некоторых событий возникает архитектурная проблема: они не могут быть `Zend`-объектами напрямую.

Например, таймер. `PHP GC` может решить собрать объект в любой момент, но `libuv` требует
асинхронного закрытия `handle` через `uv_close()` с callback'ом. Если `GC` вызовет деструктор,
а `libuv` ещё не закончил работу с handle, тогда получим `use-after-free`.

В этом случае используется подход **Event Reference**: `PHP`-объект хранит не само событие, а указатель на него:

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // Указатель на настоящее событие
} zend_async_event_ref_t;
```

При таком подходе время жизни `PHP`-объекта и C-события **независимы**.
`PHP`-объект может быть собран `GC` без ущерба для `handle`,
а `handle` закроется асинхронно, когда будет готов.

Макрос `ZEND_ASYNC_OBJECT_TO_EVENT()` автоматически распознаёт reference
по префиксу `flags` и следует за указателем.

## Callback-система

Подписка на события — это основной механизм взаимодействия между корутинами и внешним миром.
Когда корутина хочет дождаться таймера, данных из сокета или завершения другой корутины,
она регистрирует `callback` на соответствующем событии.

Каждое событие хранит динамический массив подписчиков:

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // Указатель на индекс активного итератора (или NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` решает проблему безопасного удаления callback'ов во время итерации.

### Структура callback'а

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

Callback тоже является ref-counted структурой. Это нужно потому, что на один `callback`
могут ссылаться и вектор события, и `waker` корутины одновременно.
`ref_count` гарантирует, что память освободится, только когда обе стороны отпустят ссылку.

### Callback для корутин

Большинство callback'ов в `TrueAsync` используются с целью разбудить корутину.
Поэтому они хранят информацию о ней и событии, на которое подписались:

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // Наследование
    zend_coroutine_t *coroutine;         // Кого будить
    zend_async_event_t *event;           // Откуда пришло
};
```

Такая связка является основой для механизма [Waker](/ru/architecture/waker.html):

## Флаги событий

Битовые флаги в поле `flags` управляют поведением события на всех этапах жизненного цикла:

| Флаг                  | Назначение                                                                       |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | Событие завершено. `start`/`stop` больше не работают, подписка невозможна        |
| `F_RESULT_USED`       | Кто-то ожидает результат — предупреждение о неиспользованном результате не нужно |
| `F_EXC_CAUGHT`        | Ошибка будет перехвачена — подавить предупреждение о необработанном исключении   |
| `F_ZVAL_RESULT`       | Результат в callback — это указатель на `zval` (а не `void*`)                    |
| `F_ZEND_OBJ`          | Событие является `Zend`-объектом — переключает `ref_count` на `GC_ADDREF`        |
| `F_NO_FREE_MEMORY`    | `dispose` не должен освобождать память (объект аллоцирован не через `emalloc`)   |
| `F_EXCEPTION_HANDLED` | Исключение обработано — повторно выбрасывать не нужно                            |
| `F_REFERENCE`         | Структура является `Event Reference`, а не настоящим событием                    |
| `F_OBJ_REF`           | По смещению `extra_offset` лежит указатель на `zend_object`                      |
| `F_CLOSE_FD`          | При уничтожении закрыть файловый дескриптор                                      |
| `F_HIDDEN`            | Скрытое событие — не участвует в `Deadlock Detection`                            |

### Deadlock Detection

`TrueAsync` отслеживает количество активных событий в `EventLoop` через `active_event_count`.
Когда все корутины приостановлены, а активных событий нет — это `deadlock`:
ни одно событие не сможет разбудить ни одну корутину.

Но некоторые события всегда присутствуют в `EventLoop` и не связаны с пользовательской логикой:
фоновые таймеры `healthcheck`, системные обработчики. Если считать их «активными»,
`deadlock detection` никогда не сработает.

Для таких событий используется флаг `F_HIDDEN`:

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // Пометить как скрытое
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, но только если НЕ hidden
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, но только если НЕ hidden
```

## Иерархия событий

В `C` нет наследования классов, но есть приём: если первое поле структуры —
это `zend_async_event_t`, то указатель на структуру можно безопасно привести
к указателю на `zend_async_event_t`. Именно так все специализированные события
«наследуют» от базового:

```
zend_async_event_t
├── zend_async_poll_event_t      — fd/socket polling
│   └── zend_async_poll_proxy_t  — proxy для фильтрации событий
├── zend_async_timer_event_t     — таймеры (одноразовые и периодические)
├── zend_async_signal_event_t    — POSIX-сигналы
├── zend_async_process_event_t   — ожидание завершения процесса
├── zend_async_thread_event_t    — фоновые потоки
├── zend_async_filesystem_event_t — изменения файловой системы
├── zend_async_dns_nameinfo_t    — reverse DNS
├── zend_async_dns_addrinfo_t    — DNS resolution
├── zend_async_exec_event_t      — exec/system/passthru/shell_exec
├── zend_async_listen_event_t    — TCP server socket
├── zend_async_trigger_event_t   — ручное пробуждение (cross-thread safe)
├── zend_async_task_t            — задача для thread pool
├── zend_async_io_t              — унифицированный I/O
├── zend_coroutine_t             — корутина
├── zend_future_t                — future
├── zend_async_channel_t         — канал
├── zend_async_group_t           — группа задач
├── zend_async_pool_t            — пул ресурсов
└── zend_async_scope_t           — scope
```

Благодаря этому `Waker` может подписаться на **любое** из этих событий
одним и тем же вызовом `event->add_callback`, не зная конкретного типа.

### Примеры специализированных структур

Каждая структура добавляет к базовому событию только те поля,
которые специфичны для её типа:

**Таймер** — минимальное расширение:
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // Миллисекунды
    bool is_periodic;
};
```

**Poll** — отслеживание I/O на дескрипторе:
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // Что отслеживаем: READABLE|WRITABLE|...
    async_poll_event triggered_events; // Что реально произошло
};
```

**Filesystem** — наблюдение за файловой системой:
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // Какой файл изменился
};
```

**Exec** — выполнение внешних команд:
```c
struct _zend_async_exec_event_s {
    zend_async_event_t base;
    zend_async_exec_mode exec_mode;    // exec/system/passthru/shell_exec
    bool terminated;
    char *cmd;
    zval *return_value;
    zend_long exit_code;
    int term_signal;
};
```

## Poll Proxy

Представим ситуацию: на одном TCP-сокете две корутины — одна читает, другая пишет.
Им нужны разные события (`READABLE` vs `WRITABLE`), но сокет один.

`Poll Proxy` решает эту задачу. Вместо того чтобы создавать два `uv_poll_t`
на один и тот же fd (что невозможно в `libuv`), создаётся один `poll_event`
и несколько proxy с разными масками:

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // Родительский poll
    async_poll_event events;               // Подмножество событий этого proxy
    async_poll_event triggered_events;     // Что сработало
};
```

`Reactor` агрегирует маски всех активных proxy и передаёт объединённую маску в `uv_poll_start`.
Когда `libuv` сообщает о событии, `Reactor` проверяет каждый proxy
и нотифицирует только те, чья маска совпала.

## Async IO

Для потоковых операций ввода-вывода (чтение из файла, запись в сокет, работа с pipe)
`TrueAsync` предоставляет унифицированный `handle`:

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // Для PIPE/FILE
        zend_socket_t socket;        // Для TCP/UDP
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

Один интерфейс `ZEND_ASYNC_IO_READ/WRITE/CLOSE` работает с любым типом,
а конкретная реализация выбирается при создании `handle` по `type`.

Все I/O операции асинхронны и возвращают `zend_async_io_req_t` — одноразовый запрос:

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // Ошибка операции (или NULL)
    char *buf;                 // Буфер данных
    bool completed;            // Операция завершена?
    void (*dispose)(zend_async_io_req_t *req);
};
```

Корутина вызывает `ZEND_ASYNC_IO_READ`, получает `req`,
подписывается на его завершение через `Waker` и засыпает.
Когда `libuv` завершает операцию, `req->completed` становится `true`,
callback будит корутину, и она забирает данные из `req->buf`.
