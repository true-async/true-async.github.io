---
layout: docs
lang: it
path_key: "/docs/components/zombie-coroutines.html"
nav_active: docs
permalink: /it/docs/components/zombie-coroutines.html
page_title: "Coroutine Zombie"
description: "Coroutine zombie in TrueAsync -- tolleranza per il codice di terze parti, disposeSafely(), disposeAfterTimeout(), gestione di task non cancellabili."
---

# Coroutine Zombie: Tolleranza ai Guasti

## Il Problema: Codice Che Non Può Essere Cancellato

La cancellazione delle coroutine è un processo cooperativo. La coroutine riceve un'eccezione `Cancellation`
in un punto di sospensione e deve terminare in modo pulito. Ma cosa succede se qualcuno ha fatto un errore e ha creato una coroutine nello `Scope` sbagliato?
Sebbene `TrueAsync` segua il principio `Cancellation by design`, possono verificarsi situazioni in cui qualcuno ha scritto codice
la cui cancellazione potrebbe portare a un risultato spiacevole.
Per esempio, qualcuno ha creato un task in background per inviare un'`email`. La coroutine è stata cancellata, l'`email` non è mai stata inviata.

Un'alta tolleranza ai guasti permette di risparmiare significativamente tempo di sviluppo
e minimizzare le conseguenze degli errori, se i programmatori usano l'analisi dei log per migliorare la qualità dell'applicazione.

## La Soluzione: Coroutine Zombie

Per attenuare tali situazioni, `TrueAsync` fornisce un approccio speciale:
gestione tollerante delle coroutine "bloccate" -- le coroutine zombie.

Una coroutine `zombie` è una coroutine che:
* Continua l'esecuzione normalmente
* Rimane associata al suo Scope
* Non è considerata attiva -- lo Scope può formalmente completarsi senza attenderla
* Non blocca `awaitCompletion()`, ma blocca `awaitAfterCancellation()`

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    thirdPartySync(); // Codice di terze parti -- non sappiamo come reagisce alla cancellazione
});

$scope->spawn(function() {
    return myOwnCode(); // Il nostro codice -- gestisce correttamente la cancellazione
});

// disposeSafely() NON cancella le coroutine, ma le marca come zombie
$scope->disposeSafely();
// Lo Scope è chiuso per nuove coroutine.
// Le coroutine esistenti continuano a lavorare come zombie.
```

## Tre Strategie per la Terminazione dello Scope

`TrueAsync` fornisce tre modi per chiudere uno `Scope`, progettati per diversi livelli di fiducia nel codice:

### `dispose()` -- Cancellazione Forzata

Tutte le coroutine ricevono `Cancellation`. Lo Scope si chiude immediatamente.
Da usare quando controlli tutto il codice all'interno dello Scope.

```php
$scope->dispose();
// Tutte le coroutine sono cancellate. Lo Scope è chiuso.
```

### `disposeSafely()` -- Nessuna Cancellazione, le Coroutine Diventano Zombie

Le coroutine **non ricevono** `Cancellation`. Vengono marcate come `zombie` e continuano a funzionare.
Lo `Scope` è considerato chiuso -- non è possibile creare nuove coroutine.

Da usare quando lo `Scope` contiene codice "di terze parti" e non sei sicuro della correttezza della cancellazione.

```php
$scope->disposeSafely();
// Le coroutine continuano a lavorare come zombie.
// Lo Scope è chiuso per nuovi task.
```

### `disposeAfterTimeout(int $timeout)` -- Cancellazione con Timeout

Una combinazione di entrambi gli approcci: prima viene dato tempo alle coroutine per terminare,
poi lo `Scope` viene cancellato forzatamente.

```php
$scope->disposeAfterTimeout(5000);
// Dopo 5 secondi, lo Scope invierà Cancellation a tutte le coroutine rimanenti.
```

## Attesa delle Coroutine Zombie

`awaitCompletion()` attende solo le coroutine **attive**. Una volta che tutte le coroutine diventano zombie,
`awaitCompletion()` considera lo Scope terminato e restituisce il controllo.

Ma a volte devi attendere il completamento di **tutte** le coroutine, incluse le zombie.
Per questo esiste `awaitAfterCancellation()`:

```php
$scope = new Async\Scope();
$scope->spawn(fn() => longRunningTask());
$scope->spawn(fn() => anotherTask());

// Cancella -- le coroutine che non possono essere cancellate diventeranno zombie
$scope->cancel();

// awaitCompletion() tornerà immediatamente se rimangono solo zombie
$scope->awaitCompletion($cancellation);

