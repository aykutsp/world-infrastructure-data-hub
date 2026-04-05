import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(
  resolve(here, 'dist/index.cjs'),
  `'use strict';\nmodule.exports = require('./index.js');\n`
);
