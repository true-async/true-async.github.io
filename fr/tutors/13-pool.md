---
layout: tutorial
lang: fr
path_key: "/tutors/13-pool.html"
nav_active: docs
permalink: /fr/tutors/13-pool.html
page_title: "Pool"
description: "Async\\Pool : un pool de ressources universel avec contrôles de santé et disjoncteur."
---

# Pool

Dans le chapitre sur PDO Pool, nous avons esquissé un pool fondé sur un canal en six lignes et
avons aussitôt admis qu'il était naïf pour la vraie vie : vous devez penser à rendre la ressource
quoi qu'il arrive, reconnaître les connexions cassées et remplacer les mortes. Pour PDO, le cœur
faisait tout cela pour nous. Mais `checkAddress` dialogue avec `GeoDirectory` par HTTP, et ouvrir
une nouvelle connexion à chaque requête serait tout aussi coûteux. Et demain il y aura Redis pour
le cache et SMTP pour l'e-mail.

Nous n'allons tout de même pas bricoler un pool fondé sur un canal pour chaque ressource. Voilà, il
existe une primitive prête à l'emploi pour cela, celle-là même qui travaille sous le capot de PDO
Pool : `Async\Pool`.

## Fabrique et destructeur

Le pool ne sait pas quel genre de ressource il détient. Vous lui indiquez deux choses : comment
créer une ressource et comment en détruire une :

```php
use Async\Pool;

$geo = new Pool(
    factory:    fn() => new GeoConnection('geodirectory.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);
```

`min: 2` signifie que deux connexions sont ouvertes d'avance, pour que les premières coroutines
n'aient pas à patienter le temps d'une poignée de main. `max: 10` signifie que le pool ne créera
jamais plus de dix connexions, peu importe combien de coroutines en demandent une. C'est la limite
de concurrence familière, sauf qu'elle est maintenant liée à la ressource elle-même plutôt qu'à un
nombre de workers.

Vient ensuite le cycle que nous avons déjà construit à la main avec un canal :

```php
$conn = $geo->acquire();

try {
    $verdict = $conn->request("/check?address=$address");
} finally {
    $geo->release($conn);
}
```

`acquire` distribue une ressource libre. Si aucune n'est libre et que la limite n'est pas
atteinte, la fabrique en crée une nouvelle. Si la limite est atteinte, la coroutine s'endort
jusqu'à ce que quelqu'un d'autre appelle `release` : la même mécanique que `recv` sur un canal
vide. Remarquez le `finally` : la ressource est rendue quoi qu'il arrive, y compris en cas
d'exception ou d'annulation. C'est exactement l'endroit où notre pool bricolé à la main trébuchait.

Vous pouvez aussi attendre avec une limite, de la manière habituelle :

```php
$conn = $geo->acquire(timeout: 3000); // TimeoutException si elle n'arrive pas en 3 secondes
```

## Les ressources meurent

Une connexion restée dans le pool pendant une demi-heure a pu mourir en silence : le serveur l'a
fermée après un délai d'expiration, le réseau a eu un raté. Nous avons déjà vu dans le chapitre PDO
ce à quoi cela mène : la coroutine suivante reçoit une erreur mystérieuse surgie de nulle part. Le
pool combat cela sur trois fronts :

```php
$geo = new Pool(
    factory:             fn() => new GeoConnection('geodirectory.example.com'),
    destructor:          fn($conn) => $conn->close(),
    healthcheck:         fn($conn) => $conn->ping(),
    beforeAcquire:       fn($conn) => $conn->isAlive(),
    beforeRelease:       fn($conn) => !$conn->isBroken(),
    min: 2,
    max: 10,
    healthcheckInterval: 30000,
);
```

- **`healthcheck`** — toutes les trente secondes, le pool parcourt de lui-même ses ressources
  libres et vérifie leur pouls. Les mortes sont détruites et remplacées par des neuves.
- **`beforeAcquire`** — une ultime vérification avant de distribuer une ressource. Si elle échoue,
  la ressource est détruite et la coroutine reçoit la suivante.
- **`beforeRelease`** — une vérification au retour. Une coroutine a pu casser la connexion en plein
  milieu d'une requête ; une ressource comme celle-là ne retourne pas dans le pool.

Les coroutines ne savent rien de ce travail en coulisses : elles demandent une ressource et en
obtiennent une qui fonctionne. La gestion de la santé s'exprime de manière déclarative, dans le
constructeur, au lieu d'être étalée à travers le code sous forme d'un tas de `if`.

## Disjoncteur

Imaginez maintenant que `GeoDirectory` tombe entièrement en panne. Les dix connexions sont mortes,
chaque coroutine attend consciencieusement l'expiration d'un délai, crée une nouvelle connexion,
attend de nouveau. L'application dépense toute son énergie à bombarder un service déjà à terre, et
ce faisant l'empêche de se relever.

Le génie électrique a inventé un remède pour exactement cela : un disjoncteur qui ouvre le circuit
jusqu'à ce que le défaut soit résolu. Le motif porte son nom, circuit breaker, et il est intégré
au pool. Le pool possède trois états : `ACTIVE`, tout fonctionne ; `INACTIVE`, le service a été
déclaré indisponible et `acquire` échoue immédiatement, sans aucun délai ; `RECOVERING`, une
vérification prudente pour savoir si le service est revenu à la vie.

Vous pouvez changer d'état à la main, ou confier la décision à une stratégie :

```php
use Async\CircuitBreakerStrategy;

final class FiveStrikes implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $pool): void
    {
        $this->failures = 0;
        $pool->activate();
    }

    public function reportFailure(mixed $pool, Throwable $error): void
    {
        if (++$this->failures >= 5) {
            $pool->deactivate();
        }
    }

    public function shouldRecover(): bool
    {
        return true; // tenter la récupération à la première occasion
    }
}

$geo->setCircuitBreakerStrategy(new FiveStrikes());
```

Le pool lui-même signale à la stratégie chaque succès et chaque échec d'une ressource, et demande
via `shouldRecover` s'il est temps de vérifier prudemment si le service est de retour. Cinq échecs
d'affilée, et le circuit s'ouvre : les coroutines obtiennent un échec rapide au lieu d'une lente
torture de délais, et `GeoDirectory` cesse de recevoir des coups inutiles et peut récupérer en
paix.

Avec le recul, `Pool` fait exactement ce que nous avions bricolé à la main à partir d'un canal au
chapitre neuf, plus tout ce que vous ne voulez vraiment pas bricoler à la main : retour garanti,
contrôles de santé, un disjoncteur. `PDO Pool` est la même primitive, simplement dissimulée
derrière la façade `PDO`. Et pour tout le reste, clients HTTP, Redis, sockets, et objets lourds en
général, il y a `Async\Pool`.

À ce stade, notre arsenal a fière allure : coroutines, canaux, scopes, groupes de tâches, pools.
Mais tout cela s'exécute dans un seul thread du système d'exploitation et partage un seul cœur de
processeur. Tant que les tâches attendent des entrées/sorties, ce n'est le problème de personne.
Mais que se passe-t-il si le travail n'est pas borné par l'attente mais par le calcul ? Là, tout
le tableau change, et c'est le sujet du prochain chapitre.
