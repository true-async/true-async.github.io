---
layout: tutorial
lang: it
path_key: "/tutors-laravel/05-third-party.html"
nav_active: docs
permalink: /it/tutors-laravel/05-third-party.html
page_title: "Pacchetti di terze parti"
description: "Debugbar, Telescope, Inertia, spatie/permission, Socialite: cosa è già adattato per le coroutine e cosa conviene disabilitare."
---

# Pacchetti di terze parti

Abbiamo coperto il nucleo di Laravel e il tuo codice. Ma la lista delle
dipendenze di un progetto reale non si ferma lì: `Debugbar` in
sviluppo, `Telescope` per i log, `Inertia` per il frontend,
`spatie/laravel-permission` per i ruoli. Ognuno di essi è stato scritto
molto prima che qualcuno immaginasse centinaia di richieste concorrenti
dentro un unico processo, e ognuno ha il proprio singleton che porta
con sé dello stato. La buona notizia: per i pacchetti più comuni questo
lavoro è già fatto. La cattiva notizia: non per tutti, ed è importante
saper distinguere gli uni dagli altri.

## Già adattati

**`spatie/laravel-permission`.** `PermissionRegistrar` tiene il `team
ID` corrente e un indice di permessi wildcard nelle proprie proprietà,
esattamente il pattern coperto nel capitolo sui pattern pericolosi.
`AsyncPermissionRegistrar` sposta entrambi in `current_context()`:

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

    // clearPermissionsCollection() diventa un no-op: la lista dei
    // permessi stessa è di sola lettura dopo il caricamento ed è
    // condivisa in sicurezza tra le richieste.
}
```

Niente cambia nel tuo codice: `Auth::user()->can(...)`,
`setPermissionsTeamId()` nel middleware, tutto funziona esattamente
come descritto nella documentazione del pacchetto.

**`inertiajs/inertia-laravel`.** `AsyncResponseFactory` sposta
`sharedProps`, `rootView`, `version` e `encryptHistory`, tutto ciò che
prima si accumulava sulle proprietà del singleton `ResponseFactory` e
sarebbe sopravvissuto oltre la fine di una richiesta fino a quella
successiva, nel context.

**`barryvdh/laravel-debugbar`.** La soluzione qui è un po' più
sfumata. `Debugbar` raccoglie dati sull'intera richiesta: query SQL,
messaggi, tempistiche, un classico collector che accumula scrivendo su
se stesso per tutto il ciclo di gestione, comprese le pause su
`await`. `AsyncDebugbar` non risolve una nuova istanza per richiesta
(questo romperebbe le sottoscrizioni agli eventi one-time), mantiene
un `Debugbar` per worker, ma rende i collector stessi consapevoli del
context:

```php
class AsyncDebugbar extends LaravelDebugbar
{
    public function __construct(Application $app, Request $request)
    {
        parent::__construct($app, $request);

        // Questi accumulano dati attraverso ogni pausa di I/O nella
        // richiesta, quindi lo storage deve essere per-coroutine, non
        // per-istanza.
        $this->messagesCollector   = new AsyncMessagesCollector();
        $this->timeCollector       = new AsyncTimeDataCollector(...);
        $this->exceptionsCollector = new AsyncExceptionsCollector();
    }
}
```

La differenza rispetto a `ScopedServiceProxy` del primo capitolo
conta: lì, l'intero servizio veniva risolto di nuovo per ogni
richiesta; qui, il servizio resta un'unica istanza (è costoso
ricrearlo: sottoscrizioni di eventi, configurazione), e solo gli
specifici collector che accumulano dati al suo interno diventano
consapevoli del context. Stessa diagnosi del capitolo sui pattern
pericolosi ("non scrivere in uno stato condiviso tra le richieste"),
solo una cura su misura per l'anatomia particolare di questo pacchetto.

**`laravel/telescope`.** In modo simile: `entriesQueue`,
`updatesQueue` e il flag `shouldRecord` si spostano nel context tramite
un trait `CoroutineSafeRecording`, e la decisione se registrare una
data richiesta viene presa per coroutine.

**`laravel/socialite`.** Più semplice qui: `SocialiteManager` mette in
cache i driver insieme alla configurazione di qualunque richiesta li
abbia raggiunti per prima. La correzione non è un adattatore, è uno
`scopedSingleton`, lo stesso "approccio uno" del primo capitolo: un
manager nuovo per ogni richiesta, senza alcun bisogno di context.

## Sicuri senza adattamento

`Cache`, `Queue`, `Mail`, `Log`, `Validation`, `Filesystem`, `HTTP
Client`, `Notifications`, `Encryption`, `Hashing`, `Pagination`,
`Sanctum`, `Passport`, `Scout`, `Cashier`, `Horizon`, anche questi
hanno dei singleton, ma ciò che contengono è configurazione e client,
non dati per-richiesta. `CacheManager` mette in cache l'oggetto client
`Redis`, non i valori che ci metti dentro; `MailManager` mette in
cache il `Mailer` configurato, non le email. Stessa domanda del
capitolo sui pattern pericolosi: lo stato sopravvive alla fine di una
richiesta restando corretto? Qui la risposta è sì, perché lo stato è
configurazione di connessione, non i dati di un utente.

## Incompatibili: disattivali

**`livewire/livewire`.** Qui vale la pena fermarsi e non portare
avanti l'ottimismo precedente. `LivewireManager` accumula stato
per-richiesta in profondità al proprio interno, e `wire:stream` è
costruito su assunzioni riguardo a una risposta bufferizzata e
one-shot che il modello a coroutine concorrenti infrange di per sé.
Adattarlo pezzo per pezzo non ha funzionato, né per `laravel-spawn`,
né per `Laravel Octane` prima di esso. L'unica raccomandazione che
effettivamente regge è non abilitare `Livewire` in modalità async del
tutto. Per interfacce interattive su questo stack, usa `Inertia`, è
già adattato e coperto sopra. `Filament`, costruito sopra `Livewire`,
eredita la stessa limitazione.

## Decidere sul tuo pacchetto

Se il pacchetto di cui hai bisogno non è in nessuna delle due liste,
la domanda è la stessa del capitolo precedente, questa volta rivolta
al codice di qualcun altro: il singleton del pacchetto contiene stato
mutabile che dovrebbe essere corretto solo per una richiesta? Se sì, ci
sono tre strade, e non sono equivalenti.

La più veloce è `scoped_services` nella config, "approccio uno": il
pacchetto viene risolto di nuovo a ogni richiesta, e il suo stesso
codice resta intoccato.

```php
// config/async.php
'scoped_services' => [
    \SomePackage\Manager::class,
],
```

Se ricrearlo è costoso (il pacchetto è oneroso da inizializzare, o
mette in cache da solo qualcosa di utile tra le richieste), scrivi un
adattatore mirato seguendo il pattern di `AsyncPermissionRegistrar` o
`AsyncDebugbar` di questo capitolo: crea una sottoclasse, aggiungi un
`bootCompleted()`, sposta in `current_context()` solo ciò che
effettivamente cambia da una richiesta all'altra, lascia il resto
com'è.

E se non è un servizio a sé stante ma un pattern profondamente
radicato come `Livewire`, non passare una settimana ad adattarlo solo
per scoprire `wire:stream` rotto per ragioni architetturali una
settimana dopo. Esegui la `MutableStaticPropertyRule` del capitolo
precedente contro il codice sorgente del pacchetto: se le segnalazioni
si contano a dozzine e colpiscono il cuore stesso del pacchetto invece
di cache sicure al boot, quello è un segnale per escluderlo dalla
modalità async, non per correggerlo.

Abbiamo coperto il tuo codice, il nucleo di Laravel e il suo ecosistema
circostante. Ciò che resta è vedere i numeri: quanto diventa più veloce
in pratica un'applicazione una volta che tutto questo è in atto.
