---
layout: architecture
lang: fr
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /fr/architecture/events.html
page_title: "Evenements et modele evenementiel"
description: "La structure de base zend_async_event_t -- fondement de toutes les operations asynchrones, systeme de callbacks, drapeaux, hierarchie des evenements."
---

# Evenements et modele evenementiel

Un evenement (`zend_async_event_t`) est une structure universelle
dont **toutes** les primitives asynchrones heritent :
coroutines, `future`, canaux, timers, evenements `poll`, signaux, et autres.

L'interface evenementielle unifiee permet :
- De s'abonner a n'importe quel evenement via un callback
- De combiner des evenements heterogenes dans une attente unique
- De gerer le cycle de vie par comptage de references

## Structure de base

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // Decalage vers les donnees supplementaires

    union {
        uint32_t ref_count;          // Pour les objets C
        uint32_t zend_object_offset; // Pour les objets Zend
    };

    uint32_t loop_ref_count;         // Compteur de references de la boucle d'evenements

    zend_async_callbacks_vector_t callbacks;

    // Methodes
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // Nullable
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // Nullable
    zend_async_event_callbacks_notify_t notify_handler; // Nullable
};
```

### Methodes virtuelles d'un evenement

Chaque evenement possede un petit ensemble de methodes virtuelles.

| Methode          | Fonction                                           |
|------------------|----------------------------------------------------|
| `add_callback`   | Abonner un callback a l'evenement                  |
| `del_callback`   | Desabonner un callback                             |
| `start`          | Activer l'evenement dans le reacteur               |
| `stop`           | Desactiver l'evenement                             |
| `replay`         | Re-transmettre le resultat (pour futures, coroutines) |
| `dispose`        | Liberer les ressources                             |
| `info`           | Description textuelle de l'evenement (pour le debogage) |
| `notify_handler` | Hook appele avant de notifier les callbacks        |

#### `add_callback`

Ajoute un callback au tableau dynamique `callbacks` de l'evenement.
Appelle `zend_async_callbacks_push()`,
qui incremente le `ref_count` du callback et ajoute le pointeur au vecteur.

#### `del_callback`

Supprime un callback du vecteur (O(1) via echange avec le dernier element)
et appelle `callback->dispose`.

Scenario typique : lors d'une attente `select` sur plusieurs evenements,
lorsqu'un se declenche, les autres sont desabonnes via `del_callback`.

#### `start`

Les methodes `start` et `stop` sont destinees aux evenements qui peuvent etre places dans l'`EventLoop`.
C'est pourquoi toutes les primitives n'implementent pas cette methode.

Pour les evenements EventLoop, `start` incremente le `loop_ref_count`, ce qui permet
a l'evenement de rester dans l'EventLoop tant que quelqu'un en a besoin.

| Type                                           | Ce que fait `start`                                                      |
|------------------------------------------------|--------------------------------------------------------------------------|
| Coroutine, `Future`, `Channel`, `Pool`, `Scope` | Ne fait rien                                                            |
| Timer                                          | `uv_timer_start()` + incremente `loop_ref_count` et `active_event_count` |
| Poll                                           | `uv_poll_start()` avec masque d'evenements (READABLE/WRITABLE)           |
| Signal                                         | Enregistre l'evenement dans la table globale des signaux                 |
| IO                                             | Incremente `loop_ref_count` -- le flux libuv demarre via read/write      |

#### `stop`

La methode miroir de `start`. Decremente le `loop_ref_count` pour les evenements de type EventLoop.
Le dernier appel `stop` (lorsque `loop_ref_count` atteint 0) arrete effectivement le `handle`.

#### `replay`

Permet aux abonnes tardifs de recevoir le resultat d'un evenement deja termine.
Implemente uniquement par les types qui stockent un resultat.

| Type         | Ce que retourne `replay`                         |
|--------------|--------------------------------------------------|
| **Coroutine** | `coroutine->result` et/ou `coroutine->exception` |
| **Future**   | `future->result` et/ou `future->exception`       |

Si un `callback` est fourni, il est appele de maniere synchrone avec le resultat.
Si `result`/`exception` est fourni, les valeurs sont copiees aux pointeurs.
Sans `replay`, attendre un evenement ferme produit un avertissement.

#### `dispose`

Cette methode tente de liberer l'evenement en decrementant son `ref_count`.
Si le compteur atteint zero, la desallocation effective des ressources est declenchee.

#### `info`

Une chaine lisible par l'humain pour le debogage et la journalisation.

| Type                 | Exemple de chaine                                                        |
|----------------------|--------------------------------------------------------------------------|
| **Coroutine**        | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` ou `"FutureState(pending)"`                   |
| **Iterator**         | `"iterator-completion"`                                                  |


