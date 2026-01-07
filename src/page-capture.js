// @flow
import {extractLinks} from './link-extractor.js';
import {
  shouldExcludeUrl,
  getExcludeReason,
} from './filters/exclude-patterns.js';

/**
 * Capture a single page with all its rendered content
 * Uses best-in-class techniques including accessibility features,
 * reduced motion, and human-like scrolling behavior
 */
export class PageCapture {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.resources = new Map();
    this.excludedResources = new Map(); // Track what was excluded and why
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

    // Step 0: Enable reduced motion to disable CSS animations (accessibility feature)
    // This causes many sites to show final animation states immediately
    if (this.options.reducedMotion !== false) {
      await this.page.emulateMedia({reducedMotion: 'reduce'});
    }

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

    // Step 1: Force all scroll-triggered animations to their END state (100% progress)
    // This is different from killing them - we want their final visual state
    if (this.options.revealAll !== false) {
      await this._completeAllAnimations();
    }

    // Step 2: Human-like scrolling to trigger lazy content and intersection observers
    if (this.options.scroll !== false) {
      await this._humanLikeScroll();
    }

    // Step 3: Complete animations again after scroll (new elements may have appeared)
    if (this.options.revealAll !== false) {
      await this._completeAllAnimations();
    }

    // Step 4: Final wait for any remaining animations/network requests
    const scrollWait = this.options.scrollWait ?? 1000;
    if (scrollWait > 0) {
      await this.page.waitForTimeout(scrollWait);
    }

    // Step 5: Wait for network to be truly idle (no pending requests)
    await this._waitForNetworkIdle();

    // Step 6: Force reveal any remaining hidden elements
    await this._forceRevealHiddenElements();

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
      excludedResources: this.excludedResources,
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

      // Skip analytics, tracking, source maps, and other excluded patterns
      if (shouldExcludeUrl(url)) {
        const reason = getExcludeReason(url);
        this.excludedResources.set(url, reason);
        return;
      }

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
   * Wait for network to be truly idle (no pending requests for a period)
   */
  async _waitForNetworkIdle() {
    try {
      await this.page.waitForLoadState('networkidle', {timeout: 5000});
    } catch {
      // Timeout is ok, continue anyway
    }
  }

