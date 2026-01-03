import { dirname, relative, join, extname, basename } from 'path';

/**
 * Calculate relative path from one file to another
 */
export function getRelativePath(from, to) {
  const fromDir = dirname(from);
  let rel = relative(fromDir, to);
  
  // Ensure forward slashes
  rel = rel.replace(/\\/g, '/');
  
  // Add ./ prefix if needed
  if (!rel.startsWith('.') && !rel.startsWith('/')) {
    rel = './' + rel;
  }
  
  return rel;
}

/**
 * Sanitize a path component for the filesystem
 */
export function sanitizePath(str) {
  return str
    .replace(/[<>:"|?*]/g, '_')    // Invalid chars
    .replace(/\.\./g, '_')          // No directory traversal
    .replace(/\/+/g, '/')           // Collapse multiple slashes
    .slice(0, 200);                 // Limit length
}

/**
 * Ensure a path has an extension, adding the default if needed
 */
export function ensureExtension(filePath, defaultExt = '.html') {
  const ext = extname(filePath);
  if (!ext) {
    return filePath + defaultExt;
  }
  return filePath;
}

/**
 * Get a unique filename by adding a number suffix if needed
 */
export function getUniqueFilename(basePath, existingPaths) {
  if (!existingPaths.has(basePath)) {
    return basePath;
  }
  
  const ext = extname(basePath);
  const base = basePath.slice(0, -ext.length || undefined);
  
  let counter = 1;
  let newPath;
  do {
    newPath = `${base}-${counter}${ext}`;
    counter++;
  } while (existingPaths.has(newPath));
  
  return newPath;
}

/**
 * Join paths and normalize
 */
export function joinPath(...parts) {
  return join(...parts).replace(/\\/g, '/');
}

/**
 * Get file basename without extension
 */
export function getBasename(filePath) {
  return basename(filePath, extname(filePath));
}

