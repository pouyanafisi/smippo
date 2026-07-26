// @flow
import fs from 'fs-extra';
import path from 'path';
import {
  getSiteDir,
  getSitesDir,
  getDomainFromUrl,
  readGlobalManifest,
} from './home.js';
import {manifestExists} from '../manifest.js';

/**
 * Single source of truth for "which directory does this capture live in?".
 *
 * `capture`, `continue` and `update` all route through here so their idea of the
 * default output directory cannot drift apart. It used to: `capture` defaulted to
 * ~/.smippo/sites/<hostname> while `continue`/`update` defaulted to ./site, which
 * meant the resume commands could never find a capture made with default options.
 */

const SMIPPO_DIR = '.smippo';
const MANIFEST_FILE = 'manifest.json';

/**
 * Turn a URL or bare hostname into the directory a default capture would use.
 *
 * @param {string} target - Full URL ('https://example.com/x') or host ('example.com')
 * @returns {string} Absolute path to ~/.smippo/sites/<hostname>
 */
export function siteDirForTarget(target) {
  return getSiteDir(hostnameFromTarget(target));
}

/**
 * Extract a hostname from either a full URL or a bare host/host+path string.
 */
export function hostnameFromTarget(target) {
  const raw = String(target).trim();
  const direct = getDomainFromUrl(raw);

  // getDomainFromUrl returns the input untouched when it is not a parseable URL,
  // so 'example.com/blog' would come back with the path still attached.
  if (direct === raw && !raw.includes('://')) {
    const withScheme = getDomainFromUrl(`https://${raw}`);
    if (withScheme !== `https://${raw}`) return withScheme;
    return raw.split('/')[0];
  }

  return direct;
}

/**
 * True when `dir` holds a smippo capture (i.e. has .smippo/manifest.json).
 */
export function isCaptureDir(dir) {
  return Boolean(dir) && manifestExists(dir);
}

/**
 * Every known capture directory, newest first.
 *
 * Looks in two places: ~/.smippo/sites/* (where default captures land) and the
 * paths recorded in the global manifest (where -o captures land). Ranked by the
 * mtime of each capture's own manifest, so "most recent" means most recently
 * written, not most recently created.
 *
 * @returns {Promise<Array<{path: string, mtimeMs: number}>>}
 */
export async function listCaptureDirs() {
  const candidates = new Set();

  const sitesDir = getSitesDir();
  if (await fs.pathExists(sitesDir)) {
    const entries = await fs.readdir(sitesDir, {withFileTypes: true});
    for (const entry of entries) {
      if (entry.isDirectory()) {
        candidates.add(path.join(sitesDir, entry.name));
      }
    }
  }

  // Captures made with an explicit -o live outside the sites dir but are still
  // tracked globally.
  try {
    const global = await readGlobalManifest();
    for (const site of global.sites || []) {
      if (site.path) candidates.add(path.resolve(site.path));
    }
  } catch {
    // A damaged global manifest must not break resume; the sites dir scan stands.
  }

  const found = [];
  for (const dir of candidates) {
    if (!isCaptureDir(dir)) continue;
    try {
      const stat = await fs.stat(path.join(dir, SMIPPO_DIR, MANIFEST_FILE));
      found.push({path: dir, mtimeMs: stat.mtimeMs});
    } catch {
      // Raced with a delete; skip it.
    }
  }

  return found.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/**
 * The most recently written capture directory, or null if there are none.
 */
export async function findMostRecentCaptureDir() {
  const all = await listCaptureDirs();
  return all.length > 0 ? all[0].path : null;
}

/**
 * Resolve the directory that `continue` / `update` should operate on.
 *
 * Precedence:
 *   1. explicit -o/--output
 *   2. a URL or hostname argument, resolved exactly as `capture` would
 *   3. the most recently written capture on this machine
 *
 * @param {Object} args
 * @param {string} [args.output] - value of -o/--output
 * @param {string} [args.target] - positional URL or hostname
 * @returns {Promise<{dir: string|null, source: 'option'|'target'|'recent'|'none'}>}
 */
export async function resolveCaptureDir({output, target} = {}) {
  if (output) {
    return {dir: path.resolve(output), source: 'option'};
  }

  if (target) {
    return {dir: siteDirForTarget(target), source: 'target'};
  }

  const recent = await findMostRecentCaptureDir();
  if (recent) {
    return {dir: recent, source: 'recent'};
  }

  return {dir: null, source: 'none'};
}
