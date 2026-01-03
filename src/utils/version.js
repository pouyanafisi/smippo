import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let pkg;
try {
  pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
} catch {
  pkg = {version: '1.0.0'};
}

export const version = pkg.version;
