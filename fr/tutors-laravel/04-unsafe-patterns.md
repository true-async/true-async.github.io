---
layout: tutorial
lang: fr
path_key: "/tutors-laravel/04-unsafe-patterns.html"
nav_active: docs
permalink: /fr/tutors-laravel/04-unsafe-patterns.html
page_title: "Ce Que Vous Ne Pouvez Pas Faire Dans une Coroutine"
description: "Propriétés statiques mutables, once() sur un singleton, et Number::useLocale() : les fuites d'état classiques entre requêtes, et comment les détecter avec l'analyse statique."
---

# Ce Que Vous Ne Pouvez Pas Faire Dans une Coroutine

Les chapitres précédents ont corrigé des fuites d'état spécifiques :
`auth`/`session` via le contexte, le compteur de transactions via un
trait. `laravel-spawn` a comblé ces trous pour vous. Mais le framework
est vaste, les packages tiers le sont encore plus, et demain quelqu'un
de votre équipe écrira son propre service. Ce qu'il vous faut, c'est
une règle applicable au premier coup d'œil, pour distinguer le code
sûr pour des coroutines concurrentes du code qui, un jour, remettra à
un utilisateur les données de quelqu'un d'autre.

## Une Seule Règle : Ne Pas Écrire Dans un `static` Après le Démarrage

Chaque exemple ci-dessous est un cas particulier de la même erreur :
quelque chose écrit une valeur dans une mémoire partagée par toutes
les coroutines du processus, et cette valeur appartient à une requête
spécifique.

**Une propriété statique mutable sur un service.**

```php
// Dangereux
class PriceCalculator
{
    private static array $cache = [];

    public function forProduct(int $id): float
    {
        return self::$cache[$id] ??= $this->computeExpensive($id);
    }
}
```

Cela ressemble à une mémoïsation inoffensive. En réalité c'est un
tableau partagé entre toutes les coroutines. Si `computeExpensive()`
dépend de quoi que ce soit qui change d'une requête à l'autre, la
devise d'un utilisateur, une majoration régionale, la première requête
décide du sort du cache pour toutes celles qui suivent. La correction
est simple : une propriété d'instance plutôt que `static`, avec le
service résolu par requête (l'« approche un » du premier chapitre).

**Et si le service est le vôtre, et que vous avez délibérément besoin
d'un état par requête ?** Vous n'avez pas besoin d'attendre que
`laravel-spawn` fournisse un `ScopedService` et son proxy, c'est la
même astuce qui a résolu le problème du compteur de transactions au
deuxième chapitre, un cran au-dessus : pas `coroutine_context()` pour
une seule coroutine, mais `request_context()`, partagé sur tout
l'arbre de coroutines d'une requête.

```php
class PriceCalculator  // reste un singleton
{
    private const CTX_CACHE = 'price.cache';

    public function forProduct(int $id): float
    {
        $cache = request_context()->find(self::CTX_CACHE) ?? [];

        return $cache[$id] ??= $this->computeExpensive($id, $cache);
    }
}
```

La différence avec l'exemple précédent paraît minime mais elle est
fondamentale : le tableau ne vit plus sur une propriété `static`
partagée par tout le processus au niveau de la classe, il vit dans le
contexte de scope d'une requête spécifique. Deux requêtes concurrentes
appellent la toute même instance de `PriceCalculator`, et pourtant
chacune obtient son propre `$cache`, parce que `request_context()` se
résout vers un scope différent pour chacune. Un examen détaillé de
`coroutine_context()` et `request_context()` se trouve au
[deuxième chapitre](/fr/tutors-laravel/02-pool-transactions.html).

**`once()` sur un singleton.**

```php
// Dangereux
class CurrentUserService  // enregistré comme singleton
{
    public function get()
    {
        return once(fn() => Auth::user());  // met en cache le PREMIER utilisateur, pour toujours
    }
}
```

`once()` met en cache le résultat de la closure dans une `WeakMap`
indexée par l'objet auquel l'appel appartient. Pour un singleton, cet
objet est unique pour tout le processus, donc le cache l'est aussi. La
première requête calcule l'utilisateur, chaque requête suivante obtient
le même. Sur des objets par requête (contrôleurs, modèles `Eloquent`),
`once()` est parfaitement sûr, car l'objet lui-même y est neuf à
chaque requête.

**Une mutation globale comme `Number::useLocale()`.**

```php
// Dangereux
Number::useLocale('de');
$price = Number::format(1234.5);       // et si la coroutine s'endort avant cette ligne ?

// Sûr
$price = Number::format(1234.5, locale: 'de');
```

`useLocale()` modifie une variable statique sur la classe `Number`.
Entre l'appel à `useLocale()` et `format()`, un `await`, un `delay()`,
n'importe quel aller-retour vers la base de données peut survenir,
autrement dit un point où l'ordonnanceur cède le contrôle à une autre
coroutine. Si cette coroutine appelle elle aussi `Number::format()`
sans locale explicite, elle récupère la locale que quelqu'un d'autre
vient de définir. Le paramètre explicite `locale:` élimine
entièrement la possibilité d'une course : il n'y a rien à protéger,
parce qu'il n'y a rien à partager.

**Les superglobales.** `$_GET`, `$_POST`, `$_SERVER`, `$_SESSION`
étaient sûres sous PHP-FPM simplement parce qu'elles ne vivaient que
pour une requête. Dans un worker à coroutines, ce sont des variables
partagées par tout le processus, et c'est le serveur qui les met à
jour, pas PHP à chaque nouvelle connexion comme vous en avez
l'habitude. Utilisez l'objet `Request`, que `laravel-spawn` isole
déjà via `current_context()`, et laissez les superglobales
tranquilles.

## Quand `static` Est Réellement Sûr

Il est tout aussi important de ne pas basculer dans l'autre extrême et
de déclarer tout `static` criminel. Ceci est sûr :

- **`readonly static`**, si une valeur ne change jamais après
  l'initialisation, la partager entre coroutines n'est pas plus
  dangereux que partager une constante.
- **La configuration au démarrage**, un `static` défini une fois quand
  le worker démarre et seulement lu ensuite (routes, templates
  compilés, macros enregistrées).
- **Les caches déterministes**, si le résultat ne dépend que des
  arguments d'entrée et non de la requête « courante » (disons, le
  cache de `Str::camel()` pour une chaîne donnée est toujours la même
  chaîne), une course pour le remplir ne corrompt pas les données, au
  pire quelque chose est calculé deux fois.
