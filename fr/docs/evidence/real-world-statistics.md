---
layout: docs
lang: fr
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /fr/docs/evidence/real-world-statistics.html
page_title: "Statistiques de concurrence"
description: "Donnees statistiques reelles pour le calcul de la concurrence : requetes SQL, latences BDD, debit des frameworks PHP."
---

# Donnees statistiques pour le calcul de la concurrence

Les formules de la section [Efficacite des taches IO-bound](/fr/docs/evidence/concurrency-efficiency.html) utilisent
plusieurs grandeurs cles. Voici une collection de mesures reelles
qui permettent d'injecter des chiffres concrets dans les formules.

---

## Elements des formules

Loi de Little :

$$
L = \lambda \cdot W
$$

- `L` -- le niveau de concurrence requis (combien de taches simultanement)
- `λ` -- le debit (requetes par seconde)
- `W` -- le temps moyen de traitement d'une requete

Formule de Goetz :

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` -- temps d'attente E/S par requete
- `T_cpu` -- temps de calcul CPU par requete

Pour un calcul pratique, il faut connaitre :

1. **Combien de requetes SQL sont executees par requete HTTP**
2. **Combien de temps prend une requete SQL (E/S)**
3. **Combien de temps prend le traitement CPU**
4. **Quel est le debit du serveur**
5. **Quel est le temps de reponse global**

---

## 1. Requetes SQL par requete HTTP

Le nombre d'appels a la base de donnees depend du framework, de l'ORM et de la complexite de la page.

| Application / Framework           | Requetes par page      | Source                                                                                                           |
|------------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (sans plugins)           | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, page moyenne)   | <30 (seuil du profiler) | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                       |
| Laravel (CRUD simple)              | 5-15                   | Valeurs typiques de Laravel Debugbar                                                                             |
| Laravel (avec probleme N+1)        | 20-50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (sans cache)                | 80-100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (catalogue)                | 50-200+                | Typique pour le e-commerce complexe                                                                              |

**Mediane pour une application ORM typique : 15-30 requetes par requete HTTP.**

Symfony utilise un seuil de 30 requetes comme limite du "normal" -- au-dela,
l'icone du profiler passe au jaune.

## 2. Temps par requete SQL (T_io par requete)

### Temps d'execution de la requete sur le serveur BDD

Donnees des benchmarks sysbench OLTP de Percona (MySQL) :

| Concurrence    | Part des requetes <0,1 ms | 0,1-1 ms | 1-10 ms | >10 ms |
|----------------|---------------------------|----------|---------|--------|
| 1 thread       | 86%                       | 10%      | 3%      | 1%     |
| 32 threads     | 68%                       | 30%      | 2%      | <1%    |
| 128 threads    | 52%                       | 35%      | 12%     | 1%     |

LinkBench (Percona, approximation d'une charge de travail reelle Facebook) :

| Operation      | p50     | p95    | p99     |
|----------------|---------|--------|---------|
| GET_NODE       | 0,4 ms  | 39 ms  | 77 ms   |
| UPDATE_NODE    | 0,7 ms  | 47 ms  | 100 ms  |

**Source :** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### Latence reseau (aller-retour)

| Scenario                 | Aller-retour | Source |
|--------------------------|--------------|--------|
| Unix-socket / localhost  | <0,1 ms      | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, centre de donnees unique | ~0,5 ms | CYBERTEC PostgreSQL |
| Cloud, cross-AZ          | 1-5 ms      | CYBERTEC PostgreSQL |
| Cross-region              | 10-50 ms    | Valeurs typiques |

### Total : temps complet par requete SQL

Temps complet = temps d'execution cote serveur + aller-retour reseau.

| Environnement     | SELECT simple (p50) | Requete moyenne (p50) |
|-------------------|---------------------|-----------------------|
| Localhost          | 0,1-0,5 ms         | 0,5-2 ms              |
| LAN (DC unique)   | 0,5-1,5 ms         | 1-4 ms                |
| Cloud (cross-AZ)  | 2-6 ms             | 3-10 ms               |

Pour un environnement cloud, **4 ms par requete moyenne** est une estimation bien fondee.

## 3. Temps CPU par requete SQL (T_cpu par requete)

Le temps CPU couvre : l'analyse des resultats, l'hydratation des entites ORM,
le mapping d'objets, la serialisation.

Les benchmarks directs de cette valeur specifique sont rares dans les sources publiques,
mais peuvent etre estimes a partir des donnees de profilage :

- Blackfire.io separe le wall time en **temps d'E/S** et **temps CPU**
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- Dans les applications PHP typiques, la base de donnees est le principal goulot d'etranglement,
  et le temps CPU constitue une faible fraction du wall time
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**Estimation indirecte via le debit :**

Symfony avec Doctrine (BDD + rendu Twig) traite ~1000 req/s
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
Cela signifie que le temps CPU par requete ≈ 1 ms.
Avec ~20 requetes SQL par page → **~0,05 ms CPU par requete SQL**.

Endpoint API Laravel (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
Temps CPU par requete ≈ 2,3 ms. Avec ~15 requetes → **~0,15 ms CPU par requete SQL**.

## 4. Debit (λ) des applications PHP

Benchmarks executes sur 30 vCPU / 120 Go RAM, nginx + PHP-FPM,
15 connexions concurrentes ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)) :

| Application | Type de page             | req/s (PHP 8.4) |
|-------------|--------------------------|-----------------|
| Laravel     | Welcome (sans BDD)       | ~700            |
| Laravel     | API + Eloquent + Auth    | ~440            |
| Symfony     | Doctrine + Twig          | ~1 000          |
| WordPress   | Page d'accueil (sans plugins) | ~148       |
| Drupal 10   | --                       | ~1 400          |

A noter que WordPress est significativement plus lent
car chaque requete est plus lourde (plus de requetes SQL, rendu plus complexe).

---

## 5. Temps de reponse global (W) en production

Donnees de LittleData (2023, 2 800 sites e-commerce) :

| Plateforme               | Temps de reponse serveur moyen |
|--------------------------|--------------------------------|
| Shopify                  | 380 ms                         |
| Moyenne e-commerce       | 450 ms                         |
| WooCommerce (WordPress)  | 780 ms                         |
| Magento                  | 820 ms                         |

**Source :** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

Benchmarks industriels :

| Categorie              | Temps de reponse API |
|------------------------|----------------------|
| Excellent              | 100-300 ms           |
| Acceptable             | 300-600 ms           |
| Necessite optimisation | >600 ms              |

## Calcul pratique avec la loi de Little

### Scenario 1 : API Laravel dans le cloud

**Donnees d'entree :**
- λ = 440 req/s (debit cible)
- W = 80 ms (calcule : 20 SQL × 4 ms E/S + 1 ms CPU)
- Coeurs : 8

**Calcul :**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ taches concurrentes}
$$

Sur 8 coeurs, cela fait ~4,4 taches par coeur. Ceci correspond au fait que Laravel avec 15 workers
PHP-FPM concurrents atteint deja 440 req/s. Il reste de la marge.

### Scenario 2 : API Laravel dans le cloud, 2000 req/s (cible)

**Donnees d'entree :**
- λ = 2000 req/s (debit cible)
- W = 80 ms
- Coeurs : 8

**Calcul :**

$$
L = 2000 \times 0.080 = 160 \text{ taches concurrentes}
$$

PHP-FPM ne peut pas gerer 160 workers sur 8 coeurs -- chaque worker est un processus separe
avec ~30-50 Mo de memoire. Total : ~6-8 Go pour les workers seuls.

Avec des coroutines : 160 taches × ~4 Kio ≈ **640 Kio**. Une difference de **quatre ordres de grandeur**.

### Scenario 3 : avec la formule de Goetz

**Donnees d'entree :**
- T_io = 80 ms (20 requetes × 4 ms)
- T_cpu = 1 ms
- Coeurs : 8

**Calcul :**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ coroutines}
$$

**Debit** (via la loi de Little) :

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

C'est le plafond theorique avec utilisation complete des 8 coeurs.
En pratique, il sera plus bas en raison de la surcharge de l'ordonnanceur, du GC, des limites du pool de connexions.
Mais meme 50% de cette valeur (4 000 req/s) est
**un ordre de grandeur superieur** aux 440 req/s de PHP-FPM sur les memes 8 coeurs.

## Resume : d'ou viennent les chiffres

| Grandeur                            | Valeur           | Source                                     |
|-------------------------------------|------------------|--------------------------------------------|
| Requetes SQL par requete HTTP       | 15-30            | WordPress ~17, seuil Symfony <30           |
| Temps par requete SQL (cloud)       | 3-6 ms           | Percona p50 + CYBERTEC aller-retour        |
| CPU par requete SQL                 | 0,05-0,15 ms     | Calcul inverse a partir des benchmarks de debit |
| Debit Laravel                       | ~440 req/s (API) | Benchmarks Sevalla/Kinsta, PHP 8.4         |
| Temps de reponse e-commerce (moy.)  | 450 ms           | LittleData, 2 800 sites                   |
| Temps de reponse API (norme)        | 100-300 ms       | Benchmark industriel                       |

---

## References

### Benchmarks de frameworks PHP
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) -- debit pour WordPress, Laravel, Symfony, Drupal
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) -- Laravel welcome + endpoint API

### Benchmarks de bases de donnees
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) -- p50/p95/p99 par operation
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) -- distribution des latences a differents niveaux de concurrence
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) -- latences reseau par environnement
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) -- seuils <10ms / >100ms

### Temps de reponse des systemes de production
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) -- 2 800 sites e-commerce

### Profilage PHP
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) -- decomposition du wall time en E/S et CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) -- APM pour les applications PHP
