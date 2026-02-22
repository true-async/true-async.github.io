---
layout: architecture
lang: fr
path_key: "/architecture/pdo-pool.html"
nav_active: architecture
permalink: /fr/architecture/pdo-pool.html
page_title: "Architecture du PDO Pool"
description: "Conception interne du PDO Pool -- composants, cycle de vie des connexions, liaison aux coroutines, gestion des identifiants."
---

# Architecture du PDO Pool

> Cet article decrit la conception interne du PDO Pool.
> Si vous cherchez un guide d'utilisation, consultez [PDO Pool : Pool de connexions](/fr/docs/components/pdo-pool.html).

## Architecture a deux niveaux

Le PDO Pool est compose de deux couches :

**1. Noyau PDO (`pdo_pool.c`)** -- logique de liaison des connexions aux coroutines,
gestion des transactions, comptage de references des instructions.

**2. Async Pool (`zend_async_pool_t`)** -- le pool de ressources universel de l'extension async.
Gere la file d'attente des connexions libres, les limites et les verifications de sante.
Il ne sait rien de PDO -- il travaille avec des valeurs `zval` abstraites.

Cette separation permet d'utiliser le meme mecanisme de pool
pour n'importe quelles ressources, pas seulement les bases de donnees.

## Diagramme des composants

![PDO Pool -- Composants](/diagrams/fr/architecture-pdo-pool/components.svg)

## Connexion modele

Lors de la creation d'un `PDO` avec un pool, le noyau **n'ouvre pas** de connexion TCP reelle.
A la place, un **modele** est cree -- un objet `pdo_dbh_t` qui stocke
le DSN, le nom d'utilisateur, le mot de passe et une reference au pilote. Toutes les connexions reelles sont creees plus tard,
a la demande, sur la base de ce modele.

Pour le modele, `db_handle_init_methods()` est appele a la place de `db_handle_factory()`.
Cette methode definit la table des methodes du pilote (`dbh->methods`)
mais ne cree pas de connexion TCP et n'alloue pas de `driver_data`.

## Cycle de vie d'une connexion

![Cycle de vie d'une connexion dans le pool](/diagrams/fr/architecture-pdo-pool/lifecycle.svg)

## Creation d'une connexion depuis le pool (Sequence)

![Creation d'une connexion depuis le pool](/diagrams/fr/architecture-pdo-pool/connection-sequence.svg)

## API interne

### pdo_pool.c -- Fonctions publiques

| Fonction                   | Fonction                                                           |
|----------------------------|--------------------------------------------------------------------|
| `pdo_pool_create()`        | Cree un pool pour `pdo_dbh_t` base sur les attributs du constructeur |
| `pdo_pool_destroy()`       | Libere toutes les connexions, ferme le pool, vide la table de hachage |
| `pdo_pool_acquire_conn()`  | Retourne une connexion pour la coroutine courante (reutilisation ou acquisition) |
| `pdo_pool_peek_conn()`     | Retourne la connexion liee sans acquisition (NULL si aucune)       |
| `pdo_pool_maybe_release()` | Retourne la connexion au pool si pas de transaction ou d'instructions |
| `pdo_pool_get_wrapper()`   | Retourne l'objet PHP `Async\Pool` pour la methode `getPool()`     |

### pdo_pool.c -- Callbacks internes

| Callback                    | Quand il est appele                                              |
|-----------------------------|------------------------------------------------------------------|
| `pdo_pool_factory()`        | Le pool a besoin d'une nouvelle connexion (acquire quand le pool est vide) |
| `pdo_pool_destructor()`     | Le pool detruit une connexion (a la fermeture ou a l'eviction)   |
| `pdo_pool_healthcheck()`    | Verification periodique -- la connexion est-elle toujours active ? |
| `pdo_pool_before_release()` | Avant le retour au pool -- rollback des transactions non validees |
| `pdo_pool_free_conn()`      | Ferme la connexion du pilote, libere la memoire                  |

### Liaison a une coroutine

Les connexions sont liees aux coroutines via une table de hachage `pool_connections`,
ou la cle est l'identifiant de la coroutine et la valeur est un pointeur vers `pdo_dbh_t`.

L'identifiant de la coroutine est calcule par la fonction `pdo_pool_coro_key()` :
- Si la coroutine est un objet PHP -- `zend_object.handle` (uint32_t sequentiel) est utilise
- Pour les coroutines internes -- l'adresse du pointeur decalee de `ZEND_MM_ALIGNMENT_LOG2`

### Nettoyage a la fin de la coroutine

Lorsqu'une connexion est liee a une coroutine, un `pdo_pool_cleanup_callback` est enregistre
via `coro->event.add_callback()`. Lorsque la coroutine se termine (normalement ou avec une erreur),
le callback retourne automatiquement la connexion au pool. Cela garantit l'absence de fuites de connexions
meme en cas d'exceptions non gerees.

### Verrouillage : blocage de connexion

Une connexion est verrouillee a une coroutine et ne retournera pas au pool si au moins une condition est remplie :

- `conn->in_txn == true` -- une transaction active
- `conn->pool_slot_refcount > 0` -- il existe des instructions actives (`PDOStatement`) utilisant cette connexion

Le compteur de references est incremente lors de la creation d'une instruction et decremente lors de sa destruction.
Lorsque les deux conditions sont levees, `pdo_pool_maybe_release()` retourne la connexion au pool.

## Gestion des identifiants dans la fabrique

Lors de la creation d'une nouvelle connexion, `pdo_pool_factory()` **copie** les
chaines DSN, nom d'utilisateur et mot de passe du modele via `estrdup()`. Cela est necessaire car
les pilotes peuvent modifier ces champs durant `db_handle_factory()` :

- **PostgreSQL** -- remplace les `;` par des espaces dans `data_source`
- **MySQL** -- alloue `username`/`password` depuis le DSN s'ils n'ont pas ete passes
- **ODBC** -- reconstruit completement `data_source`, en y integrant les identifiants

Apres un appel reussi a `db_handle_factory()`, les copies sont liberees via `efree()`.
En cas d'erreur, la liberation se fait via `pdo_pool_free_conn()`,
qui est egalement utilise par le destructeur du pool.

## Incompatibilite avec les connexions persistantes

Les connexions persistantes (`PDO::ATTR_PERSISTENT`) sont incompatibles avec le pool.
Une connexion persistante est liee au processus et survit entre les requetes,
tandis que le pool cree des connexions au niveau de la requete avec gestion automatique du cycle de vie.
Tenter d'activer les deux attributs simultanement provoquera une erreur.

## Et ensuite ?

- [PDO Pool : Pool de connexions](/fr/docs/components/pdo-pool.html) -- guide d'utilisation
- [Coroutines](/fr/docs/components/coroutines.html) -- fonctionnement des coroutines
- [Scope](/fr/docs/components/scope.html) -- gestion des groupes de coroutines
