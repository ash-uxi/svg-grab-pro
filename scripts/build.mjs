import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const shared = {
  bundle: true,
  platform: 'browser',
  legalComments: 'none',
  logLevel: 'info',
};

await Promise.all([
  esbuild.build({
    ...shared,
    entryPoints: [join(root, 'src/content-script/index.js')],
    outfile: join(root, 'contentScript.js'),
    format: 'iife',
  }),
  esbuild.build({
    ...shared,
    entryPoints: [join(root, 'src/background/index.js')],
    outfile: join(root, 'background.js'),
    format: 'iife',
  }),
  esbuild.build({
    ...shared,
    entryPoints: [join(root, 'src/popup/index.js')],
    outfile: join(root, 'popup.js'),
    format: 'iife',
  }),
]);
