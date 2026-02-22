---
layout: docs
lang: fr
path_key: "/docs/evidence/concurrency-efficiency.html"
nav_active: docs
permalink: /fr/docs/evidence/concurrency-efficiency.html
page_title: "IO-Bound vs CPU-bound"
description: "Analyse de l'efficacite de la concurrence pour les taches IO-bound et CPU-bound. Loi de Little, formule de Goetz, calcul du nombre optimal de coroutines."
---

# IO-Bound vs CPU-bound

Le gain de performance apporte par la concurrence ou le parallelisme depend de la nature de la charge de travail.
Dans les applications serveur, on distingue generalement deux types principaux de taches.

- **IO-bound** -- taches ou une part significative du temps est consacree a l'attente d'operations d'entree/sortie :
  requetes reseau, requetes de base de donnees, lecture et ecriture de fichiers. Pendant ces moments, le CPU reste inactif.
- **CPU-bound** -- taches necessitant des calculs intensifs qui maintiennent le processeur occupe en quasi-permanence :
  algorithmes complexes, traitement de donnees, cryptographie.

Ces dernieres annees, la plupart des applications web se sont orientees vers des charges de travail **IO-bound**.
Ceci est lie a la croissance des microservices, des `API` distantes et des services cloud.
Des approches comme Frontend for Backend (`BFF`) et `API Gateway`, qui agregent des donnees provenant de multiples sources,
amplifient cet effet.

Une application serveur moderne est egalement difficile a imaginer sans journalisation, telemetrie
et surveillance en temps reel. Toutes ces operations sont inherement IO-bound.

## Efficacite des taches IO-bound

L'efficacite de l'execution concurrente des taches `IO-bound` est determinee par
la fraction du temps pendant laquelle la tache utilise reellement le `CPU`
par rapport au temps passe a attendre la completion des operations d'E/S.

### Loi de Little

