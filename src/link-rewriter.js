// @flow
import {load} from 'cheerio';
import {getRelativePath} from './utils/path.js';
import {urlToPath, resolveUrl} from './utils/url.js';

/**
 * Rewrite links in HTML to point to local files
 */
export function rewriteLinks(html, pageUrl, urlMap, _options = {}) {
  const $ = load(html, {decodeEntities: false});
  const pagePath = urlToPath(pageUrl, _options.structure);

  // Strip all scripts if --no-js flag is set
  if (_options.noJs) {
    // Remove script tags
    $('script').remove();
    // Remove event handlers
    $(
      '[onclick], [onload], [onerror], [onmouseover], [onmouseout], [onkeydown], [onkeyup], [onsubmit], [onchange], [onfocus], [onblur]',
    ).each((_, el) => {
      $(el)
        .removeAttr('onclick')
        .removeAttr('onload')
        .removeAttr('onerror')
        .removeAttr('onmouseover')
        .removeAttr('onmouseout')
        .removeAttr('onkeydown')
        .removeAttr('onkeyup')
        .removeAttr('onsubmit')
        .removeAttr('onchange')
        .removeAttr('onfocus')
        .removeAttr('onblur');
    });
    // Remove module preloads
    $('link[rel="modulepreload"]').remove();
  }

  // Helper to get relative path for a URL
  const getLocalPath = url => {
    if (!url) return null;

    // Resolve relative URLs (including absolute paths starting with /)
    const absoluteUrl = resolveUrl(url, pageUrl);

    // Check if we have this URL in our map
    if (urlMap.has(absoluteUrl)) {
      const targetPath = urlMap.get(absoluteUrl);
      return getRelativePath(pagePath, targetPath);
    }

    // Check without trailing slash
    const normalizedUrl = absoluteUrl.replace(/\/$/, '');
    if (urlMap.has(normalizedUrl)) {
      const targetPath = urlMap.get(normalizedUrl);
      return getRelativePath(pagePath, targetPath);
    }

    // Check with index.html appended
    if (absoluteUrl.endsWith('/')) {
      const indexUrl = absoluteUrl + 'index.html';
      if (urlMap.has(indexUrl)) {
        const targetPath = urlMap.get(indexUrl);
        return getRelativePath(pagePath, targetPath);
      }
    }

    // Check without query string
    const urlWithoutQuery = absoluteUrl.split('?')[0];
    if (urlWithoutQuery !== absoluteUrl && urlMap.has(urlWithoutQuery)) {
      const targetPath = urlMap.get(urlWithoutQuery);
      return getRelativePath(pagePath, targetPath);
    }

    return null;
  };

  // Rewrite <a href>
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (shouldSkipUrl(href)) return;

    const localPath = getLocalPath(href);
    if (localPath) {
      $(el).attr('href', localPath);
    }
  });

  // Rewrite <link href>
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (shouldSkipUrl(href)) return;

    const localPath = getLocalPath(href);
    if (localPath) {
      $(el).attr('href', localPath);
    }
  });

  // Rewrite <script src>
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (shouldSkipUrl(src)) return;

    const localPath = getLocalPath(src);
    if (localPath) {
      $(el).attr('src', localPath);
    }
  });

  // Rewrite <img src>
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (shouldSkipUrl(src)) return;

    const localPath = getLocalPath(src);
    if (localPath) {
      $(el).attr('src', localPath);
    }
  });

  // Rewrite <img srcset>
  $('img[srcset], source[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (!srcset) return;

    const newSrcset = rewriteSrcset(srcset, pageUrl, urlMap, _options);
    $(el).attr('srcset', newSrcset);
  });

  // Rewrite <video src>, <audio src>, <source src>
  $('video[src], audio[src], source[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (shouldSkipUrl(src)) return;

    const localPath = getLocalPath(src);
    if (localPath) {
      $(el).attr('src', localPath);
    }
  });

  // Rewrite <video poster>
  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster');
    if (shouldSkipUrl(poster)) return;

    const localPath = getLocalPath(poster);
    if (localPath) {
      $(el).attr('poster', localPath);
    }
  });

  // Rewrite <iframe src>
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (shouldSkipUrl(src)) return;

    const localPath = getLocalPath(src);
    if (localPath) {
      $(el).attr('src', localPath);
    }
  });

  // Rewrite <object data>
  $('object[data]').each((_, el) => {
    const data = $(el).attr('data');
    if (shouldSkipUrl(data)) return;

    const localPath = getLocalPath(data);
    if (localPath) {
      $(el).attr('data', localPath);
    }
  });

  // Rewrite SVG <image>, <use>, <feImage> xlink:href and href attributes
  $('image[xlink\\:href], use[xlink\\:href], feImage[xlink\\:href]').each(
    (_, el) => {
      const href = $(el).attr('xlink:href');
      if (shouldSkipUrl(href)) return;

      const localPath = getLocalPath(href);
      if (localPath) {
        $(el).attr('xlink:href', localPath);
      }
    },
  );

  // SVG 2 uses href without namespace
  $('image[href], use[href], feImage[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (shouldSkipUrl(href)) return;

    const localPath = getLocalPath(href);
    if (localPath) {
      $(el).attr('href', localPath);
    }
  });

  // Rewrite style attributes
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    const newStyle = rewriteCssUrls(style, pageUrl, urlMap, pagePath, _options);
    $(el).attr('style', newStyle);
  });

  // Rewrite inline <style> tags
  $('style').each((_, el) => {
    const css = $(el).html();
    const newCss = rewriteCssUrls(css, pageUrl, urlMap, pagePath, _options);
    $(el).html(newCss);
  });

  return $.html();
}

