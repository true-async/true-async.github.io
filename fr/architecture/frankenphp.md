---
layout: architecture
lang: fr
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /fr/architecture/frankenphp.html
page_title: "Integration FrankenPHP"
description: "Comment TrueAsync transforme FrankenPHP en serveur entierement asynchrone -- une coroutine par requete, reponses zero-copie, double chemin de notification."
---

# TrueAsync + FrankenPHP : Plusieurs requetes, un seul thread

Dans cet article, nous examinons l'experience d'integration de `FrankenPHP` avec `TrueAsync`.
`FrankenPHP` est un serveur base sur `Caddy` qui execute du code `PHP` a l'interieur d'un processus `Go`.
Nous avons ajoute le support de `TrueAsync` a `FrankenPHP`, permettant a chaque thread `PHP` de traiter plusieurs requetes simultanement,
en utilisant les coroutines de `TrueAsync` pour l'orchestration.

## Comment fonctionne FrankenPHP

`FrankenPHP` est un processus qui regroupe le monde `Go` (`Caddy`) et `PHP` ensemble.
`Go` possede le processus, tandis que `PHP` agit comme un "plugin" avec lequel `Go` interagit via `SAPI`.
Pour que cela fonctionne, la machine virtuelle `PHP` s'execute dans un thread separe. `Go` cree ces threads
et appelle les fonctions `SAPI` pour executer du code `PHP`.

Pour chaque requete, `Caddy` cree une goroutine separee qui gere la requete HTTP.
La goroutine selectionne un thread `PHP` libre dans le pool et envoie les donnees de la requete via un canal,
puis entre dans un etat d'attente.

Lorsque `PHP` a fini de former la reponse, la goroutine la recoit via le canal et la renvoie a `Caddy`.

Nous avons modifie cette approche pour que les goroutines envoient desormais plusieurs requetes au meme thread `PHP`,
et que le thread `PHP` apprenne a traiter ces requetes de maniere asynchrone.

### Architecture generale

![Architecture generale FrankenPHP + TrueAsync](/diagrams/fr/architecture-frankenphp/architecture.svg)

Le diagramme montre trois couches. Examinons chacune d'entre elles.

### Integration de Go dans le Scheduler TrueAsync

Pour que l'application fonctionne, le `Reactor` et le `Scheduler` PHP doivent etre integres avec `Caddy`.
Nous avons donc besoin d'un mecanisme de communication inter-thread compatible
avec les mondes `Go` et `PHP`. Les canaux `Go` sont excellents pour le transfert de donnees entre threads
et sont accessibles depuis `C-Go`. Mais ils ne sont pas suffisants, car le cycle `EventLoop` peut s'endormir.

Il existe une approche ancienne et bien connue
que l'on retrouve dans presque tous les serveurs web : une combinaison d'un canal de transfert
et d'un `fdevent` (sur macOS/Windows un `pipe` est utilise).

Si le canal n'est pas vide, `PHP` sera en train de le lire, donc on ajoute simplement une autre valeur.
Si le canal est vide, le thread `PHP` dort et doit etre reveille. C'est a cela que sert `Notify()`.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- l'option la plus rapide
        // ...
    }
    // Fallback : pipe pour macOS/BSD
    syscall.Pipe(fds[:])
}
```

Cote `PHP`, le descripteur `eventfd` est enregistre dans le `Reactor` :

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

Le `Reactor` (base sur `libuv`) commence a surveiller le descripteur. Des que `Go` ecrit
dans `eventfd`, le `Reactor` se reveille et appelle le callback de traitement des requetes.

Maintenant, lorsqu'une goroutine empaquete les donnees de la requete
dans une structure `contextHolder` et les transmet au `Dispatcher` pour livraison au thread `PHP`.
Le `Dispatcher` parcourt les threads `PHP` en round-robin
et tente d'envoyer le contexte de la requete au
canal `Go` avec tampon (`requestChan`) lie a un thread specifique.
Si le tampon est plein, le `Dispatcher` essaie le thread suivant.
Si tous sont occupes -- le client recoit `HTTP 503`.

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

### Integration avec le Scheduler

Lorsque `FrankenPHP` s'initialise et cree les threads `PHP`,
il s'integre avec le `Reactor`/`Scheduler` en utilisant l'`ABI True Async` (`zend_async_API.h`).

La fonction `frankenphp_enter_async_mode()` est responsable de ce processus et est appelee une fois
lorsque le script `PHP` enregistre un callback via `HttpServer::onRequest()` :

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Obtenir le FD du notificateur depuis Go
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. Enregistrer le FD dans le Reactor (chemin lent)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. Lancer le Scheduler
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. Remplacer le gestionnaire heartbeat (chemin rapide)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. Suspendre la coroutine principale
    frankenphp_suspend_main_coroutine();

    // --- on arrive ici seulement a l'arret ---

    // 6. Restaurer le gestionnaire heartbeat
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. Liberer les ressources
    close_request_event();
}
```

