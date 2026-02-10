---
layout: page
lang: it
path_key: "/rfc.html"
nav_active: rfc
permalink: /it/rfc.html
page_title: "RFC"
description: "Proposte ufficiali per l'aggiunta di capacità asincrone al core di PHP"
---

## PHP RFC: True Async

Il progetto TrueAsync avanza attraverso il processo ufficiale di `RFC` su wiki.php.net.
Finora sono stati pubblicati due `RFC` che descrivono il modello base di concorrenza
e la concorrenza strutturata.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Autore: Edmond [HT]</span>
<span>Versione: 1.7</span>
<span>Versione target: PHP 8.6+</span>
<span class="rfc-badge discussion">Under Discussion</span>
</div>

L'RFC principale che definisce il modello di concorrenza per PHP.
Descrive le coroutine, le funzioni `spawn()` / `await()` / `suspend()`,
l'oggetto `Coroutine`, le interfacce `Awaitable` e `Completable`,
il meccanismo di cancellazione cooperativa, l'integrazione con `Fiber`,
la gestione degli errori e il graceful shutdown.

**Principi chiave:**

- Modifiche minime al codice esistente per abilitare la concorrenza
- Le coroutine mantengono l'illusione dell'esecuzione sequenziale
- Commutazione automatica delle coroutine durante le operazioni I/O
- Cancellazione cooperativa — «cancellable by design»
- API C standard per le estensioni

[Leggi il RFC su wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope e concorrenza strutturata

<div class="rfc-meta">
<span>Autore: Edmond [HT]</span>
<span>Versione: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

Estensione dell'RFC base. Introduce la classe `Scope`, che lega
il tempo di vita delle coroutine all'ambito lessicale.
Descrive la gerarchia degli scope, la propagazione degli errori,
la politica delle coroutine «zombie» e le sezioni critiche tramite `protect()`.

**Cosa risolve:**

- Prevenzione delle fughe di coroutine oltre lo scope
- Pulizia automatica delle risorse all'uscita dallo scope
- Cancellazione gerarchica: cancellazione del genitore → cancellazione di tutti i figli
- Protezione delle sezioni critiche dalla cancellazione
- Rilevamento di deadlock e self-await

[Leggi il RFC su wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## Come sono collegati questi RFC

Il primo RFC definisce le **primitive di basso livello** — coroutine,
funzioni base e API C per le estensioni. Il secondo RFC aggiunge
la **concorrenza strutturata** — meccanismi per gestire gruppi di coroutine
che rendono il codice concorrente sicuro e prevedibile.

Insieme formano un modello completo di programmazione asincrona per PHP:

|               | RFC #1: True Async                | RFC #2: Scope                           |
|---------------|-----------------------------------|-----------------------------------------|
| **Livello**   | Primitive                         | Gestione                                |
| **Fornisce**  | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **Analogie**  | Go goroutines, Kotlin coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **Obiettivo** | Esecuzione di codice concorrente  | Gestione sicura del ciclo di vita       |

## Partecipa alla discussione

Gli RFC vengono discussi nella mailing list [internals@lists.php.net](mailto:internals@lists.php.net)
e su [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"}.

Unisciti anche alla conversazione su [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}.
