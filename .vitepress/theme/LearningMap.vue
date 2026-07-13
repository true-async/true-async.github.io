<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const currentLang = computed(() => {
  const m = route.path.match(/^\/(en|ru|de|es|fr|it|uk|zh|ko)\//)
  return m ? m[1] : 'en'
})

// --- i18n data ---

interface LmI18n {
  hint: string
  hintMobile: string
  openDoc: string
  stepFormat: (n: number) => string
  groups: Record<string, string>
  nodes: Record<string, { title: string; desc: string; comment?: string }>
}

const i18n: Record<string, LmI18n> = {
  en: {
    hint: 'Hover over a node for details. Click to go to the documentation.',
    hintMobile: 'Tap a node for details.',
    openDoc: 'Open documentation →',
    stepFormat: (n) => `Step ${n} of 6`,
    groups: {
      primitives: 'Basic Primitives', sync: 'Synchronization', cancellation: 'Cancellation',
      structural: 'Str. Concurrency', context: 'Context', iterate: 'iterate()', resources: 'Resources & Pools',
      threads: 'Threads',
    },
    nodes: {
      coroutines: { title: 'Coroutines', desc: 'Basic unit of asynchrony — launching concurrent tasks' },
      future: { title: 'Future', desc: 'Get the result of an asynchronous operation' },
      'await-funcs': { title: 'await, await_all', desc: 'Waiting for one or more coroutines or Futures' },
      channels: { title: 'Channels', desc: 'Pass data between coroutines' },
      cancellation: { title: 'Cancellation', desc: 'Cancel coroutines', comment: '// or with timeout:' },
      scope: { title: 'Scope', desc: 'Control the lifetime of a group of coroutines' },
      taskgroup: { title: 'TaskGroup', desc: 'Structured concurrency: group tasks with guaranteed await or cancellation' },
      taskset: { title: 'TaskSet', desc: 'Dynamic task set with auto-cleanup after result delivery' },
      context: { title: 'Context', desc: 'Store data bound to a coroutine (e.g. auth token)' },
      iterate: { title: 'iterate()', desc: 'Concurrent collection processing' },
      pool: { title: 'Async\\Pool', desc: 'Reuse expensive resources (connections, workers)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'PDO database connection pool. Use familiar functions transparently' },
      thread: { title: 'Thread', desc: 'Run CPU-bound code in a parallel OS thread with its own isolated PHP runtime' },
      'thread-pool': { title: 'ThreadPool', desc: 'Fixed pool of reusable worker threads. Submit tasks and get Futures back' },
    },
  },
  ru: {
    hint: 'Наведите на узел для подробностей. Нажмите для перехода к документации.',
    hintMobile: 'Нажмите на узел для подробностей.',
    openDoc: 'Открыть документацию →',
    stepFormat: (n) => `Шаг ${n} из 6`,
    groups: {
      primitives: 'Базовые примитивы', sync: 'Синхронизация', cancellation: 'Cancellation',
      structural: 'Стр. конкурентность', context: 'Context', iterate: 'iterate()', resources: 'Ресурсы и пулы',
      threads: 'Потоки',
    },
    nodes: {
      coroutines: { title: 'Корутины', desc: 'Базовая единица асинхронности — запуск параллельных задач' },
      future: { title: 'Future', desc: 'Получить результат асинхронной операции' },
      'await-funcs': { title: 'await, await_all', desc: 'Ожидание одной или нескольких корутин или Futures' },
      channels: { title: 'Каналы', desc: 'Передавать данные между корутинами' },
      cancellation: { title: 'Cancellation', desc: 'Отменять корутины', comment: '// или с таймаутом:' },
      scope: { title: 'Scope', desc: 'Контролировать время жизни группы корутин' },
      taskgroup: { title: 'TaskGroup', desc: 'Structured concurrency: группировка задач с гарантией ожидания или отмены' },
      taskset: { title: 'TaskSet', desc: 'Динамический набор задач с автоочисткой результатов после доставки' },
      context: { title: 'Context', desc: 'Хранить данные привязанные к корутине (напр. токен авторизации)' },
      iterate: { title: 'iterate()', desc: 'Конкурентная обработка коллекций' },
      pool: { title: 'Async\\Pool', desc: 'Переиспользовать дорогие ресурсы (соединения, воркеры)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'PDO Пул соединений с базой данных. Используй привычные функции прозрачно' },
      thread: { title: 'Thread', desc: 'CPU-нагрузка в параллельном OS-потоке с изолированным PHP-окружением' },
      'thread-pool': { title: 'ThreadPool', desc: 'Фиксированный пул воркер-потоков. Отправляй задачи и получай Future' },
    },
  },
  de: {
    hint: 'Fahren Sie mit der Maus über einen Knoten, um Details zu sehen. Klicken Sie, um zur Dokumentation zu gelangen.',
    hintMobile: 'Tippen Sie auf einen Knoten für Details.',
    openDoc: 'Dokumentation öffnen →',
    stepFormat: (n) => `Schritt ${n} von 6`,
    groups: {
      primitives: 'Grundlegende Primitive', sync: 'Synchronisation', cancellation: 'Abbruch',
      structural: 'Str. Nebenläufigkeit', context: 'Kontext', iterate: 'iterate()', resources: 'Ressourcen & Pools',
      threads: 'Threads',
    },
    nodes: {
      coroutines: { title: 'Koroutinen', desc: 'Grundeinheit der Asynchronität — nebenläufige Aufgaben starten' },
      future: { title: 'Future', desc: 'Ergebnis einer asynchronen Operation abrufen' },
      'await-funcs': { title: 'await, await_all', desc: 'Warten auf eine oder mehrere Koroutinen oder Futures' },
      channels: { title: 'Channels', desc: 'Daten zwischen Koroutinen austauschen' },
      cancellation: { title: 'Abbruch', desc: 'Koroutinen abbrechen', comment: '// oder mit Timeout:' },
      scope: { title: 'Scope', desc: 'Lebensdauer einer Gruppe von Koroutinen steuern' },
      taskgroup: { title: 'TaskGroup', desc: 'Strukturierte Nebenläufigkeit: Aufgaben gruppieren mit garantiertem Await oder Abbruch' },
      taskset: { title: 'TaskSet', desc: 'Dynamisches Aufgabenset mit Auto-Bereinigung nach Zustellung' },
      context: { title: 'Kontext', desc: 'Daten an eine Koroutine binden (z.B. Auth-Token)' },
      iterate: { title: 'iterate()', desc: 'Nebenläufige Sammlungsverarbeitung' },
      pool: { title: 'Async\\Pool', desc: 'Teure Ressourcen wiederverwenden (Verbindungen, Worker)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'PDO-Datenbankverbindungspool. Vertraute Funktionen transparent nutzen' },
      thread: { title: 'Thread', desc: 'CPU-intensive Aufgaben in einem parallelen OS-Thread mit isolierter PHP-Laufzeit' },
      'thread-pool': { title: 'ThreadPool', desc: 'Fester Pool wiederverwendbarer Worker-Threads. Aufgaben einreichen und Futures erhalten' },
    },
  },
  es: {
    hint: 'Pase el cursor sobre un nodo para ver los detalles. Haga clic para ir a la documentación.',
    hintMobile: 'Toque un nodo para ver los detalles.',
    openDoc: 'Abrir documentación →',
    stepFormat: (n) => `Paso ${n} de 6`,
    groups: {
      primitives: 'Primitivas básicas', sync: 'Sincronización', cancellation: 'Cancelación',
      structural: 'Conc. estructurada', context: 'Contexto', iterate: 'iterate()', resources: 'Recursos y pools',
      threads: 'Hilos',
    },
    nodes: {
      coroutines: { title: 'Corrutinas', desc: 'Unidad básica de asincronía — lanzar tareas concurrentes' },
      future: { title: 'Future', desc: 'Obtener el resultado de una operación asíncrona' },
      'await-funcs': { title: 'await, await_all', desc: 'Esperar una o más corrutinas o Futures' },
      channels: { title: 'Canales', desc: 'Pasar datos entre corrutinas' },
      cancellation: { title: 'Cancelación', desc: 'Cancelar corrutinas', comment: '// o con tiempo límite:' },
      scope: { title: 'Scope', desc: 'Controlar el ciclo de vida de un grupo de corrutinas' },
      taskgroup: { title: 'TaskGroup', desc: 'Concurrencia estructurada: agrupar tareas con espera o cancelación garantizada' },
      taskset: { title: 'TaskSet', desc: 'Conjunto dinámico de tareas con limpieza automática tras la entrega' },
      context: { title: 'Contexto', desc: 'Almacenar datos vinculados a una corrutina (p. ej. token de autenticación)' },
      iterate: { title: 'iterate()', desc: 'Procesamiento concurrente de colecciones' },
      pool: { title: 'Async\\Pool', desc: 'Reutilizar recursos costosos (conexiones, workers)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'Pool de conexiones PDO a bases de datos. Use funciones familiares de forma transparente' },
      thread: { title: 'Thread', desc: 'Código CPU-intensivo en un hilo OS paralelo con entorno PHP aislado' },
      'thread-pool': { title: 'ThreadPool', desc: 'Pool fijo de hilos worker reutilizables. Envía tareas y recibe Futures' },
    },
  },
  fr: {
    hint: 'Survolez un nœud pour plus de détails. Cliquez pour accéder à la documentation.',
    hintMobile: 'Appuyez sur un nœud pour plus de détails.',
    openDoc: 'Ouvrir la documentation →',
    stepFormat: (n) => `Étape ${n} sur 6`,
    groups: {
      primitives: 'Primitives de base', sync: 'Synchronisation', cancellation: 'Annulation',
      structural: 'Conc. structurée', context: 'Contexte', iterate: 'iterate()', resources: 'Ressources et pools',
      threads: 'Threads',
    },
    nodes: {
      coroutines: { title: 'Coroutines', desc: "Unité de base de l'asynchronie — lancer des tâches concurrentes" },
      future: { title: 'Future', desc: "Obtenir le résultat d'une opération asynchrone" },
      'await-funcs': { title: 'await, await_all', desc: 'Attendre une ou plusieurs coroutines ou Futures' },
      channels: { title: 'Canaux', desc: 'Transmettre des données entre coroutines' },
      cancellation: { title: 'Annulation', desc: 'Annuler des coroutines', comment: '// ou avec un délai :' },
      scope: { title: 'Scope', desc: "Contrôler la durée de vie d'un groupe de coroutines" },
      taskgroup: { title: 'TaskGroup', desc: 'Concurrence structurée : regrouper des tâches avec attente ou annulation garantie' },
      taskset: { title: 'TaskSet', desc: 'Ensemble dynamique de tâches avec nettoyage automatique après livraison' },
      context: { title: 'Contexte', desc: "Stocker des données liées à une coroutine (ex. jeton d'authentification)" },
      iterate: { title: 'iterate()', desc: 'Traitement concurrent de collections' },
      pool: { title: 'Async\\Pool', desc: 'Réutiliser des ressources coûteuses (connexions, workers)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'Pool de connexions PDO. Utilisez les fonctions habituelles de manière transparente' },
      thread: { title: 'Thread', desc: 'Code CPU-intensif dans un thread OS parallèle avec environnement PHP isolé' },
      'thread-pool': { title: 'ThreadPool', desc: 'Pool fixe de threads workers réutilisables. Soumettez des tâches et obtenez des Futures' },
    },
  },
  it: {
    hint: 'Passa il mouse su un nodo per i dettagli. Clicca per andare alla documentazione.',
    hintMobile: 'Tocca un nodo per i dettagli.',
    openDoc: 'Apri documentazione →',
    stepFormat: (n) => `Passo ${n} di 6`,
    groups: {
      primitives: 'Primitive di base', sync: 'Sincronizzazione', cancellation: 'Cancellazione',
      structural: 'Conc. Strutturata', context: 'Context', iterate: 'iterate()', resources: 'Risorse e Pool',
      threads: 'Thread',
    },
    nodes: {
      coroutines: { title: 'Coroutines', desc: "Unita base dell'asincronia -- lancio di task concorrenti" },
      future: { title: 'Future', desc: "Ottenere il risultato di un'operazione asincrona" },
      'await-funcs': { title: 'await, await_all', desc: 'Attendere una o piu coroutine o Future' },
      channels: { title: 'Channels', desc: 'Passare dati tra coroutine' },
      cancellation: { title: 'Cancellation', desc: 'Cancellare le coroutine', comment: '// o con timeout:' },
      scope: { title: 'Scope', desc: 'Controllare il ciclo di vita di un gruppo di coroutine' },
      taskgroup: { title: 'TaskGroup', desc: 'Concorrenza strutturata: raggruppare task con await o cancellazione garantiti' },
      taskset: { title: 'TaskSet', desc: 'Insieme dinamico di task con pulizia automatica dopo la consegna' },
      context: { title: 'Context', desc: 'Memorizzare dati legati a una coroutine (es. token di autenticazione)' },
      iterate: { title: 'iterate()', desc: 'Elaborazione concorrente delle collezioni' },
      pool: { title: 'Async\\Pool', desc: 'Riutilizzare risorse costose (connessioni, worker)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'Pool di connessioni database PDO. Usa le funzioni familiari in modo trasparente' },
      thread: { title: 'Thread', desc: 'Codice CPU-intensivo in un thread OS parallelo con ambiente PHP isolato' },
      'thread-pool': { title: 'ThreadPool', desc: 'Pool fisso di thread worker riutilizzabili. Invia task e ottieni Future' },
    },
  },
  ko: {
    hint: '노드 위에 마우스를 올리면 상세 정보를 볼 수 있습니다. 클릭하면 문서로 이동합니다.',
    hintMobile: '노드를 탭하면 상세 정보를 볼 수 있습니다.',
    openDoc: '문서 열기 →',
    stepFormat: (n) => `${n}단계 / 6단계`,
    groups: {
      primitives: '기본 프리미티브', sync: '동기화', cancellation: '취소',
      structural: '구조적 동시성', context: '컨텍스트', iterate: 'iterate()', resources: '리소스 및 풀',
      threads: '스레드',
    },
    nodes: {
      coroutines: { title: '코루틴', desc: '비동기의 기본 단위 — 동시 작업 실행' },
      future: { title: 'Future', desc: '비동기 작업의 결과 얻기' },
      'await-funcs': { title: 'await, await_all', desc: '하나 이상의 코루틴 또는 Future 대기' },
      channels: { title: '채널', desc: '코루틴 간 데이터 전달' },
      cancellation: { title: '취소', desc: '코루틴 취소', comment: '// 또는 타임아웃과 함께:' },
      scope: { title: 'Scope', desc: '코루틴 그룹의 수명 제어' },
      taskgroup: { title: 'TaskGroup', desc: '구조적 동시성: 보장된 대기 또는 취소로 작업 그룹화' },
      taskset: { title: 'TaskSet', desc: '결과 전달 후 자동 정리되는 동적 태스크 세트' },
      context: { title: '컨텍스트', desc: '코루틴에 바인딩된 데이터 저장 (예: 인증 토큰)' },
      iterate: { title: 'iterate()', desc: '동시 컬렉션 처리' },
      pool: { title: 'Async\\Pool', desc: '비용이 큰 리소스 재사용 (연결, 워커)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'PDO 데이터베이스 연결 풀. 익숙한 함수를 투명하게 사용' },
      thread: { title: 'Thread', desc: '격리된 PHP 런타임을 가진 병렬 OS 스레드에서 CPU 집약적 코드 실행' },
      'thread-pool': { title: 'ThreadPool', desc: '재사용 가능한 워커 스레드 고정 풀. 작업을 제출하고 Future를 받습니다' },
    },
  },
  uk: {
    hint: 'Наведіть курсор на вузол для деталей. Натисніть, щоб перейти до документації.',
    hintMobile: 'Натисніть на вузол для деталей.',
    openDoc: 'Відкрити документацію →',
    stepFormat: (n) => `Крок ${n} з 6`,
    groups: {
      primitives: 'Базові примітиви', sync: 'Синхронізація', cancellation: 'Скасування',
      structural: 'Стр. конкурентність', context: 'Контекст', iterate: 'iterate()', resources: 'Ресурси та пули',
      threads: 'Потоки',
    },
    nodes: {
      coroutines: { title: 'Корутини', desc: 'Базова одиниця асинхронності — запуск паралельних задач' },
      future: { title: 'Future', desc: 'Отримання результату асинхронної операції' },
      'await-funcs': { title: 'await, await_all', desc: 'Очікування однієї або кількох корутин або Future' },
      channels: { title: 'Канали', desc: 'Передача даних між корутинами' },
      cancellation: { title: 'Скасування', desc: 'Скасування корутин', comment: '// або з таймаутом:' },
      scope: { title: 'Scope', desc: 'Контроль часу життя групи корутин' },
      taskgroup: { title: 'TaskGroup', desc: 'Структурна конкурентність: групування задач з гарантованим очікуванням або скасуванням' },
      taskset: { title: 'TaskSet', desc: 'Динамічний набір задач з автоочищенням результатів після доставки' },
      context: { title: 'Контекст', desc: 'Зберігання даних, прив\'язаних до корутини (напр., токен авторизації)' },
      iterate: { title: 'iterate()', desc: 'Конкурентна обробка колекцій' },
      pool: { title: 'Async\\Pool', desc: 'Повторне використання дорогих ресурсів (з\'єднань, воркерів)' },
      'pdo-pool': { title: 'PDO Pool', desc: 'Пул з\'єднань PDO до бази даних. Використовуйте звичні функції прозоро' },
      thread: { title: 'Thread', desc: 'CPU-навантаження у паралельному OS-потоці з ізольованим PHP-середовищем' },
      'thread-pool': { title: 'ThreadPool', desc: 'Фіксований пул воркер-потоків. Надсилай задачі та отримуй Future' },
    },
  },
  zh: {
    hint: '将鼠标悬停在节点上查看详情。点击可跳转到文档。',
    hintMobile: '点击节点查看详情。',
    openDoc: '打开文档 →',
    stepFormat: (n) => `第 ${n} 步，共 6 步`,
    groups: {
      primitives: '基础原语', sync: '同步', cancellation: '取消',
      structural: '结构化并发', context: '上下文', iterate: 'iterate()', resources: '资源与连接池',
      threads: '线程',
    },
    nodes: {
      coroutines: { title: '协程', desc: '异步的基本单元 — 启动并发任务' },
      future: { title: 'Future', desc: '获取异步操作的结果' },
      'await-funcs': { title: 'await, await_all', desc: '等待一个或多个协程或 Future' },
      channels: { title: '通道', desc: '在协程之间传递数据' },
      cancellation: { title: '取消', desc: '取消协程', comment: '// 或带超时：' },
      scope: { title: 'Scope', desc: '控制一组协程的生命周期' },
      taskgroup: { title: 'TaskGroup', desc: '结构化并发：将任务分组，保证等待或取消' },
      taskset: { title: 'TaskSet', desc: '动态任务集，结果交付后自动清理' },
      context: { title: '上下文', desc: '存储绑定到协程的数据（如认证令牌）' },
      iterate: { title: 'iterate()', desc: '并发集合处理' },
      pool: { title: 'Async\\Pool', desc: '复用昂贵的资源（连接、工作进程）' },
      'pdo-pool': { title: 'PDO Pool', desc: 'PDO 数据库连接池。透明地使用熟悉的函数' },
      thread: { title: 'Thread', desc: '在具有独立 PHP 运行环境的并行 OS 线程中运行 CPU 密集型代码' },
      'thread-pool': { title: 'ThreadPool', desc: '固定的可复用工作线程池。提交任务并获取 Future' },
    },
  },
}

const t = computed(() => i18n[currentLang.value] || i18n.en)

// ---------------------------------------------------------------------------
// Structure: a vertical timeline of grouped sections, each holding a wrap of
// node "chips" — the same idiom as the full /roadmap page and the tutorial
// card grid, so this reads as one more view of the same design system rather
// than a bespoke SVG diagram. Colors reuse the site's 4-hue tag palette
// (purple/teal/orange/blue); code snippets reuse the homepage hero's .tok-*
// token classes. No hand-tuned coordinates, no drawn connector lines — the
// "path" is the vertical spine + numbered badges (1-6); related concepts
// still light up together on hover via the adjacency map below.
// ---------------------------------------------------------------------------
const GROUP_ORDER = ['primitives', 'sync', 'cancellation', 'structural', 'context', 'iterate', 'resources', 'threads']
const GROUP_COLOR: Record<string, string> = {
  primitives: 'purple', sync: 'blue', cancellation: 'orange', structural: 'teal',
  context: 'purple', iterate: 'orange', resources: 'teal', threads: 'blue',
}

interface NodeDef {
  id: string
  group: string
  order: number | null
  urlSuffix: string
  codeHtml: string
}

const nodesDef: NodeDef[] = [
  { id: 'coroutines', group: 'primitives', order: 1, urlSuffix: '/docs/components/coroutines.html',
    codeHtml: '<span class="tok-var">$coro</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">function</span>() {\n  <span class="tok-fn">echo</span> <span class="tok-str">"async!"</span>;\n});' },
  { id: 'future', group: 'primitives', order: null, urlSuffix: '/docs/components/future.html',
    codeHtml: '<span class="tok-var">$coro</span> = <span class="tok-fn">spawn</span>(<span class="tok-prop">$task</span>);\n<span class="tok-var">$result</span> = <span class="tok-fn">await</span>(<span class="tok-prop">$coro</span>);' },
  { id: 'await-funcs', group: 'sync', order: 2, urlSuffix: '/docs/reference/await.html',
    codeHtml: '<span class="tok-var">$result</span> = <span class="tok-fn">await</span>(<span class="tok-prop">$coro</span>);\n<span class="tok-var">$results</span> = <span class="tok-fn">await_all</span>(<span class="tok-prop">$tasks</span>);\n<span class="tok-var">$first</span> = <span class="tok-fn">await_first_success</span>(<span class="tok-prop">$tasks</span>);' },
  { id: 'channels', group: 'sync', order: null, urlSuffix: '/docs/components/channels.html',
    codeHtml: '<span class="tok-var">$ch</span> = <span class="tok-kw">new</span> <span class="tok-cls">Async\\Channel</span>(<span class="tok-prop">10</span>);\n<span class="tok-prop">$ch</span>-><span class="tok-fn">send</span>(<span class="tok-str">"data"</span>);\n<span class="tok-var">$val</span> = <span class="tok-prop">$ch</span>-><span class="tok-fn">recv</span>();' },
  { id: 'cancellation', group: 'cancellation', order: 3, urlSuffix: '/docs/components/cancellation.html',
    codeHtml: '' /* comment is dynamic per language, built via getNodeCodeHtml() */ },
  { id: 'scope', group: 'structural', order: 4, urlSuffix: '/docs/components/scope.html',
    codeHtml: '<span class="tok-var">$scope</span> = <span class="tok-kw">new</span> <span class="tok-cls">Async\\Scope</span>();\n<span class="tok-fn">spawn_with</span>(<span class="tok-prop">$scope</span>, <span class="tok-prop">$task</span>);' },
  { id: 'taskgroup', group: 'structural', order: null, urlSuffix: '/docs/components/task-group.html',
    codeHtml: '<span class="tok-var">$group</span> = <span class="tok-kw">new</span> <span class="tok-cls">TaskGroup</span>(<span class="tok-prop">5</span>);\n<span class="tok-prop">$group</span>-><span class="tok-fn">spawn</span>(<span class="tok-prop">$task</span>);\n<span class="tok-var">$results</span> = <span class="tok-prop">$group</span>-><span class="tok-fn">all</span>();' },
  { id: 'taskset', group: 'structural', order: null, urlSuffix: '/docs/components/task-set.html',
    codeHtml: '<span class="tok-var">$set</span> = <span class="tok-kw">new</span> <span class="tok-cls">TaskSet</span>(<span class="tok-prop">10</span>);\n<span class="tok-prop">$set</span>-><span class="tok-fn">spawn</span>(<span class="tok-prop">$task</span>);\n<span class="tok-var">$r</span> = <span class="tok-prop">$set</span>-><span class="tok-fn">joinNext</span>();' },
  { id: 'context', group: 'context', order: 5, urlSuffix: '/docs/components/context.html',
    codeHtml: '<span class="tok-var">$ctx</span> = <span class="tok-fn">current_context</span>();\n<span class="tok-prop">$ctx</span>-><span class="tok-fn">set</span>(<span class="tok-str">\'auth_token\'</span>, <span class="tok-prop">$token</span>);\n<span class="tok-var">$v</span> = <span class="tok-prop">$ctx</span>-><span class="tok-fn">find</span>(<span class="tok-str">\'auth_token\'</span>);' },
  { id: 'iterate', group: 'iterate', order: null, urlSuffix: '/docs/reference/iterate.html',
    codeHtml: '<span class="tok-fn">iterate</span>(<span class="tok-prop">$items</span>, <span class="tok-kw">function</span>(<span class="tok-prop">$v</span>, <span class="tok-prop">$k</span>) {\n  <span class="tok-fn">echo</span> <span class="tok-str">"$k: $v\\n"</span>;\n}, <span class="tok-fn">concurrency</span>: <span class="tok-prop">4</span>);' },
  { id: 'pool', group: 'resources', order: 6, urlSuffix: '/docs/components/pool.html',
    codeHtml: '<span class="tok-var">$pool</span> = <span class="tok-kw">new</span> <span class="tok-cls">Pool</span>(\n  <span class="tok-fn">factory</span>: <span class="tok-kw">fn</span>() => <span class="tok-kw">new</span> <span class="tok-cls">Conn</span>(),\n  <span class="tok-fn">max</span>: <span class="tok-prop">10</span>\n);' },
  { id: 'pdo-pool', group: 'resources', order: null, urlSuffix: '/docs/components/pdo-pool.html',
    codeHtml: '<span class="tok-var">$pdo</span> = <span class="tok-kw">new</span> <span class="tok-cls">PDO</span>(<span class="tok-prop">$dsn</span>, <span class="tok-prop">$user</span>, <span class="tok-prop">$pwd</span>, [\n  <span class="tok-cls">PDO</span>::<span class="tok-fn">ATTR_POOL_MAX</span> => <span class="tok-prop">10</span>\n]);' },
  { id: 'thread', group: 'threads', order: null, urlSuffix: '/docs/components/threads.html',
    codeHtml: '<span class="tok-var">$t</span> = <span class="tok-fn">spawn_thread</span>(<span class="tok-kw">function</span>() {\n  <span class="tok-kw">return</span> <span class="tok-fn">heavyCompute</span>();\n});\n<span class="tok-var">$r</span> = <span class="tok-fn">await</span>(<span class="tok-prop">$t</span>);' },
  { id: 'thread-pool', group: 'threads', order: null, urlSuffix: '/docs/components/thread-pool.html',
    codeHtml: '<span class="tok-var">$pool</span> = <span class="tok-kw">new</span> <span class="tok-cls">ThreadPool</span>(<span class="tok-prop">4</span>);\n<span class="tok-var">$f</span> = <span class="tok-prop">$pool</span>-><span class="tok-fn">submit</span>(<span class="tok-prop">$task</span>);\n<span class="tok-var">$results</span> = <span class="tok-prop">$pool</span>-><span class="tok-fn">map</span>(<span class="tok-prop">$items</span>, <span class="tok-prop">$fn</span>);' },
]

// "related" links purely drive the hover highlight below — nothing is drawn.
const edgePairs: [string, string][] = [
  ['coroutines', 'await-funcs'], ['await-funcs', 'cancellation'], ['cancellation', 'scope'],
  ['scope', 'context'], ['context', 'pool'], ['scope', 'taskgroup'], ['taskgroup', 'taskset'],
  ['pool', 'pdo-pool'], ['coroutines', 'future'], ['coroutines', 'channels'],
  ['pool', 'thread-pool'], ['thread', 'thread-pool'],
]

const subPages: Record<string, { label: string; urlSuffix: string }[]> = {
  coroutines: [
    { label: 'spawn()', urlSuffix: '/docs/reference/spawn.html' },
    { label: 'spawn_with()', urlSuffix: '/docs/reference/spawn-with.html' },
  ],
  future: [{ label: 'await()', urlSuffix: '/docs/reference/await.html' }],
  'await-funcs': [
    { label: 'await_all()', urlSuffix: '/docs/reference/await-all.html' },
    { label: 'await_first_success()', urlSuffix: '/docs/reference/await-first-success.html' },
    { label: 'delay()', urlSuffix: '/docs/reference/delay.html' },
    { label: 'suspend()', urlSuffix: '/docs/reference/suspend.html' },
  ],
  cancellation: [
    { label: 'cancel()', urlSuffix: '/docs/components/cancellation.html' },
    { label: 'protect()', urlSuffix: '/docs/reference/protect.html' },
    { label: 'timeout()', urlSuffix: '/docs/reference/timeout.html' },
  ],
  scope: [
    { label: 'Scope', urlSuffix: '/docs/components/scope.html' },
    { label: 'Scope::inherit()', urlSuffix: '/docs/components/scope.html' },
  ],
  context: [
    { label: 'current_context()', urlSuffix: '/docs/reference/current-context.html' },
    { label: 'coroutine_context()', urlSuffix: '/docs/reference/coroutine-context.html' },
  ],
  taskgroup: [
    { label: 'all()', urlSuffix: '/docs/reference/task-group/all.html' },
    { label: 'race()', urlSuffix: '/docs/reference/task-group/race.html' },
    { label: 'close()', urlSuffix: '/docs/reference/task-group/close.html' },
    { label: 'cancel()', urlSuffix: '/docs/reference/task-group/cancel.html' },
  ],
  taskset: [
    { label: 'joinNext()', urlSuffix: '/docs/reference/task-set/join-next.html' },
    { label: 'joinAny()', urlSuffix: '/docs/reference/task-set/join-any.html' },
    { label: 'joinAll()', urlSuffix: '/docs/reference/task-set/join-all.html' },
    { label: 'close()', urlSuffix: '/docs/reference/task-set/close.html' },
  ],
  pool: [{ label: 'Pool::tryAcquire()', urlSuffix: '/docs/components/pool.html' }],
  thread: [
    { label: 'spawn_thread()', urlSuffix: '/docs/reference/spawn-thread.html' },
    { label: 'ThreadChannel', urlSuffix: '/docs/components/thread-channels.html' },
  ],
  'thread-pool': [
    { label: 'submit()', urlSuffix: '/docs/reference/thread-pool/submit.html' },
    { label: 'map()', urlSuffix: '/docs/reference/thread-pool/map.html' },
  ],
}

const nodeMap: Record<string, NodeDef> = {}
for (const n of nodesDef) nodeMap[n.id] = n

const nodesByGroup = computed(() => {
  const m: Record<string, NodeDef[]> = {}
  for (const g of GROUP_ORDER) m[g] = nodesDef.filter((n) => n.group === g)
  return m
})

// Step number shown on the group panel's corner badge — the order of whichever
// node in that group sits on the 1-6 primary path (most groups have exactly
// one; iterate/threads have none and get no badge).
const groupOrderMap = computed(() => {
  const m: Record<string, number | null> = {}
  for (const g of GROUP_ORDER) {
    const ordered = nodesByGroup.value[g].find((n) => n.order != null)
    m[g] = ordered ? ordered.order! : null
  }
  return m
})

const adjMap: Record<string, Set<string>> = {}
for (const n of nodesDef) adjMap[n.id] = new Set()
for (const [a, b] of edgePairs) { adjMap[a].add(b); adjMap[b].add(a) }

// --- Interaction state ---
const hoveredId = ref<string | null>(null)

function isNodeDimmed(id: string): boolean {
  if (!hoveredId.value) return false
  return id !== hoveredId.value && !adjMap[hoveredId.value]?.has(id)
}
function isNodeHighlighted(id: string): boolean {
  if (!hoveredId.value) return false
  return id === hoveredId.value || adjMap[hoveredId.value]?.has(id)
}
function isGroupDimmed(group: string): boolean {
  if (!hoveredId.value) return false
  const activeGroups = new Set<string>()
  activeGroups.add(nodeMap[hoveredId.value].group)
  adjMap[hoveredId.value]?.forEach((nid) => activeGroups.add(nodeMap[nid].group))
  return !activeGroups.has(group)
}

// --- Tooltip (desktop hover / keyboard focus) ---
const tipVisible = ref(false)
const tipX = ref(0)
const tipY = ref(0)

function getNodeCodeHtml(id: string): string {
  const n = nodeMap[id]
  if (id === 'cancellation') {
    const cm = t.value.nodes.cancellation?.comment || '// or with timeout:'
    return `<span class="tok-prop">$coro</span>-><span class="tok-fn">cancel</span>();\n<span class="tok-c">${cm}</span>\n<span class="tok-fn">await</span>(<span class="tok-prop">$coro</span>, <span class="tok-fn">timeout</span>(<span class="tok-prop">5000</span>));`
  }
  return n.codeHtml
}

function onNodeEnter(id: string, ev: MouseEvent) {
  if (isMobile.value) return
  hoveredId.value = id
  tipX.value = ev.clientX + 16
  tipY.value = ev.clientY + 16
  tipVisible.value = true
}
function onNodeFocus(id: string, ev: FocusEvent) {
  if (isMobile.value) return
  hoveredId.value = id
  const rect = (ev.target as HTMLElement).getBoundingClientRect()
  tipX.value = rect.left
  tipY.value = rect.bottom + 10
  tipVisible.value = true
}
function onNodeLeave() {
  hoveredId.value = null
  tipVisible.value = false
}
function onWrapMouseMove(ev: MouseEvent) {
  if (hoveredId.value && tipVisible.value) {
    let x = ev.clientX + 16, y = ev.clientY + 16
    if (x + 280 > window.innerWidth - 10) x = ev.clientX - 292
    if (y + 220 > window.innerHeight - 10) y = ev.clientY - 232
    tipX.value = x
    tipY.value = y
  }
}

// --- Mobile bottom sheet ---
const isMobile = ref(false)
const sheetOpen = ref(false)
const sheetNodeId = ref<string | null>(null)

onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})

function onChipClick(id: string) {
  // On mobile the <a> below has no href (see template), so there's nothing
  // for VitePress's own capture-phase router listener to intercept — no
  // preventDefault() race to lose. Desktop keeps the real href and navigates
  // natively; this handler only needs to run for the mobile sheet.
  if (!isMobile.value) return
  hoveredId.value = id
  sheetNodeId.value = id
  sheetOpen.value = true
}
function closeSheet() {
  sheetOpen.value = false
  hoveredId.value = null
  sheetNodeId.value = null
}

// Swipe-down to close
const sheetRef = ref<HTMLElement | null>(null)
let dragStartY = 0, dragCurrentY = 0, dragging = false

function onSheetTouchStart(e: TouchEvent) {
  if (!sheetOpen.value) return
  dragStartY = e.touches[0].clientY
  dragCurrentY = dragStartY
  dragging = true
}
function onSheetTouchMove(e: TouchEvent) {
  if (!dragging) return
  if (e.cancelable) e.preventDefault()
  dragCurrentY = e.touches[0].clientY
  const dy = Math.max(0, dragCurrentY - dragStartY)
  if (sheetRef.value) sheetRef.value.style.transform = `translateY(${dy}px)`
}
function onSheetTouchEnd() {
  if (!dragging) return
  dragging = false
  const dy = dragCurrentY - dragStartY
  if (sheetRef.value) sheetRef.value.style.transform = ''
  if (dy > 60) closeSheet()
}
</script>

<template>
  <div class="learning-map-wrap">
    <p class="lm-hint">{{ isMobile ? t.hintMobile : t.hint }}</p>

    <div class="lm-timeline" @mousemove="onWrapMouseMove">
      <section
        v-for="g in GROUP_ORDER" :key="g"
        class="lm-group" :class="[`lm-group--${GROUP_COLOR[g]}`, { dimmed: isGroupDimmed(g) }]"
      >
        <div class="lm-group-dot"></div>
        <div class="lm-group-panel">
          <span v-if="groupOrderMap[g]" class="lm-group-badge" :class="`lm-group-badge--${GROUP_COLOR[g]}`">
            {{ String(groupOrderMap[g]).padStart(2, '0') }}
          </span>
          <h3 class="lm-group-title">{{ t.groups[g] }}</h3>
          <div class="lm-nodes">
            <a
              v-for="n in nodesByGroup[g]" :key="n.id"
              class="lm-node" :class="{ dimmed: isNodeDimmed(n.id), highlighted: isNodeHighlighted(n.id) }"
              :href="isMobile ? undefined : `/${currentLang}${n.urlSuffix}`"
              @mouseenter="(ev) => onNodeEnter(n.id, ev)"
              @mouseleave="onNodeLeave"
              @focus="(ev) => onNodeFocus(n.id, ev)"
              @blur="onNodeLeave"
              @click="onChipClick(n.id)"
            >
              {{ t.nodes[n.id]?.title || n.id }}
            </a>
          </div>
        </div>
      </section>
    </div>

    <!-- Desktop / keyboard tooltip -->
    <div v-if="!isMobile && tipVisible && hoveredId" class="lm-tooltip visible"
         :style="{ left: tipX + 'px', top: tipY + 'px' }">
      <div class="tt-title">{{ t.nodes[hoveredId]?.title }}</div>
      <div class="tt-desc">{{ t.nodes[hoveredId]?.desc }}</div>
      <div class="tt-meta">
        <span class="tt-group" :class="`tt-group--${GROUP_COLOR[nodeMap[hoveredId].group]}`">
          {{ t.groups[nodeMap[hoveredId].group] }}
        </span>
        <span v-if="nodeMap[hoveredId].order" class="tt-order">
          {{ t.stepFormat(nodeMap[hoveredId].order!) }}
        </span>
      </div>
      <div class="tt-code" v-html="getNodeCodeHtml(hoveredId)"></div>
      <div v-if="subPages[hoveredId]" class="tt-sub">
        <a v-for="sp in subPages[hoveredId]" :key="sp.urlSuffix"
           :href="`/${currentLang}${sp.urlSuffix}`">{{ sp.label }}</a>
      </div>
    </div>

    <!-- Mobile bottom sheet -->
    <div v-if="isMobile && sheetOpen" class="lm-sheet-overlay visible" @click="closeSheet"></div>
    <div v-if="isMobile && sheetNodeId" ref="sheetRef"
         class="lm-sheet" :class="{ visible: sheetOpen }"
         @touchstart="onSheetTouchStart" @touchmove.prevent="onSheetTouchMove" @touchend="onSheetTouchEnd">
      <div class="sh-header">
        <div class="sh-handle"><span></span></div>
        <button class="sh-close" aria-label="Close" @click="closeSheet">&times;</button>
      </div>
      <div class="sh-title">{{ t.nodes[sheetNodeId]?.title }}</div>
      <div class="sh-desc">{{ t.nodes[sheetNodeId]?.desc }}</div>
      <div class="sh-meta">
        <span class="sh-group" :class="`sh-group--${GROUP_COLOR[nodeMap[sheetNodeId].group]}`">
          {{ t.groups[nodeMap[sheetNodeId].group] }}
        </span>
        <span v-if="nodeMap[sheetNodeId].order" class="sh-order">
          {{ t.stepFormat(nodeMap[sheetNodeId].order!) }}
        </span>
      </div>
      <div class="sh-code" v-html="getNodeCodeHtml(sheetNodeId)"></div>
      <div v-if="subPages[sheetNodeId]" class="sh-links">
        <a v-for="sp in subPages[sheetNodeId]" :key="sp.urlSuffix"
           :href="`/${currentLang}${sp.urlSuffix}`">{{ sp.label }}</a>
      </div>
      <a class="sh-btn" :href="`/${currentLang}${nodeMap[sheetNodeId].urlSuffix}`">{{ t.openDoc }}</a>
    </div>
  </div>
</template>

<style scoped>
.learning-map-wrap {
  /* No max-width/auto-margin: this sits inside .docs-content's own reading
     column, so it should fill it flush-left like the surrounding prose —
     centering it independently created a left offset against the paragraphs. */
  width: 100%;
}
.lm-hint {
  text-align: left;
  font-size: 0.85em;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}
/* ---- Timeline: same spine-and-dot idiom as the full /roadmap page ---- */
.lm-timeline {
  position: relative;
  padding-left: 2rem;
}
.lm-timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--color-border);
}
.lm-group {
  position: relative;
  margin-bottom: 1.25rem;
  transition: opacity 0.25s;
}
.lm-group:last-child { margin-bottom: 0; }
.lm-group.dimmed { opacity: 0.35; }

.lm-group-dot {
  position: absolute;
  left: -2rem;
  top: 1rem;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid var(--lm-accent);
  background: var(--color-bg);
  z-index: 1;
}

.lm-group-panel {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1rem 1.15rem 1.1rem;
  transition: transform 0.4s cubic-bezier(.2,.7,.2,1), box-shadow 0.4s cubic-bezier(.2,.7,.2,1);
}
.lm-group:hover .lm-group-panel {
  transform: translateY(-3px);
  box-shadow: 0 20px 38px -18px var(--lm-accent);
}

/* Spinning conic-gradient ring, same recipe as the homepage lesson cards
   (mixins.card-glow) — reuses the already-global --ta-angle / ta-spin from
   base/_animations.scss instead of redeclaring them here. */
.lm-group-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(from var(--ta-angle), transparent 0deg, transparent 232deg, #5AD1B0 268deg, #8B7BFF 300deg, #C9BEFF 320deg, transparent 342deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.45s ease;
  pointer-events: none;
  animation: ta-spin 2.8s linear infinite;
  animation-play-state: paused;
}
.lm-group:hover .lm-group-panel::before {
  opacity: 1;
  animation-play-state: running;
}
.lm-group-title {
  margin: 0 0 0.65rem;
  padding-right: 2.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--lm-accent);
}

/* Step badge — same visual language as the tutorial cards' "01" corner tag. */
.lm-group-badge {
  position: absolute;
  top: 0.95rem;
  right: 1.1rem;
  z-index: 1;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.55rem;
  border-radius: 9999px;
}
.lm-group-badge--purple { background: rgba(139, 123, 255, 0.14); color: #7B5FE8; }
.lm-group-badge--teal   { background: rgba(90, 209, 176, 0.16); color: #1C8F76; }
.lm-group-badge--orange { background: rgba(224, 165, 90, 0.18); color: #B4711F; }
.lm-group-badge--blue   { background: rgba(90, 168, 255, 0.16); color: #2C6FCC; }
[data-theme="dark"] .lm-group-badge--purple { color: #B4A8FF; }
[data-theme="dark"] .lm-group-badge--teal   { color: #5AD1B0; }
[data-theme="dark"] .lm-group-badge--orange { color: #E7B276; }
[data-theme="dark"] .lm-group-badge--blue   { color: #7FB4FF; }

/* ---- Group accent colors: the site's own 4-hue tag palette ---- */
.lm-group--purple { --lm-accent: #7B5FE8; }
.lm-group--teal   { --lm-accent: #1C8F76; }
.lm-group--orange { --lm-accent: #B4711F; }
.lm-group--blue   { --lm-accent: #2C6FCC; }
[data-theme="dark"] .lm-group--purple { --lm-accent: #B4A8FF; }
[data-theme="dark"] .lm-group--teal   { --lm-accent: #5AD1B0; }
[data-theme="dark"] .lm-group--orange { --lm-accent: #E7B276; }
[data-theme="dark"] .lm-group--blue   { --lm-accent: #7FB4FF; }

/* ---- Node chips ---- */
.lm-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.lm-node {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 9999px;
  /* Must read lighter than .lm-group-panel's own background, or the pill
     looks like a dark cutout instead of a raised chip sitting on the card. */
  background: var(--nav-panel-hover);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.84rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.25s ease;
}
.lm-node:hover,
.lm-node:focus-visible,
.lm-node.highlighted {
  border-color: var(--lm-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px -6px var(--lm-accent);
}
.lm-node:focus-visible { outline: 2px solid var(--lm-accent); outline-offset: 2px; }
.lm-node.dimmed { opacity: 0.35; }

/* ---- Tooltip / bottom sheet shared content styling ---- */
.lm-tooltip {
  position: fixed; pointer-events: none;
  background: var(--color-bg-subtle); border: 1px solid var(--color-border);
  border-radius: 14px; padding: 0.9rem 1rem;
  font-size: 0.85em; box-shadow: 0 28px 60px -24px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 100; opacity: 0; transition: opacity 0.18s;
  max-width: 300px; line-height: 1.45;
}
.lm-tooltip.visible { opacity: 1; }
.tt-title { font-weight: 700; margin-bottom: 2px; font-size: 1.05em; color: var(--color-text); }
.tt-desc { color: var(--color-text-secondary); margin-bottom: 0.5rem; }
.tt-meta { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.1rem; }
.tt-group { font-size: 0.85em; font-weight: 600; }
.tt-group--purple { color: #7B5FE8; } .tt-group--teal { color: #1C8F76; }
.tt-group--orange { color: #B4711F; } .tt-group--blue { color: #2C6FCC; }
[data-theme="dark"] .tt-group--purple { color: #B4A8FF; } [data-theme="dark"] .tt-group--teal { color: #5AD1B0; }
[data-theme="dark"] .tt-group--orange { color: #E7B276; } [data-theme="dark"] .tt-group--blue { color: #7FB4FF; }
.tt-order { font-size: 0.8em; color: var(--color-text-muted); font-family: var(--font-mono); }

.tt-code, .sh-code {
  margin-top: 0.6rem; padding: 0.6rem 0.75rem; background: var(--code-bg);
  border: 1px solid var(--code-border); border-radius: 10px;
  font-family: var(--font-mono); font-size: 0.82em; line-height: 1.55;
  /* --code-bg is dark in both themes (site convention); the base text color
     must match, or unwrapped punctuation (=, ->, parens) goes invisible in
     light mode. Same value as the real code blocks (_code-blocks.scss). */
  color: #C6C2D6;
  white-space: pre; overflow-x: auto;
}
:deep(.tok-c) { color: #6f6d80; }
:deep(.tok-var) { color: #B69BFF; }
:deep(.tok-fn) { color: #7C6BFF; }
:deep(.tok-kw) { color: #5AD1B0; }
:deep(.tok-cls) { color: #5AD1B0; }
:deep(.tok-prop) { color: #E8B77C; }
:deep(.tok-str) { color: #7CC7E8; }

.tt-sub, .sh-links {
  font-size: 0.85em; margin-top: 0.5rem; color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border); padding-top: 0.5rem;
}
.tt-sub a { display: block; color: var(--color-primary); text-decoration: none; padding: 1px 0; }
.tt-sub a:hover { text-decoration: underline; }

/* ---- Mobile bottom sheet ---- */
.lm-sheet-overlay {
  display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 199;
}
.lm-sheet-overlay.visible { display: block; }
.lm-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; background: var(--color-bg-subtle);
  border-radius: 16px 16px 0 0; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.35);
  border-top: 1px solid var(--color-border);
  z-index: 200; transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  max-height: 70vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 0 1.25rem 1.25rem;
}
.lm-sheet.visible { transform: translateY(0); }
.sh-header {
  display: flex; align-items: center; justify-content: center;
  padding: 10px 0 6px; position: sticky; top: 0; background: var(--color-bg-subtle); z-index: 1;
}
.sh-handle { flex: 1; display: flex; justify-content: center; cursor: grab; }
.sh-handle span { display: block; width: 36px; height: 4px; border-radius: 2px; background: var(--color-border); }
.sh-close {
  position: absolute; right: 12px; top: 8px;
  width: 32px; height: 32px; border: none; background: var(--color-bg);
  border-radius: 50%; cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: var(--color-text-muted); transition: all 0.15s;
  font-size: 18px; line-height: 1;
}
.sh-close:hover { background: var(--color-border); color: var(--color-text); }
.sh-title { font-weight: 700; font-size: 1.15em; margin-bottom: 2px; color: var(--color-text); }
.sh-desc { color: var(--color-text-secondary); font-size: 0.92em; margin-bottom: 0.5rem; }
.sh-meta { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.6rem; }
.sh-group { font-size: 0.85em; font-weight: 600; }
.sh-group--purple { color: #7B5FE8; } .sh-group--teal { color: #1C8F76; }
.sh-group--orange { color: #B4711F; } .sh-group--blue { color: #2C6FCC; }
[data-theme="dark"] .sh-group--purple { color: #B4A8FF; } [data-theme="dark"] .sh-group--teal { color: #5AD1B0; }
[data-theme="dark"] .sh-group--orange { color: #E7B276; } [data-theme="dark"] .sh-group--blue { color: #7FB4FF; }
.sh-order { font-size: 0.8em; color: var(--color-text-muted); font-family: var(--font-mono); }
.sh-links a { display: block; color: var(--color-primary); text-decoration: none; padding: 4px 0; }
.sh-btn {
  display: block; width: 100%; margin-top: 0.75rem; padding: 0.75rem;
  background: var(--color-primary); color: #fff; border: none; border-radius: 10px;
  font-family: inherit; font-size: 0.95em; font-weight: 600; cursor: pointer;
  text-align: center; text-decoration: none;
}

@media (max-width: 768px) {
  .lm-tooltip { display: none !important; }
  .lm-hint { font-size: 0.8em; }
}
</style>
