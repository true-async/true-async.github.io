#!/bin/bash
# Convert Jekyll interactive pages to standalone HTML for VitePress public/

ROOT="E:/php/true-async.github.io"

CSS_VARS=':root {
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
    --font-sans: '\''Fira Sans'\'', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, '\''Segoe UI'\'', Roboto, sans-serif;
    --font-mono: '\''Fira Mono'\'', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --radius-3xl: 1.5rem;
    --radius-4xl: 2rem;
    --radius-full: 9999px;
}'

process_file() {
    local src="$1"
    local dest="$2"

    # Extract frontmatter values
    local page_title=$(sed -n 's/^page_title: *"\(.*\)"/\1/p' "$src")
    local description=$(sed -n 's/^description: *"\(.*\)"/\1/p' "$src")
    local lang=$(sed -n 's/^lang: *\(.*\)/\1/p' "$src")

    # Determine back link and labels based on language
    local back_text="Back to site"
    local site_name="TrueAsync"
    local back_url="/${lang}/"
    if [ "$lang" = "ru" ]; then
        back_text="Назад на сайт"
    fi

    # Extract content after second --- (strip frontmatter)
    local content=$(awk 'BEGIN{c=0} /^---$/{c++; next} c>=2{print}' "$src")

    # Build the HTML
    cat > "$dest" << HTMLEOF
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page_title} — TrueAsync</title>
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
        <a href="${back_url}">&larr; ${back_text}</a>
        <span class="site-name">${site_name}</span>
    </nav>

    <div class="interactive-header">
        <h1>${page_title}</h1>
        <p>${description}</p>
    </div>

    <div class="interactive-demo">
${content}
    </div>

    <div class="interactive-footer">
        <a href="${back_url}">${site_name}</a> &mdash; True Asynchronous PHP
    </div>
</body>
</html>
HTMLEOF

    echo "Created: $dest"
}

# Process all 6 files
process_file "$ROOT/en/interactive/coroutine-demo.html" "$ROOT/public/en/interactive/coroutine-demo.html"
process_file "$ROOT/en/interactive/learning-map.html" "$ROOT/public/en/interactive/learning-map.html"
process_file "$ROOT/en/interactive/pdo-pool-demo.html" "$ROOT/public/en/interactive/pdo-pool-demo.html"
process_file "$ROOT/ru/interactive/coroutine-demo.html" "$ROOT/public/ru/interactive/coroutine-demo.html"
process_file "$ROOT/ru/interactive/learning-map.html" "$ROOT/public/ru/interactive/learning-map.html"
process_file "$ROOT/ru/interactive/pdo-pool-demo.html" "$ROOT/public/ru/interactive/pdo-pool-demo.html"

echo "Done!"
