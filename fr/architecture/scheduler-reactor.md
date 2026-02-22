---
layout: architecture
lang: fr
path_key: "/architecture/scheduler-reactor.html"
nav_active: architecture
permalink: /fr/architecture/scheduler-reactor.html
page_title: "Scheduler et Reactor"
description: "Conception interne du scheduler de coroutines et du reacteur d'evenements -- files d'attente, changement de contexte, libuv, pool de fiber."
---

# Coroutines, Scheduler et Reactor

Le `Scheduler` et le `Reactor` sont les deux composants principaux du runtime.
Le `Scheduler` gere la file d'attente des coroutines et le changement de contexte,
tandis que le `Reactor` gere les evenements d'`E/S` via la `boucle d'evenements`.

![Interaction entre le Scheduler et le Reactor](/diagrams/fr/architecture-scheduler-reactor/architecture.svg)

## Scheduler

### Coroutine du Scheduler et minimisation des changements de contexte

Dans de nombreuses implementations de coroutines, le `scheduler` utilise un thread separe
ou au moins un contexte d'execution separe. Une coroutine appelle `yield`,
le controle passe au `scheduler`, qui choisit la coroutine suivante et bascule vers elle.
Cela se traduit par **deux** changements de contexte par `suspend`/`resume` : coroutine -> scheduler -> coroutine.

Dans `TrueAsync`, le `Scheduler` possede **sa propre coroutine** (`ZEND_ASYNC_SCHEDULER`)
avec un contexte dedie. Lorsque toutes les coroutines utilisateur dorment et que la file est vide,
le controle est passe a cette coroutine, ou s'execute la boucle principale : `reactor tick`, `microtaches`.

Comme les coroutines utilisent un contexte d'execution complet (pile + registres),
le changement de contexte prend environ 10-20 ns sur un `x86` moderne.
C'est pourquoi `TrueAsync` optimise le nombre de commutations
en permettant a certaines operations de s'executer directement dans le contexte de la coroutine courante, sans basculer vers le scheduler.

Lorsqu'une coroutine appelle une operation `SUSPEND()`, `scheduler_next_tick()` est appele directement dans le contexte de la coroutine courante --
une fonction qui effectue un tick du scheduler : microtaches, reacteur, verification de la file.
S'il y a une coroutine prete dans la file, le `Scheduler` bascule vers elle **directement**,
en contournant sa propre coroutine. C'est un `changement de contexte` au lieu de deux.
De plus, si la prochaine coroutine dans la file n'a pas encore demarre et que la courante a deja termine,
aucun changement n'est necessaire -- la nouvelle coroutine recoit le contexte courant.

La bascule vers la coroutine du `Scheduler` (via `switch_to_scheduler()`) n'intervient **que** si :
- La file de coroutines est vide et le reacteur doit attendre des evenements
- La bascule vers une autre coroutine a echoue
- Un deadlock est detecte

### Boucle principale

![Boucle principale du Scheduler](/diagrams/fr/architecture-scheduler-reactor/scheduler-loop.svg)

A chaque tick, le scheduler effectue :

1. **Microtaches** -- traitement de la file de `microtaches` (petites taches sans changement de contexte)
2. **File de coroutines** -- extraction de la prochaine coroutine de la `coroutine_queue`
3. **Changement de contexte** -- `zend_fiber_switch_context()` vers la coroutine selectionnee
4. **Traitement du resultat** -- verification du statut de la coroutine apres le retour
5. **Reacteur** -- si la file est vide, appel de `ZEND_ASYNC_REACTOR_EXECUTE(no_wait)`

### Microtaches

Chaque action ne merite pas une coroutine. Parfois il faut faire quelque chose de rapide
entre les commutations : mettre a jour un compteur, envoyer une notification, liberer une ressource.
Creer une coroutine pour cela est excessif, mais l'action doit etre effectuee le plus vite possible.
C'est la que les microtaches sont utiles -- des gestionnaires legers qui s'executent
directement dans le contexte de la coroutine courante, sans changement.

Les microtaches doivent etre des gestionnaires legers et rapides car ils ont un acces direct
a la boucle du scheduler. Dans les premieres versions de `TrueAsync`, les microtaches pouvaient resider en PHP, mais
en raison de regles strictes et de considerations de performance, la decision a ete prise de garder ce mecanisme
uniquement pour le code C.

```c
struct _zend_async_microtask_s {
    zend_async_microtask_handler_t handler;
    zend_async_microtask_handler_t dtor;
    bool is_cancelled;
    uint32_t ref_count;
};
```

Dans `TrueAsync`, les microtaches sont traitees via une file FIFO avant chaque commutation de coroutine.
Si une microtache lance une exception, le traitement est interrompu.
Apres execution, la microtache est immediatement retiree de la file, et son compteur de references actives est decremente d'un.

Les microtaches sont utilisees dans des scenarios tels que l'iterateur concurrent, permettant a l'iteration
de se transferer automatiquement a une autre coroutine si la precedente entre en etat d'attente.

### Priorites des coroutines

Sous le capot, `TrueAsync` utilise le type de file le plus simple : un tampon circulaire. C'est probablement la meilleure solution
en termes d'equilibre entre simplicite, performance et fonctionnalite.

Il n'y a aucune garantie que l'algorithme de file ne changera pas a l'avenir. Cela dit, il y a de rares occasions
ou la priorite des coroutines compte.

Actuellement, deux priorites sont utilisees :

```c
typedef enum {
    ZEND_COROUTINE_NORMAL = 0,
    ZEND_COROUTINE_HI_PRIORITY = 255
} zend_coroutine_priority;
```

Les coroutines a haute priorite sont placees **en tete** de la file lors de l'`enqueue`.
L'extraction se fait toujours depuis la tete. Pas de planification complexe,
juste l'ordre d'insertion. C'est une approche simple deliberee : deux niveaux couvrent
les besoins reels, tandis que des files de priorite complexes (comme dans les `RTOS`) ajouteraient un surcout
injustifie dans le contexte des applications PHP.

### Suspend et Resume

![Operations Suspend et Resume](/diagrams/fr/architecture-scheduler-reactor/suspend-resume.svg)

Les operations `Suspend` et `Resume` sont les taches fondamentales du `Scheduler`.

Lorsqu'une coroutine appelle `suspend`, voici ce qui se passe :

1. Les evenements du `waker` de la coroutine sont demarres (`start_waker_events`).
   Ce n'est qu'a ce moment que les timers commencent a compter et que les objets poll
   commencent a ecouter les descripteurs. Avant l'appel a `suspend`, les evenements ne sont pas actifs --
   cela permet de preparer tous les abonnements d'abord, puis de demarrer l'attente avec un seul appel.
2. **Sans changement de contexte**, `scheduler_next_tick()` est appele :
   - Les microtaches sont traitees
   - Un `reactor tick` est effectue (si suffisamment de temps s'est ecoule)
   - S'il y a une coroutine prete dans la file, `execute_next_coroutine()` bascule vers elle
   - Si la file est vide, `switch_to_scheduler()` bascule vers la coroutine du `scheduler`
3. Lorsque le controle revient, la coroutine se reveille avec l'objet `waker` qui contient le resultat du `suspend`.

**Chemin de retour rapide** : si pendant `start_waker_events` un evenement s'est deja declenche
(par exemple, un `Future` est deja termine), la coroutine **n'est pas suspendue du tout** --
le resultat est disponible immediatement. Par consequent, `await` sur un
`Future` termine ne declenche pas de `suspend` et ne provoque pas de changement de contexte, retournant le resultat directement.

## Pool de contextes

Un contexte est une `pile C` complete (`EG(fiber_stack_size)` par defaut).
Puisque la creation de pile est une operation couteuse, `TrueAsync` s'efforce d'optimiser la gestion memoire.
Nous tenons compte du schema d'utilisation memoire : les coroutines meurent et sont creees en permanence.
Le pattern pool est ideal pour ce scenario !

```c
struct _async_fiber_context_s {
    zend_fiber_context context;     // Fiber C native (pile + registres)
    zend_vm_stack vm_stack;         // Pile VM Zend
    zend_execute_data *execute_data;// execute_data courant
    uint8_t flags;                  // Etat de la fiber
};
```

Au lieu de creer et detruire constamment de la memoire, le Scheduler retourne les contextes au pool
et les reutilise encore et encore.

Des algorithmes de gestion intelligente de la taille du pool sont prevus
qui s'adapteront dynamiquement a la charge de travail
pour minimiser a la fois la latence `mmap`/`mprotect` et l'empreinte memoire globale.

### Gestionnaires de commutation

En `PHP`, de nombreux sous-systemes reposent sur une hypothese simple :
le code s'execute du debut a la fin sans interruption.
Le tampon de sortie (`ob_start`), les destructeurs d'objets, les variables globales --
tout cela fonctionne lineairement : debut -> fin.

Les coroutines brisent ce modele. Une coroutine peut dormir au milieu de son travail
et se reveiller apres des milliers d'autres operations. Entre `LEAVE` et `ENTER`
sur le meme thread, des dizaines d'autres coroutines auront tourne.

Les `Switch Handlers` sont des hooks lies a une **coroutine specifique**.
Contrairement aux microtaches (qui se declenchent sur n'importe quel changement),
un `switch handler` est appele uniquement a l'entree et a la sortie de "sa" coroutine :

```c
typedef bool (*zend_coroutine_switch_handler_fn)(
    zend_coroutine_t *coroutine,
    bool is_enter,    // true = entree, false = sortie
    bool is_finishing // true = la coroutine se termine
    // retour : true = conserver le handler, false = le supprimer
);
```

La valeur de retour controle la duree de vie du handler :
* `true` -- le `handler` reste et sera appele a nouveau.
* `false` -- le `Scheduler` le supprimera.

Le `Scheduler` appelle les handlers a trois points :

```c
ZEND_COROUTINE_ENTER(coroutine)  // La coroutine a recu le controle
ZEND_COROUTINE_LEAVE(coroutine)  // La coroutine a cede le controle (suspend)
ZEND_COROUTINE_FINISH(coroutine) // La coroutine se termine definitivement
```

#### Exemple : tampon de sortie

La fonction `ob_start()` utilise une pile de handlers unique.
Lorsqu'une coroutine appelle `ob_start()` puis s'endort, une autre coroutine peut voir le tampon de l'autre si rien n'est fait.
(D'ailleurs, **Fiber** ne gere pas correctement `ob_start()`.)

Un `switch handler` ponctuel resout cela au demarrage de la coroutine :
il deplace le `OG(handlers)` global dans le contexte de la coroutine et vide l'etat global.
Apres cela, chaque coroutine travaille avec son propre tampon, et `echo` dans l'une ne se melange pas avec l'autre.

#### Exemple : destructeurs pendant l'arret

Lorsque `PHP` s'arrete, `zend_objects_store_call_destructors()` est appele --
parcourant le magasin d'objets et appelant les destructeurs. Normalement c'est un processus lineaire.

Mais un destructeur peut contenir `await`. Par exemple, un objet de connexion a la base de donnees
veut fermer correctement la connexion -- ce qui est une operation reseau.
La coroutine appelle `await` dans le destructeur et s'endort.

Les destructeurs restants doivent continuer. Le `switch handler` capture le moment `LEAVE`
et cree une nouvelle coroutine a haute priorite qui continue le parcours
depuis l'objet ou la precedente s'est arretee.

#### Enregistrement

```c
// Ajouter un handler a une coroutine specifique
ZEND_COROUTINE_ADD_SWITCH_HANDLER(coroutine, handler);

