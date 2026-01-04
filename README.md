<p align="center">
  <img src="assets/logo.svg" alt="Smippo Logo" width="120" height="100">
</p>

<h1 align="center">SMIPPO</h1>

<p align="center">
  <strong>S.M.I.P.P.O.</strong> = Structured Mirroring of Internet Pages and Public Objects
</p>

<p align="center">
  Modern website copier — consumes everything fast. Hippos don't nibble. They vacuum.
</p>

<p align="center">
  <a href="https://smippo.com"><img src="https://img.shields.io/badge/docs-smippo.com-blue" alt="Documentation"></a>
  <a href="https://www.npmjs.com/package/smippo"><img src="https://img.shields.io/npm/v/smippo?color=cb0000&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/smippo"><img src="https://img.shields.io/npm/dm/smippo?color=cb0000" alt="npm downloads"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/smippo?color=blue" alt="license"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/smippo?color=339933" alt="node"></a>
  <a href="https://github.com/pouyanafisi/smippo/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

---

**S.M.I.P.P.O.** (Structured Mirroring of Internet Pages and Public Objects) is a command-line website copier and scraper that captures websites exactly as they appear in your browser. Create complete offline mirrors with all assets, styles, and dynamic content preserved. Perfect for website duplication, archiving, and offline browsing.

