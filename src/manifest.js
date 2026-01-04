import fs from 'fs-extra';
import path from 'path';

const SMIPPO_DIR = '.smippo';
const MANIFEST_FILE = 'manifest.json';
const CACHE_FILE = 'cache.json';

/**
 * Check if a manifest exists
 */
export function manifestExists(outputDir) {
  const manifestPath = path.join(outputDir, SMIPPO_DIR, MANIFEST_FILE);
  return fs.existsSync(manifestPath);
}

/**
 * Read the manifest file
 */
export async function readManifest(outputDir) {
  const manifestPath = path.join(outputDir, SMIPPO_DIR, MANIFEST_FILE);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const content = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(content);
}

/**
 * Write the manifest file
 */
export async function writeManifest(outputDir, manifest) {
  const smippoDir = path.join(outputDir, SMIPPO_DIR);
  const manifestPath = path.join(smippoDir, MANIFEST_FILE);

  await fs.ensureDir(smippoDir);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

/**
 * Read the cache file
 */
export async function readCache(outputDir) {
  const cachePath = path.join(outputDir, SMIPPO_DIR, CACHE_FILE);

  if (!fs.existsSync(cachePath)) {
    return {
      etags: {},
      lastModified: {},
      contentTypes: {},
    };
  }

  const content = await fs.readFile(cachePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Write the cache file
 */
export async function writeCache(outputDir, cache) {
  const smippoDir = path.join(outputDir, SMIPPO_DIR);
  const cachePath = path.join(smippoDir, CACHE_FILE);

  await fs.ensureDir(smippoDir);
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

/**
 * Create initial manifest
 */
export function createManifest(url, options) {
  return {
    version: '0.0.1',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    rootUrl: url,
    options: {
      depth: options.depth,
      scope: options.scope,
      stayInDir: options.stayInDir,
      externalAssets: options.externalAssets,
      filters: {
        include: options.include || [],
        exclude: options.exclude || [],
      },
    },
    stats: {
      pagesCapt: 0,
      assetsCapt: 0,
      totalSize: 0,
      duration: 0,
      errors: 0,
    },
    pages: [],
    assets: [],
  };
}

/**
 * Update manifest with captured page
 */
export function addPageToManifest(manifest, page) {
  manifest.pages.push({
    url: page.url,
    localPath: page.localPath,
    status: page.status || 200,
    captured: new Date().toISOString(),
    size: page.size,
    title: page.title,
  });

  manifest.stats.pagesCapt++;
  manifest.stats.totalSize += page.size || 0;
  manifest.updated = new Date().toISOString();
}

/**
 * Update manifest with captured asset
 */
export function addAssetToManifest(manifest, asset) {
  manifest.assets.push({
    url: asset.url,
    localPath: asset.localPath,
    mimeType: asset.mimeType,
    size: asset.size,
  });

  manifest.stats.assetsCapt++;
  manifest.stats.totalSize += asset.size || 0;
  manifest.updated = new Date().toISOString();
}

/**
 * Record an error in manifest
 */
export function addErrorToManifest(manifest, _url, _error) {
  manifest.stats.errors++;
  manifest.updated = new Date().toISOString();
}

/**
 * Finalize manifest with duration
 */
export function finalizeManifest(manifest, duration) {
  manifest.stats.duration = duration;
  manifest.updated = new Date().toISOString();
}

/**
 * Get HAR file path
 */
export function getHarPath(outputDir) {
  return path.join(outputDir, SMIPPO_DIR, 'network.har');
}

/**
 * Get log file path
 */
export function getLogPath(outputDir) {
  return path.join(outputDir, SMIPPO_DIR, 'log.txt');
}
