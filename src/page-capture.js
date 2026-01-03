// @flow
import {extractLinks} from './link-extractor.js';
import {rewriteLinks} from './link-rewriter.js';

/**
 * Capture a single page with all its rendered content
 */
export class PageCapture {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.resources = new Map();
  }

  /**
   * Capture the page content and resources
   */
  async capture(url) {
    const startTime = Date.now();

    // Set up resource collection
    this.page.on('response', async response => {
      await this._collectResource(response);
    });

    // Navigate to the page
    try {
      await this.page.goto(url, {
        waitUntil: this.options.wait || 'networkidle',
        timeout: this.options.timeout || 30000,
      });
    } catch (error) {
      // Handle navigation errors but continue if we got some content
      if (!this.page.url().startsWith('http')) {
        throw error;
      }
    }

    // Additional wait time if specified
    if (this.options.waitTime > 0) {
      await this.page.waitForTimeout(this.options.waitTime);
    }

    // Get the rendered HTML
    const html = await this.page.content();

    // Get page metadata
    const title = await this.page.title();
    const finalUrl = this.page.url();

    // Extract links from the rendered page
    const links = await extractLinks(this.page, finalUrl, this.options);

    // Take screenshot if requested
    let screenshot = null;
    if (this.options.screenshot) {
      screenshot = await this.page.screenshot({
        fullPage: true,
        type: 'png',
      });
    }

    // Generate PDF if requested
    let pdf = null;
    if (this.options.pdf) {
      pdf = await this.page.pdf({
        format: 'A4',
        printBackground: true,
      });
    }

    return {
      url: finalUrl,
      requestedUrl: url,
      html,
      title,
      links,
      resources: this.resources,
      screenshot,
      pdf,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Collect a resource from a network response
   */
  async _collectResource(response) {
    try {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';

      // Skip failed requests
      if (status < 200 || status >= 400) return;

      // Skip the main HTML page (captured separately)
      if (contentType.includes('text/html')) return;

      // Skip data URLs
      if (url.startsWith('data:')) return;

      // Apply MIME type filters
      if (this.options.mimeExclude?.length) {
        if (this._matchesMimeFilter(contentType, this.options.mimeExclude)) {
          return;
        }
      }

      if (this.options.mimeInclude?.length) {
        if (!this._matchesMimeFilter(contentType, this.options.mimeInclude)) {
          return;
        }
      }

      // Get the response body
      const body = await response.body().catch(() => null);
      if (!body) return;

      // Apply size filters
      if (this.options.maxSize && body.length > this.options.maxSize) return;
      if (this.options.minSize && body.length < this.options.minSize) return;

      this.resources.set(url, {
        url,
        status,
        contentType,
        size: body.length,
        body,
        headers,
      });
    } catch (error) {
      // Ignore resource collection errors
    }
  }

  /**
   * Check if a content type matches a filter pattern
   */
  _matchesMimeFilter(contentType, filters) {
    const type = contentType.split(';')[0].trim().toLowerCase();

    return filters.some(filter => {
      filter = filter.toLowerCase();
      if (filter.endsWith('/*')) {
        return type.startsWith(filter.slice(0, -1));
      }
      return type === filter || type.startsWith(filter + ';');
    });
  }
}
