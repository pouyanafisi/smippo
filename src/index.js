/**
 * Smippo - Modern Website Copier
 *
 * A Playwright-powered website mirroring tool for the JavaScript age.
 * Captures fully rendered pages with all network artifacts.
 */

export {Crawler} from './crawler.js';
export {PageCapture} from './page-capture.js';
export {ResourceSaver} from './resource-saver.js';
export {Filter, createFilter} from './filter.js';
export {RobotsHandler} from './robots.js';
export {extractLinks, extractCssUrls} from './link-extractor.js';
export {rewriteLinks, rewriteCssUrls} from './link-rewriter.js';
export {
  createManifest,
  readManifest,
  writeManifest,
  readCache,
  writeCache,
  manifestExists,
} from './manifest.js';
export {
  normalizeUrl,
  resolveUrl,
  urlToPath,
  isInScope,
  isSameOrigin,
  isSameDomain,
  isLikelyPage,
  isAsset,
} from './utils/url.js';
export {createServer, serve} from './server.js';

/**
 * Quick capture function for simple use cases
 */
export async function capture(url, options = {}) {
  const {Crawler} = await import('./crawler.js');

  const crawler = new Crawler({
    url,
    output: options.output || './site',
    depth: options.depth ?? 0,
    scope: options.scope || 'domain',
    ...options,
  });

  return crawler.start();
}

/**
 * Default export
 */
export default {
  capture,
  Crawler,
  createServer,
};
