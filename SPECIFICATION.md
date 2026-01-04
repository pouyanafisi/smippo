# Smippo - Modern Website Copier

> A Playwright-powered website mirroring tool for the JavaScript age

## Overview

**Smippo** is a modern alternative to [HTTrack](https://www.httrack.com/) that uses Playwright to capture websites as they appear after JavaScript execution. Unlike traditional web crawlers that fetch raw HTML, Smippo renders pages in a real Chromium browser, waits for network activity to settle, then captures the fully rendered DOM and all network artifacts.

### Philosophy: First Principles

A browser downloads a page by:

1. Fetching the initial HTML
2. Executing JavaScript
3. Making subsequent network requests (images, fonts, API calls, etc.)
4. Waiting for the network to settle

Playwright gives us exactly this capability. Smippo leverages it to create faithful offline copies of modern web applications.

---

## Feature Comparison with HTTrack

| Feature                | HTTrack    | Smippo                     |
| ---------------------- | ---------- | -------------------------- |
| JavaScript execution   | ❌ No      | ✅ Full browser rendering  |
| SPA support            | ❌ Limited | ✅ Native                  |
| CSS-in-JS capture      | ❌ No      | ✅ Yes                     |
| Dynamic content        | ❌ No      | ✅ Yes                     |
| Recursive crawling     | ✅ Yes     | ✅ Yes                     |
| Depth control          | ✅ Yes     | ✅ Yes                     |
| URL filters            | ✅ Yes     | ✅ Yes                     |
| MIME type filters      | ✅ Yes     | ✅ Yes                     |
| File size filters      | ✅ Yes     | ✅ Yes                     |
| robots.txt support     | ✅ Yes     | ✅ Yes                     |
| Cookie support         | ✅ Yes     | ✅ Yes                     |
| Custom headers         | ✅ Yes     | ✅ Yes                     |
| Proxy support          | ✅ Yes     | ✅ Yes                     |
| HAR file generation    | ❌ No      | ✅ Yes                     |
| Resume/continue        | ✅ Yes     | ✅ Yes                     |
| Cache system           | ✅ ZIP     | ✅ JSON + files            |
| Link rewriting         | ✅ Yes     | ✅ Yes                     |
| Concurrent connections | ✅ Yes     | ✅ Yes (browser tabs)      |
| Authentication         | ✅ Basic   | ✅ Full (incl. form-based) |
| Performance            | ✅ Fast    | ⚡ Moderate (real browser) |

---

## Core Features

### 1. Single Page Capture (No Crawl Mode)

```bash
smippo https://example.com
```

Captures a single page with all its rendered content and network artifacts.

**Output:**

- `index.html` - Fully rendered HTML
- `assets/` - All fetched resources (images, CSS, JS, fonts, etc.)
- `network.har` - HAR file for debugging/replay

### 2. Recursive Website Mirroring

```bash
smippo https://example.com --depth 3
```

Crawls the website following internal links up to the specified depth.

### 3. Resource Filtering

**By URL pattern:**

```bash
smippo https://example.com --include "*.jpg" --exclude "*tracking*"
```

**By MIME type:**

```bash
smippo https://example.com --mime-include "image/*" --mime-exclude "video/*"
```

**By file size:**

```bash
smippo https://example.com --max-size 5MB --min-size 1KB
```

### 4. Scope Control

```bash
# Stay on same domain (default)
smippo https://www.example.com --scope domain

# Stay on same subdomain
smippo https://www.example.com --scope subdomain

# Follow all links (dangerous!)
smippo https://www.example.com --scope all --depth 2

# Stay in same directory tree
smippo https://example.com/docs/ --scope directory
```

### 5. Authentication Support

**Basic auth:**

```bash
smippo https://user:pass@example.com
```

**Cookie-based:**

```bash
smippo https://example.com --cookies cookies.json
```

**Form-based (interactive capture):**

```bash
smippo https://example.com --capture-auth
```

Opens a browser window for manual login, then captures the session.

---

## CLI Interface

### Command Structure

```
smippo <url> [options]

Commands:
  smippo <url>              Capture/mirror a website
  smippo capture <url>      Take a screenshot of a URL
  smippo serve [dir]        Serve captured site locally
  smippo continue           Resume an interrupted capture
  smippo update             Update an existing mirror
  smippo help               Show detailed help

Options:
  Core:
    -o, --output <dir>      Output directory (default: ./site)
    -d, --depth <n>         Recursion depth (default: 0 = single page)
    --no-crawl              Disable link following (same as -d 0)
    --dry-run               Show what would be captured without downloading

  Scope:
    -s, --scope <type>      Link scope: subdomain|domain|tld|all (default: domain)
    --stay-in-dir           Only follow links in same directory or subdirs
    --external-assets       Capture assets from external domains

  Filters:
    -I, --include <glob>    Include URLs matching pattern (can repeat)
    -E, --exclude <glob>    Exclude URLs matching pattern (can repeat)
    --mime-include <type>   Include MIME types (can repeat)
    --mime-exclude <type>   Exclude MIME types (can repeat)
    --max-size <size>       Maximum file size (e.g., 10MB)
    --min-size <size>       Minimum file size (e.g., 1KB)

  Browser:
    --wait <strategy>       Wait strategy: networkidle|load|domcontentloaded (default: networkidle)
    --wait-time <ms>        Additional wait time after network idle
    --timeout <ms>          Page load timeout (default: 30000)
    --user-agent <string>   Custom user agent
    --viewport <WxH>        Viewport size (default: 1920x1080)
    --device <name>         Emulate device (e.g., "iPhone 13")

  Network:
    --proxy <url>           Proxy server URL
    --cookies <file>        Load cookies from JSON file
    --headers <json>        Custom headers as JSON
    --capture-auth          Interactive authentication capture

  Output:
    --structure <type>      Output structure: original|flat|domain (default: original)
    --har                   Generate HAR file (default: true)
    --no-har                Disable HAR file generation
    --screenshot            Take screenshot of each page
    --pdf                   Save PDF of each page

  Performance:
    -w, --workers <n>       Parallel workers (default: 8)
    --max-pages <n>         Maximum pages to capture
    --max-time <seconds>    Maximum total time
    --rate-limit <ms>       Delay between requests

  Robots:
    --ignore-robots         Ignore robots.txt
    --respect-robots        Respect robots.txt (default)

  Cache:
    --no-cache              Don't use cache
    --cache-only            Only serve from cache (update mode)

  Logging:
    -v, --verbose           Verbose output
    -q, --quiet             Minimal output
    --log-file <path>       Write logs to file
    --debug                 Debug mode with full browser

  Misc:
    --version               Show version
    --help                  Show help
```

---

## Output Structure

### Default Structure (Original)

Preserves the URL path structure:

```
site/
├── example.com/
│   ├── index.html
│   ├── about/
│   │   └── index.html
│   └── assets/
│       ├── style.css
│       └── logo.png
├── .smippo/
│   ├── cache.json          # Metadata cache
│   ├── network.har         # HAR file
│   ├── manifest.json       # Capture manifest
│   └── log.txt            # Capture log
└── index.html              # Entry point
```

### Flat Structure

All files in one directory with hashed names:

```
site/
├── index.html
├── about-index.html
├── style-abc123.css
├── logo-def456.png
└── .smippo/
    └── ...
```

### Domain Structure

Organized by domain:

```
site/
├── www.example.com/
│   └── ...
├── cdn.example.com/
│   └── ...
└── .smippo/
    └── ...
```

---

## Manifest & Cache Format

### manifest.json

```json
{
  "version": "0.0.1",
  "created": "2024-01-15T10:30:00Z",
  "updated": "2024-01-15T11:45:00Z",
  "rootUrl": "https://example.com",
  "options": {
    "depth": 3,
    "scope": "domain",
    "filters": {
      "include": ["*"],
      "exclude": ["*tracking*"]
    }
  },
  "stats": {
    "pagesCapt": 42,
    "assetsCapt": 156,
    "totalSize": 15728640,
    "duration": 180000,
    "errors": 2
  },
  "pages": [
    {
      "url": "https://example.com/",
      "localPath": "example.com/index.html",
      "status": 200,
      "captured": "2024-01-15T10:30:05Z",
      "size": 45678,
      "title": "Example Domain"
    }
  ],
  "assets": [
    {
      "url": "https://example.com/style.css",
      "localPath": "example.com/style.css",
      "mimeType": "text/css",
      "size": 12345
    }
  ]
}
```

### cache.json

```json
{
  "etags": {
    "https://example.com/": "\"abc123\"",
    "https://example.com/style.css": "\"def456\""
  },
  "lastModified": {
    "https://example.com/": "2024-01-10T00:00:00Z"
  },
  "contentTypes": {
    "https://example.com/api/data": "application/json"
  }
}
```

---

## Link Rewriting

Smippo rewrites all links in captured HTML/CSS to point to local files:

**Original:**

```html
<link href="https://example.com/style.css" rel="stylesheet" />
<img src="/images/logo.png" />
<a href="https://example.com/about">About</a>
```

**Rewritten:**

```html
<link href="./style.css" rel="stylesheet" />
<img src="./images/logo.png" />
<a href="./about/index.html">About</a>
```

### Link Types Handled

- `<a href>`
- `<link href>`
- `<script src>`
- `<img src>`, `<img srcset>`
- `<video src>`, `<audio src>`
- `<source src>`, `<source srcset>`
- `<iframe src>`
- `<object data>`
- CSS `url()` references
- CSS `@import`
- Inline styles
- JavaScript string URLs (best effort)

---

## Use Cases

### 1. Archive a Blog

```bash
smippo https://myblog.com --depth 5 --exclude "*/comments*" -o ~/archives/myblog
```

### 2. Offline Documentation

```bash
smippo https://docs.library.com --depth 10 --scope subdomain -o ./docs
```

### 3. Single Page App Snapshot

```bash
smippo https://myapp.com --wait-time 5000 --screenshot
```

### 4. Capture Behind Login

```bash
smippo https://private.site.com --capture-auth --depth 3
```

### 5. Mirror with Size Limits

```bash
smippo https://media.site.com --max-size 10MB --mime-exclude "video/*"
```

### 6. Update Existing Mirror

```bash
cd my-mirror/
smippo update
```

### 7. Take Screenshots

```bash
# Basic screenshot
smippo capture https://example.com

# Full-page screenshot
smippo capture https://example.com --full-page

# Mobile device screenshot
smippo capture https://example.com --device "iPhone 13" -O mobile.png

# Screenshot with dark mode
smippo capture https://example.com --dark-mode

# Capture specific element
smippo capture https://example.com --selector ".hero-section"
```

### 8. Serve Captured Site

```bash
# Serve with auto port detection
smippo serve ./site

# Specify port and open browser
smippo serve ./site --port 3000 --open

# Verbose logging
smippo serve ./site --verbose
```

### 9. Parallel Crawling for Large Sites

```bash
# Default: 8 parallel workers
smippo https://large-site.com --depth 5

# Limit workers for rate-limited sites
smippo https://api-heavy-site.com --workers 2 --rate-limit 1000

# Maximum speed (use with caution)
smippo https://your-server.com --workers 16
```

---

## Technical Implementation

### Dependencies

```json
{
  "dependencies": {
    "@clack/prompts": "^0.11.0",
    "chalk": "^5.3.0",
    "cheerio": "^1.0.0-rc.12",
    "cli-progress": "^3.12.0",
    "commander": "^12.0.0",
    "figlet": "^1.9.4",
    "fs-extra": "^11.2.0",
    "glob": "^10.3.10",
    "gradient-string": "^3.0.0",
    "mime-types": "^2.1.35",
    "minimatch": "^10.1.1",
    "ora": "^8.0.1",
    "p-queue": "^8.0.1",
    "playwright": "^1.41.0",
    "robots-parser": "^3.0.1"
  }
}
```

### Architecture

```
smippo/
├── bin/
│   └── smippo.js           # CLI entry point
├── src/
│   ├── index.js            # Main export
│   ├── cli.js              # CLI argument parsing
│   ├── crawler.js          # Main crawler logic
│   ├── page-capture.js     # Single page capture
│   ├── link-extractor.js   # Extract links from HTML/CSS
│   ├── link-rewriter.js    # Rewrite links for offline
│   ├── resource-saver.js   # Save resources to disk
│   ├── filter.js           # URL/MIME/size filtering
│   ├── robots.js           # robots.txt parsing
│   ├── cache.js            # Cache management
│   ├── manifest.js         # Manifest management
│   ├── har.js              # HAR file generation
│   └── utils/
│       ├── url.js          # URL utilities
│       ├── path.js         # Path utilities
│       └── logger.js       # Logging
├── package.json
└── README.md
```

### Core Flow

```javascript
// Simplified core flow
async function capture(url, options) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordHar: {path: harPath},
  });

  const page = await context.newPage();

  // Intercept and save resources
  page.on('response', async response => {
    await saveResource(response, options);
  });

  // Navigate and wait for network idle
  await page.goto(url, {waitUntil: options.wait});

  // Get rendered HTML
  const html = await page.content();

  // Extract links for crawling
  const links = await extractLinks(page, options);

  // Rewrite links for offline
  const rewrittenHtml = rewriteLinks(html, options);

  // Save HTML
  await saveHtml(rewrittenHtml, url, options);

  // Continue crawling if depth > 0
  if (options.depth > 0) {
    for (const link of links) {
      if (shouldFollow(link, options)) {
        await capture(link, {...options, depth: options.depth - 1});
      }
    }
  }

  await browser.close();
}
```

---

## Comparison with HTTrack Features

### Implemented from HTTrack

| HTTrack Option          | Smippo Equivalent                      |
| ----------------------- | -------------------------------------- |
| `-rN` (depth)           | `--depth N`                            |
| `-O` (output path)      | `-o, --output`                         |
| `-w` (mirror)           | default behavior                       |
| `-g` (get files)        | `--no-crawl`                           |
| `-i` (continue)         | `smippo continue`                      |
| `-P` (proxy)            | `--proxy`                              |
| `-F` (user-agent)       | `--user-agent`                         |
| `-c` (connections)      | `--workers`                            |
| `-T` (timeout)          | `--timeout`                            |
| `-m` (max size)         | `--max-size`                           |
| `-E` (max time)         | `--max-time`                           |
| `-b` (cookies)          | `--cookies`                            |
| `-s` (robots.txt)       | `--respect-robots` / `--ignore-robots` |
| `-a` (stay on address)  | `--scope subdomain`                    |
| `-d` (stay on domain)   | `--scope domain`                       |
| `-e` (go everywhere)    | `--scope all`                          |
| `+pattern` / `-pattern` | `--include` / `--exclude`              |
| `-mime:type`            | `--mime-include` / `--mime-exclude`    |
| `-N` (structure)        | `--structure`                          |

### Not Implemented (by design)

- **Java class parsing** - Not needed; JS executes natively
- **FTP support** - Out of scope for browser-based tool
- **HTTP/1.0 mode** - Modern browsers handle this
- **8.3 filename conversion** - Obsolete
- **proxytrack** - Different architecture

### New Features (not in HTTrack)

- Full JavaScript execution and SPA support
- Device emulation
- PDF/screenshot capture via `smippo capture` command
- Interactive auth capture
- Native HAR file generation
- JSON-based cache (more portable than ZIP)
- Modern filter syntax (glob patterns)
- Built-in server via `smippo serve` command
- Interactive guided mode with beautiful CLI
- Parallel workers (default: 8) for faster crawling
- Static mode (`--static`) for offline viewing without JS

---

## Distribution

### npm (Global)

```bash
npm install -g smippo
smippo https://example.com
```

### npx (No install)

```bash
npx smippo https://example.com
```

### Homebrew (macOS/Linux)

```bash
brew install smippo
smippo https://example.com
```

### Formula structure:

```ruby
class Smippo < Formula
  desc "Modern website copier powered by Playwright"
  homepage "https://github.com/username/smippo"
  url "https://registry.npmjs.org/smippo/-/smippo-0.0.1.tgz"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]

    # Install Playwright browsers
    system "npx", "playwright", "install", "chromium"
  end
end
```

---

## Roadmap

### v0.0.1 - Beta (Current)

- [x] Single page capture
- [x] Recursive crawling with depth control
- [x] Resource saving (images, CSS, JS, fonts)
- [x] Link rewriting for offline viewing
- [x] HAR file generation
- [x] Basic filtering (URL patterns)
- [x] CLI interface with interactive mode
- [x] npm package
- [x] MIME type filtering
- [x] File size filtering
- [x] Scope control (subdomain, domain, TLD)
- [x] External asset handling
- [x] robots.txt support
- [x] Parallel workers (default: 8)
- [x] Screenshot capture command
- [x] Built-in server command
- [x] Static mode (strip JS)
- [x] Beautiful CLI with progress indicators

### v0.1.0 - Stability

- [ ] Cache system refinement
- [ ] Continue/resume interrupted captures
- [ ] Update existing mirrors
- [ ] Error recovery improvements

### v0.2.0 - Advanced Features

- [ ] Cookie support
- [ ] Proxy support
- [ ] Custom headers
- [ ] Interactive auth capture
- [ ] Device emulation improvements

### v1.0.0 - Production Ready

- [ ] Homebrew formula
- [ ] Docker image
- [ ] GitHub Actions integration
- [ ] Full programmatic API
- [ ] Comprehensive test suite

---

## License

MIT License

---

## References

- [HTTrack Documentation](https://www.httrack.com/html/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [HAR 1.2 Specification](http://www.softwareishard.com/blog/har-12-spec/)
- [robots.txt Standard](https://www.robotstxt.org/robotstxt.html)
