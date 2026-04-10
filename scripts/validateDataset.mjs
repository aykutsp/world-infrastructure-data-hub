// Validates the generated dataset against schemas/countries.schema.json.
//
// Runs as the last step of `npm run generate-data` and as a standalone check
// in `npm run validate`. A schema mismatch exits non-zero and fails the CI
// build, which means the live site stays on the last known good dataset.
// See ADR-0007 for the stability pledge this enforces.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(root, '..', 'schemas', 'countries.schema.json');
const dataPath = path.resolve(root, '..', 'public', 'api', 'v1', 'countries.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const ok = validate(data);
if (!ok) {
  console.error('❌ countries.json does not match schemas/countries.schema.json\n');
  for (const err of validate.errors ?? []) {
    console.error(`  ${err.instancePath || '/'}  ${err.message}`);
    if (err.params && Object.keys(err.params).length) {
      console.error(`      ${JSON.stringify(err.params)}`);
    }
  }
  console.error(
    '\nThe pipeline output drifted from the declared schema. Either:\n' +
      '  (a) fix the generator so the output matches the schema, or\n' +
      '  (b) bump the schema and document the change in docs/architecture/adr/.\n' +
      'Do NOT loosen the schema silently — consumers depend on it.'
  );
  process.exit(1);
}

console.log(
  `✓ countries.json matches schema (${data.countries.length} countries, ` +
    `last updated ${data.lastUpdated})`
);
