<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const currentLang = computed(() => {
  const m = route.path.match(/^\/(en|ru|de|es|fr|it|uk|zh|ko)\//)
  return m ? m[1] : 'en'
})

const PURPLE = '#8B7BFF'
const TEAL = '#5AD1B0'

const RFC_URL = 'https://github.com/true-async/php-async-core-rfc/blob/main/scheduler_rfc.md'

const rfcI18n: Record<string, any> = {
  en: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'The TrueAsync RFC process',
      p: 'TrueAsync is advancing the ability to change the PHP core through the RFC process.',
    },
    mainRfc: {
      eyebrow: 'Lead RFC', tag: 'New RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['Author: Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'A mechanism for activating concurrent execution at the PHP core level. The core exposes dedicated hooks that let the scheduler implementation live in a separate extension, or even in PHP code.',
      listLabel: 'Key principles',
      items: [
        '<strong>Strict opt-in</strong>: zero overhead until a scheduler is registered',
        '<strong>Fiber-compatible</strong>: existing Fiber code keeps working, and fibers are adopted onto the schedule',
        '<strong>Continuation</strong>: a symmetric A→B context switch built on top of Fiber machinery',
        '<strong>A single registration point</strong>: <code>SchedulerHook::register()</code> activates concurrency engine-wide',
        '<strong>Per-coroutine context isolation</strong>: separate userland and internal contexts',
        '<strong>Ecosystem freedom</strong>: the core standardizes only activation and the scheduler interface, while <code>spawn()</code> / <code>await()</code> / channels stay up to the implementation',
      ],
      link: 'Read the RFC on GitHub', url: RFC_URL,
    },
    motivation: {
      eyebrow: 'Motivation',
      title: 'Why PHP needs built-in asynchrony',
      p: 'PHP is one of the last major languages that still lacks built-in support for concurrent execution <strong>at the language level</strong>. Python has asyncio, JavaScript is built on an event loop, Go has goroutines, Kotlin has coroutines. PHP remains in the "one request, one process" paradigm, even though most real-world applications spend the majority of their time waiting for I/O.',
      bad: {
        title: 'The fragmentation problem',
        p: 'Today async in PHP lives in extensions: Swoole, AMPHP, ReactPHP, each its own ecosystem with incompatible APIs.',
        items: [
          'Each extension rewrites its own MySQL / PostgreSQL / Redis drivers',
          "A Swoole library doesn't work with AMPHP, and vice versa",
          "Can't make core functions (file_get_contents, curl_exec) non-blocking",
          'A high barrier to entry: a whole separate ecosystem to learn',
        ],
      },
      good: {
        title: 'The solution: an engine hook',
        p: 'TrueAsync adds a standard seam for concurrency at the PHP engine level.',
        items: [
          '<strong>Transparency</strong>: sync code runs in coroutines unchanged',
          '<strong>No colored functions</strong>: no async/await marking',
          '<strong>A unified standard</strong>: one scheduler interface in the engine for every extension',
          '<strong>Backward compatibility</strong>: existing code keeps working',
        ],
      },
      workP: 'A typical PHP application (Laravel, Symfony, WordPress) spends <strong>70–90% of its time waiting for I/O</strong>. With coroutines that idle time is used efficiently:',
      workCols: { s: 'Scenario', wo: 'Without coroutines', w: 'With coroutines' },
      workRows: [
        { s: '3 DB queries at 20ms each', wo: '60ms', w: '~22ms' },
        { s: 'HTTP + DB + file', wo: 'sequential', w: 'parallel' },
        { s: '10 API calls', wo: '10 × latency', w: '~1 × latency' },
      ],
      scLabel: 'Practical scenarios',
      scenarios: [
        'Web servers · FrankenPHP, RoadRunner',
        'API Gateway · parallel aggregation',
        'Background tasks · concurrent queues',
        'Real-time · WebSockets, streaming',
      ],
    },
    prev: {
      eyebrow: 'History',
      title: 'Earlier RFCs',
      p: 'These two RFCs described a full concurrency model built directly into the core. The new approach builds on their ideas but moves the user-facing API out of the core, keeping only the scheduler attachment point in the engine.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['Author: Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'The RFC defining a concurrency model for PHP. Describes coroutines, functions <code>spawn()</code> / <code>await()</code> / <code>suspend()</code>, the Coroutine object, Awaitable and Completable interfaces, cooperative cancellation, Fiber integration, error handling and graceful shutdown.',
        listLabel: 'Key principles',
        items: [
          'Minimal changes to existing code to enable concurrency',
          'Coroutines maintain the illusion of sequential execution',
          'Automatic coroutine switching on I/O operations',
          'Cooperative cancellation, "cancellable by design"',
          'Standard C API for extensions',
        ],
        link: 'Read RFC on wiki.php.net', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope & Structured Concurrency',
        meta: ['Author: Edmond [HT]', 'v1.0'],
        desc: 'An extension of the True Async RFC. Introduces the <code>Scope</code> class, binding coroutine lifetime to the lexical scope. Describes scope hierarchy, error propagation, "zombie" coroutine policy and critical sections via <code>protect()</code>.',
        listLabel: 'What it solves',
        items: [
          'Preventing coroutine leaks beyond the scope',
          'Automatic resource cleanup on scope exit',
          'Hierarchical cancellation: cancelling the parent cancels all children',
          'Protecting critical sections from cancellation',
          'Deadlock and self-await detection',
        ],
        link: 'Read RFC on wiki.php.net', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: 'How these RFCs relate',
      p: 'The first RFC defines <strong>low-level primitives</strong>: coroutines, base functions and C API for extensions. The second adds <strong>structured concurrency</strong>: mechanisms for managing groups of coroutines that make concurrent code safe and predictable.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: 'Level', a: 'Primitives', b: 'Management' },
        { label: 'Provides', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: 'Analogies', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: 'Goal', a: 'Running concurrent code', b: 'Safe lifecycle management' },
      ],
    },
    discuss: {
      title: 'Join the Discussion',
      p: 'RFCs are discussed on the <code>internals@lists.php.net</code> mailing list and on GitHub Discussions. Also join the conversation on Discord.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  ru: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'RFC-процесс TrueAsync',
      p: 'TrueAsync продвигает возможность изменения ядра PHP с помощью RFC.',
    },
    mainRfc: {
      eyebrow: 'Главный RFC', tag: 'Новый RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['Автор: Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'Механизм активации конкурентного выполнения на уровне ядра PHP. Ядро PHP предоставляет специальные хуки, которые позволяют вынести реализацию Scheduler\'а в независимое расширение или даже в код на PHP.',
      listLabel: 'Ключевые принципы',
      items: [
        '<strong>Строгий opt-in</strong>: нулевые накладные расходы, пока планировщик не зарегистрирован',
        '<strong>Совместимость с Fiber</strong>: существующий код на Fiber продолжает работать, а файберы подхватываются планировщиком',
        '<strong>Continuation</strong>: симметричное переключение контекста A→B поверх машинерии Fiber',
        '<strong>Единая точка регистрации</strong>: <code>SchedulerHook::register()</code> включает конкурентность во всём движке',
        '<strong>Изоляция контекста корутин</strong>: раздельные пользовательский и внутренний контексты',
        '<strong>Свобода экосистемы</strong>: ядро стандартизирует только активацию и интерфейс планировщика, а <code>spawn()</code> / <code>await()</code> / каналы остаются за реализацией',
      ],
      link: 'Читать RFC на GitHub', url: RFC_URL,
    },
    motivation: {
      eyebrow: 'Мотивация',
      title: 'Зачем PHP встроенная асинхронность',
      p: 'PHP остаётся одним из последних крупных языков без встроенной поддержки конкурентного выполнения <strong>на уровне языка</strong>. В Python есть asyncio, JavaScript построен на событийном цикле, в Go есть горутины, в Kotlin есть корутины. PHP по-прежнему работает в парадигме «один запрос на один процесс», хотя большинство реальных приложений проводят основную часть времени в ожидании I/O.',
      bad: {
        title: 'Проблема фрагментации',
        p: 'Сегодня асинхронность в PHP живёт в расширениях: Swoole, AMPHP, ReactPHP, у каждого своя экосистема с несовместимыми API.',
        items: [
          'Каждое расширение переписывает свои драйверы MySQL / PostgreSQL / Redis',
          'Библиотека для Swoole не работает с AMPHP, и наоборот',
          'Нельзя сделать функции ядра (file_get_contents, curl_exec) неблокирующими',
          'Высокий порог входа: нужно освоить целую отдельную экосистему',
        ],
      },
      good: {
        title: 'Решение: хук в движке',
        p: 'TrueAsync добавляет стандартный шов для конкурентности на уровне движка PHP.',
        items: [
          '<strong>Прозрачность</strong>: синхронный код работает в корутинах без изменений',
          '<strong>Без «цветных» функций</strong>: не нужно размечать async/await',
          '<strong>Единый стандарт</strong>: один интерфейс планировщика в движке для всех расширений',
          '<strong>Обратная совместимость</strong>: существующий код продолжает работать',
        ],
      },
      workP: 'Типичное PHP-приложение (Laravel, Symfony, WordPress) проводит <strong>70–90% времени в ожидании I/O</strong>. С корутинами это время простоя используется эффективно:',
      workCols: { s: 'Сценарий', wo: 'Без корутин', w: 'С корутинами' },
      workRows: [
        { s: '3 запроса к БД по 20 мс', wo: '60 мс', w: '~22 мс' },
        { s: 'HTTP + БД + файл', wo: 'последовательно', w: 'параллельно' },
        { s: '10 вызовов API', wo: '10 × задержка', w: '~1 × задержка' },
      ],
      scLabel: 'Практические сценарии',
      scenarios: [
        'Веб-серверы · FrankenPHP, RoadRunner',
        'API Gateway · параллельная агрегация',
        'Фоновые задачи · конкурентные очереди',
        'Реальное время · WebSockets, стриминг',
      ],
    },
    prev: {
      eyebrow: 'История',
      title: 'Ранние RFC',
      p: 'Эти два RFC описывали полную модель конкурентности прямо в ядре. Новый подход опирается на их идеи, но выносит пользовательский API за пределы ядра, оставляя в движке только точку подключения планировщика.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['Автор: Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'RFC, определяющий модель конкурентности для PHP. Описывает корутины, функции <code>spawn()</code> / <code>await()</code> / <code>suspend()</code>, объект Coroutine, интерфейсы Awaitable и Completable, кооперативную отмену, интеграцию с Fiber, обработку ошибок и graceful shutdown.',
        listLabel: 'Ключевые принципы',
        items: [
          'Минимум изменений в существующем коде для включения конкурентности',
          'Корутины сохраняют иллюзию последовательного выполнения',
          'Автоматическое переключение корутин при I/O-операциях',
          'Кооперативная отмена, «cancellable by design»',
          'Стандартный C API для расширений',
        ],
        link: 'Читать RFC на wiki.php.net', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope и структурная конкурентность',
        meta: ['Автор: Edmond [HT]', 'v1.0'],
        desc: 'Расширение RFC True Async. Вводит класс <code>Scope</code>, привязывающий время жизни корутин к лексической области видимости. Описывает иерархию scope\'ов, распространение ошибок, политику «зомби»-корутин и критические секции через <code>protect()</code>.',
        listLabel: 'Что решает',
        items: [
          'Предотвращение утечки корутин за пределы scope',
          'Автоматическая очистка ресурсов при выходе из scope',
          'Иерархическая отмена: отмена родителя отменяет все дочерние',
          'Защита критических секций от отмены',
          'Обнаружение дедлоков и self-await',
        ],
        link: 'Читать RFC на wiki.php.net', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: 'Как связаны эти RFC',
      p: 'Первый RFC определяет <strong>низкоуровневые примитивы</strong>: корутины, базовые функции и C API для расширений. Второй RFC добавляет <strong>структурную конкурентность</strong>: механизмы управления группами корутин, которые делают конкурентный код безопасным и предсказуемым.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: 'Уровень', a: 'Примитивы', b: 'Управление' },
        { label: 'Что даёт', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: 'Аналогии', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: 'Цель', a: 'Запуск конкурентного кода', b: 'Безопасное управление жизненным циклом' },
      ],
    },
    discuss: {
      title: 'Участие в обсуждении',
      p: 'RFC обсуждаются в рассылке <code>internals@lists.php.net</code> и на GitHub Discussions. Также присоединяйтесь к обсуждению в Discord.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  de: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'Der RFC-Prozess von TrueAsync',
      p: 'TrueAsync treibt die Möglichkeit voran, den PHP-Kern über den RFC-Prozess zu verändern.',
    },
    mainRfc: {
      eyebrow: 'Haupt-RFC', tag: 'Neuer RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['Autor: Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'Ein Mechanismus zur Aktivierung konkurrenter Ausführung auf Ebene des PHP-Kerns. Der Kern stellt dedizierte Hooks bereit, die es erlauben, die Scheduler-Implementierung in eine eigene Erweiterung oder sogar in PHP-Code auszulagern.',
      listLabel: 'Grundprinzipien',
      items: [
        '<strong>Striktes Opt-in</strong>: kein Overhead, bis ein Scheduler registriert ist',
        '<strong>Fiber-kompatibel</strong>: bestehender Fiber-Code funktioniert weiter, und Fibers werden vom Scheduler übernommen',
        '<strong>Continuation</strong>: ein symmetrischer A→B-Kontextwechsel auf Basis der Fiber-Maschinerie',
        '<strong>Ein einziger Registrierungspunkt</strong>: <code>SchedulerHook::register()</code> aktiviert Konkurrenz engine-weit',
        '<strong>Kontextisolation pro Koroutine</strong>: getrennter Userland- und interner Kontext',
        '<strong>Freiheit für das Ökosystem</strong>: der Kern standardisiert nur die Aktivierung und die Scheduler-Schnittstelle, während <code>spawn()</code> / <code>await()</code> / Channels der Implementierung überlassen bleiben',
      ],
      link: 'RFC auf GitHub lesen', url: RFC_URL,
    },
    motivation: {
      eyebrow: 'Motivation',
      title: 'Warum PHP eingebaute Asynchronität braucht',
      p: 'PHP ist eine der letzten großen Sprachen, der noch die eingebaute Unterstützung für konkurrente Ausführung <strong>auf Sprachebene</strong> fehlt. Python hat asyncio, JavaScript basiert auf einer Ereignisschleife, Go hat Goroutinen, Kotlin hat Koroutinen. PHP verharrt im Paradigma «ein Request, ein Prozess», obwohl die meisten realen Anwendungen den Großteil ihrer Zeit mit Warten auf I/O verbringen.',
      bad: {
        title: 'Das Fragmentierungsproblem',
        p: 'Heute lebt Async in PHP in Erweiterungen: Swoole, AMPHP, ReactPHP, jede mit ihrem eigenen Ökosystem und inkompatiblen APIs.',
        items: [
          'Jede Erweiterung schreibt ihre eigenen MySQL- / PostgreSQL- / Redis-Treiber neu',
          'Eine Swoole-Bibliothek funktioniert nicht mit AMPHP und umgekehrt',
          'Kernfunktionen (file_get_contents, curl_exec) lassen sich nicht nicht-blockierend machen',
          'Hohe Einstiegshürde: ein ganzes separates Ökosystem muss erlernt werden',
        ],
      },
      good: {
        title: 'Die Lösung: ein Engine-Hook',
        p: 'TrueAsync fügt eine standardisierte Nahtstelle für Konkurrenz auf Ebene der PHP-Engine hinzu.',
        items: [
          '<strong>Transparenz</strong>: synchroner Code läuft unverändert in Koroutinen',
          '<strong>Keine gefärbten Funktionen</strong>: keine async/await-Markierung',
          '<strong>Ein einheitlicher Standard</strong>: eine Scheduler-Schnittstelle in der Engine für jede Erweiterung',
          '<strong>Abwärtskompatibilität</strong>: bestehender Code funktioniert weiter',
        ],
      },
      workP: 'Eine typische PHP-Anwendung (Laravel, Symfony, WordPress) verbringt <strong>70–90 % ihrer Zeit mit Warten auf I/O</strong>. Mit Koroutinen wird diese Leerlaufzeit effizient genutzt:',
      workCols: { s: 'Szenario', wo: 'Ohne Koroutinen', w: 'Mit Koroutinen' },
      workRows: [
        { s: '3 DB-Abfragen à 20 ms', wo: '60 ms', w: '~22 ms' },
        { s: 'HTTP + DB + Datei', wo: 'sequenziell', w: 'parallel' },
        { s: '10 API-Aufrufe', wo: '10 × Latenz', w: '~1 × Latenz' },
      ],
      scLabel: 'Praktische Szenarien',
      scenarios: [
        'Webserver · FrankenPHP, RoadRunner',
        'API Gateway · parallele Aggregation',
        'Hintergrundaufgaben · konkurrente Warteschlangen',
        'Echtzeit · WebSockets, Streaming',
      ],
    },
    prev: {
      eyebrow: 'Geschichte',
      title: 'Frühere RFCs',
      p: 'Diese beiden RFCs beschrieben ein vollständiges Konkurrenzmodell direkt im Kern. Der neue Ansatz baut auf ihren Ideen auf, verlagert aber die nutzerseitige API aus dem Kern und behält in der Engine nur den Anschlusspunkt für den Scheduler.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['Autor: Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'Der RFC, der ein Konkurrenzmodell für PHP definiert. Beschreibt Koroutinen, die Funktionen <code>spawn()</code> / <code>await()</code> / <code>suspend()</code>, das Coroutine-Objekt, die Schnittstellen Awaitable und Completable, kooperativen Abbruch, Fiber-Integration, Fehlerbehandlung und Graceful Shutdown.',
        listLabel: 'Grundprinzipien',
        items: [
          'Minimale Änderungen am bestehenden Code, um Konkurrenz zu ermöglichen',
          'Koroutinen bewahren die Illusion sequenzieller Ausführung',
          'Automatischer Koroutinen-Wechsel bei I/O-Operationen',
          'Kooperativer Abbruch, «cancellable by design»',
          'Standardisiertes C-API für Erweiterungen',
        ],
        link: 'RFC auf wiki.php.net lesen', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope & strukturierte Konkurrenz',
        meta: ['Autor: Edmond [HT]', 'v1.0'],
        desc: 'Eine Erweiterung des True-Async-RFC. Führt die Klasse <code>Scope</code> ein, die die Lebensdauer von Koroutinen an den lexikalischen Gültigkeitsbereich bindet. Beschreibt die Scope-Hierarchie, Fehlerweitergabe, die Politik für «Zombie»-Koroutinen und kritische Abschnitte über <code>protect()</code>.',
        listLabel: 'Was es löst',
        items: [
          'Verhindern, dass Koroutinen über den Scope hinaus lecken',
          'Automatische Ressourcenbereinigung beim Verlassen des Scope',
          'Hierarchischer Abbruch: das Abbrechen des Elternteils bricht alle Kinder ab',
          'Schutz kritischer Abschnitte vor Abbruch',
          'Erkennung von Deadlocks und Self-Await',
        ],
        link: 'RFC auf wiki.php.net lesen', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: 'Wie diese RFCs zusammenhängen',
      p: 'Der erste RFC definiert <strong>Low-Level-Primitive</strong>: Koroutinen, Basisfunktionen und das C-API für Erweiterungen. Der zweite RFC ergänzt <strong>strukturierte Konkurrenz</strong>: Mechanismen zur Verwaltung von Koroutinen-Gruppen, die konkurrenten Code sicher und vorhersehbar machen.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: 'Ebene', a: 'Primitive', b: 'Verwaltung' },
        { label: 'Bietet', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: 'Analogien', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: 'Ziel', a: 'Konkurrenten Code ausführen', b: 'Sichere Verwaltung des Lebenszyklus' },
      ],
    },
    discuss: {
      title: 'An der Diskussion teilnehmen',
      p: 'RFCs werden auf der Mailingliste <code>internals@lists.php.net</code> und auf GitHub Discussions diskutiert. Beteiligen Sie sich auch am Gespräch auf Discord.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  es: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'El proceso RFC de TrueAsync',
      p: 'TrueAsync impulsa la posibilidad de cambiar el núcleo de PHP mediante el proceso RFC.',
    },
    mainRfc: {
      eyebrow: 'RFC principal', tag: 'Nuevo RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['Autor: Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'Un mecanismo para activar la ejecución concurrente a nivel del núcleo de PHP. El núcleo expone hooks dedicados que permiten llevar la implementación del planificador a una extensión independiente, o incluso a código PHP.',
      listLabel: 'Principios clave',
      items: [
        '<strong>Opt-in estricto</strong>: cero sobrecarga hasta que se registra un planificador',
        '<strong>Compatible con Fiber</strong>: el código Fiber existente sigue funcionando, y las fibras son adoptadas por el planificador',
        '<strong>Continuation</strong>: un cambio de contexto simétrico A→B construido sobre la maquinaria de Fiber',
        '<strong>Un único punto de registro</strong>: <code>SchedulerHook::register()</code> activa la concurrencia en todo el motor',
        '<strong>Aislamiento de contexto por corrutina</strong>: contextos de usuario e interno separados',
        '<strong>Libertad del ecosistema</strong>: el núcleo estandariza solo la activación y la interfaz del planificador, mientras que <code>spawn()</code> / <code>await()</code> / los canales quedan a cargo de la implementación',
      ],
      link: 'Leer el RFC en GitHub', url: RFC_URL,
    },
    motivation: {
      eyebrow: 'Motivación',
      title: 'Por qué PHP necesita asincronía integrada',
      p: 'PHP es uno de los últimos lenguajes importantes que aún carece de soporte integrado para la ejecución concurrente <strong>a nivel de lenguaje</strong>. Python tiene asyncio, JavaScript se basa en un bucle de eventos, Go tiene goroutines, Kotlin tiene corrutinas. PHP sigue en el paradigma «una petición, un proceso», aunque la mayoría de las aplicaciones reales pasan la mayor parte de su tiempo esperando E/S.',
      bad: {
        title: 'El problema de la fragmentación',
        p: 'Hoy la asincronía en PHP vive en extensiones: Swoole, AMPHP, ReactPHP, cada una con su propio ecosistema y APIs incompatibles.',
        items: [
          'Cada extensión reescribe sus propios controladores de MySQL / PostgreSQL / Redis',
          'Una biblioteca para Swoole no funciona con AMPHP, y viceversa',
          'No se pueden hacer no bloqueantes las funciones del núcleo (file_get_contents, curl_exec)',
          'Una alta barrera de entrada: hay que aprender todo un ecosistema aparte',
        ],
      },
      good: {
        title: 'La solución: un hook en el motor',
        p: 'TrueAsync añade una costura estándar para la concurrencia a nivel del motor de PHP.',
        items: [
          '<strong>Transparencia</strong>: el código síncrono se ejecuta en corrutinas sin cambios',
          '<strong>Sin funciones de color</strong>: sin marcado async/await',
          '<strong>Un estándar unificado</strong>: una interfaz de planificador en el motor para cada extensión',
          '<strong>Compatibilidad hacia atrás</strong>: el código existente sigue funcionando',
        ],
      },
      workP: 'Una aplicación PHP típica (Laravel, Symfony, WordPress) pasa <strong>el 70–90 % de su tiempo esperando E/S</strong>. Con corrutinas ese tiempo inactivo se aprovecha de forma eficiente:',
      workCols: { s: 'Escenario', wo: 'Sin corrutinas', w: 'Con corrutinas' },
      workRows: [
        { s: '3 consultas a BD de 20 ms cada una', wo: '60 ms', w: '~22 ms' },
        { s: 'HTTP + BD + archivo', wo: 'secuencial', w: 'paralelo' },
        { s: '10 llamadas a la API', wo: '10 × latencia', w: '~1 × latencia' },
      ],
      scLabel: 'Escenarios prácticos',
      scenarios: [
        'Servidores web · FrankenPHP, RoadRunner',
        'API Gateway · agregación paralela',
        'Tareas en segundo plano · colas concurrentes',
        'Tiempo real · WebSockets, streaming',
      ],
    },
    prev: {
      eyebrow: 'Historia',
      title: 'RFCs anteriores',
      p: 'Estos dos RFCs describían un modelo de concurrencia completo integrado directamente en el núcleo. El nuevo enfoque se apoya en sus ideas, pero saca del núcleo la API orientada al usuario y conserva en el motor solo el punto de conexión del planificador.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['Autor: Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'El RFC que define un modelo de concurrencia para PHP. Describe las corrutinas, las funciones <code>spawn()</code> / <code>await()</code> / <code>suspend()</code>, el objeto Coroutine, las interfaces Awaitable y Completable, la cancelación cooperativa, la integración con Fiber, el manejo de errores y el graceful shutdown.',
        listLabel: 'Principios clave',
        items: [
          'Cambios mínimos en el código existente para habilitar la concurrencia',
          'Las corrutinas mantienen la ilusión de una ejecución secuencial',
          'Cambio automático de corrutinas en las operaciones de E/S',
          'Cancelación cooperativa, «cancellable by design»',
          'API de C estándar para extensiones',
        ],
        link: 'Leer el RFC en wiki.php.net', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope y concurrencia estructurada',
        meta: ['Autor: Edmond [HT]', 'v1.0'],
        desc: 'Una extensión del RFC True Async. Introduce la clase <code>Scope</code>, que vincula el tiempo de vida de las corrutinas al ámbito léxico. Describe la jerarquía de scopes, la propagación de errores, la política de corrutinas «zombis» y las secciones críticas mediante <code>protect()</code>.',
        listLabel: 'Qué resuelve',
        items: [
          'Evitar la fuga de corrutinas más allá del scope',
          'Limpieza automática de recursos al salir del scope',
          'Cancelación jerárquica: cancelar al padre cancela a todos los hijos',
          'Protección de secciones críticas frente a la cancelación',
          'Detección de interbloqueos y self-await',
        ],
        link: 'Leer el RFC en wiki.php.net', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: 'Cómo se relacionan estos RFCs',
      p: 'El primer RFC define <strong>primitivas de bajo nivel</strong>: corrutinas, funciones base y la API de C para extensiones. El segundo RFC añade <strong>concurrencia estructurada</strong>: mecanismos para gestionar grupos de corrutinas que hacen que el código concurrente sea seguro y predecible.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: 'Nivel', a: 'Primitivas', b: 'Gestión' },
        { label: 'Aporta', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: 'Analogías', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: 'Objetivo', a: 'Ejecutar código concurrente', b: 'Gestión segura del ciclo de vida' },
      ],
    },
    discuss: {
      title: 'Únete a la conversación',
      p: 'Los RFCs se debaten en la lista de correo <code>internals@lists.php.net</code> y en GitHub Discussions. Únete también a la conversación en Discord.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  fr: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'Le processus RFC de TrueAsync',
      p: 'TrueAsync fait progresser la possibilité de modifier le cœur de PHP via le processus RFC.',
    },
    mainRfc: {
      eyebrow: 'RFC principal', tag: 'Nouveau RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['Auteur : Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'Un mécanisme d\'activation de l\'exécution concurrente au niveau du cœur de PHP. Le cœur expose des hooks dédiés qui permettent de déporter l\'implémentation de l\'ordonnanceur dans une extension distincte, voire dans du code PHP.',
      listLabel: 'Principes clés',
      items: [
        '<strong>Opt-in strict</strong> : aucun surcoût tant qu\'aucun ordonnanceur n\'est enregistré',
        '<strong>Compatible avec Fiber</strong> : le code Fiber existant continue de fonctionner, et les fibers sont prises en charge par l\'ordonnanceur',
        '<strong>Continuation</strong> : un changement de contexte symétrique A→B bâti sur la machinerie de Fiber',
        '<strong>Un point d\'enregistrement unique</strong> : <code>SchedulerHook::register()</code> active la concurrence dans tout le moteur',
        '<strong>Isolation du contexte par coroutine</strong> : contextes utilisateur et interne séparés',
        '<strong>Liberté de l\'écosystème</strong> : le cœur ne standardise que l\'activation et l\'interface de l\'ordonnanceur, tandis que <code>spawn()</code> / <code>await()</code> / les canaux restent à la charge de l\'implémentation',
      ],
      link: 'Lire le RFC sur GitHub', url: RFC_URL,
    },
    motivation: {
      eyebrow: 'Motivation',
      title: 'Pourquoi PHP a besoin d\'une asynchronie native',
      p: 'PHP est l\'un des derniers langages majeurs à ne toujours pas disposer d\'un support natif de l\'exécution concurrente <strong>au niveau du langage</strong>. Python a asyncio, JavaScript repose sur une boucle d\'événements, Go a les goroutines, Kotlin a les coroutines. PHP reste dans le paradigme « une requête, un processus », alors que la plupart des applications réelles passent l\'essentiel de leur temps à attendre des E/S.',
      bad: {
        title: 'Le problème de la fragmentation',
        p: 'Aujourd\'hui, l\'asynchrone en PHP vit dans des extensions : Swoole, AMPHP, ReactPHP, chacune avec son propre écosystème et des API incompatibles.',
        items: [
          'Chaque extension réécrit ses propres pilotes MySQL / PostgreSQL / Redis',
          'Une bibliothèque pour Swoole ne fonctionne pas avec AMPHP, et inversement',
          'Impossible de rendre non bloquantes les fonctions du cœur (file_get_contents, curl_exec)',
          'Une barrière d\'entrée élevée : tout un écosystème distinct à apprendre',
        ],
      },
      good: {
        title: 'La solution : un hook dans le moteur',
        p: 'TrueAsync ajoute une couture standard pour la concurrence au niveau du moteur PHP.',
        items: [
          '<strong>Transparence</strong> : le code synchrone s\'exécute dans des coroutines sans modification',
          '<strong>Pas de fonctions colorées</strong> : aucun marquage async/await',
          '<strong>Un standard unifié</strong> : une seule interface d\'ordonnanceur dans le moteur pour chaque extension',
          '<strong>Rétrocompatibilité</strong> : le code existant continue de fonctionner',
        ],
      },
      workP: 'Une application PHP typique (Laravel, Symfony, WordPress) passe <strong>70 à 90 % de son temps à attendre des E/S</strong>. Avec les coroutines, ce temps d\'inactivité est utilisé efficacement :',
      workCols: { s: 'Scénario', wo: 'Sans coroutines', w: 'Avec coroutines' },
      workRows: [
        { s: '3 requêtes BD de 20 ms chacune', wo: '60 ms', w: '~22 ms' },
        { s: 'HTTP + BD + fichier', wo: 'séquentiel', w: 'parallèle' },
        { s: '10 appels d\'API', wo: '10 × latence', w: '~1 × latence' },
      ],
      scLabel: 'Scénarios pratiques',
      scenarios: [
        'Serveurs web · FrankenPHP, RoadRunner',
        'API Gateway · agrégation parallèle',
        'Tâches d\'arrière-plan · files concurrentes',
        'Temps réel · WebSockets, streaming',
      ],
    },
    prev: {
      eyebrow: 'Historique',
      title: 'RFC précédents',
      p: 'Ces deux RFC décrivaient un modèle de concurrence complet intégré directement au cœur. La nouvelle approche s\'appuie sur leurs idées, mais sort du cœur l\'API destinée à l\'utilisateur, ne conservant dans le moteur que le point d\'attache de l\'ordonnanceur.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['Auteur : Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'Le RFC qui définit un modèle de concurrence pour PHP. Il décrit les coroutines, les fonctions <code>spawn()</code> / <code>await()</code> / <code>suspend()</code>, l\'objet Coroutine, les interfaces Awaitable et Completable, l\'annulation coopérative, l\'intégration avec Fiber, la gestion des erreurs et le graceful shutdown.',
        listLabel: 'Principes clés',
        items: [
          'Modifications minimales du code existant pour activer la concurrence',
          'Les coroutines conservent l\'illusion d\'une exécution séquentielle',
          'Bascule automatique des coroutines lors des opérations d\'E/S',
          'Annulation coopérative, « cancellable by design »',
          'API C standard pour les extensions',
        ],
        link: 'Lire le RFC sur wiki.php.net', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope et concurrence structurée',
        meta: ['Auteur : Edmond [HT]', 'v1.0'],
        desc: 'Une extension du RFC True Async. Il introduit la classe <code>Scope</code>, qui lie la durée de vie des coroutines à la portée lexicale. Il décrit la hiérarchie des scopes, la propagation des erreurs, la politique des coroutines « zombies » et les sections critiques via <code>protect()</code>.',
        listLabel: 'Ce qu\'il résout',
        items: [
          'Empêcher les fuites de coroutines au-delà du scope',
          'Nettoyage automatique des ressources à la sortie du scope',
          'Annulation hiérarchique : annuler le parent annule tous les enfants',
          'Protection des sections critiques contre l\'annulation',
          'Détection des interblocages et du self-await',
        ],
        link: 'Lire le RFC sur wiki.php.net', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: 'Comment ces RFC sont liés',
      p: 'Le premier RFC définit des <strong>primitives de bas niveau</strong> : coroutines, fonctions de base et API C pour les extensions. Le second RFC ajoute la <strong>concurrence structurée</strong> : des mécanismes de gestion de groupes de coroutines qui rendent le code concurrent sûr et prévisible.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: 'Niveau', a: 'Primitives', b: 'Gestion' },
        { label: 'Fournit', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: 'Analogies', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: 'Objectif', a: 'Exécuter du code concurrent', b: 'Gestion sûre du cycle de vie' },
      ],
    },
    discuss: {
      title: 'Rejoignez la discussion',
      p: 'Les RFC sont discutés sur la liste de diffusion <code>internals@lists.php.net</code> et sur GitHub Discussions. Rejoignez aussi la conversation sur Discord.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  it: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'Il processo RFC di TrueAsync',
      p: 'TrueAsync porta avanti la possibilità di modificare il core di PHP attraverso il processo RFC.',
    },
    mainRfc: {
      eyebrow: 'RFC principale', tag: 'Nuovo RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['Autore: Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'Un meccanismo per attivare l\'esecuzione concorrente a livello del core di PHP. Il core espone hook dedicati che permettono di spostare l\'implementazione dello scheduler in un\'estensione separata, o persino in codice PHP.',
      listLabel: 'Principi chiave',
      items: [
        '<strong>Opt-in rigoroso</strong>: nessun overhead finché non viene registrato uno scheduler',
        '<strong>Compatibile con Fiber</strong>: il codice Fiber esistente continua a funzionare, e le fiber vengono prese in carico dallo scheduler',
        '<strong>Continuation</strong>: un cambio di contesto simmetrico A→B costruito sopra la macchineria di Fiber',
        '<strong>Un unico punto di registrazione</strong>: <code>SchedulerHook::register()</code> attiva la concorrenza nell\'intero engine',
        '<strong>Isolamento del contesto per coroutine</strong>: contesti utente e interno separati',
        '<strong>Libertà dell\'ecosistema</strong>: il core standardizza solo l\'attivazione e l\'interfaccia dello scheduler, mentre <code>spawn()</code> / <code>await()</code> / i canali restano a carico dell\'implementazione',
      ],
      link: 'Leggi l\'RFC su GitHub', url: RFC_URL,
    },
    motivation: {
      eyebrow: 'Motivazione',
      title: 'Perché PHP ha bisogno di asincronia integrata',
      p: 'PHP è uno degli ultimi linguaggi importanti a mancare ancora del supporto integrato all\'esecuzione concorrente <strong>a livello di linguaggio</strong>. Python ha asyncio, JavaScript è costruito su un ciclo di eventi, Go ha le goroutine, Kotlin ha le coroutine. PHP rimane nel paradigma «una richiesta, un processo», anche se la maggior parte delle applicazioni reali passa gran parte del tempo in attesa di I/O.',
      bad: {
        title: 'Il problema della frammentazione',
        p: 'Oggi l\'asincronia in PHP vive nelle estensioni: Swoole, AMPHP, ReactPHP, ciascuna con il proprio ecosistema e API incompatibili.',
        items: [
          'Ogni estensione riscrive i propri driver MySQL / PostgreSQL / Redis',
          'Una libreria per Swoole non funziona con AMPHP, e viceversa',
          'Non è possibile rendere non bloccanti le funzioni del core (file_get_contents, curl_exec)',
          'Un\'alta barriera d\'ingresso: un intero ecosistema separato da imparare',
        ],
      },
      good: {
        title: 'La soluzione: un hook nell\'engine',
        p: 'TrueAsync aggiunge una giuntura standard per la concorrenza a livello dell\'engine di PHP.',
        items: [
          '<strong>Trasparenza</strong>: il codice sincrono viene eseguito nelle coroutine senza modifiche',
          '<strong>Nessuna funzione colorata</strong>: nessuna marcatura async/await',
          '<strong>Uno standard unificato</strong>: un\'unica interfaccia dello scheduler nell\'engine per ogni estensione',
          '<strong>Retrocompatibilità</strong>: il codice esistente continua a funzionare',
        ],
      },
      workP: 'Un\'applicazione PHP tipica (Laravel, Symfony, WordPress) passa <strong>il 70–90% del suo tempo in attesa di I/O</strong>. Con le coroutine questo tempo di inattività viene sfruttato in modo efficiente:',
      workCols: { s: 'Scenario', wo: 'Senza coroutine', w: 'Con coroutine' },
      workRows: [
        { s: '3 query al DB da 20 ms ciascuna', wo: '60 ms', w: '~22 ms' },
        { s: 'HTTP + DB + file', wo: 'sequenziale', w: 'parallelo' },
        { s: '10 chiamate API', wo: '10 × latenza', w: '~1 × latenza' },
      ],
      scLabel: 'Scenari pratici',
      scenarios: [
        'Server web · FrankenPHP, RoadRunner',
        'API Gateway · aggregazione parallela',
        'Attività in background · code concorrenti',
        'Tempo reale · WebSockets, streaming',
      ],
    },
    prev: {
      eyebrow: 'Storia',
      title: 'RFC precedenti',
      p: 'Questi due RFC descrivevano un modello di concorrenza completo integrato direttamente nel core. Il nuovo approccio si basa sulle loro idee, ma sposta fuori dal core l\'API rivolta all\'utente, mantenendo nell\'engine solo il punto di aggancio dello scheduler.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['Autore: Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'L\'RFC che definisce un modello di concorrenza per PHP. Descrive le coroutine, le funzioni <code>spawn()</code> / <code>await()</code> / <code>suspend()</code>, l\'oggetto Coroutine, le interfacce Awaitable e Completable, la cancellazione cooperativa, l\'integrazione con Fiber, la gestione degli errori e il graceful shutdown.',
        listLabel: 'Principi chiave',
        items: [
          'Modifiche minime al codice esistente per abilitare la concorrenza',
          'Le coroutine mantengono l\'illusione di un\'esecuzione sequenziale',
          'Cambio automatico delle coroutine sulle operazioni di I/O',
          'Cancellazione cooperativa, «cancellable by design»',
          'API C standard per le estensioni',
        ],
        link: 'Leggi l\'RFC su wiki.php.net', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope e concorrenza strutturata',
        meta: ['Autore: Edmond [HT]', 'v1.0'],
        desc: 'Un\'estensione dell\'RFC True Async. Introduce la classe <code>Scope</code>, che lega la durata di vita delle coroutine all\'ambito lessicale. Descrive la gerarchia degli scope, la propagazione degli errori, la politica delle coroutine «zombie» e le sezioni critiche tramite <code>protect()</code>.',
        listLabel: 'Cosa risolve',
        items: [
          'Prevenire la fuga delle coroutine oltre lo scope',
          'Pulizia automatica delle risorse all\'uscita dallo scope',
          'Cancellazione gerarchica: cancellare il genitore cancella tutti i figli',
          'Protezione delle sezioni critiche dalla cancellazione',
          'Rilevamento di deadlock e self-await',
        ],
        link: 'Leggi l\'RFC su wiki.php.net', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: 'Come sono collegati questi RFC',
      p: 'Il primo RFC definisce le <strong>primitive di basso livello</strong>: coroutine, funzioni di base e API C per le estensioni. Il secondo RFC aggiunge la <strong>concorrenza strutturata</strong>: meccanismi per gestire gruppi di coroutine che rendono il codice concorrente sicuro e prevedibile.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: 'Livello', a: 'Primitive', b: 'Gestione' },
        { label: 'Fornisce', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: 'Analogie', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: 'Obiettivo', a: 'Eseguire codice concorrente', b: 'Gestione sicura del ciclo di vita' },
      ],
    },
    discuss: {
      title: 'Partecipa alla discussione',
      p: 'Gli RFC vengono discussi sulla mailing list <code>internals@lists.php.net</code> e su GitHub Discussions. Unisciti anche alla conversazione su Discord.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  ko: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'TrueAsync의 RFC 프로세스',
      p: 'TrueAsync는 RFC 프로세스를 통해 PHP 코어를 변경할 수 있는 가능성을 발전시키고 있습니다.',
    },
    mainRfc: {
      eyebrow: '주요 RFC', tag: '새 RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['작성자: Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'PHP 코어 수준에서 동시 실행을 활성화하는 메커니즘입니다. 코어는 전용 훅을 제공하여 스케줄러 구현을 별도의 확장 모듈이나 심지어 PHP 코드로 분리할 수 있게 합니다.',
      listLabel: '핵심 원칙',
      items: [
        '<strong>엄격한 옵트인</strong>: 스케줄러가 등록되기 전까지는 오버헤드가 전혀 없습니다',
        '<strong>Fiber 호환</strong>: 기존 Fiber 코드가 계속 동작하며, Fiber는 스케줄러에 편입됩니다',
        '<strong>Continuation</strong>: Fiber 기반 위에 구축된 대칭적인 A→B 컨텍스트 전환',
        '<strong>단일 등록 지점</strong>: <code>SchedulerHook::register()</code>가 엔진 전체에서 동시성을 활성화합니다',
        '<strong>코루틴별 컨텍스트 격리</strong>: 사용자 컨텍스트와 내부 컨텍스트를 분리',
        '<strong>생태계의 자유</strong>: 코어는 활성화와 스케줄러 인터페이스만 표준화하며, <code>spawn()</code> / <code>await()</code> / 채널은 구현에 맡겨집니다',
      ],
      link: 'GitHub에서 RFC 읽기', url: RFC_URL,
    },
    motivation: {
      eyebrow: '동기',
      title: 'PHP에 내장 비동기가 필요한 이유',
      p: 'PHP는 아직도 <strong>언어 수준</strong>에서 동시 실행에 대한 내장 지원이 없는 몇 안 되는 주요 언어 중 하나입니다. Python에는 asyncio가 있고, JavaScript는 이벤트 루프 위에 구축되어 있으며, Go에는 고루틴, Kotlin에는 코루틴이 있습니다. 대부분의 실제 애플리케이션이 시간의 대부분을 I/O 대기에 쓰는데도, PHP는 여전히 「하나의 요청, 하나의 프로세스」 패러다임에 머물러 있습니다.',
      bad: {
        title: '파편화 문제',
        p: '오늘날 PHP의 비동기는 확장 모듈에 존재합니다: Swoole, AMPHP, ReactPHP, 각각 호환되지 않는 API를 가진 자체 생태계입니다.',
        items: [
          '각 확장 모듈이 자체 MySQL / PostgreSQL / Redis 드라이버를 다시 작성합니다',
          'Swoole용 라이브러리는 AMPHP와 함께 동작하지 않으며, 그 반대도 마찬가지입니다',
          '코어 함수(file_get_contents, curl_exec)를 논블로킹으로 만들 수 없습니다',
          '높은 진입 장벽: 완전히 별개의 생태계를 배워야 합니다',
        ],
      },
      good: {
        title: '해결책: 엔진 훅',
        p: 'TrueAsync는 PHP 엔진 수준에서 동시성을 위한 표준 이음새를 추가합니다.',
        items: [
          '<strong>투명성</strong>: 동기 코드가 변경 없이 코루틴에서 실행됩니다',
          '<strong>색깔 있는 함수 없음</strong>: async/await 표시가 필요 없습니다',
          '<strong>통일된 표준</strong>: 모든 확장 모듈을 위한 엔진 내 단일 스케줄러 인터페이스',
          '<strong>하위 호환성</strong>: 기존 코드가 계속 동작합니다',
        ],
      },
      workP: '일반적인 PHP 애플리케이션(Laravel, Symfony, WordPress)은 <strong>시간의 70~90%를 I/O 대기에 소비합니다</strong>. 코루틴을 사용하면 이 유휴 시간이 효율적으로 활용됩니다:',
      workCols: { s: '시나리오', wo: '코루틴 없이', w: '코루틴 사용' },
      workRows: [
        { s: '각 20ms의 DB 쿼리 3개', wo: '60ms', w: '~22ms' },
        { s: 'HTTP + DB + 파일', wo: '순차', w: '병렬' },
        { s: 'API 호출 10회', wo: '10 × 지연', w: '~1 × 지연' },
      ],
      scLabel: '실용적인 시나리오',
      scenarios: [
        '웹 서버 · FrankenPHP, RoadRunner',
        'API Gateway · 병렬 집계',
        '백그라운드 작업 · 동시 큐',
        '실시간 · WebSockets, 스트리밍',
      ],
    },
    prev: {
      eyebrow: '역사',
      title: '이전 RFC',
      p: '이 두 RFC는 코어에 직접 내장된 완전한 동시성 모델을 설명했습니다. 새로운 접근 방식은 그 아이디어를 기반으로 하되, 사용자 대상 API를 코어 밖으로 옮기고 엔진에는 스케줄러 연결 지점만 남깁니다.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['작성자: Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'PHP를 위한 동시성 모델을 정의하는 RFC입니다. 코루틴, <code>spawn()</code> / <code>await()</code> / <code>suspend()</code> 함수, Coroutine 객체, Awaitable 및 Completable 인터페이스, 협력적 취소, Fiber 통합, 오류 처리 및 graceful shutdown을 설명합니다.',
        listLabel: '핵심 원칙',
        items: [
          '동시성을 활성화하기 위한 기존 코드의 최소한의 변경',
          '코루틴은 순차 실행의 착각을 유지합니다',
          'I/O 작업 시 코루틴의 자동 전환',
          '협력적 취소, 「cancellable by design」',
          '확장 모듈을 위한 표준 C API',
        ],
        link: 'wiki.php.net에서 RFC 읽기', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope와 구조적 동시성',
        meta: ['작성자: Edmond [HT]', 'v1.0'],
        desc: 'True Async RFC의 확장입니다. 코루틴의 수명을 렉시컬 스코프에 묶는 <code>Scope</code> 클래스를 도입합니다. 스코프 계층 구조, 오류 전파, 「좀비」 코루틴 정책 및 <code>protect()</code>를 통한 임계 구역을 설명합니다.',
        listLabel: '해결하는 문제',
        items: [
          '스코프를 벗어난 코루틴 누수 방지',
          '스코프 종료 시 자동 리소스 정리',
          '계층적 취소: 부모를 취소하면 모든 자식이 취소됩니다',
          '취소로부터 임계 구역 보호',
          '데드락 및 self-await 감지',
        ],
        link: 'wiki.php.net에서 RFC 읽기', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: '이 RFC들의 관계',
      p: '첫 번째 RFC는 <strong>저수준 프리미티브</strong>를 정의합니다: 코루틴, 기본 함수, 확장 모듈을 위한 C API. 두 번째 RFC는 <strong>구조적 동시성</strong>을 추가합니다: 동시성 코드를 안전하고 예측 가능하게 만드는 코루틴 그룹 관리 메커니즘입니다.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: '수준', a: '프리미티브', b: '관리' },
        { label: '제공', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: '유사 개념', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: '목표', a: '동시성 코드 실행', b: '안전한 생명 주기 관리' },
      ],
    },
    discuss: {
      title: '토론에 참여하기',
      p: 'RFC는 <code>internals@lists.php.net</code> 메일링 리스트와 GitHub Discussions에서 논의됩니다. Discord에서의 대화에도 참여하세요.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  uk: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'RFC-процес TrueAsync',
      p: 'TrueAsync просуває можливість змінювати ядро PHP за допомогою RFC.',
    },
    mainRfc: {
      eyebrow: 'Головний RFC', tag: 'Новий RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['Автор: Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: 'Механізм активації конкурентного виконання на рівні ядра PHP. Ядро надає спеціальні хуки, які дозволяють винести реалізацію планувальника в окреме розширення або навіть у код на PHP.',
      listLabel: 'Ключові принципи',
      items: [
        '<strong>Суворий opt-in</strong>: нульові накладні витрати, доки планувальник не зареєстровано',
        '<strong>Сумісність із Fiber</strong>: наявний код на Fiber продовжує працювати, а файбери підхоплюються планувальником',
        '<strong>Continuation</strong>: симетричне перемикання контексту A→B поверх машинерії Fiber',
        '<strong>Єдина точка реєстрації</strong>: <code>SchedulerHook::register()</code> вмикає конкурентність у всьому рушії',
        '<strong>Ізоляція контексту корутин</strong>: окремі користувацький і внутрішній контексти',
        '<strong>Свобода екосистеми</strong>: ядро стандартизує лише активацію та інтерфейс планувальника, а <code>spawn()</code> / <code>await()</code> / канали залишаються за реалізацією',
      ],
      link: 'Читати RFC на GitHub', url: RFC_URL,
    },
    motivation: {
      eyebrow: 'Мотивація',
      title: 'Навіщо PHP вбудована асинхронність',
      p: 'PHP залишається однією з останніх великих мов без вбудованої підтримки конкурентного виконання <strong>на рівні мови</strong>. У Python є asyncio, JavaScript побудований на циклі подій, у Go є горутини, у Kotlin є корутини. PHP досі працює в парадигмі «один запит на один процес», хоча більшість реальних застосунків проводять основну частину часу в очікуванні I/O.',
      bad: {
        title: 'Проблема фрагментації',
        p: 'Сьогодні асинхронність у PHP живе в розширеннях: Swoole, AMPHP, ReactPHP, у кожного своя екосистема з несумісними API.',
        items: [
          'Кожне розширення переписує свої драйвери MySQL / PostgreSQL / Redis',
          'Бібліотека для Swoole не працює з AMPHP, і навпаки',
          'Не можна зробити функції ядра (file_get_contents, curl_exec) неблокуючими',
          'Високий поріг входження: потрібно опанувати цілу окрему екосистему',
        ],
      },
      good: {
        title: 'Рішення: хук у рушії',
        p: 'TrueAsync додає стандартний шов для конкурентності на рівні рушія PHP.',
        items: [
          '<strong>Прозорість</strong>: синхронний код працює в корутинах без змін',
          '<strong>Без «кольорових» функцій</strong>: не потрібно розмічати async/await',
          '<strong>Єдиний стандарт</strong>: один інтерфейс планувальника в рушії для всіх розширень',
          '<strong>Зворотна сумісність</strong>: наявний код продовжує працювати',
        ],
      },
      workP: 'Типовий PHP-застосунок (Laravel, Symfony, WordPress) проводить <strong>70–90% часу в очікуванні I/O</strong>. З корутинами цей час простою використовується ефективно:',
      workCols: { s: 'Сценарій', wo: 'Без корутин', w: 'З корутинами' },
      workRows: [
        { s: '3 запити до БД по 20 мс', wo: '60 мс', w: '~22 мс' },
        { s: 'HTTP + БД + файл', wo: 'послідовно', w: 'паралельно' },
        { s: '10 викликів API', wo: '10 × затримка', w: '~1 × затримка' },
      ],
      scLabel: 'Практичні сценарії',
      scenarios: [
        'Веб-сервери · FrankenPHP, RoadRunner',
        'API Gateway · паралельна агрегація',
        'Фонові задачі · конкурентні черги',
        'Реальний час · WebSockets, стримінг',
      ],
    },
    prev: {
      eyebrow: 'Історія',
      title: 'Ранні RFC',
      p: 'Ці два RFC описували повну модель конкурентності прямо в ядрі. Новий підхід спирається на їхні ідеї, але виносить користувацький API за межі ядра, залишаючи в рушії лише точку підключення планувальника.',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['Автор: Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: 'RFC, що визначає модель конкурентності для PHP. Описує корутини, функції <code>spawn()</code> / <code>await()</code> / <code>suspend()</code>, обʼєкт Coroutine, інтерфейси Awaitable і Completable, кооперативне скасування, інтеграцію з Fiber, обробку помилок та graceful shutdown.',
        listLabel: 'Ключові принципи',
        items: [
          'Мінімум змін у наявному коді для ввімкнення конкурентності',
          'Корутини зберігають ілюзію послідовного виконання',
          'Автоматичне перемикання корутин під час I/O-операцій',
          'Кооперативне скасування, «cancellable by design»',
          'Стандартний C API для розширень',
        ],
        link: 'Читати RFC на wiki.php.net', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope і структурна конкурентність',
        meta: ['Автор: Edmond [HT]', 'v1.0'],
        desc: 'Розширення RFC True Async. Вводить клас <code>Scope</code>, що привʼязує час життя корутин до лексичної області видимості. Описує ієрархію scopeʼів, поширення помилок, політику «зомбі»-корутин і критичні секції через <code>protect()</code>.',
        listLabel: 'Що вирішує',
        items: [
          'Запобігання витоку корутин за межі scope',
          'Автоматичне очищення ресурсів при виході зі scope',
          'Ієрархічне скасування: скасування батька скасовує всі дочірні',
          'Захист критичних секцій від скасування',
          'Виявлення дедлоків і self-await',
        ],
        link: 'Читати RFC на wiki.php.net', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: 'Як повʼязані ці RFC',
      p: 'Перший RFC визначає <strong>низькорівневі примітиви</strong>: корутини, базові функції та C API для розширень. Другий RFC додає <strong>структурну конкурентність</strong>: механізми управління групами корутин, які роблять конкурентний код безпечним і передбачуваним.',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: 'Рівень', a: 'Примітиви', b: 'Управління' },
        { label: 'Що дає', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: 'Аналогії', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: 'Мета', a: 'Запуск конкурентного коду', b: 'Безпечне управління життєвим циклом' },
      ],
    },
    discuss: {
      title: 'Участь в обговоренні',
      p: 'RFC обговорюються в розсилці <code>internals@lists.php.net</code> та на GitHub Discussions. Також приєднуйтесь до обговорення в Discord.',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
  zh: {
    quote: { text: 'The most dangerous phrase in the language is "We\'ve always done it this way."', author: '— Grace Hopper' },
    intro: {
      title: 'TrueAsync 的 RFC 流程',
      p: 'TrueAsync 正在推动通过 RFC 流程改变 PHP 内核的可能性。',
    },
    mainRfc: {
      eyebrow: '主要 RFC', tag: '新 RFC', accent: PURPLE, status: 'Draft',
      title: 'Async Scheduler Hook API',
      meta: ['作者：Edmond [HT]', 'v0.1', 'PHP 8.x'],
      desc: '一种在 PHP 内核层面激活并发执行的机制。内核暴露专用钩子，使调度器实现可以放在独立的扩展中，甚至放在 PHP 代码里。',
      listLabel: '核心原则',
      items: [
        '<strong>严格的 opt-in</strong>：在注册调度器之前没有任何开销',
        '<strong>兼容 Fiber</strong>：现有的 Fiber 代码继续工作，纤程会被调度器接管',
        '<strong>Continuation</strong>：构建在 Fiber 机制之上的对称 A→B 上下文切换',
        '<strong>单一注册点</strong>：<code>SchedulerHook::register()</code> 在整个引擎范围内启用并发',
        '<strong>按协程的上下文隔离</strong>：用户上下文与内部上下文分离',
        '<strong>生态系统的自由</strong>：内核只标准化激活和调度器接口，而 <code>spawn()</code> / <code>await()</code> / 通道则由实现决定',
      ],
      link: '在 GitHub 上阅读 RFC', url: RFC_URL,
    },
    motivation: {
      eyebrow: '动机',
      title: '为什么 PHP 需要内置异步',
      p: 'PHP 是最后几个仍然缺乏<strong>语言层面</strong>并发执行内置支持的主要语言之一。Python 有 asyncio，JavaScript 建立在事件循环之上，Go 有 goroutine，Kotlin 有协程。PHP 仍停留在「一个请求，一个进程」的范式中，尽管大多数实际应用把大部分时间都花在等待 I/O 上。',
      bad: {
        title: '碎片化问题',
        p: '如今 PHP 的异步存在于各个扩展中：Swoole、AMPHP、ReactPHP，每一个都有自己的生态系统和互不兼容的 API。',
        items: [
          '每个扩展都要重写自己的 MySQL / PostgreSQL / Redis 驱动',
          '为 Swoole 编写的库无法在 AMPHP 上工作，反之亦然',
          '无法让内核函数（file_get_contents、curl_exec）变为非阻塞',
          '很高的入门门槛：需要学习一整套独立的生态系统',
        ],
      },
      good: {
        title: '解决方案：引擎钩子',
        p: 'TrueAsync 在 PHP 引擎层面为并发添加了一个标准接缝。',
        items: [
          '<strong>透明性</strong>：同步代码无需修改即可在协程中运行',
          '<strong>没有函数着色</strong>：无需 async/await 标记',
          '<strong>统一标准</strong>：引擎中为所有扩展提供单一的调度器接口',
          '<strong>向后兼容</strong>：现有代码继续工作',
        ],
      },
      workP: '一个典型的 PHP 应用（Laravel、Symfony、WordPress）把 <strong>70–90% 的时间花在等待 I/O 上</strong>。使用协程后，这段空闲时间被高效利用：',
      workCols: { s: '场景', wo: '不用协程', w: '使用协程' },
      workRows: [
        { s: '3 个各 20ms 的数据库查询', wo: '60ms', w: '~22ms' },
        { s: 'HTTP + 数据库 + 文件', wo: '串行', w: '并行' },
        { s: '10 次 API 调用', wo: '10 × 延迟', w: '~1 × 延迟' },
      ],
      scLabel: '实际场景',
      scenarios: [
        'Web 服务器 · FrankenPHP、RoadRunner',
        'API Gateway · 并行聚合',
        '后台任务 · 并发队列',
        '实时 · WebSockets、流式传输',
      ],
    },
    prev: {
      eyebrow: '历史',
      title: '早期的 RFC',
      p: '这两个 RFC 描述了一个直接内置于内核的完整并发模型。新方法建立在它们的思想之上，但将面向用户的 API 移出内核，只在引擎中保留调度器的挂载点。',
    },
    cards: [
      {
        tag: 'RFC #1', accent: PURPLE, status: 'Draft', title: 'PHP True Async',
        meta: ['作者：Edmond [HT]', 'v1.7', 'PHP 8.6+'],
        desc: '定义 PHP 并发模型的 RFC。描述了协程，<code>spawn()</code> / <code>await()</code> / <code>suspend()</code> 函数，Coroutine 对象，Awaitable 和 Completable 接口，协作式取消，Fiber 集成，错误处理和 graceful shutdown。',
        listLabel: '核心原则',
        items: [
          '对现有代码进行最小改动即可启用并发',
          '协程保持顺序执行的错觉',
          '在 I/O 操作时自动切换协程',
          '协作式取消，「cancellable by design」',
          '为扩展提供标准的 C API',
        ],
        link: '在 wiki.php.net 上阅读 RFC', url: 'https://wiki.php.net/rfc/true_async',
      },
      {
        tag: 'RFC #2', accent: TEAL, status: 'Draft', title: 'Scope 与结构化并发',
        meta: ['作者：Edmond [HT]', 'v1.0'],
        desc: 'True Async RFC 的扩展。引入 <code>Scope</code> 类，将协程的生命周期绑定到词法作用域。描述了作用域层次结构、错误传播、「僵尸」协程策略以及通过 <code>protect()</code> 实现的临界区。',
        listLabel: '它解决什么',
        items: [
          '防止协程泄漏到作用域之外',
          '退出作用域时自动清理资源',
          '层次化取消：取消父级会取消所有子级',
          '保护临界区免受取消',
          '检测死锁和 self-await',
        ],
        link: '在 wiki.php.net 上阅读 RFC', url: 'https://wiki.php.net/rfc/true_async_scope',
      },
    ],
    relate: {
      title: '这些 RFC 如何关联',
      p: '第一个 RFC 定义<strong>底层原语</strong>：协程、基础函数以及供扩展使用的 C API。第二个 RFC 增加<strong>结构化并发</strong>：管理协程组的机制，使并发代码安全且可预测。',
      colA: 'RFC #1: True Async', colB: 'RFC #2: Scope',
      rows: [
        { label: '层级', a: '原语', b: '管理' },
        { label: '提供', a: 'spawn(), await(), Coroutine', b: 'Scope, TaskGroup, protect()' },
        { label: '类比', a: 'Go goroutines, Kotlin coroutines', b: 'Kotlin CoroutineScope, Python TaskGroup' },
        { label: '目标', a: '运行并发代码', b: '安全的生命周期管理' },
      ],
    },
    discuss: {
      title: '加入讨论',
      p: 'RFC 在 <code>internals@lists.php.net</code> 邮件列表和 GitHub Discussions 上讨论。也欢迎加入 Discord 上的对话。',
      github: { title: 'GitHub Discussions', sub: 'true-async/true-async', url: 'https://github.com/true-async/true-async/discussions' },
      discord: { title: 'Discord', sub: 'discord.gg/yqBQPBHKp5', url: 'https://discord.gg/yqBQPBHKp5' },
    },
  },
}

