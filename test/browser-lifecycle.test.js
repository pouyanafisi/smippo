import assert from 'node:assert';
import {describe, it, beforeEach} from 'mocha';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {Crawler} from '../src/crawler.js';

/**
 * Tests for real-browser attachment and, above all, teardown.
 *
 * The dangerous mistake here is closing a browser smippo did not start: a
 * --cdp run attaches to the user's own Chrome, and calling close() on it would
 * shut their windows. Nothing here launches a browser or touches the network -
 * playwright's chromium is replaced with a recording stub.
 */

let tmpOut;

function makeCrawler(options = {}) {
  return new Crawler({
    url: 'https://example.com/',
    output: tmpOut,
    concurrency: 1,
    quiet: true,
    har: false,
    viewport: {width: 1280, height: 800},
    ...options,
  });
}

/**
 * A stand-in for playwright's chromium that records what was called and whether
 * anything got closed.
 */
function stubChromium() {
  const calls = {launch: 0, connectOverCDP: 0, launchPersistent: 0};
  const closed = {browser: 0, context: 0};

  const makeContext = () => ({
    addCookies: async () => {},
    setExtraHTTPHeaders: async () => {},
    newPage: async () => ({close: async () => {}}),
    close: async () => {
      closed.context++;
    },
    browser: () => browser,
  });

  const browser = {
    contexts: () => browser._contexts,
    _contexts: [],
    newContext: async opts => {
      browser._lastContextOptions = opts;
      return makeContext();
    },
    close: async () => {
      closed.browser++;
    },
  };

  const chromium = {
    launch: async opts => {
      calls.launch++;
      chromium.lastLaunchOptions = opts;
      return browser;
    },
    connectOverCDP: async endpoint => {
      calls.connectOverCDP++;
      chromium.lastCdpEndpoint = endpoint;
      return browser;
    },
    launchPersistentContext: async (dir, opts) => {
      calls.launchPersistent++;
      chromium.lastPersistentDir = dir;
      chromium.lastPersistentOptions = opts;
      return makeContext();
    },
  };

  return {chromium, calls, closed, browser, makeContext};
}

/**
 * _initBrowser closes over the module-level `chromium` import, so the stub is
 * injected by temporarily swapping the methods the crawler reaches for.
 */
async function withStub(crawler, stub, fn) {
  const playwright = await import('playwright');
  const real = {
    launch: playwright.chromium.launch,
    connectOverCDP: playwright.chromium.connectOverCDP,
    launchPersistentContext: playwright.chromium.launchPersistentContext,
  };
  playwright.chromium.launch = stub.chromium.launch;
  playwright.chromium.connectOverCDP = stub.chromium.connectOverCDP;
  playwright.chromium.launchPersistentContext =
    stub.chromium.launchPersistentContext;
  try {
    return await fn();
  } finally {
    playwright.chromium.launch = real.launch;
    playwright.chromium.connectOverCDP = real.connectOverCDP;
    playwright.chromium.launchPersistentContext = real.launchPersistentContext;
  }
}

