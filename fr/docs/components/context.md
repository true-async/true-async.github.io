---
layout: docs
lang: fr
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /fr/docs/components/context.html
page_title: "Contexte"
description: "Le contexte dans TrueAsync -- stockage de donnees dans la hierarchie des scopes, valeurs locales et heritees, analogue a Go context.Context."
---

# Context : contextes d'execution

## Pourquoi c'est necessaire

Il existe une `API` avec une classe de service qui doit effectuer des actions liees a un jeton d'autorisation.
Cependant, passer le jeton a chaque methode du service est une mauvaise idee.
En `PHP`, ce probleme est resolu par des variables globales ou des proprietes statiques de classe.
Mais dans un environnement asynchrone, ou un seul processus peut traiter differentes requetes, cette approche ne fonctionne pas,
car au moment de l'appel, on ne sait pas quelle requete est en cours de traitement.

`Async\Context` permet de stocker des donnees associees a une coroutine ou un `Scope` et de construire la logique applicative
basee sur le contexte d'execution.

## Qu'est-ce que le contexte

`Async\Context` est un stockage cle-valeur lie a un `Scope` ou une coroutine.
Les contextes forment une hierarchie : lors de la lecture d'une valeur, la recherche remonte l'arbre des scopes.

C'est l'analogue de `context.Context` en `Go` ou de `CoroutineContext` en `Kotlin`.
Un mecanisme pour transmettre des donnees a travers la hierarchie sans passer explicitement des parametres.

## Trois niveaux de contexte

`TrueAsync` fournit trois fonctions pour acceder aux contextes :

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// Contexte du Scope courant
$scopeCtx = current_context();

// Contexte de la coroutine courante
$coroCtx = coroutine_context();

// Contexte racine global
$rootCtx = root_context();
?>
```

### current_context()

Retourne le contexte du `Scope` courant. Si le contexte n'a pas encore ete cree, il en cree un automatiquement.
Les valeurs definies ici sont visibles par toutes les coroutines de ce Scope.

### coroutine_context()

Retourne le contexte de la coroutine courante. C'est un contexte **prive** appartenant uniquement a cette coroutine.
Les autres coroutines ne peuvent pas voir les donnees definies ici.

### root_context()

Retourne le contexte global, partage sur l'ensemble de la requete. Les valeurs ici sont visibles via `find()` depuis n'importe quel contexte.

## Cles

Une cle peut etre une **chaine de caracteres** ou un **objet** :

```php
<?php
use function Async\current_context;

$ctx = current_context();

// Cle de type chaine
$ctx->set('request_id', 'abc-123');

// Objet comme cle (utile pour les jetons uniques)
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

Les cles objet sont stockees par reference dans le contexte, ce qui garantit leur unicite.

## Lecture : locale et hierarchique

### find() / get() / has() -- Recherche hierarchique

Recherche une valeur d'abord dans le contexte courant, puis dans le parent, et ainsi de suite jusqu'a la racine :

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() recherche en remontant la hierarchie
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- trouve dans root_context
});
?>
```

### findLocal() / getLocal() / hasLocal() -- Contexte courant uniquement

Recherche une valeur **uniquement** dans le contexte courant, sans remonter la hierarchie :

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- cette valeur n'est pas definie dans le Scope courant

$inherited = current_context()->find('app_name');
// "MyApp" -- trouvee dans le scope parent
?>
```

## Ecriture et suppression

### set()

```php
<?php
$ctx = current_context();

// Definir une valeur (replace = false par defaut)
$ctx->set('key', 'value');

// set() repete sans replace -- erreur
$ctx->set('key', 'new_value'); // Erreur : A context key already exists

// Avec replace = true explicite
$ctx->set('key', 'new_value', replace: true); // OK
```

La methode `set()` retourne `$this`, permettant le chainage de methodes :

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'en');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

La methode `unset()` retourne egalement `$this`.

## Exemples pratiques

### Transmission d'un identifiant de requete

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// Le middleware definit le request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// Toute coroutine dans ce scope peut le lire
spawn(function() {
    $requestId = current_context()->find('request_id');
    // Utilisation dans les logs
    error_log("[$requestId] Traitement de la requete...");
});
?>
```

### Contexte de coroutine comme stockage prive

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... effectuer le travail
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // Ne peut pas voir 'step' de c1
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### Configuration via root_context

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Defini au debut de la requete
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// Disponible depuis n'importe quelle coroutine
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## Voir aussi

- [Scope](/fr/docs/components/scope.html) -- gestion du cycle de vie des coroutines
- [Coroutines](/fr/docs/components/coroutines.html) -- l'unite de base de la concurrence
- [current_context()](/fr/docs/reference/current-context.html) -- obtenir le contexte du Scope courant
