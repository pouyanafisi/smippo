// @flow
import {chromium} from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Capture a screenshot of a URL
 * Based on Playwright Screenshots API: https://playwright.dev/docs/screenshots
 */
export async function captureScreenshot(url, options = {}) {
  const {
    output,
    fullPage = false,
    format = 'png',
    quality,
    viewport = {width: 1920, height: 1080},
    device,
    selector,
    wait = 'networkidle',
    waitTime = 0,
    timeout = 30000,
    userAgent,
    darkMode = false,
    scale = 'device',
    omitBackground = false,
    verbose = false,
    quiet = false,
  } = options;

  // Normalize URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Determine output path
  let outputPath = output;
  if (!outputPath) {
    const urlObj = new URL(url);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    outputPath = `${urlObj.hostname}-${timestamp}.${ext}`;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (outputDir && outputDir !== '.') {
    await fs.ensureDir(outputDir);
  }

  if (!quiet) {
    console.log('');
    console.log(chalk.cyan('  📸 Smippo Screenshot'));
    console.log(chalk.dim(`  URL: ${url}`));
    console.log('');
  }

  const browser = await chromium.launch();

  try {
    // Set up context options
    const contextOptions = {
      viewport,
      userAgent: userAgent || 'Smippo/0.0.1 Screenshot',
    };

    // Device emulation
    if (device) {
      const {devices} = await import('playwright');
      if (devices[device]) {
        Object.assign(contextOptions, devices[device]);
        if (!quiet) console.log(chalk.dim(`  Device: ${device}`));
      } else {
        console.warn(
          chalk.yellow(
            `  Warning: Unknown device "${device}", using default viewport`,
          ),
        );
      }
    }

    // Dark mode
    if (darkMode) {
      contextOptions.colorScheme = 'dark';
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Navigate
    if (verbose) console.log(chalk.dim(`  Navigating to ${url}...`));

    await page.goto(url, {
      waitUntil: wait,
      timeout,
    });

    // Additional wait time
    if (waitTime > 0) {
      if (verbose) console.log(chalk.dim(`  Waiting ${waitTime}ms...`));
      await page.waitForTimeout(waitTime);
    }

    // Screenshot options
    const screenshotOptions = {
      path: outputPath,
      type: format,
      fullPage,
      scale,
      omitBackground,
    };

    // JPEG quality (only for jpeg format)
    if (format === 'jpeg' && quality) {
      screenshotOptions.quality = quality;
    }

    // Take screenshot
    if (selector) {
      // Element screenshot
      if (verbose) console.log(chalk.dim(`  Capturing element: ${selector}`));
      const element = page.locator(selector);
      await element.screenshot(screenshotOptions);
    } else {
      // Page screenshot
      if (verbose) {
        console.log(
          chalk.dim(`  Capturing ${fullPage ? 'full page' : 'viewport'}...`),
        );
      }
      await page.screenshot(screenshotOptions);
    }

    // Get file size
    const stats = await fs.stat(outputPath);
    const fileSize = formatFileSize(stats.size);

    if (!quiet) {
      console.log(chalk.green(`  ✓ Screenshot saved`));
      console.log(chalk.dim(`  File: ${outputPath}`));
      console.log(chalk.dim(`  Size: ${fileSize}`));
      if (fullPage) {
        const dimensions = await page.evaluate(() => ({
          // eslint-disable-next-line no-undef
          width: document.documentElement.scrollWidth,
          // eslint-disable-next-line no-undef
          height: document.documentElement.scrollHeight,
        }));
        console.log(
          chalk.dim(`  Dimensions: ${dimensions.width}x${dimensions.height}px`),
        );
      }
      console.log('');
    }

    return {
      path: outputPath,
      size: stats.size,
      url,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parse viewport string (e.g., "1920x1080")
 */
export function parseViewport(viewportStr) {
  if (!viewportStr) return {width: 1920, height: 1080};
  const [width, height] = viewportStr.split('x').map(Number);
  return {width: width || 1920, height: height || 1080};
}
