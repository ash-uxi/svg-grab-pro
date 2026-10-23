import * as esbuild from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY_POINTS = {
  contentScript: 'src/content-script/index.js',
  background: 'src/background/index.js',
  popup: 'src/popup/index.js',
};

export const BUNDLES = Object.keys(ENTRY_POINTS).map((name) => `${name}.js`);

/**
 * Bundle every entry point into `outdir`, unminified so store reviewers can read it.
 * @param {string} outdir
 * @param {{ e2e?: boolean }} [options] `e2e` sets `__E2E__` for the smoke-test build.
 */
export function bundle(outdir, { e2e = false } = {}) {
  return Promise.all(
    Object.entries(ENTRY_POINTS).map(([name, entry]) =>
      esbuild.build({
        entryPoints: [join(root, entry)],
        outfile: join(outdir, `${name}.js`),
        bundle: true,
        format: 'iife',
        platform: 'browser',
        legalComments: 'none',
        logLevel: 'info',
        define: { __E2E__: String(e2e) },
      })
    )
  );
}
