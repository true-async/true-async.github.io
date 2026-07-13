<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vitepress'
import releasesData from '../data/releases.json'

const route = useRoute()
const currentLang = computed(() => {
  const match = route.path.match(/^\/(en|ru|de|es|fr|it|uk|zh|ko)\//)
  return match ? match[1] : 'en'
})

const downloadI18n: Record<string, {
  subtitle: string
  badge: string
  build_title: string
  build_subtitle: string
  docker_title: string
  windows_title: string
  all_releases: string
  install_docs: string
  hero_word: string
  methods_eyebrow: string
  methods_title: string
  requirements_title: string
  requirements: string[]
  verify_title: string
  verify_desc: string
  binaries_eyebrow: string
  binaries_title: string
  ide_eyebrow: string
  ide_title: string
  ide_desc: string
  ide_link: string
}> = {
  en: {
    hero_word: 'Download',
    methods_eyebrow: 'Install methods',
    methods_title: 'Choose how you build',
    binaries_eyebrow: 'Prebuilt binaries',
    requirements_title: 'Requirements',
    requirements: ['Built with the async core enabled (--enable-async).', 'Thread Safe (ZTS) build of PHP.', 'Linux, macOS or Windows on x86-64 / ARM64.'],
    verify_title: 'Verify your download',
    verify_desc: 'Every Windows release is published with SHA-256 checksums. Confirm integrity before installing:',
    binaries_title: 'Grab a package for your platform',
    subtitle: 'Installation scripts for Linux/macOS, Docker images, and pre-built Windows binaries.',
    badge: 'Experimental Core',
    build_title: 'Build from Source',
    build_subtitle: 'Recommended installation method for Linux and macOS. The script downloads PHP source code, the TrueAsync extension, and builds everything automatically.',
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'All releases on GitHub',
    install_docs: 'Installation documentation',
    ide_eyebrow: 'Editor tooling',
    ide_title: 'IDE autocompletion and stubs',
    ide_desc: 'Add the dev-only helper package for autocompletion, inline documentation, and static-analysis stubs covering the async core, HTTP server, and ClickHouse client. Works with PhpStorm, PHPStan, and Psalm. Requires PHP 8.6+.',
    ide_link: 'IDE helper on GitHub',
  },
  ru: {
    hero_word: 'Скачать',
    methods_eyebrow: 'Способы установки',
    methods_title: 'Выберите способ сборки',
    binaries_eyebrow: 'Готовые сборки',
    requirements_title: 'Требования',
    requirements: ['Сборка с включённым async-ядром (--enable-async).', 'Thread Safe (ZTS) сборка PHP.', 'Linux, macOS или Windows на x86-64 / ARM64.'],
    verify_title: 'Проверьте загрузку',
    verify_desc: 'Каждый релиз для Windows публикуется с контрольными суммами SHA-256. Проверьте целостность перед установкой:',
    binaries_title: 'Пакет под вашу платформу',
    subtitle: 'Скрипты установки для Linux/macOS, Docker-образы и готовые сборки для Windows.',
    badge: 'Экспериментальное ядро',
    build_title: 'Сборка из исходников',
    build_subtitle: 'Рекомендуемый способ установки для Linux и macOS. Скрипт скачает исходники PHP, расширение TrueAsync и соберёт всё автоматически.',
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'Все релизы на GitHub',
    install_docs: 'Документация по установке',
    ide_eyebrow: 'Поддержка редактора',
    ide_title: 'Автодополнение и стабы для IDE',
    ide_desc: 'Установите dev-пакет со стабами: автодополнение, встроенная документация и подсказки для статического анализа по async-ядру, HTTP-серверу и клиенту ClickHouse. Работает с PhpStorm, PHPStan и Psalm. Требуется PHP 8.6+.',
    ide_link: 'IDE helper на GitHub',
  },
  de: {
    hero_word: 'Herunterladen',
    methods_eyebrow: 'Installationsmethoden',
    methods_title: 'Wählen Sie Ihre Methode',
    binaries_eyebrow: 'Vorkompilierte Binärdateien',
    requirements_title: 'Voraussetzungen',
    requirements: ['Mit aktiviertem Async-Kern kompiliert (--enable-async).', 'Thread-Safe-Build (ZTS) von PHP.', 'Linux, macOS oder Windows auf x86-64 / ARM64.'],
    verify_title: 'Download überprüfen',
    verify_desc: 'Jedes Windows-Release wird mit SHA-256-Prüfsummen veröffentlicht. Überprüfen Sie die Integrität vor der Installation:',
    binaries_title: 'Holen Sie sich ein Paket für Ihre Plattform',
    subtitle: 'Installationsskripte für Linux/macOS, Docker-Images und vorkompilierte Windows-Binärdateien.',
    badge: 'Experimentelle Version',
    build_title: 'Aus Quellcode kompilieren',
    build_subtitle: 'Empfohlene Installationsmethode für Linux und macOS. Das Skript lädt den PHP-Quellcode, die TrueAsync-Erweiterung herunter und kompiliert alles automatisch.',
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'Alle Releases auf GitHub',
    install_docs: 'Installationsdokumentation',
    ide_eyebrow: 'Editor-Werkzeuge',
    ide_title: 'IDE-Autovervollständigung und Stubs',
    ide_desc: 'Installieren Sie das Dev-Paket mit Stubs: Autovervollständigung, Inline-Dokumentation und Hinweise für die statische Analyse zu Async-Kern, HTTP-Server und ClickHouse-Client. Funktioniert mit PhpStorm, PHPStan und Psalm. Erfordert PHP 8.6+.',
    ide_link: 'IDE-Helper auf GitHub',
  },
  es: {
    hero_word: 'Descargar',
    methods_eyebrow: 'Métodos de instalación',
    methods_title: 'Elige cómo compilar',
    binaries_eyebrow: 'Binarios precompilados',
    requirements_title: 'Requisitos',
    requirements: ['Compilado con el núcleo async habilitado (--enable-async).', 'Compilación Thread Safe (ZTS) de PHP.', 'Linux, macOS o Windows en x86-64 / ARM64.'],
    verify_title: 'Verifica tu descarga',
    verify_desc: 'Cada versión para Windows se publica con sumas de verificación SHA-256. Confirma la integridad antes de instalar:',
    binaries_title: 'Obtén un paquete para tu plataforma',
    subtitle: 'Scripts de instalación para Linux/macOS, imágenes Docker y binarios precompilados para Windows.',
    badge: 'Versión experimental',
    build_title: 'Compilar desde el código fuente',
    build_subtitle: 'Método de instalación recomendado para Linux y macOS. El script descarga el código fuente de PHP, la extensión TrueAsync, y compila todo automáticamente.',
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'Todas las versiones en GitHub',
    install_docs: 'Documentación de instalación',
    ide_eyebrow: 'Herramientas del editor',
    ide_title: 'Autocompletado y stubs para el IDE',
    ide_desc: 'Instala el paquete de desarrollo con stubs: autocompletado, documentación en línea y ayudas para el análisis estático del núcleo async, el servidor HTTP y el cliente ClickHouse. Funciona con PhpStorm, PHPStan y Psalm. Requiere PHP 8.6+.',
    ide_link: 'IDE helper en GitHub',
  },
  fr: {
    hero_word: 'Télécharger',
    methods_eyebrow: "Méthodes d'installation",
    methods_title: 'Choisissez votre méthode',
    binaries_eyebrow: 'Binaires pre-compiles',
    requirements_title: 'Prerequis',
    requirements: ['Compile avec le noyau async active (--enable-async).', 'Compilation Thread Safe (ZTS) de PHP.', 'Linux, macOS ou Windows sur x86-64 / ARM64.'],
    verify_title: 'Verifiez votre telechargement',
    verify_desc: 'Chaque version Windows est publiee avec des sommes de controle SHA-256. Verifiez l\'integrite avant l\'installation :',
    binaries_title: 'Un paquet pour votre plateforme',
    subtitle: "Scripts d'installation pour Linux/macOS, images Docker et binaires Windows pre-compiles.",
    badge: 'Version expérimentale',
    build_title: 'Compiler depuis les sources',
    build_subtitle: "Methode d'installation recommandee pour Linux et macOS. Le script telecharge le code source de PHP, l'extension TrueAsync et compile le tout automatiquement.",
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'Toutes les versions sur GitHub',
    install_docs: "Documentation d'installation",
    ide_eyebrow: "Outils pour l'éditeur",
    ide_title: "Autocomplétion et stubs pour l'IDE",
    ide_desc: "Installez le paquet de développement avec les stubs : autocomplétion, documentation intégrée et aides à l'analyse statique pour le cœur async, le serveur HTTP et le client ClickHouse. Compatible avec PhpStorm, PHPStan et Psalm. Nécessite PHP 8.6+.",
    ide_link: 'IDE helper sur GitHub',
  },
  it: {
    hero_word: 'Scarica',
    methods_eyebrow: 'Metodi di installazione',
    methods_title: 'Scegli come compilare',
    binaries_eyebrow: 'Binari precompilati',
    requirements_title: 'Requisiti',
    requirements: ['Compilato con il core async abilitato (--enable-async).', 'Build Thread Safe (ZTS) di PHP.', 'Linux, macOS o Windows su x86-64 / ARM64.'],
    verify_title: 'Verifica il download',
    verify_desc: 'Ogni release per Windows è pubblicata con checksum SHA-256. Verifica l\'integrità prima di installare:',
    binaries_title: 'Un pacchetto per la tua piattaforma',
    subtitle: 'Script di installazione per Linux/macOS, immagini Docker e binari precompilati per Windows.',
    badge: 'Versione sperimentale',
    build_title: 'Compilazione dal sorgente',
    build_subtitle: "Metodo di installazione consigliato per Linux e macOS. Lo script scarica il codice sorgente di PHP, l'estensione TrueAsync e compila tutto automaticamente.",
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'Tutte le release su GitHub',
    install_docs: "Documentazione sull'installazione",
    ide_eyebrow: "Strumenti per l'editor",
    ide_title: "Autocompletamento e stub per l'IDE",
    ide_desc: "Installa il pacchetto di sviluppo con gli stub: autocompletamento, documentazione inline e supporto all'analisi statica per il core async, il server HTTP e il client ClickHouse. Funziona con PhpStorm, PHPStan e Psalm. Richiede PHP 8.6+.",
    ide_link: 'IDE helper su GitHub',
  },
  ko: {
    hero_word: '다운로드',
    methods_eyebrow: '설치 방법',
    methods_title: '빌드 방법 선택',
    binaries_eyebrow: '사전 빌드 바이너리',
    requirements_title: '요구 사항',
    requirements: ['async 코어를 활성화하여 빌드 (--enable-async).', 'Thread Safe (ZTS) PHP 빌드.', 'x86-64 / ARM64의 Linux, macOS 또는 Windows.'],
    verify_title: '다운로드 검증',
    verify_desc: '모든 Windows 릴리스는 SHA-256 체크섬과 함께 게시됩니다. 설치 전에 무결성을 확인하세요:',
    binaries_title: '플랫폼에 맞는 패키지 받기',
    subtitle: 'Linux/macOS용 설치 스크립트, Docker 이미지, 사전 빌드된 Windows 바이너리.',
    badge: '실험 버전',
    build_title: '소스에서 빌드',
    build_subtitle: 'Linux 및 macOS에 권장되는 설치 방법입니다. 스크립트가 PHP 소스 코드와 TrueAsync 확장을 다운로드하고 모든 것을 자동으로 빌드합니다.',
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'GitHub의 모든 릴리스',
    install_docs: '설치 문서',
    ide_eyebrow: '에디터 도구',
    ide_title: 'IDE 자동 완성 및 스텁',
    ide_desc: 'async 코어, HTTP 서버, ClickHouse 클라이언트를 위한 자동 완성, 인라인 문서, 정적 분석 스텁을 제공하는 개발용 패키지를 설치하세요. PhpStorm, PHPStan, Psalm에서 작동합니다. PHP 8.6+ 필요.',
    ide_link: 'GitHub의 IDE helper',
  },
  uk: {
    hero_word: 'Завантажити',
    methods_eyebrow: 'Способи встановлення',
    methods_title: 'Виберіть спосіб збірки',
    binaries_eyebrow: 'Готові збірки',
    requirements_title: 'Вимоги',
    requirements: ['Збірка з увімкненим async-ядром (--enable-async).', 'Thread Safe (ZTS) збірка PHP.', 'Linux, macOS або Windows на x86-64 / ARM64.'],
    verify_title: 'Перевірте завантаження',
    verify_desc: 'Кожен реліз для Windows публікується з контрольними сумами SHA-256. Перевірте цілісність перед встановленням:',
    binaries_title: 'Пакет для вашої платформи',
    subtitle: 'Скрипти встановлення для Linux/macOS, Docker-образи та готові збірки для Windows.',
    badge: 'Експериментальна версія',
    build_title: 'Збірка з вихідного коду',
    build_subtitle: 'Рекомендований спосіб встановлення для Linux та macOS. Скрипт завантажує вихідний код PHP, розширення TrueAsync та збирає все автоматично.',
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'Усі релізи на GitHub',
    install_docs: 'Документація зі встановлення',
    ide_eyebrow: 'Інструменти редактора',
    ide_title: 'Автодоповнення та стаби для IDE',
    ide_desc: 'Встановіть dev-пакет зі стабами: автодоповнення, вбудована документація та підказки для статичного аналізу за async-ядром, HTTP-сервером і клієнтом ClickHouse. Працює з PhpStorm, PHPStan і Psalm. Потрібен PHP 8.6+.',
    ide_link: 'IDE helper на GitHub',
  },
  zh: {
    hero_word: '下载',
    methods_eyebrow: '安装方式',
    methods_title: '选择构建方式',
    binaries_eyebrow: '预编译二进制文件',
    requirements_title: '系统要求',
    requirements: ['启用 async 核心构建 (--enable-async)。', '线程安全 (ZTS) 的 PHP 构建。', 'x86-64 / ARM64 上的 Linux、macOS 或 Windows。'],
    verify_title: '验证下载',
    verify_desc: '每个 Windows 发行版都附带 SHA-256 校验和。安装前请验证完整性：',
    binaries_title: '获取适合您平台的软件包',
    subtitle: 'Linux/macOS 安装脚本、Docker 镜像和预编译 Windows 二进制文件。',
    badge: '实验版本',
    build_title: '从源码构建',
    build_subtitle: '推荐的 Linux 和 macOS 安装方式。脚本会自动下载 PHP 源码、TrueAsync 扩展并完成编译。',
    docker_title: 'Docker',
    windows_title: 'Windows',
    all_releases: 'GitHub 上的所有版本',
    install_docs: '安装文档',
    ide_eyebrow: '编辑器工具',
    ide_title: 'IDE 自动补全与桩文件',
    ide_desc: '安装开发依赖包，为 async 核心、HTTP 服务器和 ClickHouse 客户端提供自动补全、内联文档和静态分析桩文件。支持 PhpStorm、PHPStan 和 Psalm。需要 PHP 8.6+。',
    ide_link: 'GitHub 上的 IDE helper',
  },
}

const t = computed(() => downloadI18n[currentLang.value] || downloadI18n.en)

// Release data is loaded from .vitepress/data/releases.json so CI can update
// it without touching this component. See .github/workflows/build-release.yml
// in true-async/releases for the updater script.
const dockerImages = releasesData.dockerImages
const versions = releasesData.versions

const currentRelease = versions.find(v => !v.old)
const oldReleases = versions.filter(v => v.old)

// Windows files of the current release (the only prebuilt binaries we ship).
const windowsFiles = computed(() => {
  const plat = currentRelease?.platforms?.find(p => p.name === 'Windows')
  return plat ? plat.files : []
})

const allReleasesUrl = 'https://github.com/true-async/releases/releases'
const docsUrl = computed(() => `/${currentLang.value}/docs.html`)

// Dev-only IDE stubs package (autocompletion + static-analysis).
// Repo: https://github.com/true-async/ide-helper
const ideHelperUrl = 'https://github.com/true-async/ide-helper'
const ideCmd = 'composer require --dev true-async/ide-helper'

// Prebuilt-binaries grid (Linux / macOS / Windows), mockup-style. Linux and
// macOS point at the build scripts (we ship no tarball); Windows links the real
// release zip when available, else the releases page.
const winZip = computed(() => windowsFiles.value.find(f => f.label === 'Release') || windowsFiles.value[0] || null)
const platforms = computed(() => [
  { name: 'Linux', arch: 'x86-64 · aarch64', file: 'build-linux.sh', icon: 'linux',
    url: 'https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh' },
  { name: 'macOS', arch: 'Apple Silicon · Intel', file: 'build-macos.sh', icon: 'apple',
    url: 'https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh' },
  { name: 'Windows', arch: 'x64 · Thread-safe', icon: 'windows',
    file: winZip.value ? 'windows-x64.zip' : 'GitHub releases',
    url: winZip.value ? winZip.value.url : allReleasesUrl },
])

// The hero one-liner: the recommended Linux build path.
const heroCmd = 'curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash'

// Install-method tabs shown in the terminal window. Each pane carries the raw
// command text (for copy) plus a filename shown in the window title bar.
const methodTabs = [
  {
    key: 'source',
    file: 'build.sh',
    text: `# Linux (Ubuntu/Debian) — interactive wizard
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel, needs Homebrew)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash`,
  },
  {
    key: 'docker',
    file: 'Dockerfile',
    text: `# pull the prebuilt image (CLI + FPM)
docker pull trueasync/php-true-async:latest

# run PHP with the async core ready
docker run --rm trueasync/php-true-async:latest php -v

# or use it as a base in your Dockerfile
FROM trueasync/php-true-async:latest`,
  },
  {
    key: 'windows',
    file: 'install.ps1',
    text: `# quick install via PowerShell
irm https://raw.githubusercontent.com/true-async/releases/master/installer/install.ps1 | iex

# verify the module is loaded
php -m | findstr async`,
  },
]

// "Build from source" splits into an OS sub-choice (Linux / macOS).
const osTabs = [
  {
    name: 'Linux', file: 'build-linux.sh',
    text: `# Ubuntu / Debian - interactive wizard
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash`,
  },
  {
    name: 'macOS', file: 'build-macos.sh',
    text: `# Apple Silicon / Intel - needs Homebrew
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash`,
  },
]

const verifyCmd = computed(() => {
  const v = currentRelease?.version || '0.0.0'
  return `# check the archive against the release digest
sha256sum -c async-${v}.tar.gz.sha256

# verify the maintainer signature
gpg --verify async-${v}.tar.gz.asc`
})

const method = ref(0)
const os = ref(0)
// Active terminal pane: OS sub-choice for "Build from source", else the method tab.
const pane = computed(() => (method.value === 0 ? osTabs[os.value] : methodTabs[method.value]))

// --- terminal syntax highlighting (mockup palette) ---
const KW = new Set(['cd', 'make', 'echo', 'git', 'docker', 'php', 'sha256sum', 'gpg', 'irm', 'iex', 'grep', 'findstr', 'curl', 'pecl', 'composer'])
const DIR = new Set(['FROM', 'RUN', 'COPY', 'WORKDIR', 'CMD', 'ENV'])
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function highlight(line: string) {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('#')) return `<span class="dl-c-comment">${esc(line)}</span>`
  return line.split(/(\s+)/).map(tok => {
    if (tok === '' || /^\s+$/.test(tok)) return tok
    const e = esc(tok)
    if (tok === '&&' || tok === '||' || tok === '|') return `<span class="dl-c-op">${e}</span>`
    if (tok.startsWith('--') || /^-[A-Za-z]/.test(tok)) return `<span class="dl-c-flag">${e}</span>`
    if (DIR.has(tok)) return `<span class="dl-c-dir">${e}</span>`
    if (KW.has(tok)) return `<span class="dl-c-kw">${e}</span>`
    return e
  }).join('')
}
function renderLines(text: string) {
  return text.split('\n').map(line => ({ html: highlight(line) }))
}

