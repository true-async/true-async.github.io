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
