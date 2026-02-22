---
layout: architecture
lang: fr
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /fr/architecture/pool.html
page_title: "Architecture d'Async\\Pool"
description: "Conception interne du pool de ressources universel Async\\Pool -- structures de donnees, algorithmes acquire/release, healthcheck, circuit breaker."
---

# Architecture d'Async\Pool

> Cet article decrit la conception interne du pool de ressources universel.
> Si vous cherchez un guide d'utilisation, consultez [Async\Pool](/fr/docs/components/pool.html).
> Pour la couche specifique a PDO, consultez [Architecture du PDO Pool](/fr/architecture/pdo-pool.html).

## Structure de donnees

Le pool est implemente en deux couches : une structure ABI publique dans le noyau PHP
et une structure interne etendue dans l'extension async.

![Structures de donnees du pool](/diagrams/fr/architecture-pool/data-structures.svg)

## Deux chemins de creation

Un pool peut etre cree depuis du code PHP (via le constructeur `Async\Pool`)
ou depuis une extension C (via l'API interne).

| Chemin | Fonction                            | Callbacks                      | Utilise par             |
|--------|-------------------------------------|--------------------------------|-------------------------|
| PHP    | `zend_async_pool_create()`          | `zend_fcall_t*` (PHP callable) | Code utilisateur        |
| API C  | `zend_async_pool_create_internal()` | pointeurs de fonctions         | PDO, autres extensions  |

La difference reside dans `handler_flags`. Lorsque le drapeau est active, le pool appelle la fonction C directement,
contournant le surcout de l'appel d'un callable PHP via `zend_call_function()`.

## Acquire : obtention d'une ressource

![acquire() -- Algorithme interne](/diagrams/fr/architecture-pool/acquire.svg)

### Attente d'une ressource

Lorsque toutes les ressources sont occupees et que `max_size` est atteint, la coroutine se suspend
via `ZEND_ASYNC_SUSPEND()`. Le mecanisme d'attente est similaire aux canaux :

1. Une structure `zend_async_pool_waiter_t` est creee
2. Le waiter est ajoute a la file FIFO `waiters`
3. Un callback de reveil est enregistre
4. Si un timeout est defini -- un timer est enregistre
5. `ZEND_ASYNC_SUSPEND()` -- la coroutine cede le controle

Le reveil se produit lorsqu'une autre coroutine appelle `release()`.

## Release : retour d'une ressource

![release() -- Algorithme interne](/diagrams/fr/architecture-pool/release.svg)

## Healthcheck : surveillance en arriere-plan

Si `healthcheckInterval > 0`, un timer periodique est demarre lors de la creation du pool.
Le timer est integre au reacteur via `ZEND_ASYNC_NEW_TIMER_EVENT`.

![Healthcheck -- Verification periodique](/diagrams/fr/architecture-pool/healthcheck.svg)

Le healthcheck verifie **uniquement** les ressources libres. Les ressources occupees ne sont pas affectees.
Si, apres la suppression des ressources mortes, le total descend en dessous de `min`, le pool cree des remplacements.

## Tampon circulaire

Les ressources libres sont stockees dans un tampon circulaire -- un buffer en anneau a capacite fixe.
La capacite initiale est de 8 elements, etendue au besoin.

Les operations `push` et `pop` s'executent en O(1). Le tampon utilise deux pointeurs (`head` et `tail`),
permettant l'ajout et l'extraction efficaces de ressources sans deplacer d'elements.

## Integration avec le systeme d'evenements

Le pool herite de `zend_async_event_t` et implemente un ensemble complet de gestionnaires d'evenements :

| Gestionnaire   | Fonction                                                       |
|----------------|----------------------------------------------------------------|
| `add_callback` | Enregistrer un callback (pour les waiters)                     |
| `del_callback` | Supprimer un callback                                          |
| `start`        | Demarrer l'evenement (NOP)                                     |
| `stop`         | Arreter l'evenement (NOP)                                      |
| `dispose`      | Nettoyage complet : liberer la memoire, detruire les callbacks |

Cela permet :
- De suspendre et reprendre les coroutines via les callbacks d'evenements
- D'integrer le timer de healthcheck avec le reacteur
- De liberer correctement les ressources via la disposition d'evenement

## Ramasse-miettes

Le wrapper PHP du pool (`async_pool_obj_t`) implemente un `get_gc` personnalise
qui enregistre toutes les ressources du buffer libre comme racines GC.
Cela empeche la collecte prematuree des ressources libres
qui n'ont pas de references explicites depuis le code PHP.

## Circuit Breaker

Le pool implemente l'interface `CircuitBreaker` avec trois etats :

![Etats du Circuit Breaker](/diagrams/fr/architecture-pool/circuit-breaker.svg)

Les transitions peuvent etre manuelles ou automatiques via `CircuitBreakerStrategy` :
- `reportSuccess()` est appele lors d'un `release` reussi (la ressource a passe `beforeRelease`)
- `reportFailure()` est appele lorsque `beforeRelease` a retourne `false`
- La strategie decide quand changer d'etat

## Close : arret du pool

Lorsque le pool est ferme :

1. L'evenement du pool est marque comme CLOSED
2. Le timer de healthcheck est arrete
3. Toutes les coroutines en attente sont reveillees avec une `PoolException`
4. Toutes les ressources libres sont detruites via le `destructeur`
5. Les ressources occupees continuent de vivre -- elles seront detruites lors du `release`

## API C pour les extensions

Les extensions (PDO, Redis, etc.) utilisent le pool a travers des macros :

| Macro                                            | Fonction                          |
|--------------------------------------------------|-----------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | Creer un pool avec des callbacks C |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | Creer un wrapper PHP pour le pool |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | Acquerir une ressource            |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | Liberer une ressource             |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | Fermer le pool                    |

Toutes les macros appellent des pointeurs de fonctions enregistres par l'extension async au chargement.
Cela garantit l'isolation : le noyau PHP ne depend pas de l'implementation specifique du pool.

## Sequence : cycle complet Acquire-Release

![Cycle complet acquire -> utilisation -> release](/diagrams/fr/architecture-pool/full-cycle.svg)

## Et ensuite ?

- [Async\Pool : Guide](/fr/docs/components/pool.html) -- comment utiliser le pool
- [Architecture du PDO Pool](/fr/architecture/pdo-pool.html) -- couche specifique a PDO
- [Coroutines](/fr/docs/components/coroutines.html) -- fonctionnement des coroutines
