---
layout: docs
lang: it
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /it/docs/components/scope.html
page_title: "Scope"
description: "Scope in TrueAsync -- gestione del ciclo di vita delle coroutine, gerarchia, cancellazione di gruppo, gestione degli errori e concorrenza strutturata."
---

# Scope: Gestione del Ciclo di Vita delle Coroutine

## Il Problema: Controllo Esplicito delle Risorse, Coroutine Dimenticate

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// La funzione è tornata, ma tre coroutine sono ancora in esecuzione!
// Chi le controlla? Quando finiranno?
// Chi gestirà le eccezioni se si verificano?
```

Uno dei problemi comuni nella programmazione asincrona sono le coroutine accidentalmente "dimenticate" dallo sviluppatore.
Vengono lanciate, eseguono lavoro, ma nessuno monitora il loro ciclo di vita.
Questo può portare a perdite di risorse, operazioni incomplete e bug difficili da trovare.
Per le applicazioni `stateful`, questo problema è significativo.

## La Soluzione: Scope

![Concetto di Scope](../../../assets/docs/scope_concept.jpg)

**Scope** -- uno spazio logico per l'esecuzione di coroutine, paragonabile a una sandbox.

Le seguenti regole garantiscono che le coroutine siano sotto controllo:
* Il codice sa sempre in quale `Scope` sta eseguendo
* La funzione `spawn()` crea una coroutine nello `Scope` corrente
* Uno `Scope` conosce tutte le coroutine che gli appartengono

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // Attendi finché tutte le coroutine nello scope non terminano
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// Ora la funzione tornerà solo quando TUTTE le coroutine saranno terminate
```

## Associazione a un Oggetto

Lo `Scope` è comodo da associare a un oggetto per esprimere esplicitamente la proprietà di un gruppo di coroutine.
Tale semantica esprime direttamente l'intento del programmatore.

```php
class UserService
{
    // Solo un oggetto unico possiederà uno Scope unico
    // Le coroutine vivono finché vive l'oggetto UserService
    private Scope $scope;

    public function __construct() {
        // Crea una cupola per tutte le coroutine del servizio
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Lancia una coroutine all'interno della nostra cupola
        $this->scope->spawn(function() use ($userId) {
            // Questa coroutine è associata a UserService
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // Quando l'oggetto viene eliminato, le risorse vengono pulite in modo garantito
        // Tutte le coroutine all'interno vengono automaticamente cancellate
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// Elimina il servizio - tutte le sue coroutine vengono automaticamente cancellate
unset($service);
```

## Gerarchia degli Scope

Uno scope può contenere altri scope. Quando uno scope genitore viene cancellato,
tutti gli scope figli e le loro coroutine vengono anch'essi cancellati.

Questo approccio è chiamato **concorrenza strutturata**.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Task principale\n";

    // Crea uno scope figlio
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Sotto-task 1\n";
    });

    $childScope->spawn(function() {
        echo "Sotto-task 2\n";
    });

    // Attendi il completamento dei sotto-task
    $childScope->awaitCompletion();

    echo "Tutti i sotto-task completati\n";
});

$mainScope->awaitCompletion();
```

Se cancelli `$mainScope`, tutti gli scope figli verranno anch'essi cancellati. L'intera gerarchia.

## Cancellazione di Tutte le Coroutine in uno Scope

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "Lavoro in corso...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Sono stato cancellato!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Lavoro anche io...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Anch'io!\n";
    }
});

// Lavora per 3 secondi
Async\sleep(3000);

// Cancella TUTTE le coroutine nello scope
$scope->cancel();

// Entrambe le coroutine riceveranno AsyncCancellation
```

## Gestione degli Errori nello Scope

Quando una coroutine all'interno di uno scope fallisce con un errore, lo scope può intercettarlo:

```php
$scope = new Async\Scope();

// Imposta un handler degli errori
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Errore nello scope: " . $e->getMessage() . "\n";
    // Può registrarlo, inviarlo a Sentry, ecc.
});

$scope->spawn(function() {
    throw new Exception("Qualcosa si è rotto!");
});

$scope->spawn(function() {
    echo "Sto funzionando bene\n";
});

$scope->awaitCompletion();

// Output:
// Errore nello scope: Qualcosa si è rotto!
// Sto funzionando bene
```

## Finally: Pulizia Garantita

Anche se uno scope viene cancellato, i blocchi finally verranno eseguiti:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Inizio lavoro\n";
        Async\sleep(10000); // Operazione lunga
        echo "Terminato\n"; // Non verrà eseguito
    } finally {
        // Questo è GARANTITO che venga eseguito
        echo "Pulizia risorse\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // Cancella dopo un secondo

// Output:
// Inizio lavoro
// Pulizia risorse
```

## TaskGroup: Scope con Risultati

`TaskGroup` -- uno scope specializzato per l'esecuzione parallela di task
con aggregazione dei risultati. Supporta limiti di concorrenza,
task con nome e tre strategie di attesa:

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// Ottieni tutti i risultati (attende il completamento di tutti i task)
$results = await($group->all());

// O ottieni il primo risultato completato
$first = await($group->race());

// O il primo riuscito (ignorando gli errori)
$any = await($group->any());
```

I task possono essere aggiunti con chiavi e iterati man mano che si completano:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// Itera sui risultati man mano che diventano pronti
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Task $key fallito: {$error->getMessage()}\n";
    } else {
        echo "Task $key: $result\n";
    }
}
```

## Scope Globale: C'è Sempre un Genitore

Se non specifichi uno scope esplicitamente, la coroutine viene creata nello **scope globale**:

```php
// Senza specificare uno scope
spawn(function() {
    echo "Sono nello scope globale\n";
});