const t = computed(() => rfcI18n[currentLang.value] || rfcI18n.en)
</script>

<template>
  <div class="rfc">
    <!-- HERO QUOTE -->
    <section class="rfc-quote">
      <blockquote>{{ t.quote.text }}</blockquote>
      <figcaption>{{ t.quote.author }}</figcaption>
    </section>

    <!-- INTRO -->
    <section class="rfc-band rfc-band--intro">
      <h2 class="rfc-h2">{{ t.intro.title }}</h2>
      <p class="rfc-lead">{{ t.intro.p }}</p>
    </section>

    <!-- MAIN RFC (central) -->
    <section class="rfc-band">
      <div class="rfc-eyebrow">{{ t.mainRfc.eyebrow }}</div>
      <article class="rfc-card rfc-main">
        <div class="rfc-card-badges">
          <span class="rfc-tag" :style="{ color: t.mainRfc.accent, background: t.mainRfc.accent + '24' }">{{ t.mainRfc.tag }}</span>
          <span class="rfc-status">{{ t.mainRfc.status }}</span>
        </div>
        <h3 class="rfc-main-title">{{ t.mainRfc.title }}</h3>
        <div class="rfc-meta">
          <span v-for="(m, mi) in t.mainRfc.meta" :key="mi">{{ m }}</span>
        </div>
        <p class="rfc-card-desc rfc-main-desc" v-html="t.mainRfc.desc"></p>
        <div class="rfc-list-label">{{ t.mainRfc.listLabel }}</div>
        <ul class="rfc-checks rfc-main-checks">
          <li v-for="(it, ii) in t.mainRfc.items" :key="ii">
            <svg viewBox="0 0 24 24" fill="none" :stroke="t.mainRfc.accent" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 9-10"/></svg>
            <span v-html="it"></span>
          </li>
        </ul>
        <a :href="t.mainRfc.url" target="_blank" rel="noopener" class="rfc-link" :style="{ color: t.mainRfc.accent }">
          {{ t.mainRfc.link }}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </article>
    </section>

    <!-- MOTIVATION -->
    <section class="rfc-band rfc-band--top">
      <div class="rfc-eyebrow">{{ t.motivation.eyebrow }}</div>
      <h2 class="rfc-h3">{{ t.motivation.title }}</h2>
      <p class="rfc-lead rfc-lead--sm" v-html="t.motivation.p"></p>

      <div class="rfc-two">
        <div class="rfc-card rfc-card--flat">
          <h4 class="rfc-mini-title">{{ t.motivation.bad.title }}</h4>
          <p class="rfc-mini-p">{{ t.motivation.bad.p }}</p>
          <ul class="rfc-checks rfc-checks--x">
            <li v-for="(it, i) in t.motivation.bad.items" :key="i">
              <svg viewBox="0 0 24 24" fill="none" stroke="#E7B276" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              <span>{{ it }}</span>
            </li>
          </ul>
        </div>
        <div class="rfc-card rfc-card--flat">
          <h4 class="rfc-mini-title">{{ t.motivation.good.title }}</h4>
          <p class="rfc-mini-p">{{ t.motivation.good.p }}</p>
          <ul class="rfc-checks">
            <li v-for="(it, i) in t.motivation.good.items" :key="i">
              <svg viewBox="0 0 24 24" fill="none" stroke="#5AD1B0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 9-10"/></svg>
              <span v-html="it"></span>
            </li>
          </ul>
        </div>
      </div>

      <p class="rfc-lead rfc-lead--sm rfc-workp" v-html="t.motivation.workP"></p>
      <div class="rfc-table">
        <div class="rfc-table-head rfc-table-head--work">
          <div class="rfc-th rfc-th--plain">{{ t.motivation.workCols.s }}</div>
          <div class="rfc-th rfc-th--muted">{{ t.motivation.workCols.wo }}</div>
          <div class="rfc-th" :style="{ color: '#8B7BFF' }">{{ t.motivation.workCols.w }}</div>
        </div>
        <div v-for="(row, ri) in t.motivation.workRows" :key="ri" class="rfc-table-row rfc-table-row--work" :class="{ 'is-alt': ri % 2 }">
          <div class="rfc-td">{{ row.s }}</div>
          <div class="rfc-td rfc-td--mono rfc-td--muted">{{ row.wo }}</div>
          <div class="rfc-td rfc-td--mono rfc-td--teal">{{ row.w }}</div>
        </div>
      </div>

      <div class="rfc-eyebrow rfc-eyebrow--sm">{{ t.motivation.scLabel }}</div>
      <div class="rfc-chips">
        <span v-for="(s, i) in t.motivation.scenarios" :key="i" class="rfc-chip">{{ s }}</span>
      </div>
    </section>

    <!-- EARLIER RFCS -->
    <section class="rfc-band rfc-band--top">
      <div class="rfc-eyebrow">{{ t.prev.eyebrow }}</div>
      <h2 class="rfc-h3">{{ t.prev.title }}</h2>
      <p class="rfc-lead rfc-lead--sm" v-html="t.prev.p"></p>

      <div class="rfc-cards">
        <article v-for="(c, i) in t.cards" :key="i" class="rfc-card">
          <div class="rfc-card-badges">
            <span class="rfc-tag" :style="{ color: c.accent, background: c.accent + '24' }">{{ c.tag }}</span>
            <span class="rfc-status">{{ c.status }}</span>
          </div>
          <h3 class="rfc-card-title">{{ c.title }}</h3>
          <div class="rfc-meta">
            <span v-for="(m, mi) in c.meta" :key="mi">{{ m }}</span>
          </div>
          <p class="rfc-card-desc" v-html="c.desc"></p>
          <div class="rfc-list-label">{{ c.listLabel }}</div>
          <ul class="rfc-checks">
            <li v-for="(it, ii) in c.items" :key="ii">
              <svg viewBox="0 0 24 24" fill="none" :stroke="c.accent" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 9-10"/></svg>
              <span>{{ it }}</span>
            </li>
          </ul>
          <a :href="c.url" target="_blank" rel="noopener" class="rfc-link" :style="{ color: c.accent }">
            {{ c.link }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </article>
      </div>

      <h3 class="rfc-h3 rfc-relate-title">{{ t.relate.title }}</h3>
      <p class="rfc-lead rfc-lead--sm" v-html="t.relate.p"></p>
      <div class="rfc-table">
        <div class="rfc-table-head">
          <div></div>
          <div class="rfc-th" :style="{ color: '#8B7BFF' }">{{ t.relate.colA }}</div>
          <div class="rfc-th" :style="{ color: '#5AD1B0' }">{{ t.relate.colB }}</div>
        </div>
        <div v-for="(row, ri) in t.relate.rows" :key="ri" class="rfc-table-row" :class="{ 'is-alt': ri % 2 }">
          <div class="rfc-td rfc-td--label">{{ row.label }}</div>
          <div class="rfc-td" v-html="row.a"></div>
          <div class="rfc-td" v-html="row.b"></div>
        </div>
      </div>
    </section>

    <!-- DISCUSSION -->
    <section class="rfc-band rfc-band--last">
      <h2 class="rfc-h3">{{ t.discuss.title }}</h2>
      <p class="rfc-lead rfc-lead--sm" v-html="t.discuss.p"></p>
      <div class="rfc-two">
        <a :href="t.discuss.github.url" target="_blank" rel="noopener" class="rfc-social">
          <div class="rfc-social-ic">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.3-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.05 10.05 0 0 0 22 12.3C22 6.6 17.5 2 12 2Z"/></svg>
          </div>
          <div>
            <div class="rfc-social-title">{{ t.discuss.github.title }}</div>
            <div class="rfc-social-sub">{{ t.discuss.github.sub }}</div>
          </div>
        </a>
        <a :href="t.discuss.discord.url" target="_blank" rel="noopener" class="rfc-social">
          <div class="rfc-social-ic">
            <svg viewBox="0 0 24 24" fill="#8B7BFF"><path d="M19.27 5.33A16.6 16.6 0 0 0 15.05 4l-.2.4a15.4 15.4 0 0 1 3.72 1.15 15.2 15.2 0 0 0-12.94 0A15.4 15.4 0 0 1 9.35 4.4L9.15 4a16.6 16.6 0 0 0-4.22 1.33A17.5 17.5 0 0 0 2 17.9a16.8 16.8 0 0 0 5.07 2.57 12.4 12.4 0 0 0 1.09-1.77 10.8 10.8 0 0 1-1.7-.82l.42-.31a11.9 11.9 0 0 0 10.24 0l.42.31a10.8 10.8 0 0 1-1.71.82 12.4 12.4 0 0 0 1.09 1.77A16.8 16.8 0 0 0 22 17.9a17.5 17.5 0 0 0-2.73-12.57ZM8.89 15.55c-1 0-1.82-.92-1.82-2.05s.8-2.06 1.82-2.06 1.84.93 1.82 2.06c0 1.13-.8 2.05-1.82 2.05Zm6.22 0c-1 0-1.82-.92-1.82-2.05s.8-2.06 1.82-2.06 1.84.93 1.82 2.06c0 1.13-.8 2.05-1.82 2.05Z"/></svg>
          </div>
          <div>
            <div class="rfc-social-title">{{ t.discuss.discord.title }}</div>
            <div class="rfc-social-sub">{{ t.discuss.discord.sub }}</div>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rfc { padding-top: var(--navbar-h); }
.rfc-band { max-width: 900px; margin: 0 auto; padding: 52px 32px 0; }
.rfc-band--top { border-top: 1px solid var(--color-border); margin-top: 60px; padding-top: 64px; }
.rfc-band--last { padding-bottom: 90px; }
.rfc-band--intro { padding-top: 52px; }

/* hero quote */
.rfc-quote { max-width: 760px; margin: 0 auto; padding: 60px 32px 0; text-align: center; }
.rfc-quote blockquote { margin: 0 auto; max-width: 700px; font-size: 27px; line-height: 1.34; font-weight: 500; letter-spacing: -0.015em; color: var(--color-text); }
.rfc-quote figcaption { font-family: var(--font-mono); font-size: 13px; color: var(--nav-accent); margin-top: 18px; }

.rfc-h2 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 14px; }
.rfc-h3 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 14px; }
.rfc-lead { font-size: 16.5px; line-height: 1.65; color: var(--color-text-secondary); max-width: 66ch; margin: 0; }
.rfc-lead--sm { font-size: 16px; margin-bottom: 26px; }
.rfc-lead :deep(strong), .rfc-mini-p :deep(strong) { color: var(--color-text); font-weight: 600; }
.rfc-lead :deep(code), .rfc-mini-p :deep(code) { font-family: var(--font-mono); font-size: 0.9em; color: var(--nav-accent); background: none; }

