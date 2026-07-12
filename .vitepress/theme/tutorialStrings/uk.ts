import type { TutorialStrings } from '../tutorialData'

const uk: TutorialStrings = {
  coreGroup: 'Основи',
  serverGroup: 'TrueAsync Server',
  progress: 'пройдено',
  readMore: 'Читати',
  core: [
    { label: 'Корутини', body: 'Перше знайомство з корутинами: spawn() і конкурентне виконання.' },
    { label: 'Скасування', body: 'Як працює cancel() і кооперативне скасування корутин.' },
    { label: 'Await', body: 'Навіщо потрібен await() і як він працює з корутинами.' },
    { label: 'Винятки', body: 'Як винятки з корутини пробрасуються через await().' },
    { label: 'Таймаути', body: 'Обмеження часу очікування await() через timeout().' },
    { label: 'Future', body: 'Future і FutureState: обіцянка результату, яка не прив’язана до корутини.' },
    { label: 'Канали', body: 'Channel: потік значень між корутинами, пул воркерів і зворотний тиск.' },
    { label: 'Scope', body: 'Хто володіє корутинами, чекає на їх завершення і скасовує всю групу разом.' },
    { label: 'PDO Pool', body: 'Чому корутинам не можна ділити одне PDO-з’єднання і як вбудований пул вирішує це прозоро.' },
    { label: 'TaskGroup', body: 'Група задач з результатами і стратегії очікування all, race, any.' },
    { label: 'TaskSet', body: 'Потік задач з автоочищенням, joinNext/joinAny/joinAll і цикл супервізора.' },
    { label: 'Конкурентний ітератор', body: 'iterate(): конкурентний обхід колекції одним рядком.' },
    { label: 'Pool', body: 'Async\\Pool: універсальний пул ресурсів з healthcheck і circuit breaker.' },
    { label: 'Потоки', body: 'spawn_thread і ThreadPool: справжній паралелізм для обчислень.' },
    { label: 'Context', body: 'Де зберігати «поточне», коли глобальні змінні перестали працювати.' },
  ],
  server: [
    { label: 'Перший сервер', body: 'HTTP-сервер усередині PHP: HttpServer, HttpServerConfig і перший обробник.' },
    { label: 'Запит і відповідь', body: 'HttpRequest і HttpResponse: маршрутизація, json() і помилки через HttpException.' },
    { label: 'Конкурентність усередині запиту', body: 'TaskGroup в обробнику, PDO Pool під навантаженням і request_context().' },
    { label: 'Потоки байтів', body: 'send() і sendable(), потокове читання тіла, завантаження файлів і sendFile().' },
    { label: 'Статика', body: 'StaticHandler: віддача файлів без PHP-корутини, кешування і політики безпеки.' },
    { label: 'Server-Sent Events', body: 'SSE: потік подій у браузер, прогрес імпорту і heartbeat через sseComment().' },
    { label: 'WebSocket', body: 'Цикл recv, чат-кімната, send з інших корутин і trySend проти повільних клієнтів.' },
    { label: 'Воркери і HTTP/3', body: 'setWorkers(): потоки під капотом сервера, bootloader і HTTP/3 на тому ж порту.' },
    { label: 'Продакшен', body: 'Таймаути, ліміти, зворотний тиск на accept, компресія, логи і graceful shutdown.' },
    { label: 'gRPC', body: 'addGrpcHandler(): unary і стримінг, readMessage/writeMessage, трейлери і дедлайни.' },
  ],
}

export default uk
