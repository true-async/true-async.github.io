---
layout: page
lang: fr
path_key: "/motivation.html"
nav_active: motivation
permalink: /fr/motivation.html
page_title: "Motivation"
description: "Pourquoi PHP a besoin de capacités asynchrones intégrées"
---

## Pourquoi PHP a-t-il besoin d'asynchronie ?

`PHP` est l'un des derniers grands langages à ne pas disposer de support intégré
pour l'exécution concurrente **au niveau du langage**. Python a `asyncio`, `JavaScript` est nativement
construit sur une boucle d'événements, `Go` a les goroutines, `Kotlin` a les coroutines. `PHP` reste
dans le paradigme « une requête — un processus », alors que la plupart
des applications réelles passent l'essentiel de leur temps à attendre les `I/O` (`IO Bound`).

## Le problème de la fragmentation

Aujourd'hui, l'asynchronie en `PHP` est réalisée via des extensions : `Swoole`, `AMPHP`, `ReactPHP`.
Chacune crée **son propre écosystème** avec des `APIs` incompatibles,
ses propres pilotes de bases de données, clients `HTTP` et serveurs.

Cela engendre des problèmes critiques :

- **Duplication de code** — chaque extension est contrainte de réécrire les pilotes
  pour `MySQL`, `PostgreSQL`, `Redis` et d'autres systèmes
- **Incompatibilité** — une bibliothèque écrite pour `Swoole` ne fonctionne pas avec `AMPHP`,
  et inversement
- **Limitations** — les extensions ne peuvent pas rendre les fonctions standard de `PHP`
  (`file_get_contents`, `fread`, `curl_exec`) non bloquantes,
  car elles n'ont pas accès au cœur
- **Barrière à l'entrée** — les développeurs doivent apprendre un écosystème séparé
  au lieu d'utiliser des outils familiers

## La solution : intégration dans le cœur

`TrueAsync` propose une approche différente — **l'asynchronie au niveau du cœur de PHP**.
Cela signifie :

### Transparence

Le code synchrone existant fonctionne dans les coroutines sans modification.
`file_get_contents()`, `PDO::query()`, `curl_exec()` — toutes ces fonctions
deviennent automatiquement non bloquantes lorsqu'elles sont exécutées dans une coroutine.

```php
// Ce code s'exécute déjà de manière concurrente !
spawn(function() {
    $data = file_get_contents('https://api.example.com/users');
    // la coroutine se suspend pendant la requête HTTP,
    // les autres coroutines continuent de s'exécuter
});
```

### Pas de fonctions colorées

Contrairement à Python (`async def` / `await`) et JavaScript (`async` / `await`),
`TrueAsync` ne nécessite pas de marquer les fonctions comme asynchrones.
Toute fonction peut s'exécuter dans une coroutine — il n'y a pas de séparation
entre un monde « synchrone » et « asynchrone ».

### Un standard unifié

Le `True Async ABI` standard, intégré à `Zend`, permet à **toute** extension de supporter les `I/O` non bloquantes :
`MySQL`, `PostgreSQL`, `Redis`, opérations sur les fichiers, sockets — le tout via une interface unique.
Plus besoin de dupliquer les pilotes pour chaque framework asynchrone.

### Rétrocompatibilité

Le code existant continue de fonctionner, mais désormais tout le code PHP
est asynchrone par défaut. Partout.

## PHP workload : pourquoi c'est important maintenant

Une application PHP typique (Laravel, Symfony, WordPress) passe
**70 à 90 % de son temps à attendre les I/O** : requêtes en BD, appels HTTP vers des APIs externes,
lecture de fichiers. Pendant tout ce temps, le CPU reste inactif.

Avec les coroutines, ce temps est utilisé efficacement :

| Scénario                          | Sans coroutines | Avec coroutines  |
|-----------------------------------|-----------------|------------------|
| 3 requêtes BD de 20ms chacune    | 60ms            | ~22ms            |
| HTTP + BD + fichier               | séquentiel      | parallèle        |
| 10 appels API                     | 10 × latence    | ~1 × latence     |

En savoir plus :
[IO-Bound vs CPU-Bound](/fr/docs/evidence/concurrency-efficiency.html),
[Statistiques de concurrence](/fr/docs/evidence/real-world-statistics.html).

## Scénarios pratiques

- **Serveurs web** — traitement de nombreuses requêtes dans un seul processus
  (`FrankenPHP`, `RoadRunner`)
- **API Gateway** — agrégation parallèle de données depuis plusieurs microservices
- **Tâches en arrière-plan** — traitement concurrent de files d'attente
- **Temps réel** — serveurs WebSocket, chatbots, streaming

## Voir aussi :

- [PHP RFC : True Async &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}
- [RFC : Scope et concurrence structurée](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}
- [Documentation TrueAsync](/fr/docs.html)
- [Démo interactive des coroutines](/fr/interactive/coroutine-demo.html)
