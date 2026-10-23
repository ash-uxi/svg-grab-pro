import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './bundle.mjs';
import { stage } from './stage.mjs';

/**
 * Stage the extension into dist/extension (what `web-ext lint` and `web-ext run` use), then zip
 * it for both stores, plus the source zip AMO asks for. `VERSION` (set by the release
 * workflow) is stamped into the staged manifest only.
 */
const { version: sourceVersion } = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const version = process.env.VERSION || sourceVersion;
const dist = join(root, 'dist');
const staged = join(dist, 'extension');

stage(staged, { editManifest: (manifest) => ({ ...manifest, version }) });

const extensionZip = join(dist, `svg-grab-pro-${version}.zip`);
const sourcesZip = join(dist, `svg-grab-pro-${version}-sources.zip`);
rmSync(extensionZip, { force: true });
execFileSync('zip', ['-X', '-q', '-r', extensionZip, '.'], { cwd: staged, stdio: 'inherit' });
// Committed files only; reviewers rebuild with `npm ci && npm run build`.
execFileSync(
  'git',
  [
    'archive',
    '--format=zip',
    '-o',
    sourcesZip,
    'HEAD',
    '--',
    '.',
    ':!.github',
    ':!store',
    ':!docs',
  ],
  { cwd: root, stdio: 'inherit' }
);

console.log(`Packaged ${version}:\n  ${extensionZip}\n  ${sourcesZip}`);