📚 **[View complete documentation →](https://smippo.com)**

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [Requirements](#requirements)
  - [npm (Global)](#npm-global)
  - [Homebrew (Coming soon)](#homebrew-coming-soon)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Interactive Mode](#interactive-mode)
  - [Filtering](#filtering)
  - [Scope Control](#scope-control)
  - [Browser Options](#browser-options)
  - [Screenshots](#screenshots)
  - [Authentication](#authentication)
  - [Output Options](#output-options)
  - [Performance \& Parallelism: The Vacuum Architecture](#performance--parallelism-the-vacuum-architecture)
  - [Continue/Update](#continueupdate)
  - [Serve](#serve)
  - [Static Mode](#static-mode)
- [Structured Output](#structured-output)
- [Programmatic API](#programmatic-api)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- **🚀 Vacuum Architecture** — Parallel workers consume sites rapidly, just like hippos vacuum up everything in their path
- **📸 Structured Mirroring** — Every page, every resource, every network request captured in organized, structured output
- **🔍 Complete Fidelity** — Gets the page exactly as you see it, including CSS-in-JS, dynamic content, and lazy-loaded images
- **🎯 Smart Consumption** — Respects robots.txt, filters by URL patterns, MIME types, and file sizes
- **📦 Structured Output** — Organized mirror structure preserves original paths for seamless offline browsing
- **🎨 Beautiful CLI** — Interactive guided mode, progress bars, and elegant terminal output
- **🌐 Built-in Server** — Serve captured sites locally with directory browsing
- **📊 HAR Files** — Generates HTTP Archive files for debugging and replay

## Quick Start

Install globally:

```bash
npm install -g smippo
```

Capture a single page:

```bash
smippo https://example.com
```

Mirror a site (3 levels deep):

```bash
smippo https://example.com --depth 3
```

Or use without installing:

```bash
npx smippo https://example.com
```

> 📖 **For complete documentation, guides, and API reference, visit [smippo.com](https://smippo.com)**

## Installation

### Requirements

- Node.js 18 or later
- Chromium (automatically downloaded on first install)

### npm (Global)

```bash
npm install -g smippo
```

### Homebrew (Coming soon)

```bash
brew install smippo
```

## Usage

### Basic Usage

```bash
# Capture a single page with all assets
smippo https://example.com

# Mirror a site with depth control
smippo https://example.com --depth 3

# Save to custom directory
smippo https://example.com --output ./my-mirror
```

### Interactive Mode

Just run `smippo` with no arguments to start the guided wizard:

```bash
smippo
```

This will walk you through:

- URL to capture
- Crawl depth
- Scope settings
- Asset options
- Advanced configuration

Perfect for beginners or when you want to explore options!

### Filtering

```bash
# Include only specific patterns
smippo https://example.com --include "*.html" --include "*.css"

# Exclude patterns
smippo https://example.com --exclude "*tracking*" --exclude "*ads*"

# Filter by MIME type
smippo https://example.com --mime-include "image/*" --mime-exclude "video/*"

# Filter by file size
smippo https://example.com --max-size 5MB --min-size 1KB
```

### Scope Control

```bash
# Stay on same subdomain (default)
smippo https://www.example.com --scope subdomain

# Allow all subdomains
smippo https://www.example.com --scope domain

# Go everywhere (use with caution!)
smippo https://example.com --scope all --depth 2
```

### Browser Options

```bash
# Wait for specific condition
smippo https://example.com --wait networkidle
smippo https://example.com --wait domcontentloaded

# Add extra wait time for slow sites
smippo https://example.com --wait-time 5000

# Custom user agent
smippo https://example.com --user-agent "Mozilla/5.0..."

# Custom viewport
smippo https://example.com --viewport 1280x720

# Emulate device
smippo https://example.com --device "iPhone 13"
```

### Screenshots

Take quick screenshots without mirroring the full site:

```bash
# Basic screenshot
smippo capture https://example.com

# Full-page screenshot (captures entire scrollable page)
smippo capture https://example.com --full-page

# Save to specific file
smippo capture https://example.com -O ./screenshots/example.png

# Mobile device screenshot
smippo capture https://example.com --device "iPhone 13" -O mobile.png

# Screenshot with dark mode
smippo capture https://example.com --dark-mode

# Capture specific element
smippo capture https://example.com --selector ".hero-section"

# JPEG format with quality
smippo capture https://example.com --format jpeg --quality 90
```

### Authentication

```bash
# Basic auth
smippo https://user:pass@example.com

# Cookie-based auth
smippo https://example.com --cookies cookies.json

# Interactive login (opens browser window)
smippo https://example.com --capture-auth
```

### Output Options

```bash
# Generate screenshots
smippo https://example.com --screenshot

# Generate PDFs
smippo https://example.com --pdf

# Skip HAR file
smippo https://example.com --no-har

# Output structure
smippo https://example.com --structure original  # URL paths (default)
smippo https://example.com --structure flat      # All in one directory
smippo https://example.com --structure domain    # Organized by domain
```

### Performance & Parallelism: The Vacuum Architecture

Smippo's parallel worker architecture mirrors how hippos consume everything in their path—rapidly and efficiently. Multiple workers operate simultaneously, each vacuuming up pages, resources, and network requests in parallel.

```bash
# Default: 8 parallel workers (8 hippos vacuuming simultaneously)
smippo https://example.com

# Limit to 4 workers (for rate-limited sites)
smippo https://example.com --workers 4

# Single worker (sequential, safest)
smippo https://example.com --workers 1

# Maximum speed (use with caution)
smippo https://example.com --workers 16

# Limit total pages
smippo https://example.com --max-pages 100

# Limit total time
smippo https://example.com --max-time 300  # 5 minutes

# Rate limiting (delay between requests per worker)
smippo https://example.com --rate-limit 1000  # 1 second between requests
```

**The Vacuum Architecture:**

Each worker operates like an independent hippo, vacuuming up:

- Fully rendered pages (after JavaScript execution)
- All network resources (images, fonts, stylesheets, API responses)
- Network metadata (captured in HAR files)
- Link structures (for recursive crawling)

All captured content is then **structured** into organized mirrors that preserve original paths and relationships.

**Tips for optimal performance:**

- Use `--workers 1` for sites with strict rate limiting
- Use `--workers 4-8` for most sites (default: 8)
- Use `--workers 16` only for fast servers you control
- Combine `--workers` with `--rate-limit` for polite crawling

### Continue/Update

```bash
# Continue an interrupted capture
smippo continue

# Update an existing mirror
smippo update
```

### Serve

Serve captured sites locally with a built-in web server:

```bash
# Serve with auto port detection
smippo serve ./site

# Specify port
smippo serve ./site --port 3000

# Open browser automatically
smippo serve ./site --open

# Show all requests
smippo serve ./site --verbose
```

The server provides:

- **Auto port detection** — Finds next available port if default is busy
- **Proper MIME types** — Correct content-type headers for all file types
- **CORS support** — Enabled by default for local development
- **Nice terminal UI** — Shows clickable URL and request logs

### Static Mode

For any site, use `--static` to strip scripts for true offline viewing:

```bash
# Capture as static HTML (removes JS, keeps rendered content)
smippo https://example.com --static --external-assets

# Then serve
smippo serve ./site --open
```

## Structured Output

Smippo creates **structured mirrors** that preserve the original URL structure and relationships. Every page, every resource, every network request is organized and stored in a logical hierarchy:

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
│   └── log.txt             # Capture log
└── index.html              # Entry point
```

## Programmatic API

```javascript
import {capture, Crawler, createServer} from 'smippo';

// Simple capture
const result = await capture('https://example.com', {
  output: './mirror',
  depth: 2,
});

console.log(`Captured ${result.stats.pagesCapt} pages`);

// Advanced usage with events
const crawler = new Crawler({
  url: 'https://example.com',
  output: './mirror',
  depth: 3,
  scope: 'domain',
});

crawler.on('page:complete', ({url, size}) => {
  console.log(`Captured: ${url} (${size} bytes)`);
});

crawler.on('error', ({url, error}) => {
  console.error(`Failed: ${url} - ${error.message}`);
});

await crawler.start();

// Start a server programmatically
const server = await createServer({
  directory: './mirror',
  port: 8080,
  open: true, // Opens browser automatically
});

console.log(`Server running at ${server.url}`);

// Later: stop the server
await server.close();
```

> 📖 **For complete API documentation, see the [Programmatic API guide](https://smippo.com/api-reference/programmatic-api) on smippo.com**

## Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests — all contributions help make Smippo better.

Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup
- Code style guidelines
- Pull request process
- Testing requirements

Quick start:

```bash
git clone https://github.com/pouyanafisi/smippo.git
cd smippo
npm install
npm test
```

## License

[MIT](./LICENSE) — feel free to use this in your own projects.

## Acknowledgments

- Built with [Playwright](https://playwright.dev/) for reliable browser automation
- CLI powered by [Commander.js](https://github.com/tj/commander.js) and [@clack/prompts](https://github.com/natemoo-re/clack)
- Inspired by classic website copiers like [HTTrack](https://www.httrack.com/)