// Ajouter a la coroutine courante (ou a la principale si le Scheduler n'a pas demarre)
ZEND_ASYNC_ADD_SWITCH_HANDLER(handler);

// Ajouter un handler qui se declenche au demarrage de la coroutine principale
ZEND_ASYNC_ADD_MAIN_COROUTINE_START_HANDLER(handler);
```

La derniere macro est necessaire pour les sous-systemes qui s'initialisent avant le demarrage du `Scheduler`.
Ils enregistrent un handler globalement, et lorsque le `Scheduler` cree la coroutine `principale`,
tous les handlers globaux sont copies dedans et se declenchent en tant qu'`ENTER`.

## Reactor

### Pourquoi libuv ?

`TrueAsync` utilise `libuv`, la meme bibliotheque qui alimente `Node.js`.

Le choix est delibere. `libuv` fournit :
- Une `API` unifiee pour `Linux` (`epoll`), macOS (`kqueue`), Windows (`IOCP`)
- Un support integre pour les timers, signaux, `DNS`, processus enfants, E/S fichier
- Une base de code mature testee par des milliards de requetes en production

Les alternatives (`libev`, `libevent`, `io_uring`) ont ete envisagees,
mais `libuv` l'emporte en termes d'ergonomie.

### Structure

```c
// Donnees globales du Reactor (dans ASYNC_G)
uv_loop_t uvloop;
bool reactor_started;
uint64_t last_reactor_tick;

