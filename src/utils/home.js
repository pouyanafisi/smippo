// @flow
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const SMIPPO_HOME_DIR = '.smippo';
const SITES_DIR = 'sites';
const GLOBAL_MANIFEST_FILE = 'manifest.json';

/**
 * Get the global smippo home directory (~/.smippo/)
 */
export function getSmippoHome() {
  return path.join(os.homedir(), SMIPPO_HOME_DIR);
}

/**
 * Get the sites directory (~/.smippo/sites/)
 */
export function getSitesDir() {
  return path.join(getSmippoHome(), SITES_DIR);
}

/**
 * Get the output directory for a specific domain
 * @param {string} domain - The domain name (e.g., 'example.com')
 * @returns {string} The full path to the site directory
 */
export function getSiteDir(domain) {
  return path.join(getSitesDir(), domain);
}

/**
 * Extract domain from a URL
 * @param {string} url - The URL to extract domain from
 * @returns {string} The domain (hostname)
 */
export function getDomainFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    // If URL parsing fails, return the original string
    return url;
  }
}

/**
 * Ensure the smippo home directory exists
 */
export async function ensureSmippoHome() {
  const homeDir = getSmippoHome();
  const sitesDir = getSitesDir();

  await fs.ensureDir(homeDir);
  await fs.ensureDir(sitesDir);

  return homeDir;
}

/**
 * Get the global manifest path (~/.smippo/manifest.json)
 */
export function getGlobalManifestPath() {
  return path.join(getSmippoHome(), GLOBAL_MANIFEST_FILE);
}

/**
 * Read the global manifest (list of all captured sites)
 */
export async function readGlobalManifest() {
  const manifestPath = getGlobalManifestPath();

  if (!(await fs.pathExists(manifestPath))) {
    return {
      version: '1.0.0',
      sites: [],
    };
  }

  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return {
      version: '1.0.0',
      sites: [],
    };
  }
}

/**
 * Write the global manifest
 */
export async function writeGlobalManifest(manifest) {
  await ensureSmippoHome();
  const manifestPath = getGlobalManifestPath();
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

/**
 * Add a site to the global manifest
 * @param {Object} siteInfo - Site information
 * @param {string} siteInfo.domain - Domain name
 * @param {string} siteInfo.rootUrl - Original URL
 * @param {string} siteInfo.outputDir - Directory where site was saved
 * @param {string} [siteInfo.title] - Page title
 * @param {number} [siteInfo.pagesCount] - Number of pages captured
 * @param {number} [siteInfo.assetsCount] - Number of assets captured
 */
export async function addSiteToGlobalManifest(siteInfo) {
  const manifest = await readGlobalManifest();

  // Use outputDir as the unique key (same domain can be saved to different dirs)
  const outputPath = path.resolve(siteInfo.outputDir);
  const existingIndex = manifest.sites.findIndex(s => s.path === outputPath);

  const siteEntry = {
    domain: siteInfo.domain,
    rootUrl: siteInfo.rootUrl,
    title: siteInfo.title || siteInfo.domain,
    path: outputPath,
    created: siteInfo.created || new Date().toISOString(),
    updated: new Date().toISOString(),
    pagesCount: siteInfo.pagesCount || 0,
    assetsCount: siteInfo.assetsCount || 0,
  };

  if (existingIndex >= 0) {
    // Update existing entry (preserve created date)
    manifest.sites[existingIndex] = {
      ...siteEntry,
      created: manifest.sites[existingIndex].created,
    };
  } else {
    // Add new entry
    manifest.sites.push(siteEntry);
  }

  await writeGlobalManifest(manifest);
  return manifest;
}

/**
 * Remove a site from the global manifest
 */
export async function removeSiteFromGlobalManifest(domain) {
  const manifest = await readGlobalManifest();
  manifest.sites = manifest.sites.filter(s => s.domain !== domain);
  await writeGlobalManifest(manifest);
  return manifest;
}

/**
 * Get all captured sites from the global manifest
 */
export async function getAllCapturedSites() {
  const manifest = await readGlobalManifest();

  // Verify each site still exists
  const validSites = [];
  for (const site of manifest.sites) {
    if (await fs.pathExists(site.path)) {
      validSites.push(site);
    }
  }

  // Update manifest if some sites were removed
  if (validSites.length !== manifest.sites.length) {
    manifest.sites = validSites;
    await writeGlobalManifest(manifest);
  }

  return validSites;
}
