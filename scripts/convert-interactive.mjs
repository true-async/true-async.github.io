import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const ROOT = 'E:/php/true-async.github.io';

const CSS_VARS = `
:root {
    --color-primary: #6B58FF;
    --color-primary-dark: #5A47E6;
    --color-navbar: #EEEAFF;
    --color-navbar-link-hover: #6B58FF;
    --color-text: #1F2937;
    --color-text-secondary: #4B5563;
    --color-text-muted: #6B7280;
    --color-bg: #ffffff;
    --color-bg-subtle: #F9FAFB;
    --color-border: #E5E7EB;
    --color-card-border: rgba(0, 0, 0, 0.05);
    --color-code-bg: #F3F4F6;
    --font-sans: 'Fira Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'Fira Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --radius-3xl: 1.5rem;
    --radius-4xl: 2rem;
    --radius-full: 9999px;
}`;

const langs = ['en', 'ru', 'de', 'es', 'fr', 'it', 'ko', 'uk', 'zh'];
const demos = ['coroutine-demo.html', 'learning-map.html', 'pdo-pool-demo.html'];
const files = [];
for (const lang of langs) {
    for (const demo of demos) {
        const src = `${lang}/interactive/${demo}`;
        // Only add if source file exists
        try {
            readFileSync(`${ROOT}/${src}`);
            files.push({ src, dest: `public/${lang}/interactive/${demo}` });
        } catch(e) { /* skip if not exists */ }
    }
}

function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) throw new Error('No frontmatter found');
    const fm = {};
    for (const line of match[1].split('\n')) {
        const m = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
        if (m) fm[m[1]] = m[2];
    }
    return { frontmatter: fm, body: match[2] };
}

for (const file of files) {
    const srcPath = `${ROOT}/${file.src}`;
    const destPath = `${ROOT}/${file.dest}`;

    const raw = readFileSync(srcPath, 'utf-8');
    const { frontmatter: fm, body } = parseFrontmatter(raw);

    const lang = fm.lang || 'en';
    const pageTitle = fm.page_title || 'Interactive Demo';
    const description = fm.description || '';
    const backText = lang === 'ru' ? 'Назад на сайт' : 'Back to site';
    const backUrl = `/${lang}/`;

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle} — TrueAsync</title>
    <meta name="description" content="${description}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Mono:wght@400;500;700&family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        ${CSS_VARS}

        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-sans);
            font-size: 1rem;
            line-height: 1.5;
            color: var(--color-text);
            background: var(--color-bg);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        a { color: inherit; text-decoration: none; }

        .interactive-nav {
            background: var(--color-navbar);
            padding: 0.75rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--color-border);
        }

        .interactive-nav a {
            color: var(--color-primary);
            font-weight: 500;
            font-size: 0.9rem;
            transition: opacity 0.2s;
        }

        .interactive-nav a:hover {
            opacity: 0.8;
        }

        .interactive-nav .site-name {
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--color-text);
        }

        .interactive-header {
            text-align: center;
            padding: 2rem 1.5rem 1rem;
        }

        .interactive-header h1 {
            font-size: 2rem;
            font-weight: 700;
            color: var(--color-text);
            margin-bottom: 0.5rem;
            line-height: 1.2;
        }

        .interactive-header p {
            color: var(--color-text-muted);
            font-size: 1.05rem;
            max-width: 600px;
            margin: 0 auto;
        }

        .interactive-demo {
            padding: 1rem 1.5rem 3rem;
        }

        .interactive-footer {
            text-align: center;
            padding: 1.5rem;
            color: var(--color-text-muted);
            font-size: 0.85rem;
            border-top: 1px solid var(--color-border);
            margin-top: 2rem;
        }

        .interactive-footer a {
            color: var(--color-primary);
        }
    </style>
</head>
<body>
    <nav class="interactive-nav">
        <a href="${backUrl}">&larr; ${backText}</a>
        <span class="site-name">TrueAsync</span>
    </nav>

    <div class="interactive-header">
        <h1>${pageTitle}</h1>
        <p>${description}</p>
    </div>

    <div class="interactive-demo">
${body}
    </div>

    <div class="interactive-footer">
        <a href="${backUrl}">TrueAsync</a> &mdash; True Asynchronous PHP
    </div>
</body>
</html>
`;

    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, html, 'utf-8');
    console.log(`Created: ${file.dest}`);
}

console.log('Done!');