Nous utilisons un `gestionnaire heartbeat`, un callback special du `Scheduler`, pour ajouter notre propre gestionnaire
a chaque tick du `Scheduler`. Ce gestionnaire permet a `FrankenPHP` de creer de nouvelles
coroutines pour le traitement des requetes.

![Systeme de double notification](/diagrams/fr/architecture-frankenphp/notification.svg)

Maintenant le `Scheduler` appelle le `gestionnaire heartbeat` a chaque tick. Ce gestionnaire
verifie le canal `Go` via `CGo` :

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

Pas d'appels systeme, pas d'`epoll_wait`, un appel direct a une fonction `Go` via `CGo`.
Retour instantane si le canal est vide.
L'operation la moins couteuse possible, ce qui est une exigence obligatoire pour le `gestionnaire heartbeat`.

Si toutes les coroutines dorment, le `Scheduler` passe le controle au `Reactor`,
et le `heartbeat` cesse de battre. Alors l'`AsyncNotifier` entre en jeu :
le `Reactor` attend sur `epoll`/`kqueue` et se reveille lorsque `Go` ecrit dans le descripteur.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

Les deux systemes se completent : le `heartbeat` fournit une latence minimale sous charge,
tandis que l'`evenement poll` garantit une consommation `CPU` nulle en periode d'inactivite.

### Creation d'une coroutine de requete

La fonction `frankenphp_request_coroutine_entry()` est responsable de la creation de la coroutine de traitement de requete :

![Cycle de vie d'une requete](/diagrams/fr/architecture-frankenphp/request-lifecycle.svg)

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

Un **`Scope` separe** est cree pour chaque requete. C'est un contexte isole
qui permet de controler le cycle de vie de la coroutine et de ses ressources.
Lorsqu'un `Scope` se termine, toutes les coroutines qu'il contient sont annulees.

### Interaction avec le code PHP

Pour creer des coroutines, `FrankenPHP` doit connaitre la fonction de traitement.
La fonction de traitement doit etre definie par le programmeur PHP.
Cela necessite du code d'initialisation cote `PHP`. La fonction `HttpServer::onRequest()`
sert d'initialiseur, enregistrant un callback `PHP` pour le traitement des requetes `HTTP`.

Du cote `PHP`, tout parait simple :

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

L'initialisation se fait dans la coroutine principale.
Le programmeur doit creer un objet `HttpServer`, appeler `onRequest()`, et "demarrer" explicitement le serveur.
Apres cela, `FrankenPHP` prend le controle et bloque la coroutine principale jusqu'a l'arret du serveur.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // toujours false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

Pour renvoyer les resultats a `Caddy`, le code `PHP` utilise l'objet `Response`,
qui fournit les methodes `write()` et `end()`.
Sous le capot, la memoire est copiee et les resultats sont envoyes au canal.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## Code source

Le depot d'integration est un fork de `FrankenPHP` avec la branche `true-async` :

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) -- depot d'integration

Fichiers cles :

| Fichier                                                                                                     | Description                                                                  |
|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | Integration avec `Scheduler`/`Reactor` : heartbeat, evenement poll, creation de coroutine |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | Classes PHP `HttpServer`, `Request`, `Response`                               |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Cote Go : `round-robin`, `requestChan`, `responseChan`, exports `CGo`        |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier` : `eventfd` (Linux) / `pipe` (macOS)                         |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | Documentation de l'integration                                                |

ABI TrueAsync utilisee par l'integration :

| Fichier                                                                                                  | Description                                            |
|----------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.h) | Definition de l'API : macros, pointeurs de fonctions, types |
| [`Zend/zend_async_API.c`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.c) | Infrastructure : enregistrement, implementations de substitution |
