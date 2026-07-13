import type { TutorialStrings } from '../tutorialData'

const es: TutorialStrings = {
  coreGroup: 'Fundamentos',
  serverGroup: 'TrueAsync Server',
  progress: 'completados',
  readMore: 'Leer',
  core: [
    { label: 'Corrutinas', body: 'Tu primer contacto con las corrutinas: spawn() y ejecución concurrente.' },
    { label: 'Cancelación', body: 'Cómo funcionan cancel() y la cancelación cooperativa.' },
    { label: 'Await', body: 'Por qué existe await() y cómo funciona con las corrutinas.' },
    { label: 'Excepciones', body: 'Cómo se propagan las excepciones de una corrutina a través de await().' },
    { label: 'Tiempos de espera', body: 'Limitar cuánto espera await() con timeout().' },
    { label: 'Future', body: 'Future y FutureState: la promesa de un resultado que no está atada a una corrutina.' },
    { label: 'Canales', body: 'Channel: un flujo de valores entre corrutinas, pools de workers y contrapresión.' },
    { label: 'Scope', body: 'Quién es dueño de un grupo de corrutinas, las espera y las cancela en conjunto.' },
    { label: 'PDO Pool', body: 'Por qué las corrutinas no pueden compartir una conexión PDO, y cómo el pool integrado lo resuelve de forma transparente.' },
    { label: 'TaskGroup', body: 'Un grupo de tareas con resultados y las estrategias de espera all, race y any.' },
    { label: 'TaskSet', body: 'Un flujo de tareas con autolimpieza, joinNext/joinAny/joinAll y un bucle supervisor.' },
    { label: 'Iterador concurrente', body: 'iterate(): recorrido concurrente de una colección en una sola línea.' },
    { label: 'Pool', body: 'Async\\Pool: un pool de recursos de propósito general con health checks y circuit breaker.' },
    { label: 'Hilos', body: 'spawn_thread y ThreadPool: paralelismo real para trabajo intensivo en CPU.' },
    { label: 'Context', body: 'Dónde guardar "lo actual" ahora que las variables globales ya no funcionan.' },
  ],
  server: [
    { label: 'Primer servidor', body: 'Un servidor HTTP dentro de PHP: HttpServer, HttpServerConfig y tu primer handler.' },
    { label: 'Petición y respuesta', body: 'HttpRequest y HttpResponse: enrutamiento, json() y errores mediante HttpException.' },
    { label: 'Concurrencia dentro de una petición', body: 'TaskGroup en un handler, el PDO Pool bajo carga y request_context().' },
    { label: 'Flujos de bytes', body: 'send() y sendable(), el streaming del cuerpo de la petición, la subida de archivos y sendFile().' },
    { label: 'Archivos estáticos', body: 'StaticHandler: servir archivos sin una corrutina PHP, caché y políticas de seguridad.' },
    { label: 'Server-Sent Events', body: 'SSE: un flujo de eventos hacia el navegador, progreso de importación y heartbeats mediante sseComment().' },
    { label: 'WebSocket', body: 'El bucle recv, una sala de chat, enviar desde otras corrutinas y trySend frente a clientes lentos.' },
    { label: 'Workers y HTTP/3', body: 'setWorkers(): hilos bajo el capó del servidor, el bootloader y HTTP/3 en el mismo puerto.' },
    { label: 'Producción', body: 'Tiempos de espera, límites, contrapresión en accept, compresión, logging y apagado ordenado.' },
    { label: 'gRPC', body: 'addGrpcHandler(): unary y streaming, readMessage/writeMessage, trailers y deadlines.' },
  ],
  laravelGroup: 'Laravel',
  laravel: [
    { label: 'Primera ejecución', body: 'Ejecutar Laravel bajo TrueAsync Server y tu primera API, desde las rutas hasta la base de datos.' },
    { label: 'Pool y transacciones', body: 'PDO Pool bajo Eloquent y CoroutineTransactions: por qué el contador de transacciones anidadas no puede quedarse en una propiedad de Connection.' },
    { label: 'SSE y gRPC', body: 'trueasync_response(), Sse y grpc_handlers: llegar más allá del Illuminate Response con buffer directamente desde un controlador.' },
    { label: 'Patrones inseguros', body: 'Propiedades static mutables, once() sobre un singleton y Number::useLocale(): las formas habituales en que el estado se filtra entre peticiones, y cómo detectarlas con análisis estático.' },
    { label: 'Paquetes de terceros', body: 'Debugbar, Telescope, Inertia, spatie/permission, Socialite: qué ya está adaptado para corrutinas y qué merece la pena desactivar.' },
  ],
}

export default es
