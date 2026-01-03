import { minimatch } from 'minimatch';
import { isInScope } from './utils/url.js';

/**
 * URL and resource filter
 */
export class Filter {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl;
    this.scope = options.scope || 'domain';
    this.stayInDir = options.stayInDir || false;
    this.externalAssets = options.externalAssets || false;
    this.include = options.include || [];
    this.exclude = options.exclude || [];
    this.mimeInclude = options.mimeInclude || [];
    this.mimeExclude = options.mimeExclude || [];
    this.maxSize = options.maxSize;
    this.minSize = options.minSize;
  }

  /**
   * Check if a URL should be followed (for crawling)
   */
  shouldFollow(url) {
    // Check scope
    if (!isInScope(url, this.baseUrl, this.scope, this.stayInDir)) {
      return false;
    }

    // Check exclude patterns first (higher priority)
    if (this.exclude.length > 0) {
      if (this.matchesPattern(url, this.exclude)) {
        return false;
      }
    }

    // Check include patterns
    if (this.include.length > 0) {
      if (!this.matchesPattern(url, this.include)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if an asset URL should be downloaded
   */
  shouldDownloadAsset(url) {
    // For assets, we're more permissive if externalAssets is true
    if (this.externalAssets) {
      // Still check exclude patterns
      if (this.exclude.length > 0 && this.matchesPattern(url, this.exclude)) {
        return false;
      }
      return true;
    }

    // Otherwise, apply same rules as shouldFollow
    return this.shouldFollow(url);
  }

  /**
   * Check if a resource should be saved based on MIME type
   */
  shouldSaveByMime(contentType) {
    if (!contentType) return true;
    
    const mimeType = contentType.split(';')[0].trim().toLowerCase();

    // Check exclude patterns
    if (this.mimeExclude.length > 0) {
      if (this.matchesMime(mimeType, this.mimeExclude)) {
        return false;
      }
    }

    // Check include patterns
    if (this.mimeInclude.length > 0) {
      if (!this.matchesMime(mimeType, this.mimeInclude)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a resource should be saved based on size
   */
  shouldSaveBySize(size) {
    if (this.maxSize !== undefined && size > this.maxSize) {
      return false;
    }
    if (this.minSize !== undefined && size < this.minSize) {
      return false;
    }
    return true;
  }

  /**
   * Full check for a resource
   */
  shouldSave(url, contentType, size) {
    if (!this.shouldDownloadAsset(url)) return false;
    if (!this.shouldSaveByMime(contentType)) return false;
    if (!this.shouldSaveBySize(size)) return false;
    return true;
  }

  /**
   * Check if URL matches any of the patterns
   */
  matchesPattern(url, patterns) {
    return patterns.some(pattern => {
      // Convert HTTrack-style patterns to glob patterns
      const globPattern = this.toGlobPattern(pattern);
      return minimatch(url, globPattern, { nocase: true });
    });
  }

  /**
   * Check if MIME type matches any of the patterns
   */
  matchesMime(mimeType, patterns) {
    return patterns.some(pattern => {
      pattern = pattern.toLowerCase();
      if (pattern.endsWith('/*')) {
        return mimeType.startsWith(pattern.slice(0, -1));
      }
      return mimeType === pattern;
    });
  }

  /**
   * Convert HTTrack-style filter to glob pattern
   */
  toGlobPattern(pattern) {
    // If already a glob pattern (contains *), use as is
    if (pattern.includes('*')) {
      return pattern;
    }
    
    // Otherwise, treat as a prefix match
    return pattern + '*';
  }
}

/**
 * Create a filter from options
 */
export function createFilter(options) {
  return new Filter(options);
}

