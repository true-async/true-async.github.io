---
layout: tutorial
lang: it
path_key: "/tutors-laravel/04-unsafe-patterns.html"
nav_active: docs
permalink: /it/tutors-laravel/04-unsafe-patterns.html
page_title: "Cosa non puoi fare dentro una coroutine"
description: "Proprietà static mutabili, once() su un singleton e Number::useLocale(): i soliti modi in cui lo stato trapela tra le richieste, e come scovarli con l'analisi statica."
---

# Cosa non puoi fare dentro una coroutine

I capitoli precedenti hanno risolto perdite di stato specifiche:
`auth`/`session` tramite il context, il contatore delle transazioni
tramite un trait. `laravel-spawn` ha chiuso quei buchi per te. Ma il
framework è grande, i pacchetti di terze parti sono ancora più
numerosi, e domani qualcuno del tuo team scriverà un proprio servizio.
Ciò di cui hai bisogno è una regola che puoi applicare a colpo
d'occhio, per distinguere il codice sicuro per coroutine concorrenti
da quello che un giorno consegnerà a un utente i dati di qualcun
altro.

## Una regola: non scrivere su static dopo l'avvio

Ogni esempio qui sotto è un caso speciale dello stesso errore:
qualcosa scrive un valore in memoria condivisa da ogni coroutine nel
processo, e quel valore appartiene a una richiesta specifica.

**Una proprietà static mutabile su un servizio.**

```php
// Pericoloso
class PriceCalculator
{
    private static array $cache = [];

    public function forProduct(int $id): float
    {
        return self::$cache[$id] ??= $this->computeExpensive($id);
    }
}
```

Sembra una memoizzazione innocua. In realtà è un array condiviso tra
ogni coroutine. Se `computeExpensive()` dipende da qualcosa che cambia
tra una richiesta e l'altra, una valuta dell'utente, un ricarico
regionale, la prima richiesta decide il destino della cache per ogni
richiesta successiva. La correzione è semplice: una proprietà di
istanza invece di `static`, con il servizio risolto per richiesta
("approccio uno" del primo capitolo).

**E se il servizio è tuo, e hai deliberatamente bisogno di uno stato
per richiesta?** Non devi aspettare che `laravel-spawn` fornisca uno
`ScopedService` e un proxy per esso, è lo stesso trucco che ha risolto
il problema del contatore delle transazioni nel secondo capitolo, solo
un livello più su: non `coroutine_context()` per una singola
coroutine, ma `request_context()`, condiviso in tutto l'albero di
coroutine di una richiesta.

```php
class PriceCalculator  // resta un singleton
{
    private const CTX_CACHE = 'price.cache';

    public function forProduct(int $id): float
    {
        $cache = request_context()->find(self::CTX_CACHE) ?? [];

        return $cache[$id] ??= $this->computeExpensive($id, $cache);
    }
}
```

La differenza rispetto all'esempio precedente sembra piccola ma è
fondamentale: l'array non vive più su una proprietà `static` a livello
di classe condivisa dall'intero processo, vive nello scope context di
una richiesta specifica. Due richieste concorrenti chiamano la stessa
identica istanza di `PriceCalculator`, eppure ognuna ottiene la propria
`$cache`, perché `request_context()` si risolve in uno scope diverso
per ciascuna di esse. Un approfondimento su `coroutine_context()` e
`request_context()` si trova nel
[secondo capitolo](/it/tutors-laravel/02-pool-transactions.html).

**`once()` su un singleton.**

```php
// Pericoloso
class CurrentUserService  // registrato come singleton
{
    public function get()
    {
        return once(fn() => Auth::user());  // mette in cache il PRIMO utente, per sempre
    }
}
```

`once()` mette in cache il risultato della closure in una `WeakMap`
indicizzata dall'oggetto a cui la chiamata appartiene. Per un
singleton quell'oggetto è uno solo per l'intero processo, quindi anche
la cache è una sola. La prima richiesta calcola l'utente, ogni
richiesta successiva ottiene lo stesso. Su oggetti per-richiesta
(controller, modelli `Eloquent`) `once()` è perfettamente sicuro,
perché lì l'oggetto stesso è nuovo a ogni richiesta.

**Una mutazione globale come `Number::useLocale()`.**

```php
// Pericoloso
Number::useLocale('de');
$price = Number::format(1234.5);       // e se la coroutine si addormenta prima di questa riga?

// Sicuro
$price = Number::format(1234.5, locale: 'de');
```

