---
layout: architecture
lang: uk
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /uk/architecture/events.html
page_title: "Події та модель подій"
description: "Базова структура zend_async_event_t — основа всіх асинхронних операцій, система зворотних викликів, прапорці, ієрархія подій."
---

# Події та модель подій

Подія (`zend_async_event_t`) — це універсальна структура,
від якої **всі** асинхронні примітиви успадковуються:
корутини, `future`, канали, таймери, події `poll`, сигнали та інші.

Уніфікований інтерфейс подій дозволяє:
- Підписуватися на будь-яку подію через зворотний виклик
- Комбінувати різнорідні події в одному очікуванні
- Керувати життєвим циклом через підрахунок посилань

## Базова структура

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // Зміщення до додаткових даних

    union {
        uint32_t ref_count;          // Для C-об'єктів
        uint32_t zend_object_offset; // Для Zend-об'єктів
    };

    uint32_t loop_ref_count;         // Лічильник посилань циклу подій

    zend_async_callbacks_vector_t callbacks;

    // Методи
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // Може бути NULL
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // Може бути NULL
    zend_async_event_callbacks_notify_t notify_handler; // Може бути NULL
};
```

### Віртуальні методи події

Кожна подія має невеликий набір віртуальних методів.

| Метод            | Призначення                                        |
|------------------|----------------------------------------------------|
| `add_callback`   | Підписати зворотний виклик на подію                |
| `del_callback`   | Відписати зворотний виклик                         |
| `start`          | Активувати подію в реакторі                        |
| `stop`           | Деактивувати подію                                 |
| `replay`         | Повторно доставити результат (для future, корутин) |
| `dispose`        | Звільнити ресурси                                  |
| `info`           | Текстовий опис події (для відлагодження)           |
| `notify_handler` | Хук, що викликається перед сповіщенням зворотних викликів |

#### `add_callback`

Додає зворотний виклик до динамічного масиву `callbacks` події.
Викликає `zend_async_callbacks_push()`,
що інкрементує `ref_count` зворотного виклику та додає вказівник у вектор.

#### `del_callback`

Видаляє зворотний виклик з вектора (O(1) через обмін з останнім елементом)
та викликає `callback->dispose`.

Типовий сценарій: під час очікування `select` на кількох подіях,
коли одна спрацьовує, решта відписуються через `del_callback`.

#### `start`

Методи `start` та `stop` призначені для подій, які можна помістити в `EventLoop`.
Тому не всі примітиви реалізують цей метод.

Для подій EventLoop `start` інкрементує `loop_ref_count`, що дозволяє
події залишатися в EventLoop доти, доки вона комусь потрібна.

| Тип                                            | Що робить `start`                                                        |
|------------------------------------------------|--------------------------------------------------------------------------|
| Корутина, `Future`, `Channel`, `Pool`, `Scope` | Нічого не робить                                                         |
| Таймер                                         | `uv_timer_start()` + інкрементує `loop_ref_count` та `active_event_count` |
| Poll                                           | `uv_poll_start()` з маскою подій (READABLE/WRITABLE)                     |
| Сигнал                                         | Реєструє подію в глобальній таблиці сигналів                             |
| IO                                             | Інкрементує `loop_ref_count` — потік libuv стартує через read/write      |

#### `stop`

Дзеркальний метод `start`. Декрементує `loop_ref_count` для подій типу EventLoop.
Останній виклик `stop` (коли `loop_ref_count` досягає 0) фактично зупиняє `handle`.

#### `replay`

Дозволяє пізнім підписникам отримати результат вже завершеної події.
Реалізований лише типами, що зберігають результат.

| Тип          | Що повертає `replay`                             |
|--------------|--------------------------------------------------|
| **Корутина** | `coroutine->result` та/або `coroutine->exception` |
| **Future**   | `future->result` та/або `future->exception`       |

Якщо передано `callback`, він викликається синхронно з результатом.
Якщо передано `result`/`exception`, значення копіюються за вказівниками.
Без `replay` очікування на закритій події генерує попередження.

#### `dispose`

Цей метод намагається звільнити подію, декрементуючи її `ref_count`.
Якщо лічильник досягає нуля, запускається фактичне звільнення ресурсів.

#### `info`

Людиночитний рядок для відлагодження та логування.

| Тип                  | Приклад рядка                                                            |
|----------------------|--------------------------------------------------------------------------|
| **Корутина**         | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` або `"FutureState(pending)"`                  |
| **Ітератор**         | `"iterator-completion"`                                                  |


#### `notify_handler`

Хук, що перехоплює сповіщення **перед** тим, як зворотні виклики отримають результат.
За замовчуванням `NULL` для всіх подій. Використовується в `Async\Timeout`:

## Життєвий цикл події

![Життєвий цикл події](/diagrams/uk/architecture-events/lifecycle.svg)