// Gestion des signaux
HashTable *signal_handlers;  // signum -> uv_signal_t*
HashTable *signal_events;    // signum -> HashTable* (events)
HashTable *process_events;   // Evenements processus SIGCHLD
```

### Types d'evenements et wrappers

Chaque evenement dans `TrueAsync` a une double nature : une structure `ABI` definie dans le noyau `PHP`,
et un `handle libuv` qui interagit effectivement avec le `systeme d'exploitation`. Le `Reactor` les "colle" ensemble,
creant des wrappers ou les deux mondes coexistent :

| Type d'evenement | Structure ABI                   | Handle libuv                  |
|------------------|---------------------------------|-------------------------------|
| Poll (fd/socket) | `zend_async_poll_event_t`       | `uv_poll_t`                   |
| Timer            | `zend_async_timer_event_t`      | `uv_timer_t`                  |
| Signal           | `zend_async_signal_event_t`     | `uv_signal_t` global          |
| Filesystem       | `zend_async_filesystem_event_t` | `uv_fs_event_t`               |
| DNS              | `zend_async_dns_addrinfo_t`     | `uv_getaddrinfo_t`            |
| Processus        | `zend_async_process_event_t`    | `HANDLE` (Win) / `waitpid`    |
| Thread           | `zend_async_thread_event_t`     | `uv_thread_t`                 |
| Exec             | `zend_async_exec_event_t`       | `uv_process_t` + `uv_pipe_t` |
| Trigger          | `zend_async_trigger_event_t`    | `uv_async_t`                  |

