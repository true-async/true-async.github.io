---
layout: docs
lang: fr
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /fr/docs/evidence/swoole-evidence.html
page_title: "Swoole en pratique"
description: "Swoole en pratique : cas de production Appwrite et IdleMMO, benchmarks independants, TechEmpower, comparaison avec PHP-FPM."
---

# Swoole en pratique : mesures reelles

Swoole est une extension PHP ecrite en C qui fournit une boucle d'evenements, des coroutines
et des E/S asynchrones. C'est la seule implementation mature du modele coroutine
dans l'ecosysteme PHP, avec des annees d'experience en production.

Voici une collection de mesures reelles : cas de production, benchmarks independants
et donnees TechEmpower.

### Deux sources de gain de performance

La transition de PHP-FPM vers Swoole offre **deux avantages independants** :

1. **Runtime avec etat** -- l'application se charge une fois et reste en memoire.
   La surcharge de re-initialisation (autoload, conteneur DI, configuration)
   a chaque requete disparait. Cet effet apporte un gain meme sans E/S.

2. **Concurrence par coroutines** -- pendant qu'une coroutine attend la reponse d'une BDD ou d'une API externe,
   d'autres traitent des requetes sur le meme coeur. Cet effet se manifeste
   **uniquement en presence d'E/S** et necessite l'utilisation de clients asynchrones
   (MySQL base sur les coroutines, Redis, client HTTP).

La plupart des benchmarks publics **ne separent pas** ces deux effets.
Les tests sans BDD (Hello World, JSON) mesurent uniquement l'effet du runtime avec etat.
Les tests avec BDD mesurent la **somme des deux**, mais ne permettent pas d'isoler la contribution des coroutines.

Chaque section ci-dessous indique quel effet predomine.

## 1. Production : Appwrite -- migration de FPM vers Swoole (+91%)

> **Ce qui est mesure :** runtime avec etat **+** concurrence par coroutines.
> Appwrite est un proxy d'E/S avec un travail CPU minimal. Le gain provient
> des deux facteurs, mais isoler la contribution des coroutines a partir des donnees publiques n'est pas possible.

[Appwrite](https://appwrite.io/) est un Backend-as-a-Service (BaaS) open source
ecrit en PHP. Appwrite fournit une API serveur prete a l'emploi
pour les taches courantes des applications mobiles et web :
authentification des utilisateurs, gestion de base de donnees,
stockage de fichiers, fonctions cloud, notifications push.

De par sa nature, Appwrite est un **pur proxy d'E/S** :
presque chaque requete HTTP entrante se traduit par une ou plusieurs
operations d'E/S (requete MariaDB, appel Redis,
lecture/ecriture de fichier), avec un calcul CPU propre minimal.
Ce profil de charge extrait le benefice maximal
de la transition vers les coroutines : pendant qu'une coroutine attend une reponse de la BDD,
d'autres traitent de nouvelles requetes sur le meme coeur.

Dans la version 0.7, l'equipe a remplace Nginx + PHP-FPM par Swoole.

**Conditions de test :**
500 clients concurrents, 5 minutes de charge (k6).
Toutes les requetes vers des endpoints avec autorisation et controle d'abus.

| Metrique                       | FPM (v0.6.2) | Swoole (v0.7) | Changement      |
|--------------------------------|--------------|---------------|-----------------|
| Requetes par seconde           | 436          | 808           | **+85%**        |
| Total de requetes en 5 min     | 131 117      | 242 336       | **+85%**        |
| Temps de reponse (normal)      | 3,77 ms      | 1,61 ms       | **-57%**        |
| Temps de reponse (sous charge) | 550 ms       | 297 ms        | **-46%**        |
| Taux de succes des requetes    | 98%          | 100%          | Pas de timeouts |

Amelioration globale rapportee par l'equipe : **~91%** sur l'ensemble des metriques.

**Source :** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)



## 2. Production : IdleMMO -- 35 millions de requetes par jour sur un seul serveur

> **Ce qui est mesure :** principalement le **runtime avec etat**.
> Laravel Octane fait tourner Swoole en mode "une requete -- un worker",
> sans multiplexage d'E/S par coroutines au sein d'une requete.
> Le gain de performance est du au fait que Laravel ne se recharge pas a chaque requete.

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane) est
une application PHP (Laravel Octane + Swoole), un MMORPG avec plus de 160 000 utilisateurs.

| Metrique                     | Valeur                              |
|------------------------------|-------------------------------------|
| Requetes par jour            | 35 000 000 (~405 req/s en moyenne)  |
| Potentiel (estimation auteur)| 50 000 000+ req/jour                |
| Serveur                      | 1 × 32 vCPU                        |
| Workers Swoole               | 64 (4 par coeur)                    |
| Latence p95 avant optimisation | 394 ms                            |
| Latence p95 apres Octane     | **172 ms (-56%)**                   |

