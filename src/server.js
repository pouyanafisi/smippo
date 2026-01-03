// @flow
import http from 'http';
import fs from 'fs-extra';
import path from 'path';
import {createRequire} from 'module';
import chalk from 'chalk';
import {exec} from 'child_process';

// MIME type mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.har': 'application/json; charset=utf-8',
};

/**
 * Check if a port is available
 */
async function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = http.createServer();
    server.listen(port, '127.0.0.1');
    server.on('listening', () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find the next available port starting from the given port
 */
async function findAvailablePort(startPort = 8080, maxAttempts = 100) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `Could not find an available port between ${startPort} and ${startPort + maxAttempts}`,
  );
}

/**
 * Open URL in default browser
 */
function openBrowser(url) {
  const platform = process.platform;
  let command;

  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, error => {
    if (error) {
      // Silently fail - browser opening is optional
    }
  });
}

/**
 * Get MIME type for a file
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Generate a directory listing HTML page
 */
async function generateDirectoryListing(dirPath, urlPath, rootDir) {
  const entries = await fs.readdir(dirPath, {withFileTypes: true});

  // Filter out hidden files and .smippo directory
  const filteredEntries = entries.filter(e => !e.name.startsWith('.'));

  // Separate directories and files
  const dirs = filteredEntries
    .filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = filteredEntries
    .filter(e => e.isFile())
    .sort((a, b) => a.name.localeCompare(b.name));

  // Check for manifest to get site info
  let siteInfo = null;
  const manifestPath = path.join(rootDir, '.smippo', 'manifest.json');
  if (await fs.pathExists(manifestPath)) {
    try {
      siteInfo = await fs.readJson(manifestPath);
    } catch {}
  }

  const isRoot = urlPath === '/' || urlPath === '';
  const parentPath = urlPath === '/' ? null : path.dirname(urlPath);

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Smippo - ${isRoot ? 'Captured Sites' : urlPath}</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
			min-height: 100vh;
			color: #e4e4e7;
			padding: 2rem;
		}
		.container { max-width: 900px; margin: 0 auto; }
		.header {
			text-align: center;
			margin-bottom: 2rem;
			padding: 2rem;
			background: rgba(255,255,255,0.05);
			border-radius: 16px;
			border: 1px solid rgba(255,255,255,0.1);
		}
		.logo {
			font-size: 2.5rem;
			font-weight: 800;
			background: linear-gradient(135deg, #60a5fa, #a78bfa);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			margin-bottom: 0.5rem;
		}
		.subtitle { color: #71717a; font-size: 0.9rem; }
		.site-info {
			margin-top: 1rem;
			padding: 1rem;
			background: rgba(96, 165, 250, 0.1);
			border-radius: 8px;
			font-size: 0.85rem;
		}
		.site-info a { color: #60a5fa; text-decoration: none; }
		.breadcrumb {
			margin-bottom: 1.5rem;
			padding: 0.75rem 1rem;
			background: rgba(255,255,255,0.05);
			border-radius: 8px;
			font-size: 0.9rem;
		}
		.breadcrumb a { color: #60a5fa; text-decoration: none; }
		.breadcrumb span { color: #71717a; margin: 0 0.5rem; }
		.listing {
			background: rgba(255,255,255,0.03);
			border-radius: 12px;
			border: 1px solid rgba(255,255,255,0.1);
			overflow: hidden;
		}
		.listing-header {
			padding: 1rem 1.5rem;
			background: rgba(255,255,255,0.05);
			border-bottom: 1px solid rgba(255,255,255,0.1);
			font-weight: 600;
			color: #a1a1aa;
			font-size: 0.85rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
		.entry {
			display: flex;
			align-items: center;
			padding: 1rem 1.5rem;
			border-bottom: 1px solid rgba(255,255,255,0.05);
			transition: background 0.2s;
			text-decoration: none;
			color: inherit;
		}
		.entry:hover { background: rgba(255,255,255,0.05); }
		.entry:last-child { border-bottom: none; }
		.entry-icon {
			width: 40px;
			height: 40px;
			border-radius: 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-right: 1rem;
			font-size: 1.2rem;
		}
		.entry-icon.dir { background: rgba(96, 165, 250, 0.2); }
		.entry-icon.file { background: rgba(167, 139, 250, 0.2); }
		.entry-icon.html { background: rgba(251, 146, 60, 0.2); }
		.entry-name { flex: 1; font-weight: 500; }
		.entry-meta { color: #71717a; font-size: 0.85rem; }
		.empty {
			padding: 3rem;
			text-align: center;
			color: #71717a;
		}
		.footer {
			text-align: center;
			margin-top: 2rem;
			color: #52525b;
			font-size: 0.8rem;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">📦 Smippo</div>
			<div class="subtitle">${isRoot ? 'Captured Sites Browser' : 'Directory Listing'}</div>
			${
        siteInfo && isRoot
          ? `
			<div class="site-info">
				Originally captured from <a href="${siteInfo.rootUrl}" target="_blank">${siteInfo.rootUrl}</a>
				${siteInfo.capturedAt ? ` on ${new Date(siteInfo.capturedAt).toLocaleDateString()}` : ''}
			</div>`
          : ''
      }
		</div>
		
		${
      !isRoot
        ? `
		<div class="breadcrumb">
			<a href="/">Home</a>
			${urlPath
        .split('/')
        .filter(Boolean)
        .map((part, i, arr) => {
          const href = '/' + arr.slice(0, i + 1).join('/');
          return `<span>/</span><a href="${href}">${part}</a>`;
        })
        .join('')}
		</div>`
        : ''
    }
		
		<div class="listing">
			<div class="listing-header">
				${isRoot ? 'Captured Sites' : `Contents of ${urlPath}`}
			</div>
			${
        parentPath !== null
          ? `
			<a href="${parentPath || '/'}" class="entry">
				<div class="entry-icon dir">⬆️</div>
				<div class="entry-name">..</div>
				<div class="entry-meta">Parent Directory</div>
			</a>`
          : ''
      }
			${dirs
        .map(
          d => `
			<a href="${urlPath === '/' ? '' : urlPath}/${d.name}" class="entry">
				<div class="entry-icon dir">📁</div>
				<div class="entry-name">${d.name}</div>
				<div class="entry-meta">Directory</div>
			</a>`,
        )
        .join('')}
			${files
        .map(f => {
          const ext = path.extname(f.name).toLowerCase();
          const isHtml = ext === '.html' || ext === '.htm';
          return `
			<a href="${urlPath === '/' ? '' : urlPath}/${f.name}" class="entry">
				<div class="entry-icon ${isHtml ? 'html' : 'file'}">${isHtml ? '📄' : '📎'}</div>
				<div class="entry-name">${f.name}</div>
				<div class="entry-meta">${ext || 'File'}</div>
			</a>`;
        })
        .join('')}
			${
        dirs.length === 0 && files.length === 0
          ? `
			<div class="empty">No files found</div>`
          : ''
      }
		</div>
		
		<div class="footer">
			Powered by Smippo • Modern Website Copier
		</div>
	</div>
</body>
</html>`;

  return html;
}

/**
 * Create and start an HTTP server for serving captured sites
 */
export async function createServer(options = {}) {
  const {
    directory = './site',
    port: requestedPort = 8080,
    host = '127.0.0.1',
    open = false,
    cors = true,
    verbose = false,
    quiet = false,
  } = options;

  // Resolve directory to absolute path
  const rootDir = path.resolve(directory);

  // Check if directory exists
  if (!(await fs.pathExists(rootDir))) {
    throw new Error(`Directory not found: ${rootDir}`);
  }

  // Find available port
  const port = await findAvailablePort(parseInt(requestedPort, 10));

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    const startTime = Date.now();

    // Parse URL and decode
    let urlPath = decodeURIComponent(req.url.split('?')[0]);

    // Build file path
    let filePath = path.join(rootDir, urlPath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const stats = await fs.stat(filePath);

      // If it's a directory, look for index.html or show listing
      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        if (await fs.pathExists(indexPath)) {
          filePath = indexPath;
        } else {
          // Try looking for a .html file with the same name
          const htmlPath = filePath.replace(/\/$/, '') + '.html';
          if (await fs.pathExists(htmlPath)) {
            filePath = htmlPath;
          } else {
            // Generate directory listing
            const listingHtml = await generateDirectoryListing(
              filePath,
              urlPath,
              rootDir,
            );
            const headers = {
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Length': Buffer.byteLength(listingHtml),
              'Cache-Control': 'no-cache',
            };
            if (cors) {
              headers['Access-Control-Allow-Origin'] = '*';
            }
            res.writeHead(200, headers);
            res.end(listingHtml);
            logRequest(req, 200, Date.now() - startTime, verbose, quiet);
            return;
          }
        }
      }

      // Read and serve the file
      const content = await fs.readFile(filePath);
      const mimeType = getMimeType(filePath);

      // Set headers
      const headers = {
        'Content-Type': mimeType,
        'Content-Length': content.length,
        'Cache-Control': 'no-cache',
      };

      // Add CORS headers if enabled
      if (cors) {
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
        headers['Access-Control-Allow-Headers'] = '*';
      }

      res.writeHead(200, headers);
      res.end(content);

      logRequest(req, 200, Date.now() - startTime, verbose, quiet);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Try adding .html extension
        const htmlPath = filePath + '.html';
        if (await fs.pathExists(htmlPath)) {
          const content = await fs.readFile(htmlPath);
          const headers = {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': content.length,
            'Cache-Control': 'no-cache',
          };
          if (cors) {
            headers['Access-Control-Allow-Origin'] = '*';
          }
          res.writeHead(200, headers);
          res.end(content);
          logRequest(req, 200, Date.now() - startTime, verbose, quiet);
          return;
        }

        res.writeHead(404);
        res.end('Not Found');
        logRequest(req, 404, Date.now() - startTime, verbose, quiet);
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
        logRequest(req, 500, Date.now() - startTime, verbose, quiet);
      }
    }
  });

  // Handle server errors
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(chalk.red(`Port ${port} is already in use`));
    } else {
      console.error(chalk.red(`Server error: ${error.message}`));
    }
    process.exit(1);
  });

  // Start listening
  return new Promise(resolve => {
    server.listen(port, host, () => {
      const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;

      if (!quiet) {
        console.log('');
        console.log(
          chalk.cyan('  ╭─────────────────────────────────────────────╮'),
        );
        console.log(
          chalk.cyan('  │                                             │'),
        );
        console.log(
          chalk.cyan('  │  ') +
            chalk.bold.white('Smippo Server') +
            chalk.cyan('                            │'),
        );
        console.log(
          chalk.cyan('  │                                             │'),
        );
        console.log(
          chalk.cyan('  │  ') +
            chalk.dim('Local:   ') +
            chalk.bold.green(url) +
            chalk.cyan('        │'),
        );
        if (host === '0.0.0.0') {
          console.log(
            chalk.cyan('  │  ') +
              chalk.dim('Network: ') +
              chalk.bold.green(`http://[your-ip]:${port}`) +
              chalk.cyan('   │'),
          );
        }
        console.log(
          chalk.cyan('  │                                             │'),
        );
        console.log(
          chalk.cyan('  │  ') +
            chalk.dim('Serving: ') +
            chalk.white(truncatePath(rootDir, 30)) +
            chalk.cyan('  │'),
        );
        console.log(
          chalk.cyan('  │                                             │'),
        );
        console.log(
          chalk.cyan('  │  ') +
            chalk.dim('Press ') +
            chalk.white('Ctrl+C') +
            chalk.dim(' to stop') +
            chalk.cyan('                   │'),
        );
        console.log(
          chalk.cyan('  │                                             │'),
        );
        console.log(
          chalk.cyan('  ╰─────────────────────────────────────────────╯'),
        );
        console.log('');
      }

      // Open browser if requested
      if (open) {
        openBrowser(url);
      }

      resolve({
        server,
        port,
        host,
        url,
        close: () => new Promise(res => server.close(res)),
      });
    });
  });
}

