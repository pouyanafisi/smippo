// @flow
import {Command} from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {Crawler} from './crawler.js';
import {readManifest, manifestExists} from './manifest.js';
import {version} from './utils/version.js';
import {
  showHelp,
  runInteractiveCapture,
  shouldRunInteractive,
} from './interactive.js';

const program = new Command();

export function run() {
  // Check for help command first
  const args = process.argv.slice(2);
  if (args.includes('help') || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  // Check if we should run interactive mode
  if (shouldRunInteractive(args)) {
    runInteractiveCapture()
      .then(options => {
        return capture(options.url, {
          output: options.output,
          depth: options.depth,
          scope: options.scope,
          externalAssets: options.externalAssets,
          static: options.static,
          screenshot: options.screenshot,
          workers: options.workers,
        });
      })
      .catch(error => {
        console.error(chalk.red(`\n✗ Error: ${error.message}`));
        process.exit(1);
      });
    return;
  }

  program
    .name('smippo')
    .description(
      'Modern website copier powered by Playwright - capture JS-rendered pages for offline viewing',
    )
    .version(version);

  // Main capture command
  program
    .argument('[url]', 'URL to capture')
    .option('-o, --output <dir>', 'Output directory', './site')
    .option('-d, --depth <n>', 'Recursion depth (0 = single page)', '0')
    .option('--no-crawl', 'Disable link following (same as -d 0)')
    .option('--dry-run', 'Show what would be captured without downloading')

    // Scope options
    .option(
      '-s, --scope <type>',
      'Link scope: subdomain|domain|tld|all',
      'domain',
    )
    .option('--stay-in-dir', 'Only follow links in same directory or subdirs')
    .option('--external-assets', 'Capture assets from external domains')

    // Filter options
    .option('-I, --include <glob...>', 'Include URLs matching pattern')
    .option('-E, --exclude <glob...>', 'Exclude URLs matching pattern')
    .option('--mime-include <type...>', 'Include MIME types')
    .option('--mime-exclude <type...>', 'Exclude MIME types')
    .option('--max-size <size>', 'Maximum file size (e.g., 10MB)')
    .option('--min-size <size>', 'Minimum file size (e.g., 1KB)')

    // Browser options
    .option(
      '--wait <strategy>',
      'Wait strategy: networkidle|load|domcontentloaded',
      'networkidle',
    )
    .option('--wait-time <ms>', 'Additional wait time after network idle', '0')
    .option('--timeout <ms>', 'Page load timeout', '30000')
    .option('--user-agent <string>', 'Custom user agent')
    .option('--viewport <WxH>', 'Viewport size', '1920x1080')
    .option('--device <name>', 'Emulate device (e.g., "iPhone 13")')

    // Network options
    .option('--proxy <url>', 'Proxy server URL')
    .option('--cookies <file>', 'Load cookies from JSON file')
    .option('--headers <json>', 'Custom headers as JSON')
    .option('--capture-auth', 'Interactive authentication capture')

    // Output options
    .option(
      '--structure <type>',
      'Output structure: original|flat|domain',
      'original',
    )
    .option('--har', 'Generate HAR file', true)
    .option('--no-har', 'Disable HAR file generation')
    .option('--screenshot', 'Take screenshot of each page')
    .option('--pdf', 'Save PDF of each page')
    .option('--static', 'Remove scripts for static offline viewing')
    .option('--inline-css', 'Inline CSS into HTML for single-file output')

    // Performance options
    .option('-w, --workers <n>', 'Parallel workers/pages (default: 8)', '8')
    .option('-c, --concurrency <n>', 'Alias for --workers', '8')
    .option('--max-pages <n>', 'Maximum pages to capture')
    .option('--max-time <seconds>', 'Maximum total time')
    .option('--rate-limit <ms>', 'Delay between requests')

    // Robots options
    .option('--ignore-robots', 'Ignore robots.txt')
    .option('--respect-robots', 'Respect robots.txt', true)

    // Cache options
    .option('--no-cache', "Don't use cache")

    // Logging options
    .option('-v, --verbose', 'Verbose output')
    .option('-q, --quiet', 'Minimal output')
    .option('--log-file <path>', 'Write logs to file')
    .option('--debug', 'Debug mode with visible browser')

    // Interaction options
    .option('--no-interaction', 'Non-interactive mode (for CI/scripts)')
    .option('-y, --yes', 'Skip prompts, use defaults')

    .action(async (url, options) => {
      if (!url) {
        showHelp();
        return;
      }

      try {
        await capture(url, options);
      } catch (error) {
        console.error(chalk.red(`\n✗ Error: ${error.message}`));
        if (options.verbose || options.debug) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // Continue command
  program
    .command('continue')
    .description('Resume an interrupted capture')
    .option('-o, --output <dir>', 'Output directory', './site')
    .option('-v, --verbose', 'Verbose output')
    .action(async options => {
      try {
        await continueCapture(options);
      } catch (error) {
        console.error(chalk.red(`\n✗ Error: ${error.message}`));
        process.exit(1);
      }
    });

  // Update command
  program
    .command('update')
    .description('Update an existing mirror')
    .option('-o, --output <dir>', 'Output directory', './site')
    .option('-v, --verbose', 'Verbose output')
    .action(async options => {
      try {
        await updateCapture(options);
      } catch (error) {
        console.error(chalk.red(`\n✗ Error: ${error.message}`));
        process.exit(1);
      }
    });

  // Serve command
  program
    .command('serve [directory]')
    .description('Serve a captured site locally')
    .option(
      '-p, --port <port>',
      'Port to serve on (auto-finds available)',
      '8080',
    )
    .option('-H, --host <host>', 'Host to bind to', '127.0.0.1')
    .option('-o, --open', 'Open browser automatically')
    .option('--no-cors', 'Disable CORS headers')
    .option('-v, --verbose', 'Show all requests')
    .option('-q, --quiet', 'Minimal output')
    .action(async (directory, options) => {
      const {serve} = await import('./server.js');
      await serve({
        directory: directory || './site',
        port: options.port,
        host: options.host,
        open: options.open,
        cors: options.cors,
        verbose: options.verbose,
        quiet: options.quiet,
      });
    });

  // Screenshot capture command
  program
    .command('capture <url>')
    .description('Take a screenshot of a URL')
    .option(
      '-O, --out <file>',
      'Output file path (auto-generated if not specified)',
    )
    .option('-f, --full-page', 'Capture full scrollable page')
    .option('--format <type>', 'Image format: png|jpeg', 'png')
    .option('--quality <n>', 'JPEG quality (1-100)', '80')
    .option('--viewport <WxH>', 'Viewport size', '1920x1080')
    .option('--device <name>', 'Emulate device (e.g., "iPhone 13", "iPad Pro")')
    .option('--selector <css>', 'Capture specific element by CSS selector')
    .option(
      '--wait <strategy>',
      'Wait strategy: networkidle|load|domcontentloaded',
      'networkidle',
    )
    .option('--wait-time <ms>', 'Additional wait time after load', '0')
    .option('--timeout <ms>', 'Page load timeout', '30000')
    .option('--dark-mode', 'Use dark color scheme')
    .option('--no-background', 'Transparent background (PNG only)')
    .option('-v, --verbose', 'Verbose output')
    .option('-q, --quiet', 'Minimal output')
    .action(async (url, options) => {
      try {
        const {captureScreenshot, parseViewport} =
          await import('./screenshot.js');
        await captureScreenshot(url, {
          output: options.out,
          fullPage: options.fullPage,
          format: options.format,
          quality: options.quality ? parseInt(options.quality, 10) : undefined,
          viewport: parseViewport(options.viewport),
          device: options.device,
          selector: options.selector,
          wait: options.wait,
          waitTime: parseInt(options.waitTime, 10),
          timeout: parseInt(options.timeout, 10),
          darkMode: options.darkMode,
          omitBackground: !options.background,
          verbose: options.verbose,
          quiet: options.quiet,
        });
      } catch (error) {
        console.error(chalk.red(`\n✗ Error: ${error.message}`));
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // Help command
  program
    .command('help')
    .description('Show detailed help')
    .action(() => {
      showHelp();
    });

  program.parse();
}

async function capture(url, options) {
  const spinner = ora({
    text: 'Initializing browser...',
    isSilent: options.quiet,
  }).start();

  const crawler = new Crawler({
    url,
    output: options.output,
    depth: parseInt(options.depth, 10),
    scope: options.scope,
    stayInDir: options.stayInDir,
    externalAssets: options.externalAssets,
    include: options.include || [],
    exclude: options.exclude || [],
    mimeInclude: options.mimeInclude || [],
    mimeExclude: options.mimeExclude || [],
    maxSize: parseSize(options.maxSize),
    minSize: parseSize(options.minSize),
    wait: options.wait,
    waitTime: parseInt(options.waitTime, 10),
    timeout: parseInt(options.timeout, 10),
    userAgent: options.userAgent,
    viewport: parseViewport(options.viewport),
    device: options.device,
    proxy: options.proxy,
    cookies: options.cookies,
    headers: options.headers ? JSON.parse(options.headers) : {},
    captureAuth: options.captureAuth,
    structure: options.structure,
    har: options.har,
    screenshot: options.screenshot,
    pdf: options.pdf,
    noJs: options.static,
    inlineCss: options.inlineCss,
    concurrency: parseInt(options.workers || options.concurrency, 10),
    maxPages: options.maxPages ? parseInt(options.maxPages, 10) : undefined,
    maxTime: options.maxTime ? parseInt(options.maxTime, 10) * 1000 : undefined,
    rateLimit: options.rateLimit ? parseInt(options.rateLimit, 10) : 0,
    ignoreRobots: options.ignoreRobots,
    useCache: options.cache,
    verbose: options.verbose,
    quiet: options.quiet,
    logFile: options.logFile,
    debug: options.debug,
    dryRun: options.dryRun,
    spinner,
  });

  crawler.on('page:start', ({url}) => {
    spinner.text = `Capturing: ${truncateUrl(url, 60)}`;
  });

  crawler.on('page:complete', ({url, size}) => {
    if (options.verbose) {
      spinner.succeed(
        `Captured: ${truncateUrl(url, 50)} (${formatSize(size)})`,
      );
      spinner.start();
    }
  });

  crawler.on('asset:save', ({url, size}) => {
    if (options.verbose) {
      spinner.text = `Asset: ${truncateUrl(url, 60)} (${formatSize(size)})`;
    }
  });

  crawler.on('error', ({url, error}) => {
    if (!options.quiet) {
      spinner.warn(`Failed: ${truncateUrl(url, 50)} - ${error.message}`);
      spinner.start();
    }
  });

  const result = await crawler.start();

  spinner.succeed(chalk.green(`Capture complete!`));
  console.log('');
  console.log(chalk.cyan('  Summary:'));
  console.log(`    Pages captured:  ${result.stats.pagesCapt}`);
  console.log(`    Assets saved:    ${result.stats.assetsCapt}`);
  console.log(`    Total size:      ${formatSize(result.stats.totalSize)}`);
  console.log(`    Duration:        ${formatDuration(result.stats.duration)}`);
  if (result.stats.errors > 0) {
    console.log(chalk.yellow(`    Errors:          ${result.stats.errors}`));
  }
  console.log('');
  console.log(`  Output: ${chalk.underline(options.output)}`);
}

async function continueCapture(options) {
  if (!manifestExists(options.output)) {
    throw new Error(
      'No capture found in the specified directory. Start a new capture first.',
    );
  }

  const manifest = await readManifest(options.output);
  console.log(chalk.cyan(`Continuing capture of ${manifest.rootUrl}...`));

  await capture(manifest.rootUrl, {
    ...manifest.options,
    ...options,
    useCache: true,
  });
}

async function updateCapture(options) {
  if (!manifestExists(options.output)) {
    throw new Error(
      'No capture found in the specified directory. Start a new capture first.',
    );
  }

  const manifest = await readManifest(options.output);
  console.log(chalk.cyan(`Updating mirror of ${manifest.rootUrl}...`));

  await capture(manifest.rootUrl, {
    ...manifest.options,
    ...options,
    useCache: true,
    update: true,
  });
}

function parseSize(sizeStr) {
  if (!sizeStr) return undefined;
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|B)?$/i);
  if (!match) return undefined;

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();

  const multipliers = {B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024};
  return num * (multipliers[unit] || 1);
}

function parseViewport(viewportStr) {
  if (!viewportStr) return {width: 1920, height: 1080};
  const [width, height] = viewportStr.split('x').map(Number);
  return {width: width || 1920, height: height || 1080};
}

function truncateUrl(url, maxLen) {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + '...';
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}
