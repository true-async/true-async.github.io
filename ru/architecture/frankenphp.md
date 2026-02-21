---
layout: architecture
lang: ru
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /ru/architecture/frankenphp.html
page_title: "Интеграция с FrankenPHP"
description: "Как TrueAsync превращает FrankenPHP в полностью асинхронный сервер — корутина на каждый запрос, zero-copy ответы, двойной путь нотификации."
---

# TrueAsync + FrankenPHP: много запросов один поток

В этой статье мы рассмотрим опыт интеграции `FrankenPHP` и `TrueAsync`.
`FrankenPHP` — сервер на базе `Caddy`, который запускает `PHP`-код внутри `Go`-процесса. 
Мы добавили поддержку `TrueAsync` в `FrankenPHP`, что позволило каждому `PHP`-потоку обрабатывать несколько запросов одновременно, 
используя корутины `TrueAsync` для управления.

## Как устроен FrankenPHP

`FrankenPHP` представляет собой процесс, в который упакован мир `Go` (`Caddy`) и `PHP`.
`Go` владеет процессом, а `PHP` играет роль "плагина", с которым `Go` взаимодействует через `SAPI`.
Чтобы это работало, виртуальная машина `PHP` запускается в отдельном потоке. `Go` создаёт эти потоки,
и вызывает функции `SAPI`, запуская `PHP`-код.

На каждый запрос, `Caddy` создаёт отдельную горутину, которая обрабатывает HTTP-запрос.
Горутина выбирает из пула `PHP`-потоков свободный и по каналу передаёт данные запроса, 
после чего переходит в состояние ожидания.

Когда `PHP` заканчивает формировать ответ, горутина получает его по каналу и передаёт дальше `Caddy`.

Мы изменим этот подход таким образом, чтобы теперь горутины посылали несколько запросов в один и тот же `PHP`-поток,
а `PHP`-поток научим обрабатывать такие запросы асинхронно.

### Общая схема

![Общая архитектура FrankenPHP + TrueAsync](/diagrams/ru/architecture-frankenphp/architecture.svg)

На диаграмме видно три слоя. Разберём каждый.

### Интеграция Go в TrueAsync-Scheduler

Чтобы приложение работало, PHP `Reactor` и `Scheduler` должно быть интегрированы с `Caddy`.
Поэтому нам нужен какой-то механизм межпотокового взаимодействия, который бы был совместим 
с миром `Go` и `PHP`. Каналы `Go` отлично походят для передачи данных между потоками, 
и доступны из `C-Go`. Но их недостаточно, ведь цикл `EventLoop` может засыпать.

Есть старый хорошо известный подход,
который можно найти почти в любом Web-сервере: комбинация канала передачи 
и `fdevent` (на macOS/Windows используется `pipe`).

Если канал не пустой, значит `PHP` будет читать из него, мы просто добавляем туда ещё одно значение.
Если канал пуст, значит `PHP`-поток спит, и его нужно разбудить. Вот для этого и нужен `Notify()`.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd — самый быстрый вариант
        // ...
    }
    // Fallback: pipe для macOS/BSD
    syscall.Pipe(fds[:])
}
```

На стороне `PHP` `eventfd` дескриптор регистрируется в `Reactor`:

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

`Reactor` (на основе `libuv`) начинает следить за дескриптором. Как только `Go` запишет
в `eventfd`, `Reactor` проснётся и вызовет callback обработки запросов.

Теперь, когда горутина упаковывает данные запроса
в структуру `contextHolder` и передаёт её `Dispatcher`, чтобы он доставил запрос в `PHP`-поток.
`Dispatcher` перебирает `PHP`-потоки по кругу (`round-robin`)
и пытается отправить контекст-запроса в
буферизованный `Go`-канал (`requestChan`), закреплённый за конкретным потоком. 
Если буфер полон, `Dispatcher` пробует следующий поток. 
Если все заняты — клиент получает `HTTP 503`.

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

### Интеграция с Scheduler

Когда `FrankenPHP` инициализируется, создаёт потоки `PHP`,
он выполняет интеграцию с `Reactor`/`Scheduler` с помощью `True Async ABI` (`zend_async_API.h`). 

За этот процесс отвечает функция `frankenphp_enter_async_mode()`, которая вызывается один раз,
когда `PHP`-скрипт зарегистрировал callback через `HttpServer::onRequest()`:

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Получить FD нотификатора из Go
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. Зарегистрировать FD в Reactor (slow path)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. Запустить Scheduler
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. Подменить heartbeat handler (fast path)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. Подвесить главную корутину
    frankenphp_suspend_main_coroutine();

    // --- сюда мы попадём только при shutdown ---

    // 6. Восстановить heartbeat handler
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. Освободить ресурсы
    close_request_event();
}
```

