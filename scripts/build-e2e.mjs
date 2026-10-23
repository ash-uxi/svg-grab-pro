import { join } from 'node:path';
import { bundle, root } from './bundle.mjs';
import { stage } from './stage.mjs';

/**
 * The smoke-test build in dist/e2e: an open shadow root (`__E2E__`) so the test can click the
 * menu, and all-sites access granted at install so no permission prompt is involved. The
 * background's `syncAllSitesAccess` then registers the content script, exactly as it does for
 * a real "All sites" grant.
 */
const outDir = join(root, 'dist', 'e2e');
await bundle(outDir, { e2e: true });
stage(outDir, {
  bundles: false,
  editManifest: (manifest) => ({ ...manifest, host_permissions: ['<all_urls>'] }),
});