#### `notify_handler`

Un hook qui intercepte la notification **avant** que les callbacks recoivent le resultat.
Par defaut `NULL` pour tous les evenements. Utilise dans `Async\Timeout` :

## Cycle de vie d'un evenement

![Cycle de vie d'un evenement](/diagrams/fr/architecture-events/lifecycle.svg)

Un evenement passe par plusieurs etats :
- **Cree** -- memoire allouee, `ref_count = 1`, les callbacks peuvent etre abonnes
- **Actif** -- enregistre dans l'`EventLoop` (`start()`), incremente `active_event_count`
- **Declenche** -- `libuv` a appele le callback. Pour les evenements periodiques (timer, poll) -- retour a **Actif**. Pour les evenements ponctuels (DNS, exec, Future) -- transition vers **Ferme**
- **Arrete** -- temporairement retire de l'`EventLoop` (`stop()`), peut etre reactive
- **Ferme** -- `flags |= F_CLOSED`, l'abonnement n'est plus possible, lorsque `ref_count = 0` est atteint, `dispose` est appele

## Interaction : Evenement, Callback, Coroutine

![Evenement -> Callback -> Coroutine](/diagrams/fr/architecture-events/callback-flow.svg)

## Double vie : objet C et objet Zend

Les evenements vivent souvent dans deux mondes simultanement.
Un timer, un `handle` `poll`, ou une requete `DNS` est un objet `C` interne gere par le `Reactor`.
Mais une coroutine ou un `Future` est aussi un objet `PHP` accessible depuis le code utilisateur.

Les structures C dans l'`EventLoop` peuvent vivre plus longtemps que les objets `PHP` qui les referencent, et vice versa.
Les objets C utilisent `ref_count`, tandis que les objets `PHP` utilisent `GC_ADDREF/GC_DELREF`
avec le ramasse-miettes.

C'est pourquoi `TrueAsync` prend en charge plusieurs types de liaisons entre les objets PHP et les objets C.

### Objet C

Les evenements internes invisibles depuis le code PHP utilisent le champ `ref_count`.
Lorsque le dernier proprietaire libere la reference, `dispose` est appele :

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + dispose lorsque 0 est atteint
```

### Objet Zend

Une coroutine est un objet `PHP` implementant l'interface `Awaitable`.
Au lieu de `ref_count`, ils utilisent le champ `zend_object_offset`,
qui pointe vers le decalage de la structure `zend_object`.

Les macros `ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` fonctionnent correctement dans tous les cas.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

Le `zend_object` fait partie de la structure C de l'evenement
et peut etre recupere en utilisant `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT`.

```c
// Obtenir l'evenement depuis l'objet PHP (en tenant compte de la reference de l'evenement)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// Obtenir l'objet PHP depuis l'evenement
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## Reference d'evenement

Certains evenements font face a un probleme architectural : ils ne peuvent pas etre directement des objets `Zend`.

Par exemple, un timer. Le `GC` de `PHP` peut decider de collecter l'objet a tout moment, mais `libuv` exige
la fermeture asynchrone du handle via `uv_close()` avec un callback. Si le `GC` appelle le destructeur
alors que `libuv` n'a pas fini de travailler avec le handle, on obtient un `use-after-free`.

Dans ce cas, l'approche **Event Reference** est utilisee : l'objet `PHP` stocke non pas l'evenement lui-meme, mais un pointeur vers celui-ci :

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // Pointeur vers l'evenement reel
} zend_async_event_ref_t;
```

Avec cette approche, les durees de vie de l'objet `PHP` et de l'evenement C sont **independantes**.
L'objet `PHP` peut etre collecte par le `GC` sans affecter le `handle`,
et le `handle` se fermera de maniere asynchrone lorsqu'il sera pret.

La macro `ZEND_ASYNC_OBJECT_TO_EVENT()` reconnait automatiquement une reference
par le prefixe `flags` et suit le pointeur.

## Systeme de callbacks

L'abonnement aux evenements est le mecanisme principal d'interaction entre les coroutines et le monde exterieur.
Lorsqu'une coroutine veut attendre un timer, des donnees d'un socket, ou l'achevement d'une autre coroutine,
elle enregistre un `callback` sur l'evenement correspondant.

Chaque evenement stocke un tableau dynamique d'abonnes :

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // Pointeur vers l'index de l'iterateur actif (ou NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` resout le probleme de la suppression securisee des callbacks pendant l'iteration.

