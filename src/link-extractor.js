import { load } from 'cheerio';
import { resolveUrl, isLikelyPage } from './utils/url.js';

/**
 * Extract all links from a page
 */
export async function extractLinks(page, baseUrl, options = {}) {
  const html = await page.content();
  const $ = load(html);
  
  const links = new Set();
  const assets = new Set();

  // Extract href links
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const resolved = resolveAndClean(href, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      links.add(resolved);
    }
  });

  // Extract CSS links
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    const resolved = resolveAndClean(href, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      assets.add(resolved);
    }
  });

  // Extract script sources
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    const resolved = resolveAndClean(src, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      assets.add(resolved);
    }
  });

  // Extract images
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    const resolved = resolveAndClean(src, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      assets.add(resolved);
    }
  });

  // Extract srcset images
  $('img[srcset], source[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      parseSrcset(srcset).forEach(src => {
        const resolved = resolveAndClean(src, baseUrl);
        if (resolved && isHttpUrl(resolved)) {
          assets.add(resolved);
        }
      });
    }
  });

  // Extract video/audio sources
  $('video[src], audio[src], source[src]').each((_, el) => {
    const src = $(el).attr('src');
    const resolved = resolveAndClean(src, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      assets.add(resolved);
    }
  });

  // Extract video posters
  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster');
    const resolved = resolveAndClean(poster, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      assets.add(resolved);
    }
  });

  // Extract iframe sources
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    const resolved = resolveAndClean(src, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      links.add(resolved);
    }
  });

  // Extract object data
  $('object[data]').each((_, el) => {
    const data = $(el).attr('data');
    const resolved = resolveAndClean(data, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      assets.add(resolved);
    }
  });

  // Extract background images from style attributes
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    extractCssUrls(style, baseUrl).forEach(url => assets.add(url));
  });

  // Extract URLs from inline style tags
  $('style').each((_, el) => {
    const css = $(el).html();
    extractCssUrls(css, baseUrl).forEach(url => assets.add(url));
  });

  // Extract meta refresh URLs
  $('meta[http-equiv="refresh"]').each((_, el) => {
    const content = $(el).attr('content');
    const match = content?.match(/url=(.+)/i);
    if (match) {
      const resolved = resolveAndClean(match[1].trim(), baseUrl);
      if (resolved && isHttpUrl(resolved)) {
        links.add(resolved);
      }
    }
  });

  // Extract canonical URL
  $('link[rel="canonical"]').each((_, el) => {
    const href = $(el).attr('href');
    const resolved = resolveAndClean(href, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      links.add(resolved);
    }
  });

  // Separate page links from asset links
  const pageLinks = [...links].filter(url => isLikelyPage(url));
  const assetLinks = [...assets, ...links.values()].filter(url => !isLikelyPage(url));

  return {
    pages: [...new Set(pageLinks)],
    assets: [...new Set(assetLinks)],
    all: [...new Set([...links, ...assets])]
  };
}

/**
 * Extract URLs from CSS content
 */
export function extractCssUrls(css, baseUrl) {
  if (!css) return [];
  
  const urls = [];
  const urlRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  const importRegex = /@import\s+['"]([^'"]+)['"]/gi;
  
  let match;
  while ((match = urlRegex.exec(css)) !== null) {
    const resolved = resolveAndClean(match[1], baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      urls.push(resolved);
    }
  }
  
  while ((match = importRegex.exec(css)) !== null) {
    const resolved = resolveAndClean(match[1], baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      urls.push(resolved);
    }
  }
  
  return urls;
}

/**
 * Parse srcset attribute
 */
function parseSrcset(srcset) {
  return srcset
    .split(',')
    .map(part => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/**
 * Resolve and clean a URL
 */
function resolveAndClean(url, baseUrl) {
  if (!url) return null;
  
  // Skip special URLs
  url = url.trim();
  if (url.startsWith('javascript:')) return null;
  if (url.startsWith('mailto:')) return null;
  if (url.startsWith('tel:')) return null;
  if (url.startsWith('data:')) return null;
  if (url.startsWith('#')) return null;
  
  try {
    const resolved = resolveUrl(url, baseUrl);
    // Remove hash fragment
    return resolved.split('#')[0];
  } catch {
    return null;
  }
}

/**
 * Check if URL is HTTP/HTTPS
 */
function isHttpUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