const copied = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
function copyText(id: string, text: string) {
  navigator.clipboard.writeText(text).then(() => {
    copied.value = id
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = '' }, 1800)
  })
}
</script>

<template>
  <div class="dl">
    <!-- ===== HERO ===== -->
    <section class="dl-hero">
      <div class="dl-hero-glow" aria-hidden="true"></div>
      <div class="dl-hero-lines" aria-hidden="true"><span></span><span></span></div>
      <div class="dl-hero-inner">
        <div class="hero-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v5.5L4.8 17.4A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 1.7-3.1L14 8.5V3M7.5 14h9"/></svg>
          {{ t.badge }}<template v-if="currentRelease"> &middot; v{{ currentRelease.version }}</template>
        </div>
        <h1 class="dl-h1">{{ t.hero_word }} <span class="dl-brand">TrueAsync</span></h1>
        <p class="dl-lead">{{ t.subtitle }}</p>

        <div class="dl-cmd">
          <span class="dl-cmd-sign">$</span>
          <pre class="dl-cmd-pre"><code>{{ heroCmd }}</code></pre>
          <button class="dl-copy dl-copy--inline" @click="copyText('hero', heroCmd)" :title="copied === 'hero' ? 'Copied' : 'Copy'">
            <template v-if="copied === 'hero'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Copied</template>
            <template v-else><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</template>
          </button>
        </div>

        <div class="dl-hero-actions">
          <a :href="allReleasesUrl" target="_blank" rel="noopener" class="dl-btn dl-btn--primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
            {{ t.all_releases }}
          </a>
          <a :href="docsUrl" class="dl-btn dl-btn--ghost">{{ t.install_docs }}</a>
        </div>
      </div>
    </section>

    <!-- ===== INSTALL METHODS ===== -->
    <section class="dl-section" id="methods">
      <div class="dl-section-head">
        <div class="dl-eyebrow">{{ t.methods_eyebrow }}</div>
        <h2 class="dl-h2">{{ t.methods_title }}</h2>
      </div>

      <div class="dl-methods">
        <div class="dl-tabs">
          <button class="dl-tab" :class="{ 'is-active': method === 0 }" @click="method = 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6-6-6M12 19h8"/></svg>{{ t.build_title }}
          </button>
          <button class="dl-tab" :class="{ 'is-active': method === 1 }" @click="method = 1">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.98 11.08h2.12a.19.19 0 0 0 .19-.19V9.01a.19.19 0 0 0-.19-.19h-2.12a.18.18 0 0 0-.18.18v1.89c0 .1.08.19.18.19m-2.95-5.43h2.12a.19.19 0 0 0 .18-.19V3.57a.19.19 0 0 0-.18-.18h-2.12a.18.18 0 0 0-.19.18v1.89c0 .1.09.18.19.18m0 2.72h2.12a.19.19 0 0 0 .18-.19V6.29a.19.19 0 0 0-.18-.18h-2.12a.18.18 0 0 0-.19.18v1.89c0 .1.09.18.19.19m-2.93 0h2.12a.19.19 0 0 0 .18-.19V6.29a.19.19 0 0 0-.18-.18H8.1a.18.18 0 0 0-.18.18v1.89c0 .1.08.18.18.19m-2.96 0h2.12a.19.19 0 0 0 .18-.19V6.29a.18.18 0 0 0-.18-.18H5.17a.19.19 0 0 0-.19.18v1.89c0 .1.08.18.19.19m5.89 2.71h2.12a.19.19 0 0 0 .18-.19V9.01a.19.19 0 0 0-.18-.19h-2.12a.18.18 0 0 0-.19.18v1.89c0 .1.09.19.19.19m-2.93 0h2.12a.18.18 0 0 0 .18-.19V9.01a.18.18 0 0 0-.18-.19H8.1a.18.18 0 0 0-.18.18v1.89c0 .1.08.19.18.19m-2.96 0h2.12a.18.18 0 0 0 .18-.19V9.01a.18.18 0 0 0-.18-.19H5.17a.19.19 0 0 0-.19.19v1.88c0 .1.08.19.19.19m-2.92 0h2.12a.18.18 0 0 0 .18-.19V9.01a.18.18 0 0 0-.18-.19H2.25a.18.18 0 0 0-.18.18v1.89c0 .1.08.19.18.19M23.76 9.89c-.06-.05-.67-.51-1.95-.51-.34 0-.68.03-1.01.09-.25-1.7-1.65-2.53-1.72-2.57l-.34-.2-.23.33c-.28.44-.49.92-.61 1.43-.23.97-.09 1.88.4 2.66-.6.33-1.55.41-1.74.42H.75a.75.75 0 0 0-.75.75c-.03 1.38.2 2.76.69 4.06.55 1.43 1.36 2.48 2.41 3.12 1.18.72 3.1 1.14 5.28 1.14.98 0 1.96-.09 2.93-.27a12.25 12.25 0 0 0 3.82-1.38 10.5 10.5 0 0 0 2.61-2.14c1.25-1.42 2-3 2.55-4.4h.22c1.37 0 2.21-.55 2.68-1.01.31-.29.55-.65.71-1.05l.1-.29z"/></svg>{{ t.docker_title }}
          </button>
          <button class="dl-tab" :class="{ 'is-active': method === 2 }" @click="method = 2">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>{{ t.windows_title }}
          </button>
        </div>

        <div v-if="method === 0" class="dl-os">
          <button class="dl-os-btn" :class="{ 'is-active': os === 0 }" @click="os = 0">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z"/></svg>Linux
          </button>
          <button class="dl-os-btn" :class="{ 'is-active': os === 1 }" @click="os = 1">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>macOS
          </button>
        </div>

        <div class="dl-terminal">
          <div class="dl-terminal-bar">
            <span class="dl-dot dl-dot--r"></span><span class="dl-dot dl-dot--y"></span><span class="dl-dot dl-dot--g"></span>
            <span class="dl-terminal-file">{{ pane.file }}</span>
            <div class="dl-spacer"></div>
            <button class="dl-copy" @click="copyText('method', pane.text)" :title="copied === 'method' ? 'Copied' : 'Copy'">
              <template v-if="copied === 'method'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Copied</template>
              <template v-else><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</template>
            </button>
          </div>
          <div class="dl-terminal-body">
            <pre class="dl-code"><template v-for="(ln, i) in renderLines(pane.text)" :key="i"><span v-html="ln.html"></span>{{ '\n' }}</template></pre>
          </div>
        </div>

        <p class="dl-note">
          {{ t.build_subtitle }}
          <a :href="docsUrl">{{ t.install_docs }} &rarr;</a>
        </p>
      </div>
    </section>

    <!-- ===== IDE HELPER ===== -->
    <section class="dl-section dl-section--tight" id="ide">
      <div class="dl-section-head">
        <div class="dl-eyebrow">{{ t.ide_eyebrow }}</div>
        <h2 class="dl-h2">{{ t.ide_title }}</h2>
      </div>
      <div class="dl-methods">
        <div class="dl-card">
          <p class="dl-card-lead">{{ t.ide_desc }}</p>
          <div class="dl-inlinecode">
            <pre class="dl-code"><template v-for="(ln, i) in renderLines(ideCmd)" :key="i"><span v-html="ln.html"></span>{{ '\n' }}</template></pre>
            <button class="dl-copy dl-copy--abs" @click="copyText('ide', ideCmd)" :title="copied === 'ide' ? 'Copied' : 'Copy'">
              <template v-if="copied === 'ide'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></template>
              <template v-else><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></template>
            </button>
          </div>
          <a :href="ideHelperUrl" target="_blank" rel="noopener" class="dl-btn dl-btn--ghost dl-ide-link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/></svg>
            {{ t.ide_link }}
          </a>
        </div>
      </div>
    </section>

    <!-- ===== PREBUILT BINARIES (mockup 3-platform grid) ===== -->
    <section class="dl-section" id="binaries">
      <div class="dl-section-head">
        <div class="dl-eyebrow">{{ t.binaries_eyebrow }}</div>
        <h2 class="dl-h2">{{ t.binaries_title }}</h2>
      </div>
      <div class="dl-grid dl-grid-3">
        <div v-for="p in platforms" :key="p.name" class="dl-dlcard">
          <div class="dl-dlcard-ic">
            <svg v-if="p.icon === 'linux'" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z"/></svg>
            <svg v-else-if="p.icon === 'apple'" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
          </div>
          <div class="dl-dlcard-name">{{ p.name }}</div>
          <div class="dl-dlcard-arch">{{ p.arch }}</div>
          <div class="dl-spacer"></div>
          <a :href="p.url" target="_blank" rel="noopener" class="dl-dlbtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
            {{ p.file }}
          </a>
        </div>
      </div>
    </section>

    <!-- ===== REQUIREMENTS + VERIFY (mockup 2-col) ===== -->
    <section class="dl-section dl-section--tight dl-section--last">
      <div class="dl-grid dl-grid-2">
        <div class="dl-card">
          <h3 class="dl-card-title">
            <svg class="dl-card-ic" viewBox="0 0 24 24" fill="none" stroke="var(--nav-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            {{ t.requirements_title }}
          </h3>
          <ul class="dl-checklist">
            <li v-for="(r, i) in t.requirements" :key="i">
              <svg viewBox="0 0 24 24" fill="none" stroke="#5AD1B0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 9-10"/></svg>
              <span>{{ r }}</span>
            </li>
          </ul>
        </div>
        <div class="dl-card">
          <h3 class="dl-card-title">
            <svg class="dl-card-ic" viewBox="0 0 24 24" fill="none" stroke="var(--nav-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {{ t.verify_title }}
          </h3>
          <p class="dl-card-lead">{{ t.verify_desc }}</p>
          <div class="dl-inlinecode">
            <pre class="dl-code"><template v-for="(ln, i) in renderLines(verifyCmd)" :key="i"><span v-html="ln.html"></span>{{ '\n' }}</template></pre>
            <button class="dl-copy dl-copy--abs" @click="copyText('verify', verifyCmd)" :title="copied === 'verify' ? 'Copied' : 'Copy'">
              <template v-if="copied === 'verify'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></template>
              <template v-else><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></template>
            </button>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.dl {
  --dl-glow: rgba(106, 84, 245, 0.16);
  --dl-accent: var(--nav-accent);
  --dl-code-bg: #12101F;
  --dl-code-text: #D6D3E6;
  --dl-code-comment: #6f6d80;
  padding-top: var(--navbar-h);
}
[data-theme="dark"] .dl { --dl-glow: rgba(106, 84, 245, 0.30); }

