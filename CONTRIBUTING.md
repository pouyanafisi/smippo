# Contributing to Smippo

Welcome! We're thrilled that you're interested in contributing to Smippo. Every contribution helps make Smippo better for everyone.

## Table of Contents

- [Contributing to Smippo](#contributing-to-smippo)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Development Setup](#development-setup)
  - [Making Changes](#making-changes)
    - [Branch Naming](#branch-naming)
    - [Code Style](#code-style)
    - [Testing](#testing)
    - [Commit Messages](#commit-messages)
  - [Pull Request Process](#pull-request-process)
    - [PR Checklist](#pr-checklist)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Project Structure](#project-structure)
  - [Need Help?](#need-help)
  - [Thank You!](#thank-you)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org) v18 or later
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:

   ```bash
   git clone git@github.com:YOUR_USERNAME/smippo.git
   cd smippo
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Install Playwright browsers** (required for testing):

   ```bash
   npx playwright install chromium
   ```

5. **Run the tool locally**:
   ```bash
   node bin/smippo.js https://example.com
   ```

## Making Changes

### Branch Naming

Create a descriptive branch name:

- `feature/add-pdf-export` — for new features
- `fix/timeout-issue` — for bug fixes
- `docs/update-readme` — for documentation
- `refactor/cleanup-crawler` — for code improvements

### Code Style

We use ESLint and Prettier to maintain consistent code style:

```bash
# Check for linting errors
npm run lint

# Format code
npm run format

# Check formatting without modifying
npm run format:check
```

### Testing

Before submitting a PR, ensure all tests pass:

```bash
npm test
```

To run specific tests:

```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
```

### Commit Messages

We follow conventional commit messages:

- `feat:` — A new feature
- `fix:` — A bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

Examples:

```
feat: add support for cookie authentication
fix: resolve timeout issue on slow networks
docs: update installation instructions
```

## Pull Request Process

1. **Update your fork** with the latest from upstream:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes** to your fork:

   ```bash
   git push origin your-branch-name
   ```

3. **Open a Pull Request** on GitHub with:
   - A clear title and description
   - Reference to any related issues
   - Screenshots if applicable

4. **Address feedback** from code reviews

5. **Wait for approval** — We'll review your PR as soon as possible!

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventions

## Reporting Bugs

Found a bug? Please help us fix it!

1. **Search existing issues** to see if it's already reported
2. **Create a new issue** using the bug report template
3. **Include**:
   - Smippo version (`smippo --version`)
   - Node.js version (`node --version`)
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs

## Suggesting Features

Have an idea? We'd love to hear it!

1. **Check existing issues** and discussions
2. **Open a feature request** using the template
3. **Describe**:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative approaches considered

## Project Structure

```
smippo/
├── bin/              # CLI entry point
├── src/              # Source code
│   ├── cli.js        # Command-line interface
│   ├── crawler.js    # Main crawler logic
│   ├── filter.js     # URL/content filtering
│   ├── interactive.js # Interactive wizard
│   ├── page-capture.js # Page capture logic
│   ├── server.js     # Built-in HTTP server
│   └── utils/        # Utility functions
├── test/             # Test files
├── assets/           # Static assets (logo, etc.)
└── website/          # Documentation website
```

## Need Help?

- 💬 [GitHub Discussions](https://github.com/pouyanafisi/smippo_temp/discussions) — Questions & help
- 📖 [Documentation](https://smippo.dev) — User guides
- 🐛 [Issues](https://github.com/pouyanafisi/smippo_temp/issues) — Bug reports

## Thank You!

Your contributions make Smippo better. Whether it's a bug report, feature suggestion, documentation update, or code contribution — every bit helps!

🦛 **Hippos don't nibble. They vacuum. So do we — vacuuming up awesome contributions!**
