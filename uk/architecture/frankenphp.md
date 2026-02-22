---
layout: architecture
lang: uk
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /uk/architecture/frankenphp.html
page_title: "Інтеграція з FrankenPHP"
description: "Як TrueAsync перетворює FrankenPHP на повністю асинхронний сервер — корутина на запит, zero-copy відповіді, подвійний шлях сповіщень."
---

# TrueAsync + FrankenPHP: багато запитів, один потік

У цій статті ми розглядаємо досвід інтеграції `FrankenPHP` з `TrueAsync`.
`FrankenPHP` — це сервер на базі `Caddy`, який виконує `PHP`-код всередині `Go`-процесу.
Ми додали підтримку `TrueAsync` до `FrankenPHP`, дозволяючи кожному `PHP`-потоку обробляти кілька запитів одночасно,
використовуючи корутини `TrueAsync` для оркестрації.

## Як працює FrankenPHP

`FrankenPHP` — це процес, що об'єднує світ `Go` (`Caddy`) та `PHP`.
`Go` володіє процесом, тоді як `PHP` виступає як «плагін», з яким `Go` взаємодіє через `SAPI`.
Щоб це працювало, віртуальна машина `PHP` запускається в окремому потоці. `Go` створює ці потоки
та викликає функції `SAPI` для виконання `PHP`-коду.

Для кожного запиту `Caddy` створює окрему горутину, яка обробляє HTTP-запит.
Горутина обирає вільний `PHP`-потік з пулу та надсилає дані запиту через канал,
після чого переходить у стан очікування.

Коли `PHP` завершує формування відповіді, горутина отримує її через канал та передає назад до `Caddy`.

Ми змінили цей підхід так, що горутини тепер надсилають кілька запитів до одного `PHP`-потоку,
а `PHP`-потік навчається обробляти такі запити асинхронно.

### Загальна архітектура

![Загальна архітектура FrankenPHP + TrueAsync](/diagrams/uk/architecture-frankenphp/architecture.svg)

На діаграмі показано три рівні. Розглянемо кожен з них.

### Інтеграція Go в планувальник TrueAsync

Щоб застосунок працював, `Reactor` та `Scheduler` PHP мають бути інтегровані з `Caddy`.
Тому нам потрібен певний механізм міжпотокової комунікації, сумісний
як зі світом `Go`, так і з `PHP`. Канали `Go` чудово підходять для передачі даних між потоками
та доступні з `C-Go`. Але їх недостатньо, оскільки цикл `EventLoop` може заснути.

Існує давній відомий підхід,
який можна знайти майже в будь-якому веб-сервері: комбінація каналу передачі
та `fdevent` (на macOS/Windows використовується `pipe`).

Якщо канал не порожній, `PHP` читатиме з нього, тож ми просто додаємо ще одне значення.
Якщо канал порожній, `PHP`-потік спить і його потрібно розбудити. Саме для цього існує `Notify()`.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- найшвидший варіант
        // ...
    }
    // Fallback: pipe для macOS/BSD
    syscall.Pipe(fds[:])
}
```

На стороні `PHP` дескриптор `eventfd` реєструється в `Reactor`:

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

`Reactor` (на основі `libuv`) починає моніторити дескриптор. Щойно `Go` записує
в `eventfd`, `Reactor` прокидається і викликає зворотний виклик обробки запиту.

Тепер, коли горутина пакує дані запиту
у структуру `contextHolder` та передає їх `Dispatcher` для доставки в `PHP`-потік.
`Dispatcher` перебирає `PHP`-потоки за алгоритмом round-robin
та намагається надіслати контекст запиту до
буферизованого каналу `Go` (`requestChan`), прив'язаного до конкретного потоку.
Якщо буфер повний, `Dispatcher` пробує наступний потік.
Якщо всі зайняті — клієнт отримує `HTTP 503`.

```go
start := w.rrIndex.Add(1) % uint32(len(w.threads))
for i := 0; i < len(w.threads); i++ {
    idx := (start + uint32(i)) % uint32(len(w.threads))
    select {
    case thread.requestChan <- ch:
        if len(thread.requestChan) == 1 {
            thread.asyncNotifier.Notify()
        }
        return nil
    default:
        continue
    }
}
return ErrAllBuffersFull // HTTP 503
```

### Інтеграція з планувальником

Коли `FrankenPHP` ініціалізується та створює `PHP`-потоки,
він інтегрується з `Reactor`/`Scheduler` через `True Async ABI` (`zend_async_API.h`).

Функція `frankenphp_enter_async_mode()` відповідає за цей процес і викликається один раз,
коли `PHP`-скрипт реєструє зворотний виклик через `HttpServer::onRequest()`:

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Отримати FD нотифікатора від Go
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. Зареєструвати FD у Reactor (повільний шлях)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. Запустити Scheduler
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. Замінити обробник heartbeat (швидкий шлях)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. Призупинити головну корутину
    frankenphp_suspend_main_coroutine();

    // --- сюди потрапляємо лише при завершенні ---

    // 6. Відновити обробник heartbeat
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. Звільнити ресурси
    close_request_event();
}
```