Подія проходить через кілька станів:
- **Створена** — пам'ять виділена, `ref_count = 1`, можна підписувати зворотні виклики
- **Активна** — зареєстрована в `EventLoop` (`start()`), інкрементує `active_event_count`
- **Спрацювала** — `libuv` викликав зворотний виклик. Для періодичних подій (таймер, poll) — повертається до **Активна**. Для одноразових подій (DNS, exec, Future) — переходить у **Закрита**
- **Зупинена** — тимчасово видалена з `EventLoop` (`stop()`), може бути реактивована
- **Закрита** — `flags |= F_CLOSED`, підписка неможлива, при досягненні `ref_count = 0` викликається `dispose`

## Взаємодія: Подія, Зворотний виклик, Корутина

![Подія -> Зворотний виклик -> Корутина](/diagrams/uk/architecture-events/callback-flow.svg)

## Подвійне життя: C-об'єкт та Zend-об'єкт

Події часто живуть одночасно у двох світах.
Таймер, `poll` handle або запит `DNS` — це внутрішній `C`-об'єкт, яким керує `Reactor`.
Але корутина або `Future` — це також `PHP`-об'єкт, доступний з користувацького коду.

C-структури в `EventLoop` можуть жити довше, ніж `PHP`-об'єкти, що на них посилаються, і навпаки.
C-об'єкти використовують `ref_count`, тоді як `PHP`-об'єкти використовують `GC_ADDREF/GC_DELREF`
зі збирачем сміття.

Тому `TrueAsync` підтримує кілька типів прив'язок між PHP-об'єктами та C-об'єктами.

### C-об'єкт

Внутрішні події, невидимі з PHP-коду, використовують поле `ref_count`.
Коли останній власник звільняє посилання, викликається `dispose`:

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + dispose при досягненні 0
```

### Zend-об'єкт

Корутина — це `PHP`-об'єкт, що реалізує інтерфейс `Awaitable`.
Замість `ref_count` вони використовують поле `zend_object_offset`,
яке вказує на зміщення структури `zend_object`.

Макроси `ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` коректно працюють у всіх випадках.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

`zend_object` є частиною C-структури події
і може бути відновлений через `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT`.

```c
// Отримати подію з PHP-об'єкта (з урахуванням посилання на подію)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// Отримати PHP-об'єкт з події
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## Посилання на подію

Деякі події стикаються з архітектурною проблемою: вони не можуть бути `Zend`-об'єктами напряму.

Наприклад, таймер. `PHP GC` може вирішити зібрати об'єкт у будь-який момент, але `libuv` вимагає
асинхронного закриття handle через `uv_close()` зі зворотним викликом. Якщо `GC` викличе деструктор,
поки `libuv` ще не завершив роботу з handle, ми отримаємо `use-after-free`.

У цьому випадку використовується підхід **Event Reference**: `PHP`-об'єкт зберігає не саму подію, а вказівник на неї:

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // Вказівник на реальну подію
} zend_async_event_ref_t;
```

При такому підході часи життя `PHP`-об'єкта та C-події **незалежні**.
`PHP`-об'єкт може бути зібраний `GC` без впливу на `handle`,
а `handle` закриється асинхронно, коли буде готовий.

Макрос `ZEND_ASYNC_OBJECT_TO_EVENT()` автоматично розпізнає посилання
за префіксом `flags` та слідує за вказівником.

## Система зворотних викликів

Підписка на події — це основний механізм взаємодії між корутинами та зовнішнім світом.
Коли корутина хоче дочекатися таймера, даних із сокета або завершення іншої корутини,
вона реєструє `callback` на відповідній події.

Кожна подія зберігає динамічний масив підписників:

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // Вказівник на активний індекс ітератора (або NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` вирішує проблему безпечного видалення зворотних викликів під час ітерації.

### Структура зворотного виклику

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

Зворотний виклик також є структурою з підрахунком посилань. Це необхідно, оскільки один `callback`
може одночасно бути в масиві події та у `waker` корутини.
`ref_count` гарантує, що пам'ять звільняється лише тоді, коли обидві сторони відпустять своє посилання.

### Зворотний виклик корутини

Більшість зворотних викликів у `TrueAsync` використовуються для пробудження корутини.
Тому вони зберігають інформацію про корутину та подію, на яку підписалися:

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // Успадкування
    zend_coroutine_t *coroutine;         // Кого будити
    zend_async_event_t *event;           // Звідки прийшла подія
};
```

Ця прив'язка є основою для механізму [Waker](/uk/architecture/waker.html):

## Прапорці подій

Бітові прапорці в полі `flags` контролюють поведінку події на кожному етапі її життєвого циклу:

| Прапорець              | Призначення                                                                      |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | Подія завершена. `start`/`stop` більше не працюють, підписка неможлива            |
| `F_RESULT_USED`       | Хтось очікує результат — попередження про невикористаний результат не потрібне    |
| `F_EXC_CAUGHT`        | Помилка буде перехоплена — придушити попередження про необроблений виняток        |
| `F_ZVAL_RESULT`       | Результат у зворотному виклику — вказівник на `zval` (не `void*`)                |
| `F_ZEND_OBJ`          | Подія є `Zend`-об'єктом — перемикає `ref_count` на `GC_ADDREF`                  |
| `F_NO_FREE_MEMORY`    | `dispose` не повинен звільняти пам'ять (об'єкт не був виділений через `emalloc`)  |
| `F_EXCEPTION_HANDLED` | Виняток оброблений — не потрібно повторно кидати                                 |
| `F_REFERENCE`         | Структура є `Event Reference`, а не реальною подією                              |
| `F_OBJ_REF`           | За зміщенням `extra_offset` знаходиться вказівник на `zend_object`               |
| `F_CLOSE_FD`          | Закрити файловий дескриптор при знищенні                                          |
| `F_HIDDEN`            | Прихована подія — не бере участі в `Deadlock Detection`                          |

### Виявлення взаємоблокувань

`TrueAsync` відстежує кількість активних подій в `EventLoop` через `active_event_count`.
Коли всі корутини призупинені й немає активних подій — це `deadlock`:
жодна подія не може пробудити жодну корутину.

Але деякі події завжди присутні в `EventLoop` і не пов'язані з користувацькою логікою:
фонові таймери `healthcheck`, системні обробники. Якщо їх враховувати як «активні»,
`deadlock detection` ніколи не спрацює.

Для таких подій використовується прапорець `F_HIDDEN`:

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // Позначити як приховану
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, але лише якщо НЕ прихована
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, але лише якщо НЕ прихована
```