.rfc-eyebrow { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--nav-accent); margin-bottom: 12px; }
.rfc-eyebrow--sm { font-size: 11px; letter-spacing: 0.1em; color: var(--color-text-muted); margin: 26px 0 12px; }

/* cards */
.rfc-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.rfc-card { background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 16px; padding: 28px 26px; display: flex; flex-direction: column; }
.rfc-card--flat { padding: 26px 24px; }
.rfc-card-badges { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.rfc-tag { font-family: var(--font-mono); font-size: 12px; font-weight: 600; border-radius: 20px; padding: 4px 11px; }
.rfc-status { font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted); border: 1px solid var(--color-border); border-radius: 20px; padding: 3px 10px; }
.rfc-card-title { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
.rfc-meta { display: flex; flex-wrap: wrap; gap: 14px; font-family: var(--font-mono); font-size: 12.5px; color: var(--color-text-muted); margin-bottom: 18px; }
.rfc-card-desc { font-size: 14.5px; line-height: 1.6; color: var(--color-text-secondary); margin: 0 0 18px; }
.rfc-card-desc :deep(code) { font-family: var(--font-mono); font-size: 0.9em; color: var(--nav-accent); background: none; }
.rfc-list-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 11px; }
.rfc-checks { list-style: none; padding: 0; margin: 0 0 22px; display: flex; flex-direction: column; gap: 9px; }
.rfc-checks li { display: flex; gap: 9px; align-items: flex-start; font-size: 13.5px; line-height: 1.45; color: var(--color-text-secondary); }
.rfc-checks svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 3px; }
.rfc-checks :deep(strong) { color: var(--color-text); font-weight: 600; }
.rfc-checks :deep(code) { font-family: var(--font-mono); font-size: 0.9em; color: var(--nav-accent); background: none; }
.rfc-link { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin-top: auto; }
.rfc-link svg { width: 15px; height: 15px; transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.2, 1); }
.rfc-link:hover svg { transform: translateX(4px); }

