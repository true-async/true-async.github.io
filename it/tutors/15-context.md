---
layout: tutorial
lang: it
path_key: "/tutors/15-context.html"
nav_active: docs
permalink: /it/tutors/15-context.html
page_title: "Context"
description: "Context: dove tenere \"quello corrente\" quando le variabili globali smettono di funzionare."
---

# Context

Il PHP classico ha vissuto tutta la sua vita secondo una semplice regola: un processo, una
richiesta. Da quella regola è cresciuta un'intera cultura: variabili globali, proprietà statiche,
singleton. L'utente corrente? La proprietà statica `Auth::$user`. Un ID della richiesta per il
logging? Una variabile globale. Funzionava impeccabilmente, perché "quello corrente" era davvero
una singola cosa per l'intero processo.

TrueAsync ha abolito quella regola. Ora centinaia di coroutine vivono mescolate insieme in un
singolo processo, servendo utenti diversi. Assegna `Auth::$user` in una coroutine, e la successiva
che si sveglia lo rileggerà, e sei fortunato se è persino la stessa richiesta. Una storia
familiare: la stessa cosa è successa nel capitolo nove, quando dieci worker condividevano un
singolo `PDO`. Race senza thread, solo che ora è nello stato globale.

Passare invece tutto come parametri? Onesto, ma spietato: dovresti far passare un token di
autorizzazione attraverso venti firme di funzione, quando solo una di esse ne ha davvero bisogno.
Ciò che vuoi davvero è un'archiviazione legata non al processo, ma al thread logico di esecuzione.
E abbiamo già una struttura adatta al compito: coroutine e scope formano già un albero.

## Archiviazione su un albero

`Async\Context` è un archivio chiave-valore collegato a uno scope o a una coroutine. Il context di
uno scope è disponibile a tutte le sue coroutine:

```php
use function Async\current_context;

// middleware, inizio della gestione della richiesta
current_context()
    ->set('request_id', bin2hex(random_bytes(8)))
    ->set('user_id', $userId);
```

E da lì, ovunque, a qualsiasi profondità di chiamata, senza un singolo parametro extra:

```php
function logInfo(string $message): void
{
    $requestId = current_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

Nota `find`: cerca la chiave nel context corrente, e se non la trova, risale l'albero degli scope.
Gli scope figli vedono automaticamente i dati dei loro genitori, così una coroutine avviata in
profondità dentro un gestore troverà il `request_id` impostato all'inizio della richiesta. È lo
stesso meccanismo di `context.Context` di Go, solo che non devi cercarlo e passarlo in giro a mano:
l'albero è già lì.

Le richieste non si intralciano più a vicenda: ognuna ha il proprio scope, e quindi il proprio
context. Mille richieste concorrenti, mille `request_id` indipendenti, e non una singola variabile
globale.

## Tre livelli

Il context esiste su tre livelli, dal più ampio al più stretto:

```php
use function Async\root_context;
use function Async\current_context;
use function Async\coroutine_context;

root_context();      // l'intero processo: configurazione, condivisa da tutti
current_context();   // lo scope corrente: richiesta, utente, locale
coroutine_context(); // solo questa coroutine: dati privati
```

`root_context` è la casa legittima per tutto ciò che una volta era di diritto una variabile
globale: il nome dell'applicazione, le impostazioni. Vi accedi esplicitamente:
`root_context()->find('app_name')`. `coroutine_context` è il polo opposto: i suoi dati sono
invisibili a chiunque tranne che alla coroutine stessa, persino ai suoi vicini nello stesso scope.
Tra i due, `find` cuce insieme i livelli degli scope: non l'hai trovato localmente, chiedi al
genitore.

E un altro dettaglio piacevole:

```php
current_context()->set('user_id', 42);
current_context()->set('user_id', 7); // AsyncException: la chiave esiste già
```

La sovrascrittura è vietata a meno che tu non la richieda esplicitamente (`replace: true`). Il
context si protegge dalla stessa malattia delle variabili globali con cui questo capitolo è
iniziato: qualcuno, da qualche parte, che sovrascrive silenziosamente un valore.

## La fine del viaggio

Quindici capitoli fa abbiamo lanciato due funzioni "nello stesso momento" e siamo rimasti sorpresi
di vedere il loro output intrecciarsi. Da allora, ha preso forma un intero sistema, e ogni suo
livello ha la propria responsabilità:

- **Coroutine, `spawn`, `await`** — l'unità di concorrenza e la promessa di un risultato.
- **Annullamento, timeout, eccezioni** — il contratto di interruzione: niente gira per sempre, e
  niente muore silenziosamente.
- **`Future` e canali** — connessioni: un singolo risultato, e un flusso di valori con
  sincronizzazione.
- **`Scope`, `TaskGroup`, `TaskSet`, `iterate`** — struttura: ogni coroutine ha un proprietario, e
  ogni gruppo ha una strategia di attesa.
- **Pool** — disciplina delle risorse: poche connessioni, molte coroutine.
- **Thread** — parallelismo per il calcolo, senza memoria condivisa.
- **`Context`** — dati legati all'esecuzione, non al processo.

Nota cosa non abbiamo mai dovuto imparare: mutex, semafori, race sui dati, callback, o colorare le
funzioni come async o sync. Il codice è rimasto ordinario PHP sequenziale che ha semplicemente
smesso di starsene inattivo.

Da qui, due strade. Per la pratica sul campo, vai alla [documentazione](/it/docs.html), dove ogni
componente è smontato fino all'ultima vite. Per capire come funziona tutto sotto il cofano, vai
all'[architettura](/it/architecture.html). O meglio ancora, prendi semplicemente il tuo script più
lento e guarda cosa gli fa un singolo `spawn`.
