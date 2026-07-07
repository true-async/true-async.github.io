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
  title: string
  subtitle: string
  current_release: string
  previous_releases: string
  release_date: string
  requires_php: string
  all_builds_zts: string
  changelog: string
  build_title: string
  build_subtitle: string
  build_linux_title: string
  build_linux_description: string
  build_linux_distros: string
  build_macos_title: string
  build_macos_description: string
  build_noninteractive: string
  build_options_title: string
  build_management_title: string
  build_management_desc: string
  docker_title: string
  docker_description: string
  available_images: string
  quick_start: string
  run_script: string
  dockerfile_usage: string
  windows_title: string
  windows_subtitle: string
  windows_release_desc: string
  windows_debug_desc: string
  windows_verify_note: string
  windows_powershell_title: string
  additional_resources: string
  all_releases: string
  source_on_github: string
  docker_hub: string
  install_docs: string
  sidebar_install: string
  sidebar_help: string
  resources_link: string
  version_col: string
  hero_word: string
  methods_eyebrow: string
  methods_title: string
  requirements_title: string
  requirements: string[]
  verify_title: string
  verify_desc: string
  binaries_eyebrow: string
  binaries_title: string
  build_options: { opt: string; desc: string }[]
  build_management_commands: { cmd: string; desc: string }[]
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
    title: 'Installation',
    subtitle: 'Installation scripts for Linux/macOS, Docker images, and pre-built Windows binaries.',
    current_release: 'Current Release',
    previous_releases: 'Previous releases',
    release_date: 'Release date',
    requires_php: 'Requires',
    all_builds_zts: 'All builds are Thread Safe (ZTS).',
    changelog: 'Changelog',
    build_title: 'Build from Source',
    build_subtitle: 'Recommended installation method for Linux and macOS. The script downloads PHP source code, the TrueAsync extension, and builds everything automatically.',
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: 'An interactive wizard will guide you through setup: choosing extensions, debug mode, installation path, and PATH configuration.',
    build_linux_distros: 'Ubuntu, Debian, and other apt-based distributions.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) and Intel. Requires <a href="https://brew.sh" target="_blank">Homebrew</a>.',
    build_noninteractive: 'Non-interactive mode (CI / automation)',
    build_options_title: 'Build Options',
    build_management_title: 'Installation Management',
    build_management_desc: 'After building, the <code>php-trueasync</code> utility is available:',
    docker_title: 'Docker',
    docker_description: 'Pre-built images with PHP and TrueAsync. Each image includes CLI and FPM.',
    available_images: 'Available Images',
    quick_start: 'Quick Start',
    run_script: 'Run a script',
    dockerfile_usage: 'Usage in Dockerfile',
    windows_title: 'Windows',
    windows_subtitle: 'Pre-built PHP binaries with TrueAsync for Windows x64.',
    windows_release_desc: 'For general use',
    windows_debug_desc: 'Debug symbols and assertions — for PHP/extension development',
    windows_verify_note: 'SHA256 hashes are available in <code>sha256sums.txt</code> in each release.',
    windows_powershell_title: 'Quick Install (PowerShell)',
    additional_resources: 'Resources',
    all_releases: 'All releases on GitHub',
    source_on_github: 'Source code on GitHub',
    docker_hub: 'Docker Hub',
    install_docs: 'Installation documentation',
    sidebar_install: 'Installation',
    sidebar_help: 'Help',
    resources_link: 'Resources',
    version_col: 'Version',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: 'Installation directory (default <code>$HOME/.php-trueasync</code>)' },
      { opt: '<code>--set-default</code>', desc: 'Add to PATH as default php' },
      { opt: '<code>--debug</code>', desc: 'Build with debug symbols' },
      { opt: '<code>--extensions PRESET</code>', desc: 'Extension set: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: 'Skip the interactive wizard' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: 'Rebuild from fresh sources' },
      { cmd: 'php-trueasync version', desc: 'Show installed version' },
      { cmd: 'php-trueasync uninstall', desc: 'Uninstall TrueAsync PHP and clean up PATH' },
    ],
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
    title: 'Установка',
    subtitle: 'Скрипты установки для Linux/macOS, Docker-образы и готовые сборки для Windows.',
    current_release: 'Текущий релиз',
    previous_releases: 'Предыдущие релизы',
    release_date: 'Дата выпуска',
    requires_php: 'Требуется',
    all_builds_zts: 'Все сборки — Thread Safe (ZTS).',
    changelog: 'Список изменений',
    build_title: 'Сборка из исходников',
    build_subtitle: 'Рекомендуемый способ установки для Linux и macOS. Скрипт скачает исходники PHP, расширение TrueAsync и соберёт всё автоматически.',
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: 'Интерактивный мастер проведёт через настройку: выбор расширений, debug-режим, путь установки и настройку PATH.',
    build_linux_distros: 'Ubuntu, Debian и другие apt-based дистрибутивы.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) и Intel. Требуется <a href="https://brew.sh" target="_blank">Homebrew</a>.',
    build_noninteractive: 'Non-interactive режим (CI / автоматизация)',
    build_options_title: 'Параметры сборки',
    build_management_title: 'Управление установкой',
    build_management_desc: 'После сборки доступна утилита <code>php-trueasync</code>:',
    docker_title: 'Docker',
    docker_description: 'Готовые образы с PHP и TrueAsync. Каждый образ включает CLI и FPM.',
    available_images: 'Доступные образы',
    quick_start: 'Быстрый старт',
    run_script: 'Запуск скрипта',
    dockerfile_usage: 'Использование в Dockerfile',
    windows_title: 'Windows',
    windows_subtitle: 'Готовые сборки PHP с TrueAsync для Windows x64.',
    windows_release_desc: 'Для общего использования',
    windows_debug_desc: 'Debug-символы и assertions — для разработки PHP/расширений',
    windows_verify_note: 'SHA256-хеши доступны в <code>sha256sums.txt</code> в каждом релизе.',
    windows_powershell_title: 'Быстрая установка (PowerShell)',
    additional_resources: 'Ссылки',
    all_releases: 'Все релизы на GitHub',
    source_on_github: 'Исходный код на GitHub',
    docker_hub: 'Docker Hub',
    install_docs: 'Документация по установке',
    sidebar_install: 'Установка',
    sidebar_help: 'Справка',
    resources_link: 'Ссылки',
    version_col: 'Версия',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: 'Каталог установки (по умолчанию <code>$HOME/.php-trueasync</code>)' },
      { opt: '<code>--set-default</code>', desc: 'Добавить в PATH как php по умолчанию' },
      { opt: '<code>--debug</code>', desc: 'Сборка с debug-символами' },
      { opt: '<code>--extensions PRESET</code>', desc: 'Набор расширений: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: 'Пропустить интерактивный мастер' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: 'Пересобрать из свежих исходников' },
      { cmd: 'php-trueasync version', desc: 'Показать установленную версию' },
      { cmd: 'php-trueasync uninstall', desc: 'Удалить TrueAsync PHP и очистить PATH' },
    ],
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
    title: 'Installation',
    subtitle: 'Installationsskripte für Linux/macOS, Docker-Images und vorkompilierte Windows-Binärdateien.',
    current_release: 'Aktuelles Release',
    previous_releases: 'Ältere Versionen',
    release_date: 'Veröffentlichungsdatum',
    requires_php: 'Voraussetzungen',
    all_builds_zts: 'Alle Builds sind Thread Safe (ZTS).',
    changelog: 'Änderungsprotokoll',
    build_title: 'Aus Quellcode kompilieren',
    build_subtitle: 'Empfohlene Installationsmethode für Linux und macOS. Das Skript lädt den PHP-Quellcode, die TrueAsync-Erweiterung herunter und kompiliert alles automatisch.',
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: 'Ein interaktiver Assistent führt Sie durch die Einrichtung: Auswahl der Erweiterungen, Debug-Modus, Installationspfad und PATH-Konfiguration.',
    build_linux_distros: 'Ubuntu, Debian und andere apt-basierte Distributionen.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) und Intel. Erfordert <a href="https://brew.sh" target="_blank">Homebrew</a>.',
    build_noninteractive: 'Nicht-interaktiver Modus (CI / Automatisierung)',
    build_options_title: 'Build-Optionen',
    build_management_title: 'Installationsverwaltung',
    build_management_desc: 'Nach dem Kompilieren steht das Dienstprogramm <code>php-trueasync</code> zur Verfügung:',
    docker_title: 'Docker',
    docker_description: 'Vorkompilierte Images mit PHP und TrueAsync. Jedes Image enthält CLI und FPM.',
    available_images: 'Verfügbare Images',
    quick_start: 'Schnellstart',
    run_script: 'Skript ausführen',
    dockerfile_usage: 'Verwendung in Dockerfile',
    windows_title: 'Windows',
    windows_subtitle: 'Vorkompilierte PHP-Binärdateien mit TrueAsync für Windows x64.',
    windows_release_desc: 'Für den allgemeinen Gebrauch',
    windows_debug_desc: 'Debug-Symbole und Assertions — für PHP-/Erweiterungsentwicklung',
    windows_verify_note: 'SHA256-Hashes sind in <code>sha256sums.txt</code> in jedem Release verfügbar.',
    windows_powershell_title: 'Schnellinstallation (PowerShell)',
    additional_resources: 'Ressourcen',
    all_releases: 'Alle Releases auf GitHub',
    source_on_github: 'Quellcode auf GitHub',
    docker_hub: 'Docker Hub',
    install_docs: 'Installationsdokumentation',
    sidebar_install: 'Installation',
    sidebar_help: 'Hilfe',
    resources_link: 'Ressourcen',
    version_col: 'Version',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: 'Installationsverzeichnis (Standard <code>$HOME/.php-trueasync</code>)' },
      { opt: '<code>--set-default</code>', desc: 'Als Standard-PHP zum PATH hinzufügen' },
      { opt: '<code>--debug</code>', desc: 'Mit Debug-Symbolen kompilieren' },
      { opt: '<code>--extensions PRESET</code>', desc: 'Erweiterungsset: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: 'Interaktiven Assistenten überspringen' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: 'Aus frischen Quellen neu kompilieren' },
      { cmd: 'php-trueasync version', desc: 'Installierte Version anzeigen' },
      { cmd: 'php-trueasync uninstall', desc: 'TrueAsync PHP deinstallieren und PATH bereinigen' },
    ],
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
    title: 'Instalación',
    subtitle: 'Scripts de instalación para Linux/macOS, imágenes Docker y binarios precompilados para Windows.',
    current_release: 'Versión actual',
    previous_releases: 'Versiones anteriores',
    release_date: 'Fecha de lanzamiento',
    requires_php: 'Requisitos',
    all_builds_zts: 'Todas las compilaciones son Thread Safe (ZTS).',
    changelog: 'Registro de cambios',
    build_title: 'Compilar desde el código fuente',
    build_subtitle: 'Método de instalación recomendado para Linux y macOS. El script descarga el código fuente de PHP, la extensión TrueAsync, y compila todo automáticamente.',
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: 'Un asistente interactivo le guiará durante la configuración: elegir extensiones, modo de depuración, ruta de instalación y configuración de PATH.',
    build_linux_distros: 'Ubuntu, Debian y otras distribuciones basadas en apt.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) e Intel. Requiere <a href="https://brew.sh" target="_blank">Homebrew</a>.',
    build_noninteractive: 'Modo no interactivo (CI / automatización)',
    build_options_title: 'Opciones de compilación',
    build_management_title: 'Gestión de la instalación',
    build_management_desc: 'Después de compilar, la utilidad <code>php-trueasync</code> estará disponible:',
    docker_title: 'Docker',
    docker_description: 'Imágenes precompiladas con PHP y TrueAsync. Cada imagen incluye CLI y FPM.',
    available_images: 'Imágenes disponibles',
    quick_start: 'Inicio rápido',
    run_script: 'Ejecutar un script',
    dockerfile_usage: 'Uso en Dockerfile',
    windows_title: 'Windows',
    windows_subtitle: 'Binarios precompilados de PHP con TrueAsync para Windows x64.',
    windows_release_desc: 'Para uso general',
    windows_debug_desc: 'Símbolos de depuración y aserciones — para desarrollo de PHP/extensiones',
    windows_verify_note: 'Los hashes SHA256 están disponibles en <code>sha256sums.txt</code> en cada versión.',
    windows_powershell_title: 'Instalación rápida (PowerShell)',
    additional_resources: 'Recursos',
    all_releases: 'Todas las versiones en GitHub',
    source_on_github: 'Código fuente en GitHub',
    docker_hub: 'Docker Hub',
    install_docs: 'Documentación de instalación',
    sidebar_install: 'Instalación',
    sidebar_help: 'Ayuda',
    resources_link: 'Recursos',
    version_col: 'Versión',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: 'Directorio de instalación (por defecto <code>$HOME/.php-trueasync</code>)' },
      { opt: '<code>--set-default</code>', desc: 'Agregar al PATH como php predeterminado' },
      { opt: '<code>--debug</code>', desc: 'Compilar con símbolos de depuración' },
      { opt: '<code>--extensions PRESET</code>', desc: 'Conjunto de extensiones: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: 'Omitir el asistente interactivo' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: 'Recompilar desde fuentes frescas' },
      { cmd: 'php-trueasync version', desc: 'Mostrar la versión instalada' },
      { cmd: 'php-trueasync uninstall', desc: 'Desinstalar TrueAsync PHP y limpiar PATH' },
    ],
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
    title: 'Installation',
    subtitle: "Scripts d'installation pour Linux/macOS, images Docker et binaires Windows pre-compiles.",
    current_release: 'Version actuelle',
    previous_releases: 'Versions précédentes',
    release_date: 'Date de sortie',
    requires_php: 'Prerequis',
    all_builds_zts: 'Toutes les compilations sont Thread Safe (ZTS).',
    changelog: 'Journal des modifications',
    build_title: 'Compiler depuis les sources',
    build_subtitle: "Methode d'installation recommandee pour Linux et macOS. Le script telecharge le code source de PHP, l'extension TrueAsync et compile le tout automatiquement.",
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: "Un assistant interactif vous guidera dans la configuration : choix des extensions, mode debogage, chemin d'installation et configuration du PATH.",
    build_linux_distros: 'Ubuntu, Debian et autres distributions basees sur apt.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) et Intel. Necessite <a href="https://brew.sh" target="_blank">Homebrew</a>.',
    build_noninteractive: 'Mode non interactif (CI / automatisation)',
    build_options_title: 'Options de compilation',
    build_management_title: "Gestion de l'installation",
    build_management_desc: "Apres la compilation, l'utilitaire <code>php-trueasync</code> est disponible :",
    docker_title: 'Docker',
    docker_description: 'Images pre-compilees avec PHP et TrueAsync. Chaque image inclut CLI et FPM.',
    available_images: 'Images disponibles',
    quick_start: 'Demarrage rapide',
    run_script: 'Executer un script',
    dockerfile_usage: 'Utilisation dans Dockerfile',
    windows_title: 'Windows',
    windows_subtitle: 'Binaires PHP pre-compiles avec TrueAsync pour Windows x64.',
    windows_release_desc: 'Pour utilisation generale',
    windows_debug_desc: 'Symboles de debogage et assertions - pour le developpement PHP/extensions',
    windows_verify_note: 'Les hachages SHA256 sont disponibles dans <code>sha256sums.txt</code> de chaque version.',
    windows_powershell_title: 'Installation rapide (PowerShell)',
    additional_resources: 'Ressources',
    all_releases: 'Toutes les versions sur GitHub',
    source_on_github: 'Code source sur GitHub',
    docker_hub: 'Docker Hub',
    install_docs: "Documentation d'installation",
    sidebar_install: 'Installation',
    sidebar_help: 'Aide',
    resources_link: 'Ressources',
    version_col: 'Version',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: "Repertoire d'installation (par defaut <code>$HOME/.php-trueasync</code>)" },
      { opt: '<code>--set-default</code>', desc: 'Ajouter au PATH comme php par defaut' },
      { opt: '<code>--debug</code>', desc: 'Compiler avec les symboles de debogage' },
      { opt: '<code>--extensions PRESET</code>', desc: "Ensemble d'extensions : <code>standard</code>, <code>xdebug</code>, <code>all</code>" },
      { opt: '<code>--no-interactive</code>', desc: "Passer l'assistant interactif" },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: 'Recompiler depuis des sources fraiches' },
      { cmd: 'php-trueasync version', desc: 'Afficher la version installee' },
      { cmd: 'php-trueasync uninstall', desc: 'Desinstaller TrueAsync PHP et nettoyer le PATH' },
    ],
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
    title: 'Installazione',
    subtitle: 'Script di installazione per Linux/macOS, immagini Docker e binari precompilati per Windows.',
    current_release: 'Release attuale',
    previous_releases: 'Versioni precedenti',
    release_date: 'Data di rilascio',
    requires_php: 'Requisiti',
    all_builds_zts: 'Tutte le build sono Thread Safe (ZTS).',
    changelog: 'Changelog',
    build_title: 'Compilazione dal sorgente',
    build_subtitle: "Metodo di installazione consigliato per Linux e macOS. Lo script scarica il codice sorgente di PHP, l'estensione TrueAsync e compila tutto automaticamente.",
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: 'Una procedura guidata interattiva vi accompagnerà nella configurazione: scelta delle estensioni, modalità debug, percorso di installazione e configurazione del PATH.',
    build_linux_distros: 'Ubuntu, Debian e altre distribuzioni basate su apt.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) e Intel. Richiede <a href="https://brew.sh" target="_blank">Homebrew</a>.',
    build_noninteractive: 'Modalità non interattiva (CI / automazione)',
    build_options_title: 'Opzioni di compilazione',
    build_management_title: "Gestione dell'installazione",
    build_management_desc: "Dopo la compilazione, è disponibile l'utilità <code>php-trueasync</code>:",
    docker_title: 'Docker',
    docker_description: 'Immagini precompilate con PHP e TrueAsync. Ogni immagine include CLI e FPM.',
    available_images: 'Immagini disponibili',
    quick_start: 'Avvio rapido',
    run_script: 'Esegui uno script',
    dockerfile_usage: 'Utilizzo nel Dockerfile',
    windows_title: 'Windows',
    windows_subtitle: 'Binari PHP precompilati con TrueAsync per Windows x64.',
    windows_release_desc: 'Per uso generale',
    windows_debug_desc: 'Simboli di debug e asserzioni — per lo sviluppo di PHP/estensioni',
    windows_verify_note: 'Gli hash SHA256 sono disponibili in <code>sha256sums.txt</code> in ogni release.',
    windows_powershell_title: 'Installazione rapida (PowerShell)',
    additional_resources: 'Risorse',
    all_releases: 'Tutte le release su GitHub',
    source_on_github: 'Codice sorgente su GitHub',
    docker_hub: 'Docker Hub',
    install_docs: "Documentazione sull'installazione",
    sidebar_install: 'Installazione',
    sidebar_help: 'Aiuto',
    resources_link: 'Risorse',
    version_col: 'Versione',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: 'Directory di installazione (predefinita <code>$HOME/.php-trueasync</code>)' },
      { opt: '<code>--set-default</code>', desc: 'Aggiungere al PATH come php predefinito' },
      { opt: '<code>--debug</code>', desc: 'Compilare con simboli di debug' },
      { opt: '<code>--extensions PRESET</code>', desc: 'Set di estensioni: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: 'Saltare la procedura guidata interattiva' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: 'Ricompilare da sorgenti aggiornati' },
      { cmd: 'php-trueasync version', desc: 'Mostrare la versione installata' },
      { cmd: 'php-trueasync uninstall', desc: 'Disinstallare TrueAsync PHP e pulire il PATH' },
    ],
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
    title: '설치',
    subtitle: 'Linux/macOS용 설치 스크립트, Docker 이미지, 사전 빌드된 Windows 바이너리.',
    current_release: '현재 릴리스',
    previous_releases: '이전 릴리스 목록',
    release_date: '릴리스 날짜',
    requires_php: '요구 사항',
    all_builds_zts: '모든 빌드는 Thread Safe (ZTS)입니다.',
    changelog: '변경 로그',
    build_title: '소스에서 빌드',
    build_subtitle: 'Linux 및 macOS에 권장되는 설치 방법입니다. 스크립트가 PHP 소스 코드와 TrueAsync 확장을 다운로드하고 모든 것을 자동으로 빌드합니다.',
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: '대화형 마법사가 설정을 안내합니다: 확장 선택, 디버그 모드, 설치 경로 및 PATH 구성.',
    build_linux_distros: 'Ubuntu, Debian 및 기타 apt 기반 배포판.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) 및 Intel. <a href="https://brew.sh" target="_blank">Homebrew</a>가 필요합니다.',
    build_noninteractive: '비대화형 모드 (CI / 자동화)',
    build_options_title: '빌드 옵션',
    build_management_title: '설치 관리',
    build_management_desc: '빌드 후 <code>php-trueasync</code> 유틸리티를 사용할 수 있습니다:',
    docker_title: 'Docker',
    docker_description: 'PHP와 TrueAsync가 포함된 사전 빌드 이미지. 각 이미지에는 CLI와 FPM이 포함되어 있습니다.',
    available_images: '사용 가능한 이미지',
    quick_start: '빠른 시작',
    run_script: '스크립트 실행',
    dockerfile_usage: 'Dockerfile에서 사용',
    windows_title: 'Windows',
    windows_subtitle: 'Windows x64용 TrueAsync가 포함된 사전 빌드 PHP 바이너리.',
    windows_release_desc: '일반 사용용',
    windows_debug_desc: '디버그 심볼 및 어서션 — PHP/확장 개발용',
    windows_verify_note: 'SHA256 해시는 각 릴리스의 <code>sha256sums.txt</code>에서 확인할 수 있습니다.',
    windows_powershell_title: '빠른 설치 (PowerShell)',
    additional_resources: '리소스',
    all_releases: 'GitHub의 모든 릴리스',
    source_on_github: 'GitHub 소스 코드',
    docker_hub: 'Docker Hub',
    install_docs: '설치 문서',
    sidebar_install: '설치',
    sidebar_help: '도움말',
    resources_link: '리소스',
    version_col: '버전',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: '설치 디렉터리 (기본값 <code>$HOME/.php-trueasync</code>)' },
      { opt: '<code>--set-default</code>', desc: '기본 php로 PATH에 추가' },
      { opt: '<code>--debug</code>', desc: '디버그 심볼로 빌드' },
      { opt: '<code>--extensions PRESET</code>', desc: '확장 세트: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: '대화형 마법사 건너뛰기' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: '새로운 소스에서 다시 빌드' },
      { cmd: 'php-trueasync version', desc: '설치된 버전 표시' },
      { cmd: 'php-trueasync uninstall', desc: 'TrueAsync PHP 제거 및 PATH 정리' },
    ],
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
    title: 'Встановлення',
    subtitle: 'Скрипти встановлення для Linux/macOS, Docker-образи та готові збірки для Windows.',
    current_release: 'Поточний реліз',
    previous_releases: 'Попередні релізи',
    release_date: 'Дата випуску',
    requires_php: 'Вимоги',
    all_builds_zts: 'Усі збірки є Thread Safe (ZTS).',
    changelog: 'Список змін',
    build_title: 'Збірка з вихідного коду',
    build_subtitle: 'Рекомендований спосіб встановлення для Linux та macOS. Скрипт завантажує вихідний код PHP, розширення TrueAsync та збирає все автоматично.',
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: 'Інтерактивний майстер проведе вас через налаштування: вибір розширень, режим налагодження, шлях встановлення та конфігурація PATH.',
    build_linux_distros: 'Ubuntu, Debian та інші дистрибутиви на базі apt.',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) та Intel. Потрібен <a href="https://brew.sh" target="_blank">Homebrew</a>.',
    build_noninteractive: 'Неінтерактивний режим (CI / автоматизація)',
    build_options_title: 'Параметри збірки',
    build_management_title: 'Керування встановленням',
    build_management_desc: 'Після збірки доступна утиліта <code>php-trueasync</code>:',
    docker_title: 'Docker',
    docker_description: 'Готові образи з PHP та TrueAsync. Кожен образ містить CLI та FPM.',
    available_images: 'Доступні образи',
    quick_start: 'Швидкий старт',
    run_script: 'Запуск скрипта',
    dockerfile_usage: 'Використання в Dockerfile',
    windows_title: 'Windows',
    windows_subtitle: 'Готові збірки PHP з TrueAsync для Windows x64.',
    windows_release_desc: 'Для загального використання',
    windows_debug_desc: 'Символи налагодження та перевірки -- для розробки PHP/розширень',
    windows_verify_note: 'SHA256-хеші доступні у файлі <code>sha256sums.txt</code> в кожному релізі.',
    windows_powershell_title: 'Швидке встановлення (PowerShell)',
    additional_resources: 'Ресурси',
    all_releases: 'Усі релізи на GitHub',
    source_on_github: 'Вихідний код на GitHub',
    docker_hub: 'Docker Hub',
    install_docs: 'Документація зі встановлення',
    sidebar_install: 'Встановлення',
    sidebar_help: 'Довідка',
    resources_link: 'Ресурси',
    version_col: 'Версія',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: 'Каталог встановлення (за замовчуванням <code>$HOME/.php-trueasync</code>)' },
      { opt: '<code>--set-default</code>', desc: 'Додати до PATH як php за замовчуванням' },
      { opt: '<code>--debug</code>', desc: 'Збірка з символами налагодження' },
      { opt: '<code>--extensions PRESET</code>', desc: 'Набір розширень: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: 'Пропустити інтерактивний майстер' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: 'Перезібрати зі свіжих вихідних кодів' },
      { cmd: 'php-trueasync version', desc: 'Показати встановлену версію' },
      { cmd: 'php-trueasync uninstall', desc: 'Видалити TrueAsync PHP та очистити PATH' },
    ],
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
    title: '安装',
    subtitle: 'Linux/macOS 安装脚本、Docker 镜像和预编译 Windows 二进制文件。',
    current_release: '当前版本',
    previous_releases: '历史版本',
    release_date: '发布日期',
    requires_php: '系统要求',
    all_builds_zts: '所有构建均为线程安全版本 (ZTS)。',
    changelog: '更新日志',
    build_title: '从源码构建',
    build_subtitle: '推荐的 Linux 和 macOS 安装方式。脚本会自动下载 PHP 源码、TrueAsync 扩展并完成编译。',
    build_linux_title: 'Linux (Ubuntu/Debian)',
    build_linux_description: '交互式向导将引导您完成设置：选择扩展、调试模式、安装路径和 PATH 配置。',
    build_linux_distros: 'Ubuntu、Debian 及其他基于 apt 的发行版。',
    build_macos_title: 'macOS',
    build_macos_description: 'Apple Silicon (ARM) 和 Intel。需要 <a href="https://brew.sh" target="_blank">Homebrew</a>。',
    build_noninteractive: '非交互模式（CI / 自动化）',
    build_options_title: '构建选项',
    build_management_title: '安装管理',
    build_management_desc: '构建完成后，可使用 <code>php-trueasync</code> 工具：',
    docker_title: 'Docker',
    docker_description: '包含 PHP 和 TrueAsync 的预构建镜像。每个镜像均包含 CLI 和 FPM。',
    available_images: '可用镜像',
    quick_start: '快速开始',
    run_script: '运行脚本',
    dockerfile_usage: '在 Dockerfile 中使用',
    windows_title: 'Windows',
    windows_subtitle: '包含 TrueAsync 的预编译 PHP Windows x64 二进制文件。',
    windows_release_desc: '用于常规使用',
    windows_debug_desc: '调试符号和断言 - 用于 PHP/扩展开发',
    windows_verify_note: 'SHA256 哈希值可在每个发行版的 <code>sha256sums.txt</code> 中找到。',
    windows_powershell_title: '快速安装 (PowerShell)',
    additional_resources: '资源',
    all_releases: 'GitHub 上的所有版本',
    source_on_github: 'GitHub 上的源代码',
    docker_hub: 'Docker Hub',
    install_docs: '安装文档',
    sidebar_install: '安装',
    sidebar_help: '帮助',
    resources_link: '资源',
    version_col: '版本',
    build_options: [
      { opt: '<code>--prefix DIR</code>', desc: '安装目录（默认 <code>$HOME/.php-trueasync</code>）' },
      { opt: '<code>--set-default</code>', desc: '作为默认 php 添加到 PATH' },
      { opt: '<code>--debug</code>', desc: '使用调试符号构建' },
      { opt: '<code>--extensions PRESET</code>', desc: '扩展集：<code>standard</code>、<code>xdebug</code>、<code>all</code>' },
      { opt: '<code>--no-interactive</code>', desc: '跳过交互式向导' },
    ],
    build_management_commands: [
      { cmd: 'php-trueasync rebuild', desc: '从最新源码重新构建' },
      { cmd: 'php-trueasync version', desc: '显示已安装的版本' },
      { cmd: 'php-trueasync uninstall', desc: '卸载 TrueAsync PHP 并清理 PATH' },
    ],
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
const KW = new Set(['cd', 'make', 'echo', 'git', 'docker', 'php', 'sha256sum', 'gpg', 'irm', 'iex', 'grep', 'findstr', 'curl', 'pecl'])
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
        <div v-if="currentRelease" class="dl-badge">
          <span class="dl-badge-dot"></span>
          {{ t.current_release }} &middot; v{{ currentRelease.version }} &middot; {{ currentRelease.date }}
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
  background: linear-gradient(90deg, transparent 0, transparent 38%, #7a96ff 49.5%, #95a6ff 50%, #7a96ff 50.5%, transparent 62%, transparent 100%);
  background-size: 200% 100%; filter: blur(0.8px); opacity: 0.13;
  animation: dl-flow 11s linear infinite;
}
.dl-hero-lines span:nth-child(1) { top: 34%; }
.dl-hero-lines span:nth-child(2) { top: 62%; opacity: 0.1; animation-duration: 15s; animation-direction: reverse; animation-delay: -3s; }
@keyframes dl-flow { from { background-position: 130% 0; } to { background-position: -130% 0; } }
@media (prefers-reduced-motion: reduce) { .dl-hero-lines span { animation: none; } }

.dl-hero-inner {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  padding: 76px 32px 64px;
  text-align: center;
}
.dl-badge {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 6px 13px; margin-bottom: 26px;
  border: 1px solid var(--color-border);
  background: var(--nav-panel-hover);
  border-radius: 100px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--dl-accent);
}
.dl-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #5AD1B0; box-shadow: 0 0 0 3px rgba(90, 209, 176, 0.2); }
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
