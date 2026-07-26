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
  findMissingResources,
  fetchMissingResources,
} from './utils/fetch-missing.js';
import {shouldExcludeUrl} from './filters/exclude-patterns.js';
import {detectChallenge} from './challenge.js';
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

    this.logger = new Logger({
      verbose: options.verbose,
      quiet: options.quiet,
      logFile: options.logFile || getLogPath(options.output),
    });

    // The logger is passed in so a robots.txt fail-open is visible. The
    // fail-open default itself is unchanged.
    this.robots = new RobotsHandler({
      ignoreRobots: options.ignoreRobots,
      userAgent: options.userAgent,
      logger: this.logger,
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
   * Initialize the browser.
   *
   * Four ways in, in precedence order:
   *
   *   --cdp <endpoint>       attach to a browser the user already started
   *   --user-data-dir <dir>  launch with a real profile (persistent context)
   *   --channel <name>       launch the installed Chrome/Edge rather than
   *                          Playwright's bundled Chromium
   *   (default)              bundled Chromium
   *
   * The point of the first three is to use a REAL browser, never to fake one.
   * Bundled Chromium carries automation markers that edge bot detection refuses,
   * and the answer to that is to drive the actual browser the user already has -
   * not to patch navigator.webdriver, spoof a TLS/JA3 fingerprint, or load a
   * stealth plugin. Defeating bot detection is explicitly out of scope. If a
   * challenge appears, a person clears it in their own browser.
   */
  async _initBrowser() {
    // Ownership decides teardown. Anything smippo did not start, smippo does not
    // close - closing a CDP-attached browser would kill the user's own window.
    this.ownsBrowser = false;
    this.ownsContext = false;

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

    if (this.options.cdp) {
      await this._attachOverCdp(contextOptions);
    } else if (this.options.userDataDir) {
      await this._launchPersistent(contextOptions);
    } else {
      const launchOptions = {headless: !this.options.debug};
      if (this.options.channel) launchOptions.channel = this.options.channel;
      if (this.options.executablePath) {
        launchOptions.executablePath = this.options.executablePath;
      }
      this.browser = await chromium.launch(launchOptions);
      this.ownsBrowser = true;
      this.context = await this.browser.newContext(contextOptions);
      this.ownsContext = true;
    }

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
   * Attach to a browser the user is already running.
   *
   * connectOverCDP joins an existing process rather than launching one, so it
   * sets no automation flags and the page context stays indistinguishable from
   * the user browsing by hand. That is the whole point of this mode.
   */
  async _attachOverCdp(contextOptions) {
    try {
      this.browser = await chromium.connectOverCDP(this.options.cdp);
    } catch (error) {
      throw new Error(
        `Could not attach to a browser at ${this.options.cdp}: ${error.message}\n` +
          `  Start one first, e.g.:\n` +
          `    google-chrome --remote-debugging-port=9222 \\\n` +
          `      --user-data-dir="$HOME/.chrome-devport-profile"`,
      );
    }

    // We attached; we did not start it. Do not close it.
    this.ownsBrowser = false;

    // Over CDP the browser exposes its existing default context. Reuse it - a
    // fresh context would lose the cookies and session that make this mode work.
    const existing = this.browser.contexts();
    if (existing.length > 0) {
      this.context = existing[0];
      this.ownsContext = false;
    } else {
      this.context = await this.browser.newContext();
      this.ownsContext = true;
    }

    // Context-creation options cannot be applied to a context we did not create.
    // Say so rather than pretending they took effect.
    const ignored = [];
    if (this.options.har) ignored.push('--har');
    if (this.options.userAgent) ignored.push('--user-agent');
    if (this.options.device) ignored.push('--device');
    if (this.options.proxy) ignored.push('--proxy');
    if (ignored.length > 0) {
      this.logger.warn(
        `Ignored with --cdp (the attached browser owns its context): ${ignored.join(', ')}`,
      );
    }
    // Viewport is settable per page, so it is applied in _capturePage instead.
    this.cdpViewport = contextOptions.viewport;
  }

  /**
   * Launch a browser against a real on-disk profile, cookies and all.
   *
   * launchPersistentContext returns a context directly; there is no separate
   * Browser to manage. smippo started this process, so smippo closes it -
   * leaving it open would hang the CLI. Point it at a dedicated profile
   * directory: Chrome locks a profile that is already open.
   */
  async _launchPersistent(contextOptions) {
    const launchOptions = {
      headless: !this.options.debug,
      ...contextOptions,
    };
    if (this.options.channel) launchOptions.channel = this.options.channel;
    if (this.options.executablePath) {
      launchOptions.executablePath = this.options.executablePath;
    }

    try {
      this.context = await chromium.launchPersistentContext(
        this.options.userDataDir,
        launchOptions,
      );
    } catch (error) {
      throw new Error(
        `Could not launch a browser with profile ${this.options.userDataDir}: ${error.message}\n` +
          `  A profile already open in another browser window is locked. Quit it,\n` +
          `  or use a dedicated profile directory.`,
      );
    }

    this.browser = this.context.browser();
    this.ownsBrowser = true;
    this.ownsContext = true;
  }

  /**
   * Close the browser - or, when attached, merely let go of it.
   *
   * Contexts: only ever close one smippo created. Closing a context reused over
   * CDP would shut the user's own tabs.
   *
   * Browsers: browser.close() means two different things in Playwright. On a
   * browser obtained from launch()/launchPersistentContext() it terminates the
   * process. On one obtained from connectOverCDP() it disconnects the client and
   * leaves the browser running - verified against Chrome 150 by connecting to a
   * browser with open tabs, calling close(), and confirming both the browser and
   * every pre-existing tab survived.
   *
   * The disconnect is not optional: Playwright's open socket keeps the Node
   * process alive, so skipping it leaves the CLI hanging forever after a
   * successful capture.
   */
  async _closeBrowser() {
    if (this.context && this.ownsContext) {
      await this.context.close();
    }
    if (this.browser) {
      // Kills the process when we launched it; disconnects when we attached.
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

      // Create page. Pages smippo opens are smippo's to close, even in --cdp
      // mode where the browser and context are not.
      page = await this.context.newPage();

      // With --cdp the context already existed, so its viewport could not be set
      // at creation time. Apply it per page instead.
      if (this.cdpViewport) {
        await page.setViewportSize(this.cdpViewport);
      }

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

      // Is this the site, or a bot check pretending to be it? Silently saving a
      // Turnstile interstitial as if it were content is the worst failure mode
      // this tool has, because it is only discovered much later.
      const challenge = detectChallenge({
        html: result.html,
        status: result.status,
        contentType: result.contentType,
      });

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

      // Fetch any resources referenced in HTML but not captured
      const missingUrls = findMissingResources(
        result.html,
        url,
        result.resources,
      ).filter(u => !shouldExcludeUrl(u)); // Don't fetch analytics

      if (missingUrls.length > 0) {
        this.emit('fetch:missing', {count: missingUrls.length});

        const missingResources = await fetchMissingResources(missingUrls, {
          concurrency: 5,
          timeout: this.options.timeout,
          onProgress: (resourceUrl, resource) => {
            this.emit('asset:fetch', {url: resourceUrl, size: resource.size});
          },
        });

        // Save fetched resources
        const additionalSaved =
          await this.saver.saveResources(missingResources);

        for (const resource of additionalSaved) {
          addAssetToManifest(this.manifest, {
            url: resource.url,
            localPath: this.saver.getRelativePath(resource.localPath),
            mimeType: missingResources.get(resource.url)?.contentType,
            size: resource.size,
          });

          this.emit('asset:save', {
            url: resource.url,
            localPath: resource.localPath,
            size: resource.size,
            fetched: true,
          });
        }
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
        keepAnalytics: this.options.keepAnalytics,
      });

      // Save HTML
      const htmlPath = await this.saver.saveHtml(url, rewrittenHtml);

      // Update manifest. A challenged page is recorded and flagged rather than
      // counted as captured content.
      addPageToManifest(this.manifest, {
        url,
        localPath: this.saver.getRelativePath(htmlPath),
        status: result.status,
        size: Buffer.byteLength(rewrittenHtml, 'utf8'),
        title: result.title,
        challenge,
      });

      // Save screenshot if captured
      if (result.screenshot) {
        await this.saver.saveScreenshot(url, result.screenshot);
      }

      // Save PDF if captured
      if (result.pdf) {
        await this.saver.savePdf(url, result.pdf);
      }

      if (challenge.challenged) {
        this.logger.error(
          `Challenge page (not content): ${url} [${challenge.markers.join(', ')}]`,
        );
        this.emit('page:challenge', {
          url,
          localPath: htmlPath,
          markers: challenge.markers,
          reason: challenge.reason,
          status: result.status,
        });
        // Every link on an interstitial belongs to the interstitial. Following
        // them would just fill the mirror with more challenge pages.
        return;
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
