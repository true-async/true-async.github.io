<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()

const currentLang = computed(() => {
  const match = route.path.match(/^\/(en|ru|de|fr|es|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
})

interface HeroButton {
  label: string; url: string; style: string; external?: boolean
}
interface Feature {
  title: string; icon: string; url: string; text: string
}
interface CtaData {
  title: string; description: string; buttons: HeroButton[]
}
interface HeroData {
  badge: string; title: string; description: string; buttons: HeroButton[]
}
interface FeaturesData {
  title: string; items: Feature[]
}
interface HomeI18n {
  hero: HeroData; features: FeaturesData; cta: CtaData
}

const i18n: Record<string, HomeI18n> = {
  en: {
    hero: {
      badge: 'Experimental Version',
      title: 'True Asynchronous inside PHP',
      description: 'Imagine PHP with coroutines, where familiar functions support concurrent I/O. Build high-performance concurrent applications with clean, readable code and minimal changes!',
      buttons: [
        { label: 'Get Started', url: '/en/docs.html', style: 'primary' },
        { label: 'How Coroutines Work', url: '/en/interactive/coroutine-demo.html', style: 'secondary', external: true },
        { label: 'Download', url: '/en/download.html', style: 'secondary' },
        { label: 'Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
    features: {
      title: 'Key Features',
      items: [
        { title: 'Coroutines', icon: 'coroutines', url: '/en/docs/components/coroutines.html', text: 'Lightweight coroutines for efficient concurrent execution. No colored <code>async</code> functions. Just do <code>spawn()</code> and go!' },
        { title: 'Non-blocking I/O', icon: 'io', url: '/en/docs/reference/supported-functions.html', text: '<code>fread</code>, <code>fwrite</code>, <code>file_get_contents</code>, <code>ob_start</code>, <code>curl</code>, <code>MySQL</code>, <code>PostgreSQL</code>. Regular PHP functions now work asynchronously without extra effort.' },
        { title: 'Async Web Servers', icon: 'web-servers', url: '/en/docs/frankenphp.html', text: 'Support for the model: multiple requests — one PHP process.' },
        { title: 'Cooperative Cancellation', icon: 'cancellation', url: '/en/docs/components/cancellation.html', text: 'Simple and flexible <code>API</code> for coroutine cancellation. <code>Scope::cancel()</code>.' },
        { title: 'Structured Concurrency', icon: 'structured-concurrency', url: '/en/docs/components/scope.html', text: 'Control coroutine lifetime with <code>Scope</code> sandbox. Manage groups of coroutines via <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/en/docs/components/pdo-pool.html', text: 'Connection pooling built right into <code>PDO</code>. Automatic connection management for maximum performance.' },
        { title: 'Channel', icon: 'channel', url: '/en/docs/components/channels.html', text: 'Data exchange between coroutines. Buffered and unbuffered channels for producer/consumer patterns.' },
        { title: 'Futures', icon: 'futures', url: '/en/docs/components/future.html', text: 'Deferred results for asynchronous computations. Composition via <code>await_all</code>, <code>await_first</code>.' },
        { title: 'Context', icon: 'context', url: '/en/docs/components/context.html', text: 'Data associated with a coroutine. Easy adaptation of code with global variables via <code>Context</code>.' },
      ],
    },
    cta: {
      title: 'Ready to Build Async PHP Applications?',
      description: 'Get started with TrueAsync in minutes. Install via Composer and start writing concurrent code today.',
      buttons: [
        { label: 'Read the Docs', url: '/en/docs.html', style: 'primary' },
        { label: 'View on GitHub', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Chat on Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: 'Асинхронные Web-серверы', icon: 'web-servers', url: '/ru/docs/frankenphp.html', text: 'Поддержка модели: несколько запросов - один PHP-процесс.' },
        { title: 'Корпоративная отмена', icon: 'cancellation', url: '/ru/docs/components/cancellation.html', text: 'Простой и гибкий <code>API</code> для отмены корутин. <code>Scope::cancel()</code>.' },
        { title: 'Структурная конкурентность', icon: 'structured-concurrency', url: '/ru/docs/components/scope.html', text: 'Контроль времени жизни корутин с помощью песочницы <code>Scope</code>. Управление группой корутин через <code>TaskGroup</code>' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/ru/docs/components/pdo-pool.html', text: 'Поддержка пула соединений прямо в <code>PDO</code>. Автоматическое управление коннектами для максимальной производительности.' },
        { title: 'Channel', icon: 'channel', url: '/ru/docs/components/channels.html', text: 'Обмен данными между корутинами. Буферизованные и небуферизованные каналы для producer/consumer паттернов.' },
        { title: 'Futures', icon: 'futures', url: '/ru/docs/components/future.html', text: 'Отложенные результаты для асинхронных вычислений. Композиция через <code>await_all</code>, <code>await_first</code>.' },
        { title: 'Context', icon: 'context', url: '/ru/docs/components/context.html', text: 'Данные, связанные с корутиной. Простая адаптация кода с глобальными переменными через <code>Context</code>.' },
      ],
    },
    cta: {
      title: 'Готовы создавать асинхронные PHP-приложения?',
      description: 'Начните работу с TrueAsync за несколько минут. Установите через Composer и пишите конкурентный код уже сегодня.',
      buttons: [
        { label: 'Читать документацию', url: '/ru/docs.html', style: 'primary' },
        { label: 'Смотреть на GitHub', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Чат в Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: 'Asynchrone Webserver', icon: 'web-servers', url: '/de/docs/frankenphp.html', text: 'Unterstützung des Modells: mehrere Anfragen — ein PHP-Prozess.' },
        { title: 'Kooperative Abbruchsteuerung', icon: 'cancellation', url: '/de/docs/components/cancellation.html', text: 'Einfache und flexible <code>API</code> zum Abbrechen von Koroutinen. <code>Scope::cancel()</code>.' },
        { title: 'Strukturierte Nebenläufigkeit', icon: 'structured-concurrency', url: '/de/docs/components/scope.html', text: 'Kontrolle der Lebensdauer von Koroutinen mit der <code>Scope</code>-Sandbox. Verwaltung von Koroutinen-Gruppen über <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/de/docs/components/pdo-pool.html', text: 'Verbindungs-Pooling direkt in <code>PDO</code> eingebaut. Automatische Verbindungsverwaltung für maximale Leistung.' },
        { title: 'Channel', icon: 'channel', url: '/de/docs/components/channels.html', text: 'Datenaustausch zwischen Koroutinen. Gepufferte und ungepufferte Kanäle für Producer/Consumer-Muster.' },
        { title: 'Futures', icon: 'futures', url: '/de/docs/components/future.html', text: 'Verzögerte Ergebnisse für asynchrone Berechnungen. Komposition über <code>await_all</code>, <code>await_first</code>.' },
        { title: 'Context', icon: 'context', url: '/de/docs/components/context.html', text: 'Daten, die mit einer Koroutine verknüpft sind. Einfache Anpassung von Code mit globalen Variablen über <code>Context</code>.' },
      ],
    },
    cta: {
      title: 'Bereit, asynchrone PHP-Anwendungen zu erstellen?',
      description: 'Starten Sie mit TrueAsync in wenigen Minuten. Installieren Sie es über Composer und schreiben Sie noch heute nebenläufigen Code.',
      buttons: [
        { label: 'Dokumentation lesen', url: '/de/docs.html', style: 'primary' },
        { label: 'Auf GitHub ansehen', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Discord-Chat', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: 'Servidores Web asíncronos', icon: 'web-servers', url: '/es/docs/frankenphp.html', text: 'Soporte del modelo: múltiples solicitudes — un solo proceso PHP.' },
        { title: 'Cancelación cooperativa', icon: 'cancellation', url: '/es/docs/components/cancellation.html', text: '<code>API</code> simple y flexible para cancelar corrutinas. <code>Scope::cancel()</code>.' },
        { title: 'Concurrencia estructurada', icon: 'structured-concurrency', url: '/es/docs/components/scope.html', text: 'Control del ciclo de vida de las corrutinas mediante el sandbox <code>Scope</code>. Gestión de grupos de corrutinas con <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/es/docs/components/pdo-pool.html', text: 'Pool de conexiones integrado directamente en <code>PDO</code>. Gestión automática de conexiones para máximo rendimiento.' },
        { title: 'Channel', icon: 'channel', url: '/es/docs/components/channels.html', text: 'Intercambio de datos entre corrutinas. Canales con y sin búfer para patrones producer/consumer.' },
        { title: 'Futures', icon: 'futures', url: '/es/docs/components/future.html', text: 'Resultados diferidos para cálculos asíncronos. Composición mediante <code>await_all</code>, <code>await_first</code>.' },
        { title: 'Context', icon: 'context', url: '/es/docs/components/context.html', text: 'Datos asociados a una corrutina. Fácil adaptación de código con variables globales mediante <code>Context</code>.' },
      ],
    },
    cta: {
      title: '¿Listo para crear aplicaciones PHP asíncronas?',
      description: 'Comienza con TrueAsync en minutos. Instálalo con Composer y escribe código concurrente hoy mismo.',
      buttons: [
        { label: 'Leer la documentación', url: '/es/docs.html', style: 'primary' },
        { label: 'Ver en GitHub', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Chat en Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: 'Serveurs Web asynchrones', icon: 'web-servers', url: '/fr/docs/frankenphp.html', text: 'Prise en charge du modèle : plusieurs requêtes — un seul processus PHP.' },
        { title: 'Annulation coopérative', icon: 'cancellation', url: '/fr/docs/components/cancellation.html', text: '<code>API</code> simple et flexible pour l\'annulation des coroutines. <code>Scope::cancel()</code>.' },
        { title: 'Concurrence structurée', icon: 'structured-concurrency', url: '/fr/docs/components/scope.html', text: 'Contrôle du cycle de vie des coroutines grâce au bac à sable <code>Scope</code>. Gestion de groupes de coroutines via <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/fr/docs/components/pdo-pool.html', text: 'Pool de connexions intégré directement dans <code>PDO</code>. Gestion automatique des connexions pour des performances maximales.' },
        { title: 'Channel', icon: 'channel', url: '/fr/docs/components/channels.html', text: 'Échange de données entre coroutines. Canaux avec et sans tampon pour les patrons producteur/consommateur.' },
        { title: 'Futures', icon: 'futures', url: '/fr/docs/components/future.html', text: 'Résultats différés pour les calculs asynchrones. Composition via <code>await_all</code>, <code>await_first</code>.' },
        { title: 'Context', icon: 'context', url: '/fr/docs/components/context.html', text: 'Données associées à une coroutine. Adaptation facile du code avec des variables globales via <code>Context</code>.' },
      ],
    },
    cta: {
      title: 'Prêt à créer des applications PHP asynchrones ?',
      description: 'Démarrez avec TrueAsync en quelques minutes. Installez via Composer et écrivez du code concurrent dès aujourd\'hui.',
      buttons: [
        { label: 'Lire la documentation', url: '/fr/docs.html', style: 'primary' },
        { label: 'Voir sur GitHub', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Chat sur Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: 'Web Server asincroni', icon: 'web-servers', url: '/it/docs/frankenphp.html', text: 'Supporto al modello: più richieste — un unico processo PHP.' },
        { title: 'Cancellazione cooperativa', icon: 'cancellation', url: '/it/docs/components/cancellation.html', text: '<code>API</code> semplice e flessibile per la cancellazione delle coroutine. <code>Scope::cancel()</code>.' },
        { title: 'Concorrenza strutturata', icon: 'structured-concurrency', url: '/it/docs/components/scope.html', text: 'Controllo del ciclo di vita delle coroutine tramite sandbox <code>Scope</code>. Gestione di gruppi di coroutine tramite <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/it/docs/components/pdo-pool.html', text: 'Pool di connessioni integrato direttamente in <code>PDO</code>. Gestione automatica delle connessioni per le massime prestazioni.' },
        { title: 'Channel', icon: 'channel', url: '/it/docs/components/channels.html', text: 'Scambio di dati tra coroutine. Canali bufferizzati e non bufferizzati per pattern producer/consumer.' },
        { title: 'Futures', icon: 'futures', url: '/it/docs/components/future.html', text: 'Risultati differiti per calcoli asincroni. Composizione tramite <code>await_all</code>, <code>await_first</code>.' },
        { title: 'Context', icon: 'context', url: '/it/docs/components/context.html', text: 'Dati associati a una coroutine. Facile adattamento del codice con variabili globali tramite <code>Context</code>.' },
      ],
    },
    cta: {
      title: 'Pronto a creare applicazioni PHP asincrone?',
      description: 'Inizia a lavorare con TrueAsync in pochi minuti. Installa tramite Composer e scrivi codice concorrente già oggi.',
      buttons: [
        { label: 'Leggi la documentazione', url: '/it/docs.html', style: 'primary' },
        { label: 'Visualizza su GitHub', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Chat su Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: '비동기 웹 서버', icon: 'web-servers', url: '/ko/docs/frankenphp.html', text: '여러 요청 — 하나의 PHP 프로세스 모델을 지원합니다.' },
        { title: '협력적 취소', icon: 'cancellation', url: '/ko/docs/components/cancellation.html', text: '코루틴 취소를 위한 간단하고 유연한 <code>API</code>. <code>Scope::cancel()</code>.' },
        { title: '구조적 동시성', icon: 'structured-concurrency', url: '/ko/docs/components/scope.html', text: '<code>Scope</code> 샌드박스로 코루틴 수명을 제어하세요. <code>TaskGroup</code>으로 코루틴 그룹을 관리하세요.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/ko/docs/components/pdo-pool.html', text: '<code>PDO</code>에 내장된 연결 풀링. 최대 성능을 위한 자동 연결 관리.' },
        { title: 'Channel', icon: 'channel', url: '/ko/docs/components/channels.html', text: '코루틴 간의 데이터 교환. 생산자/소비자 패턴을 위한 버퍼링 및 비버퍼링 채널.' },
        { title: 'Futures', icon: 'futures', url: '/ko/docs/components/future.html', text: '비동기 계산을 위한 지연 결과. <code>await_all</code>, <code>await_first</code>를 통한 조합.' },
        { title: 'Context', icon: 'context', url: '/ko/docs/components/context.html', text: '코루틴에 연결된 데이터. <code>Context</code>를 통한 전역 변수 코드의 쉬운 적응.' },
      ],
    },
    cta: {
      title: '비동기 PHP 애플리케이션을 구축할 준비가 되셨나요?',
      description: '몇 분 안에 TrueAsync를 시작하세요. Composer로 설치하고 오늘부터 동시성 코드를 작성하세요.',
      buttons: [
        { label: '문서 읽기', url: '/ko/docs.html', style: 'primary' },
        { label: 'GitHub에서 보기', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Discord에서 채팅', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: 'Асинхронні Web-сервери', icon: 'web-servers', url: '/uk/docs/frankenphp.html', text: 'Підтримка моделі: декілька запитів — один PHP-процес.' },
        { title: 'Кооперативне скасування', icon: 'cancellation', url: '/uk/docs/components/cancellation.html', text: 'Простий і гнучкий <code>API</code> для скасування корутин. <code>Scope::cancel()</code>.' },
        { title: 'Структурна конкурентність', icon: 'structured-concurrency', url: '/uk/docs/components/scope.html', text: 'Контроль часу життя корутин за допомогою пісочниці <code>Scope</code>. Керування групами корутин через <code>TaskGroup</code>.' },
        { title: 'PDO Pool', icon: 'pdo-pool', url: '/uk/docs/components/pdo-pool.html', text: 'Пул з\'єднань вбудований прямо в <code>PDO</code>. Автоматичне керування з\'єднаннями для максимальної продуктивності.' },
        { title: 'Channel', icon: 'channel', url: '/uk/docs/components/channels.html', text: 'Обмін даними між корутинами. Буферизовані та небуферизовані канали для патернів producer/consumer.' },
        { title: 'Futures', icon: 'futures', url: '/uk/docs/components/future.html', text: 'Відкладені результати для асинхронних обчислень. Композиція через <code>await_all</code>, <code>await_first</code>.' },
        { title: 'Context', icon: 'context', url: '/uk/docs/components/context.html', text: 'Дані, пов\'язані з корутиною. Легка адаптація коду з глобальними змінними через <code>Context</code>.' },
      ],
    },
    cta: {
      title: 'Готові створювати асинхронні PHP-застосунки?',
      description: 'Почніть роботу з TrueAsync за кілька хвилин. Встановіть через Composer і пишіть конкурентний код вже сьогодні.',
      buttons: [
        { label: 'Читати документацію', url: '/uk/docs.html', style: 'primary' },
        { label: 'Дивитися на GitHub', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Чат у Discord', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
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
        { title: '异步 Web 服务器', icon: 'web-servers', url: '/zh/docs/frankenphp.html', text: '支持多请求、单 PHP 进程的模型。' },
        { title: '协作式取消', icon: 'cancellation', url: '/zh/docs/components/cancellation.html', text: '简单灵活的 <code>API</code>，用于取消协程。<code>Scope::cancel()</code>。' },
        { title: '结构化并发', icon: 'structured-concurrency', url: '/zh/docs/components/scope.html', text: '通过沙箱 <code>Scope</code> 控制协程的生命周期。通过 <code>TaskGroup</code> 管理协程组。' },
        { title: 'PDO 连接池', icon: 'pdo-pool', url: '/zh/docs/components/pdo-pool.html', text: '直接内置于 <code>PDO</code> 的连接池。自动管理连接以实现最佳性能。' },
        { title: '通道', icon: 'channel', url: '/zh/docs/components/channels.html', text: '协程之间的数据交换。缓冲和非缓冲通道支持生产者/消费者模式。' },
        { title: 'Futures', icon: 'futures', url: '/zh/docs/components/future.html', text: '异步计算的延迟结果。通过 <code>await_all</code>, <code>await_first</code> 进行组合。' },
        { title: '上下文', icon: 'context', url: '/zh/docs/components/context.html', text: '与协程关联的数据。通过 <code>Context</code> 轻松适配使用全局变量的代码。' },
      ],
    },
    cta: {
      title: '准备好构建异步 PHP 应用程序了吗？',
      description: '几分钟内即可开始使用 TrueAsync。通过 Composer 安装，立即编写并发代码。',
      buttons: [
        { label: '阅读文档', url: '/zh/docs.html', style: 'primary' },
        { label: '在 GitHub 上查看', url: 'https://github.com/true-async', style: 'secondary', external: true },
        { label: 'Discord 聊天', url: 'https://discord.gg/yqBQPBHKp5', style: 'secondary', external: true },
      ],
    },
  },
}

const t = computed(() => i18n[currentLang.value] || i18n.en)
const hero = computed(() => t.value.hero)
const features = computed(() => t.value.features)
const cta = computed(() => t.value.cta)

const milestones = [
  { version: '0.1', title: 'Foundation', date: '2024', status: 'done' },
  { version: '0.6', title: 'Complete Async API', date: '2026-03-14', status: 'done' },
  { version: '0.7', title: 'Threads & Stabilization', date: 'Summer 2026', status: 'active', tag: 'In Development', tagStyle: 'highlight' },
  { version: '0.8', title: 'Framework Adapters', date: 'Q3 2026', status: 'planned' },
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
  'context': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
}
</script>

<template>
  <!-- Hero -->
  <section class="hero">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <div class="hero-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
        {{ hero.badge }}
      </div>
      <h1>{{ hero.title }}</h1>
      <p class="hero-description">{{ hero.description }}</p>
      <div class="hero-actions">
        <a
          v-for="btn in hero.buttons"
          :key="btn.label"
          :href="btn.url"
          :class="['btn', `btn-${btn.style}`, 'btn-lg']"
          :target="btn.external ? '_blank' : undefined"
          :rel="btn.external ? 'noopener' : undefined"
        >{{ btn.label }}</a>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="features">
    <div class="features-header">
      <h2>{{ features.title }}</h2>
    </div>
    <div class="features-grid">
      <a
        v-for="feature in features.items"
        :key="feature.title"
        :href="feature.url"
        class="feature-card feature-card--link"
      >
        <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="iconSvgs[feature.icon]"></svg>
        <h3>{{ feature.title }}</h3>
        <p v-html="feature.text"></p>
      </a>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta-section">
    <div class="cta-content">
      <svg class="cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      <h2>{{ cta.title }}</h2>
      <p>{{ cta.description }}</p>
      <div class="cta-actions">
        <a
          v-for="btn in cta.buttons"
          :key="btn.label"
          :href="btn.url"
          :class="['btn', `btn-${btn.style}`, 'btn-lg']"
          :target="btn.external ? '_blank' : undefined"
          :rel="btn.external ? 'noopener' : undefined"
        >{{ btn.label }}</a>
      </div>
    </div>
  </section>

  <!-- Roadmap -->
  <section class="home-roadmap">
    <div class="home-roadmap-inner">
      <h2>Roadmap</h2>
      <div class="home-roadmap-timeline">
        <div
          v-for="m in milestones"
          :key="m.version"
          :class="['home-roadmap-item', `home-roadmap-item--${m.status}`]"
        >
          <div class="home-roadmap-dot"></div>
          <div class="home-roadmap-content">
            <span class="home-roadmap-version">v{{ m.version }}</span>
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
