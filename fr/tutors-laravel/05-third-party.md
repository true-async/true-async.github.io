---
layout: tutorial
lang: fr
path_key: "/tutors-laravel/05-third-party.html"
nav_active: docs
permalink: /fr/tutors-laravel/05-third-party.html
page_title: "Packages Tiers"
description: "Debugbar, Telescope, Inertia, spatie/permission, Socialite : ce qui est déjà adapté pour les coroutines et ce qu'il vaut mieux désactiver."
---

# Packages Tiers

Nous avons couvert le cœur de Laravel et votre propre code. Mais la
liste de dépendances d'un vrai projet ne s'arrête pas là : `Debugbar`
en développement, `Telescope` pour les logs, `Inertia` pour le
frontend, `spatie/laravel-permission` pour les rôles. Chacun d'eux a
été écrit bien avant que quiconque n'imagine des centaines de requêtes
concurrentes dans un seul processus, et chacun a son propre singleton
porteur d'état. La bonne nouvelle : pour les packages les plus
courants, ce travail est déjà fait. La mauvaise : pas pour tous, et il
importe de savoir distinguer l'un de l'autre.

## Déjà Adaptés

**`spatie/laravel-permission`.** `PermissionRegistrar` conserve le
`team ID` courant et un index de permissions à caractères génériques
dans ses propres propriétés, exactement le motif couvert au chapitre
sur les motifs dangereux. `AsyncPermissionRegistrar` déplace les deux
dans `current_context()` :

```php
class AsyncPermissionRegistrar extends PermissionRegistrar
{
    public function setPermissionsTeamId(int|string|Model|null $id): void
    {
        current_context()->set(self::CTX_TEAM_ID, $id, replace: true);
    }

    public function getPermissionsTeamId(): int|string|null
    {
        return current_context()->find(self::CTX_TEAM_ID);
    }

    // clearPermissionsCollection() devient un no-op : la liste des
    // permissions elle-même est en lecture seule après chargement et
    // partagée sans risque entre les requêtes.
}
```

Rien ne change dans votre propre code : `Auth::user()->can(...)`,
`setPermissionsTeamId()` dans un middleware, tout fonctionne
exactement comme la documentation du package le décrit.

**`inertiajs/inertia-laravel`.** `AsyncResponseFactory` déplace
`sharedProps`, `rootView`, `version`, et `encryptHistory`, tout ce qui
s'accumulait auparavant sur les propriétés du singleton
`ResponseFactory` et aurait survécu à la fin d'une requête jusque dans
la suivante, dans le contexte.

**`barryvdh/laravel-debugbar`.** La solution ici est un peu plus
nuancée. `Debugbar` collecte des données sur toute la requête :
requêtes SQL, messages, timings, un collecteur accumulateur classique
qui écrit dans lui-même pendant tout le cycle de traitement, y compris
les pauses sur `await`. `AsyncDebugbar` ne résout pas une nouvelle
instance par requête (cela casserait les abonnements aux événements
ponctuels), il conserve un seul `Debugbar` par worker, mais rend les
collecteurs eux-mêmes sensibles au contexte :

```php
class AsyncDebugbar extends LaravelDebugbar
{
    public function __construct(Application $app, Request $request)
    {
        parent::__construct($app, $request);

        // Ceux-ci accumulent des données à travers chaque pause d'E/S
        // dans la requête, donc le stockage doit être par coroutine,
        // pas par instance.
        $this->messagesCollector   = new AsyncMessagesCollector();
        $this->timeCollector       = new AsyncTimeDataCollector(...);
        $this->exceptionsCollector = new AsyncExceptionsCollector();
    }
}
```

La différence avec `ScopedServiceProxy` du premier chapitre compte :
là, tout le service était résolu à neuf par requête ; ici, le service
reste une instance unique (il est coûteux à recréer : abonnements aux
événements, configuration), et seuls les collecteurs accumulateurs
spécifiques à l'intérieur deviennent sensibles au contexte. Même
diagnostic que le chapitre sur les motifs dangereux (« ne pas écrire
dans un état partagé entre requêtes »), juste un remède adapté à
l'anatomie particulière de ce package.

