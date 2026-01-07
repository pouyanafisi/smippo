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

## Commands

Smippo provides several commands for different use cases:

- **`smippo <url>`** — Capture and mirror websites with full fidelity
- **`smippo capture <url>`** — Take screenshots of web pages
- **`smippo serve <directory>`** — Serve captured sites locally
- **`smippo continue`** — Resume an interrupted capture
- **`smippo update`** — Update an existing mirror

Run `smippo` with no arguments to start the interactive guided mode.

## Features

- **🚀 Vacuum Architecture** — Parallel workers consume sites rapidly
- **📸 Complete Fidelity** — Captures pages exactly as rendered, including CSS-in-JS, dynamic content, and lazy-loaded images
- **🎯 Smart Filtering** — Filter by URL patterns, MIME types, and file sizes. Respects robots.txt
- **🌐 Built-in Server** — Serve captured sites locally with directory browsing
- **📊 HAR Files** — Generates HTTP Archive files for debugging and replay
- **💻 Programmatic API** — Use Smippo in your Node.js applications

## Documentation

For complete documentation, guides, and API reference, visit **[smippo.com](https://smippo.com)**:

- **[Installation Guide](https://smippo.com/getting-started/installation)** — Detailed installation instructions
- **[Commands Reference](https://smippo.com/commands)** — All available commands and options
- **[Configuration](https://smippo.com/configuration)** — Filtering, scope control, performance tuning
- **[Guides](https://smippo.com/guides)** — Output structure, link rewriting, troubleshooting
- **[Programmatic API](https://smippo.com/api/programmatic)** — Use Smippo in your Node.js code
- **[Examples](https://smippo.com/getting-started/examples)** — Real-world use cases

## Requirements

- Node.js 18 or later
- Chromium (automatically downloaded on first install)

## Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests — all contributions help make Smippo better.

Please read our [Contributing Guide](CONTRIBUTING.md) for details on development setup, code style guidelines, and the pull request process.

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
