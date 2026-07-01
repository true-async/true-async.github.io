---
layout: docs
lang: fr
path_key: "/docs/mobile/index.html"
nav_active: docs
permalink: /fr/docs/mobile/index.html
page_title: "TrueAsync Mobile"
description: "native-bridge : un runtime PHP persistant dans une application Android native via JNI. Architecture, échange d'événements, appel de Kotlin depuis PHP, génération de code."
---

# TrueAsync Mobile

(projet de démonstration, expérimental, dépôt
[native-bridge](https://github.com/true-async/native-bridge), Android)

Le PHP asynchrone convient très bien aux applications à interface graphique : l'interface ne doit
pas se figer pendant qu'une opération dialogue avec le réseau, lit sur le disque, ou attend la
prochaine action utilisateur. TrueAsync dispose d'une API C dédiée pour cela : le Trigger Event
(`ZEND_ASYNC_NEW_TRIGGER_EVENT()` dans `zend_async_API.h`). C'est un objet doté d'une seule
méthode, `trigger()`, que n'importe quel code C ou C++ peut appeler depuis un autre thread pour
réveiller de manière thread-safe le reactor PHP et lui donner le contrôle pour traiter
l'événement.

**native-bridge** implémente exactement ce type d'intégration pour Android : PHP s'embarque dans
l'application comme un processus persistant, démarrant une seule fois sur un thread en arrière-
plan, exécutant une event loop (le même reactor TrueAsync utilisé dans le reste de l'écosystème),
et dialoguant avec Kotlin dans les deux sens.

## Pourquoi un processus persistant plutôt que requête/réponse

Le scénario PHP habituel est une requête web : le processus démarre, traite une requête, et se
termine. Cela ne convient pas à une application mobile : PHP doit rester vivant aussi longtemps
que l'application est ouverte, et réagir aux événements utilisateur (taps, capteurs, localisation)
de la même façon qu'un handler réagit à une requête HTTP. C'est exactement ce que fournit
native-bridge : PHP démarre une seule fois au lancement de l'application et vit dans son propre
thread jusqu'à un arrêt explicite, pendant que les coroutines TrueAsync à l'intérieur de ce thread
traitent les événements et le travail en arrière-plan de façon concurrente.

## Architecture du pont

Le pont fonctionne dans deux directions :

1. **D'Android vers PHP.** Kotlin pousse des événements (un tap, une lecture de capteur, une
   localisation, un événement personnalisé arbitraire) dans une file, et PHP les récupère depuis
   sa propre boucle.
2. **De PHP vers Kotlin.** PHP appelle des méthodes implémentées côté Kotlin (afficher un Toast,
   faire vibrer, copier du texte dans le presse-papiers, etc.).

Les deux directions passent par **JNI (Java Native Interface)**, le mécanisme Android standard qui
permet au code C d'appeler du code Kotlin/Java et inversement. Aucune des deux directions ne fait
transiter les données par JSON ou un autre format texte : les valeurs traversent la frontière déjà
typées, sans conversion supplémentaire.

PHP tourne sur son propre thread OS et ne bloque jamais le thread UI d'Android. Si PHP attend des
données, le thread UI continue de répondre, et inversement.

## Direction 1 : événements d'Android vers PHP

Kotlin envoie des événements via JNI dans une file que PHP lit avec `NativeBridge::poll()`.
Lorsque la file est vide, `poll()` renvoie `null` immédiatement, et l'application PHP décide
elle-même d'attendre le prochain événement ou de faire autre chose entre-temps (dans l'application
de démonstration, c'est une courte pause `usleep()`, pendant laquelle TrueAsync peut exécuter des
coroutines et des timers en arrière-plan).

Il existe quatre types d'événements : un touché d'écran, des données de localisation, des données
de capteur (accéléromètre et similaires), et un événement arbitraire avec un nom et un payload
texte. Ce dernier type est celui que l'application de démonstration utilise pour marquer les
appuis de bouton :

```php
use TrueAsync\NativeBridge;

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC) {
        match ($event['event_name']) {
            'count_a' => $counterA->toggle(),
            'fetch'   => spawn(fn() => fetchDemo()),
            default   => null,
        };
    }
}
```

Les trois premiers types d'événements (touché, localisation, capteurs) n'ont besoin d'aucune
allocation de chaîne, donc ils restent peu coûteux même à un débit d'appel élevé (par exemple,
pour un flux de données d'accéléromètre).

## Direction 2 : appels de PHP vers Kotlin

Quand PHP appelle une méthode de module, par exemple `Toast::show('Hello', true)`, cet appel peut
atteindre Kotlin de deux façons.

### Le chemin générique

Par défaut, PHP empaquette les arguments dans un buffer typé compact (pas de format texte comme
JSON, donc Kotlin le lit sans parser de texte ni allocations supplémentaires) et l'expédie via un
unique appel à `NativeBridge::invoke()`. Ajouter un nouveau module ou une nouvelle méthode sur ce
chemin ne touche jamais au C : seuls Kotlin et le wrapper PHP généré changent, donc un rebuild
Gradle du côté Kotlin suffit, pas besoin de reconstruire la bibliothèque native.

### Le chemin rapide : `#[FastPath]`

Pour les méthodes « chaudes » appelées très fréquemment (par exemple, l'envoi de données de
capteur à chaque frame), la spec PHP marque la méthode avec l'attribut `#[FastPath]`. Pour une
telle méthode, le générateur produit une fonction C typée dédiée qui appelle Kotlin directement
via JNI, sans buffer intermédiaire. Ce type de méthode nécessite de reconstruire la bibliothèque
native (le fichier `.so`) à chaque changement, mais s'exécute plus vite et sans allocations
supplémentaires. Le comportement de la méthode ne change pas, seule la façon dont l'appel
traverse la frontière PHP/Kotlin change.

## Décrire un module : `#[BridgeModule]`

Le contrat d'un module est décrit côté PHP comme une interface avec l'attribut `#[BridgeModule]` :

```php
namespace TrueAsync\Android\Spec;

#[BridgeModule]
interface ToastInterface
{
    #[Ui]
    public function show(string $text, bool $long): void;

    public function batteryLevel(): int;
}
```

- Le nom du module est dérivé du nom de l'interface (`ToastInterface` devient le module `Toast`),
  ou fixé explicitement : `#[BridgeModule('Clipboard')]`.
- `#[Ui]` sur une méthode signifie que l'implémentation Kotlin doit s'exécuter sur le thread UI
  d'Android (le générateur ajoute le changement de thread pour vous).
- `#[FastPath]` sur une méthode active le chemin d'appel rapide décrit ci-dessus.

## Ce que génère `tools/bridge/gen.php`

À partir d'une spec PHP (une interface `#[BridgeModule]`), le générateur reconstruit à chaque
exécution :

- une classe Kotlin avec des méthodes abstraites (`ToastSpec`) ;
- le code de routage des appels (Kotlin) ;
- un wrapper PHP (`Toast::show(...)`) que le reste du code applicatif PHP appelle ;
- pour les méthodes marquées `#[FastPath]`, du code C typé qui appelle Kotlin directement.

## Cycle de vie de l'application PHP

1. Kotlin démarre PHP sur un thread en arrière-plan et lui passe le chemin du script PHP d'entrée.
2. Le script PHP appelle `NativeBridge::init()` ; à partir de là le pont est prêt à accepter des
   événements et des appels.
3. À partir de là, l'application tourne en boucle : elle récupère les événements via `poll()`, les
   traite, et lance des coroutines TrueAsync en arrière-plan quand nécessaire (pour des requêtes
   réseau, par exemple).
4. L'arrêt est propre : Kotlin appelle `NativeBridge.stop()`, la boucle PHP le voit via
   `NativeBridge::shouldStop()`, termine son travail, et libère ses ressources proprement.

## Exemple : un compteur sur un bouton

Un exemple simplifié basé sur l'application de démonstration : un bouton démarre et arrête un
compteur sans fin, et sa valeur se met à jour directement dans l'UI. Le démarrage et l'arrêt sont
implémentés avec un simple `spawn()`/`cancel()` de coroutine TrueAsync, sans bloquer le thread UI :

```php
use TrueAsync\NativeBridge;
use TrueAsync\Android\Ui;
use function Async\spawn;
use function Async\delay;

NativeBridge::init();

$root = Ui::newLinearLayout();

$button = Ui::newButton();
Ui::setText($button, '▶ start counter');
Ui::setOnClickListener($button, 'toggle');
Ui::addView($root, $button);

$label = Ui::newTextView();
Ui::setText($label, 'stopped');
Ui::addView($root, $label);

Ui::setContentView($root);

$counter = null;

function tick(int $label): void
{
    $n = 0;
    while (true) {
        Ui::setText($label, 'tick ' . ++$n);
        delay(400);
    }
}

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC && $event['event_name'] === 'toggle') {
        if ($counter === null) {
            $counter = spawn(fn() => tick($label));
            Ui::setText($button, '■ stop counter');
        } else {
            $counter->cancel();
            $counter = null;
            Ui::setText($button, '▶ start counter');
        }
    }
}
```

Un second clic annule la coroutine `$counter` via `cancel()`, et le compteur s'arrête à la valeur
qu'il avait atteinte. L'exemple complet, avec plusieurs compteurs indépendants, se trouve dans le
fichier `android/app.php` du dépôt.

## Statut et limitations

- Seul Android est pris en charge ; le support iOS est prévu mais pas encore implémenté.
- Le pont ne transporte actuellement que des types simples : chaînes, entiers, flottants,
  booléens. Le passage d'objets composés (champ par champ, toujours sans format texte) est prévu.
- La direction PHP-vers-Kotlin est synchrone : une méthode renvoie son résultat immédiatement ;
  les résultats différés (asynchrones) ne sont pas encore pris en charge dans ce sens.
- L'opcache de PHP est désactivé de force sur Android : le bac à sable de l'application ne lui
  permet pas d'utiliser le fichier de verrou et la mémoire exécutable dont il a besoin.
- Un build PHP thread-safe (ZTS) est requis, puisque PHP tourne sur son propre thread OS plutôt
  que sur le thread principal de l'application.

## Voir aussi

- [Roadmap : TrueAsync Mobile](/fr/roadmap.html)
- [Dépôt native-bridge sur GitHub](https://github.com/true-async/native-bridge)
