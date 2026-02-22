---
layout: docs
lang: fr
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /fr/docs/components/channels.html
page_title: "Channels"
description: "Les channels dans TrueAsync -- transfert securise de donnees entre coroutines, files d'attente de taches et contre-pression."
---

# Channels

Les channels sont plus utiles pour la communication dans un environnement multithreade
que dans un environnement monothreade. Ils servent au transfert securise de donnees d'une coroutine a une autre.
Si vous devez modifier des donnees partagees,
dans un environnement monothreade, il est plus simple de passer un objet a differentes coroutines que de creer un channel.

Cependant, les channels sont utiles dans les scenarios suivants :
* organiser une file d'attente de taches avec des limites
* organiser des pools d'objets (il est recommande d'utiliser la primitive dediee `Async\Pool`)
* synchronisation

Par exemple, il y a de nombreuses URL a parcourir, mais pas plus de N connexions simultanees :

```php
use Async\Channel;
use Async\Scope;

const MAX_CONNECTIONS = 10;
const MAX_QUEUE = 100;

$tasks = new Scope();
$channel = new Channel(MAX_QUEUE);

for($i = 0; $i < MAX_CONNECTIONS; $i++) {
    $tasks->spawn(function() use ($channel) {
        while (!$channel->isClosed()) {
            $url = $channel->recv();
            $content = file_get_contents($url);
            echo "Page recuperee {$url}, taille : " . strlen($content) . "\n";
        }
    });
}

// Remplir le channel avec des valeurs
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

La constante `MAX_QUEUE` dans cet exemple agit comme un limiteur pour le producteur, creant une contre-pression --
une situation ou le producteur ne peut pas envoyer de donnees tant que le consommateur n'a pas libere de l'espace dans le channel.

## Channel non bufferise (Rendez-vous)

Un channel avec une taille de buffer `0` fonctionne en mode rendez-vous : `send()` bloque jusqu'a ce qu'une autre coroutine appelle `recv()`, et vice versa. Cela garantit une synchronisation stricte :

```php
use Async\Channel;

$ch = new Channel(0); // Channel rendez-vous

spawn(function() use ($ch) {
    echo "Emetteur : avant send\n";
    $ch->send("hello");
    echo "Emetteur : send termine\n"; // Seulement apres recv()
});

spawn(function() use ($ch) {
    echo "Recepteur : avant recv\n";
    $value = $ch->recv();
    echo "Recepteur : recu $value\n";
});
```

## Timeouts sur les operations

Les methodes `recv()` et `send()` acceptent un parametre de timeout optionnel en millisecondes. Lorsque le temps expire, une `TimeoutException` est lancee :

```php
use Async\Channel;
use Async\TimeoutException;

$ch = new Channel(0);

spawn(function() use ($ch) {
    try {
        $ch->recv(50); // Attendre au maximum 50 ms
    } catch (TimeoutException $e) {
        echo "Personne n'a envoye de donnees dans les 50 ms\n";
    }
});

spawn(function() use ($ch) {
    try {
        $ch->send("data", 50); // Attendre un recepteur au maximum 50 ms
    } catch (TimeoutException $e) {
        echo "Personne n'a recu les donnees dans les 50 ms\n";
    }
});
```

## Recepteurs concurrents

Si plusieurs coroutines attendent sur `recv()` sur le meme channel, chaque valeur est recue par **une seule** d'entre elles. Les valeurs ne sont pas dupliquees :

```php
use Async\Channel;

$ch = new Channel(0);

// Emetteur
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// Recepteur A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A a recu : $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Recepteur B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B a recu : $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Chaque valeur (1, 2, 3) sera recue par A ou B uniquement, mais pas les deux
```

Ce modele est utile pour implementer des pools de workers, ou plusieurs coroutines se disputent les taches d'une file d'attente partagee.
