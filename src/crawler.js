import {chromium, devices} from 'playwright';
import {EventEmitter} from 'events';
import PQueue from 'p-queue';
import fs from 'fs-extra';
import {PageCapture} from './page-capture.js';
import {ResourceSaver} from './resource-saver.js';
import {Filter} from './filter.js';
import {RobotsHandler} from './robots.js';
import {rewriteLinks, rewriteCssUrls} from './link-rewriter.js';
import {normalizeUrl, isLikelyPage} from './utils/url.js';
import {Logger} from './utils/logger.js';
import {
  createManifest,
  writeManifest,
  readManifest,
  readCache,
  writeCache,
  addPageToManifest,
  addAssetToManifest,
  addErrorToManifest,
  finalizeManifest,
  getHarPath,
  getLogPath,
} from './manifest.js';

/**
 * Main crawler class
 */
export class Crawler extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.url = normalizeUrl(options.url);
    this.depth = options.depth || 0;
    this.visited = new Set();
    this.queue = new PQueue({concurrency: options.concurrency || 8});
    this.startTime = null;
    this.browser = null;
    this.context = null;
    this.manifest = null;
    this.cache = null;

    this.saver = new ResourceSaver({
      output: options.output,
      structure: options.structure,
    });

    this.filter = new Filter({
      baseUrl: this.url,
      scope: options.scope,
      stayInDir: options.stayInDir,
      externalAssets: options.externalAssets,
      include: options.include,
      exclude: options.exclude,
      mimeInclude: options.mimeInclude,
      mimeExclude: options.mimeExclude,
      maxSize: options.maxSize,
      minSize: options.minSize,
    });

    this.robots = new RobotsHandler({
      ignoreRobots: options.ignoreRobots,
      userAgent: options.userAgent,
    });

    this.logger = new Logger({
      verbose: options.verbose,
      quiet: options.quiet,
      logFile: options.logFile || getLogPath(options.output),
    });
  }

  /**
   * Start the crawl
   */
  async start() {
    this.startTime = Date.now();

    try {
      // Initialize browser
      await this._initBrowser();

      // Load or create manifest
      if (this.options.useCache) {
        this.manifest = await readManifest(this.options.output);
        this.cache = await readCache(this.options.output);
      }

      if (!this.manifest) {
        this.manifest = createManifest(this.url, this.options);
      }

      if (!this.cache) {
        this.cache = {etags: {}, lastModified: {}, contentTypes: {}};
      }

      // Ensure output directory exists
      await fs.ensureDir(this.options.output);

      // Start crawling
      await this._crawl(this.url, this.depth);

      // Wait for queue to finish
      await this.queue.onIdle();

      // Finalize
      const duration = Date.now() - this.startTime;
      finalizeManifest(this.manifest, duration);
      await writeManifest(this.options.output, this.manifest);
      await writeCache(this.options.output, this.cache);
      await this.logger.flush();

      return {
        stats: this.manifest.stats,
        manifest: this.manifest,
      };
    } finally {
      await this._closeBrowser();
    }
  }

  /**
   * Initialize the browser
   */
  async _initBrowser() {
    const launchOptions = {
      headless: !this.options.debug,
    };

    this.browser = await chromium.launch(launchOptions);

    const contextOptions = {
      viewport: this.options.viewport,
      userAgent: this.options.userAgent,
    };

    // Apply device emulation
    if (this.options.device && devices[this.options.device]) {
      Object.assign(contextOptions, devices[this.options.device]);
    }

    // Set up proxy
    if (this.options.proxy) {
      contextOptions.proxy = {server: this.options.proxy};
    }

    // Record HAR if enabled
    if (this.options.har) {
      contextOptions.recordHar = {
        path: getHarPath(this.options.output),
        mode: 'full',
      };
    }

    this.context = await this.browser.newContext(contextOptions);

    // Load cookies if provided
    if (this.options.cookies) {
      const cookies = await fs.readJson(this.options.cookies);
      await this.context.addCookies(cookies);
    }

    // Set extra headers
    if (this.options.headers && Object.keys(this.options.headers).length > 0) {
      await this.context.setExtraHTTPHeaders(this.options.headers);
    }
  }

  /**
   * Close the browser
   */
  async _closeBrowser() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Crawl a URL
   */
  async _crawl(url, remainingDepth) {
    // Normalize URL
    url = normalizeUrl(url);

    // Check if already visited
    if (this.visited.has(url)) {
      return;
    }

    // Check max pages limit
    if (this.options.maxPages && this.visited.size >= this.options.maxPages) {
      return;
    }

    // Check max time limit
    if (
      this.options.maxTime &&
      Date.now() - this.startTime >= this.options.maxTime
    ) {
      return;
    }

    // Check filter
    if (!this.filter.shouldFollow(url)) {
      this.logger.debug(`Filtered out: ${url}`);
      return;
    }

    // Check robots.txt
    const robotsAllowed = await this.robots.isAllowed(url, async robotsUrl => {
      try {
        const page = await this.context.newPage();
        const response = await page.goto(robotsUrl, {timeout: 10000});
        const content = response?.ok() ? await page.content() : null;
        await page.close();
        return content;
      } catch {
        return null;
      }
    });

    if (!robotsAllowed) {
      this.logger.debug(`Blocked by robots.txt: ${url}`);
      return;
    }

    // Mark as visited
    this.visited.add(url);

    // Add to queue
    this.queue.add(async () => {
      await this._capturePage(url, remainingDepth);
    });
  }

  /**
   * Capture a single page
   */
  async _capturePage(url, remainingDepth) {
    this.emit('page:start', {url});

    let page = null;

    try {
      // Rate limiting
      if (this.options.rateLimit > 0) {
        await sleep(this.options.rateLimit);
      }

      // Check crawl delay from robots.txt
      const crawlDelay = this.robots.getCrawlDelay(url);
      if (crawlDelay > 0) {
        await sleep(crawlDelay * 1000);
      }

      // Create page
      page = await this.context.newPage();

      // Capture the page
      const capture = new PageCapture(page, {
        wait: this.options.wait,
        waitTime: this.options.waitTime,
        timeout: this.options.timeout,
        screenshot: this.options.screenshot,
        pdf: this.options.pdf,
        mimeInclude: this.options.mimeInclude,
        mimeExclude: this.options.mimeExclude,
        maxSize: this.options.maxSize,
        minSize: this.options.minSize,
        scroll: this.options.scroll,
        scrollWait: this.options.scrollWait,
        scrollStep: this.options.scrollStep,
        scrollDelay: this.options.scrollDelay,
        scrollBehavior: this.options.scrollBehavior,
        revealAll: this.options.revealAll,
        reducedMotion: this.options.reducedMotion,
      });

      const result = await capture.capture(url);

      // Save resources
      const savedResources = await this.saver.saveResources(result.resources);

      for (const resource of savedResources) {
        addAssetToManifest(this.manifest, {
          url: resource.url,
          localPath: this.saver.getRelativePath(resource.localPath),
          mimeType: result.resources.get(resource.url)?.contentType,
          size: resource.size,
        });

        this.emit('asset:save', {
          url: resource.url,
          localPath: resource.localPath,
          size: resource.size,
        });
      }

      // Build URL map for link rewriting
      const urlMap = this.saver.getUrlMap();

      // Rewrite CSS files to fix asset URLs
      await this._rewriteCssFiles(result.resources, urlMap);

      // Rewrite links in HTML
      const rewrittenHtml = rewriteLinks(result.html, url, urlMap, {
        structure: this.options.structure,
        noJs: this.options.noJs,
        inlineCss: this.options.inlineCss,
      });

      // Save HTML
      const htmlPath = await this.saver.saveHtml(url, rewrittenHtml);

      // Update manifest
      addPageToManifest(this.manifest, {
        url,
        localPath: this.saver.getRelativePath(htmlPath),
        size: Buffer.byteLength(rewrittenHtml, 'utf8'),
        title: result.title,
      });

      // Save screenshot if captured
      if (result.screenshot) {
        await this.saver.saveScreenshot(url, result.screenshot);
      }

      // Save PDF if captured
      if (result.pdf) {
        await this.saver.savePdf(url, result.pdf);
      }

      this.emit('page:complete', {
        url,
        localPath: htmlPath,
        size: Buffer.byteLength(rewrittenHtml, 'utf8'),
        linksFound: result.links.pages.length,
      });

      // Continue crawling if depth allows
      if (remainingDepth > 0) {
        for (const link of result.links.pages) {
          if (isLikelyPage(link)) {
            await this._crawl(link, remainingDepth - 1);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to capture ${url}`, error);
      addErrorToManifest(this.manifest, url, error);
      this.emit('error', {url, error});
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Rewrite URLs in CSS files to point to local files
   */
  async _rewriteCssFiles(resources, urlMap) {
    const {joinPath, sanitizePath} = await import('./utils/path.js');

    for (const [resourceUrl, resource] of resources) {
      const contentType = resource.contentType || '';

      // Only process CSS files
      if (!contentType.includes('text/css') && !resourceUrl.endsWith('.css')) {
        continue;
      }

      try {
        // Get the local path where this CSS was saved
        const cssRelativePath = urlMap.get(resourceUrl);
        if (!cssRelativePath) continue;

        const cssLocalPath = joinPath(
          this.options.output,
          sanitizePath(cssRelativePath),
        );

        // Read the CSS file
        const cssContent = await fs.readFile(cssLocalPath, 'utf8');

        // Rewrite URLs in the CSS
        const rewrittenCss = rewriteCssUrls(
          cssContent,
          resourceUrl,
          urlMap,
          cssRelativePath,
          {structure: this.options.structure},
        );

        // Write the rewritten CSS back
        if (rewrittenCss !== cssContent) {
          await fs.writeFile(cssLocalPath, rewrittenCss, 'utf8');
        }
      } catch (error) {
        // Ignore CSS rewriting errors
        this.logger.debug(
          `Failed to rewrite CSS ${resourceUrl}:`,
          error.message,
        );
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