**`laravel/telescope`.** De façon similaire : `entriesQueue`,
`updatesQueue`, et le drapeau `shouldRecord` passent dans le contexte
via un trait `CoroutineSafeRecording`, et la décision de journaliser
une requête donnée est prise par coroutine.

**`laravel/socialite`.** Plus simple ici : `SocialiteManager` met en
cache les drivers avec la configuration de la première requête qui les
a atteints. La correction n'est pas un adaptateur, c'est un
`scopedSingleton`, la même « approche un » du premier chapitre : un
manager neuf par requête, aucun contexte nécessaire du tout.

## Sûrs Sans Adaptation

`Cache`, `Queue`, `Mail`, `Log`, `Validation`, `Filesystem`,
`HTTP Client`, `Notifications`, `Encryption`, `Hashing`, `Pagination`,
`Sanctum`, `Passport`, `Scout`, `Cashier`, `Horizon`, ceux-ci ont aussi
des singletons, mais ce qu'ils contiennent, c'est de la configuration
et des clients, pas des données par requête. `CacheManager` met en
cache l'objet client `Redis`, pas les valeurs que vous y placez ;
`MailManager` met en cache le `Mailer` configuré, pas les emails.
Même question que dans le chapitre sur les motifs dangereux : l'état
survit-il à la fin d'une requête tout en restant correct ? Ici la
réponse est oui, parce que l'état est une configuration de connexion,
pas les données d'un utilisateur.

## Incompatibles : à Désactiver

**`livewire/livewire`.** C'est ici qu'il vaut la peine de marquer une
pause et de ne pas prolonger l'optimisme précédent. `LivewireManager`
accumule un état par requête au plus profond de lui-même, et
`wire:stream` repose sur des hypothèses concernant une réponse
bufferisée et ponctuelle que le modèle des coroutines concurrentes
casse lui-même. L'adapter petit bout par petit bout n'a pas fonctionné,
ni pour `laravel-spawn`, ni pour `Laravel Octane` avant lui. La seule
recommandation qui tienne réellement est de ne pas activer `Livewire`
en mode async du tout. Pour les interfaces interactives sur cette
pile, utilisez `Inertia`, il est déjà adapté et couvert plus haut.
`Filament`, construit par-dessus `Livewire`, hérite de la même
limitation.

## Décider Pour Votre Propre Package

Si le package dont vous avez besoin ne figure sur aucune des deux
listes, la question est la même que celle du chapitre précédent, juste
tournée vers le code de quelqu'un d'autre cette fois : le singleton du
package contient-il un état mutable qui n'est censé être correct que
pour une seule requête ? Si c'est le cas, il existe trois voies, et
elles ne sont pas équivalentes.

La plus rapide est `scoped_services` dans la configuration,
« approche un » : le package est résolu à neuf à chaque requête, et
son propre code reste intact.

```php
// config/async.php
'scoped_services' => [
    \SomePackage\Manager::class,
],
```

Si le recréer est coûteux (le package est cher à initialiser, ou met
en cache lui-même quelque chose d'utile entre les requêtes), écrivez
un adaptateur ciblé suivant le motif d'`AsyncPermissionRegistrar` ou
d'`AsyncDebugbar` de ce chapitre : créez une sous-classe, ajoutez un
`bootCompleted()`, déplacez uniquement ce qui change réellement d'une
requête à l'autre vers `current_context()`, laissez le reste tel quel.

Et si ce n'est pas un service autonome mais un motif profondément
ancré comme `Livewire`, ne passez pas une semaine à l'adapter pour
découvrir une semaine plus tard que `wire:stream` est cassé pour des
raisons architecturales. Exécutez `MutableStaticPropertyRule` du
chapitre précédent contre le code source du package : si les résultats
se comptent par dizaines et touchent le cœur même du package plutôt
que des caches sûrs au démarrage, c'est un signal pour l'exclure du
mode async, pas pour le corriger.

Nous avons couvert votre propre code, le cœur de Laravel, et son
écosystème environnant. Ce qui reste, c'est de voir les chiffres :
de combien une application devient-elle réellement plus rapide une
fois tout cela en place.