/* ---------- HERO ---------- */
.dl-hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
}
.dl-hero-glow {
  position: absolute;
  top: -180px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 520px;
  max-width: 100%;
  background: radial-gradient(closest-side, var(--dl-glow), transparent 72%);
  pointer-events: none;
}
.dl-hero-lines { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.dl-hero-lines span {
  position: absolute; left: -15%; right: -15%; height: 1px;
  overflow: hidden; opacity: 0.13;
}
/* transform-only travelling glint (rasterised once, composited) — see _hero.scss */
.dl-hero-lines span::before {
  content: ""; position: absolute; inset: 0; width: 200%;
  background-image: repeating-linear-gradient(90deg, transparent 0, transparent 20%, #7a96ff 24.7%, #95a6ff 25%, #7a96ff 25.3%, transparent 30%, transparent 50%);
  filter: blur(0.8px); will-change: transform;
  animation: dl-flow 11s linear infinite;
}
.dl-hero-lines span:nth-child(1) { top: 34%; }
.dl-hero-lines span:nth-child(2) { top: 62%; opacity: 0.1; }
.dl-hero-lines span:nth-child(2)::before { animation-duration: 15s; animation-direction: reverse; animation-delay: -3s; }
@keyframes dl-flow { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .dl-hero-lines span::before { animation: none; } }

.dl-hero-inner {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  padding: 76px 32px 64px;
  text-align: center;
}
.dl-h1 { font-size: 52px; line-height: 1.04; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 20px; }
.dl-lead { font-size: 19px; line-height: 1.55; color: var(--color-text-secondary); max-width: 600px; margin: 0 auto 38px; }

.dl-cmd {
  display: flex; align-items: stretch;
  max-width: 620px; margin: 0 auto;
  background: var(--dl-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 24px 54px -24px rgba(0, 0, 0, 0.7);
}
.dl-cmd-sign { display: flex; align-items: center; padding: 0 18px; color: #5AD1B0; font-family: var(--font-mono); font-size: 16px; font-weight: 600; }
.dl-cmd-pre { flex: 1; margin: 0; padding: 18px 4px; background: transparent; border: 0; font-family: var(--font-mono); font-size: 14px; color: var(--dl-code-text); text-align: left; overflow-x: auto; white-space: nowrap; }

/* barely-there thin scrollbars for the code strips */
.dl-cmd-pre, .dl-code { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.12) transparent; }
.dl-cmd-pre::-webkit-scrollbar, .dl-code::-webkit-scrollbar { height: 2px; }
.dl-cmd-pre::-webkit-scrollbar-track, .dl-code::-webkit-scrollbar-track { background: transparent; border: 0; }
.dl-cmd-pre::-webkit-scrollbar-thumb, .dl-code::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.14); border: 0; border-radius: 2px; }
.dl-cmd-pre::-webkit-scrollbar-thumb:hover, .dl-code::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }
.dl-cmd-pre code { background: none; padding: 0; color: inherit; font-size: inherit; }

