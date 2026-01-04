// @flow
import cliProgress from 'cli-progress';
import chalk from 'chalk';

/**
 * Create a styled multi-bar progress display for Smippo
 */
export function createProgressDisplay(options = {}) {
  const {quiet = false, verbose = false} = options;

  if (quiet) {
    return {
      start: () => {},
      stop: () => {},
      updatePage: () => {},
      updateAsset: () => {},
      log: () => {},
    };
  }

  // Create multi-bar container
  const multibar = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: (options, params, payload) => {
        const {type, name} = payload;
        const bar = options.barCompleteChar.repeat(
          Math.round(params.progress * 30),
        );
        const empty = options.barIncompleteChar.repeat(
          30 - Math.round(params.progress * 30),
        );
        const percent = Math.round(params.progress * 100);

        if (type === 'pages') {
          return `  ${chalk.cyan('Pages')}   ${chalk.cyan('[')}${chalk.cyan(bar)}${chalk.dim(empty)}${chalk.cyan(']')} ${chalk.bold(params.value)}/${params.total} ${chalk.dim(`(${percent}%)`)}`;
        } else if (type === 'assets') {
          return `  ${chalk.magenta('Assets')}  ${chalk.magenta('[')}${chalk.magenta(bar)}${chalk.dim(empty)}${chalk.magenta(']')} ${chalk.bold(params.value)}/${params.total} ${chalk.dim(`(${percent}%)`)}`;
        } else if (type === 'current') {
          const truncated = name.length > 50 ? '...' + name.slice(-47) : name;
          return `  ${chalk.dim('Current:')} ${chalk.white(truncated)}`;
        }
        return '';
      },
      barCompleteChar: '█',
      barIncompleteChar: '░',
    },
    cliProgress.Presets.shades_classic,
  );

  let pageBar = null;
  let assetBar = null;
  let currentBar = null;
  let totalPages = 0;
  let totalAssets = 0;
  let completedPages = 0;
  let completedAssets = 0;

  return {
    /**
     * Start the progress display
     */
    start(estimatedPages = 1, estimatedAssets = 10) {
      totalPages = estimatedPages;
      totalAssets = estimatedAssets;
      completedPages = 0;
      completedAssets = 0;

      console.log('');
      pageBar = multibar.create(totalPages, 0, {type: 'pages'});
      assetBar = multibar.create(totalAssets, 0, {type: 'assets'});
      currentBar = multibar.create(100, 0, {
        type: 'current',
        name: 'Initializing...',
      });
    },

    /**
     * Stop the progress display
     */
    stop() {
      if (multibar) {
        multibar.stop();
      }
      console.log('');
    },

    /**
     * Update page progress
     */
    updatePage(url, total = null) {
      completedPages++;
      if (total && total > totalPages) {
        totalPages = total;
        if (pageBar) pageBar.setTotal(totalPages);
      }
      if (pageBar) pageBar.update(completedPages);
      if (currentBar) currentBar.update(0, {name: url});
    },

    /**
     * Update asset progress
     */
    updateAsset(url, total = null) {
      completedAssets++;
      if (total && total > totalAssets) {
        totalAssets = total;
        if (assetBar) assetBar.setTotal(totalAssets);
      }
      if (assetBar) assetBar.update(completedAssets);
      if (currentBar && verbose) currentBar.update(0, {name: url});
    },

    /**
     * Increment total assets estimate
     */
    addAssets(count) {
      totalAssets += count;
      if (assetBar) assetBar.setTotal(totalAssets);
    },

    /**
     * Log a message (pauses bars)
     */
    log(message) {
      if (verbose) {
        multibar.log(message + '\n');
      }
    },

    /**
     * Update current status
     */
    setStatus(status) {
      if (currentBar) currentBar.update(0, {name: status});
    },
  };
}

/**
 * Simple spinner-based progress for non-TTY environments
 */
export function createSimpleProgress(options = {}) {
  const {quiet = false, verbose = false} = options;

  let pageCount = 0;
  let assetCount = 0;
  let lastUpdate = Date.now();

  return {
    start: () => {
      if (!quiet) console.log(chalk.cyan('\n  Starting capture...\n'));
    },
    stop: () => {},
    updatePage: url => {
      pageCount++;
      if (!quiet && (verbose || Date.now() - lastUpdate > 500)) {
        process.stdout.write(
          `\r  ${chalk.cyan('Pages:')} ${pageCount}  ${chalk.magenta('Assets:')} ${assetCount}  ${chalk.dim('Current:')} ${url.slice(0, 50)}${url.length > 50 ? '...' : ''}    `,
        );
        lastUpdate = Date.now();
      }
    },
    updateAsset: () => {
      assetCount++;
      if (!quiet && verbose) {
        process.stdout.write(
          `\r  ${chalk.cyan('Pages:')} ${pageCount}  ${chalk.magenta('Assets:')} ${assetCount}    `,
        );
      }
    },
    addAssets: () => {},
    log: message => {
      if (verbose) console.log(message);
    },
    setStatus: () => {},
  };
}

/**
 * Choose the appropriate progress display based on environment
 */
export function createProgress(options = {}) {
  // Use simple progress if not a TTY or if specifically requested
  if (!process.stdout.isTTY || options.simple) {
    return createSimpleProgress(options);
  }
  return createProgressDisplay(options);
}
