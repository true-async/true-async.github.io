<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  fullVersion: string
  stepFormat: (n: number) => string
  groups: Record<string, string>
  nodes: Record<string, { title: string; desc: string; comment?: string }>
}

const i18n: Record<string, LmI18n> = {
  en: {
    hint: 'Hover over a node for details. Click to go to the documentation.',
    hintMobile: 'Tap a node for details.',
    openDoc: 'Open documentation \u2192',
    fullVersion: 'Full interactive version \u2192',
    stepFormat: (n) => `Step ${n} of 6`,
    groups: {
      primitives: 'Basic Primitives', sync: 'Synchronization', cancellation: 'Cancellation',
      structural: 'Str. Concurrency', context: 'Context', iterate: 'iterate()', resources: 'Resources & Pools',
      threads: 'Threads',
    },
    nodes: {
      coroutines: { title: 'Coroutines', desc: 'Basic unit of asynchrony \u2014 launching concurrent tasks' },
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
    openDoc: 'Открыть документацию \u2192',
    fullVersion: 'Полная интерактивная версия \u2192',
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
    openDoc: 'Dokumentation öffnen \u2192',
    fullVersion: 'Vollständige interaktive Version \u2192',
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
    openDoc: 'Abrir documentación \u2192',
    fullVersion: 'Versión interactiva completa \u2192',
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
    openDoc: 'Ouvrir la documentation \u2192',
    fullVersion: 'Version interactive complète \u2192',
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
    openDoc: 'Apri documentazione \u2192',
    fullVersion: 'Versione interattiva completa \u2192',
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
    openDoc: '문서 열기 \u2192',
    fullVersion: '전체 인터랙티브 버전 \u2192',
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
    openDoc: 'Відкрити документацію \u2192',
    fullVersion: 'Повна інтерактивна версія \u2192',
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
    openDoc: '打开文档 \u2192',
    fullVersion: '完整交互版本 \u2192',
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

// --- Static graph data ---

const GRP_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  primitives:   { color: '#6B58FF', bg: 'rgba(107,88,255,0.12)',  border: 'rgba(107,88,255,0.50)' },
  sync:         { color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   border: 'rgba(37,99,235,0.50)' },
  cancellation: { color: '#DC2626', bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.50)' },
  structural:   { color: '#0891B2', bg: 'rgba(8,145,178,0.12)',   border: 'rgba(8,145,178,0.50)' },
  context:      { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.50)' },
  iterate:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.50)' },
  resources:    { color: '#16A34A', bg: 'rgba(22,163,74,0.12)',   border: 'rgba(22,163,74,0.50)' },
  threads:      { color: '#EA580C', bg: 'rgba(234,88,12,0.12)',  border: 'rgba(234,88,12,0.50)' },
}

const ARROW_IDS: Record<string, string> = {
  primitives: 'lmArrPurple', sync: 'lmArrBlue', cancellation: 'lmArrRed',
  structural: 'lmArrTeal', context: 'lmArrViolet', resources: 'lmArrGreen',
  threads: 'lmArrOrange',
}

interface NodeDef {
  id: string; group: string; order: number | null; w: number; h: number;
  cx: number; cy: number;
  codeHtml: string;
  urlSuffix: string;
}

const nodesDef: NodeDef[] = [
  { id: 'coroutines', group: 'primitives', order: 1, w: 130, h: 44, cx: 250, cy: 55,
    urlSuffix: '/docs/components/coroutines.html',
    codeHtml: '<span class="var">$coro</span> = <span class="fn">spawn</span>(<span class="kw">function</span>() {\n  <span class="fn">echo</span> <span class="str">"async!"</span>;\n});' },
  { id: 'future', group: 'primitives', order: null, w: 110, h: 44, cx: 470, cy: 55,
    urlSuffix: '/docs/components/future.html',
    codeHtml: '<span class="var">$coro</span> = <span class="fn">spawn</span>(<span class="var">$task</span>);\n<span class="var">$result</span> = <span class="fn">await</span>(<span class="var">$coro</span>);' },
  { id: 'await-funcs', group: 'sync', order: 2, w: 160, h: 44, cx: 250, cy: 150,
    urlSuffix: '/docs/reference/await.html',
    codeHtml: '<span class="var">$result</span> = <span class="fn">await</span>(<span class="var">$coro</span>);\n<span class="var">$results</span> = <span class="fn">await_all</span>(<span class="var">$tasks</span>);\n<span class="var">$first</span> = <span class="fn">await_first_success</span>(<span class="var">$tasks</span>);' },
  { id: 'channels', group: 'sync', order: null, w: 110, h: 44, cx: 470, cy: 150,
    urlSuffix: '/docs/components/channels.html',
    codeHtml: '<span class="var">$ch</span> = <span class="kw">new</span> Async\\<span class="fn">Channel</span>(<span class="num">10</span>);\n<span class="var">$ch</span>-><span class="fn">send</span>(<span class="str">"data"</span>);\n<span class="var">$val</span> = <span class="var">$ch</span>-><span class="fn">recv</span>();' },
  { id: 'cancellation', group: 'cancellation', order: 3, w: 150, h: 44, cx: 300, cy: 245,
    urlSuffix: '/docs/components/cancellation.html',
    codeHtml: '' /* comment is dynamic per language, built in template */ },
  { id: 'scope', group: 'structural', order: 4, w: 110, h: 44, cx: 250, cy: 340,
    urlSuffix: '/docs/components/scope.html',
    codeHtml: '<span class="var">$scope</span> = <span class="kw">new</span> Async\\<span class="fn">Scope</span>();\n<span class="fn">spawn_with</span>(<span class="var">$scope</span>, <span class="var">$task</span>);' },
  { id: 'taskgroup', group: 'structural', order: null, w: 130, h: 44, cx: 400, cy: 340,
    urlSuffix: '/docs/components/task-group.html',
    codeHtml: '<span class="var">$group</span> = <span class="kw">new</span> <span class="fn">TaskGroup</span>(<span class="num">5</span>);\n<span class="var">$group</span>-><span class="fn">spawn</span>(<span class="var">$task</span>);\n<span class="var">$results</span> = <span class="var">$group</span>-><span class="fn">all</span>();' },
  { id: 'taskset', group: 'structural', order: null, w: 120, h: 44, cx: 540, cy: 340,
    urlSuffix: '/docs/components/task-set.html',
    codeHtml: '<span class="var">$set</span> = <span class="kw">new</span> <span class="fn">TaskSet</span>(<span class="num">10</span>);\n<span class="var">$set</span>-><span class="fn">spawn</span>(<span class="var">$task</span>);\n<span class="var">$r</span> = <span class="var">$set</span>-><span class="fn">joinNext</span>();' },
  { id: 'context', group: 'context', order: 5, w: 120, h: 44, cx: 300, cy: 435,
    urlSuffix: '/docs/components/context.html',
    codeHtml: '<span class="var">$ctx</span> = <span class="fn">current_context</span>();\n<span class="var">$ctx</span>-><span class="fn">set</span>(<span class="str">\'auth_token\'</span>, <span class="var">$token</span>);\n<span class="var">$v</span> = <span class="var">$ctx</span>-><span class="fn">find</span>(<span class="str">\'auth_token\'</span>);' },
  { id: 'iterate', group: 'iterate', order: null, w: 120, h: 44, cx: 125, cy: 532,
    urlSuffix: '/docs/reference/iterate.html',
    codeHtml: '<span class="fn">iterate</span>(<span class="var">$items</span>, <span class="kw">function</span>(<span class="var">$v</span>, <span class="var">$k</span>) {\n  <span class="fn">echo</span> <span class="str">"$k: $v\\n"</span>;\n}, <span class="fn">concurrency</span>: <span class="num">4</span>);' },
  { id: 'pool', group: 'resources', order: 6, w: 130, h: 44, cx: 350, cy: 532,
    urlSuffix: '/docs/components/pool.html',
    codeHtml: '<span class="var">$pool</span> = <span class="kw">new</span> <span class="fn">Pool</span>(\n  <span class="fn">factory</span>: <span class="kw">fn</span>() => <span class="kw">new</span> <span class="fn">Conn</span>(),\n  <span class="fn">max</span>: <span class="num">10</span>\n);' },
  { id: 'pdo-pool', group: 'resources', order: null, w: 120, h: 44, cx: 510, cy: 532,
    urlSuffix: '/docs/components/pdo-pool.html',
    codeHtml: '<span class="var">$pdo</span> = <span class="kw">new</span> <span class="fn">PDO</span>(<span class="var">$dsn</span>, <span class="var">$user</span>, <span class="var">$pwd</span>, [\n  PDO::<span class="fn">ATTR_POOL_MAX</span> => <span class="num">10</span>\n]);' },
  { id: 'thread', group: 'threads', order: null, w: 110, h: 44, cx: 180, cy: 635,
    urlSuffix: '/docs/components/threads.html',
    codeHtml: '<span class="var">$t</span> = <span class="fn">spawn_thread</span>(<span class="kw">function</span>() {\n  <span class="kw">return</span> <span class="fn">heavyCompute</span>();\n});\n<span class="var">$r</span> = <span class="fn">await</span>(<span class="var">$t</span>);' },
  { id: 'thread-pool', group: 'threads', order: null, w: 130, h: 44, cx: 420, cy: 635,
    urlSuffix: '/docs/components/thread-pool.html',
    codeHtml: '<span class="var">$pool</span> = <span class="kw">new</span> <span class="fn">ThreadPool</span>(<span class="num">4</span>);\n<span class="var">$f</span> = <span class="var">$pool</span>-><span class="fn">submit</span>(<span class="var">$task</span>);\n<span class="var">$results</span> = <span class="var">$pool</span>-><span class="fn">map</span>(<span class="var">$items</span>, <span class="var">$fn</span>);' },
]

const edges = [
  { from: 'coroutines', to: 'await-funcs', type: 'path' },
  { from: 'await-funcs', to: 'cancellation', type: 'path' },
  { from: 'cancellation', to: 'scope', type: 'path' },
  { from: 'scope', to: 'context', type: 'path' },
  { from: 'context', to: 'pool', type: 'path' },
  { from: 'scope', to: 'taskgroup', type: 'path' },
  { from: 'taskgroup', to: 'taskset', type: 'related' },
  { from: 'pool', to: 'pdo-pool', type: 'path' },
  { from: 'coroutines', to: 'future', type: 'related' },
  { from: 'coroutines', to: 'channels', type: 'related' },
  { from: 'pool', to: 'thread-pool', type: 'related' },
  { from: 'thread', to: 'thread-pool', type: 'related' },
]

const zones = [
  { group: 'primitives', x: 140, y: 10, w: 400, h: 85, rx: 14 },
  { group: 'sync', x: 100, y: 105, w: 440, h: 85, rx: 14 },
  { group: 'cancellation', x: 170, y: 200, w: 260, h: 85, rx: 14 },
  { group: 'structural', x: 140, y: 295, w: 470, h: 85, rx: 14 },
  { group: 'context', x: 185, y: 390, w: 230, h: 85, rx: 14 },
  { group: 'iterate', x: 30, y: 485, w: 190, h: 90, rx: 14 },
  { group: 'resources', x: 245, y: 485, w: 330, h: 90, rx: 14 },
  { group: 'threads', x: 30, y: 595, w: 540, h: 90, rx: 14 },
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
    { label: 'seal()', urlSuffix: '/docs/reference/task-group/seal.html' },
    { label: 'cancel()', urlSuffix: '/docs/reference/task-group/cancel.html' },
  ],
  taskset: [
    { label: 'joinNext()', urlSuffix: '/docs/reference/task-set/join-next.html' },
    { label: 'joinAny()', urlSuffix: '/docs/reference/task-set/join-any.html' },
    { label: 'joinAll()', urlSuffix: '/docs/reference/task-set/join-all.html' },
    { label: 'seal()', urlSuffix: '/docs/reference/task-set/seal.html' },
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

// --- Adjacency map ---
const adjMap: Record<string, Set<string>> = {}
for (const n of nodesDef) adjMap[n.id] = new Set()
for (const e of edges) { adjMap[e.from].add(e.to); adjMap[e.to].add(e.from) }

// --- Edge path computation ---
function exitPt(cx: number, cy: number, w: number, h: number, angle: number) {
  const hw = w / 2, hh = h / 2
  const c = Math.cos(angle), s = Math.sin(angle)
  const tx = c ? hw / Math.abs(c) : 9999
  const ty = s ? hh / Math.abs(s) : 9999
  const tt = Math.min(tx, ty)
  return { x: cx + c * tt, y: cy + s * tt }
}

function calcEdgePath(from: NodeDef, to: NodeDef): string {
  const dx = to.cx - from.cx, dy = to.cy - from.cy
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1) return ''
  const a = Math.atan2(dy, dx)
  const s = exitPt(from.cx, from.cy, from.w, from.h, a)
  const e = exitPt(to.cx, to.cy, to.w, to.h, a + Math.PI)
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2
  const ux = dx / d, uy = dy / d
  const off = Math.min(d * 0.12, 30)
  return `M${s.x},${s.y} Q${mx - uy * off},${my + ux * off} ${e.x},${e.y}`
}

const nodeMap: Record<string, NodeDef> = {}
for (const n of nodesDef) nodeMap[n.id] = n

const edgePaths = edges.map((e, i) => {
  const from = nodeMap[e.from], to = nodeMap[e.to]
  return { ...e, d: calcEdgePath(from, to), index: i, groupColor: GRP_COLORS[from.group].color }
})

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
function isEdgeDimmed(from: string, to: string): boolean {
  if (!hoveredId.value) return false
  return from !== hoveredId.value && to !== hoveredId.value
}
function isEdgeHighlighted(from: string, to: string): boolean {
  if (!hoveredId.value) return false
  return from === hoveredId.value || to === hoveredId.value
}
function isZoneDimmed(group: string): boolean {
  if (!hoveredId.value) return false
  const activeGroups = new Set<string>()
  activeGroups.add(nodeMap[hoveredId.value].group)
  adjMap[hoveredId.value]?.forEach(nid => activeGroups.add(nodeMap[nid].group))
  return !activeGroups.has(group)
}

// --- Tooltip ---
const tipVisible = ref(false)
const tipX = ref(0)
const tipY = ref(0)

function getNodeCodeHtml(id: string): string {
  const n = nodeMap[id]
  if (id === 'cancellation') {
    const cm = t.value.nodes.cancellation?.comment || '// or with timeout:'
    return `<span class="var">$coro</span>-><span class="fn">cancel</span>();\n<span class="cm">${cm}</span>\n<span class="fn">await</span>(<span class="var">$coro</span>, <span class="fn">timeout</span>(<span class="num">5000</span>));`
  }
  return n.codeHtml
}

function onNodeEnter(id: string, ev: MouseEvent) {
  hoveredId.value = id
  tipX.value = ev.clientX + 16
  tipY.value = ev.clientY + 16
  tipVisible.value = true
}
function onNodeLeave() {
  hoveredId.value = null
  tipVisible.value = false
}
function onSvgMouseMove(ev: MouseEvent) {
  if (hoveredId.value) {
    let x = ev.clientX + 16, y = ev.clientY + 16
    if (x + 240 > window.innerWidth - 10) x = ev.clientX - 252
    if (y + 200 > window.innerHeight - 10) y = ev.clientY - 212
    tipX.value = x
    tipY.value = y
  }
}
function onNodeClick(id: string) {
  const n = nodeMap[id]
  if (n.urlSuffix) window.location.href = `/${currentLang.value}${n.urlSuffix}`
}

// --- Mobile bottom sheet ---
const isMobile = ref(false)
const sheetOpen = ref(false)
const sheetNodeId = ref<string | null>(null)

onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})

