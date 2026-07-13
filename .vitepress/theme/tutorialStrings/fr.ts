import type { TutorialStrings } from '../tutorialData'

const fr: TutorialStrings = {
  coreGroup: 'Les bases',
  serverGroup: 'TrueAsync Server',
  progress: 'terminés',
  readMore: 'Lire',
  core: [
    { label: 'Coroutines', body: 'Votre premier aperçu des coroutines : spawn() et exécution concurrente.' },
    { label: 'Annulation', body: 'Comment fonctionnent cancel() et l\'annulation coopérative.' },
    { label: 'Await', body: 'Pourquoi await() existe et comment il fonctionne avec les coroutines.' },
    { label: 'Exceptions', body: 'Comment les exceptions d\'une coroutine se propagent à travers await().' },
    { label: 'Délais', body: 'Borner la durée d\'attente de await() avec timeout().' },
    { label: 'Future', body: "Future et FutureState : la promesse d'un résultat qui n'est pas lié à une coroutine." },
    { label: 'Channels', body: 'Channel : un flux de valeurs entre coroutines, pools de workers et contre-pression.' },
    { label: 'Scope', body: 'Qui possède un groupe de coroutines, les attend et les annule ensemble.' },
    { label: 'PDO Pool', body: "Pourquoi les coroutines ne peuvent pas partager une seule connexion PDO, et comment le pool intégré résout cela de façon transparente." },
    { label: 'TaskGroup', body: 'Un groupe de tâches avec des résultats et les stratégies d\'attente all, race, any.' },
    { label: 'TaskSet', body: 'Un flux de tâches avec nettoyage automatique, joinNext/joinAny/joinAll, et une boucle de supervision.' },
    { label: 'Itérateur concurrent', body: 'iterate() : parcours concurrent d\'une collection en une ligne.' },
    { label: 'Pool', body: 'Async\\Pool : un pool de ressources polyvalent avec vérifications de santé et un disjoncteur.' },
    { label: 'Threads', body: 'spawn_thread et ThreadPool : un vrai parallélisme pour le travail limité par le CPU.' },
    { label: 'Context', body: 'Où conserver « la chose courante » maintenant que les variables globales ne fonctionnent plus.' },
  ],
  server: [
    { label: 'Premier serveur', body: 'Un serveur HTTP dans PHP : HttpServer, HttpServerConfig, et votre premier handler.' },
    { label: 'Requête et réponse', body: 'HttpRequest et HttpResponse : routage, json(), et erreurs via HttpException.' },
    { label: 'Concurrence dans une requête', body: 'TaskGroup dans un handler, le PDO Pool sous charge, et request_context().' },
    { label: 'Flux d\'octets', body: 'send() et sendable(), diffusion du corps de la requête, envoi de fichiers, et sendFile().' },
    { label: 'Fichiers statiques', body: 'StaticHandler : servir des fichiers sans coroutine PHP, mise en cache, et politiques de sécurité.' },
    { label: 'Server-Sent Events', body: 'SSE : un flux d\'événements vers le navigateur, progression d\'import, et battements de cœur via sseComment().' },
    { label: 'WebSocket', body: 'La boucle recv, un salon de discussion, l\'envoi depuis d\'autres coroutines, et trySend face aux clients lents.' },
    { label: 'Workers et HTTP/3', body: 'setWorkers() : les threads sous le capot du serveur, le bootloader, et HTTP/3 sur le même port.' },
    { label: 'Production', body: 'Délais, limites, contre-pression sur accept, compression, journalisation, et arrêt gracieux.' },
    { label: 'gRPC', body: 'addGrpcHandler() : unaire et en flux, readMessage/writeMessage, trailers, et échéances.' },
  ],
  laravelGroup: 'Laravel',
  laravel: [
    { label: 'Premier lancement', body: 'Faire tourner Laravel sous TrueAsync Server et votre première API, des routes jusqu\'à la base de données.' },
    { label: 'Pool et transactions', body: "PDO Pool sous Eloquent et CoroutineTransactions : pourquoi le compteur de transactions imbriquées ne peut pas rester sur une propriété de Connection." },
    { label: 'SSE et gRPC', body: 'trueasync_response(), Sse, et grpc_handlers : atteindre ce qui se trouve derrière l\'Illuminate Response bufferisé, directement depuis un contrôleur.' },
    { label: 'Motifs dangereux', body: "Propriétés statiques mutables, once() sur un singleton, et Number::useLocale() : les fuites d'état classiques entre requêtes, et comment les détecter avec l'analyse statique." },
    { label: 'Packages tiers', body: "Debugbar, Telescope, Inertia, spatie/permission, Socialite : ce qui est déjà adapté pour les coroutines et ce qu'il vaut mieux désactiver." },
  ],
}

export default fr
