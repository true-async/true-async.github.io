<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vitepress'
import { CURRENT_VERSION } from './version'
import { roadmap } from './roadmapData'
import { roadmapI18n } from './roadmapI18n'
import { tutorialStrings } from './tutorialData'
import { CORE_SLUGS, SERVER_SLUGS } from './tutorialProgress'

const route = useRoute()

const currentLang = computed(() => {
  const match = route.path.match(/^\/(en|ru|de|fr|es|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
})

// ---------------------------------------------------------------------------
// SHARED STRUCTURE (locale-independent). Icons, link slugs, styles and colours
// live here ONCE. Per-locale data below carries ONLY translatable strings, in
// the same order as these arrays. This is what keeps every language on the same
// design — editing the layout here updates all 9 locales at once.
// ---------------------------------------------------------------------------
interface ButtonMeta { slug: string; style: string; icon?: string; external?: boolean }
interface FeatureMeta { icon: string; slug: string }
interface GuideMeta { series: 'core' | 'server'; index: number; tagColor: string; time: number }

const heroButtonsMeta: ButtonMeta[] = [
  { slug: 'docs.html', style: 'primary', icon: 'arrow' },
  { slug: 'interactive/coroutine-demo.html', style: 'secondary', external: true },
  { slug: 'download.html', style: 'accent', icon: 'download' },
]
const featureMeta: FeatureMeta[] = [
  { icon: 'coroutines', slug: 'docs/components/coroutines.html' },
  { icon: 'io', slug: 'docs/reference/supported-functions.html' },
  { icon: 'web-servers', slug: 'docs/server/index.html' },
  { icon: 'cancellation', slug: 'docs/components/cancellation.html' },
  { icon: 'structured-concurrency', slug: 'docs/components/scope.html' },
  { icon: 'pdo-pool', slug: 'docs/components/pdo-pool.html' },
  { icon: 'channel', slug: 'docs/components/channels.html' },
  { icon: 'futures', slug: 'docs/components/future.html' },
  { icon: 'mobile', slug: 'docs/mobile/index.html' },
]
// Curated tutorials for the home page: a spread across both series. `index` is
// the position in tutorialStrings.core / .server; title + body are pulled from
// there (single source), so only tagColor and reading time live here.
const guideMeta: GuideMeta[] = [
  { series: 'core', index: 0, tagColor: 'purple', time: 6 },   // Coroutines
  { series: 'core', index: 7, tagColor: 'purple', time: 8 },   // Scope
  { series: 'core', index: 8, tagColor: 'orange', time: 7 },   // PDO Pool
  { series: 'core', index: 13, tagColor: 'blue', time: 9 },    // Threads
  { series: 'server', index: 0, tagColor: 'teal', time: 10 },  // First server
  { series: 'server', index: 6, tagColor: 'teal', time: 8 },   // WebSocket
]

// ---------------------------------------------------------------------------
// PER-LOCALE STRINGS ONLY. Arrays align by index with the *Meta arrays above.
// The guides section only carries its own chrome here (title/heading/etc. plus
// the localized "server" tag and time unit); each card's title and body are
// pulled from tutorialStrings, so the tutorial translations are the one source.
// ---------------------------------------------------------------------------
interface FeatureStr { title: string; text: string }
interface HeroStr { badge: string; title: string; slogan: string; description: string; buttons: [string, string, string] }
interface HomeStrings {
  hero: HeroStr
  features: { title: string; heading: string; items: FeatureStr[] }
  // Card title/body come from tutorialStrings; only the section chrome + the
  // localized "server" tag word and time unit live here. timeUnit carries its
  // own leading space where the language wants one (e.g. ' min' vs ko '분').
  guides: { title: string; heading: string; description: string; readMore: string; serverTag: string; timeUnit: string }
}

const guidesEn = {
  title: 'Guides & Articles',
  heading: 'Learn TrueAsync in practice',
  description: 'Hands-on guides, from your first coroutine to structured concurrency and the built-in server.',
  readMore: 'Read tutorial',
  serverTag: 'Server',
  timeUnit: ' min',
}

const strings: Record<string, HomeStrings> = {
  en: {
    hero: {
      badge: 'Experimental Core',
      title: 'True Asynchronous inside <span class="hero-accent">PHP</span>',
      slogan: 'Write sync. Run async.',
      description: 'Coroutines, non-blocking I/O, and structured concurrency, built into the language core. Write high-performance concurrent code with familiar functions and minimal changes.',
      buttons: ['Get Started', 'How Coroutines Work', 'Download'],
    },
    features: {
      title: 'Key Features',
      heading: 'Production-oriented API',
      items: [
        { title: 'Coroutines', text: 'Lightweight coroutines for efficient concurrent execution. No colored <code>async</code> functions. Just do <code>spawn()</code> and go!' },
        { title: 'Non-blocking I/O', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Regular PHP functions now work asynchronously without extra effort.' },
        { title: 'TrueAsync Server', text: 'Native <code>HTTP/1.1</code>, <code>HTTP/2</code>, and <code>HTTP/3</code> web server written in C, running directly inside the PHP process.' },
        { title: 'Cooperative Cancellation', text: 'Simple and flexible <code>API</code> for coroutine cancellation. <code>Scope::cancel()</code>.' },
        { title: 'Structured Concurrency', text: 'Control coroutine lifetime with <code>Scope</code> sandbox. Manage groups of coroutines via <code>TaskGroup</code>.' },
        { title: 'PDO Pool', text: 'Connection pooling built right into <code>PDO</code>. Automatic connection management for maximum performance.' },
        { title: 'Channel · ThreadPool', text: 'Data exchange between coroutines. Buffered and unbuffered channels for producer/consumer patterns. Cross-thread via <code>ThreadChannel</code>; parallel CPU tasks via <code>Thread</code> and <code>ThreadPool</code>.' },
        { title: 'Futures', text: 'Deferred results for asynchronous computations. Composition via <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', text: 'Android support at the PHP core level: an asynchronous runtime inside a native app via <code>native-bridge</code>.' },
      ],
    },
    guides: guidesEn,
  },
  ru: {
    hero: {
      badge: 'Экспериментальное ядро',
      title: 'Настоящая асинхронность внутри <span class="hero-accent">PHP</span>',
      slogan: 'Пиши синхронно. Выполняй асинхронно.',
      description: 'Представьте PHP с корутинами, где знакомые функции поддерживают конкурентный ввод вывод. Создавайте высокопроизводительные конкурентные приложения с чистым, читаемым кодом и минимумом изменений!',
      buttons: ['Начать работу', 'Как работают корутины', 'Скачать'],
    },
    features: {
      title: 'Ключевые возможности',
      heading: 'API, ориентированный на продакшен',
      items: [
        { title: 'Корутины', text: 'Лёгкие корутины для эффективного конкурентного выполнения. Никаких цветных <code>async</code> функций. Просто делай <code>spawn()</code> и вперёд!' },
        { title: 'Неблокирующий I/O', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Обычные функции PHP теперь работают асинхронно без дополнительных усилий.' },
        { title: 'TrueAsync Server', text: 'Нативный Web-сервер на C с поддержкой <code>HTTP/1.1</code>, <code>HTTP/2</code> и <code>HTTP/3</code> прямо внутри PHP-процесса.' },
        { title: 'Кооперативная отмена', text: 'Простой и гибкий <code>API</code> для отмены корутин. <code>Scope::cancel()</code>.' },
        { title: 'Структурная конкурентность', text: 'Контроль времени жизни корутин с помощью песочницы <code>Scope</code>. Управление группой корутин через <code>TaskGroup</code>' },
        { title: 'PDO Pool', text: 'Поддержка пула соединений прямо в <code>PDO</code>. Автоматическое управление коннектами для максимальной производительности.' },
        { title: 'Channel · ThreadPool', text: 'Обмен данными между корутинами. Буферизованные и небуферизованные каналы. Межпотоковая передача через <code>ThreadChannel</code>; параллельные CPU-задачи через <code>Thread</code> и <code>ThreadPool</code>.' },
        { title: 'Futures', text: 'Отложенные результаты для асинхронных вычислений. Композиция через <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', text: 'Поддержка Android на уровне ядра PHP: асинхронный рантайм внутри нативного приложения через <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Руководства и статьи',
      heading: 'Осваивайте TrueAsync на практике',
      description: 'Практические материалы: от первой корутины до структурной конкурентности и встроенного сервера.',
      readMore: 'Читать туториал',
      serverTag: 'Сервер',
      timeUnit: ' мин',
    },
  },
  de: {
    hero: {
      badge: 'Experimentelle Version',
      title: 'Echte Asynchronität in <span class="hero-accent">PHP</span>',
      slogan: 'Synchron schreiben. Asynchron ausführen.',
      description: 'Stellen Sie sich PHP mit Koroutinen vor, bei dem vertraute Funktionen nebenläufige Ein-/Ausgabe unterstützen. Erstellen Sie hochperformante nebenläufige Anwendungen mit sauberem, lesbarem Code und minimalen Änderungen!',
      buttons: ['Erste Schritte', 'Wie Koroutinen funktionieren', 'Herunterladen'],
    },
    features: {
      title: 'Hauptfunktionen',
      heading: 'Produktionsreife API',
      items: [
        { title: 'Koroutinen', text: 'Leichtgewichtige Koroutinen für effiziente nebenläufige Ausführung. Keine gefärbten <code>async</code>-Funktionen. Einfach <code>spawn()</code> und los!' },
        { title: 'Nicht-blockierende I/O', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Gewöhnliche PHP-Funktionen arbeiten jetzt asynchron ohne zusätzlichen Aufwand.' },
        { title: 'TrueAsync Server', text: 'Nativer Webserver in C mit Unterstützung für <code>HTTP/1.1</code>, <code>HTTP/2</code> und <code>HTTP/3</code>, direkt im PHP-Prozess.' },
        { title: 'Kooperative Abbruchsteuerung', text: 'Einfache und flexible <code>API</code> zum Abbrechen von Koroutinen. <code>Scope::cancel()</code>.' },
        { title: 'Strukturierte Nebenläufigkeit', text: 'Kontrolle der Lebensdauer von Koroutinen mit der <code>Scope</code>-Sandbox. Verwaltung von Koroutinen-Gruppen über <code>TaskGroup</code>.' },
        { title: 'PDO Pool', text: 'Verbindungs-Pooling direkt in <code>PDO</code> eingebaut. Automatische Verbindungsverwaltung für maximale Leistung.' },
        { title: 'Channel · ThreadPool', text: 'Datenaustausch zwischen Koroutinen. Gepufferte und ungepufferte Kanäle für Producer/Consumer-Muster. Thread-übergreifend via <code>ThreadChannel</code>; parallele CPU-Aufgaben via <code>Thread</code> und <code>ThreadPool</code>.' },
        { title: 'Futures', text: 'Verzögerte Ergebnisse für asynchrone Berechnungen. Komposition über <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', text: 'Android-Unterstützung auf PHP-Kernebene: ein asynchroner Runtime innerhalb einer nativen App über <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Anleitungen & Artikel',
      heading: 'TrueAsync in der Praxis lernen',
      description: 'Praxisnahe Anleitungen, von deiner ersten Koroutine bis zu strukturierter Nebenläufigkeit und dem integrierten Server.',
      readMore: 'Tutorial lesen',
      serverTag: 'Server',
      timeUnit: ' Min.',
    },
  },
  es: {
    hero: {
      badge: 'Versión experimental',
      title: 'Asincronía real dentro de <span class="hero-accent">PHP</span>',
      slogan: 'Escribe síncrono. Ejecuta asíncrono.',
      description: 'Imagina PHP con corrutinas, donde las funciones habituales soportan E/S concurrente. ¡Crea aplicaciones concurrentes de alto rendimiento con código limpio, legible y cambios mínimos!',
      buttons: ['Comenzar', 'Cómo funcionan las corrutinas', 'Descargar'],
    },
    features: {
      title: 'Características principales',
      heading: 'API lista para producción',
      items: [
        { title: 'Corrutinas', text: 'Corrutinas ligeras para una ejecución concurrente eficiente. Sin funciones <code>async</code> coloreadas. Simplemente haz <code>spawn()</code> y listo.' },
        { title: 'I/O no bloqueante', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Las funciones habituales de PHP ahora funcionan de forma asíncrona sin esfuerzo adicional.' },
        { title: 'TrueAsync Server', text: 'Servidor web nativo en C con soporte para <code>HTTP/1.1</code>, <code>HTTP/2</code> y <code>HTTP/3</code>, directamente dentro del proceso PHP.' },
        { title: 'Cancelación cooperativa', text: '<code>API</code> simple y flexible para cancelar corrutinas. <code>Scope::cancel()</code>.' },
        { title: 'Concurrencia estructurada', text: 'Control del ciclo de vida de las corrutinas mediante el sandbox <code>Scope</code>. Gestión de grupos de corrutinas con <code>TaskGroup</code>.' },
        { title: 'PDO Pool', text: 'Pool de conexiones integrado directamente en <code>PDO</code>. Gestión automática de conexiones para máximo rendimiento.' },
        { title: 'Channel · ThreadPool', text: 'Intercambio de datos entre corrutinas. Canales con y sin búfer para patrones producer/consumer. Entre hilos via <code>ThreadChannel</code>; tareas CPU paralelas con <code>Thread</code> y <code>ThreadPool</code>.' },
        { title: 'Futures', text: 'Resultados diferidos para cálculos asíncronos. Composición mediante <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', text: 'Soporte de Android a nivel del núcleo de PHP: un runtime asíncrono dentro de una app nativa mediante <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guías y artículos',
      heading: 'Aprende TrueAsync en la práctica',
      description: 'Guías prácticas, desde tu primera corrutina hasta la concurrencia estructurada y el servidor integrado.',
      readMore: 'Leer el tutorial',
      serverTag: 'Servidor',
      timeUnit: ' min',
    },
  },
  fr: {
    hero: {
      badge: 'Version expérimentale',
      title: 'Véritable asynchrone dans <span class="hero-accent">PHP</span>',
      slogan: 'Écrivez synchrone. Exécutez asynchrone.',
      description: 'Imaginez PHP avec des coroutines, où les fonctions familières prennent en charge les E/S concurrentes. Créez des applications concurrentes haute performance avec un code propre et lisible, et un minimum de modifications !',
      buttons: ['Commencer', 'Comment fonctionnent les coroutines', 'Télécharger'],
    },
    features: {
      title: 'Fonctionnalités clés',
      heading: 'API prête pour la production',
      items: [
        { title: 'Coroutines', text: 'Des coroutines légères pour une exécution concurrente efficace. Pas de fonctions <code>async</code> colorées. Faites simplement <code>spawn()</code> et c\'est parti !' },
        { title: 'I/O non bloquante', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Les fonctions PHP classiques fonctionnent désormais de manière asynchrone sans effort supplémentaire.' },
        { title: 'TrueAsync Server', text: 'Serveur web natif en C avec prise en charge de <code>HTTP/1.1</code>, <code>HTTP/2</code> et <code>HTTP/3</code>, directement à l\'intérieur du processus PHP.' },
        { title: 'Annulation coopérative', text: '<code>API</code> simple et flexible pour l\'annulation des coroutines. <code>Scope::cancel()</code>.' },
        { title: 'Concurrence structurée', text: 'Contrôle du cycle de vie des coroutines grâce au bac à sable <code>Scope</code>. Gestion de groupes de coroutines via <code>TaskGroup</code>.' },
        { title: 'PDO Pool', text: 'Pool de connexions intégré directement dans <code>PDO</code>. Gestion automatique des connexions pour des performances maximales.' },
        { title: 'Channel · ThreadPool', text: 'Échange de données entre coroutines. Canaux avec et sans tampon pour les patrons producteur/consommateur. Entre threads via <code>ThreadChannel</code> ; tâches CPU parallèles via <code>Thread</code> et <code>ThreadPool</code>.' },
        { title: 'Futures', text: 'Résultats différés pour les calculs asynchrones. Composition via <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', text: 'Prise en charge d\'Android au niveau du cœur de PHP : un runtime asynchrone au sein d\'une application native via <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guides et articles',
      heading: 'Apprenez TrueAsync en pratique',
      description: 'Des guides pratiques, de votre première coroutine à la concurrence structurée et au serveur intégré.',
      readMore: 'Lire le tutoriel',
      serverTag: 'Serveur',
      timeUnit: ' min',
    },
  },
  it: {
    hero: {
      badge: 'Versione sperimentale',
      title: 'Vera asincronicità dentro <span class="hero-accent">PHP</span>',
      slogan: 'Scrivi sincrono. Esegui asincrono.',
      description: 'Immagina PHP con coroutine, dove le funzioni familiari supportano l\'I/O concorrente. Crea applicazioni concorrenti ad alte prestazioni con codice pulito, leggibile e modifiche minime!',
      buttons: ['Inizia', 'Come funzionano le coroutine', 'Scarica'],
    },
    features: {
      title: 'Funzionalità principali',
      heading: 'API pronta per la produzione',
      items: [
        { title: 'Coroutine', text: 'Coroutine leggere per un\'esecuzione concorrente efficiente. Nessuna funzione <code>async</code> colorata. Basta fare <code>spawn()</code> e via!' },
        { title: 'I/O non bloccante', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Le normali funzioni PHP ora funzionano in modo asincrono senza sforzo aggiuntivo.' },
        { title: 'TrueAsync Server', text: 'Web server nativo in C con supporto per <code>HTTP/1.1</code>, <code>HTTP/2</code> e <code>HTTP/3</code>, direttamente all\'interno del processo PHP.' },
        { title: 'Cancellazione cooperativa', text: '<code>API</code> semplice e flessibile per la cancellazione delle coroutine. <code>Scope::cancel()</code>.' },
        { title: 'Concorrenza strutturata', text: 'Controllo del ciclo di vita delle coroutine tramite sandbox <code>Scope</code>. Gestione di gruppi di coroutine tramite <code>TaskGroup</code>.' },
        { title: 'PDO Pool', text: 'Pool di connessioni integrato direttamente in <code>PDO</code>. Gestione automatica delle connessioni per le massime prestazioni.' },
        { title: 'Channel · ThreadPool', text: 'Scambio di dati tra coroutine. Canali bufferizzati e non bufferizzati per pattern producer/consumer. Tra thread via <code>ThreadChannel</code>; task CPU paralleli con <code>Thread</code> e <code>ThreadPool</code>.' },
        { title: 'Futures', text: 'Risultati differiti per calcoli asincroni. Composizione tramite <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', text: 'Supporto Android a livello del core di PHP: un runtime asincrono all\'interno di un\'app nativa tramite <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guide e articoli',
      heading: 'Impara TrueAsync nella pratica',
      description: 'Guide pratiche, dalla tua prima coroutine alla concorrenza strutturata e al server integrato.',
      readMore: 'Leggi il tutorial',
      serverTag: 'Server',
      timeUnit: ' min',
    },
  },
  ko: {
    hero: {
      badge: '실험 버전',
      title: '<span class="hero-accent">PHP</span> 안에 진정한 비동기',
      slogan: '동기로 작성하고, 비동기로 실행하세요.',
      description: '익숙한 함수가 동시 I/O를 지원하는 코루틴이 있는 PHP를 상상해 보세요. 깨끗하고 읽기 쉬운 코드와 최소한의 변경으로 고성능 동시성 애플리케이션을 구축하세요!',
      buttons: ['시작하기', '코루틴 작동 방식', '다운로드'],
    },
    features: {
      title: '주요 기능',
      heading: '프로덕션 준비된 API',
      items: [
        { title: '코루틴', text: '효율적인 동시 실행을 위한 경량 코루틴. 컬러드 <code>async</code> 함수 없음. <code>spawn()</code>만 하면 됩니다!' },
        { title: '논블로킹 I/O', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. 일반 PHP 함수가 추가 노력 없이 비동기로 작동합니다.' },
        { title: 'TrueAsync Server', text: 'C로 작성된 네이티브 웹 서버. <code>HTTP/1.1</code>, <code>HTTP/2</code>, <code>HTTP/3</code>을 PHP 프로세스 내부에서 직접 처리합니다.' },
        { title: '협력적 취소', text: '코루틴 취소를 위한 간단하고 유연한 <code>API</code>. <code>Scope::cancel()</code>.' },
        { title: '구조적 동시성', text: '<code>Scope</code> 샌드박스로 코루틴 수명을 제어하세요. <code>TaskGroup</code>으로 코루틴 그룹을 관리하세요.' },
        { title: 'PDO Pool', text: '<code>PDO</code>에 내장된 연결 풀링. 최대 성능을 위한 자동 연결 관리.' },
        { title: 'Channel · ThreadPool', text: '코루틴 간의 데이터 교환. 생산자/소비자 패턴을 위한 버퍼링 및 비버퍼링 채널. <code>ThreadChannel</code>로 OS 스레드 간 통신, <code>Thread</code>·<code>ThreadPool</code>로 병렬 CPU 작업.' },
        { title: 'Futures', text: '비동기 계산을 위한 지연 결과. <code>await_all</code>, <code>await_first</code>를 통한 조합.' },
        { title: 'PHP Mobile', text: 'PHP 코어 수준의 Android 지원: <code>native-bridge</code>를 통해 네이티브 앱 내부에서 실행되는 비동기 런타임.' },
      ],
    },
    guides: {
      title: '가이드 & 아티클',
      heading: 'TrueAsync를 실전으로 배우기',
      description: '첫 코루틴부터 구조적 동시성과 내장 서버까지, 실습 중심의 가이드입니다.',
      readMore: '튜토리얼 읽기',
      serverTag: '서버',
      timeUnit: '분',
    },
  },
  uk: {
    hero: {
      badge: 'Експериментальна версія',
      title: 'Справжня асинхронність всередині <span class="hero-accent">PHP</span>',
      slogan: 'Пиши синхронно. Виконуй асинхронно.',
      description: 'Уявіть PHP з корутинами, де знайомі функції підтримують конкурентне введення-виведення. Створюйте високопродуктивні конкурентні застосунки з чистим, зрозумілим кодом і мінімумом змін!',
      buttons: ['Почати роботу', 'Як працюють корутини', 'Завантажити'],
    },
    features: {
      title: 'Ключові можливості',
      heading: 'API, орієнтований на продакшен',
      items: [
        { title: 'Корутини', text: 'Легкі корутини для ефективного конкурентного виконання. Жодних кольорових <code>async</code> функцій. Просто роби <code>spawn()</code> і вперед!' },
        { title: 'Неблокуючий I/O', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Звичайні функції PHP тепер працюють асинхронно без додаткових зусиль.' },
        { title: 'TrueAsync Server', text: 'Нативний Web-сервер на C з підтримкою <code>HTTP/1.1</code>, <code>HTTP/2</code> і <code>HTTP/3</code> прямо всередині PHP-процесу.' },
        { title: 'Кооперативне скасування', text: 'Простий і гнучкий <code>API</code> для скасування корутин. <code>Scope::cancel()</code>.' },
        { title: 'Структурна конкурентність', text: 'Контроль часу життя корутин за допомогою пісочниці <code>Scope</code>. Керування групами корутин через <code>TaskGroup</code>.' },
        { title: 'PDO Pool', text: 'Пул з\'єднань вбудований прямо в <code>PDO</code>. Автоматичне керування з\'єднаннями для максимальної продуктивності.' },
        { title: 'Channel · ThreadPool', text: 'Обмін даними між корутинами. Буферизовані та небуферизовані канали. Між потоками через <code>ThreadChannel</code>; паралельні CPU-задачі через <code>Thread</code> і <code>ThreadPool</code>.' },
        { title: 'Futures', text: 'Відкладені результати для асинхронних обчислень. Композиція через <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', text: 'Підтримка Android на рівні ядра PHP: асинхронний рантайм всередині нативного застосунку через <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Посібники та статті',
      heading: 'Опановуйте TrueAsync на практиці',
      description: 'Практичні матеріали: від першої корутини до структурної конкурентності та вбудованого сервера.',
      readMore: 'Читати туторіал',
      serverTag: 'Сервер',
      timeUnit: ' хв',
    },
  },
  zh: {
    hero: {
      badge: '实验版本',
      title: '<span class="hero-accent">PHP</span> 内部的真正异步',
      slogan: '同步编写，异步运行。',
      description: '想象一下，PHP 拥有协程，熟悉的函数支持并发 I/O。用简洁、可读的代码和最少的改动构建高性能并发应用程序！',
      buttons: ['开始使用', '协程工作原理', '下载'],
    },
    features: {
      title: '核心功能',
      heading: '生产就绪的 API',
      items: [
        { title: '协程', text: '轻量级协程，实现高效并发执行。没有带颜色的 <code>async</code> 函数。只需调用 <code>spawn()</code> 即可开始！' },
        { title: '非阻塞 I/O', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. 普通 PHP 函数无需额外操作即可异步运行。' },
        { title: 'TrueAsync Server', text: '使用 C 编写的原生 Web 服务器，直接在 PHP 进程内支持 <code>HTTP/1.1</code>、<code>HTTP/2</code> 与 <code>HTTP/3</code>。' },
        { title: '协作式取消', text: '简单灵活的 <code>API</code>，用于取消协程。<code>Scope::cancel()</code>。' },
        { title: '结构化并发', text: '通过沙箱 <code>Scope</code> 控制协程的生命周期。通过 <code>TaskGroup</code> 管理协程组。' },
        { title: 'PDO 连接池', text: '直接内置于 <code>PDO</code> 的连接池。自动管理连接以实现最佳性能。' },
        { title: '通道 · ThreadPool', text: '协程之间的数据交换。缓冲和非缓冲通道支持生产者/消费者模式。跨线程通过 <code>ThreadChannel</code>；并行 CPU 任务通过 <code>Thread</code> 和 <code>ThreadPool</code>。' },
        { title: 'Futures', text: '异步计算的延迟结果。通过 <code>await_all</code>, <code>await_first</code> 进行组合。' },
        { title: 'PHP Mobile', text: '在 PHP 核心层面支持 Android：通过 <code>native-bridge</code> 在原生应用内运行异步运行时。' },
      ],
    },
    guides: {
      title: '指南与文章',
      heading: '在实践中学习 TrueAsync',
      description: '实践指南，从你的第一个协程到结构化并发以及内置服务器。',
      readMore: '阅读教程',
      serverTag: '服务器',
      timeUnit: ' 分钟',
    },
  },
}

// Merge shared structure + per-locale strings into the shape the template uses.
function buildHome(lang: string, s: HomeStrings) {
  const abs = (slug: string) => (slug.startsWith('http') ? slug : `/${lang}/${slug}`)
  return {
    hero: {
      badge: s.hero.badge,
      title: s.hero.title,
      slogan: s.hero.slogan,
      description: s.hero.description,
      buttons: heroButtonsMeta.map((m, i) => ({
        label: s.hero.buttons[i],
        url: abs(m.slug),
        style: m.style,
        icon: m.icon,
        external: m.external,
      })),
    },
    features: {
      title: s.features.title,
      heading: s.features.heading,
      items: featureMeta.map((m, i) => ({
        title: s.features.items[i].title,
        text: s.features.items[i].text,
        icon: m.icon,
        url: abs(m.slug),
      })),
    },
    guides: {
      title: s.guides.title,
      heading: s.guides.heading,
      description: s.guides.description,
      readMore: s.guides.readMore,
      items: guideMeta.map((m) => {
        const ts = tutorialStrings(lang)
        const entry = m.series === 'core' ? ts.core[m.index] : ts.server[m.index]
        const slug = m.series === 'core'
          ? `tutors/${CORE_SLUGS[m.index]}.html`
          : `tutors-server/${SERVER_SLUGS[m.index]}.html`
        return {
          tag: m.series === 'core' ? ts.coreGroup : s.guides.serverTag,
          time: `${m.time}${s.guides.timeUnit}`,
          title: entry.label,
          body: entry.body,
          tagColor: m.tagColor,
          url: abs(slug),
        }
      }),
    },
  }
}

const t = computed(() => buildHome(currentLang.value, strings[currentLang.value] || strings.en))
const hero = computed(() => t.value.hero)
const features = computed(() => t.value.features)
const guides = computed(() => t.value.guides)

// Hero demo panel — code is language-neutral, same across locales
interface DemoTab {
  key: string; label: string; icon: string; filename: string; code: string
}
const demoTabs: DemoTab[] = [
  {
    key: 'io', label: 'Concurrent I/O', filename: 'concurrent-io.php',
    icon: '<path d="M18 4l3 3-3 3M21 7H9a5 5 0 0 0-5 5M6 20l-3-3 3-3M3 17h12a5 5 0 0 0 5-5"/>',
    code: `<span class="tok-c">// three coroutines run at the same time</span>
<span class="tok-var">$page</span>  = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">file_get_contents</span>(<span class="tok-prop">$url</span>));
<span class="tok-var">$rows</span>  = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-prop">$pdo</span>-><span class="tok-fn">query</span>(<span class="tok-prop">$sql</span>)-><span class="tok-fn">fetchAll</span>());
<span class="tok-var">$stats</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">file_get_contents</span>(<span class="tok-prop">$api</span>));

<span class="tok-c">// wait for all three, cancel after 2s</span>
[<span class="tok-var">$html</span>, <span class="tok-var">$data</span>, <span class="tok-var">$meta</span>] = <span class="tok-fn">await_all_or_fail</span>(
    [<span class="tok-prop">$page</span>, <span class="tok-prop">$rows</span>, <span class="tok-prop">$stats</span>], <span class="tok-fn">timeout</span>(<span class="tok-prop">2000</span>));`,
  },
  {
    key: 'pdo', label: 'PDO Pool', filename: 'pdo-pool.php',
    icon: '<path d="M12 3c4.5 0 8 1.3 8 3s-3.5 3-8 3-8-1.3-8-3 3.5-3 8-3zM4 6v12c0 1.7 3.5 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.5 3 8 3s8-1.3 8-3"/>',
    code: `<span class="tok-c">// pooling is transparent, just switch it on</span>
<span class="tok-var">$pdo</span> = <span class="tok-kw">new</span> <span class="tok-cls">PDO</span>(<span class="tok-prop">$dsn</span>, <span class="tok-prop">$user</span>, <span class="tok-prop">$pass</span>, [
    <span class="tok-cls">PDO</span>::<span class="tok-cls">ATTR_POOL_ENABLED</span> => <span class="tok-kw">true</span>,
    <span class="tok-cls">PDO</span>::<span class="tok-cls">ATTR_POOL_MAX</span>     => <span class="tok-prop">8</span>,
]);

<span class="tok-c">// each coroutine borrows its own connection</span>
<span class="tok-var">$users</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-prop">$pdo</span>-><span class="tok-fn">query</span>(<span class="tok-str">'SELECT * FROM users'</span>));
<span class="tok-var">$stats</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-prop">$pdo</span>-><span class="tok-fn">query</span>(<span class="tok-str">'SELECT * FROM stats'</span>));

[<span class="tok-var">$u</span>, <span class="tok-var">$s</span>] = <span class="tok-fn">await_all_or_fail</span>([<span class="tok-prop">$users</span>, <span class="tok-prop">$stats</span>]);`,
  },
  {
    key: 'threads', label: 'Threads', filename: 'threads.php',
    icon: '<path d="M4 5h16M4 12h16M4 19h16"/>',
    code: `<span class="tok-c">// offload CPU-bound work to a thread pool</span>
<span class="tok-var">$pool</span> = <span class="tok-kw">new</span> <span class="tok-cls">Async\\ThreadPool</span>(workers: <span class="tok-prop">4</span>);

<span class="tok-var">$hash</span> = <span class="tok-prop">$pool</span>-><span class="tok-fn">submit</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">password_hash</span>(<span class="tok-prop">$pw</span>, <span class="tok-cls">PASSWORD_ARGON2ID</span>));
<span class="tok-var">$img</span>  = <span class="tok-prop">$pool</span>-><span class="tok-fn">submit</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">resize_image</span>(<span class="tok-prop">$file</span>));

<span class="tok-c">// runs on real OS threads, in parallel</span>
[<span class="tok-var">$h</span>, <span class="tok-var">$i</span>] = <span class="tok-fn">await_all_or_fail</span>([<span class="tok-prop">$hash</span>, <span class="tok-prop">$img</span>]);`,
  },
  {
    key: 'server', label: 'Web Server', filename: 'server.php',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    code: `<span class="tok-c">// non-blocking HTTP server in pure PHP</span>
<span class="tok-var">$config</span> = (<span class="tok-kw">new</span> <span class="tok-cls">TrueAsync\\HttpServerConfig</span>())
    -><span class="tok-fn">addListener</span>(<span class="tok-str">'0.0.0.0'</span>, <span class="tok-prop">8080</span>);
<span class="tok-var">$server</span> = <span class="tok-kw">new</span> <span class="tok-cls">TrueAsync\\HttpServer</span>(<span class="tok-prop">$config</span>);

<span class="tok-c">// each request runs in its own coroutine</span>
<span class="tok-prop">$server</span>-><span class="tok-fn">addHttpHandler</span>(<span class="tok-kw">fn</span>(<span class="tok-prop">$req</span>, <span class="tok-prop">$res</span>) =>
    <span class="tok-prop">$res</span>-><span class="tok-fn">end</span>(<span class="tok-str">"Hello #"</span> . <span class="tok-cls">Async</span>\\<span class="tok-fn">current_coroutine</span>()-><span class="tok-fn">getId</span>()));

<span class="tok-prop">$server</span>-><span class="tok-fn">start</span>();`,
  },
]
const activeDemoTab = ref(0)

// Homepage roadmap summary = the milestones flagged homepage:true in the shared
// single source of truth (roadmapData.ts). Add/remove there, not here.
const homeMilestones = roadmap.flatMap(s => s.milestones).filter(m => m.homepage)
const roadmapStrings = computed(() => roadmapI18n[currentLang.value] || roadmapI18n.en)
const roadmapTitle = (id: string) => roadmapStrings.value.milestones[id] || roadmapI18n.en.milestones[id] || id
const homeStatus = (status: string) => {
  const ui = roadmapStrings.value.ui
  return status === 'done' ? ui.homeDone : status === 'active' ? ui.homeActive : ui.homePlanned
}

// Feature icons as SVG paths
const iconSvgs: Record<string, string> = {
  'coroutines': '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  'io': '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  'web-servers': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  'cancellation': '<circle cx="12" cy="13" r="9"/><polyline points="12 9 12 13 15 16"/><path d="M12 4V2"/><path d="M16.2 4.8L17.6 3.4"/><path d="M7.8 4.8L6.4 3.4"/>',
  'structured-concurrency': '<rect x="6" y="2" width="12" height="5" rx="1"/><rect x="1" y="17" width="10" height="5" rx="1"/><rect x="13" y="17" width="10" height="5" rx="1"/><path d="M12 7v4"/><path d="M6 13.5h12"/><path d="M6 11v2.5"/><path d="M18 11v2.5"/>',
  'pdo-pool': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  'channel': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  'futures': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  'mobile': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',

}
</script>

<template>
  <!-- Hero -->
  <section class="hero">
    <div class="hero-glow"></div>
    <div class="hero-lines" aria-hidden="true">
      <span class="hero-line hero-line--1"></span>
      <span class="hero-line hero-line--2"></span>
      <span class="hero-line hero-line--3"></span>
    </div>
    <div class="hero-grid">
      <div class="hero-content">
        <div class="hero-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v5.5L4.8 17.4A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 1.7-3.1L14 8.5V3M7.5 14h9"/></svg>
          {{ hero.badge }} · v{{ CURRENT_VERSION }}
        </div>
        <h1 v-html="hero.title"></h1>
        <p v-if="hero.slogan" class="hero-slogan">{{ hero.slogan }}</p>
        <p class="hero-description">{{ hero.description }}</p>
        <div class="hero-actions">
          <a
            v-for="(btn, i) in hero.buttons"
            :key="i"
            :href="btn.url"
            :class="['btn', `btn-${btn.style}`, 'btn-lg']"
            :target="btn.external ? '_blank' : undefined"
            :rel="btn.external ? 'noopener' : undefined"
          >
            <svg v-if="btn.icon === 'download'" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
            {{ btn.label }}
            <svg v-if="btn.icon === 'arrow'" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </div>

      <div class="hero-panel">
        <div class="hero-panel-titlebar">
          <span class="hero-panel-dot hero-panel-dot--red"></span>
          <span class="hero-panel-dot hero-panel-dot--yellow"></span>
          <span class="hero-panel-dot hero-panel-dot--green"></span>
          <span class="hero-panel-filename">{{ demoTabs[activeDemoTab].filename }}</span>
        </div>
        <pre class="hero-panel-code"><code v-html="demoTabs[activeDemoTab].code"></code></pre>
        <div class="hero-panel-tabs">
          <button
            v-for="(tab, i) in demoTabs"
            :key="tab.key"
            type="button"
            :class="['hero-panel-tab', { 'hero-panel-tab--active': i === activeDemoTab }]"
            @click="activeDemoTab = i"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="tab.icon"></svg>
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="features">
    <div class="features-header">
      <div v-if="features.heading" class="section-eyebrow">{{ features.title }}</div>
      <h2>{{ features.heading || features.title }}</h2>
    </div>
    <div class="features-grid">
      <a
        v-for="feature in features.items"
        :key="feature.title"
        :href="feature.url"
        class="feature-card feature-card--link"
      >
        <div class="feature-card-glow"></div>
        <div class="feature-card-head">
          <div class="feature-icon-box">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="iconSvgs[feature.icon]"></svg>
          </div>
          <h3>{{ feature.title }}</h3>
        </div>
        <p v-html="feature.text"></p>
      </a>
    </div>
  </section>

  <!-- Guides & Articles -->
  <section id="tutorial" class="guides">
    <div class="guides-header">
      <div v-if="guides.heading" class="section-eyebrow">{{ guides.title }}</div>
      <h2>{{ guides.heading || guides.title }}</h2>
      <p>{{ guides.description }}</p>
    </div>
    <div class="guides-grid">
      <a
        v-for="lesson in guides.items"
        :key="lesson.title"
        :href="lesson.url"
        class="lesson-card"
      >
        <div class="lesson-card-glow"></div>
        <div class="lesson-card-meta">
          <span :class="['lesson-tag', `lesson-tag--${lesson.tagColor}`]">{{ lesson.tag }}</span>
          <span class="lesson-time">{{ lesson.time }}</span>
        </div>
        <h3>{{ lesson.title }}</h3>
        <p>{{ lesson.body }}</p>
        <div class="lesson-read-more">
          {{ guides.readMore }}
          <svg class="lesson-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
      </a>
    </div>
  </section>

  <!-- Roadmap -->
  <section class="home-roadmap">
    <div class="home-roadmap-inner">
      <div class="home-roadmap-header">
        <h2>{{ roadmapStrings.ui.heading }}</h2>
        <span class="home-roadmap-comment">// {{ roadmapStrings.ui.currentRelease }} v{{ CURRENT_VERSION }}</span>
      </div>
      <div class="home-roadmap-timeline">
        <div
          v-for="m in homeMilestones"
          :key="m.id"
          :class="['home-roadmap-item', `home-roadmap-item--${m.status}`]"
        >
          <div class="home-roadmap-dot"></div>
          <div class="home-roadmap-card">
            <div class="home-roadmap-card-head">
              <span class="home-roadmap-version">v{{ m.version }}</span>
              <span class="home-roadmap-status">{{ homeStatus(m.status) }}</span>
            </div>
            <span class="home-roadmap-title">{{ roadmapTitle(m.id) }}</span>
            <span v-if="m.date" class="home-roadmap-date">{{ m.date }}</span>
            <span v-if="m.tag" :class="['home-roadmap-tag', m.tagStyle ? `home-roadmap-tag--${m.tagStyle}` : '']">{{ m.tag }}</span>
          </div>
        </div>
      </div>
      <a :href="`/${currentLang}/roadmap.html`" class="home-roadmap-link">{{ roadmapStrings.ui.viewFull }} &rarr;</a>
    </div>
  </section>
</template>
