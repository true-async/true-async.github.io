---
layout: docs
lang: fr
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /fr/docs/evidence/coroutines-evidence.html
page_title: "Pourquoi les coroutines fonctionnent"
description: "Preuves empiriques : mesures du cout de changement de contexte, comparaison memoire, le probleme C10K, recherche academique."
---

# Preuves empiriques : pourquoi les coroutines monothread fonctionnent

L'affirmation selon laquelle la concurrence cooperative monothread est efficace
pour les charges IO-bound est etayee par des mesures, des recherches academiques
et l'experience operationnelle de systemes a grande echelle.

---

## 1. Cout de la commutation : coroutine vs thread OS

Le principal avantage des coroutines est que la commutation cooperative s'effectue
dans l'espace utilisateur, sans invoquer le noyau du systeme d'exploitation.

### Mesures sous Linux

| Metrique                | Thread OS (Linux NPTL)                   | Coroutine / tache asynchrone             |
|-------------------------|------------------------------------------|------------------------------------------|
| Changement de contexte  | 1,2-1,5 us (epingle), ~2,2 us (non epingle) | ~170 ns (Go), ~200 ns (Rust async)    |
| Creation de tache       | ~17 us                                   | ~0,3 us                                 |
| Memoire par tache       | ~9,5 Kio (min), 8 Mio (pile par defaut)  | ~0,4 Kio (Rust), 2-4 Kio (Go)           |
| Scalabilite             | ~80 000 threads (test)                   | 250 000+ taches async (test)             |

**Sources :**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) --
  mesures directes des couts de commutation des threads Linux et comparaison avec les goroutines
- [Jim Blandy, context-switch (benchmark Rust)](https://github.com/jimblandy/context-switch) --
  commutations de taches async en ~0,2 us vs ~1,7 us pour un thread (**8,5x** plus rapide),
  creation en 0,3 us vs 17 us (**56x** plus rapide), utilisation de 0,4 Kio vs 9,5 Kio (**24x** moins)

### Ce que cela signifie en pratique

La commutation d'une coroutine coute **~200 nanosecondes** -- un ordre de grandeur moins cher
que la commutation d'un thread OS (~1,5 us).
Mais plus important encore, la commutation de coroutine **n'entraine pas de couts indirects** :
vidage du cache TLB, invalidation du predicteur de branchement, migration entre coeurs --
tous ces phenomenes sont caracteristiques des threads, mais pas des coroutines au sein d'un meme thread.

Pour une boucle d'evenements gerant 80 coroutines par coeur,
la surcharge totale de commutation est :

```
80 × 200 ns = 16 us pour un cycle complet a travers toutes les coroutines
```

C'est negligeable par rapport aux 80 ms de temps d'attente d'E/S.

---

## 2. Memoire : echelle des differences

Les threads OS allouent une pile de taille fixe (8 Mio par defaut sous Linux).
Les coroutines ne stockent que leur etat -- variables locales et point de reprise.

| Implementation                 | Memoire par unite de concurrence                          |
|--------------------------------|-----------------------------------------------------------|
| Thread Linux (pile par defaut) | 8 Mio virtuel, ~10 Kio RSS minimum                       |
| Goroutine Go                   | 2-4 Kio (pile dynamique, croit selon les besoins)         |
| Coroutine Kotlin               | quelques dizaines d'octets sur le tas ; ratio thread:coroutine ≈ 6:1 |
| Tache async Rust               | ~0,4 Kio                                                  |
| Frame coroutine C++ (Pigweed)  | 88-408 octets                                             |
| Coroutine Python asyncio       | ~2 Kio (vs ~5 Kio + 32 Kio de pile pour un thread)        |

**Sources :**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) -- ratio memoire 6:1
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) -- comparaison en Python
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) -- pile dynamique des goroutines

### Implications pour les serveurs web

Pour 640 taches concurrentes (8 coeurs × 80 coroutines) :

- **Threads OS** : 640 × 8 Mio = 5 Gio de memoire virtuelle
  (en realite moins grace a l'allocation paresseuse, mais la pression sur l'ordonnanceur OS est significative)
- **Coroutines** : 640 × 4 Kio = 2,5 Mio
  (une difference de **trois ordres de grandeur**)

---

## 3. Le probleme C10K et les serveurs reels

### Le probleme

