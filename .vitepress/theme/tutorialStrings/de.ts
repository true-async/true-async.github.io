import type { TutorialStrings } from '../tutorialData'

const de: TutorialStrings = {
  coreGroup: 'Grundlagen',
  serverGroup: 'TrueAsync Server',
  progress: 'abgeschlossen',
  readMore: 'Lesen',
  core: [
    { label: 'Coroutinen', body: 'Dein erster Blick auf Coroutinen: spawn() und nebenläufige Ausführung.' },
    { label: 'Abbruch', body: 'Wie cancel() und kooperativer Abbruch funktionieren.' },
    { label: 'Await', body: 'Warum es await() gibt und wie es mit Coroutinen zusammenspielt.' },
    { label: 'Ausnahmen', body: 'Wie Ausnahmen aus einer Coroutine über await() weitergereicht werden.' },
    { label: 'Timeouts', body: 'Die Wartezeit von await() mit timeout() begrenzen.' },
    { label: 'Future', body: 'Future und FutureState: ein Versprechen auf ein Ergebnis, das nicht an eine Coroutine gebunden ist.' },
    { label: 'Channels', body: 'Channel: ein Strom von Werten zwischen Coroutinen, Worker-Pools und Backpressure.' },
    { label: 'Scope', body: 'Wer eine Gruppe von Coroutinen besitzt, auf sie wartet und sie gemeinsam abbricht.' },
    { label: 'PDO Pool', body: 'Warum Coroutinen sich keine PDO-Verbindung teilen können und wie der eingebaute Pool das transparent löst.' },
    { label: 'TaskGroup', body: 'Eine Gruppe von Tasks mit Ergebnissen und den Wartestrategien all, race, any.' },
    { label: 'TaskSet', body: 'Ein Strom von Tasks mit automatischer Aufräumung, joinNext/joinAny/joinAll und einer Supervisor-Schleife.' },
    { label: 'Nebenläufiger Iterator', body: 'iterate(): nebenläufiges Durchlaufen einer Sammlung in einer Zeile.' },
    { label: 'Pool', body: 'Async\\Pool: ein universeller Ressourcen-Pool mit Health-Checks und einem Circuit Breaker.' },
    { label: 'Threads', body: 'spawn_thread und ThreadPool: echte Parallelität für CPU-lastige Arbeit.' },
    { label: 'Context', body: 'Wo man „das aktuelle Ding" ablegt, jetzt wo globale Variablen nicht mehr funktionieren.' },
  ],
  server: [
    { label: 'Erster Server', body: 'Ein HTTP-Server innerhalb von PHP: HttpServer, HttpServerConfig und dein erster Handler.' },
    { label: 'Anfrage und Antwort', body: 'HttpRequest und HttpResponse: Routing, json() und Fehler über HttpException.' },
    { label: 'Nebenläufigkeit innerhalb einer Anfrage', body: 'TaskGroup in einem Handler, der PDO Pool unter Last und request_context().' },
    { label: 'Byte-Streams', body: 'send() und sendable(), das Streamen des Anfrage-Bodys, Datei-Uploads und sendFile().' },
    { label: 'Statische Dateien', body: 'StaticHandler: Dateien ohne PHP-Coroutine ausliefern, Caching und Sicherheitsrichtlinien.' },
    { label: 'Server-Sent Events', body: 'SSE: ein Strom von Ereignissen an den Browser, Import-Fortschritt und Heartbeats über sseComment().' },
    { label: 'WebSocket', body: 'Die recv-Schleife, ein Chatraum, Senden aus anderen Coroutinen und trySend gegen langsame Clients.' },
    { label: 'Worker und HTTP/3', body: 'setWorkers(): Threads unter der Haube des Servers, der Bootloader und HTTP/3 auf demselben Port.' },
    { label: 'Produktion', body: 'Timeouts, Limits, Backpressure beim Accept, Kompression, Logging und Graceful Shutdown.' },
    { label: 'gRPC', body: 'addGrpcHandler(): unary und Streaming, readMessage/writeMessage, Trailer und Deadlines.' },
  ],
}

export default de