- **Les compteurs monotones sans sémantique**, un alias
  auto-incrémenté comme un compteur interne pour des alias SQL
  uniques : même si deux requêtes obtiennent le même nombre, la
  collision ne produit pas de données incorrectes, tout au plus un
  alias moins élégant.

La différence est toujours la même : est-ce *un résultat calculé qui
ne dépend pas de la requête* que l'on partage, ou *un état qui
appartient à une requête spécifique* ? Le premier est une
optimisation. Le second est une fuite.

## L'Analyse Statique Plutôt que la Lecture Attentive

Parcourir manuellement chaque package tiers à la recherche de
`private static` sans `readonly` est exactement le genre de travail
qu'on délègue volontiers à un linter. Le package fournit une règle
`PHPStan` conçue pour cela :

```php
final class MutableStaticPropertyRule implements Rule
{
    public function getNodeType(): string
    {
        return Property::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (! $node->isStatic() || $node->isReadonly()) {
            return [];
        }

        // ... message « fuite d'état potentielle entre coroutines »
    }
}
```

La règle est aussi simple que possible : elle trouve chaque propriété
`static` sans le modificateur `readonly` et la signale. Il y aura
beaucoup de faux positifs, exactement les cas « sûrs » listés
ci-dessus, mais c'est un compromis délibéré : rater une vraie fuite
coûte plus cher que trier manuellement une liste de candidats une
fois.

```bash
phpstan analyse app/ --configuration=phpstan.neon
phpstan analyse vendor/some/package/src --configuration=phpstan.neon
```

Exécuter la règle contre le framework Laravel lui-même fait remonter
plus de trois cents résultats. L'immense majorité sont exactement les
`static` sûrs de la section précédente : caches compilés de
`BladeCompiler`, drapeaux de configuration définis une fois au
`boot()`, résolveurs qui accèdent en interne à un `$app['request']`
déjà isolé. Trier trois cents lignes une fois représente un quart
d'heure de travail. En rater ne serait-ce qu'une seule et tomber sur
une fuite en production, ce sont des heures à déboguer le rapport de
bug de quelqu'un d'autre disant « je vois le profil d'un autre
utilisateur ».

## Ce Qu'il Faut Retenir

Avant de laisser un `static` (ou un singleton avec une propriété
mutable) dans du code qui tourne à l'intérieur d'un handler de
requête, posez-vous une seule question : cette valeur survivra-t-elle
à la fin de la requête courante et restera-t-elle correcte pour la
suivante ? Si oui, c'est sûr. Si elle est censée expirer avec la
requête, mais continue physiquement à vivre dans la mémoire partagée
du processus, c'est une candidate pour `ScopedService`,
`request_context()`/`coroutine_context()` (voir le
[deuxième chapitre](/fr/tutors-laravel/02-pool-transactions.html)),
ou une simple propriété d'instance recréée par requête.

Nous avons couvert votre propre code et le Laravel de base. Mais un
vrai projet a généralement `spatie/laravel-permission`, `Telescope`,
`Inertia`, et `Debugbar` qui vivent juste à côté, chacun avec sa
propre histoire d'état mutable. Lequel d'entre eux est déjà adapté, et
lequel mérite d'être désactivé en mode async, c'est le sujet du
chapitre suivant.