Ми використовуємо `heartbeat handler` — спеціальний зворотний виклик від `Scheduler` — для додавання власного обробника
на кожному тіку `Scheduler`. Цей обробник дозволяє `FrankenPHP` створювати нові
корутини для обробки запитів.

![Подвійна система сповіщень](/diagrams/uk/architecture-frankenphp/notification.svg)

Тепер `Scheduler` викликає `heartbeat handler` на кожному тіку. Цей обробник
перевіряє канал `Go` через `CGo`:

```c
void frankenphp_scheudler_tick_handler(void) {
    uint64_t request_id;
    while ((request_id = go_async_worker_check_requests(thread_index)) != 0) {
        if (request_id == UINT64_MAX) {
            ZEND_ASYNC_SHUTDOWN();
            return;
        }
        frankenphp_handle_request_async(request_id);
    }
    if (old_heartbeat_handler) old_heartbeat_handler();
}
```

Жодних системних викликів, жодного `epoll_wait`, прямий виклик функції `Go` через `CGo`.
Миттєве повернення, якщо канал порожній.
Найдешевша можлива операція, що є обов'язковою вимогою для `heartbeat handler`.

Якщо всі корутини сплять, `Scheduler` передає керування `Reactor`,
і `heartbeat` перестає тікати. Тоді вмикається `AsyncNotifier`:
`Reactor` очікує на `epoll`/`kqueue` та прокидається, коли `Go` записує в дескриптор.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

Дві системи доповнюють одна одну: `heartbeat` забезпечує мінімальну затримку під навантаженням,
а `poll event` гарантує нульове споживання `CPU` під час простою.

### Створення корутини запиту

Функція `frankenphp_request_coroutine_entry()` відповідає за створення корутини обробки запиту:

![Життєвий цикл запиту](/diagrams/uk/architecture-frankenphp/request-lifecycle.svg)

```c
void frankenphp_handle_request_async(uint64_t request_id) {
    zend_async_scope_t *request_scope =
        ZEND_ASYNC_NEW_SCOPE(ZEND_ASYNC_CURRENT_SCOPE);

    zend_coroutine_t *coroutine =
        ZEND_ASYNC_NEW_COROUTINE(request_scope);

    coroutine->internal_entry = frankenphp_request_coroutine_entry;
    coroutine->extended_data = (void *)(uintptr_t)request_id;

    ZEND_ASYNC_ENQUEUE_COROUTINE(coroutine);
}
```

Для кожного запиту створюється **окремий `Scope`**. Це ізольований контекст,
що дозволяє контролювати життєвий цикл корутини та її ресурсів.
Коли `Scope` завершується, всі корутини в ньому скасовуються.

### Взаємодія з PHP-кодом

Для створення корутин `FrankenPHP` потрібно знати функцію-обробник.
Функція-обробник має бути визначена PHP-програмістом.
Для цього потрібен код ініціалізації на стороні `PHP`. Функція `HttpServer::onRequest()`
слугує цим ініціалізатором, реєструючи `PHP`-callback для обробки `HTTP`-запитів.

З боку `PHP` все виглядає просто:

```php
use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response) {
    $uri = $request->getUri();
    $body = $request->getBody();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['uri' => $uri]));
    $response->end();
});
```

Ініціалізація відбувається в головній корутині.
Програміст має створити об'єкт `HttpServer`, викликати `onRequest()` та явно «запустити» сервер.
Після цього `FrankenPHP` перебирає керування на себе та блокує головну корутину до зупинки сервера.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // завжди false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

Для надсилання результатів назад до `Caddy` PHP-код використовує об'єкт `Response`,
який надає методи `write()` та `end()`.
Під капотом пам'ять копіюється, а результати надсилаються в канал.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## Вихідний код

Репозиторій інтеграції є форком `FrankenPHP` з гілкою `true-async`:

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) — репозиторій інтеграції

Ключові файли:

| Файл                                                                                                        | Опис                                                                        |
|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | Інтеграція з `Scheduler`/`Reactor`: heartbeat, poll event, створення корутин |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | PHP-класи `HttpServer`, `Request`, `Response`                                |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Сторона Go: `round-robin`, `requestChan`, `responseChan`, експорти `CGo`     |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`: `eventfd` (Linux) / `pipe` (macOS)                          |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | Документація інтеграції                                                      |

TrueAsync ABI, що використовується інтеграцією:

| Файл                                                                                                     | Опис                                              |
|----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.h) | Визначення API: макроси, вказівники на функції, типи |
| [`Zend/zend_async_API.c`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.c) | Інфраструктура: реєстрація, заглушки реалізацій    |
