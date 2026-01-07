// @flow
import {load} from 'cheerio';
import {resolveUrl} from './url.js';

/**
 * Extract all resource URLs referenced in HTML
 */
export function extractReferencedResources(html, pageUrl) {
  const $ = load(html, {decodeEntities: false});
  const resources = new Set();

  // Helper to add resolved URL
  const addUrl = url => {
    if (!url || url.startsWith('data:') || url.startsWith('javascript:')) {
      return;
    }
    try {
      const resolved = resolveUrl(url, pageUrl);
      if (resolved.startsWith('http')) {
        resources.add(resolved);
      }
    } catch {
      // Ignore invalid URLs
    }
  };

  // Script sources
  $('script[src]').each((_, el) => addUrl($(el).attr('src')));

  // Link hrefs (stylesheets, etc.)
  $('link[href]').each((_, el) => {
    const rel = $(el).attr('rel') || '';
    // Only include stylesheets, icons, and preloads
    if (/stylesheet|icon|preload|prefetch/i.test(rel)) {
      addUrl($(el).attr('href'));
    }
  });

  // Images
  $('img[src]').each((_, el) => addUrl($(el).attr('src')));
  $('img[data-src]').each((_, el) => addUrl($(el).attr('data-src')));

  // Srcset images
  $('img[srcset], source[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset') || '';
    srcset.split(',').forEach(part => {
      const url = part.trim().split(/\s+/)[0];
      addUrl(url);
    });
  });

  // Video/Audio sources
  $('video[src], audio[src], source[src]').each((_, el) =>
    addUrl($(el).attr('src')),
  );
  $('video[poster]').each((_, el) => addUrl($(el).attr('poster')));

  // SVG references
  $('image[href], use[href], feImage[href]').each((_, el) =>
    addUrl($(el).attr('href')),
  );
  $('image[xlink\\:href], use[xlink\\:href], feImage[xlink\\:href]').each(
    (_, el) => addUrl($(el).attr('xlink:href')),
  );

  // Background images in style attributes
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.matchAll(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    for (const match of matches) {
      addUrl(match[1]);
    }
  });

  // Inline styles
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    const matches = css.matchAll(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    for (const match of matches) {
      addUrl(match[1]);
    }
  });

  // Favicons (commonly missed)
  $('link[rel*="icon"]').each((_, el) => addUrl($(el).attr('href')));

  return Array.from(resources);
}

/**
 * Find resources that are referenced in HTML but not in the captured resources
 */
export function findMissingResources(html, pageUrl, capturedResources) {
  const referenced = extractReferencedResources(html, pageUrl);
  const capturedUrls = new Set(capturedResources.keys());

  return referenced.filter(url => {
    // Check exact match
    if (capturedUrls.has(url)) return false;

    // Check without query string
    const urlWithoutQuery = url.split('?')[0];
    if (capturedUrls.has(urlWithoutQuery)) return false;

    // Check without trailing slash
    const normalized = url.replace(/\/$/, '');
    if (capturedUrls.has(normalized)) return false;

    return true;
  });
}

/**
 * Fetch a single resource
 */
export async function fetchResource(url, options = {}) {
  const {timeout = 30000} = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';

    return {
      url,
      status: response.status,
      contentType,
      size: buffer.length,
      body: buffer,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    // Ignore fetch errors (timeout, network, etc.)
    return null;
  }
}

/**
 * Fetch multiple missing resources in parallel
 */
export async function fetchMissingResources(urls, options = {}) {
  const {concurrency = 5, timeout = 30000, onProgress} = options;
  const results = new Map();

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const promises = batch.map(async url => {
      const resource = await fetchResource(url, {timeout});
      if (resource) {
        results.set(url, resource);
        onProgress?.(url, resource);
      }
    });

    await Promise.all(promises);
  }

  return results;
}
