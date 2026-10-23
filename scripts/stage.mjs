import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { BUNDLES, root } from './bundle.mjs';

/** Everything the extension needs at runtime besides the bundles. */
const STATIC_FILES = [
  'popup.html',
  'styles.css',
  ...['dark', 'light'].flatMap((scheme) =>
    [16, 48, 128].map((size) => `images/${scheme}/icon${size}.png`)
  ),
];

/**
 * Copy the runtime files into a clean `outDir` as an unpacked extension. The source
 * `manifest.json` is never edited; `editManifest` changes only the staged copy.
 * @param {string} outDir
 * @param {{ bundles?: boolean; editManifest?: (manifest: any) => any }} [options]
 *   `bundles: false` when the caller has already bundled into `outDir`.
 */
export function stage(outDir, { bundles = true, editManifest = (manifest) => manifest } = {}) {
  if (bundles) rmSync(outDir, { recursive: true, force: true });
  for (const file of [...STATIC_FILES, ...(bundles ? BUNDLES : [])]) {
    mkdirSync(dirname(join(outDir, file)), { recursive: true });
    cpSync(join(root, file), join(outDir, file));
  }
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  writeFileSync(
    join(outDir, 'manifest.json'),
    `${JSON.stringify(editManifest(manifest), null, 2)}\n`
  );
}