  /**
   * Human-like scrolling behavior with pauses and mouse movements
   * Triggers intersection observers and lazy loading more naturally
   */
  async _humanLikeScroll() {
    const scrollStep = this.options.scrollStep || 300;
    const scrollDelay = this.options.scrollDelay || 100;

    /* eslint-disable no-undef */
    await this.page.evaluate(
      async ({step, delay}) => {
        // Human-like smooth scroll with easing
        const smoothScrollTo = (targetY, duration = 500) => {
          return new Promise(resolve => {
            const startY = window.scrollY;
            const distance = targetY - startY;
            const startTime = performance.now();

            const easeInOutCubic = t =>
              t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const animate = () => {
              const elapsed = performance.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = easeInOutCubic(progress);

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

        // Wait helper
        const wait = ms => new Promise(r => setTimeout(r, ms));

        // Get viewport and page dimensions
        const viewportHeight = window.innerHeight;
        let pageHeight = document.body.scrollHeight;
        let currentY = 0;
        let lastHeight = pageHeight;

        // Phase 1: Scroll down slowly, pausing at each "section"
        while (currentY < pageHeight) {
          // Scroll one viewport at a time (like a human reading)
          const targetY = Math.min(currentY + step, pageHeight);
          await smoothScrollTo(targetY, delay * 3);

          // Pause longer at section boundaries (every viewport height)
          if (
            Math.floor(currentY / viewportHeight) !==
            Math.floor(targetY / viewportHeight)
          ) {
            await wait(delay * 2); // Pause to "read" the section
          } else {
            await wait(delay);
          }

          currentY = targetY;

          // Check for lazy-loaded content increasing page height
          const newHeight = document.body.scrollHeight;
          if (newHeight > lastHeight) {
            pageHeight = newHeight;
            lastHeight = newHeight;
          }
        }

        // Phase 2: Ensure we're at the very bottom
        await smoothScrollTo(document.body.scrollHeight, 300);
        await wait(500); // Wait at bottom

        // Check one more time for lazy content
        if (document.body.scrollHeight > pageHeight) {
          await smoothScrollTo(document.body.scrollHeight, 300);
          await wait(300);
        }

        // Phase 3: Scroll back to top (faster)
        await smoothScrollTo(0, 800);
        await wait(300);
      },
      {step: scrollStep, delay: scrollDelay},
    );
    /* eslint-enable no-undef */
  }

  /**
   * Complete all animations to their final state (100% progress)
   * Instead of killing animations, we progress them to completion
   */
  async _completeAllAnimations() {
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

      // 1. GSAP - Progress ALL tweens and timelines to 100%
      const gsap = safeGet(window, 'gsap');
      if (gsap) {
        try {
          // Get all global tweens and progress them to end
          const tweens =
            gsap.globalTimeline?.getChildren?.(true, true, true) || [];
          tweens.forEach(tween => {
            try {
              // Progress to 100% (end state)
              tween.progress?.(1, true);
              // Also try totalProgress for timelines
              tween.totalProgress?.(1, true);
            } catch (e) {
              /* ignore */
            }
          });
        } catch (e) {
          /* ignore */
        }
      }

      // 2. GSAP ScrollTrigger - Progress all triggers to their END state
      const ScrollTrigger =
        safeGet(window, 'ScrollTrigger') ||
        safeGet(window, 'gsap.ScrollTrigger');
      if (ScrollTrigger) {
        try {
          const triggers = ScrollTrigger.getAll?.() || [];
          triggers.forEach(trigger => {
            try {
              // Progress the trigger to 100% (fully scrolled past)
              if (trigger.animation) {
                trigger.animation.progress?.(1, true);
                trigger.animation.totalProgress?.(1, true);
              }
              // Also set the trigger's own progress
              trigger.progress?.(1, true);

              // Disable the trigger so it doesn't reset
              trigger.disable?.();
            } catch (e) {
              /* ignore */
            }
          });

          // Don't refresh - we want to keep the end states
        } catch (e) {
          /* ignore */
        }
      }

      // 3. Web Animations API - Complete all animations
      document.getAnimations?.().forEach(animation => {
        try {
          animation.finish();
        } catch (e) {
          try {
            animation.currentTime =
              animation.effect?.getTiming?.()?.duration || 0;
          } catch (e2) {
            /* ignore */
          }
        }
      });

      // 4. AOS - Mark all as animated
      document.querySelectorAll('[data-aos]').forEach(el => {
        el.classList.add('aos-animate');
        el.setAttribute('data-aos-animate', 'true');
      });

      // 5. WOW.js elements
      document.querySelectorAll('.wow').forEach(el => {
        el.classList.add('animated');
        el.style.visibility = 'visible';
      });

      // 6. ScrollReveal elements
      document.querySelectorAll('[data-sr-id]').forEach(el => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });

      // 7. Anime.js - Complete all animations
      const anime = safeGet(window, 'anime');
      if (anime?.running) {
        anime.running.forEach(anim => {
          try {
            anim.seek?.(anim.duration);
          } catch (e) {
            /* ignore */
          }
        });
      }

      // 8. Lottie animations - Go to last frame
      document.querySelectorAll('lottie-player, [data-lottie]').forEach(el => {
        try {
          el.goToAndStop?.(el.totalFrames - 1, true);
          el.pause?.();
        } catch (e) {
          /* ignore */
        }
      });
    });
    /* eslint-enable no-undef */
  }

  /**
   * Force reveal any remaining hidden elements
   * This is the final cleanup pass
   */
  async _forceRevealHiddenElements() {
    /* eslint-disable no-undef */
    await this.page.evaluate(() => {
      // 1. Force load all lazy images
      document.querySelectorAll('img').forEach(img => {
        // Load from data attributes
        const lazySrc =
          img.dataset.src || img.dataset.lazy || img.dataset.lazySrc;
        if (lazySrc && !img.src.includes(lazySrc)) {
          img.src = lazySrc;
        }
        // Remove lazy loading attribute
        img.removeAttribute('loading');
        // Trigger load if not loaded
        if (!img.complete) {
          img.loading = 'eager';
        }
      });

      // 2. Load lazy srcset
      document.querySelectorAll('source[data-srcset]').forEach(source => {
        if (source.dataset.srcset) {
          source.srcset = source.dataset.srcset;
        }
      });

      // 3. Load lazy background images
      document
        .querySelectorAll(
          '[data-bg], [data-background], [data-background-image]',
        )
        .forEach(el => {
          const bg =
            el.dataset.bg ||
            el.dataset.background ||
            el.dataset.backgroundImage;
          if (bg) {
            el.style.backgroundImage = `url("${bg}")`;
          }
        });

      // 4. Load lazy iframes
      document.querySelectorAll('iframe[data-src]').forEach(iframe => {
        if (iframe.dataset.src) {
          iframe.src = iframe.dataset.src;
        }
      });

      // 5. Fix elements with opacity: 0 (likely animation end states)
      document.querySelectorAll('*').forEach(el => {
        const computed = window.getComputedStyle(el);

        // Only fix visible containers that have hidden content
        if (computed.opacity === '0' && !el.getAttribute('aria-hidden')) {
          // Check if this is likely an animated element
          const hasAnimClass =
            el.className && /anim|fade|slide|reveal|show/i.test(el.className);
          const hasAnimAttr =
            el.hasAttribute('data-aos') ||
            el.hasAttribute('data-animate') ||
            el.hasAttribute('data-scroll');

          if (hasAnimClass || hasAnimAttr || el.style.opacity === '0') {
            el.style.setProperty('opacity', '1', 'important');
          }
        }

        // Fix visibility
        if (
          computed.visibility === 'hidden' &&
          !el.getAttribute('aria-hidden')
        ) {
          const hasAnimClass =
            el.className && /anim|fade|slide|reveal|show/i.test(el.className);
          if (hasAnimClass || el.style.visibility === 'hidden') {
            el.style.setProperty('visibility', 'visible', 'important');
          }
        }

        // Fix transforms that look like animation starting positions
        if (computed.transform && computed.transform !== 'none') {
          const transform = computed.transform;
          // Check for translateY/translateX that might be animation starting positions
          if (/translate[XY]\s*\(\s*[+-]?\d+/.test(transform)) {
            const hasAnimClass =
              el.className && /anim|fade|slide|reveal|show/i.test(el.className);
            if (hasAnimClass) {
              el.style.setProperty('transform', 'none', 'important');
            }
          }
        }
      });

      // 6. Force CSS animations to end state
      document.querySelectorAll('*').forEach(el => {
        const computed = window.getComputedStyle(el);
        if (computed.animationName && computed.animationName !== 'none') {
          el.style.setProperty('animation', 'none', 'important');
        }
        if (
          computed.transition &&
          computed.transition !== 'none' &&
          computed.transition !== 'all 0s ease 0s'
        ) {
          el.style.setProperty('transition', 'none', 'important');
        }
      });
    });
    /* eslint-enable no-undef */
  }
}
