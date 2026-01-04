// @flow
import fs from 'fs-extra';
import path from 'path';
import {urlToPath} from './utils/url.js';
import {sanitizePath, joinPath} from './utils/path.js';
import mime from 'mime-types';

/**
 * Save resources to disk
 */
export class ResourceSaver {
  constructor(options = {}) {
    this.outputDir = options.output || './site';
    this.structure = options.structure || 'original';
    this.savedFiles = new Map(); // URL -> local path
    this.stats = {
      files: 0,
      bytes: 0,
    };
  }

  /**
   * Get the local path for a URL
   */
  getLocalPath(url) {
    const relativePath = urlToPath(url, this.structure);
    return joinPath(this.outputDir, sanitizePath(relativePath));
  }

  /**
   * Save HTML content
   */
  async saveHtml(url, html, _options = {}) {
    const relativePath = urlToPath(url, this.structure);
    const localPath = joinPath(this.outputDir, sanitizePath(relativePath));

    // Ensure directory exists
    await fs.ensureDir(path.dirname(localPath));

    // Write the file
    await fs.writeFile(localPath, html, 'utf8');

    // Store the relative path (not full path) for link rewriting
    this.savedFiles.set(url, sanitizePath(relativePath));
    this.stats.files++;
    this.stats.bytes += Buffer.byteLength(html, 'utf8');

    return localPath;
  }

  /**
   * Save a resource (binary or text)
   */
  async saveResource(url, resource) {
    let relativePath = urlToPath(url, this.structure);
    relativePath = sanitizePath(relativePath);
    let localPath = joinPath(this.outputDir, relativePath);

    // Fix extension based on content type if needed
    localPath = this._fixExtension(localPath, resource.contentType);
    relativePath = this._fixExtension(relativePath, resource.contentType);

    // Ensure directory exists
    await fs.ensureDir(path.dirname(localPath));

    // Write the file
    await fs.writeFile(localPath, resource.body);

    // Store the relative path (not full path) for link rewriting
    this.savedFiles.set(url, relativePath);
    this.stats.files++;
    this.stats.bytes += resource.size;

    return localPath;
  }

  /**
   * Save multiple resources
   */
  async saveResources(resources) {
    const saved = [];

    for (const [url, resource] of resources) {
      try {
        const localPath = await this.saveResource(url, resource);
        saved.push({url, localPath, size: resource.size});
      } catch (error) {
        // Continue saving other resources
      }
    }

    return saved;
  }

  /**
   * Save a screenshot
   */
  async saveScreenshot(url, screenshot) {
    const basePath = this.getLocalPath(url);
    const screenshotPath = basePath.replace(/\.html?$/i, '.png');

    await fs.ensureDir(path.dirname(screenshotPath));
    await fs.writeFile(screenshotPath, screenshot);

    return screenshotPath;
  }

  /**
   * Save a PDF
   */
  async savePdf(url, pdf) {
    const basePath = this.getLocalPath(url);
    const pdfPath = basePath.replace(/\.html?$/i, '.pdf');

    await fs.ensureDir(path.dirname(pdfPath));
    await fs.writeFile(pdfPath, pdf);

    return pdfPath;
  }

  /**
   * Get URL to local path mapping
   */
  getUrlMap() {
    return new Map(this.savedFiles);
  }

  /**
   * Get relative path from output directory
   */
  getRelativePath(localPath) {
    return path.relative(this.outputDir, localPath);
  }

  /**
   * Fix file extension based on content type
   */
  _fixExtension(filePath, contentType) {
    if (!contentType) return filePath;

    const mimeType = contentType.split(';')[0].trim();
    const expectedExt = mime.extension(mimeType);

    if (!expectedExt) return filePath;

    const currentExt = path.extname(filePath).slice(1).toLowerCase();

    // Don't change if extension seems correct
    const equivalentExtensions = {
      jpeg: ['jpg', 'jpeg'],
      htm: ['html', 'htm'],
      js: ['js', 'mjs', 'cjs'],
    };

    const isEquivalent = Object.values(equivalentExtensions).some(
      group => group.includes(currentExt) && group.includes(expectedExt),
    );

    if (isEquivalent || currentExt === expectedExt) {
      return filePath;
    }

    // Only fix if current extension is wrong or missing
    if (!currentExt || !isKnownExtension(currentExt)) {
      return `${filePath}.${expectedExt}`;
    }

    return filePath;
  }
}

/**
 * Check if extension is known
 */
function isKnownExtension(ext) {
  const known = [
    'html',
    'htm',
    'css',
    'js',
    'mjs',
    'json',
    'xml',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'svg',
    'ico',
    'bmp',
    'woff',
    'woff2',
    'ttf',
    'eot',
    'otf',
    'mp3',
    'mp4',
    'webm',
    'ogg',
    'wav',
    'avi',
    'pdf',
    'zip',
    'tar',
    'gz',
  ];

  return known.includes(ext.toLowerCase());
}
