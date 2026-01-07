// @flow
import {extractLinks} from './link-extractor.js';

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

    // Additional wait time if specified (default 500ms for animations to start)
    const waitTime = this.options.waitTime ?? 500;
    if (waitTime > 0) {
      await this.page.waitForTimeout(waitTime);
    }

    // Step 1: Force reveal all scroll-triggered content
    if (this.options.revealAll !== false) {
      await this._revealAllContent();
    }

    // Step 2: Pre-scroll the page to trigger scroll animations
    if (this.options.scroll !== false) {
      await this._scrollPage();
    }

    // Step 3: Additional wait after scroll for animations to complete
    const scrollWait = this.options.scrollWait ?? 1000;
    if (scrollWait > 0 && this.options.scroll !== false) {
      await this.page.waitForTimeout(scrollWait);
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

  /**
   * Pre-scroll the page to trigger scroll-based animations and lazy loading
   * Performs smooth, incremental scrolling to trigger all scroll-based content
   */
  async _scrollPage() {
    const scrollBehavior = this.options.scrollBehavior || 'smooth';
    const scrollStep = this.options.scrollStep || 200; // pixels per step
    const scrollDelay = this.options.scrollDelay || 50; // ms between steps

    /* eslint-disable no-undef */
    await this.page.evaluate(
      async ({step, delay, behavior}) => {
        // Helper for smooth scrolling with requestAnimationFrame
        const smoothScroll = (targetY, duration = 300) => {
          return new Promise(resolve => {
            const startY = window.scrollY;
            const distance = targetY - startY;
            const startTime = performance.now();

            const animate = currentTime => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // Easing function (ease-out-cubic)
              const eased = 1 - Math.pow(1 - progress, 3);

              window.scrollTo(0, startY + distance * eased);

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                resolve();
              }
            };

            requestAnimationFrame(animate);
          });
        };

        // Get initial page height
        let lastHeight = document.body.scrollHeight;
        let currentY = 0;

        // Phase 1: Scroll down incrementally
        while (currentY < document.body.scrollHeight) {
          const targetY = Math.min(currentY + step, document.body.scrollHeight);

          if (behavior === 'smooth') {
            await smoothScroll(targetY, delay * 2);
          } else {
            window.scrollTo(0, targetY);
          }

          currentY = targetY;
          await new Promise(r => setTimeout(r, delay));

          // Check if page height increased (lazy content loaded)
          const newHeight = document.body.scrollHeight;
          if (newHeight > lastHeight) {
            lastHeight = newHeight;
          }
        }

        // Phase 2: Wait at bottom for any pending lazy loads
        await new Promise(r => setTimeout(r, 500));

        // Check if more content loaded while waiting
        if (document.body.scrollHeight > lastHeight) {
          // Scroll to the new bottom
          if (behavior === 'smooth') {
            await smoothScroll(document.body.scrollHeight, 300);
          } else {
            window.scrollTo(0, document.body.scrollHeight);
          }
          await new Promise(r => setTimeout(r, 300));
        }

        // Phase 3: Scroll back up slowly (some sites have scroll-up animations)
        const scrollUpStep = step * 2; // Faster on the way up
        currentY = window.scrollY;

        while (currentY > 0) {
          const targetY = Math.max(currentY - scrollUpStep, 0);

          if (behavior === 'smooth') {
            await smoothScroll(targetY, delay);
          } else {
            window.scrollTo(0, targetY);
          }

          currentY = targetY;
          await new Promise(r => setTimeout(r, delay / 2));
        }

        // Phase 4: Return to top and wait
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 200));
      },
      {step: scrollStep, delay: scrollDelay, behavior: scrollBehavior},
    );
    /* eslint-enable no-undef */
  }

  /**
   * Force reveal all scroll-triggered content by disabling/triggering
   * common animation libraries like GSAP ScrollTrigger, AOS, etc.
   */
  async _revealAllContent() {
    /* eslint-disable no-undef */
    await this.page.evaluate(() => {
      // Helper to safely access nested properties
      const safeGet = (obj, path) => {
        try {
          return path.split('.').reduce((o, k) => o?.[k], obj);
        } catch {
          return undefined;
        }
      };

      // 1. GSAP ScrollTrigger - kill all triggers and show content
      const ScrollTrigger = safeGet(window, 'ScrollTrigger');
      if (ScrollTrigger) {
        try {
          // Get all ScrollTrigger instances
          const triggers = ScrollTrigger.getAll?.() || [];
          triggers.forEach(trigger => {
            try {
              // Kill the trigger to prevent it from hiding content
              trigger.kill?.();
            } catch (e) {
              /* ignore */
            }
          });
          // Refresh to ensure proper state
          ScrollTrigger.refresh?.();
        } catch (e) {
          /* ignore */
        }
      }

      // Also check for gsap.ScrollTrigger
      const gsapScrollTrigger = safeGet(window, 'gsap.ScrollTrigger');
      if (gsapScrollTrigger && gsapScrollTrigger !== ScrollTrigger) {
        try {
          const triggers = gsapScrollTrigger.getAll?.() || [];
          triggers.forEach(trigger => trigger.kill?.());
        } catch (e) {
          /* ignore */
        }
      }

      // 2. AOS (Animate On Scroll) - reveal all elements
      const AOS = safeGet(window, 'AOS');
      if (AOS) {
        try {
          // Disable AOS and show all elements
          document.querySelectorAll('[data-aos]').forEach(el => {
            el.classList.add('aos-animate');
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.visibility = 'visible';
          });
        } catch (e) {
          /* ignore */
        }
      }

      // 3. WOW.js - reveal all elements
      document.querySelectorAll('.wow').forEach(el => {
        el.classList.add('animated');
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.style.animationName = 'none';
      });

      // 4. ScrollReveal - reveal all elements
      const ScrollReveal = safeGet(window, 'ScrollReveal');
      if (ScrollReveal) {
        try {
          document.querySelectorAll('[data-sr-id]').forEach(el => {
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.style.transform = 'none';
          });
        } catch (e) {
          /* ignore */
        }
      }

      // 5. Intersection Observer based lazy loading - trigger all observers
      // This is tricky since we can't access observers directly,
      // but we can trigger the elements they're watching

      // 6. Generic fixes for common hidden patterns
      // Elements with opacity: 0 that are meant to fade in
      document
        .querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]')
        .forEach(el => {
          // Only reveal if it seems intentionally hidden for animation
          const computedStyle = window.getComputedStyle(el);
          if (
            computedStyle.opacity === '0' &&
            !el.hasAttribute('aria-hidden')
          ) {
            el.style.opacity = '1';
          }
        });

      // Elements with visibility: hidden that may animate in
      document
        .querySelectorAll(
          '[style*="visibility: hidden"], [style*="visibility:hidden"]',
        )
        .forEach(el => {
          el.style.visibility = 'visible';
        });

      // Elements with transform: translateY that slide in
      document.querySelectorAll('[style*="translateY"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        // Only fix if it looks like a scroll animation starting position
        if (
          style.includes('translateY(') &&
          (style.includes('opacity') || el.classList.length > 0)
        ) {
          el.style.transform = 'none';
        }
      });

      // 7. Lazy-loaded images - force load
      document
        .querySelectorAll('img[data-src], img[data-lazy], img[loading="lazy"]')
        .forEach(img => {
          const src =
            img.getAttribute('data-src') || img.getAttribute('data-lazy');
          if (src && !img.src) {
            img.src = src;
          }
          // Remove lazy loading to ensure images load
          img.removeAttribute('loading');
        });

      // 8. Lazy-loaded iframes
      document.querySelectorAll('iframe[data-src]').forEach(iframe => {
        const src = iframe.getAttribute('data-src');
        if (src && !iframe.src) {
          iframe.src = src;
        }
      });

      // 9. Picture elements with lazy loading
      document
        .querySelectorAll('picture source[data-srcset]')
        .forEach(source => {
          const srcset = source.getAttribute('data-srcset');
          if (srcset) {
            source.srcset = srcset;
          }
        });

      // 10. Background images in data attributes
      document.querySelectorAll('[data-bg], [data-background]').forEach(el => {
        const bg =
          el.getAttribute('data-bg') || el.getAttribute('data-background');
        if (bg && !el.style.backgroundImage) {
          el.style.backgroundImage = `url(${bg})`;
        }
      });

      // 11. Lottie animations - try to advance to final state
      const lottieElements = document.querySelectorAll(
        'lottie-player, [data-lottie]',
      );
      lottieElements.forEach(el => {
        try {
          if (el.goToAndStop) {
            el.goToAndStop(el.totalFrames - 1, true);
          }
        } catch (e) {
          /* ignore */
        }
      });

      // 12. Force all CSS animations to complete
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.animationName && style.animationName !== 'none') {
          // Set animation to end state
          el.style.animationPlayState = 'paused';
          el.style.animationDelay = '0s';
          el.style.animationDuration = '0.001s';
        }
      });
    });
    /* eslint-enable no-undef */
  }
}