.dl-hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 26px; }
.dl-btn { display: inline-flex; align-items: center; gap: 9px; height: 50px; padding: 0 24px; border-radius: 12px; font-weight: 600; font-size: 15.5px; transition: transform 0.25s ease, box-shadow 0.3s ease, background 0.25s ease, border-color 0.25s ease; }
.dl-btn svg { width: 16px; height: 16px; }
.dl-btn--primary { background: var(--nav-primary); color: #fff; box-shadow: 0 8px 24px rgba(106, 84, 245, 0.4); }
.dl-btn--primary:hover { transform: translateY(-1px); box-shadow: 0 12px 28px -8px rgba(106, 84, 245, 0.7); }
.dl-btn--ghost { background: var(--nav-panel); border: 1px solid var(--color-border); color: var(--color-text); }
.dl-btn--ghost:hover { border-color: var(--nav-primary); background: var(--nav-panel-hover); }

/* ---------- SECTIONS ---------- */
.dl-section { max-width: 1120px; margin: 0 auto; padding: 76px 32px 0; }
.dl-section--tight { padding-top: 44px; }
.dl-section--last { padding-bottom: 96px; }
.dl-section-head { text-align: center; margin-bottom: 40px; }
.dl-eyebrow { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dl-accent); margin-bottom: 12px; }
.dl-h2 { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }

