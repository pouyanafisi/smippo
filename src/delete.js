// @flow
import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {readGlobalManifest, writeGlobalManifest} from './utils/home.js';

/**
 * Format file size for display
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculate directory size recursively
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, {withFileTypes: true});
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return totalSize;
}

/**
 * Interactive delete command for captured sites
 */
export async function deleteSites(options = {}) {
  // Read global manifest
  const manifest = await readGlobalManifest();

  if (!manifest.sites || manifest.sites.length === 0) {
    console.log(chalk.yellow('\nNo captured sites found.\n'));
    return;
  }

  // Show header
  console.log('');
  p.intro(chalk.bgRed.white(' Delete Captured Sites '));

  // Get site info with sizes
  const sitesWithInfo = await Promise.all(
    manifest.sites.map(async site => {
      const exists = await fs.pathExists(site.path);
      let size = 0;
      if (exists) {
        size = await getDirectorySize(site.path);
      }
      return {
        ...site,
        exists,
        size,
        displaySize: formatSize(size),
      };
    }),
  );

  // Filter to only existing sites
  const existingSites = sitesWithInfo.filter(s => s.exists);

  if (existingSites.length === 0) {
    console.log(chalk.yellow('No captured sites found on disk.\n'));

    // Clean up manifest
    manifest.sites = [];
    await writeGlobalManifest(manifest);
    console.log(chalk.dim('Cleaned up manifest.\n'));
    return;
  }

  let sitesToDelete = [];

  if (options.all) {
    // Delete all sites
    sitesToDelete = existingSites;
  } else {
    // Interactive selection
    const selected = await p.multiselect({
      message: 'Select sites to delete (space to select, enter to confirm):',
      options: existingSites.map(site => ({
        value: site,
        label: `${site.domain}`,
        hint: `${site.displaySize} • ${site.path}`,
      })),
      required: false,
    });

    if (p.isCancel(selected) || !selected || selected.length === 0) {
      p.cancel('No sites selected.');
      return;
    }

    sitesToDelete = selected;
  }

  // Show what will be deleted
  console.log('');
  console.log(chalk.bold('Sites to delete:'));
  for (const site of sitesToDelete) {
    console.log(chalk.red(`  • ${site.domain} (${site.displaySize})`));
    console.log(chalk.dim(`    ${site.path}`));
  }
  console.log('');

  // Calculate total size
  const totalSize = sitesToDelete.reduce((sum, s) => sum + s.size, 0);
  console.log(
    chalk.bold(
      `Total: ${sitesToDelete.length} site(s), ${formatSize(totalSize)}`,
    ),
  );
  console.log('');

  // Confirmation
  let confirmed = options.yes;
  if (!confirmed) {
    confirmed = await p.confirm({
      message: 'Are you sure you want to delete these sites?',
      initialValue: false,
    });
  }

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Deletion cancelled.');
    return;
  }

  // Delete the sites
  const spinner = p.spinner();
  spinner.start('Deleting sites...');

  let deletedCount = 0;
  let failedCount = 0;
  const deletedDomains = new Set();

  for (const site of sitesToDelete) {
    try {
      await fs.remove(site.path);
      deletedCount++;
      deletedDomains.add(site.domain);
    } catch (error) {
      failedCount++;
      console.error(
        chalk.red(`\n  Failed to delete ${site.domain}: ${error.message}`),
      );
    }
  }

  // Update manifest - remove deleted sites
  manifest.sites = manifest.sites.filter(
    s =>
      !deletedDomains.has(s.domain) ||
      !sitesToDelete.some(d => d.path === s.path),
  );
  await writeGlobalManifest(manifest);

  spinner.stop('Deletion complete!');

  // Summary
  console.log('');
  if (deletedCount > 0) {
    console.log(
      chalk.green(
        `✓ Deleted ${deletedCount} site(s), freed ${formatSize(totalSize)}`,
      ),
    );
  }
  if (failedCount > 0) {
    console.log(chalk.red(`✗ Failed to delete ${failedCount} site(s)`));
  }
  console.log('');
}