function onNodeTouchMobile(id: string) {
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

// Touch handler for SVG on mobile
function onSvgTouch(ev: TouchEvent) {
  const target = (ev.target as Element)?.closest?.('.lm-node')
  if (target) {
    ev.preventDefault()
    const id = target.getAttribute('data-id')
    if (id) onNodeTouchMobile(id)
  } else {
    if (sheetOpen.value) closeSheet()
    else hoveredId.value = null
  }
}
</script>

<template>
  <div class="learning-map-wrap">
    <p class="lm-hint">{{ isMobile ? t.hintMobile : t.hint }}</p>
    <div class="lm-container">
      <svg
        viewBox="0 0 600 700"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        @mousemove="onSvgMouseMove"
        @touchstart.passive="onSvgTouch"
      >
        <defs>
          <marker id="lmArrPurple" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#6B58FF" opacity="0.65"/></marker>
          <marker id="lmArrBlue" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#2563EB" opacity="0.65"/></marker>
          <marker id="lmArrRed" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#DC2626" opacity="0.65"/></marker>
          <marker id="lmArrTeal" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#0891B2" opacity="0.65"/></marker>
          <marker id="lmArrViolet" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#8B5CF6" opacity="0.65"/></marker>
          <marker id="lmArrGreen" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#16A34A" opacity="0.65"/></marker>
          <marker id="lmArrOrange" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#EA580C" opacity="0.65"/></marker>
          <filter id="lmShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.06"/></filter>
        </defs>

        <!-- Group zones -->
        <g v-for="z in zones" :key="z.group"
           class="group-zone" :class="{ dimmed: isZoneDimmed(z.group) }">
          <rect :x="z.x" :y="z.y" :width="z.w" :height="z.h" :rx="z.rx"
                :fill="GRP_COLORS[z.group].bg" :stroke="GRP_COLORS[z.group].border"
                stroke-width="1" stroke-dasharray="6 3" />
          <text :x="z.x + 14" :y="z.y + 16" font-family="Fira Sans,sans-serif"
                font-size="11" font-weight="600" :fill="GRP_COLORS[z.group].color" opacity="0.7">
            {{ t.groups[z.group] }}
          </text>
        </g>

        <!-- Edges -->
        <path v-for="e in edgePaths" :key="`${e.from}-${e.to}`"
              :d="e.d" fill="none"
              :class="['edge', e.type === 'path' ? 'edge-path' : 'edge-related',
                        { dimmed: isEdgeDimmed(e.from, e.to), highlighted: isEdgeHighlighted(e.from, e.to) }]"
              :stroke="e.type === 'path' ? e.groupColor : '#94A3B8'"
              :stroke-width="e.type === 'path' ? 2 : 1.5"
              :stroke-dasharray="e.type === 'related' ? '5 4' : undefined"
              :opacity="e.type === 'path' ? 0.5 : 0.25"
              :marker-end="e.type === 'path' ? `url(#${ARROW_IDS[nodeMap[e.from].group]})` : undefined"
              :style="e.type === 'path' ? { animationDelay: e.index * 0.05 + 's' } : undefined"
        />

        <!-- Nodes -->
        <g v-for="n in nodesDef" :key="n.id"
           class="lm-node" :data-id="n.id"
           :class="{ dimmed: isNodeDimmed(n.id), highlighted: isNodeHighlighted(n.id) }"
           @mouseenter="(ev) => onNodeEnter(n.id, ev)"
           @mouseleave="onNodeLeave"
           @click="onNodeClick(n.id)"
           style="cursor: pointer;"
        >
          <clipPath :id="`lmc-${n.id}`">
            <rect :x="n.cx - n.w/2" :y="n.cy - n.h/2" :width="n.w" :height="n.h" :rx="Math.min(n.h/2, 14)" />
          </clipPath>
          <rect class="node-bg node-fill" :x="n.cx - n.w/2" :y="n.cy - n.h/2" :width="n.w" :height="n.h"
                :rx="Math.min(n.h/2, 14)"
                :stroke="GRP_COLORS[n.group].border" stroke-width="1.5" filter="url(#lmShadow)" />
          <rect :x="n.cx - n.w/2" :y="n.cy - n.h/2" width="4" :height="n.h" rx="2"
                :fill="GRP_COLORS[n.group].color" opacity="0.7" :clip-path="`url(#lmc-${n.id})`" />
          <text :x="n.cx + 2" :y="n.cy" text-anchor="middle" dominant-baseline="central"
                font-family="Fira Sans,sans-serif" font-size="13" font-weight="600"
                :fill="GRP_COLORS[n.group].color" pointer-events="none">
            {{ t.nodes[n.id]?.title || n.id }}
          </text>
          <!-- Order badge -->
          <g v-if="n.order" class="order-badge-g" :style="{ animationDelay: n.order * 0.08 + 's', transformOrigin: `${n.cx + n.w/2 - 2}px ${n.cy - n.h/2 - 2}px` }">
            <circle :cx="n.cx + n.w/2 - 2" :cy="n.cy - n.h/2 - 2" r="11" :fill="GRP_COLORS[n.group].color" />
            <text :x="n.cx + n.w/2 - 2" :y="n.cy - n.h/2 - 2" text-anchor="middle" dominant-baseline="central"
                  font-family="Fira Sans,sans-serif" font-size="9" font-weight="700" class="badge-text" pointer-events="none">
              {{ n.order }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <!-- Desktop tooltip -->
    <div v-if="!isMobile && tipVisible && hoveredId" class="lm-tooltip visible"
         :style="{ left: tipX + 'px', top: tipY + 'px' }">
      <div class="tt-title">{{ t.nodes[hoveredId]?.title }}</div>
      <div class="tt-desc">{{ t.nodes[hoveredId]?.desc }}</div>
      <div class="tt-group" :style="{ color: GRP_COLORS[nodeMap[hoveredId].group].color }">
        {{ t.groups[nodeMap[hoveredId].group] }}
      </div>
      <div v-if="nodeMap[hoveredId].order" class="tt-order"
           :style="{ color: GRP_COLORS[nodeMap[hoveredId].group].color }">
        {{ t.stepFormat(nodeMap[hoveredId].order!) }}
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
      <div class="sh-title" :style="{ color: GRP_COLORS[nodeMap[sheetNodeId].group].color }">
        {{ t.nodes[sheetNodeId]?.title }}
      </div>
      <div class="sh-desc">{{ t.nodes[sheetNodeId]?.desc }}</div>
      <div class="sh-group" :style="{ color: GRP_COLORS[nodeMap[sheetNodeId].group].color }">
        {{ t.groups[nodeMap[sheetNodeId].group] }}
      </div>
      <div v-if="nodeMap[sheetNodeId].order" class="sh-order"
           :style="{ color: GRP_COLORS[nodeMap[sheetNodeId].group].color }">
        {{ t.stepFormat(nodeMap[sheetNodeId].order!) }}
      </div>
      <div class="sh-code" v-html="getNodeCodeHtml(sheetNodeId)"></div>
      <div v-if="subPages[sheetNodeId]" class="sh-links">
        <a v-for="sp in subPages[sheetNodeId]" :key="sp.urlSuffix"
           :href="`/${currentLang}${sp.urlSuffix}`">{{ sp.label }}</a>
      </div>
      <a class="sh-btn" :href="`/${currentLang}${nodeMap[sheetNodeId].urlSuffix}`">{{ t.openDoc }}</a>
    </div>

    <a class="lm-link" :href="`/${currentLang}/interactive/learning-map.html`">{{ t.fullVersion }}</a>
  </div>
</template>

<style scoped>
.learning-map-wrap {
  width: 100%;
  max-width: 660px;
  margin: 0 auto;
}
.lm-hint {
  text-align: center;
  font-size: 0.85em;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
}
.lm-container {
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl, 12px);
  background: var(--color-bg-subtle);
  overflow: hidden;
}
.lm-container svg {
  display: block;
  width: 100%;
  height: auto;
}
.lm-link {
  display: block;
  text-align: center;
  margin-top: 10px;
  font-size: 0.85em;
}