// awaitAfterCancellation() attenderà TUTTE, incluse le zombie
$scope->awaitAfterCancellation(function (\Throwable $error, Async\Scope $scope) {
    // Handler degli errori per le coroutine zombie
    echo "Errore zombie: " . $error->getMessage() . "\n";
});
```

| Metodo                       | Attende le attive | Attende le zombie | Richiede cancel() |
|------------------------------|:-----------------:|:-----------------:|:------------------:|
| `awaitCompletion()`          |        Si         |        No         |         No         |
| `awaitAfterCancellation()`   |        Si         |        Si         |        Si          |

`awaitAfterCancellation()` può essere chiamato solo dopo `cancel()` -- altrimenti si verificherà un errore.
Questo ha senso: le coroutine zombie appaiono proprio come risultato della cancellazione con il flag `DISPOSE_SAFELY`.

## Come Funzionano le Zombie Internamente

Quando una coroutine viene marcata come `zombie`, accade quanto segue:

1. La coroutine riceve il flag `ZOMBIE`
2. Il contatore delle coroutine attive nello `Scope` diminuisce di 1
3. Il contatore delle coroutine `zombie` aumenta di 1
4. Lo `Scope` verifica se rimangono coroutine attive e può notificare i waiters riguardo al completamento

```
Scope
+-- active_coroutines_count: 0    <-- diminuisce
+-- zombie_coroutines_count: 2    <-- aumenta
+-- coroutine A (zombie)          <-- continua a funzionare
+-- coroutine B (zombie)          <-- continua a funzionare
```

Una coroutine `zombie` **non è separata** dallo `Scope`. Rimane nella sua lista di coroutine,
ma non viene contata come attiva. Quando una coroutine `zombie` termina finalmente,
viene rimossa dallo `Scope`, e lo `Scope` verifica se può rilasciare completamente le risorse.

## Come lo Scheduler Gestisce le Zombie

Lo `Scheduler` mantiene due contatori indipendenti di coroutine:

1. **Contatore globale delle coroutine attive** (`active_coroutine_count`) -- usato per verifiche rapide
   su se c'è qualcosa da pianificare
2. **Registro delle coroutine** (tabella hash `coroutines`) -- contiene **tutte** le coroutine ancora in esecuzione,
   incluse le `zombie`

Quando una coroutine viene marcata come `zombie`:
* Il contatore globale delle coroutine attive **diminuisce** -- lo Scheduler considera che ci sia meno lavoro attivo
* La coroutine **rimane** nel registro -- lo `Scheduler` continua a gestirne l'esecuzione

L'applicazione continua a funzionare finché il contatore delle coroutine attive è maggiore di zero. Ne consegue una conseguenza importante:
le coroutine `zombie` non impediscono l'arresto dell'applicazione, poiché non sono considerate attive.
Se non ci sono più coroutine attive, l'applicazione termina e anche le coroutine `zombie` verranno cancellate.

## Ereditarietà del Flag Safely

Per impostazione predefinita, uno `Scope` viene creato con il flag `DISPOSE_SAFELY`.
Questo significa: se lo `Scope` viene distrutto (es. nel distruttore di un oggetto),
le coroutine diventano `zombie` anziché essere cancellate.

Uno `Scope` figlio eredita questo flag dal genitore:

```php
$parent = new Async\Scope();
// parent ha il flag DISPOSE_SAFELY per impostazione predefinita

$child = Async\Scope::inherit($parent);
// child ha anch'esso il flag DISPOSE_SAFELY
```

Se vuoi la cancellazione forzata alla distruzione, usa `asNotSafely()`:

```php
$scope = (new Async\Scope())->asNotSafely();
// Ora quando l'oggetto Scope viene distrutto,
// le coroutine verranno cancellate forzatamente anziché marcate come zombie
```

## Esempio: Server HTTP con Middleware

```php
class RequestHandler
{
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function handle(Request $request): Response {
        // Lancia il middleware -- potrebbe essere codice di terze parti
        $this->scope->spawn(function() use ($request) {
            $this->runMiddleware($request);
        });

        // Elaborazione principale -- il nostro codice
        $response = $this->scope->spawn(function() use ($request) {
            return $this->processRequest($request);
        });

        return await($response);
    }

    public function __destruct() {
        // Alla distruzione: il middleware potrebbe non essere pronto per la cancellazione,
        // quindi usiamo disposeSafely() (comportamento predefinito).
        // Le coroutine zombie termineranno da sole.
        $this->scope->disposeSafely();
    }
}
```

## Esempio: Handler con Limite di Tempo

```php
$scope = new Async\Scope();

// Lancia task con codice di terze parti
$scope->spawn(fn() => thirdPartyAnalytics($data));
$scope->spawn(fn() => thirdPartyNotification($userId));

// Dai 10 secondi per terminare, poi cancellazione forzata
$scope->disposeAfterTimeout(10000);
```

## Quando le Zombie Diventano un Problema

Le coroutine `zombie` sono un compromesso. Risolvono il problema del codice di terze parti
ma possono portare a perdite di risorse.

Pertanto, `disposeAfterTimeout()` o uno `Scope` con cancellazione esplicita delle coroutine è la scelta migliore per la produzione:
dà al codice di terze parti tempo per terminare ma garantisce la cancellazione in caso di blocco.

## Riepilogo

| Metodo                      | Cancella le coroutine | Le coroutine terminano | Scope chiuso |
|-----------------------------|:---------------------:|:----------------------:|:------------:|
| `dispose()`                 |          Si           |           No           |      Si      |
| `disposeSafely()`           |          No           |    Si (come zombie)    |      Si      |
| `disposeAfterTimeout(ms)`   |    Dopo il timeout    |   Fino al timeout      |      Si      |

## Logging delle Coroutine Zombie

Nelle future versioni, `TrueAsync` intende fornire un meccanismo per il logging delle coroutine zombie, che permetterà
agli sviluppatori di risolvere i problemi legati ai task bloccati.

## Cosa Leggere Dopo?

- [Scope](/it/docs/components/scope.html) -- gestione di gruppi di coroutine
- [Cancellazione](/it/docs/components/cancellation.html) -- pattern di cancellazione
- [Coroutine](/it/docs/components/coroutines.html) -- ciclo di vita delle coroutine