En theorie des files d'attente, l'une des formules fondamentales
est la loi de Little ([Little's Law](https://en.wikipedia.org/wiki/Little%27s_law)) :

$$
L = \lambda \cdot W
$$

Ou :
- `L` -- le nombre moyen de taches dans le systeme
- `λ` -- le taux moyen de requetes entrantes
- `W` -- le temps moyen qu'une tache passe dans le systeme

Cette loi est universelle et ne depend pas de l'implementation specifique du systeme :
peu importe que l'on utilise des threads, des coroutines ou des callbacks asynchrones.
Elle decrit la relation fondamentale entre la charge, la latence
et le niveau de concurrence.

Lorsque l'on estime la concurrence pour une application serveur, on cherche essentiellement
a resoudre le probleme de
combien de taches doivent etre simultanement dans le systeme
pour que les ressources soient utilisees efficacement.

Pour les charges de travail `IO-bound`, le temps moyen de traitement d'une requete est important
par rapport au temps consacre au calcul actif.
Par consequent, pour eviter que le CPU reste inactif, il faut
un nombre suffisant de taches concurrentes dans le systeme.

C'est exactement la quantite que l'analyse formelle permet d'estimer,
en reliant :
- le temps d'attente,
- le debit,
- et le niveau de concurrence requis.

Une approche similaire est utilisee dans l'industrie pour calculer
la taille optimale du pool de threads (voir Brian Goetz, *"Java Concurrency in Practice"*).

> Les donnees statistiques reelles pour chaque element de ces formules
> (nombre de requetes SQL par requete HTTP, latences de la BDD, debit des frameworks PHP)
> sont collectees dans un document separe :
> [Donnees statistiques pour le calcul de la concurrence](/fr/docs/evidence/real-world-statistics.html).

### Utilisation basique du CPU

Pour calculer quelle fraction du temps le processeur
effectue reellement un travail utile lors de l'execution d'une seule tache, la formule suivante peut etre utilisee :

$$
U = \frac{T_{cpu}}{T_{cpu} + T_{io}}
$$

- `T_cpu` -- le temps consacre aux calculs sur le CPU
- `T_io` -- le temps passe a attendre les operations d'E/S

La somme `T_cpu + T_io` represente la duree de vie totale d'une tache
du debut a la fin.

La valeur `U` varie de 0 a 1 et indique le degre
d'utilisation du processeur :
- `U → 1` caracterise une tache lourde en calcul (`CPU-bound`)
- `U → 0` caracterise une tache qui passe la majeure partie de son temps a attendre les E/S (`IO-bound`)

Ainsi, la formule fournit une evaluation quantitative de
l'efficacite d'utilisation du `CPU`
et indique si la charge de travail en question est `IO-bound` ou `CPU-bound`.

### Impact de la concurrence

Lors de l'execution concurrente de plusieurs taches `IO-bound`, le `CPU` peut utiliser
le temps d'attente d'`E/S` d'une tache pour effectuer des calculs pour **une autre**.

L'utilisation du CPU avec `N` taches concurrentes peut etre estimee comme suit :

$$
U_N = \min\left(1,\; N \cdot \frac{T_{cpu}}{T_{cpu} + T_{io}}\right)
$$

Augmenter la concurrence ameliore l'utilisation du `CPU`,
mais seulement jusqu'a une certaine limite.

### Limite d'efficacite

Le gain maximal de la concurrence est borne par le rapport
entre le temps d'attente d'`E/S` et le temps de calcul :

$$
E(N) \approx \min\left(N,\; 1 + \frac{T_{io}}{T_{cpu}}\right)
$$

En pratique, cela signifie que le nombre de taches concurrentes reellement utiles
est approximativement egal au rapport `T_io / T_cpu`.

### Concurrence optimale

$$
N_{opt} \approx 1 + \frac{T_{io}}{T_{cpu}}
$$

Le un dans la formule represente la tache en cours d'execution sur le `CPU`.
Avec un rapport `T_io / T_cpu` eleve (ce qui est typique pour les charges `IO-bound`),
la contribution du un est negligeable, et la formule est souvent simplifiee en `T_io / T_cpu`.

Cette formule est un cas particulier (pour un seul coeur) de la formule classique
de taille optimale du pool de threads proposee par Brian Goetz
dans le livre *"Java Concurrency in Practice"* (2006) :

$$
N_{threads} = N_{cores} \times \left(1 + \frac{T_{wait}}{T_{service}}\right)
$$

Le rapport `T_wait / T_service` est connu sous le nom de **coefficient de blocage**.
Plus ce coefficient est eleve, plus de taches concurrentes
peuvent etre efficacement exploitees par un seul coeur.

A ce niveau de concurrence, le processeur passe la majeure partie de son temps
a effectuer du travail utile, et augmenter davantage le nombre de taches
ne produit plus de gain notable.

C'est precisement pourquoi les modeles d'execution asynchrone
sont les plus efficaces pour les charges web `IO-bound`.

## Exemple de calcul pour une application web typique

Considerons un modele simplifie mais assez realiste d'une application web serveur moyenne.
Supposons que le traitement d'une seule requete `HTTP` implique principalement une interaction avec une base de donnees
et ne contient pas d'operations de calcul complexes.

### Hypotheses initiales

- Environ **20 requetes SQL** sont executees par requete HTTP
- Le calcul se limite au mapping des donnees, a la serialisation de la reponse et a la journalisation
- La base de donnees est en dehors du processus applicatif (E/S distante)

> **Pourquoi 20 requetes ?**
> C'est l'estimation mediane pour les applications ORM de complexite moderee.
> A titre de comparaison :
> * WordPress genere ~17 requetes par page,
> * Drupal sans cache -- de 80 a 100,
> * et une application Laravel/Symfony typique -- de 10 a 30.
>
> La principale source de croissance est le pattern N+1, ou l'ORM charge les entites liees
> avec des requetes separees.

### Estimation du temps d'execution

Pour l'estimation, nous utiliserons des valeurs moyennes :

- Une requete SQL :
    - Temps d'attente E/S : `T_io ≈ 4 ms`
    - Temps de calcul CPU : `T_cpu ≈ 0.05 ms`

Total par requete HTTP :

- `T_io = 20 × 4 ms = 80 ms`
- `T_cpu = 20 × 0.05 ms = 1 ms`

> **A propos des valeurs de latence choisies.**
> Le temps d'E/S pour une seule requete `SQL` se compose de la latence reseau (`round-trip`)
> et du temps d'execution de la requete sur le serveur de BDD.
> Le round-trip reseau au sein d'un meme centre de donnees est d'environ 0,5 ms,
> et pour les environnements cloud (cross-AZ, RDS manage) -- 1 a 5 ms.
> En tenant compte du temps d'execution d'une requete moyennement complexe,
> les 4 ms par requete resultants sont une estimation realiste pour un environnement cloud.
> Le temps CPU (0,05 ms) couvre le mapping des resultats ORM, l'hydratation des entites
> et la logique de traitement de base.

### Caracteristiques de la charge de travail

Le rapport entre le temps d'attente et le temps de calcul :

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{1} = 80
$$

Cela signifie que la tache est predominamment **IO-bound** :
le processeur passe la majeure partie de son temps inactif,
en attendant la completion des operations d'E/S.

### Estimation du nombre de coroutines

Le nombre optimal de coroutines concurrentes par coeur de CPU
est approximativement egal au rapport entre le temps d'attente E/S et le temps de calcul :

$$
N_{coroutines} \approx \frac{T_{io}}{T_{cpu}} \approx 80
$$

Autrement dit, environ **80 coroutines par coeur** permettent de masquer quasi integralement
la latence d'E/S tout en maintenant une utilisation elevee du CPU.

A titre de comparaison : [Zalando Engineering](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)
fournit un exemple avec un microservice ou le temps de reponse est de 50 ms et le temps de traitement de 5 ms
sur une machine a deux coeurs : `2 × (1 + 50/5) = 22 threads` -- le meme principe, la meme formule.

### Mise a l'echelle selon le nombre de coeurs

Pour un serveur avec `C` coeurs :

$$
N_{total} \approx C \cdot \frac{T_{io}}{T_{cpu}}
$$

Par exemple, pour un processeur a 8 coeurs :

$$
N_{total} \approx 8 \times 80 = 640 \text{ coroutines}
$$

Cette valeur reflete le **niveau utile de concurrence**,
pas une limite stricte.

### Sensibilite a l'environnement

La valeur de 80 coroutines par coeur n'est pas une constante universelle,
mais le resultat d'hypotheses specifiques sur la latence d'E/S.
Selon l'environnement reseau, le nombre optimal de taches concurrentes
peut differer significativement :

| Environnement                   | T_io par requete SQL | T_io total (×20) | N par coeur |
|---------------------------------|----------------------|-------------------|-------------|
| Localhost / Unix-socket         | ~0,1 ms              | 2 ms              | ~2          |
| LAN (centre de donnees unique) | ~1 ms                | 20 ms             | ~20         |
| Cloud (cross-AZ, RDS)          | ~4 ms                | 80 ms             | ~80         |
| Serveur distant / cross-region | ~10 ms               | 200 ms            | ~200        |

Plus la latence est elevee, plus il faut de coroutines
pour utiliser pleinement le CPU avec du travail utile.

### PHP-FPM vs Coroutines : calcul approximatif

Pour estimer le benefice pratique des coroutines,
comparons deux modeles d'execution sur le meme serveur
avec la meme charge de travail.

#### Donnees initiales

**Serveur :** 8 coeurs, environnement cloud (cross-AZ RDS).

**Charge de travail :** endpoint API Laravel typique --
autorisation, requetes Eloquent avec eager loading, serialisation JSON.

Base sur les donnees de benchmark de
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)
et [Kinsta](https://kinsta.com/blog/php-benchmarks/) :

| Parametre                                        | Valeur     | Source            |
|--------------------------------------------------|------------|-------------------|
| Debit API Laravel (30 vCPU, BDD localhost)        | ~440 req/s | Sevalla, PHP 8.3  |
| Nombre de workers PHP-FPM dans le benchmark       | 15         | Sevalla           |
| Temps de reponse (W) dans le benchmark             | ~34 ms     | L/λ = 15/440      |
| Memoire par worker PHP-FPM                         | ~40 Mo     | Valeur typique    |

#### Etape 1 : estimation de T_cpu et T_io

Dans le benchmark **Sevalla**, la base de donnees tourne en localhost (latence <0,1 ms).
Avec ~10 requetes SQL par endpoint, le total des E/S est inferieur a 1 ms.

Donne :
- Debit : λ ≈ 440 req/s
- Nombre de requetes servies simultanement (workers PHP-FPM) : L = 15
- Base de donnees en localhost, donc T_io ≈ 0

Par la loi de Little :

$$
W = \frac{L}{\lambda} = \frac{15}{440} \approx 0.034 \, \text{s} \approx 34 \, \text{ms}
$$

Puisque dans ce benchmark la base de donnees tourne en `localhost`
et que le total des `E/S` est inferieur a 1 ms,
le temps de reponse moyen resultant reflete presque entierement
le temps de traitement `CPU` par requete :

$$
T_{cpu} \approx W \approx 34 \, \text{ms}
$$

Cela signifie que dans les conditions `localhost`, presque tout le temps de reponse (~34 ms) est du `CPU` :
framework, `middleware`, `ORM`, serialisation.


Deplacons le meme endpoint vers un **environnement cloud** avec 20 requetes `SQL` :

$$
T_{cpu} = 34 \text{ ms (framework + logique)}
$$

$$
T_{io} = 20 \times 4 \text{ ms} = 80 \text{ ms (temps d'attente BDD)}
$$

$$
W = T_{cpu} + T_{io} = 114 \text{ ms}
$$

Coefficient de blocage :

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{34} \approx 2.4
$$

#### Etape 2 : PHP-FPM

Dans le modele `PHP-FPM`, chaque worker est un processus OS separe.
Pendant l'attente d'`E/S`, le worker se bloque et ne peut pas traiter d'autres requetes.

Pour utiliser pleinement 8 coeurs, il faut suffisamment de workers
pour qu'a tout moment, 8 d'entre eux effectuent du travail `CPU` :

$$
N_{workers} = 8 \times \left(1 + \frac{80}{34}\right) = 8 \times 3.4 = 27
$$

| Metrique                            | Valeur        |
|--------------------------------------|---------------|
| Workers                             | 27            |
| Memoire (27 × 40 Mo)                | **1,08 Go**   |
| Debit (27 / 0,114)                  | **237 req/s** |
| Utilisation CPU                     | ~100%         |

En pratique, les administrateurs definissent souvent `pm.max_children = 50-100`,
ce qui est au-dessus de l'optimum. Les workers supplementaires sont en competition pour le CPU,
augmentent le nombre de changements de contexte OS
et consomment de la memoire sans augmenter le debit.

#### Etape 3 : Coroutines (boucle d'evenements)

Dans le modele coroutine, un seul thread (par coeur) sert
de nombreuses requetes. Lorsqu'une coroutine attend une E/S,
l'ordonnanceur bascule vers une autre en ~200 nanosecondes
(voir [base de preuves](/fr/docs/evidence/coroutines-evidence.html)).

Le nombre optimal de coroutines est le meme :

$$
N_{coroutines} = 8 \times 3.4 = 27
$$

| Metrique                | Valeur        |
|--------------------------|---------------|
| Coroutines               | 27            |
| Memoire (27 × ~2 Mio)   | **54 Mio**    |
| Debit                    | **237 req/s** |
| Utilisation CPU          | ~100%         |

Le debit est **le meme** -- car le CPU est le goulot d'etranglement.
Mais la memoire pour la concurrence : **54 Mio vs 1,08 Go** -- une difference de **~20x**.

> **A propos de la taille de la pile des coroutines.**
> L'empreinte memoire d'une coroutine en PHP est determinee par la taille de la pile C reservee.
> Par defaut c'est ~2 Mio, mais elle peut etre reduite a 128 Kio.
> Avec une pile de 128 Kio, la memoire pour 27 coroutines serait de seulement ~3,4 Mio.

#### Etape 4 : Et si la charge CPU est plus faible ?

Le framework `Laravel` en mode `FPM` consomme ~34 ms de `CPU` par requete,
ce qui inclut la re-initialisation des services a chaque requete.

Dans un runtime avec etat (ce qu'est `True Async`), ces couts sont significativement reduits :
les routes sont compilees, le conteneur de dependances est initialise,
les pools de connexions sont reutilises.

Si `T_cpu` passe de 34 ms a 5 ms (ce qui est realiste pour un mode avec etat),
le tableau change radicalement :

| T_cpu | Coeff. blocage | N (8 coeurs) | λ (req/s) | Memoire (FPM) | Memoire (coroutines) |
|-------|----------------|------------|-----------|---------------|---------------------|
| 34 ms | 2,4            | 27         | 237       | 1,08 Go       | 54 Mio              |
| 10 ms | 8              | 72         | 800       | 2,88 Go       | 144 Mio             |
| 5 ms  | 16             | 136        | 1 600     | 5,44 Go       | 272 Mio             |
| 1 ms  | 80             | 648        | 8 000     | **25,9 Go**   | **1,27 Gio**        |

A `T_cpu = 1 ms` (handler leger, surcharge minimale) :
- PHP-FPM necessiterait **648 processus et 25,9 Go de RAM** -- irrealiste
- Les coroutines necessitent les memes 648 taches et **1,27 Gio** -- **~20x moins**

#### Etape 5 : Loi de Little -- verification par le debit

Verifions le resultat pour `T_cpu = 5 ms` :

$$
\lambda = \frac{L}{W} = \frac{136}{0.085} = 1\,600 \text{ req/s}
$$

Pour atteindre le meme debit, PHP-FPM a besoin de 136 workers.
Chacun occupe ~40 Mo :

$$
136 \times 40 \text{ Mo} = 5,44 \text{ Go pour les workers seuls}
$$

Coroutines :

$$
136 \times 2 \text{ Mio} = 272 \text{ Mio}
$$

Les ~5,2 Go liberes peuvent etre diriges vers les caches,
les pools de connexions BDD, ou le traitement de plus de requetes.

#### Resume : quand les coroutines apportent un benefice

| Condition                                        | Benefice des coroutines                                                   |
|--------------------------------------------------|---------------------------------------------------------------------------|
| Framework lourd, BDD localhost (T_io ≈ 0)         | Minimal -- la charge est CPU-bound                                        |
| Framework lourd, BDD cloud (T_io = 80 ms)         | Modere -- ~20x d'economie memoire a debit egal                           |
| Handler leger, BDD cloud                          | **Maximum** -- augmentation du debit jusqu'a 13x, ~20x d'economie memoire |
| Microservice / API Gateway                        | **Maximum** -- E/S quasi pure, dizaines de milliers de req/s sur un serveur |

**Conclusion :** plus la part des E/S dans le temps total de la requete est importante et plus le traitement CPU est leger,
plus le benefice des coroutines est grand.
Pour les applications IO-bound (qui constituent la majorite des services web modernes),
les coroutines permettent d'utiliser le meme CPU plusieurs fois plus efficacement,
tout en consommant des ordres de grandeur moins de memoire.

### Notes pratiques

- Augmenter le nombre de coroutines au-dela du niveau optimal apporte rarement un benefice,
  mais ce n'est pas non plus un probleme : les coroutines sont legeres, et la surcharge des coroutines
  "en trop" est incomparablement faible par rapport au cout des threads OS
- Les limitations reelles deviennent :
    - le pool de connexions a la base de donnees
    - la latence reseau
    - les mecanismes de back-pressure
    - les limites de descripteurs de fichiers ouverts (ulimit)
- Pour de telles charges de travail, le modele *boucle d'evenements + coroutines* s'avere
  significativement plus efficace que le modele bloquant classique

### Conclusion

Pour une application web moderne typique
ou les operations d'E/S predominent,
le modele d'execution asynchrone permet de :
- masquer efficacement la latence d'E/S
- ameliorer significativement l'utilisation du CPU
- reduire le besoin d'un grand nombre de threads

C'est precisement dans de tels scenarios que les avantages de l'asynchronisme
sont le plus clairement demontres.

---

### Pour aller plus loin

- [Swoole en pratique : mesures reelles](/fr/docs/evidence/swoole-evidence.html) -- cas de production (Appwrite +91%, IdleMMO 35M req/jour), benchmarks independants avec et sans BDD, TechEmpower
- [Python asyncio en pratique](/fr/docs/evidence/python-evidence.html) -- Duolingo +40%, Super.com -90% de couts, benchmarks uvloop, contre-arguments
- [Base de preuves : pourquoi les coroutines monothread fonctionnent](/fr/docs/evidence/coroutines-evidence.html) -- mesures du cout de changement de contexte, comparaison avec les threads OS, recherche academique et benchmarks industriels

---

### References et litterature

- Brian Goetz, *Java Concurrency in Practice* (2006) -- formule de taille optimale du pool de threads : `N = cores × (1 + W/S)`
- [Zalando Engineering: How to set an ideal thread pool size](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html) -- application pratique de la formule de Goetz avec exemples et derivation par la loi de Little
- [Backendhance: The Optimal Thread-Pool Size in Java](https://backendhance.com/en/blog/2023/optimal-thread-pool-size/) -- analyse detaillee de la formule avec prise en compte de l'utilisation CPU cible
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) -- mesures de l'impact de la latence reseau sur les performances PostgreSQL
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) -- directives pour les latences acceptables des requetes SQL dans les applications web
