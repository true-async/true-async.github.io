import type { TutorialStrings } from '../tutorialData'

const it: TutorialStrings = {
  coreGroup: 'Fondamenti',
  serverGroup: 'TrueAsync Server',
  progress: 'completati',
  readMore: 'Leggi',
  core: [
    { label: 'Coroutine', body: 'Il primo sguardo alle coroutine: spawn() ed esecuzione concorrente.' },
    { label: 'Annullamento', body: 'Come funzionano cancel() e l\'annullamento cooperativo.' },
    { label: 'Await', body: 'Perché esiste await() e come funziona con le coroutine.' },
    { label: 'Eccezioni', body: 'Come le eccezioni di una coroutine si propagano attraverso await().' },
    { label: 'Timeout', body: 'Limitare quanto a lungo await() attende con timeout().' },
    { label: 'Future', body: 'Future e FutureState: la promessa di un risultato non legata a una coroutine.' },
    { label: 'Channel', body: 'Channel: un flusso di valori tra coroutine, pool di worker e backpressure.' },
    { label: 'Scope', body: 'Chi possiede un gruppo di coroutine, le attende e le annulla insieme.' },
    { label: 'PDO Pool', body: 'Perché le coroutine non possono condividere una connessione PDO e come il pool integrato lo risolve in modo trasparente.' },
    { label: 'TaskGroup', body: 'Un gruppo di task con risultati e strategie di attesa all, race, any.' },
    { label: 'TaskSet', body: 'Un flusso di task con pulizia automatica, joinNext/joinAny/joinAll e un ciclo supervisore.' },
    { label: 'Iteratore concorrente', body: 'iterate(): attraversamento concorrente di una collezione in una riga.' },
    { label: 'Pool', body: 'Async\\Pool: un pool di risorse generico con health check e circuit breaker.' },
    { label: 'Thread', body: 'spawn_thread e ThreadPool: parallelismo reale per il lavoro CPU-bound.' },
    { label: 'Context', body: 'Dove tenere "la cosa corrente" ora che le variabili globali non funzionano più.' },
  ],
  server: [
    { label: 'Primo server', body: 'Un server HTTP dentro PHP: HttpServer, HttpServerConfig e il tuo primo handler.' },
    { label: 'Richiesta e risposta', body: 'HttpRequest e HttpResponse: routing, json() ed errori tramite HttpException.' },
    { label: 'Concorrenza dentro una richiesta', body: 'TaskGroup in un handler, il PDO Pool sotto carico e request_context().' },
    { label: 'Flussi di byte', body: 'send() e sendable(), streaming del corpo della richiesta, upload di file e sendFile().' },
    { label: 'File statici', body: 'StaticHandler: servire file senza una coroutine PHP, caching e politiche di sicurezza.' },
    { label: 'Server-Sent Events', body: 'SSE: un flusso di eventi verso il browser, avanzamento dell\'import e heartbeat tramite sseComment().' },
    { label: 'WebSocket', body: 'Il ciclo recv, una chat room, send da altre coroutine e trySend contro client lenti.' },
    { label: 'Worker e HTTP/3', body: 'setWorkers(): i thread sotto il cofano del server, il bootloader e HTTP/3 sulla stessa porta.' },
    { label: 'Produzione', body: 'Timeout, limiti, backpressure sull\'accept, compressione, logging e shutdown graduale.' },
    { label: 'gRPC', body: 'addGrpcHandler(): unary e streaming, readMessage/writeMessage, trailer e deadline.' },
  ],
}

export default it