Мы используем `heartbeat handler`, специальный callback из `Scheduler`, чтобы добавить свой обработчик
для каждого тика `Scheduler`. Этот обработчик служит для того, чтобы `FrankenPHP` смог создавать новые
корутины для обработки запросов.

![Двойная система нотификации](/diagrams/ru/architecture-frankenphp/notification.svg)

Теперь `Scheduler` на каждом тике вызывает `heartbeat handler`. Этот обработчик
заглядывает в `Go`-канал через `CGo`:

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

Никаких системных вызовов, никакого `epoll_wait`, прямой вызов `Go`-функции через `CGo`,
Мгновенный возврат, если канал пустой. 
Максимальная дешёвая операция, что является обязательным условием для `heartbeat handler`.

Если же все корутины спят, `Scheduler` передаёт управление `Reactor`,
и `heartbeat` перестаёт тикать. Тогда в дело вступает `AsyncNotifier`:
`Reactor` ждёт на `epoll`/`kqueue`, и просыпается, когда `Go` запишет в дескриптор.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

Две системы дополняют друг друга: `heartbeat` даёт минимальную латентность при нагрузке,
а `poll event` обеспечивает нулевое потребление `CPU` в простое.

### Создание корутины-запроса

За создание корутины обработки запроса отвечает функция `frankenphp_request_coroutine_entry()`:

![Жизненный цикл запроса](/diagrams/ru/architecture-frankenphp/request-lifecycle.svg)

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

Для каждого запроса создаётся **отдельный `Scope`**. Это изолированный контекст,
который позволяет контролировать жизненный цикл корутины и её ресурсов. 
Когда `Scope` завершается, все корутины внутри него отменяются.

### Взаимодействие с PHP-кодом

Чтобы создавать корутины `FrankenPHP` должен знать функцию обработки.
Функция обработки должна быть определена PHP-программистом.
Для этого нужен код инициализации на стороне самого `PHP`. В качестве такого инициализатора выступает
`HttpServer::onRequest()` функция, которая регистрирует `PHP`-callback для обработки `HTTP`-запросов.

Со стороны `PHP` всё выглядит просто:

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

Инициализация происходит в главной корутине. 
Программист должен создать объект `HttpServer`, вызвать `onRequest()` и явно "запустить" сервер.
После этого `FrankenPHP` перехватывает управление и блокирует главную корутину до завершения работы сервера.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // всегда false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

Для отсылки результата обратно в `Caddy`, `PHP`-код использует объект `Response`, 
который предоставляет методы `write()` и `end()`.
Под копотом происходит копирование памяти и отправка результатов в канал.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## Исходный код

Репозиторий интеграции — форк `FrankenPHP` с веткой `true-async`:

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) — репозиторий интеграции

Ключевые файлы:

| Файл                                                                                                        | Описание                                                                    |
|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | Интеграция с `Scheduler`/`Reactor`: heartbeat, poll event, создание корутин |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | PHP-классы `HttpServer`, `Request`, `Response`                              |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Go-сторона: `round-robin`, `requestChan`, `responseChan`, `CGo`-экспорты    |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`: `eventfd` (Linux) / `pipe` (macOS)                         |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | Документация по интеграции                                                  |

TrueAsync ABI, который используется интеграцией:

| Файл                                                                                                     | Описание                                          |
|----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/aspect-build/php-src/blob/true-async/Zend/zend_async_API.h) | Определение API: макросы, function pointers, типы |
| [`Zend/zend_async_API.c`](https://github.com/aspect-build/php-src/blob/true-async/Zend/zend_async_API.c) | Инфраструктура: регистрация, stub-реализации      |
