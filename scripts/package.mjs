import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Zip only what the extension needs at runtime, for Chrome Web Store upload. */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const files = [
  'manifest.json',
  'background.js',
  'contentScript.js',
  'popup.html',
  'popup.js',
  'styles.css',
  ...['dark', 'light'].flatMap((scheme) =>
    [16, 48, 128].map((size) => `images/${scheme}/icon${size}.png`)
  ),
];

const out = join(root, 'dist', `svg-grab-pro-${version}.zip`);
mkdirSync(dirname(out), { recursive: true });
rmSync(out, { force: true });
execFileSync('zip', ['-X', '-q', out, ...files], { cwd: root, stdio: 'inherit' });
console.log(`Packaged ${files.length} files → ${out}`);
