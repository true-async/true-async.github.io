<script setup>
import { ref } from 'vue'

const dockerImages = [
  { tag: 'trueasync/php-true-async:0.6.5-php8.6', description: 'Ubuntu 24.04 — CLI + FPM' },
  { tag: 'trueasync/php-true-async:0.6.5-php8.6-alpine', description: 'Alpine 3.20 — CLI + FPM (lightweight)' },
  { tag: 'trueasync/php-true-async:0.6.5-php8.6-debug', description: 'Ubuntu 24.04 — CLI + FPM (debug symbols)' },
  { tag: 'trueasync/php-true-async:0.6.5-php8.6-frankenphp', description: 'Ubuntu 24.04 — FrankenPHP (Caddy + async worker)' },
  { tag: 'trueasync/php-true-async:latest', description: 'Ubuntu 24.04 — alias for latest stable' },
  { tag: 'trueasync/php-true-async:latest-alpine', description: 'Alpine 3.20 — alias for latest stable' },
  { tag: 'trueasync/php-true-async:latest-frankenphp', description: 'FrankenPHP — alias for latest stable' },
]

const versions = [
  {
    version: '0.6.5',
    date: '2026-03-29',
    php_requires: 'PHP 8.6-dev (ZTS)',
    changelog_url: 'https://github.com/true-async/releases/releases/tag/v0.6.5',
    old: false,
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

const buildOptions = [
  { opt: '<code>--prefix DIR</code>', desc: 'Installation directory (default <code>$HOME/.php-trueasync</code>)' },
  { opt: '<code>--set-default</code>', desc: 'Add to PATH as default php' },
  { opt: '<code>--debug</code>', desc: 'Build with debug symbols' },
  { opt: '<code>--extensions PRESET</code>', desc: 'Extension set: <code>standard</code>, <code>xdebug</code>, <code>all</code>' },
  { opt: '<code>--no-interactive</code>', desc: 'Skip the interactive wizard' },
]

const managementCommands = [
  { cmd: 'php-trueasync rebuild', desc: 'Rebuild from fresh sources' },
  { cmd: 'php-trueasync version', desc: 'Show installed version' },
  { cmd: 'php-trueasync uninstall', desc: 'Uninstall TrueAsync PHP and clean up PATH' },
]
</script>

<template>
  <!-- Page Header -->
  <div class="page-header">
    <div class="page-header-inner">
      <h1>Installation</h1>
      <p>Installation scripts for Linux/macOS, Docker images, and pre-built Windows binaries.</p>
    </div>
  </div>

  <!-- Download Content -->
  <div class="download-page">
  <div class="download-main">
  <div class="download-layout">

    <!-- Current Release Info -->
    <div v-if="currentRelease" class="download-card" :id="'release-' + currentRelease.version">
      <span class="version-badge">Current Release</span>
      <div class="release-header">
        <h2>TrueAsync {{ currentRelease.version }}</h2>
        <span class="release-meta">Release date: {{ currentRelease.date }} &middot; Requires {{ currentRelease.php_requires }}</span>
      </div>
      <p class="release-note">All builds are Thread Safe (ZTS).
        <a :href="currentRelease.changelog_url" target="_blank" rel="noopener">Changelog &rarr;</a>
      </p>
    </div>

    <!-- Previous releases (collapsed) -->
    <details v-if="oldReleases.length > 0" class="download-card download-card--previous">
      <summary>Previous releases ({{ oldReleases.length }})</summary>
      <table class="previous-releases-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Release date</th>
            <th>Requires</th>
            <th>Changelog</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="release in oldReleases" :key="release.version">
            <td>TrueAsync {{ release.version }}</td>
            <td>{{ release.date }}</td>
            <td>{{ release.php_requires }}</td>
            <td><a :href="release.changelog_url" target="_blank" rel="noopener">Changelog &rarr;</a></td>
          </tr>
        </tbody>
      </table>
    </details>

    <!-- Build from Source -->
    <div class="download-card" id="build-source">
      <h2>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem;height:1.25rem;vertical-align:middle;margin-right:0.375rem;"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Build from Source
      </h2>
      <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">Recommended installation method for Linux and macOS. The script downloads PHP source code, the TrueAsync extension, and builds everything automatically.</p>

      <!-- Linux -->
      <div class="release-platform">
        <h3>
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:1.125rem;height:1.125rem;vertical-align:middle;margin-right:0.25rem;"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139z"/></svg>
          Linux (Ubuntu/Debian)
        </h3>
        <p>An interactive wizard will guide you through setup: choosing extensions, debug mode, installation path, and PATH configuration.</p>
        <div class="code-copy-wrapper">
          <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
          <pre><code>curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash</code></pre>
        </div>
        <p style="font-size: 0.8125rem; color: var(--color-text-muted);">Ubuntu, Debian, and other apt-based distributions.</p>

        <h4 style="font-size: 0.8125rem; margin-top: 1.25rem; margin-bottom: 0.5rem;">Non-interactive mode (CI / automation)</h4>
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
          macOS
        </h3>
        <p>Apple Silicon (ARM) and Intel. Requires <a href="https://brew.sh" target="_blank">Homebrew</a>.</p>
        <div class="code-copy-wrapper">
          <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
          <pre><code>curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash</code></pre>
        </div>

        <h4 style="font-size: 0.8125rem; margin-top: 1.25rem; margin-bottom: 0.5rem;">Non-interactive mode (CI / automation)</h4>
        <div class="code-copy-wrapper">
          <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
          <pre><code>curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh \
  | NO_INTERACTIVE=true EXTENSIONS=all SET_DEFAULT=true bash</code></pre>
        </div>
      </div>

      <!-- Build Options -->
      <div style="margin-top: 2rem;">
        <h3 style="font-size: 0.9375rem; margin-bottom: 0.75rem;">Build Options</h3>
        <table style="width: 100%; font-size: 0.8125rem; border-collapse: collapse;">
          <tr v-for="(opt, i) in buildOptions" :key="i" style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 0.5rem 1rem 0.5rem 0; white-space: nowrap;" v-html="opt.opt"></td>
            <td style="padding: 0.5rem 0; color: var(--color-text-muted);" v-html="opt.desc"></td>
          </tr>
        </table>
      </div>

      <!-- Management -->
      <div style="margin-top: 2rem;">
        <h3 style="font-size: 0.9375rem; margin-bottom: 0.5rem;">Installation Management</h3>
        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">After building, the <code>php-trueasync</code> utility is available:</p>
        <table style="width: 100%; font-size: 0.8125rem; border-collapse: collapse;">
          <tr v-for="(item, i) in managementCommands" :key="i" style="border-bottom: 1px solid var(--color-border);">
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
        Docker
      </h2>
      <p>Pre-built images with PHP and TrueAsync. Each image includes CLI and FPM.</p>

      <div class="release-platform">
        <h3>Available Images</h3>
        <div v-for="image in dockerImages" :key="image.tag" class="release-file">
          <div class="release-file-row">
            <code style="background: var(--color-code-bg); padding: 0.125rem 0.5rem; border-radius: var(--radius-md); font-size: 0.8125rem;">{{ image.tag }}</code>
            <span class="release-file-size">{{ image.description }}</span>
          </div>
        </div>
      </div>

      <h3 style="font-size: 0.9375rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">Quick Start</h3>
      <div class="code-copy-wrapper">
        <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
        <pre><code>docker pull trueasync/php-true-async:latest
docker run --rm trueasync/php-true-async:latest php -v</code></pre>
      </div>

      <p>Run a script:</p>
      <div class="code-copy-wrapper">
        <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
        <pre><code>docker run --rm -v $(pwd):/app -w /app trueasync/php-true-async:latest php script.php</code></pre>
      </div>

      <h3 style="font-size: 0.9375rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">Usage in Dockerfile</h3>
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
        Windows
      </h2>
      <p style="color: var(--color-text-secondary);">Pre-built PHP binaries with TrueAsync for Windows x64.</p>

      <template v-for="platform in currentRelease.platforms" :key="platform.name">
        <div v-if="platform.name === 'Windows'" class="release-platform">
          <div v-for="file in platform.files" :key="file.name" class="release-file">
            <div class="release-file-row">
              <a :href="file.url" class="release-file-name">{{ file.name }}</a>
              <span class="release-file-size">{{ file.size }}</span>
            </div>
            <span v-if="file.label === 'Release'" class="release-file-hash" style="color: var(--color-text-muted);">For general use</span>
            <span v-else-if="file.label === 'Debug'" class="release-file-hash" style="color: var(--color-text-muted);">Debug symbols and assertions — for PHP/extension development</span>
          </div>
        </div>
      </template>

      <p style="margin-top: 1rem; font-size: 0.8125rem; color: var(--color-text-muted);">SHA256 hashes are available in <code>sha256sums.txt</code> in each release.</p>

      <h3 style="font-size: 0.9375rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">Quick Install (PowerShell)</h3>
      <div class="code-copy-wrapper">
        <button class="code-copy-btn" @click="copyCode" title="Copy" v-html="copySvg"></button>
        <pre><code>irm https://raw.githubusercontent.com/true-async/releases/master/installer/install.ps1 | iex</code></pre>
      </div>

      <!-- Previous Windows releases (collapsed) -->
      <details v-if="oldReleases.length > 0" class="download-previous-inline" style="margin-top: 1.5rem;">
        <summary>Previous releases ({{ oldReleases.length }})</summary>
        <table class="previous-releases-table" style="margin-top: 0.75rem;">
          <thead>
            <tr>
              <th>Version</th>
              <th>Release date</th>
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
      <h2>Resources</h2>
      <ul class="release-resources">
        <li><a href="https://github.com/true-async/releases/releases" target="_blank" rel="noopener">All releases on GitHub</a></li>
        <li><a href="https://github.com/true-async/releases" target="_blank" rel="noopener">Source code on GitHub</a></li>
        <li><a href="https://hub.docker.com/r/trueasync/php-true-async" target="_blank" rel="noopener">Docker Hub</a></li>
        <li><a href="https://github.com/true-async/releases" target="_blank" rel="noopener">Installation documentation</a></li>
      </ul>
    </div>

  </div>
  </div>

  <!-- Right Sidebar -->
  <aside class="download-sidebar">
    <div class="docs-nav-title">Installation</div>
    <nav class="docs-nav">
      <a href="#build-source">Linux / macOS</a>
      <a href="#docker">Docker</a>
      <a href="#windows">Windows</a>
    </nav>
    <div class="docs-nav-title" style="margin-top: 1.5rem;">Help</div>
    <nav class="docs-nav">
      <a href="#resources">Resources</a>
    </nav>
  </aside>

  </div>
</template>