describe('browser selection and teardown', () => {
  beforeEach(async () => {
    tmpOut = await fs.mkdtemp(path.join(os.tmpdir(), 'smippo-out-'));
  });

  it('launches bundled Chromium by default and closes it', async () => {
    const stub = stubChromium();
    const crawler = makeCrawler();
    await withStub(crawler, stub, async () => {
      await crawler._initBrowser();
      await crawler._closeBrowser();
    });

    assert.strictEqual(stub.calls.launch, 1);
    assert.strictEqual(stub.calls.connectOverCDP, 0);
    // We launched it, so we close it.
    assert.strictEqual(stub.closed.browser, 1);
    assert.strictEqual(stub.closed.context, 1);
  });

  it('passes --channel through to launch', async () => {
    const stub = stubChromium();
    const crawler = makeCrawler({channel: 'chrome'});
    await withStub(crawler, stub, async () => {
      await crawler._initBrowser();
      await crawler._closeBrowser();
    });

    assert.strictEqual(stub.chromium.lastLaunchOptions.channel, 'chrome');
  });

  it('attaches over CDP instead of launching', async () => {
    const stub = stubChromium();
    const crawler = makeCrawler({cdp: 'http://localhost:9222'});
    await withStub(crawler, stub, async () => {
      await crawler._initBrowser();
      await crawler._closeBrowser();
    });

    assert.strictEqual(stub.calls.connectOverCDP, 1);
    assert.strictEqual(stub.calls.launch, 0);
    assert.strictEqual(stub.chromium.lastCdpEndpoint, 'http://localhost:9222');
  });

  it('does not claim ownership of a browser it attached to', async () => {
    // browser.close() on a CDP connection disconnects rather than terminating -
    // verified against Chrome 150, where both the browser and its pre-existing
    // tabs survived. It still has to be called, or Playwright's open socket
    // keeps the CLI hanging after a successful capture.
    const stub = stubChromium();
    const crawler = makeCrawler({cdp: 'http://localhost:9222'});
    await withStub(crawler, stub, async () => {
      await crawler._initBrowser();
      await crawler._closeBrowser();
    });

    assert.strictEqual(crawler.ownsBrowser, false);
  });

  it('NEVER closes an existing context it reused over CDP', async () => {
    const stub = stubChromium();
    const existing = stub.makeContext();
    stub.browser._contexts = [existing];

    const crawler = makeCrawler({cdp: 'http://localhost:9222'});
    await withStub(crawler, stub, async () => {
      await crawler._initBrowser();
      await crawler._closeBrowser();
    });

    assert.strictEqual(crawler.context, existing);
    assert.strictEqual(crawler.ownsContext, false);
    assert.strictEqual(stub.closed.context, 0);
  });

  it('reports a CDP endpoint it cannot reach', async () => {
    const stub = stubChromium();
    stub.chromium.connectOverCDP = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:9222');
    };
    const crawler = makeCrawler({cdp: 'http://localhost:9222'});

    await withStub(crawler, stub, async () => {
      await assert.rejects(
        () => crawler._initBrowser(),
        err => {
          assert.match(err.message, /http:\/\/localhost:9222/);
          assert.match(err.message, /remote-debugging-port/);
          return true;
        },
      );
    });
  });

  it('launches a persistent context for --user-data-dir', async () => {
    const stub = stubChromium();
    const crawler = makeCrawler({userDataDir: '/tmp/profile-x'});
    await withStub(crawler, stub, async () => {
      await crawler._initBrowser();
      await crawler._closeBrowser();
    });

    assert.strictEqual(stub.calls.launchPersistent, 1);
    assert.strictEqual(stub.chromium.lastPersistentDir, '/tmp/profile-x');
    // smippo started this one, so it closes it; leaving it open hangs the CLI.
    assert.strictEqual(crawler.ownsContext, true);
    assert.strictEqual(stub.closed.context, 1);
  });

  it('explains a locked profile rather than leaking the raw error', async () => {
    const stub = stubChromium();
    stub.chromium.launchPersistentContext = async () => {
      throw new Error('ProcessSingleton: profile is already in use');
    };
    const crawler = makeCrawler({userDataDir: '/tmp/profile-x'});

    await withStub(crawler, stub, async () => {
      await assert.rejects(
        () => crawler._initBrowser(),
        err => {
          assert.match(err.message, /profile-x/);
          assert.match(err.message, /locked/i);
          return true;
        },
      );
    });
  });
});

describe('no bot-detection evasion', () => {
  it('ships no stealth or fingerprint-spoofing dependency', async () => {
    const pkg = await fs.readJson(
      new URL('../package.json', import.meta.url).pathname,
    );
    const deps = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }).join(' ');

    for (const banned of [
      'stealth',
      'playwright-extra',
      'puppeteer-extra',
      'fingerprint',
      'curl-impersonate',
    ]) {
      assert.ok(
        !deps.includes(banned),
        `dependency matching "${banned}" is bot-detection evasion and is out of scope`,
      );
    }
  });

  it('does not patch navigator.webdriver anywhere in src', async () => {
    const srcDir = new URL('../src/', import.meta.url).pathname;
    const files = [];
    const walk = async dir => {
      for (const entry of await fs.readdir(dir, {withFileTypes: true})) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(p);
        else if (entry.name.endsWith('.js')) files.push(p);
      }
    };
    await walk(srcDir);

    for (const file of files) {
      const source = await fs.readFile(file, 'utf8');
      // A comment saying we must not do it is fine; an assignment is not.
      assert.ok(
        !/navigator\.webdriver\s*=/.test(source) &&
          !/['"]webdriver['"]\s*:\s*\{/.test(source),
        `${file} appears to patch navigator.webdriver`,
      );
    }
  });
});