/* Node fills — use CSS for theme-aware SVG colors */
.node-fill { fill: var(--color-bg); }
.badge-text { fill: #fff; }

/* Node transitions */
.lm-node { transition: opacity 0.25s; }
.lm-node.dimmed { opacity: 0.12; }
.lm-node .node-bg { transition: stroke-width 0.2s, filter 0.2s; }
.lm-node.highlighted .node-bg { stroke-width: 2.5; }

/* Edge transitions */
.edge { transition: opacity 0.25s; }
.edge.dimmed { opacity: 0.04 !important; }
.edge.highlighted { opacity: 0.8 !important; stroke-width: 2.5 !important; }

/* Zone transitions */
.group-zone { opacity: 0.75; transition: opacity 0.3s; }
.group-zone.dimmed { opacity: 0.05; }

/* Badge animation */
@keyframes lmBadgePop {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.order-badge-g { opacity: 0; animation: lmBadgePop 0.35s ease forwards; }

/* Edge draw animation */
@keyframes lmEdgeDraw {
  from { stroke-dashoffset: 800; }
  to { stroke-dashoffset: 0; }
}
.edge-path { stroke-dasharray: 800; animation: lmEdgeDraw 1.2s ease forwards; }

/* Tooltip */
.lm-tooltip {
  position: fixed; pointer-events: none;
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 10px); padding: 10px 14px;
  font-size: 0.82em; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  z-index: 100; opacity: 0; transition: opacity 0.18s;
  max-width: 320px; line-height: 1.45;
}
.lm-tooltip.visible { opacity: 1; }
.tt-title { font-weight: 700; margin-bottom: 2px; font-size: 1.05em; }
.tt-desc { color: var(--color-text-secondary); margin-bottom: 4px; }
.tt-group { font-size: 0.88em; font-weight: 500; }
.tt-order { font-size: 0.85em; margin-top: 3px; font-weight: 600; }
.tt-code {
  margin-top: 6px; padding: 6px 8px; background: var(--color-code-bg);
  border-radius: 6px; font-family: 'Fira Mono', monospace;
  font-size: 0.82em; line-height: 1.5; color: var(--color-text);
  white-space: pre; overflow-x: auto; border: 1px solid var(--color-border);
}
:deep(.tt-code .kw) { color: #7C3AED; font-weight: 600; }
:deep(.tt-code .fn) { color: #2563EB; }
:deep(.tt-code .str) { color: #16A34A; }
:deep(.tt-code .var) { color: #0891B2; }
:deep(.tt-code .cm) { color: #9CA3AF; font-style: italic; }
:deep(.tt-code .num) { color: #EA580C; }
.tt-sub {
  font-size: 0.85em; margin-top: 5px; color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border); padding-top: 5px;
}
.tt-sub a {
  display: block; color: var(--color-primary); text-decoration: none; padding: 1px 0;
}
.tt-sub a:hover { text-decoration: underline; }

/* Mobile bottom sheet */
.lm-sheet-overlay {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 199;
}
.lm-sheet-overlay.visible { display: block; }
.lm-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; background: var(--color-bg);
  border-radius: 16px 16px 0 0; box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
  z-index: 200; transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  max-height: 70vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 0 20px 20px;
}
.lm-sheet.visible { transform: translateY(0); }
.sh-header {
  display: flex; align-items: center; justify-content: center;
  padding: 10px 0 6px; position: sticky; top: 0; background: var(--color-bg); z-index: 1;
}
.sh-handle { flex: 1; display: flex; justify-content: center; cursor: grab; }
.sh-handle span { display: block; width: 36px; height: 4px; border-radius: 2px; background: #D1D5DB; }
.sh-close {
  position: absolute; right: 12px; top: 8px;
  width: 32px; height: 32px; border: none; background: var(--color-bg-subtle);
  border-radius: 50%; cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: var(--color-text-muted); transition: all 0.15s;
  font-size: 18px; line-height: 1;
}
.sh-close:hover { background: var(--color-border); color: var(--color-text); }
.sh-title { font-weight: 700; font-size: 1.15em; margin-bottom: 2px; }
.sh-desc { color: var(--color-text-secondary); font-size: 0.92em; margin-bottom: 6px; }
.sh-group { font-size: 0.85em; font-weight: 500; margin-bottom: 2px; }
.sh-order { font-size: 0.85em; font-weight: 600; margin-bottom: 8px; }
.sh-code {
  padding: 8px 10px; background: var(--color-code-bg); border-radius: 8px;
  font-family: 'Fira Mono', monospace; font-size: 0.82em; line-height: 1.5;
  color: var(--color-text); white-space: pre; overflow-x: auto; border: 1px solid var(--color-border); margin-bottom: 10px;
}
:deep(.sh-code .kw) { color: #7C3AED; font-weight: 600; }
:deep(.sh-code .fn) { color: #2563EB; }
:deep(.sh-code .str) { color: #16A34A; }
:deep(.sh-code .var) { color: #0891B2; }
:deep(.sh-code .cm) { color: #9CA3AF; font-style: italic; }
:deep(.sh-code .num) { color: #EA580C; }
.sh-links {
  display: flex; flex-direction: column; gap: 2px; font-size: 0.9em;
  border-top: 1px solid var(--color-border); padding-top: 8px; margin-bottom: 10px;
}
.sh-links a { color: var(--color-primary); text-decoration: none; padding: 4px 0; }
.sh-btn {
  display: block; width: 100%; padding: 12px; background: var(--color-primary);
  color: #fff; border: none; border-radius: 10px; font-family: inherit;
  font-size: 0.95em; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none;
}

@media (max-width: 768px) {
  .lm-container { overflow-y: auto; }
  .lm-tooltip { display: none !important; }
  .lm-hint { font-size: 0.8em; }
}
</style>