L'auteur note que pour des applications moins gourmandes en CPU (pas un MMORPG),
le meme serveur pourrait gerer **significativement plus** de requetes.

**Source :** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

## 3. Benchmark : PHP-FPM vs Swoole (BytePursuits)

> **Ce qui est mesure :** uniquement le **runtime avec etat**.
> Le test retourne du JSON sans acceder a une BDD ou des services externes.
> La concurrence par coroutines n'est pas en jeu ici -- il n'y a pas d'E/S qui pourrait
> etre effectuee en parallele. La difference de 2,6-3x est entierement due au
> fait que Swoole ne recree pas l'application a chaque requete.

Benchmark independant sur le microframework Mezzio (reponse JSON, sans BDD).
Intel i7-6700T (4 coeurs / 8 threads), 32 Go RAM, wrk, 10 secondes.

| Concurrence | PHP-FPM (req/s) | Swoole BASE (req/s) | Difference |
|-------------|-----------------|---------------------|------------|
| 100         | 3 472           | 9 090               | **2,6x**   |
| 500         | 3 218           | 9 159               | **2,8x**   |
| 1 000       | 3 065           | 9 205               | **3,0x**   |

Latence moyenne a 1000 concurrents :
- FPM : **191 ms**
- Swoole : **106 ms**

**Point critique :** a partir de 500 connexions concurrentes,
PHP-FPM a commence a perdre des requetes (73 793 erreurs de socket a 500, 176 652 a 700).
Swoole a eu **zero erreur** a tous les niveaux de concurrence.

**Source :** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

## 4. Benchmark : avec base de donnees (kenashkov)