Pour plus de details sur la structure des evenements, consultez [Evenements et modele evenementiel](/fr/architecture/events.html).

### Async IO

Pour les operations en flux, un `async_io_t` unifie est utilise :

```c
struct _async_io_t {
    zend_async_io_t base;   // ABI : event + fd/socket + type + state
    int crt_fd;             // Descripteur de fichier CRT
    async_io_req_t *active_req;
    union {
        uv_stream_t stream;
        uv_pipe_t pipe;
        uv_tty_t tty;
        uv_tcp_t tcp;
        uv_udp_t udp;
        struct { zend_off_t offset; } file;
    } handle;
};
```

La meme interface (`ZEND_ASYNC_IO_READ/WRITE/CLOSE`) fonctionne avec `PIPE`, `FILE`, `TCP`, `UDP`, `TTY`.
L'implementation specifique est selectionnee lors de la creation du handle en fonction du `type`.

### Boucle du Reactor

`reactor_execute(no_wait)` appelle un tick de la `boucle d'evenements` `libuv` :
- `no_wait = true` -- appel non bloquant, traiter uniquement les evenements prets
- `no_wait = false` -- bloquer jusqu'au prochain evenement

Le `Scheduler` utilise les deux modes. Entre les commutations de coroutines -- un tick non bloquant
pour collecter les evenements deja declenches. Lorsque la file de coroutines est vide --
un appel bloquant pour eviter de gaspiller du CPU dans une boucle inactive.

