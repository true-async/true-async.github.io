import type { TutorialStrings } from '../tutorialData'

const ru: TutorialStrings = {
  coreGroup: 'Основы',
  serverGroup: 'TrueAsync Server',
  progress: 'пройдено',
  readMore: 'Читать',
  core: [
    { label: 'Корутины', body: 'Первое знакомство с корутинами: spawn() и конкурентное выполнение.' },
    { label: 'Отмена', body: 'Как работает cancel() и кооперативная отмена корутин.' },
    { label: 'Await', body: 'Зачем нужен await() и как он работает с корутинами.' },
    { label: 'Исключения', body: 'Как исключения из корутины пробрасываются через await().' },
    { label: 'Таймауты', body: 'Ограничение времени ожидания await() через timeout().' },
    { label: 'Future', body: 'Future и FutureState: обещание результата, которое не привязано к корутине.' },
    { label: 'Каналы', body: 'Channel: поток значений между корутинами, пул воркеров и обратное давление.' },
    { label: 'Scope', body: 'Кто владеет корутинами, ждёт их завершения и отменяет всей группой.' },
    { label: 'PDO Pool', body: 'Почему корутинам нельзя делить один PDO и как встроенный пул решает это прозрачно.' },
    { label: 'TaskGroup', body: 'Группа задач с результатами и стратегии ожидания all, race, any.' },
    { label: 'TaskSet', body: 'Поток задач с автоочисткой, joinNext/joinAny/joinAll и цикл супервизора.' },
    { label: 'Конкурентный итератор', body: 'iterate(): конкурентный обход коллекции одной строчкой.' },
    { label: 'Pool', body: 'Async\\Pool: универсальный пул ресурсов с healthcheck и circuit breaker.' },
    { label: 'Потоки', body: 'spawn_thread и ThreadPool: настоящий параллелизм для вычислений.' },
    { label: 'Context', body: 'Где хранить «текущее», когда глобальные переменные перестали работать.' },
  ],
  server: [
    { label: 'Первый сервер', body: 'HTTP-сервер внутри PHP: HttpServer, HttpServerConfig и первый обработчик.' },
    { label: 'Запрос и ответ', body: 'HttpRequest и HttpResponse: маршрутизация, json() и ошибки через HttpException.' },
    { label: 'Конкурентность внутри запроса', body: 'TaskGroup в обработчике, PDO Pool под нагрузкой и request_context().' },
    { label: 'Потоки байтов', body: 'send() и sendable(), потоковое чтение тела, загрузка файлов и sendFile().' },
    { label: 'Статика', body: 'StaticHandler: отдача файлов без PHP-корутины, кэширование и политики безопасности.' },
    { label: 'Server-Sent Events', body: 'SSE: поток событий в браузер, прогресс импорта и heartbeat через sseComment().' },
    { label: 'WebSocket', body: 'Цикл recv, чат-комната, send из чужих корутин и trySend против медленных клиентов.' },
    { label: 'Воркеры и HTTP/3', body: 'setWorkers(): потоки под капотом сервера, bootloader и HTTP/3 на том же порту.' },
    { label: 'Продакшен', body: 'Таймауты, лимиты, обратное давление на accept, компрессия, логи и graceful shutdown.' },
    { label: 'gRPC', body: 'addGrpcHandler(): unary и стриминг, readMessage/writeMessage, трейлеры и дедлайны.' },
  ],
}

export default ru
