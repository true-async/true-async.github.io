---
layout: tutorial
lang: fr
path_key: "/tutors/15-context.html"
nav_active: docs
permalink: /fr/tutors/15-context.html
page_title: "Context"
description: "Context : où garder « l'actuel » une fois que les variables globales cessent de fonctionner."
---

# Context

Le PHP classique a vécu toute sa vie selon une règle simple : un processus, une requête. Toute une
culture est née de cette règle : variables globales, propriétés statiques, singletons.
L'utilisateur actuel ? La propriété statique `Auth::$user`. Un identifiant de requête pour la
journalisation ? Une variable globale. Cela fonctionnait sans faille, parce que « l'actuel » était
réellement une seule et unique chose pour tout le processus.

TrueAsync a aboli cette règle. Maintenant des centaines de coroutines vivent mélangées dans un seul
processus, servant différents utilisateurs. Affectez `Auth::$user` dans une coroutine, et la
prochaine à se réveiller le relira, et vous avez de la chance si c'est même la même requête. Une
histoire familière : la même chose s'est produite au chapitre neuf, quand dix workers partageaient
un seul `PDO`. Des courses sans threads, sauf que maintenant c'est dans l'état global.

Tout passer en paramètres à la place ? Honnête, mais sans pitié : il vous faudrait faufiler un
jeton d'autorisation à travers vingt signatures de fonctions, alors qu'une seule d'entre elles en
a réellement besoin. Ce que vous voulez vraiment, c'est un stockage lié non pas au processus, mais
au fil logique d'exécution. Et nous avons déjà une structure faite pour cette tâche : les
coroutines et les scopes forment déjà un arbre.

## Un stockage sur un arbre

`Async\Context` est un magasin clé-valeur attaché à un scope ou à une coroutine. Le contexte d'un
scope est accessible à toutes ses coroutines :

```php
use function Async\current_context;

// middleware, début du traitement de la requête
current_context()
    ->set('request_id', bin2hex(random_bytes(8)))
    ->set('user_id', $userId);
```

Et à partir de là, n'importe où, à n'importe quelle profondeur d'appel, sans un seul paramètre
supplémentaire :

```php
function logInfo(string $message): void
{
    $requestId = current_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

Remarquez `find` : il cherche la clé dans le contexte actuel, et s'il ne la trouve pas, remonte
l'arbre des scopes. Les scopes enfants voient automatiquement les données de leurs parents, si bien
qu'une coroutine démarrée au plus profond d'un handler trouvera le `request_id` défini tout au
début de la requête. C'est le même mécanisme que le `context.Context` de Go, sauf que vous n'avez
pas à le récupérer et à le passer à la main : l'arbre est déjà là.

Les requêtes ne se gênent plus les unes les autres : chacune a son propre scope, et donc son propre
contexte. Mille requêtes concurrentes, mille `request_id` indépendants, et pas une seule variable
globale.

## Trois niveaux

Le contexte existe sur trois niveaux, du plus large au plus étroit :

```php
use function Async\root_context;
use function Async\current_context;
use function Async\coroutine_context;

root_context();      // tout le processus : configuration, partagée par tous
current_context();   // le scope actuel : requête, utilisateur, locale
coroutine_context(); // juste cette coroutine : données privées
```

`root_context` est le foyer légitime de tout ce qui, autrefois, était à juste titre une variable
globale : le nom de l'application, les paramètres. Vous vous y adressez explicitement :
`root_context()->find('app_name')`. `coroutine_context` est le pôle opposé : ses données sont
invisibles pour quiconque hormis la coroutine elle-même, même ses voisines dans le même scope.
Entre les deux, `find` assemble les niveaux de scope : introuvable localement, demandez au parent.

Et un détail agréable de plus :

```php
current_context()->set('user_id', 42);
current_context()->set('user_id', 7); // AsyncException : la clé existe déjà
```

Écraser une valeur est interdit sauf si vous le demandez explicitement (`replace: true`). Le
contexte se prémunit contre la maladie même des variables globales par laquelle ce chapitre a
commencé : quelqu'un, quelque part, écrasant discrètement une valeur.

## La fin du voyage

Il y a quinze chapitres, nous avons lancé deux fonctions « en même temps » et avons été surpris de
voir leurs sorties s'entrelacer. Depuis, tout un système a pris forme, et chaque niveau a sa propre
préoccupation :

- **Coroutines, `spawn`, `await`** — l'unité de concurrence et une promesse de résultat.
- **Annulation, délais d'expiration, exceptions** — le contrat d'interruption : rien ne tourne
  éternellement, et rien ne meurt en silence.
- **`Future` et canaux** — les connexions : un résultat unique, et un flux de valeurs avec
  synchronisation.
- **`Scope`, `TaskGroup`, `TaskSet`, `iterate`** — la structure : chaque coroutine a un
  propriétaire, et chaque groupe a une stratégie d'attente.
- **Pools** — la discipline des ressources : peu de connexions, beaucoup de coroutines.
- **Threads** — le parallélisme pour le calcul, sans mémoire partagée.
- **`Context`** — des données liées à l'exécution, pas au processus.

Remarquez ce que nous n'avons jamais eu à apprendre : mutex, sémaphores, courses de données,
callbacks, ou coloration des fonctions en async par opposition à sync. Le code est resté du PHP
ordinaire, séquentiel, qui a simplement cessé de rester inactif.

À partir d'ici, deux chemins. Pour de la pratique concrète, rendez-vous à la
[documentation](/fr/docs.html), où chaque composant est démonté jusqu'à la dernière vis. Pour
comprendre comment tout cela fonctionne en dessous, rendez-vous à l'[architecture](/fr/architecture.html).
Ou mieux encore, prenez simplement votre script le plus lent et voyez ce qu'un seul `spawn` lui
fait.
