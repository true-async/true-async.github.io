---
layout: tutorial
lang: fr
path_key: "/tutors-laravel/02-pool-transactions.html"
nav_active: docs
permalink: /fr/tutors-laravel/02-pool-transactions.html
page_title: "Pool de Connexions et Transactions"
description: "PDO Pool sous Eloquent et CoroutineTransactions : pourquoi le compteur de transactions imbriquées ne peut pas rester sur une propriété de Connection."
---

# Pool de Connexions et Transactions

`Auth`, `session`, `request` : nous avons réglé cela au chapitre
précédent, du contexte plus un proxy, et le framework a arrêté de
confondre les requêtes. La base de données semble encore plus simple :
le neuvième chapitre de la série de base l'a déjà résolue, le
`PDO Pool` remet à chaque coroutine sa propre connexion et la reprend
lui-même. Qu'est-ce qui pourrait bien mal tourner ici pour `Eloquent` ?

Cela peut mal tourner. Le pool gère la connexion de manière
transparente. Mais il ne sait rien d'un autre morceau d'état que
`Laravel` conserve juste à côté de cette connexion : le compteur
d'imbrication des transactions.

## Où Vit `transactionLevel()`

À l'intérieur d'`Illuminate\Database\Connection`, il y a une propriété
d'instance ordinaire :

```php
protected $transactions = 0;
```

`beginTransaction()` l'incrémente, `commit()` et `rollBack()` la
décrémentent. Tant qu'une seule `Connection` sert un seul processus,
cela a parfaitement de sens : une propriété, une transaction. Mais le
`PDO Pool` opère à une couche en dessous de `Connection`. Il échange la
connexion physique sous l'objet, tandis que l'objet `Connection`
lui-même, celui auquel `$this->transactions` est attaché, reste une
seule et même instance partagée par tout le `DatabaseManager`.

Rejouons le scénario du chapitre précédent, cette fois avec la base de
données :

```php
$server->addHttpHandler(function ($request, $response) {
    DB::transaction(function () use ($request) {
        Order::create(['user_id' => $request->getQueryParam('u')]);
        delay(30); // la coroutine s'endort en plein milieu de la transaction
    });

    $response->json(['ok' => true]);
});
```

Deux requêtes entrent dans `DB::transaction()` de manière concurrente.
Les deux connexions physiques sont honnêtement distribuées par le
pool, chacune la sienne. Mais `$this->transactions` pour les deux est
le même nombre sur le même objet `Connection`. La première coroutine
fait passer le compteur à `1`, puis s'endort. La seconde l'incrémente
aussi, mais cette fois à `2`, alors que pour elle cela aurait dû être
une transaction externe au niveau `1`. Le `commit()` de la première
coroutine se retrouve au mauvais niveau d'imbrication, et Laravel émet
silencieusement un `SAVEPOINT` là où il ne devrait pas, ou valide une
transaction prématurément alors qu'une coroutine voisine la maintient
encore ouverte.

## Même Recette, Portée Différente : la Coroutine, Pas l'Arbre de Requête

Au chapitre précédent, l'état d'`auth` vivait dans le contexte de
scope parce qu'il est partagé entre toutes les coroutines d'une même
requête. Le compteur de transactions est construit différemment : le
`PDO Pool` distribue une connexion physique par *coroutine*, pas par
requête entière (un `TaskGroup` parallèle à l'intérieur d'un handler
obtient deux connexions distinctes du pool). Le compteur doit donc
vivre dans le contexte de coroutine, pas dans le contexte de scope :

```php
trait CoroutineTransactions
{
    private const CTX_TRANSACTIONS = 'db.transactions';

    public function transactionLevel()
    {
        if ($this->isAsyncMode()) {
            return coroutine_context()->find(self::CTX_TRANSACTIONS) ?? 0;
        }

        return $this->transactions;
    }

    private function setTransactionLevel(int $level): void
    {
        if ($this->isAsyncMode()) {
            coroutine_context()->set(self::CTX_TRANSACTIONS, $level, replace: true);
        } else {
            $this->transactions = $level;
        }
    }

    // beginTransaction(), commit(), rollBack(), et les gestionnaires
    // d'erreurs sont surchargés de la même façon : au lieu de lire et
    // écrire $this->transactions, ils passent par
    // setTransactionLevel()/transactionLevel().
}
```

`coroutine_context()` face à `current_context()`, c'est exactement la
frontière évoquée dans le chapitre `Context` de la série de base : le
premier est privé à une seule coroutine, le second est partagé sur
tout l'arbre de coroutines d'une requête. Le choix ici n'est pas une
question de style, il est obligatoire : mélangez-les et deux allers-
retours parallèles vers la base de données à l'intérieur d'une même
requête recommencent à partager le compteur de transactions de
quelqu'un d'autre, le trou se déplace juste d'un étage plus haut.

Le trait ne réécrit pas `Connection` en entier, il intercepte
chirurgicalement les méthodes qui touchent à `$this->transactions`, et
il est attaché à une classe de connexion spécifique :

```php
class AsyncPgsqlConnection extends PostgresConnection
{
    use CoroutineTransactions;
}
```

Il y a une classe distincte par `SGBD`, `AsyncPgsqlConnection`,
`AsyncMySqlConnection`, `AsyncMariaDbConnection`,
`AsyncSqliteConnection`, `AsyncSqlServerConnection`, parce que les
classes parentes de Laravel diffèrent déjà, tandis que le trait
d'isolation du compteur est le même pour toutes.

## Pourquoi Vous Ne Pouvez Pas Simplement Scoper Tout le `DatabaseManager`

La tentation est là : puisque nous savons déjà comment cacher un
service derrière un contexte (`ScopedServiceProxy` du chapitre
précédent), pourquoi ne pas faire la même chose pour `db` ? La raison
pour laquelle cela n'arrive pas est plutôt désagréable.
`DatabaseServiceProvider::boot()` écrit ceci une fois au démarrage :

```php
Model::setConnectionResolver($app['db']);
```

C'est une propriété statique sur la classe `Model` elle-même, partagée
par chaque modèle et chaque requête. Si `db` était résolu
différemment pour chaque scope, cette référence statique continuerait
à pointer vers le `DatabaseManager` de la requête qui l'a créée en
premier. Une fois le scope de cette requête terminé et nettoyé,
l'objet vers lequel pointe `Model::$resolver` est collecté par le
ramasse-miettes, et la propriété statique se retrouve à pointer vers
de la mémoire morte. Le résultat n'est pas « des données incorrectes »,
c'est le processus entier qui plante.

Donc `db` reste un singleton, comme il l'a toujours été. L'isolation
des connexions physiques est le travail du `PDO Pool` au niveau `C`,
pas celui du conteneur de dépendances. L'isolation du compteur de
transactions est le travail du trait au niveau d'une seule coroutine.
Deux outils étroits et précis plutôt qu'une grande refonte qui, en
prime, ferait tomber le serveur.

Nous avons traité l'état de la requête et l'état des transactions.
Laravel gère les réponses HTTP ordinaires tout seul, en les bufferisant
en entier. Mais que se passe-t-il si la réponse n'est pas ponctuelle
mais un flux : une barre de progression vers le navigateur, ou un
appel depuis un service voisin en gRPC ? C'est là que nous allons dans
le chapitre suivant.
