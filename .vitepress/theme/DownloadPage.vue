<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vitepress'

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
  build_options: { opt: string; desc: string }[]
  build_management_commands: { cmd: string; desc: string }[]
}> = {
  en: {
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

const dockerImages = [
  { tag: 'trueasync/php-true-async:0.6.6-php8.6', description: 'Ubuntu 24.04 — CLI + FPM' },
  { tag: 'trueasync/php-true-async:0.6.6-php8.6-alpine', description: 'Alpine 3.20 — CLI + FPM (lightweight)' },
  { tag: 'trueasync/php-true-async:0.6.6-php8.6-debug', description: 'Ubuntu 24.04 — CLI + FPM (debug symbols)' },
  { tag: 'trueasync/php-true-async:0.6.6-php8.6-frankenphp', description: 'Ubuntu 24.04 — FrankenPHP (Caddy + async worker)' },
  { tag: 'trueasync/php-true-async:latest', description: 'Ubuntu 24.04 — alias for latest stable' },
  { tag: 'trueasync/php-true-async:latest-alpine', description: 'Alpine 3.20 — alias for latest stable' },
  { tag: 'trueasync/php-true-async:latest-frankenphp', description: 'FrankenPHP — alias for latest stable' },
]

const versions = [
  {
    version: '0.6.6',
    date: '2026-04-03',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/releases/releases/tag/v0.6.6',
    old: false,
    platforms: [
      {
        name: 'Windows',
        files: [
          {
            name: 'php-trueasync-0.6.6-php8.6-windows-x64.zip',
            label: 'Release',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.6/php-trueasync-0.6.6-php8.6-windows-x64.zip',
            size: '~38 MB',
            sha256: 'see sha256sums.txt in release',
          },
          {
            name: 'php-trueasync-0.6.6-php8.6-windows-x64-debug.zip',
            label: 'Debug',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.6/php-trueasync-0.6.6-php8.6-windows-x64-debug.zip',
            size: '~35 MB',
            sha256: 'see sha256sums.txt in release',
          },
        ],
      },
    ],
  },
  {
    version: '0.6.5',
    date: '2026-03-29',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/releases/releases/tag/v0.6.5',
    old: true,
    platforms: [
      {
        name: 'Windows',
        files: [
          {
            name: 'php-trueasync-0.6.5-php8.6-windows-x64.zip',
            label: 'Release',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.5/php-trueasync-0.6.5-php8.6-windows-x64.zip',
            size: '~38 MB',
            sha256: 'see sha256sums.txt in release',
          },
          {
            name: 'php-trueasync-0.6.5-php8.6-windows-x64-debug.zip',
            label: 'Debug',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.5/php-trueasync-0.6.5-php8.6-windows-x64-debug.zip',
            size: '~35 MB',
            sha256: 'see sha256sums.txt in release',
          },
        ],
      },
    ],
  },
  {
    version: '0.6.4',
    date: '2026-03-25',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/releases/releases/tag/v0.6.4',
    old: true,
    platforms: [
      {
        name: 'Windows',
        files: [
          {
            name: 'php-trueasync-0.6.4-php8.6-windows-x64.zip',
            label: 'Release',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.4/php-trueasync-0.6.4-php8.6-windows-x64.zip',
            size: '~25 MB',
            sha256: 'see sha256sums.txt in release',
          },
          {
            name: 'php-trueasync-0.6.4-php8.6-windows-x64-debug.zip',
            label: 'Debug',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.4/php-trueasync-0.6.4-php8.6-windows-x64-debug.zip',
            size: '~30 MB',
            sha256: 'see sha256sums.txt in release',
          },
        ],
      },
    ],
  },
  {
    version: '0.6.3',
    date: '2026-03-25',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/php-async/releases/tag/v0.6.3',
    old: true,
    platforms: [
      {
        name: 'Windows',
        files: [
          {
            name: 'php-trueasync-0.6.3-php8.6-windows-x64.zip',
            label: 'Release',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.3/php-trueasync-0.6.3-php8.6-windows-x64.zip',
            size: '~37.6 MB',
            sha256: 'see sha256sums.txt in release',
          },
          {
            name: 'php-trueasync-0.6.3-php8.6-windows-x64-debug.zip',
            label: 'Debug',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.3/php-trueasync-0.6.3-php8.6-windows-x64-debug.zip',
            size: '~35.1 MB',
            sha256: 'see sha256sums.txt in release',
          },
        ],
      },
    ],
  },
  {
    version: '0.6.2',
    date: '2026-03-24',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/php-async/releases/tag/v0.6.2',
    old: true,
    platforms: [
      {
        name: 'Windows',
        files: [
          {
            name: 'php-trueasync-0.6.2-php8.6-windows-x64.zip',
            label: 'Release',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.2/php-trueasync-0.6.2-php8.6-windows-x64.zip',
            size: '~37.6 MB',
            sha256: 'see sha256sums.txt in release',
          },
          {
            name: 'php-trueasync-0.6.2-php8.6-windows-x64-debug.zip',
            label: 'Debug',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.2/php-trueasync-0.6.2-php8.6-windows-x64-debug.zip',
            size: '~35.1 MB',
            sha256: 'see sha256sums.txt in release',
          },
        ],
      },
    ],
  },
  {
    version: '0.6.1',
    date: '2026-03-15',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/php-async/releases/tag/v0.6.1',
    old: true,
    platforms: [
      {
        name: 'Windows',
        files: [
          {
            name: 'php-trueasync-0.6.1-php8.6-windows-x64.zip',
            label: 'Release',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.1/php-trueasync-0.6.1-php8.6-windows-x64.zip',
            size: '~37.6 MB',
            sha256: 'see sha256sums.txt in release',
          },
          {
            name: 'php-trueasync-0.6.1-php8.6-windows-x64-debug.zip',
            label: 'Debug',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.1/php-trueasync-0.6.1-php8.6-windows-x64-debug.zip',
            size: '~35.1 MB',
            sha256: 'see sha256sums.txt in release',
          },
        ],
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-03-14',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/php-async/releases/tag/v0.6.0',
    old: true,
    platforms: [
      {
        name: 'Windows',
        files: [
          {
            name: 'php-trueasync-0.6.0-php8.6-windows-x64.zip',
            label: 'Release',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.0/php-trueasync-0.6.0-php8.6-windows-x64.zip',
            size: '~37.6 MB',
            sha256: 'see sha256sums.txt in release',
          },
          {
            name: 'php-trueasync-0.6.0-php8.6-windows-x64-debug.zip',
            label: 'Debug',
            url: 'https://github.com/true-async/releases/releases/download/v0.6.0/php-trueasync-0.6.0-php8.6-windows-x64-debug.zip',
            size: '~35.1 MB',
            sha256: 'see sha256sums.txt in release',
          },
        ],
      },
    ],
  },
]

const currentRelease = versions.find(v => !v.old)
const oldReleases = versions.filter(v => v.old)

const copySvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const checkSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'

function copyCode(event) {
  const btn = event.currentTarget
  const wrapper = btn.closest('.code-copy-wrapper')
  const code = wrapper.querySelector('code')
  const text = code.innerText

  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied')
    btn.innerHTML = checkSvg
    setTimeout(() => {
      btn.classList.remove('copied')
      btn.innerHTML = copySvg
    }, 2000)
  })
}
</script>

<template>
  <!-- Page Header -->
  <div class="page-header">
    <div class="page-header-inner">
      <h1>{{ t.title }}</h1>
      <p>{{ t.subtitle }}</p>
    </div>
  </div>

  <!-- Download Content -->
  <div class="download-page">
  <div class="download-main">
  <div class="download-layout">

    <!-- Current Release Info -->
    <div v-if="currentRelease" class="download-card" :id="'release-' + currentRelease.version">
      <span class="version-badge">{{ t.current_release }}</span>
      <div class="release-header">
        <h2>TrueAsync {{ currentRelease.version }}</h2>
        <span class="release-meta">{{ t.release_date }}: {{ currentRelease.date }} &middot; {{ t.requires_php }} {{ currentRelease.php_requires }}</span>
      </div>
      <p class="release-note">{{ t.all_builds_zts }}
        <a :href="currentRelease.changelog_url" target="_blank" rel="noopener">{{ t.changelog }} &rarr;</a>
      </p>
    </div>

    <!-- Previous releases (collapsed) -->
    <details v-if="oldReleases.length > 0" class="download-card download-card--previous">
      <summary>{{ t.previous_releases }} ({{ oldReleases.length }})</summary>
      <table class="previous-releases-table">
        <thead>
          <tr>
            <th>{{ t.version_col }}</th>
            <th>{{ t.release_date }}</th>
            <th>{{ t.requires_php }}</th>
            <th>{{ t.changelog }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="release in oldReleases" :key="release.version">
            <td>TrueAsync {{ release.version }}</td>
            <td>{{ release.date }}</td>
            <td>{{ release.php_requires }}</td>
            <td><a :href="release.changelog_url" target="_blank" rel="noopener">{{ t.changelog }} &rarr;</a></td>
          </tr>
        </tbody>
      </table>
    </details>

    <!-- Build from Source -->
    <div class="download-card" id="build-source">
      <h2>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem;height:1.25rem;vertical-align:middle;margin-right:0.375rem;"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        {{ t.build_title }}
      </h2>
      <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">{{ t.build_subtitle }}</p>

      <!-- Linux -->
      <div class="release-platform">
        <h3>
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:1.125rem;height:1.125rem;vertical-align:middle;margin-right:0.25rem;"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z"/></svg>
          {{ t.build_linux_title }}
        </h3>
        <p>{{ t.build_linux_description }}</p>
        <div class="code-copy-wrapper">
          <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
          <pre><code>curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash</code></pre>
        </div>
        <p style="font-size: 0.8125rem; color: var(--color-text-muted);">{{ t.build_linux_distros }}</p>

        <h4 style="font-size: 0.8125rem; margin-top: 1.25rem; margin-bottom: 0.5rem;">{{ t.build_noninteractive }}</h4>
        <div class="code-copy-wrapper">
          <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
          <pre><code>curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh \
  | NO_INTERACTIVE=true EXTENSIONS=all SET_DEFAULT=true bash</code></pre>
        </div>
      </div>

      <!-- macOS -->
      <div class="release-platform" style="margin-top: 2rem;">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>
          {{ t.build_macos_title }}
        </h3>
        <p v-html="t.build_macos_description"></p>
        <div class="code-copy-wrapper">
          <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
          <pre><code>curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash</code></pre>
        </div>

        <h4 style="font-size: 0.8125rem; margin-top: 1.25rem; margin-bottom: 0.5rem;">{{ t.build_noninteractive }}</h4>
        <div class="code-copy-wrapper">
          <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
          <pre><code>curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh \
  | NO_INTERACTIVE=true EXTENSIONS=all SET_DEFAULT=true bash</code></pre>
        </div>
      </div>

      <!-- Build Options -->
      <div style="margin-top: 2rem;">
        <h3 style="font-size: 0.9375rem; margin-bottom: 0.75rem;">{{ t.build_options_title }}</h3>
        <table style="width: 100%; font-size: 0.8125rem; border-collapse: collapse;">
          <tr v-for="(opt, i) in t.build_options" :key="i" style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 0.5rem 1rem 0.5rem 0; white-space: nowrap;" v-html="opt.opt"></td>
            <td style="padding: 0.5rem 0; color: var(--color-text-muted);" v-html="opt.desc"></td>
          </tr>
        </table>
      </div>

      <!-- Management -->
      <div style="margin-top: 2rem;">
        <h3 style="font-size: 0.9375rem; margin-bottom: 0.5rem;">{{ t.build_management_title }}</h3>
        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;" v-html="t.build_management_desc"></p>
        <table style="width: 100%; font-size: 0.8125rem; border-collapse: collapse;">
          <tr v-for="(item, i) in t.build_management_commands" :key="i" style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 0.5rem 1rem 0.5rem 0; white-space: nowrap;"><code>{{ item.cmd }}</code></td>
            <td style="padding: 0.5rem 0; color: var(--color-text-muted);">{{ item.desc }}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Docker -->
    <div class="download-card" id="docker">
      <h2>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem;height:1.25rem;vertical-align:middle;margin-right:0.375rem;"><path d="M22 12H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
        {{ t.docker_title }}
      </h2>
      <p>{{ t.docker_description }}</p>

      <div class="release-platform">
        <h3>{{ t.available_images }}</h3>
        <div v-for="image in dockerImages" :key="image.tag" class="release-file">
          <div class="release-file-row">
            <code style="background: var(--color-code-bg); padding: 0.125rem 0.5rem; border-radius: var(--radius-md); font-size: 0.8125rem;">{{ image.tag }}</code>
            <span class="release-file-size">{{ image.description }}</span>
          </div>
        </div>
      </div>

      <h3 style="font-size: 0.9375rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">{{ t.quick_start }}</h3>
      <div class="code-copy-wrapper">
        <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
        <pre><code>docker pull trueasync/php-true-async:latest
docker run --rm trueasync/php-true-async:latest php -v</code></pre>
      </div>

      <p>{{ t.run_script }}:</p>
      <div class="code-copy-wrapper">
        <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
        <pre><code>docker run --rm -v $(pwd):/app -w /app trueasync/php-true-async:latest php script.php</code></pre>
      </div>

      <h3 style="font-size: 0.9375rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">{{ t.dockerfile_usage }}</h3>
      <div class="code-copy-wrapper">
        <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
        <pre><code>FROM trueasync/php-true-async:latest

COPY . /app
WORKDIR /app

CMD ["php", "server.php"]</code></pre>
      </div>
    </div>

    <!-- Windows: current release only -->
    <div v-if="currentRelease" class="download-card" id="windows">
      <h2>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem;height:1.25rem;vertical-align:middle;margin-right:0.375rem;"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        {{ t.windows_title }}
      </h2>
      <p style="color: var(--color-text-secondary);">{{ t.windows_subtitle }}</p>

      <template v-for="platform in currentRelease.platforms" :key="platform.name">
        <div v-if="platform.name === 'Windows'" class="release-platform">
          <div v-for="file in platform.files" :key="file.name" class="release-file">
            <div class="release-file-row">
              <a :href="file.url" class="release-file-name">{{ file.name }}</a>
              <span class="release-file-size">{{ file.size }}</span>
            </div>
            <span v-if="file.label === 'Release'" class="release-file-hash" style="color: var(--color-text-muted);">{{ t.windows_release_desc }}</span>
            <span v-else-if="file.label === 'Debug'" class="release-file-hash" style="color: var(--color-text-muted);">{{ t.windows_debug_desc }}</span>
          </div>
        </div>
      </template>

      <p style="margin-top: 1rem; font-size: 0.8125rem; color: var(--color-text-muted);" v-html="t.windows_verify_note"></p>

      <h3 style="font-size: 0.9375rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">{{ t.windows_powershell_title }}</h3>
      <div class="code-copy-wrapper">
        <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
        <pre><code>irm https://raw.githubusercontent.com/true-async/releases/master/installer/install.ps1 | iex</code></pre>
      </div>

      <!-- Previous Windows releases (collapsed) -->
      <details v-if="oldReleases.length > 0" class="download-previous-inline" style="margin-top: 1.5rem;">
        <summary>{{ t.previous_releases }} ({{ oldReleases.length }})</summary>
        <table class="previous-releases-table" style="margin-top: 0.75rem;">
          <thead>
            <tr>
              <th>{{ t.version_col }}</th>
              <th>{{ t.release_date }}</th>
              <th>Release</th>
              <th>Debug</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="old in oldReleases" :key="old.version">
              <template v-for="platform in old.platforms" :key="platform.name">
                <tr v-if="platform.name === 'Windows'">
                  <td>{{ old.version }}</td>
                  <td>{{ old.date }}</td>
                  <td v-for="file in platform.files" :key="file.name"><a :href="file.url">{{ file.size }}</a></td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </details>
    </div>

    <!-- Additional Resources -->
    <div class="download-card" id="resources">
      <h2>{{ t.additional_resources }}</h2>
      <ul class="release-resources">
        <li><a href="https://github.com/true-async/releases/releases" target="_blank" rel="noopener">{{ t.all_releases }}</a></li>
        <li><a href="https://github.com/true-async/releases" target="_blank" rel="noopener">{{ t.source_on_github }}</a></li>
        <li><a href="https://hub.docker.com/r/trueasync/php-true-async" target="_blank" rel="noopener">{{ t.docker_hub }}</a></li>
        <li><a href="https://github.com/true-async/releases" target="_blank" rel="noopener">{{ t.install_docs }}</a></li>
      </ul>
    </div>

  </div>
  </div>

  <!-- Right Sidebar -->
  <aside class="download-sidebar">
    <div class="docs-nav-title">{{ t.sidebar_install }}</div>
    <nav class="docs-nav">
      <a href="#build-source">Linux / macOS</a>
      <a href="#docker">Docker</a>
      <a href="#windows">Windows</a>
    </nav>
    <div class="docs-nav-title" style="margin-top: 1.5rem;">{{ t.sidebar_help }}</div>
    <nav class="docs-nav">
      <a href="#resources">{{ t.resources_link }}</a>
    </nav>
  </aside>

  </div>
</template>