/**
 * Log a request
 */
function logRequest(req, status, duration, verbose, quiet) {
  if (quiet) return;
  if (!verbose && status === 200) return;

  const statusColor =
    status < 300 ? chalk.green : status < 400 ? chalk.yellow : chalk.red;
  const method = chalk.dim(req.method.padEnd(4));
  const url = req.url.length > 50 ? req.url.slice(0, 47) + '...' : req.url;
  const time = chalk.dim(`${duration}ms`);

  console.log(`  ${method} ${statusColor(status)} ${url} ${time}`);
}

/**
 * Truncate a path for display
 */
function truncatePath(p, maxLen) {
  if (p.length <= maxLen) return p.padEnd(maxLen);
  return '...' + p.slice(-(maxLen - 3));
}

/**
 * Serve command for CLI
 */
export async function serve(options) {
  try {
    const serverInfo = await createServer({
      directory: options.output || options.directory || './site',
      port: options.port || 8080,
      host: options.host || '127.0.0.1',
      open: options.open,
      cors: options.cors !== false,
      verbose: options.verbose,
      quiet: options.quiet,
    });

    // Keep process running
    process.on('SIGINT', async () => {
      console.log(chalk.dim('\n  Shutting down server...'));
      await serverInfo.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await serverInfo.close();
      process.exit(0);
    });
  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    process.exit(1);
  }
}