## Ієрархія подій

У `C` немає успадкування класів, але є прийом: якщо перше поле структури —
`zend_async_event_t`, то вказівник на структуру можна безпечно привести
до вказівника на `zend_async_event_t`. Саме так усі спеціалізовані події
«успадковуються» від базової:

```
zend_async_event_t
|-- zend_async_poll_event_t      -- опитування fd/сокета
|   \-- zend_async_poll_proxy_t  -- проксі для фільтрації подій
|-- zend_async_timer_event_t     -- таймери (одноразові та періодичні)
|-- zend_async_signal_event_t    -- POSIX-сигнали
|-- zend_async_process_event_t   -- очікування завершення процесу
|-- zend_async_thread_event_t    -- фонові потоки
|-- zend_async_filesystem_event_t -- зміни файлової системи
|-- zend_async_dns_nameinfo_t    -- зворотний DNS
|-- zend_async_dns_addrinfo_t    -- DNS-розв'язання
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- серверний TCP-сокет
|-- zend_async_trigger_event_t   -- ручне пробудження (безпечне між потоками)
|-- zend_async_task_t            -- завдання пулу потоків
|-- zend_async_io_t              -- уніфікований I/O
|-- zend_coroutine_t             -- корутина
|-- zend_future_t                -- future
|-- zend_async_channel_t         -- канал
|-- zend_async_group_t           -- група завдань
|-- zend_async_pool_t            -- пул ресурсів
\-- zend_async_scope_t           -- scope
```

Завдяки цьому `Waker` може підписатися на **будь-яку** з цих подій
одним і тим самим викликом `event->add_callback`, не знаючи конкретного типу.

### Приклади спеціалізованих структур

Кожна структура додає до базової події лише ті поля,
що специфічні для її типу:

**Таймер** — мінімальне розширення:
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // Мілісекунди
    bool is_periodic;
};
```

**Poll** — відстеження I/O на дескрипторі:
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // Що відстежувати: READABLE|WRITABLE|...
    async_poll_event triggered_events; // Що фактично сталося
};
```

**Файлова система** — моніторинг файлової системи:
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // Який файл змінився
};
```

**Exec** — виконання зовнішніх команд:
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

Уявіть ситуацію: дві корутини на одному TCP-сокеті — одна читає, інша пише.
Їм потрібні різні події (`READABLE` vs `WRITABLE`), але сокет один.

`Poll Proxy` вирішує цю проблему. Замість створення двох `uv_poll_t` handle
для одного й того ж fd (що неможливо в `libuv`), створюється один `poll_event`
та кілька проксі з різними масками:

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // Батьківський poll
    async_poll_event events;               // Підмножина подій для цього проксі
    async_poll_event triggered_events;     // Що спрацювало
};
```

`Reactor` агрегує маски з усіх активних проксі та передає об'єднану маску в `uv_poll_start`.
Коли `libuv` повідомляє про подію, `Reactor` перевіряє кожен проксі
та сповіщує лише ті, чия маска збіглася.

## Async IO

Для потокових операцій I/O (читання з файлу, запис у сокет, робота з каналами),
`TrueAsync` надає уніфікований `handle`:

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

Один і той самий інтерфейс `ZEND_ASYNC_IO_READ/WRITE/CLOSE` працює з будь-яким типом,
а конкретна реалізація обирається при створенні `handle` на основі `type`.

Усі операції I/O є асинхронними та повертають `zend_async_io_req_t` — одноразовий запит:

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // Помилка операції (або NULL)
    char *buf;                 // Буфер даних
    bool completed;            // Операція завершена?
    void (*dispose)(zend_async_io_req_t *req);
};
```

Корутина викликає `ZEND_ASYNC_IO_READ`, отримує `req`,
підписується на його завершення через `Waker` і засинає.
Коли `libuv` завершує операцію, `req->completed` стає `true`,
зворотний виклик будить корутину, і вона забирає дані з `req->buf`.