/* ---------- METHODS / TERMINAL ---------- */
.dl-methods { max-width: 820px; margin: 0 auto; }
.dl-tabs { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 14px; margin-bottom: 20px; }
.dl-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 12px; border: none; border-radius: 10px; cursor: pointer;
  background: transparent; color: var(--color-text-muted);
  font-family: var(--font-sans); font-size: 14.5px; font-weight: 600;
  transition: background 0.2s ease, color 0.2s ease;
}
.dl-tab svg { width: 16px; height: 16px; }
.dl-tab:hover { color: var(--color-text); }
.dl-tab.is-active { background: var(--nav-dropdown-active); color: var(--dl-accent); }

/* OS sub-choice inside "Build from source" */
.dl-os { display: flex; gap: 8px; margin-bottom: 14px; }
.dl-os-btn { display: inline-flex; align-items: center; gap: 7px; padding: 7px 15px; border: 1px solid var(--color-border); border-radius: 100px; background: var(--color-bg-subtle); color: var(--color-text-muted); font-family: var(--font-sans); font-size: 13.5px; font-weight: 600; cursor: pointer; transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease; }
.dl-os-btn svg { width: 15px; height: 15px; }
.dl-os-btn:hover { color: var(--color-text); border-color: var(--nav-primary); }
.dl-os-btn.is-active { color: #fff; background: var(--nav-primary); border-color: var(--nav-primary); }

.dl-terminal { background: var(--dl-code-bg); border: 1px solid var(--color-border); border-radius: 16px; overflow: hidden; box-shadow: 0 30px 70px -30px rgba(0, 0, 0, 0.6); }
.dl-terminal-bar { display: flex; align-items: center; gap: 8px; padding: 13px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.dl-dot { width: 11px; height: 11px; border-radius: 50%; }
.dl-dot--r { background: #ff5f57; } .dl-dot--y { background: #febc2e; } .dl-dot--g { background: #28c840; }
.dl-terminal-file { margin-left: 8px; font-family: var(--font-mono); font-size: 12px; color: #7d7b8c; }
.dl-spacer { flex: 1; }
.dl-terminal-body { padding: 20px 22px; }
.dl-code { margin: 0; background: transparent; border: 0; font-family: var(--font-mono); font-size: 13.5px; line-height: 1.9; color: var(--dl-code-text); overflow-x: auto; white-space: pre; }
.dl-code code { background: none; padding: 0; color: inherit; font-size: inherit; }
.dl-c-comment { color: var(--dl-code-comment); }

.dl-note { text-align: center; font-size: 13.5px; color: var(--color-text-muted); margin: 16px 0 0; }
.dl-note a { color: var(--dl-accent); }

/* copy buttons */
.dl-copy { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; background: var(--nav-panel); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-muted); font-family: var(--font-mono); font-size: 12px; font-weight: 600; cursor: pointer; transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease; }
.dl-copy svg { width: 13px; height: 13px; }
.dl-copy:hover { color: var(--color-text); background: var(--nav-panel-hover); border-color: var(--nav-primary); }
.dl-copy--inline { margin: 10px; padding: 0 16px; }
.dl-copy--abs { position: absolute; top: 12px; right: 12px; padding: 6px 9px; }

/* ---------- CARDS / GRID ---------- */
.dl-grid { display: grid; gap: 20px; }
.dl-grid-2 { grid-template-columns: 1fr 1fr; }
.dl-grid-3 { grid-template-columns: repeat(3, 1fr); }
.dl-card { background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 16px; padding: 26px 24px; }
.dl-card-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; margin: 0 0 16px; }
.dl-card-ic { width: 20px; height: 20px; flex-shrink: 0; }
.dl-card-lead { font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; margin: 0 0 16px; }

.dl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dl-table tr { border-bottom: 1px solid var(--color-border); }
.dl-table tr:last-child { border-bottom: none; }
.dl-table-key { padding: 0.55rem 1rem 0.55rem 0; white-space: nowrap; vertical-align: top; }
.dl-table-val { padding: 0.55rem 0; color: var(--color-text-muted); }
.dl-table code, .dl-table-key code { font-family: var(--font-mono); font-size: 12.5px; color: var(--dl-accent); background: none; }

.dl-imglist { display: flex; flex-direction: column; }
.dl-imgrow { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.dl-imgrow:last-child { border-bottom: none; }
.dl-tag { font-family: var(--font-mono); font-size: 12.5px; color: var(--color-text); background: var(--color-code-bg); padding: 3px 9px; border-radius: 6px; }
.dl-imgdesc { font-size: 13px; color: var(--color-text-muted); }

/* prebuilt-binaries platform cards (mockup) */
.dl-dlcard { display: flex; flex-direction: column; background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 16px; padding: 26px 24px; transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1), border-color 0.3s ease, box-shadow 0.35s ease; }
.dl-dlcard:hover { transform: translateY(-4px); border-color: var(--nav-primary); box-shadow: 0 22px 44px -22px rgba(106, 84, 245, 0.5); }
.dl-dlcard-ic { width: 48px; height: 48px; border-radius: 12px; background: var(--nav-dropdown-active); color: var(--dl-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
.dl-dlcard-ic svg { width: 24px; height: 24px; }
.dl-dlcard-name { font-size: 19px; font-weight: 700; margin-bottom: 4px; }
.dl-dlcard-arch { font-family: var(--font-mono); font-size: 12.5px; color: var(--color-text-muted); margin-bottom: 20px; }
.dl-dlbtn { display: flex; align-items: center; justify-content: center; gap: 9px; height: 44px; background: var(--nav-primary); color: #fff; border-radius: 11px; font-weight: 600; font-size: 14px; font-family: var(--font-mono); transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.3s ease; }
.dl-dlbtn svg { width: 15px; height: 15px; }
.dl-dlbtn:hover { background: var(--color-primary-dark); transform: translateY(-1px); box-shadow: 0 12px 28px -10px rgba(106, 84, 245, 0.7); }

.dl-brand { color: var(--dl-accent); }

/* terminal syntax colours (mockup palette) */
.dl-c-kw { color: #C08BFF; }
.dl-c-flag { color: #5AD1B0; }
.dl-c-op { color: #E8B77C; }
.dl-c-dir { color: #E28FD0; }

.dl-win-extra { margin-top: 20px; }
.dl-inlinecode { position: relative; background: var(--dl-code-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px 18px; margin-top: 4px; }
.dl-inlinecode .dl-code { font-size: 12.5px; line-height: 1.85; }
.dl-ide-link { margin-top: 18px; }
.dl-fineprint { font-size: 13px; color: var(--color-text-muted); margin: 14px 0 0; }
.dl-fineprint code, .dl-card-lead code { font-family: var(--font-mono); font-size: 12px; color: var(--dl-accent); }

.dl-details { margin-top: 18px; }
.dl-details summary { cursor: pointer; font-size: 13.5px; font-weight: 600; color: var(--color-text-secondary); padding: 8px 0; }
.dl-details summary:hover { color: var(--color-text); }
.dl-table--rel { margin-top: 10px; }
.dl-table--rel th { text-align: left; font-size: 12px; color: var(--color-text-muted); font-weight: 600; padding: 6px 12px 6px 0; }
.dl-table--rel td { padding: 8px 12px 8px 0; font-size: 12.5px; }
.dl-relfile { display: inline-block; margin-right: 12px; color: var(--dl-accent); font-family: var(--font-mono); font-size: 12px; }

.dl-checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 13px; }
.dl-checklist li { display: flex; gap: 11px; align-items: flex-start; font-size: 14px; color: var(--color-text-secondary); line-height: 1.5; }
.dl-checklist svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }

.dl-reslist { display: flex; flex-direction: column; gap: 12px; }
.dl-reslist a { font-size: 14.5px; color: var(--color-text-secondary); transition: color 0.2s ease; }
.dl-reslist a:hover { color: var(--dl-accent); }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 860px) {
  .dl-h1 { font-size: 40px; }
  .dl-h2 { font-size: 27px; }
  .dl-grid-2, .dl-grid-3 { grid-template-columns: 1fr; }
  .dl-tab { font-size: 13px; padding: 10px 6px; }
  .dl-tab svg { display: none; }
  .dl-hero-inner, .dl-section { padding-left: 20px; padding-right: 20px; }
  .dl-hero-inner { padding-top: 56px; }
}
</style>
