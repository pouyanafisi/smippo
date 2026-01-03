/**
 * URL utilities for Smippo
 */

/**
 * Normalize a URL for comparison and storage
 */
export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove trailing slash for non-root paths
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    // Remove default ports
    if ((parsed.protocol === 'http:' && parsed.port === '80') ||
        (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }
    // Sort query params for consistency
    parsed.searchParams.sort();
    return parsed.href;
  } catch {
    return url;
  }
}

/**
 * Get the base URL (origin + pathname without file)
 */
export function getBaseUrl(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    // Remove filename if present
    if (pathParts[pathParts.length - 1].includes('.')) {
      pathParts.pop();
    }
    parsed.pathname = pathParts.join('/');
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return url;
  }
}

/**
 * Resolve a relative URL against a base URL
 */
export function resolveUrl(relative, base) {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/**
 * Check if two URLs are on the same origin
 */
export function isSameOrigin(url1, url2) {
  try {
    const parsed1 = new URL(url1);
    const parsed2 = new URL(url2);
    return parsed1.origin === parsed2.origin;
  } catch {
    return false;
  }
}

/**
 * Check if URL is on the same domain (ignores subdomain)
 */
export function isSameDomain(url1, url2) {
  try {
    const parsed1 = new URL(url1);
    const parsed2 = new URL(url2);
    return getRootDomain(parsed1.hostname) === getRootDomain(parsed2.hostname);
  } catch {
    return false;
  }
}

/**
 * Check if URL is on the same TLD
 */
export function isSameTld(url1, url2) {
  try {
    const parsed1 = new URL(url1);
    const parsed2 = new URL(url2);
    return getTld(parsed1.hostname) === getTld(parsed2.hostname);
  } catch {
    return false;
  }
}

/**
 * Check if URL is within the same directory tree
 */
export function isInDirectory(url, baseUrl) {
  try {
    const parsed = new URL(url);
    const baseParsed = new URL(baseUrl);
    
    if (parsed.origin !== baseParsed.origin) return false;
    
    const basePath = baseParsed.pathname.endsWith('/') 
      ? baseParsed.pathname 
      : baseParsed.pathname.replace(/\/[^/]*$/, '/');
    
    return parsed.pathname.startsWith(basePath);
  } catch {
    return false;
  }
}

/**
 * Extract root domain from hostname (e.g., "www.example.com" -> "example.com")
 */
export function getRootDomain(hostname) {
  const parts = hostname.split('.');
  // Handle special cases like co.uk, com.au
  const specialTlds = ['co.uk', 'com.au', 'co.nz', 'org.uk'];
  const lastTwo = parts.slice(-2).join('.');
  
  if (specialTlds.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  
  return parts.slice(-2).join('.');
}

/**
 * Get TLD from hostname
 */
export function getTld(hostname) {
  const parts = hostname.split('.');
  return parts[parts.length - 1];
}

/**
 * Check if URL should be followed based on scope
 */
export function isInScope(url, baseUrl, scope, stayInDir = false) {
  if (stayInDir && !isInDirectory(url, baseUrl)) {
    return false;
  }
  
  switch (scope) {
    case 'subdomain':
      return isSameOrigin(url, baseUrl);
    case 'domain':
      return isSameDomain(url, baseUrl);
    case 'tld':
      return isSameTld(url, baseUrl);
    case 'all':
      return true;
    default:
      return isSameDomain(url, baseUrl);
  }
}

/**
 * Convert URL to a local file path
 */
export function urlToPath(url, structure = 'original') {
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname;
    
    // Handle root path
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }
    
    // Add index.html for directory paths
    if (pathname.endsWith('/')) {
      pathname += 'index.html';
    }
    
    // Add .html extension if no extension and not a known file type
    const hasExtension = /\.[a-z0-9]+$/i.test(pathname);
    if (!hasExtension) {
      pathname += '.html';
    }
    
    // Handle query strings
    if (parsed.search) {
      const hash = simpleHash(parsed.search);
      const ext = pathname.match(/\.[^.]+$/)?.[0] || '';
      const base = pathname.slice(0, -ext.length || undefined);
      pathname = `${base}-${hash}${ext}`;
    }
    
    switch (structure) {
      case 'flat':
        // Flatten to single directory with hashed names
        const flatName = pathname.replace(/\//g, '-').replace(/^-/, '');
        return flatName;
        
      case 'domain':
        // Include full hostname
        return `${parsed.hostname}${pathname}`;
        
      case 'original':
      default:
        // Include hostname without www
        const host = parsed.hostname.replace(/^www\./, '');
        return `${host}${pathname}`;
    }
  } catch {
    return 'unknown/index.html';
  }
}

/**
 * Simple hash function for query strings
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

/**
 * Check if URL is likely a page (vs asset)
 */
export function isLikelyPage(url) {
  const assetExtensions = [
    '.css', '.js', '.json', '.xml',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp3', '.mp4', '.webm', '.ogg', '.wav',
    '.pdf', '.zip', '.tar', '.gz',
    '.map'
  ];
  
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return !assetExtensions.some(ext => pathname.endsWith(ext));
  } catch {
    return true;
  }
}

/**
 * Check if URL is an asset
 */
export function isAsset(url) {
  return !isLikelyPage(url);
}

/**
 * Get file extension from URL
 */
export function getExtension(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