### Structure d'un callback

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

Un callback est egalement une structure a comptage de references. Cela est necessaire car un seul `callback`
peut etre reference a la fois par le vecteur de l'evenement et par le `waker` de la coroutine.
Le `ref_count` garantit que la memoire n'est liberee que lorsque les deux cotes ont relache leur reference.

### Callback de coroutine

La plupart des callbacks dans `TrueAsync` sont utilises pour reveiller une coroutine.
C'est pourquoi ils stockent des informations sur la coroutine et l'evenement auquel ils se sont abonnes :

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // Heritage
    zend_coroutine_t *coroutine;         // Qui reveiller
    zend_async_event_t *event;           // D'ou il provient
};
```

Cette liaison est la base du mecanisme [Waker](/fr/architecture/waker.html) :

## Drapeaux d'evenement

Les drapeaux binaires dans le champ `flags` controlent le comportement de l'evenement a chaque etape de son cycle de vie :

| Drapeau               | Fonction                                                                         |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | Evenement termine. `start`/`stop` ne fonctionnent plus, l'abonnement est impossible |
| `F_RESULT_USED`       | Quelqu'un attend le resultat -- pas besoin d'avertissement de resultat non utilise |
| `F_EXC_CAUGHT`        | L'erreur sera capturee -- supprimer l'avertissement d'exception non geree        |
| `F_ZVAL_RESULT`       | Le resultat dans le callback est un pointeur vers `zval` (pas `void*`)           |
| `F_ZEND_OBJ`          | L'evenement est un objet `Zend` -- bascule `ref_count` vers `GC_ADDREF`          |
| `F_NO_FREE_MEMORY`    | `dispose` ne doit pas liberer la memoire (l'objet n'a pas ete alloue via `emalloc`) |
| `F_EXCEPTION_HANDLED` | L'exception a ete geree -- pas besoin de la relancer                             |
| `F_REFERENCE`         | La structure est une `Event Reference`, pas un evenement reel                    |
| `F_OBJ_REF`           | A `extra_offset` il y a un pointeur vers `zend_object`                           |
| `F_CLOSE_FD`          | Fermer le descripteur de fichier lors de la destruction                           |
| `F_HIDDEN`            | Evenement cache -- ne participe pas a la `Detection de deadlock`                 |

### Detection de deadlock

`TrueAsync` suit le nombre d'evenements actifs dans l'`EventLoop` via `active_event_count`.
Lorsque toutes les coroutines sont suspendues et qu'il n'y a pas d'evenements actifs -- c'est un `deadlock` :
aucun evenement ne peut reveiller aucune coroutine.

Mais certains evenements sont toujours presents dans l'`EventLoop` et ne sont pas lies a la logique utilisateur :
timers de `healthcheck` en arriere-plan, gestionnaires systeme. S'ils sont comptes comme "actifs",
la `detection de deadlock` ne se declenchera jamais.

Pour de tels evenements, le drapeau `F_HIDDEN` est utilise :

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // Marquer comme cache
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, mais seulement si NON cache
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, mais seulement si NON cache
```

## Hierarchie des evenements

