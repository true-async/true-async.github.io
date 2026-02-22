---
layout: architecture
lang: fr
path_key: "/architecture.html"
nav_active: architecture
permalink: /fr/architecture.html
page_title: "Architecture"
description: "Conception interne des composants TrueAsync -- pool de ressources, PDO Pool, diagrammes et API C."
---

## Vue d'ensemble

La section architecture decrit la conception interne des composants cles de TrueAsync
au niveau du code C : structures de donnees, algorithmes, integration avec le Zend Engine,
et interaction entre le noyau PHP et l'extension async.

Ces documents sont destines aux developpeurs qui souhaitent comprendre
comment TrueAsync fonctionne "sous le capot" ou qui envisagent de creer leurs propres
extensions.

### [ABI TrueAsync](/fr/architecture/zend-async-api.html)

Le coeur de l'ABI asynchrone : pointeurs de fonctions, systeme d'enregistrement des extensions,
etat global (`zend_async_globals_t`), macros `ZEND_ASYNC_*`,
et versionnage de l'API.

### [Coroutines, Scheduler et Reactor](/fr/architecture/scheduler-reactor.html)

Conception interne du scheduler de coroutines et du reacteur d'evenements :
files d'attente (tampons circulaires), changement de contexte via fiber,
microtaches, boucle d'evenements libuv, pool de contextes fiber, et arret gracieux.

### [Evenements et modele evenementiel](/fr/architecture/events.html)

`zend_async_event_t` -- la structure de donnees de base dont
heritent **toutes** les primitives asynchrones. Systeme de callbacks, comptage de references,
reference d'evenement, drapeaux, hierarchie des types d'evenements.

### [Waker -- Mecanisme d'attente et de reveil](/fr/architecture/waker.html)

Le Waker est le lien entre une coroutine et les evenements.
Statuts, `resume_when`, callbacks de coroutine, transmission des erreurs,
structure `zend_coroutine_t`, et gestionnaires de commutation.

### [Ramasse-miettes en contexte asynchrone](/fr/architecture/async-gc.html)

Comment le GC de PHP fonctionne avec les coroutines, les portees et les contextes : gestionnaires `get_gc`,
parcours de la pile fiber, coroutines zombies, contexte hierarchique,
et protection contre les references circulaires.

## Composants

### [Async\Pool](/fr/architecture/pool.html)

Pool de ressources universel. Sujets couverts :
- Structure de donnees a deux niveaux (ABI dans le noyau + interne dans l'extension)
- Algorithmes acquire/release avec une file FIFO de coroutines en attente
- Verification de sante via un timer periodique
- Circuit Breaker avec trois etats
- API C pour les extensions (macros `ZEND_ASYNC_POOL_*`)

### [PDO Pool](/fr/architecture/pdo-pool.html)

Couche specifique a PDO au-dessus d'`Async\Pool`. Sujets couverts :
- Connexion modele et creation differee des connexions reelles
- Liaison des connexions aux coroutines via HashTable
- Verrouillage durant les transactions et instructions actives
- Rollback automatique et nettoyage a la fin de la coroutine
- Gestion des identifiants dans la fabrique