C'est une strategie classique du monde des serveurs evenementiels : `nginx`, `Node.js`,
et `Tokio` utilisent le meme principe : sonder sans attendre tant qu'il y a du travail a faire,
et dormir quand il n'y en a pas.

## Efficacite de la commutation : TrueAsync dans le contexte industriel

### Stackful vs Stackless : deux mondes

Il existe deux approches fondamentalement differentes pour implementer les coroutines :

**Stackful** (Go, Erlang, Java Loom, PHP Fibers) -- chaque coroutine possede sa propre pile C.
La commutation implique la sauvegarde/restauration des registres et du pointeur de pile.
L'avantage principal : la **transparence**. N'importe quelle fonction a n'importe quelle profondeur d'appel peut invoquer `suspend`
sans necessiter d'annotations speciales. Le programmeur ecrit du code synchrone ordinaire.

**Stackless** (Rust async/await, Kotlin, C# async) -- le compilateur transforme une fonction `async`
en machine a etats. La "suspension" est simplement un `return` de la fonction,
et la "reprise" est un appel de methode avec un nouveau numero d'etat. La pile n'est pas commutee du tout.
Le cout : la **"coloration de fonctions"** (`async` infecte toute la chaine d'appels).

| Propriete                                 | Stackful                          | Stackless                         |
|-------------------------------------------|-----------------------------------|-----------------------------------|
| Suspension depuis des appels imbriques    | Oui                               | Non -- uniquement depuis les fonctions `async` |
| Cout de la commutation                    | 15-200 ns (sauvegarde registres)  | 10-50 ns (ecriture de champs dans l'objet) |
| Memoire par coroutine                     | 4-64 KiB (pile separee)           | Taille exacte de la machine a etats |
| Optimisation du compilateur a travers yield | Impossible (pile opaque)         | Possible (inline, HALO)           |

Les `coroutines PHP` sont des coroutines **stackful** basees sur `Boost.Context fcontext_t`.

### Compromis architectural

`TrueAsync` choisit le modele **stackful mono-thread** :

- **Stackful** -- parce que l'ecosysteme `PHP` est immense, et "colorer" des millions de lignes
  de code existant avec `async` est couteux. Les coroutines stackful permettent d'utiliser des fonctions C regulieres, ce qui est une exigence critique pour PHP.
- **Mono-thread** -- PHP est historiquement mono-thread (pas d'etat mutable partage),
  et cette propriete est plus facile a preserver qu'a gerer ses consequences.
  Les threads n'apparaissent que dans le `ThreadPool` pour les taches `CPU-bound`.

Puisque `TrueAsync` reutilise actuellement l'`API Fiber` de bas niveau,
le cout du changement de contexte est relativement eleve et pourrait etre ameliore a l'avenir.

## Arret gracieux

Un script `PHP` peut se terminer a tout moment : une exception non geree, `exit()`,
un signal du systeme d'exploitation. Mais dans le monde async, des dizaines de coroutines peuvent detenir des connexions ouvertes,
des tampons non ecrits et des transactions non validees.

`TrueAsync` gere cela par un arret controle :

1. `ZEND_ASYNC_SHUTDOWN()` -> `start_graceful_shutdown()` -- positionne le drapeau
2. Toutes les coroutines recoivent une `CancellationException`
3. Les coroutines ont la possibilite d'executer les blocs `finally` -- fermer les connexions, vider les tampons
4. `finally_shutdown()` -- nettoyage final des coroutines et microtaches restantes
5. Le Reactor s'arrete

```c
#define TRY_HANDLE_EXCEPTION() \
    if (UNEXPECTED(EG(exception) != NULL)) { \
        if (ZEND_ASYNC_GRACEFUL_SHUTDOWN) { \
            finally_shutdown(); \
            break; \
        } \
        start_graceful_shutdown(); \
    }
```