En 1999, Dan Kegel a formule le
[probleme C10K](https://www.kegel.com/c10k.html) :
les serveurs utilisant le modele "un thread par connexion" etaient incapables de servir
10 000 connexions simultanees.
La cause n'etait pas les limitations materielles, mais la surcharge des threads OS.

### La solution

Le probleme a ete resolu par la transition vers une architecture evenementielle :
au lieu de creer un thread pour chaque connexion,
une seule boucle d'evenements sert des milliers de connexions dans un seul thread.

C'est exactement l'approche implementee par **nginx**, **Node.js**, **libuv**, et -- dans le contexte PHP -- **True Async**.

### Benchmarks : nginx (evenementiel) vs Apache (thread par requete)

| Metrique (1000 connexions concurrentes) | nginx        | Apache                               |
|-----------------------------------------|--------------|--------------------------------------|
| Requetes par seconde (statique)         | 2 500-3 000  | 800-1 200                            |
| Debit HTTP/2                            | >6 000 req/s | ~826 req/s                           |
| Stabilite sous charge                   | Stable       | Degradation a >150 connexions        |

nginx sert **2-4x** plus de requetes qu'Apache,
tout en consommant significativement moins de memoire.
Apache avec son architecture thread-par-requete n'accepte pas plus de 150 connexions simultanees
(par defaut), apres quoi les nouveaux clients attendent dans une file.

**Sources :**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) -- enonce du probleme
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) -- benchmarks
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) -- experience industrielle

---

## 4. Recherche academique

### SEDA : Staged Event-Driven Architecture (Welsh et al., 2001)

Matt Welsh, David Culler et Eric Brewer de l'UC Berkeley ont propose
SEDA -- une architecture serveur basee sur les evenements et les files entre les etapes de traitement.

**Resultat cle** : le serveur SEDA en Java a surpasse
Apache (C, thread-par-connexion) en debit a 10 000+ connexions simultanees.
Apache ne pouvait pas accepter plus de 150 connexions simultanees.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Comparaison des architectures de serveurs web (Pariag et al., 2007)

La comparaison la plus approfondie des architectures a ete menee par Pariag et al.
de l'Universite de Waterloo. Ils ont compare trois serveurs sur la meme base de code :

- **userver** -- evenementiel (SYMPED, processus unique)
- **Knot** -- thread-par-connexion (bibliotheque Capriccio)
- **WatPipe** -- hybride (pipeline, similaire a SEDA)

**Resultat cle** : le userver evenementiel et WatPipe base sur pipeline
ont fourni **~18% de debit en plus** que le Knot base sur threads.
WatPipe necessitait 25 threads d'ecriture pour atteindre les memes performances
que userver avec 10 processus.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream : acceleration du traitement evenementiel avec les coroutines (2022)

Une etude publiee sur arXiv a effectue une comparaison directe
des coroutines et des threads pour le traitement de flux de donnees (traitement evenementiel).

**Resultat cle** : les coroutines ont fourni **au moins 2x le debit**
par rapport aux threads conventionnels pour le traitement de flux d'evenements.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. Scalabilite : 100 000 taches

### Kotlin : 100 000 coroutines en 100 ms

Dans le benchmark [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/),
la creation et le lancement de 100 000 coroutines ont necessite ~100 ms de surcharge.
Un nombre equivalent de threads necessiterait ~1,7 seconde rien que pour la creation
(100 000 × 17 us) et ~950 Mio de memoire pour les piles.

### Rust : 250 000 taches async

Dans le [benchmark context-switch](https://github.com/jimblandy/context-switch),
250 000 taches async ont ete lancees dans un seul processus,
tandis que les threads OS ont atteint leur limite a ~80 000.

### Go : des millions de goroutines

Go lance couramment des centaines de milliers et des millions de goroutines dans les systemes de production.
C'est ce qui permet aux serveurs comme Caddy, Traefik et CockroachDB
de gerer des dizaines de milliers de connexions simultanees.

---

## 6. Resume des preuves

| Affirmation                                         | Confirmation                                              |
|-----------------------------------------------------|-----------------------------------------------------------|
| La commutation de coroutine est moins couteuse que les threads | ~200 ns vs ~1500 ns -- **7-8x** (Bendersky 2018, Blandy) |
| Les coroutines consomment moins de memoire           | 0,4-4 Kio vs 9,5 Kio-8 Mio -- **24x+** (Blandy, Go FAQ) |
| Un serveur evenementiel est plus scalable            | nginx 2-4x debit vs Apache (benchmarks)                  |
| Evenementiel > thread-par-connexion (academiquement)| +18% debit (Pariag 2007), C10K resolu (Kegel 1999)        |
| Coroutines > threads pour le traitement d'evenements | 2x debit (AEStream 2022)                                 |
| Centaines de milliers de coroutines dans un processus | 250K taches async (Rust), 100K coroutines en 100ms (Kotlin) |
| La formule N ≈ 1 + T_io/T_cpu est correcte           | Goetz 2006, Zalando, loi de Little                        |

---

## References

### Mesures et benchmarks
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### Articles academiques
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### Experience industrielle
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### Voir aussi
- [Python asyncio en pratique](/fr/docs/evidence/python-evidence.html) -- cas de production (Duolingo, Super.com, Instagram), benchmarks uvloop, contre-arguments de Cal Paterson
- [Swoole en pratique](/fr/docs/evidence/swoole-evidence.html) -- cas de production et benchmarks pour les coroutines PHP