> **Ce qui est mesure :** un ensemble de tests avec des effets **differents**.
> - Hello World, Autoload -- pur **runtime avec etat** (pas d'E/S).
> - Requete SQL, scenario realiste -- **etat + coroutines**.
> - Swoole utilise un client MySQL base sur les coroutines, ce qui permet de servir
> - d'autres requetes en attendant une reponse de la BDD.

Suite de tests plus realiste : Swoole 4.4.10 vs Apache + mod_php.
ApacheBench, 100-1000 concurrents, 10 000 requetes.

| Scenario                               | Apache (100 conc.) | Swoole (100 conc.) | Difference |
|----------------------------------------|--------------------|--------------------|------------|
| Hello World                            | 25 706 req/s       | 66 309 req/s       | **2,6x**   |
| Autoload 100 classes                   | 2 074 req/s        | 53 626 req/s       | **25x**    |
| Requete SQL vers BDD                   | 2 327 req/s        | 4 163 req/s        | **1,8x**   |
| Scenario realiste (cache + fichiers + BDD) | 141 req/s      | 286 req/s          | **2,0x**   |

A 1000 concurrents :
- Apache **a plante** (limite de connexions, requetes echouees)
- Swoole -- **zero erreur** dans tous les tests

**Observation cle :** avec des E/S reelles (BDD + fichiers), la difference
chute de 25x a **1,8-2x**. C'est attendu :
la base de donnees devient le goulot d'etranglement commun.
Mais la stabilite sous charge reste incomparable.

**Source :** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

## 5. Benchmark : Symfony 7 -- tous les runtimes (2024)

> **Ce qui est mesure :** uniquement le **runtime avec etat**.
> Test sans BDD -- les coroutines ne sont pas impliquees.
> La difference de >10x a 1000 concurrents s'explique par le fait que FPM cree
> un processus par requete, tandis que Swoole et FrankenPHP gardent l'application
> en memoire et servent les connexions via une boucle d'evenements.

Test de 9 runtimes PHP avec Symfony 7 (k6, Docker, 1 CPU / 1 Go RAM, sans BDD).

| Runtime                            | vs Nginx + PHP-FPM (a 1000 conc.) |
|------------------------------------|-------------------------------------|
| Apache + mod_php                   | ~0,5x (plus lent)                  |
| Nginx + PHP-FPM                    | 1x (reference)                     |
| Nginx Unit                         | ~3x                                |
| RoadRunner                         | >2x                                |
| **Swoole / FrankenPHP (worker)**   | **>10x**                           |

A 1000 connexions concurrentes, Swoole et FrankenPHP en mode worker
ont montre **un ordre de grandeur de debit superieur**
au classique Nginx + PHP-FPM.

**Source :** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

## 6. TechEmpower : Swoole -- premiere place parmi PHP

> **Ce qui est mesure :** **etat + coroutines** (dans les tests avec BDD).
> TechEmpower inclut a la fois un test JSON (etat) et des tests avec plusieurs
> requetes SQL (requetes multiples, Fortunes), ou l'acces BDD base sur les coroutines
> apporte un reel avantage. C'est l'un des rares benchmarks
> ou l'effet des coroutines est le plus clairement visible.

Dans les [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
(Round 22, 2023), Swoole a pris la **premiere place** parmi tous les frameworks PHP
dans le test MySQL.

TechEmpower teste des scenarios realistes : serialisation JSON,
requetes BDD uniques, requetes multiples, ORM, Fortunes
(template + BDD + tri + echappement).

**Source :** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

## 7. Hyperf : 96 000 req/s sur un framework Swoole

> **Ce qui est mesure :** **runtime avec etat** (le benchmark est Hello World).
> Hyperf est entierement construit sur les coroutines Swoole, et en production,
> la concurrence par coroutines est utilisee pour les appels BDD, Redis et gRPC.
> Cependant, le chiffre de 96K req/s a ete obtenu sur Hello World sans E/S,
> ce qui signifie qu'il reflete l'effet du runtime avec etat.

[Hyperf](https://hyperf.dev/) est un framework PHP base sur les coroutines et construit sur Swoole.
Dans le benchmark (4 threads, 100 connexions) :

- **96 563 req/s**
- Latence : 7,66 ms

Hyperf est positionne pour les microservices et revendique
un avantage de **5-10x** par rapport aux frameworks PHP traditionnels.

**Source :** [Hyperf GitHub](https://github.com/hyperf/hyperf)

## Resume : ce que montrent les donnees reelles

| Type de test                      | FPM → Swoole                      | Effet principal      | Note                                           |
|-----------------------------------|------------------------------------|----------------------|------------------------------------------------|
| Hello World / JSON                | **2,6-3x**                         | Avec etat            | BytePursuits, kenashkov                        |
| Autoload (avec vs sans etat)      | **25x**                            | Avec etat            | Pas d'E/S -- pur effet de preservation d'etat  |
| Avec base de donnees              | **1,8-2x**                         | Etat + coroutines    | kenashkov (MySQL coroutine)                    |
| API production (Appwrite)         | **+91%** (1,85x)                   | Etat + coroutines    | Proxy d'E/S, les deux facteurs                 |
| Production (IdleMMO)              | p95 : **-56%**                     | Avec etat            | Workers Octane, pas de coroutines              |
| Haute concurrence (1000+)         | **Swoole stable, FPM plante**      | Boucle d'evenements  | Tous les benchmarks                            |
| Runtimes Symfony (1000 conc.)     | **>10x**                           | Avec etat            | Pas de BDD dans le test                        |
| TechEmpower (tests BDD)           | **#1 parmi PHP**                   | Etat + coroutines    | Requetes SQL multiples                         |

## Lien avec la theorie

Les resultats s'alignent bien avec les calculs de [Efficacite des taches IO-bound](/fr/docs/evidence/concurrency-efficiency.html) :

**1. Avec une base de donnees, la difference est plus modeste (1,8-2x) que sans (3-10x).**
Ceci confirme : avec des E/S reelles, le goulot d'etranglement devient la BDD elle-meme,
pas le modele de concurrence. Le coefficient de blocage dans les tests avec BDD est plus bas
car le travail CPU du framework est comparable au temps d'E/S.

**2. A haute concurrence (500-1000+), FPM se degrade tandis que Swoole ne le fait pas.**
PHP-FPM est limite par le nombre de workers. Chaque worker est un processus OS (~40 Mo).
A 500+ connexions concurrentes, FPM atteint sa limite
et commence a perdre des requetes. Swoole sert des milliers de connexions
dans des dizaines de coroutines sans augmenter la consommation memoire.

**3. Le runtime avec etat elimine la surcharge de re-initialisation.**
La difference de 25x dans le test d'autoload demontre le cout
de la recreation de l'etat de l'application a chaque requete dans FPM.
En production, cela se manifeste comme la difference entre T_cpu = 34 ms (FPM)
et T_cpu = 5-10 ms (avec etat), ce qui change radicalement le coefficient de blocage
et par consequent le gain des coroutines
(voir [tableau dans Efficacite des taches IO-bound](/fr/docs/evidence/concurrency-efficiency.html)).

**4. La formule est confirmee.**
Appwrite : FPM 436 req/s → Swoole 808 req/s (1,85x).
Si T_cpu est passe d'environ 30 ms a ~15 ms (avec etat)
et que T_io est reste a ~30 ms, alors le coefficient de blocage est passe de 1,0 a 2,0,
ce qui predit une augmentation du debit d'environ 1,5-2x. Cela correspond.

## References

### Cas de production
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### Benchmarks independants
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark -- Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### Frameworks et runtimes
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf -- framework PHP base sur les coroutines](https://github.com/hyperf/hyperf)
- [OpenSwoole benchmark](https://openswoole.com/benchmark)
- [Swoole source (GitHub)](https://github.com/swoole/swoole-src)
