// @flow
import robotsParser from 'robots-parser';

/**
 * robots.txt handler
 */
export class RobotsHandler {
  constructor(options = {}) {
    this.enabled = !options.ignoreRobots;
    this.userAgent = options.userAgent || 'Smippo/0.0.1';
    this.cache = new Map();
  }

  /**
   * Check if a URL is allowed by robots.txt
   */
  async isAllowed(url, fetchFn) {
    if (!this.enabled) return true;

    try {
      const robots = await this.getRobots(url, fetchFn);
      if (!robots) return true;

      return robots.isAllowed(url, this.userAgent);
    } catch {
      // If we can't fetch/parse robots.txt, allow access
      return true;
    }
  }

  /**
   * Get robots.txt parser for a URL
   */
  async getRobots(url, fetchFn) {
    try {
      const parsed = new URL(url);
      const robotsUrl = `${parsed.origin}/robots.txt`;

      // Check cache
      if (this.cache.has(robotsUrl)) {
        return this.cache.get(robotsUrl);
      }

      // Fetch robots.txt
      const robotsContent = await fetchFn(robotsUrl);

      if (!robotsContent) {
        this.cache.set(robotsUrl, null);
        return null;
      }

      // Parse robots.txt
      const robots = robotsParser(robotsUrl, robotsContent);
      this.cache.set(robotsUrl, robots);

      return robots;
    } catch {
      return null;
    }
  }

  /**
   * Get crawl delay for a domain
   */
  getCrawlDelay(url) {
    if (!this.enabled) return 0;

    try {
      const parsed = new URL(url);
      const robotsUrl = `${parsed.origin}/robots.txt`;
      const robots = this.cache.get(robotsUrl);

      if (!robots) return 0;

      return robots.getCrawlDelay(this.userAgent) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get sitemap URLs from robots.txt
   */
  getSitemaps(url) {
    try {
      const parsed = new URL(url);
      const robotsUrl = `${parsed.origin}/robots.txt`;
      const robots = this.cache.get(robotsUrl);

      if (!robots) return [];

      return robots.getSitemaps() || [];
    } catch {
      return [];
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}