`useLocale()` cambia una variabile static sulla classe `Number`. Tra
la chiamata a `useLocale()` e `format()`, un `await`, un `delay()`,
qualsiasi viaggio verso il database può accadere, in altre parole un
punto in cui lo scheduler passa il controllo a un'altra coroutine. Se
quella coroutine chiama a sua volta `Number::format()` senza una
locale esplicita, ottiene qualunque locale qualcun altro abbia appena
impostato. Il parametro esplicito `locale:` elimina completamente la
possibilità di una race: non c'è nulla da proteggere, perché non c'è
nulla da condividere.

**Superglobali.** `$_GET`, `$_POST`, `$_SERVER`, `$_SESSION` erano
sicure sotto PHP-FPM semplicemente perché vivevano per una sola
richiesta. In un worker a coroutine sono variabili condivise
dall'intero processo, ed è il server ad aggiornarle, non PHP a ogni
nuova connessione come sei abituato. Usa l'oggetto `Request`, che
`laravel-spawn` isola già tramite `current_context()`, e lascia stare
le superglobali.

## Quando static è effettivamente sicuro

È altrettanto importante non oscillare all'estremo opposto e
dichiarare ogni `static` un crimine. Questi casi sono sicuri:

- **`readonly static`**, se un valore non cambia mai dopo
  l'inizializzazione, condividerlo tra le coroutine non è più
  pericoloso che condividere una costante.
- **Configurazione al boot**, uno `static` impostato una volta
  all'avvio del worker e solo letto in seguito (route, template
  compilati, macro registrate).
- **Cache deterministiche**, se il risultato dipende solo dagli
  argomenti in input e non dalla richiesta "corrente" (ad esempio, la
  cache di `Str::camel()` per una data stringa è sempre la stessa
  stringa), una race per riempirla non corrompe i dati, al peggio
  qualcosa viene calcolato due volte.
- **Contatori monotoni senza semantica**, un alias auto-incrementale
  come un contatore interno per alias SQL univoci: anche se due
  richieste prendono lo stesso numero, la collisione non produce dati
  sbagliati, al massimo un alias meno elegante.

La differenza è sempre la stessa: si sta condividendo *un risultato
calcolato che non dipende dalla richiesta* o *uno stato che appartiene
a una richiesta specifica*? Il primo è un'ottimizzazione. Il secondo è
una perdita.

## Analisi statica invece di lettura attenta

Scorrere manualmente ogni pacchetto di terze parti alla ricerca di
`private static` senza `readonly` è esattamente il tipo di lavoro che
volentieri affidi a un linter. Il pacchetto include una regola
`PHPStan` costruita apposta:

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

        // ... messaggio "potenziale perdita di stato tra coroutine"
    }
}
```

La regola è quanto di più semplice possibile: trova ogni proprietà
`static` senza il modificatore `readonly` e la segnala. Ci saranno
molti falsi positivi, esattamente i casi "sicuri" elencati sopra, ma è
un compromesso deliberato: perdere una perdita reale è più costoso che
esaminare manualmente una lista di candidati una volta sola.

```bash
phpstan analyse app/ --configuration=phpstan.neon
phpstan analyse vendor/some/package/src --configuration=phpstan.neon
```

Eseguire la regola contro lo stesso framework Laravel produce più di
trecento segnalazioni. La stragrande maggioranza sono esattamente gli
`static` sicuri della sezione precedente: cache compilate di
`BladeCompiler`, flag di configurazione impostati una volta al
`boot()`, resolver che internamente accedono a un `$app['request']`
già isolato. Esaminare trecento righe una volta è un quarto d'ora di
lavoro. Perderne anche solo una e colpire una perdita in produzione
sono ore a fare debug del bug report di qualcun altro che dice "sto
vedendo il profilo di un altro utente".

## In sintesi

Prima di lasciare uno `static` (o un singleton con una proprietà
mutabile) in codice che gira dentro un handler di richiesta, fatti una
domanda: questo valore sopravviverà alla fine della richiesta corrente
e resterà corretto per quella successiva? Se sì, è sicuro. Se dovrebbe
scadere insieme alla richiesta, ma fisicamente continua a vivere nella
memoria condivisa del processo, è un candidato per `ScopedService`,
`request_context()`/`coroutine_context()` (vedi il
[secondo capitolo](/it/tutors-laravel/02-pool-transactions.html)),
oppure una semplice proprietà di istanza ricreata per ogni richiesta.

Abbiamo coperto il tuo codice e Laravel di base. Ma un progetto reale
di solito ha `spatie/laravel-permission`, `Telescope`, `Inertia` e
`Debugbar` che vivono proprio accanto, ognuno con la propria storia di
stato mutabile. Quali di essi sono già adattati, e quali vale la pena
disabilitare in modalità async, è l'argomento del prossimo capitolo.
