---
layout: docs
lang: fr
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /fr/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio en pratique : Duolingo, Super.com, Instagram, benchmarks uvloop, contre-arguments."
---

# Python asyncio en pratique : mesures reelles

Python est le langage le plus similaire a PHP en termes de modele d'execution :
interprete, monothread (GIL), avec une dominance des frameworks synchrones.
La transition du Python synchrone (Flask, Django + Gunicorn) vers l'asynchrone
(FastAPI, aiohttp, Starlette + Uvicorn) est une analogie precise de la transition
de PHP-FPM vers un runtime base sur les coroutines.

Voici une collection de cas de production, de benchmarks independants et de mesures.

---

## 1. Production : Duolingo -- migration vers Python async (+40% de debit)

[Duolingo](https://blog.duolingo.com/async-python-migration/) est la plus grande
plateforme d'apprentissage des langues (500M+ utilisateurs).
Le backend est ecrit en Python.

En 2025, l'equipe a commence une migration systematique des services du Python synchrone
vers l'asynchrone.

| Metrique                 | Resultat                                |
|--------------------------|-----------------------------------------|
| Debit par instance       | **+40%**                                |
| Economies de couts AWS EC2 | **~30%** par service migre            |

Les auteurs notent qu'apres avoir construit l'infrastructure async, la migration
des services individuels s'est averee "assez simple".

**Source :** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. Production : Super.com -- reduction des couts de 90%

[Super.com](https://www.super.com/) (anciennement Snaptravel) est un service de recherche
d'hotels et de remises. Leur moteur de recherche gere 1 000+ req/s,
ingere plus de 1 To de donnees par jour et traite plus d'1 M$ de ventes quotidiennes.

**Caracteristique cle de la charge de travail :** chaque requete effectue **40+ appels reseau**
vers des API tierces. C'est un profil purement I/O-bound -- un candidat ideal pour les coroutines.

L'equipe a migre de Flask (synchrone, AWS Lambda) vers Quart (ASGI, EC2).

| Metrique                  | Flask (Lambda) | Quart (ASGI)  | Changement     |
|---------------------------|----------------|---------------|----------------|
| Couts d'infrastructure    | ~1 000 $/jour  | ~50 $/jour    | **-90%**       |
| Debit                     | ~150 req/s     | 300+ req/s    | **2x**         |
| Erreurs aux heures de pointe | Reference   | -95%          | **-95%**       |
| Latence                   | Reference      | -50%          | **2x plus rapide** |

Economies de 950 $/jour × 365 = **~350 000 $/an** sur un seul service.

**Source :** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. Production : Instagram -- asyncio a l'echelle de 500M DAU

Instagram sert plus de 500 millions d'utilisateurs actifs quotidiens
sur un backend Django.

Jimmy Lai (ingenieur Instagram) a decrit la migration vers asyncio dans une presentation
au PyCon Taiwan 2018 :

- Remplacement de `requests` par `aiohttp` pour les appels HTTP
- Migration du RPC interne vers `asyncio`
- Amelioration des performances de l'API et reduction du temps d'inactivite CPU

**Defis :** surcharge CPU elevee d'asyncio a l'echelle d'Instagram,
necessite de detection automatisee des appels bloquants par
analyse statique du code.

**Source :** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. Production : Feature Store -- des threads vers asyncio (-40% de latence)

Le service Feature Store a migre du multithreading Python vers asyncio.

| Metrique         | Threads                    | Asyncio               | Changement              |
|------------------|----------------------------|-----------------------|-------------------------|
| Latence          | Reference                  | -40%                  | **-40%**                |
| Consommation RAM | 18 Go (centaines de threads) | Nettement moins     | Reduction substantielle |

La migration a ete effectuee en trois phases avec un partage de trafic
50/50 en production pour validation.

**Source :** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. Production : Talk Python -- Flask vers Quart (-81% de latence)

[Talk Python](https://talkpython.fm/) est l'un des plus grands podcasts Python
et plateformes d'apprentissage. L'auteur (Michael Kennedy) a reecrit le site
de Flask (synchrone) vers Quart (Flask asynchrone).

| Metrique                 | Flask  | Quart | Changement  |
|--------------------------|--------|-------|-------------|
| Temps de reponse (exemple) | 42 ms | 8 ms | **-81%**    |
| Bugs apres migration     | --     | 2     | Minimal     |

L'auteur note : lors des tests de charge, le maximum de req/s
differait insignifiamment car les requetes MongoDB prenaient <1 ms.
Le gain apparait lors du traitement de requetes **concurrentes** --
lorsque plusieurs clients accedent simultanement au serveur.

**Source :** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions -- uvloop comme standard

Microsoft a inclus [uvloop](https://github.com/MagicStack/uvloop) --
une boucle d'evenements rapide basee sur libuv -- comme defaut pour Azure Functions
sur Python 3.13+.

| Test                            | asyncio standard | uvloop      | Amelioration |
|---------------------------------|------------------|-------------|--------------|
| 10K requetes, 50 VU (local)    | 515 req/s        | 565 req/s   | **+10%**     |
| 5 min, 100 VU (Azure)          | 1 898 req/s      | 1 961 req/s | **+3%**      |
| 500 VU (local)                 | 720 req/s        | 772 req/s   | **+7%**      |

La boucle d'evenements standard a 500 VU a montre **~2% de pertes de requetes**.
uvloop -- zero erreur.

**Source :** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. Benchmark : taches I/O-bound -- asyncio 130x plus rapide

Comparaison directe des modeles de concurrence sur une tache de telechargement de 10 000 URLs :

| Modele          | Temps    | Debit          | Erreurs   |
|-----------------|----------|----------------|-----------|
| Synchrone       | ~1 800 s | ~11 Ko/s       | --        |
| Threads (100)   | ~85 s    | ~238 Ko/s      | Faible    |
| **Asyncio**     | **14 s** | **1 435 Ko/s** | **0,06%** |

Asyncio : **130x plus rapide** que le code synchrone, **6x plus rapide** que les threads.

Pour les taches CPU-bound, asyncio n'apporte aucun avantage
(temps identique, +44% de consommation memoire).

**Source :** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. Benchmark : uvloop -- plus rapide que Go et Node.js

[uvloop](https://github.com/MagicStack/uvloop) est un remplacement direct de la boucle
d'evenements asyncio standard, ecrit en Cython au-dessus de libuv (la meme bibliotheque
sous-jacente a Node.js).

Serveur echo TCP :

| Implementation       | 1 Kio (req/s)  | Debit 100 Kio      |
|----------------------|----------------|---------------------|
| **uvloop**           | **105 459**    | **2,3 Gio/s**       |
| Go                   | 103 264        | --                  |
| asyncio standard     | 41 420         | --                  |
| Node.js              | 44 055         | --                  |

Serveur HTTP (300 concurrents) :

| Implementation          | 1 Kio (req/s) |
|-------------------------|---------------|
| **uvloop + httptools**  | **37 866**    |
| Node.js                 | Inferieur     |

uvloop : **2,5x plus rapide** que l'asyncio standard, **2x plus rapide** que Node.js,
**au niveau de Go**.

**Source :** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. Benchmark : aiohttp vs requests -- 10x sur les requetes concurrentes

| Bibliotheque  | req/s (concurrent) | Type  |
|---------------|---------------------|-------|
| **aiohttp**   | **241+**            | Async |
| HTTPX (async) | ~160                | Async |
| Requests      | ~24                 | Sync  |

aiohttp : **10x plus rapide** que Requests pour les requetes HTTP concurrentes.

**Source :** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. Contre-argument : Cal Paterson -- "Le Python async n'est pas plus rapide"

Il est important de presenter egalement les contre-arguments. Cal Paterson a realise un benchmark approfondi
avec une **vraie base de donnees** (PostgreSQL, selection aleatoire de lignes + JSON) :

| Framework                     | Type  | req/s     | Latence P99 |
|-------------------------------|-------|-----------|-------------|
| Gunicorn + Meinheld/Bottle    | Sync  | **5 780** | **32 ms**   |
| Gunicorn + Meinheld/Falcon    | Sync  | **5 589** | **31 ms**   |
| Uvicorn + Starlette           | Async | 4 952     | 75 ms       |
| Sanic                         | Async | 4 687     | 85 ms       |
| AIOHTTP                       | Async | 4 501     | 76 ms       |

**Resultat :** les frameworks synchrones avec des serveurs en C ont montre un **debit superieur**
et une **latence de queue 2-3x meilleure** (P99).

### Pourquoi l'async a-t-il perdu ?

Raisons :

1. **Une seule requete SQL** par requete HTTP -- trop peu d'E/S
   pour que la concurrence des coroutines ait un effet.
2. **Le multitache cooperatif** avec du travail CPU entre les requetes
   cree une distribution "inegale" du temps CPU --
   les calculs longs bloquent la boucle d'evenements pour tout le monde.
3. **La surcharge d'asyncio** (boucle d'evenements standard en Python)
   est comparable au gain de l'E/S non-bloquante lorsque les E/S sont minimales.

### Quand l'async aide reellement

Le benchmark de Paterson teste le **scenario le plus simple** (1 requete SQL).
Comme le demontrent les cas de production ci-dessus, l'async apporte un gain spectaculaire quand :

- Il y a **beaucoup** de requetes BDD / API externes (Super.com : 40+ appels par requete)
- La concurrence est **elevee** (milliers de connexions simultanees)
- Les E/S **dominent** par rapport au CPU (Duolingo, Appwrite)

Ceci est conforme a la theorie :
plus le coefficient de blocage (T_io/T_cpu) est eleve, plus le benefice des coroutines est grand.
Avec 1 requete SQL × 2 ms, le coefficient est trop faible.

**Source :** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower : frameworks Python

Resultats approximatifs de [TechEmpower Round 22](https://www.techempower.com/benchmarks/) :

| Framework          | Type       | req/s (JSON)            |
|--------------------|------------|-------------------------|
| Uvicorn (brut)     | Async ASGI | Le plus eleve en Python |
| Starlette          | Async ASGI | ~20 000-25 000          |
| FastAPI            | Async ASGI | ~15 000-22 000          |
| Flask (Gunicorn)   | Sync WSGI  | ~4 000-6 000            |
| Django (Gunicorn)  | Sync WSGI  | ~2 000-4 000            |

Frameworks async : **3-5x** plus rapides que les synchrones dans le test JSON.

**Source :** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## Resume : ce que montrent les donnees Python

| Cas                         | Sync → Async                           | Condition                               |
|-----------------------------|----------------------------------------|-----------------------------------------|
| Duolingo (production)       | **+40%** de debit, **-30%** de couts   | Microservices, E/S                      |
| Super.com (production)      | **2x** de debit, **-90%** de couts     | 40+ appels API par requete              |
| Feature Store (production)  | **-40%** de latence                    | Migration des threads vers asyncio      |
| Talk Python (production)    | **-81%** de latence                    | Flask → Quart                           |
| I/O-bound (10K URLs)        | **130x** plus rapide                   | E/S pure, concurrence massive           |
| aiohttp vs requests         | **10x** plus rapide                    | Requetes HTTP concurrentes              |
| uvloop vs standard          | **2,5x** plus rapide                   | Echo TCP, HTTP                          |
| TechEmpower JSON            | **3-5x**                               | FastAPI/Starlette vs Flask/Django       |
| **CRUD simple (1 SQL)**     | **Le sync est plus rapide**            | Cal Paterson : P99 2-3x pire pour async |
| **CPU-bound**               | **Pas de difference**                  | +44% memoire, 0% de gain                |

### Point cle

Le Python async apporte un benefice maximal avec un **coefficient de blocage eleve** :
lorsque le temps d'E/S depasse significativement le temps CPU.
Avec 40+ appels reseau (Super.com) -- 90% d'economies de couts.
Avec 1 requete SQL (Cal Paterson) -- l'async est plus lent.

Ceci **confirme la formule** de [Efficacite des taches IO-bound](/fr/docs/evidence/concurrency-efficiency.html) :
gain ≈ 1 + T_io/T_cpu. Quand T_io >> T_cpu -- des dizaines a des centaines de fois.
Quand T_io ≈ T_cpu -- minimal ou nul.

---

## Lien avec PHP et True Async

Python et PHP sont dans une situation similaire :

| Caracteristique         | Python               | PHP                 |
|-------------------------|----------------------|---------------------|
| Interprete              | Oui                  | Oui                 |
| GIL / monothread        | GIL                  | Monothread          |
| Modele dominant          | Sync (Django, Flask) | Sync (FPM)          |
| Runtime async            | asyncio + uvloop     | Swoole / True Async |
| Framework async          | FastAPI, Starlette   | Hyperf              |

Les donnees Python montrent que la transition vers les coroutines dans un langage
interprete monothread **fonctionne**. L'echelle du gain
est determinee par le profil de charge, pas par le langage.

---

## References

### Cas de production
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% cost reduction](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop as default (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### Benchmarks
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### Coroutines vs threads
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