En `C` il n'y a pas d'heritage de classes, mais il existe une technique : si le premier champ d'une structure
est `zend_async_event_t`, alors un pointeur vers la structure peut etre converti en toute securite
en un pointeur vers `zend_async_event_t`. C'est exactement ainsi que tous les evenements specialises
"heritent" de la base :

```
zend_async_event_t
|-- zend_async_poll_event_t      -- scrutation fd/socket
|   \-- zend_async_poll_proxy_t  -- proxy pour le filtrage d'evenements
|-- zend_async_timer_event_t     -- timers (ponctuels et periodiques)
|-- zend_async_signal_event_t    -- signaux POSIX
|-- zend_async_process_event_t   -- attente de la terminaison d'un processus
|-- zend_async_thread_event_t    -- threads en arriere-plan
|-- zend_async_filesystem_event_t -- modifications du systeme de fichiers
|-- zend_async_dns_nameinfo_t    -- DNS inverse
|-- zend_async_dns_addrinfo_t    -- resolution DNS
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- socket serveur TCP
|-- zend_async_trigger_event_t   -- reveil manuel (inter-thread securise)
|-- zend_async_task_t            -- tache du pool de threads
|-- zend_async_io_t              -- E/S unifiees
|-- zend_coroutine_t             -- coroutine
|-- zend_future_t                -- future
|-- zend_async_channel_t         -- canal
|-- zend_async_group_t           -- groupe de taches
|-- zend_async_pool_t            -- pool de ressources
\-- zend_async_scope_t           -- portee
```

Grace a cela, un `Waker` peut s'abonner a **n'importe lequel** de ces evenements
avec le meme appel `event->add_callback`, sans connaitre le type specifique.

### Exemples de structures specialisees

Chaque structure ajoute a l'evenement de base uniquement les champs
specifiques a son type :

**Timer** -- extension minimale :
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // Millisecondes
    bool is_periodic;
};
```

**Poll** -- suivi des E/S sur un descripteur :
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // Quoi surveiller : READABLE|WRITABLE|...
    async_poll_event triggered_events; // Ce qui s'est reellement passe
};
```

**Filesystem** -- surveillance du systeme de fichiers :
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // Quel fichier a change
};
```

**Exec** -- execution de commandes externes :
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

Imaginez une situation : deux coroutines sur un seul socket TCP -- l'une lit, l'autre ecrit.
Elles ont besoin d'evenements differents (`READABLE` vs `WRITABLE`), mais le socket est unique.

`Poll Proxy` resout ce probleme. Au lieu de creer deux handles `uv_poll_t`
pour le meme fd (ce qui est impossible dans `libuv`), un seul `poll_event` est cree
avec plusieurs proxies ayant des masques differents :

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // Poll parent
    async_poll_event events;               // Sous-ensemble d'evenements pour ce proxy
    async_poll_event triggered_events;     // Ce qui s'est declenche
};
```

Le `Reactor` agregue les masques de tous les proxies actifs et passe le masque combine a `uv_poll_start`.
Lorsque `libuv` signale un evenement, le `Reactor` verifie chaque proxy
et ne notifie que ceux dont le masque correspond.

## Async IO

Pour les operations d'E/S en flux (lecture d'un fichier, ecriture dans un socket, travail avec des pipes),
`TrueAsync` fournit un `handle` unifie :

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // Pour PIPE/FILE
        zend_socket_t socket;        // Pour TCP/UDP
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

La meme interface `ZEND_ASYNC_IO_READ/WRITE/CLOSE` fonctionne avec n'importe quel type,
et l'implementation specifique est selectionnee lors de la creation du `handle` en fonction du `type`.

Toutes les operations d'E/S sont asynchrones et retournent un `zend_async_io_req_t` -- une requete ponctuelle :

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // Erreur d'operation (ou NULL)
    char *buf;                 // Tampon de donnees
    bool completed;            // Operation terminee ?
    void (*dispose)(zend_async_io_req_t *req);
};
```

Une coroutine appelle `ZEND_ASYNC_IO_READ`, recoit un `req`,
s'abonne a son achevement via le `Waker`, et s'endort.
Lorsque `libuv` termine l'operation, `req->completed` devient `true`,
le callback reveille la coroutine, et elle recupere les donnees depuis `req->buf`.
