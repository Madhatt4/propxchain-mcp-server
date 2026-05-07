#!/usr/bin/env node
// Postbuild: prepend a node shebang to dist/index.js so it can be invoked
// directly when installed globally via the package's `bin` entry. TypeScript
// strips shebangs from input source under most module configs, so we add it
// here once the compile step has run.
//
// Idempotent — safe to re-run on already-shebanged files.

import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHEBANG = '#!/usr/bin/env node\n';
const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, '..', 'dist', 'index.js');

const original = readFileSync(target, 'utf8');
if (original.startsWith('#!')) {
  console.log(`add-shebang: ${target} already starts with a shebang — skipping.`);
} else {
  writeFileSync(target, SHEBANG + original, 'utf8');
  console.log(`add-shebang: prepended shebang to ${target}.`);
}

// Make executable on POSIX systems. No-op on Windows but harmless.
try {
  chmodSync(target, 0o755);
} catch (err) {
  console.warn(`add-shebang: could not chmod ${target} (non-fatal):`, err.message);
}