// Equivalente a:
Async\Scope::global()->spawn(function() {
    echo "Sono nello scope globale\n";
});
```

Lo scope globale vive per l'intera richiesta. Quando PHP termina, tutte le coroutine nello scope globale vengono cancellate in modo pulito.

## Esempio Reale: Client HTTP

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // Cancella tutte le richieste attive
        $this->scope->cancel();
    }

    public function __destruct() {
        // Quando il client viene distrutto, tutte le richieste vengono automaticamente cancellate
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// Cancella tutte le richieste
$client->cancelAll();

// O semplicemente distruggi il client - stesso effetto
unset($client);
```

## Concorrenza Strutturata

Lo `Scope` implementa il principio della **Concorrenza Strutturata** --
un insieme di regole per gestire task concorrenti, collaudato nei runtime di produzione
di `Kotlin`, `Swift` e `Java`.

### API per la Gestione del Ciclo di Vita

Lo `Scope` fornisce la possibilità di controllare esplicitamente il ciclo di vita di una gerarchia di coroutine
usando i seguenti metodi:

| Metodo                                   | Cosa fa                                                          |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Lancia una coroutine all'interno dello Scope                     |
| `$scope->awaitCompletion($cancellation)` | Attende il completamento di tutte le coroutine nello Scope       |
| `$scope->cancel()`                       | Invia un segnale di cancellazione a tutte le coroutine           |
| `$scope->dispose()`                      | Chiude lo Scope e cancella forzatamente tutte le coroutine       |
| `$scope->disposeSafely()`               | Chiude lo Scope; le coroutine non vengono cancellate ma marcate come zombie |
| `$scope->awaitAfterCancellation()`       | Attende il completamento di tutte le coroutine, incluse le zombie |
| `$scope->disposeAfterTimeout(int $ms)`   | Cancella le coroutine dopo un timeout                            |

Questi metodi permettono di implementare tre pattern chiave:

**1. Il genitore attende tutti i task figli**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* task 1 */ });
$scope->spawn(function() { /* task 2 */ });

// Il controllo non tornerà finché entrambi i task non saranno completati
$scope->awaitCompletion();
```

In Kotlin, lo stesso viene fatto con `coroutineScope { }`,
in Swift -- con `withTaskGroup { }`.

**2. Il genitore cancella tutti i task figli**

```php
$scope->cancel();
// Tutte le coroutine in $scope riceveranno un segnale di cancellazione.
// Gli Scope figli verranno anch'essi cancellati -- ricorsivamente, a qualsiasi profondità.
```

**3. Il genitore chiude lo Scope e rilascia le risorse**

`dispose()` chiude lo Scope e cancella forzatamente tutte le sue coroutine:

```php
$scope->dispose();
// Lo Scope è chiuso. Tutte le coroutine sono cancellate.
// Non è possibile aggiungere nuove coroutine a questo Scope.
```

Se devi chiudere lo Scope ma permettere alle coroutine correnti di **terminare il loro lavoro**,
usa `disposeSafely()` -- le coroutine vengono marcate come zombie
(non vengono cancellate, continuano l'esecuzione, ma lo Scope è considerato terminato per i task attivi):

```php
$scope->disposeSafely();
// Lo Scope è chiuso. Le coroutine continuano a lavorare come zombie.
// Lo Scope le traccia ma non le conta come attive.
```

### Gestione degli Errori: Due Strategie

Un'eccezione non gestita in una coroutine non va persa -- si propaga allo Scope genitore.
Diversi runtime offrono strategie diverse:

| Strategia                                                        | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **Fallimento collettivo**: l'errore di un figlio cancella tutti gli altri | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (predefinito)              |
| **Figli indipendenti**: l'errore di uno non influenza gli altri  | `supervisorScope` | `Task` separato         | `$scope->setExceptionHandler(...)` |

La possibilità di scegliere una strategia è la differenza chiave rispetto al "fire and forget".

### Ereditarietà del Contesto

I task figli ricevono automaticamente il contesto del genitore:
priorità, scadenze, metadati -- senza passare esplicitamente i parametri.

In Kotlin, le coroutine figlie ereditano il `CoroutineContext` del genitore (dispatcher, nome, `Job`).
In Swift, le istanze figlie di `Task` ereditano priorità e valori task-local.

### Dove Funziona Già

| Linguaggio | API                                                             | In produzione dal |
|------------|-----------------------------------------------------------------|-------------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018              |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021              |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (preview)    |

TrueAsync porta questo approccio in PHP attraverso `Async\Scope`.

## Cosa Leggere Dopo?

- [Coroutine](/it/docs/components/coroutines.html) -- come funzionano le coroutine
- [Cancellazione](/it/docs/components/cancellation.html) -- pattern di cancellazione
- [Coroutine Zombie](/it/docs/components/zombie-coroutines.html) -- tolleranza per il codice di terze parti
