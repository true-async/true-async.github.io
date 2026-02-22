---
layout: docs
lang: fr
path_key: "/docs/components/introduction.html"
nav_active: docs
permalink: /fr/docs/components/introduction.html
page_title: "Pourquoi l'asynchrone ?"
description: "Qu'est-ce que l'asynchrone et pourquoi en avez-vous besoin ?"
---

## Comment fonctionne le PHP traditionnel (FPM)

![Modele FPM](../../../assets/docs/fpm_model.jpg)

Si une application serveur PHP etait un restaurant, ce serait probablement un etablissement haut de gamme
ou chaque table est servie par un serveur dedie.

Chaque nouvelle requete au serveur est traitee par une VM PHP, un processus ou un thread separe,
apres quoi l'etat est detruit.
C'est equivalent a un serveur qui sert une table puis est licencie ou voit sa memoire effacee.

Ce modele a un avantage : si une erreur PHP survient, une fuite de memoire,
une connexion a la base de donnees oubliee -- cela n'affecte pas les autres requetes. Chaque requete est isolee.
Cela signifie que le developpement est plus simple, le debogage est plus simple et la tolerance aux pannes est elevee.

Ces dernieres annees, la communaute PHP a essaye d'introduire un modele avec etat,
ou une seule VM PHP peut servir plusieurs requetes, en preservant l'etat entre elles.
Par exemple, le projet Laravel Octane, qui utilise Swoole ou RoadRunner, obtient de meilleures performances
en preservant l'etat entre les requetes.
Mais c'est loin de la limite du possible.

Licencier un serveur apres chaque commande est trop couteux.
Parce que les plats sont prepares lentement en cuisine, le serveur passe la majeure partie de son temps a attendre.
La meme chose se produit avec PHP-FPM : la VM PHP reste inactive.
Il y a plus de changements de contexte,
plus de surcharge pour la creation et la destruction de processus ou de threads,
et plus de consommation de ressources.

```php
// PHP-FPM traditionnel
$user = file_get_contents('https://api/user/123');     // attente debout 300ms
$orders = $db->query('SELECT * FROM orders');          // attente debout 150ms
$balance = file_get_contents('https://api/balance');   // attente debout 200ms

// Temps passe : 650ms d'attente pure
// Le CPU est inactif. La memoire est inactive. Tout attend.
```

## Concurrence

![Modele de concurrence](../../../assets/docs/concurrency_model.jpg)

Puisque la cuisine ne peut pas preparer les plats instantanement,
et que le serveur a du temps d'inactivite entre les preparations,
il est possible de traiter les commandes de plusieurs clients.

Ce schema peut fonctionner de maniere assez flexible :
La table 1 a commande trois plats.
La table 2 a commande deux plats.
Le serveur apporte le premier plat a la table 1, puis le premier plat a la table 2.
Ou peut-etre qu'il a reussi a apporter deux plats a la premiere table et un a la seconde. Ou l'inverse !

C'est la concurrence : le partage d'une seule ressource (`CPU`) entre differents fils d'execution logiques,
qui sont appeles coroutines.

```php
use function Async\spawn;
use function Async\await;

// Lancer les trois requetes "en concurrence"
$userTask = spawn(file_get_contents(...), 'https://api/user/123');
$ordersTask = spawn($db->query(...), 'SELECT * FROM orders');
$balanceTask = spawn(file_get_contents(...), 'https://api/balance');

// Pendant qu'une requete attend une reponse, on fait les autres !
$user = await($userTask);
$orders = await($ordersTask);
$balance = await($balanceTask);

// Temps passe : 300ms (le temps de la requete la plus lente)
```

## La concurrence n'est pas le parallelisme

Il est important de comprendre la difference.

**Concurrence** -- comme dans `True Async`, `JavaScript`, `Python` :
- Un serveur bascule rapidement entre les tables
- Un thread PHP bascule entre les taches
- Les taches sont **entrelacees**, mais ne s'executent pas simultanement
- Pas de conditions de course -- une seule coroutine s'execute a un moment donne

**Parallelisme** -- c'est le multithreading (`Go`) :
- Plusieurs serveurs travaillent simultanement
- Plusieurs threads s'executent sur differents coeurs CPU
- Les taches s'executent **vraiment simultanement**
- Mutex, verrous, toute cette complexite est necessaire

## Et ensuite ?

Maintenant vous comprenez l'essentiel. Vous pouvez approfondir :

- [Efficacite](../evidence/concurrency-efficiency.md) -- combien de coroutines sont necessaires pour des performances maximales
- [Base factuelle](../evidence/coroutines-evidence.md) -- mesures, benchmarks et recherches confirmant l'efficacite des coroutines
- [Swoole en pratique](../evidence/swoole-evidence.md) -- mesures reelles : Appwrite +91%, IdleMMO 35M req/jour, benchmarks avec BDD
- [Python asyncio en pratique](../evidence/python-evidence.md) -- Duolingo +40%, Super.com -90% couts, Instagram, benchmarks uvloop
- [Coroutines](coroutines.md) -- comment elles fonctionnent en interne
- [Scope](scope.md) -- comment gerer des groupes de coroutines
- [Ordonnanceur](scheduler.md) -- qui decide quelle coroutine executer