/* main (central) RFC */
.rfc-main { padding: 34px 34px; border-color: color-mix(in srgb, #8B7BFF 40%, var(--color-border)); box-shadow: 0 1px 0 color-mix(in srgb, #8B7BFF 22%, transparent), 0 18px 50px -30px color-mix(in srgb, #8B7BFF 55%, transparent); }
.rfc-main-title { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; }
.rfc-main-desc { font-size: 15.5px; }
.rfc-main-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; }

/* comparison table */
.rfc-table { border: 1px solid var(--color-border); border-radius: 14px; overflow: hidden; margin-top: 4px; }
.rfc-table-head { display: grid; grid-template-columns: 1fr 1.4fr 1.4fr; background: var(--nav-dropdown-active); border-bottom: 1px solid var(--color-border); }
.rfc-table-head--work { grid-template-columns: 1.6fr 1fr 1fr; }
.rfc-th { padding: 14px 18px; font-weight: 600; font-size: 14px; border-left: 1px solid var(--color-border); }
.rfc-th--plain { color: var(--color-text); border-left: none; }
.rfc-th--muted { color: var(--color-text-muted); font-size: 13px; }
.rfc-table-head > div:first-child { padding: 14px 18px; }
.rfc-table-row { display: grid; grid-template-columns: 1fr 1.4fr 1.4fr; border-bottom: 1px solid var(--color-border); }
.rfc-table-row--work { grid-template-columns: 1.6fr 1fr 1fr; }
.rfc-table-row:last-child { border-bottom: none; }
.rfc-table-row.is-alt { background: color-mix(in srgb, var(--color-text) 3%, transparent); }
.rfc-td { padding: 14px 18px; font-size: 13.5px; color: var(--color-text-secondary); border-left: 1px solid var(--color-border); }
.rfc-td:first-child { border-left: none; }
.rfc-td--label { font-weight: 600; color: var(--color-text); }
.rfc-td--mono { font-family: var(--font-mono); }
.rfc-td--muted { color: var(--color-text-muted); }
.rfc-td--teal { color: #5AD1B0; }

.rfc-relate-title { margin-top: 44px; }

/* two-column card rows */
.rfc-two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 26px; }
.rfc-mini-title { font-size: 17px; font-weight: 600; margin: 0 0 6px; }
.rfc-mini-p { font-size: 13.5px; line-height: 1.55; color: var(--color-text-muted); margin: 0 0 16px; }
.rfc-workp { margin-top: 26px; }

/* scenario chips */
.rfc-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.rfc-chip { font-size: 13.5px; color: var(--color-text-secondary); background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 100px; padding: 7px 15px; }

/* social cards */
.rfc-social { display: flex; align-items: center; gap: 14px; background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 14px; padding: 20px 22px; transition: border-color 0.25s ease, background 0.25s ease, transform 0.3s ease; }
.rfc-social:hover { border-color: var(--nav-primary); background: var(--nav-panel-hover); transform: translateY(-2px); }
.rfc-social-ic { width: 42px; height: 42px; flex-shrink: 0; border-radius: 11px; background: var(--nav-icon-bg); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; color: var(--color-text); }
.rfc-social-ic svg { width: 21px; height: 21px; }
.rfc-social-title { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
.rfc-social-sub { font-size: 13px; color: var(--color-text-muted); font-family: var(--font-mono); }

@media (max-width: 780px) {
  .rfc-cards, .rfc-two, .rfc-main-checks { grid-template-columns: 1fr; }
  .rfc-quote blockquote { font-size: 22px; }
  .rfc-table-head, .rfc-table-row { grid-template-columns: 0.9fr 1fr 1fr; }
  .rfc-th, .rfc-td { padding: 12px 12px; font-size: 12.5px; }
  .rfc-band, .rfc-quote { padding-left: 20px; padding-right: 20px; }
  .rfc-main { padding: 26px 22px; }
  .rfc-main-title { font-size: 22px; }
}
</style>