/**
 * Rewrite URLs in CSS content
 */
export function rewriteCssUrls(css, baseUrl, urlMap, pagePath, _options = {}) {
  if (!css) return css;

  // Helper to find local path for a URL
  const findLocalPath = url => {
    const absoluteUrl = resolveUrl(url, baseUrl);

    // Direct match
    if (urlMap.has(absoluteUrl)) {
      return urlMap.get(absoluteUrl);
    }

    // Try without query string
    const urlWithoutQuery = absoluteUrl.split('?')[0];
    if (urlWithoutQuery !== absoluteUrl && urlMap.has(urlWithoutQuery)) {
      return urlMap.get(urlWithoutQuery);
    }

    // Try without trailing slash
    const normalizedUrl = absoluteUrl.replace(/\/$/, '');
    if (urlMap.has(normalizedUrl)) {
      return urlMap.get(normalizedUrl);
    }

    return null;
  };

  // Rewrite url() references
  css = css.replace(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi, (match, url) => {
    if (shouldSkipUrl(url)) return match;

    const targetPath = findLocalPath(url);
    if (targetPath) {
      const relativePath = getRelativePath(pagePath, targetPath);
      return `url("${relativePath}")`;
    }

    return match;
  });

  // Rewrite @import references
  css = css.replace(/@import\s+['"]([^'"]+)['"]/gi, (match, url) => {
    if (shouldSkipUrl(url)) return match;

    const targetPath = findLocalPath(url);
    if (targetPath) {
      const relativePath = getRelativePath(pagePath, targetPath);
      return `@import "${relativePath}"`;
    }

    return match;
  });

  return css;
}

/**
 * Rewrite srcset attribute
 */
function rewriteSrcset(srcset, pageUrl, urlMap, options) {
  const pagePath = urlToPath(pageUrl, options.structure);

  return srcset
    .split(',')
    .map(part => {
      const [url, descriptor] = part.trim().split(/\s+/);
      if (shouldSkipUrl(url)) return part;

      const absoluteUrl = resolveUrl(url, pageUrl);
      if (urlMap.has(absoluteUrl)) {
        const targetPath = urlMap.get(absoluteUrl);
        const relativePath = getRelativePath(pagePath, targetPath);
        return descriptor ? `${relativePath} ${descriptor}` : relativePath;
      }

      return part;
    })
    .join(', ');
}

/**
 * Check if URL should be skipped
 */
function shouldSkipUrl(url) {
  if (!url) return true;

  const skipPrefixes = [
    'javascript:',
    'mailto:',
    'tel:',
    'data:',
    '#',
    'blob:',
    'about:',
  ];

  return skipPrefixes.some(prefix =>
    url.trim().toLowerCase().startsWith(prefix),
  );
}
