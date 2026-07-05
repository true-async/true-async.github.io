<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()

const currentLang = computed(() => {
  const match = route.path.match(/^\/(en|ru|de|fr|es|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
})

interface HeroButton {
  label: string; url: string; style: string; external?: boolean; icon?: string
}
interface Feature {
  title: string; icon: string; url: string; text: string
}
interface HeroData {
  badge: string; title: string; slogan?: string; description: string; buttons: HeroButton[]
}
interface FeaturesData {
  title: string; heading?: string; items: Feature[]
}
interface Lesson {
  tag: string; tagColor: string; time: string; title: string; body: string; url: string
}
interface GuidesData {
  title: string; heading?: string; description: string; readMore: string; items: Lesson[]
}
interface HomeI18n {
  hero: HeroData; features: FeaturesData; guides: GuidesData
}

const i18n: Record<string, HomeI18n> = {
  en: {
    hero: {
      badge: 'Experimental Core · v0.7.7',
      title: 'True Asynchronous inside <span class="hero-accent">PHP</span>',
      slogan: 'Write sync. Run async.',
      description: 'Coroutines, non-blocking I/O, and structured concurrency, built into the language core. Write high-performance concurrent code with familiar functions and minimal changes.',
      buttons: [
        { label: 'Get Started', url: '/en/docs.html', style: 'primary', icon: 'arrow' },
        { label: 'How Coroutines Work', url: '/en/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Download', url: '/en/download.html', style: 'accent', icon: 'download' },
      ],
    },
    features: {
      title: 'Key Features',
      heading: 'Production-ready API',
      items: [
        { title: 'Coroutines', icon: 'coroutines', url: '/en/docs/components/coroutines.html', text: 'Lightweight coroutines for efficient concurrent execution. No colored <code>async</code> functions. Just do <code>spawn()</code> and go!' },
        { title: 'Non-blocking I/O', icon: 'io', url: '/en/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Regular PHP functions now work asynchronously without extra effort.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/en/docs/server/index.html', text: 'Native <code>HTTP/1.1</code>, <code>HTTP/2</code>, and <code>HTTP/3</code> web server written in C, running directly inside the PHP process.' },
        { title: 'Cooperative Cancellation', icon: 'cancellation', url: '/en/docs/components/cancellation.html', text: 'Simple and flexible <code>API</code> for coroutine cancellation. <code>Scope::cancel()</code>.' },
        { title: 'Structured Concurrency', icon: 'structured-concurrency', url: '/en/docs/components/scope.html', text: 'Control coroutine lifetime with <code>Scope</code> sandbox. Manage groups of coroutines via <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/en/docs/components/pdo-pool.html', text: 'Connection pooling built right into <code>PDO</code>. Automatic connection management for maximum performance.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/en/docs/components/channels.html', text: 'Data exchange between coroutines. Buffered and unbuffered channels for producer/consumer patterns. Cross-thread via <code>ThreadChannel</code>; parallel CPU tasks via <code>Thread</code> and <code>ThreadPool</code>.' },
        { title: 'Futures', icon: 'futures', url: '/en/docs/components/future.html', text: 'Deferred results for asynchronous computations. Composition via <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/en/docs/mobile/index.html', text: 'Android support at the PHP core level: an asynchronous runtime inside a native app via <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      heading: 'Learn TrueAsync in practice',
      description: 'Hands-on guides, from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/en/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/en/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/en/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/en/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/en/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/en/docs/components/channels.html' },
      ],
    },
  },
  ru: {
    hero: {
      badge: 'Экспериментальная версия',
      title: 'Настоящая асинхронность для PHP',
      description: 'Представьте PHP с корутинами, где знакомые функции поддерживают конкурентный ввод вывод. Создавайте высокопроизводительные конкурентные приложения с чистым, читаемым кодом и минимумом изменений!',
      buttons: [
        { label: 'Начать работу', url: '/ru/docs.html', style: 'primary' },
        { label: 'Как работают корутины', url: '/ru/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Скачать', url: '/ru/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: 'Ключевые возможности',
      items: [
        { title: 'Корутины', icon: 'coroutines', url: '/ru/docs/components/coroutines.html', text: 'Лёгкие корутины для эффективного конкурентного выполнения. Никаких цветных <code>async</code> функций. Просто делай <code>spawn()</code> и вперёд!' },
        { title: 'Неблокирующий I/O', icon: 'io', url: '/ru/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Обычные функции PHP теперь работают асинхронно без дополнительных усилий.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/ru/docs/server/index.html', text: 'Нативный Web-сервер на C с поддержкой <code>HTTP/1.1</code>, <code>HTTP/2</code> и <code>HTTP/3</code> прямо внутри PHP-процесса.' },
        { title: 'Корпоративная отмена', icon: 'cancellation', url: '/ru/docs/components/cancellation.html', text: 'Простой и гибкий <code>API</code> для отмены корутин. <code>Scope::cancel()</code>.' },
        { title: 'Структурная конкурентность', icon: 'structured-concurrency', url: '/ru/docs/components/scope.html', text: 'Контроль времени жизни корутин с помощью песочницы <code>Scope</code>. Управление группой корутин через <code>TaskGroup</code>' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/ru/docs/components/pdo-pool.html', text: 'Поддержка пула соединений прямо в <code>PDO</code>. Автоматическое управление коннектами для максимальной производительности.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/ru/docs/components/channels.html', text: 'Обмен данными между корутинами. Буферизованные и небуферизованные каналы. Межпотоковая передача через <code>ThreadChannel</code>; параллельные CPU-задачи через <code>Thread</code> и <code>ThreadPool</code>.' },
        { title: 'Futures', icon: 'futures', url: '/ru/docs/components/future.html', text: 'Отложенные результаты для асинхронных вычислений. Композиция через <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/ru/docs/mobile/index.html', text: 'Поддержка Android на уровне ядра PHP: асинхронный рантайм внутри нативного приложения через <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Руководства и статьи',
      description: 'Практические материалы: от первой корутины до структурной конкурентности и встроенного сервера.',
      readMore: 'Читать статью',
      items: [
        { tag: 'Основы', tagColor: 'purple', time: '6 мин', title: 'Первая корутина', body: 'Установите расширение, запустите корутину через spawn() и посмотрите на кооперативный планировщик в действии.', url: '/ru/docs/components/coroutines.html' },
        { tag: 'Основы', tagColor: 'purple', time: '9 мин', title: 'Неблокирующий I/O', body: 'Обычные fread, curl и запросы PDO начинают работать конкурентно без коллбэков.', url: '/ru/docs/reference/supported-functions.html' },
        { tag: 'Основы', tagColor: 'purple', time: '8 мин', title: 'Структурная конкурентность', body: 'Контролируйте время жизни корутин с помощью песочницы Scope и управляйте группами через TaskGroup.', url: '/ru/docs/components/scope.html' },
        { tag: 'Сервер', tagColor: 'teal', time: '10 мин', title: 'Веб-сервер TrueAsync', body: 'Нативный сервер HTTP/1.1, HTTP/2 и HTTP/3 прямо внутри процесса PHP.', url: '/ru/docs/server/index.html' },
        { tag: 'Основы', tagColor: 'orange', time: '7 мин', title: 'Пул соединений PDO', body: 'Автоматический пул соединений, безопасный для корутин, встроенный прямо в PDO.', url: '/ru/docs/components/pdo-pool.html' },
        { tag: 'Основы', tagColor: 'blue', time: '9 мин', title: 'Каналы и ThreadPool', body: 'Паттерн производитель-потребитель на буферизованных каналах и параллельные вычисления через ThreadPool.', url: '/ru/docs/components/channels.html' },
      ],
    },
  },
  de: {
    hero: {
      badge: 'Experimentelle Version',
      title: 'Echte Asynchronität in PHP',
      description: 'Stellen Sie sich PHP mit Koroutinen vor, bei dem vertraute Funktionen nebenläufige Ein-/Ausgabe unterstützen. Erstellen Sie hochperformante nebenläufige Anwendungen mit sauberem, lesbarem Code und minimalen Änderungen!',
      buttons: [
        { label: 'Erste Schritte', url: '/de/docs.html', style: 'primary' },
        { label: 'Wie Koroutinen funktionieren', url: '/de/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Herunterladen', url: '/de/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: 'Hauptfunktionen',
      items: [
        { title: 'Koroutinen', icon: 'coroutines', url: '/de/docs/components/coroutines.html', text: 'Leichtgewichtige Koroutinen für effiziente nebenläufige Ausführung. Keine gefärbten <code>async</code>-Funktionen. Einfach <code>spawn()</code> und los!' },
        { title: 'Nicht-blockierende I/O', icon: 'io', url: '/de/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Gewöhnliche PHP-Funktionen arbeiten jetzt asynchron ohne zusätzlichen Aufwand.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/de/docs/server/index.html', text: 'Nativer Webserver in C mit Unterstützung für <code>HTTP/1.1</code>, <code>HTTP/2</code> und <code>HTTP/3</code>, direkt im PHP-Prozess.' },
        { title: 'Kooperative Abbruchsteuerung', icon: 'cancellation', url: '/de/docs/components/cancellation.html', text: 'Einfache und flexible <code>API</code> zum Abbrechen von Koroutinen. <code>Scope::cancel()</code>.' },
        { title: 'Strukturierte Nebenläufigkeit', icon: 'structured-concurrency', url: '/de/docs/components/scope.html', text: 'Kontrolle der Lebensdauer von Koroutinen mit der <code>Scope</code>-Sandbox. Verwaltung von Koroutinen-Gruppen über <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/de/docs/components/pdo-pool.html', text: 'Verbindungs-Pooling direkt in <code>PDO</code> eingebaut. Automatische Verbindungsverwaltung für maximale Leistung.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/de/docs/components/channels.html', text: 'Datenaustausch zwischen Koroutinen. Gepufferte und ungepufferte Kanäle für Producer/Consumer-Muster. Thread-übergreifend via <code>ThreadChannel</code>; parallele CPU-Aufgaben via <code>Thread</code> und <code>ThreadPool</code>.' },
        { title: 'Futures', icon: 'futures', url: '/de/docs/components/future.html', text: 'Verzögerte Ergebnisse für asynchrone Berechnungen. Komposition über <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/de/roadmap.html', text: 'Android-Unterstützung auf PHP-Kernebene: ein asynchroner Runtime innerhalb einer nativen App über <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      description: 'Hands-on guides — from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/de/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/de/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/de/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/de/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/de/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/de/docs/components/channels.html' },
      ],
    },
  },
  es: {
    hero: {
      badge: 'Versión experimental',
      title: 'Asincronía real dentro de PHP',
      description: 'Imagina PHP con corrutinas, donde las funciones habituales soportan E/S concurrente. ¡Crea aplicaciones concurrentes de alto rendimiento con código limpio, legible y cambios mínimos!',
      buttons: [
        { label: 'Comenzar', url: '/es/docs.html', style: 'primary' },
        { label: 'Cómo funcionan las corrutinas', url: '/es/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Descargar', url: '/es/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: 'Características principales',
      items: [
        { title: 'Corrutinas', icon: 'coroutines', url: '/es/docs/components/coroutines.html', text: 'Corrutinas ligeras para una ejecución concurrente eficiente. Sin funciones <code>async</code> coloreadas. Simplemente haz <code>spawn()</code> y listo.' },
        { title: 'I/O no bloqueante', icon: 'io', url: '/es/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Las funciones habituales de PHP ahora funcionan de forma asíncrona sin esfuerzo adicional.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/es/docs/server/index.html', text: 'Servidor web nativo en C con soporte para <code>HTTP/1.1</code>, <code>HTTP/2</code> y <code>HTTP/3</code>, directamente dentro del proceso PHP.' },
        { title: 'Cancelación cooperativa', icon: 'cancellation', url: '/es/docs/components/cancellation.html', text: '<code>API</code> simple y flexible para cancelar corrutinas. <code>Scope::cancel()</code>.' },
        { title: 'Concurrencia estructurada', icon: 'structured-concurrency', url: '/es/docs/components/scope.html', text: 'Control del ciclo de vida de las corrutinas mediante el sandbox <code>Scope</code>. Gestión de grupos de corrutinas con <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/es/docs/components/pdo-pool.html', text: 'Pool de conexiones integrado directamente en <code>PDO</code>. Gestión automática de conexiones para máximo rendimiento.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/es/docs/components/channels.html', text: 'Intercambio de datos entre corrutinas. Canales con y sin búfer para patrones producer/consumer. Entre hilos via <code>ThreadChannel</code>; tareas CPU paralelas con <code>Thread</code> y <code>ThreadPool</code>.' },
        { title: 'Futures', icon: 'futures', url: '/es/docs/components/future.html', text: 'Resultados diferidos para cálculos asíncronos. Composición mediante <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/es/roadmap.html', text: 'Soporte de Android a nivel del núcleo de PHP: un runtime asíncrono dentro de una app nativa mediante <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      description: 'Hands-on guides — from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/es/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/es/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/es/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/es/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/es/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/es/docs/components/channels.html' },
      ],
    },
  },
  fr: {
    hero: {
      badge: 'Version expérimentale',
      title: 'Véritable asynchrone dans PHP',
      description: 'Imaginez PHP avec des coroutines, où les fonctions familières prennent en charge les E/S concurrentes. Créez des applications concurrentes haute performance avec un code propre et lisible, et un minimum de modifications !',
      buttons: [
        { label: 'Commencer', url: '/fr/docs.html', style: 'primary' },
        { label: 'Comment fonctionnent les coroutines', url: '/fr/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Télécharger', url: '/fr/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: 'Fonctionnalités clés',
      items: [
        { title: 'Coroutines', icon: 'coroutines', url: '/fr/docs/components/coroutines.html', text: 'Des coroutines légères pour une exécution concurrente efficace. Pas de fonctions <code>async</code> colorées. Faites simplement <code>spawn()</code> et c\'est parti !' },
        { title: 'I/O non bloquante', icon: 'io', url: '/fr/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Les fonctions PHP classiques fonctionnent désormais de manière asynchrone sans effort supplémentaire.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/fr/docs/server/index.html', text: 'Serveur web natif en C avec prise en charge de <code>HTTP/1.1</code>, <code>HTTP/2</code> et <code>HTTP/3</code>, directement à l\'intérieur du processus PHP.' },
        { title: 'Annulation coopérative', icon: 'cancellation', url: '/fr/docs/components/cancellation.html', text: '<code>API</code> simple et flexible pour l\'annulation des coroutines. <code>Scope::cancel()</code>.' },
        { title: 'Concurrence structurée', icon: 'structured-concurrency', url: '/fr/docs/components/scope.html', text: 'Contrôle du cycle de vie des coroutines grâce au bac à sable <code>Scope</code>. Gestion de groupes de coroutines via <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/fr/docs/components/pdo-pool.html', text: 'Pool de connexions intégré directement dans <code>PDO</code>. Gestion automatique des connexions pour des performances maximales.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/fr/docs/components/channels.html', text: 'Échange de données entre coroutines. Canaux avec et sans tampon pour les patrons producteur/consommateur. Entre threads via <code>ThreadChannel</code> ; tâches CPU parallèles via <code>Thread</code> et <code>ThreadPool</code>.' },
        { title: 'Futures', icon: 'futures', url: '/fr/docs/components/future.html', text: 'Résultats différés pour les calculs asynchrones. Composition via <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/fr/roadmap.html', text: 'Prise en charge d\'Android au niveau du cœur de PHP : un runtime asynchrone au sein d\'une application native via <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      description: 'Hands-on guides — from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/fr/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/fr/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/fr/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/fr/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/fr/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/fr/docs/components/channels.html' },
      ],
    },
  },
  it: {
    hero: {
      badge: 'Versione sperimentale',
      title: 'Vera asincronicità dentro PHP',
      description: 'Immagina PHP con coroutine, dove le funzioni familiari supportano l\'I/O concorrente. Crea applicazioni concorrenti ad alte prestazioni con codice pulito, leggibile e modifiche minime!',
      buttons: [
        { label: 'Inizia', url: '/it/docs.html', style: 'primary' },
        { label: 'Come funzionano le coroutine', url: '/it/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Scarica', url: '/it/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: 'Funzionalità principali',
      items: [
        { title: 'Coroutine', icon: 'coroutines', url: '/it/docs/components/coroutines.html', text: 'Coroutine leggere per un\'esecuzione concorrente efficiente. Nessuna funzione <code>async</code> colorata. Basta fare <code>spawn()</code> e via!' },
        { title: 'I/O non bloccante', icon: 'io', url: '/it/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Le normali funzioni PHP ora funzionano in modo asincrono senza sforzo aggiuntivo.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/it/docs/server/index.html', text: 'Web server nativo in C con supporto per <code>HTTP/1.1</code>, <code>HTTP/2</code> e <code>HTTP/3</code>, direttamente all\'interno del processo PHP.' },
        { title: 'Cancellazione cooperativa', icon: 'cancellation', url: '/it/docs/components/cancellation.html', text: '<code>API</code> semplice e flessibile per la cancellazione delle coroutine. <code>Scope::cancel()</code>.' },
        { title: 'Concorrenza strutturata', icon: 'structured-concurrency', url: '/it/docs/components/scope.html', text: 'Controllo del ciclo di vita delle coroutine tramite sandbox <code>Scope</code>. Gestione di gruppi di coroutine tramite <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/it/docs/components/pdo-pool.html', text: 'Pool di connessioni integrato direttamente in <code>PDO</code>. Gestione automatica delle connessioni per le massime prestazioni.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/it/docs/components/channels.html', text: 'Scambio di dati tra coroutine. Canali bufferizzati e non bufferizzati per pattern producer/consumer. Tra thread via <code>ThreadChannel</code>; task CPU paralleli con <code>Thread</code> e <code>ThreadPool</code>.' },
        { title: 'Futures', icon: 'futures', url: '/it/docs/components/future.html', text: 'Risultati differiti per calcoli asincroni. Composizione tramite <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/it/roadmap.html', text: 'Supporto Android a livello del core di PHP: un runtime asincrono all\'interno di un\'app nativa tramite <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      description: 'Hands-on guides — from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/it/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/it/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/it/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/it/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/it/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/it/docs/components/channels.html' },
      ],
    },
  },
  ko: {
    hero: {
      badge: '실험 버전',
      title: 'PHP 안에 진정한 비동기',
      description: '익숙한 함수가 동시 I/O를 지원하는 코루틴이 있는 PHP를 상상해 보세요. 깨끗하고 읽기 쉬운 코드와 최소한의 변경으로 고성능 동시성 애플리케이션을 구축하세요!',
      buttons: [
        { label: '시작하기', url: '/ko/docs.html', style: 'primary' },
        { label: '코루틴 작동 방식', url: '/ko/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: '다운로드', url: '/ko/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: '주요 기능',
      items: [
        { title: '코루틴', icon: 'coroutines', url: '/ko/docs/components/coroutines.html', text: '효율적인 동시 실행을 위한 경량 코루틴. 컬러드 <code>async</code> 함수 없음. <code>spawn()</code>만 하면 됩니다!' },
        { title: '논블로킹 I/O', icon: 'io', url: '/ko/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. 일반 PHP 함수가 추가 노력 없이 비동기로 작동합니다.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/ko/docs/server/index.html', text: 'C로 작성된 네이티브 웹 서버. <code>HTTP/1.1</code>, <code>HTTP/2</code>, <code>HTTP/3</code>을 PHP 프로세스 내부에서 직접 처리합니다.' },
        { title: '협력적 취소', icon: 'cancellation', url: '/ko/docs/components/cancellation.html', text: '코루틴 취소를 위한 간단하고 유연한 <code>API</code>. <code>Scope::cancel()</code>.' },
        { title: '구조적 동시성', icon: 'structured-concurrency', url: '/ko/docs/components/scope.html', text: '<code>Scope</code> 샌드박스로 코루틴 수명을 제어하세요. <code>TaskGroup</code>으로 코루틴 그룹을 관리하세요.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/ko/docs/components/pdo-pool.html', text: '<code>PDO</code>에 내장된 연결 풀링. 최대 성능을 위한 자동 연결 관리.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/ko/docs/components/channels.html', text: '코루틴 간의 데이터 교환. 생산자/소비자 패턴을 위한 버퍼링 및 비버퍼링 채널. <code>ThreadChannel</code>로 OS 스레드 간 통신, <code>Thread</code>·<code>ThreadPool</code>로 병렬 CPU 작업.' },
        { title: 'Futures', icon: 'futures', url: '/ko/docs/components/future.html', text: '비동기 계산을 위한 지연 결과. <code>await_all</code>, <code>await_first</code>를 통한 조합.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/ko/roadmap.html', text: 'PHP 코어 수준의 Android 지원: <code>native-bridge</code>를 통해 네이티브 앱 내부에서 실행되는 비동기 런타임.' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      description: 'Hands-on guides — from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/ko/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/ko/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/ko/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/ko/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/ko/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/ko/docs/components/channels.html' },
      ],
    },
  },
  uk: {
    hero: {
      badge: 'Експериментальна версія',
      title: 'Справжня асинхронність всередині PHP',
      description: 'Уявіть PHP з корутинами, де знайомі функції підтримують конкурентне введення-виведення. Створюйте високопродуктивні конкурентні застосунки з чистим, зрозумілим кодом і мінімумом змін!',
      buttons: [
        { label: 'Почати роботу', url: '/uk/docs.html', style: 'primary' },
        { label: 'Як працюють корутини', url: '/uk/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Завантажити', url: '/uk/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: 'Ключові можливості',
      items: [
        { title: 'Корутини', icon: 'coroutines', url: '/uk/docs/components/coroutines.html', text: 'Легкі корутини для ефективного конкурентного виконання. Жодних кольорових <code>async</code> функцій. Просто роби <code>spawn()</code> і вперед!' },
        { title: 'Неблокуючий I/O', icon: 'io', url: '/uk/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Звичайні функції PHP тепер працюють асинхронно без додаткових зусиль.' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/uk/docs/server/index.html', text: 'Нативний Web-сервер на C з підтримкою <code>HTTP/1.1</code>, <code>HTTP/2</code> і <code>HTTP/3</code> прямо всередині PHP-процесу.' },
        { title: 'Кооперативне скасування', icon: 'cancellation', url: '/uk/docs/components/cancellation.html', text: 'Простий і гнучкий <code>API</code> для скасування корутин. <code>Scope::cancel()</code>.' },
        { title: 'Структурна конкурентність', icon: 'structured-concurrency', url: '/uk/docs/components/scope.html', text: 'Контроль часу життя корутин за допомогою пісочниці <code>Scope</code>. Керування групами корутин через <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/uk/docs/components/pdo-pool.html', text: 'Пул з\'єднань вбудований прямо в <code>PDO</code>. Автоматичне керування з\'єднаннями для максимальної продуктивності.' },
        { title: 'Channel · ThreadPool', icon: 'channel', url: '/uk/docs/components/channels.html', text: 'Обмін даними між корутинами. Буферизовані та небуферизовані канали. Між потоками через <code>ThreadChannel</code>; паралельні CPU-задачі через <code>Thread</code> і <code>ThreadPool</code>.' },
        { title: 'Futures', icon: 'futures', url: '/uk/docs/components/future.html', text: 'Відкладені результати для асинхронних обчислень. Композиція через <code>await_all</code>, <code>await_first</code>.' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/uk/roadmap.html', text: 'Підтримка Android на рівні ядра PHP: асинхронний рантайм всередині нативного застосунку через <code>native-bridge</code>.' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      description: 'Hands-on guides — from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/uk/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/uk/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/uk/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/uk/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/uk/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/uk/docs/components/channels.html' },
      ],
    },
  },
  zh: {
    hero: {
      badge: '实验版本',
      title: 'PHP 内部的真正异步',
      description: '想象一下，PHP 拥有协程，熟悉的函数支持并发 I/O。用简洁、可读的代码和最少的改动构建高性能并发应用程序！',
      buttons: [
        { label: '开始使用', url: '/zh/docs.html', style: 'primary' },
        { label: '协程工作原理', url: '/zh/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: '下载', url: '/zh/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: '核心功能',
      items: [
        { title: '协程', icon: 'coroutines', url: '/zh/docs/components/coroutines.html', text: '轻量级协程，实现高效并发执行。没有带颜色的 <code>async</code> 函数。只需调用 <code>spawn()</code> 即可开始！' },
        { title: '非阻塞 I/O', icon: 'io', url: '/zh/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. 普通 PHP 函数无需额外操作即可异步运行。' },
        { title: 'TrueAsync Server', icon: 'web-servers', url: '/zh/docs/server/index.html', text: '使用 C 编写的原生 Web 服务器，直接在 PHP 进程内支持 <code>HTTP/1.1</code>、<code>HTTP/2</code> 与 <code>HTTP/3</code>。' },
        { title: '协作式取消', icon: 'cancellation', url: '/zh/docs/components/cancellation.html', text: '简单灵活的 <code>API</code>，用于取消协程。<code>Scope::cancel()</code>。' },
        { title: '结构化并发', icon: 'structured-concurrency', url: '/zh/docs/components/scope.html', text: '通过沙箱 <code>Scope</code> 控制协程的生命周期。通过 <code>TaskGroup</code> 管理协程组。' },
        { title: 'PDO 连接池', icon: 'pdo-pool', url: '/zh/docs/components/pdo-pool.html', text: '直接内置于 <code>PDO</code> 的连接池。自动管理连接以实现最佳性能。' },
        { title: '通道 · ThreadPool', icon: 'channel', url: '/zh/docs/components/channels.html', text: '协程之间的数据交换。缓冲和非缓冲通道支持生产者/消费者模式。跨线程通过 <code>ThreadChannel</code>；并行 CPU 任务通过 <code>Thread</code> 和 <code>ThreadPool</code>。' },
        { title: 'Futures', icon: 'futures', url: '/zh/docs/components/future.html', text: '异步计算的延迟结果。通过 <code>await_all</code>, <code>await_first</code> 进行组合。' },
        { title: 'PHP Mobile', icon: 'mobile', url: '/zh/roadmap.html', text: '在 PHP 核心层面支持 Android:通过 <code>native-bridge</code> 在原生应用内运行异步运行时。' },
      ],
    },
    guides: {
      title: 'Guides & Articles',
      description: 'Hands-on guides — from your first coroutine to structured concurrency and the built-in server.',
      readMore: 'Read article',
      items: [
        { tag: 'Core', tagColor: 'purple', time: '6 min', title: 'Your first coroutine', body: 'Install the extension, spawn() a coroutine and see cooperative scheduling in action.', url: '/zh/docs/components/coroutines.html' },
        { tag: 'Core', tagColor: 'purple', time: '9 min', title: 'Non-blocking I/O', body: 'Turn ordinary fread, curl and PDO calls into concurrent work without callbacks.', url: '/zh/docs/reference/supported-functions.html' },
        { tag: 'Core', tagColor: 'purple', time: '8 min', title: 'Structured concurrency', body: 'Control coroutine lifetime with a Scope sandbox and manage groups via TaskGroup.', url: '/zh/docs/components/scope.html' },
        { tag: 'Server', tagColor: 'teal', time: '10 min', title: 'The TrueAsync web server', body: 'Run a native HTTP/1.1, HTTP/2 and HTTP/3 server directly inside the PHP process.', url: '/zh/docs/server/index.html' },
        { tag: 'Core', tagColor: 'orange', time: '7 min', title: 'PDO connection pool', body: 'Automatic, coroutine-safe connection pooling built right into PDO.', url: '/zh/docs/components/pdo-pool.html' },
        { tag: 'Core', tagColor: 'blue', time: '9 min', title: 'Channels & ThreadPool', body: 'Producer/consumer patterns with buffered channels, plus real parallel CPU work via ThreadPool.', url: '/zh/docs/components/channels.html' },
      ],
    },
  },
}

const t = computed(() => i18n[currentLang.value] || i18n.en)
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
<span class="tok-var">$page</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">file_get_contents</span>(<span class="tok-prop">$url</span>));
<span class="tok-var">$rows</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-prop">$pdo</span>-><span class="tok-fn">query</span>(<span class="tok-prop">$sql</span>));
<span class="tok-var">$tick</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">delay</span>(<span class="tok-prop">200</span>)); <span class="tok-c">// timeout guard</span>

<span class="tok-c">// suspend until all three finish</span>
[<span class="tok-var">$html</span>, <span class="tok-var">$data</span>] = <span class="tok-fn">await_all</span>([<span class="tok-prop">$page</span>, <span class="tok-prop">$rows</span>], <span class="tok-prop">$tick</span>);`,
  },
  {
    key: 'pdo', label: 'PDO Pool', filename: 'pdo-pool.php',
    icon: '<path d="M12 3c4.5 0 8 1.3 8 3s-3.5 3-8 3-8-1.3-8-3 3.5-3 8-3zM4 6v12c0 1.7 3.5 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.5 3 8 3s8-1.3 8-3"/>',
    code: `<span class="tok-c">// pooled connections, reused across coroutines</span>
<span class="tok-var">$pool</span> = <span class="tok-kw">new</span> <span class="tok-cls">Async\\Pdo\\Pool</span>(<span class="tok-prop">$dsn</span>, size: <span class="tok-prop">8</span>);

<span class="tok-var">$users</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-prop">$pool</span>-><span class="tok-fn">query</span>(<span class="tok-str">'SELECT * FROM users'</span>));
<span class="tok-var">$stats</span> = <span class="tok-fn">spawn</span>(<span class="tok-kw">fn</span>() => <span class="tok-prop">$pool</span>-><span class="tok-fn">query</span>(<span class="tok-str">'SELECT * FROM stats'</span>));

<span class="tok-c">// each coroutine borrows a free connection</span>
[<span class="tok-var">$u</span>, <span class="tok-var">$s</span>] = <span class="tok-fn">await_all</span>([<span class="tok-prop">$users</span>, <span class="tok-prop">$stats</span>]);`,
  },
  {
    key: 'threads', label: 'Threads', filename: 'threads.php',
    icon: '<path d="M4 5h16M4 12h16M4 19h16"/>',
    code: `<span class="tok-c">// offload CPU-bound work to a thread pool</span>
<span class="tok-var">$pool</span> = <span class="tok-kw">new</span> <span class="tok-cls">Async\\ThreadPool</span>(<span class="tok-prop">4</span>);

<span class="tok-var">$hash</span> = <span class="tok-prop">$pool</span>-><span class="tok-fn">submit</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">password_hash</span>(<span class="tok-prop">$pw</span>, <span class="tok-cls">PASSWORD_ARGON2ID</span>));
<span class="tok-var">$img</span>  = <span class="tok-prop">$pool</span>-><span class="tok-fn">submit</span>(<span class="tok-kw">fn</span>() => <span class="tok-fn">resize_image</span>(<span class="tok-prop">$file</span>));

<span class="tok-c">// runs on real OS threads, in parallel</span>
[<span class="tok-var">$h</span>, <span class="tok-var">$i</span>] = <span class="tok-fn">await_all</span>([<span class="tok-prop">$hash</span>, <span class="tok-prop">$img</span>]);`,
  },
  {
    key: 'server', label: 'Web Server', filename: 'server.php',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    code: `<span class="tok-c">// non-blocking HTTP server in pure PHP</span>
<span class="tok-var">$server</span> = <span class="tok-kw">new</span> <span class="tok-cls">Async\\Http\\Server</span>(<span class="tok-str">'0.0.0.0'</span>, <span class="tok-prop">8080</span>);

<span class="tok-prop">$server</span>-><span class="tok-fn">on</span>(<span class="tok-str">'request'</span>, <span class="tok-kw">fn</span>(<span class="tok-prop">$req</span>, <span class="tok-prop">$res</span>) =>
    <span class="tok-prop">$res</span>-><span class="tok-fn">end</span>(<span class="tok-str">"Hello from coroutine #"</span> . <span class="tok-fn">coroutine_id</span>()));

<span class="tok-c">// each request runs in its own coroutine</span>
<span class="tok-prop">$server</span>-><span class="tok-fn">listen</span>();`,
  },
]
const activeDemoTab = ref(0)

const milestones = [
  { version: '0.1', title: 'Foundation', date: '2024', status: 'done' },
  { version: '0.6', title: 'Complete Async API', date: '2026-03-14', status: 'done' },
  { version: '0.7', title: 'Threads & Stabilization', date: 'Summer 2026', status: 'done' },
  { version: '0.8', title: 'Framework Adapters', date: 'Q3 2026', status: 'active' },
  { version: '1.0-RC', title: 'Release Candidate', date: 'August 2026', status: 'planned', tag: 'RC' },
  { version: '1.0', title: 'Stable Release', date: 'November 2026', status: 'planned', tag: 'Target: PHP 8.6', tagStyle: 'highlight' },
]

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
          {{ hero.badge }}
        </div>
        <h1 v-html="hero.title"></h1>
        <p v-if="hero.slogan" class="hero-slogan">{{ hero.slogan }}</p>
        <p class="hero-description">{{ hero.description }}</p>
        <div class="hero-actions">
          <a
            v-for="btn in hero.buttons"
            :key="btn.label"
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
  <section class="guides">
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
        <h2>Roadmap</h2>
        <span class="home-roadmap-comment">// current release: v0.7.7</span>
      </div>
      <div class="home-roadmap-timeline">
        <div
          v-for="m in milestones"
          :key="m.version"
          :class="['home-roadmap-item', `home-roadmap-item--${m.status}`]"
        >
          <div class="home-roadmap-dot"></div>
          <div class="home-roadmap-card">
            <div class="home-roadmap-card-head">
              <span class="home-roadmap-version">v{{ m.version }}</span>
              <span class="home-roadmap-status">{{ m.status === 'done' ? 'Shipped' : m.status === 'active' ? 'Current' : 'Planned' }}</span>
            </div>
            <span class="home-roadmap-title">{{ m.title }}</span>
            <span v-if="m.date" class="home-roadmap-date">{{ m.date }}</span>
            <span v-if="m.tag" :class="['home-roadmap-tag', m.tagStyle ? `home-roadmap-tag--${m.tagStyle}` : '']">{{ m.tag }}</span>
          </div>
        </div>
      </div>
      <a :href="`/${currentLang}/roadmap.html`" class="home-roadmap-link">View full roadmap &rarr;</a>
    </div>
  </section>
</template>
