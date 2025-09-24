#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith('--')) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

const defaultTemplate = resolve(dirname(fileURLToPath(import.meta.url)), 'apigw-openapi.yaml');
const defaultOutput = resolve(dirname(dirname(fileURLToPath(import.meta.url))), 'apigw-openapi.resolved.yaml');

const [,, templateArg, outputArg, ...rest] = process.argv;
const options = parseArgs(rest);

const templatePath = resolve(templateArg || defaultTemplate);
const outputPath = resolve(outputArg || defaultOutput);

const functionId = options['function-id'] || process.env.FUNCTION_ID || process.env.YC_FUNCTION_ID;

if (!functionId) {
  console.error('render-apigw: --function-id (or FUNCTION_ID env) is required');
  process.exitCode = 1;
  process.exit(1);
}

const serviceAccountId = options['service-account-id']
  || process.env.FUNCTION_INVOKER_SA_ID
  || process.env.YC_FUNCTION_INVOKER_SA_ID
  || '';

let contents = readFileSync(templatePath, 'utf8');
contents = contents.replaceAll('${FUNCTION_ID}', functionId);

if (serviceAccountId) {
  contents = contents.replaceAll('${FUNCTION_INVOKER_SA_ID}', serviceAccountId);
} else {
  const serviceAccountLine = /.*\$\{FUNCTION_INVOKER_SA_ID\}.*\n?/g;
  contents = contents.replaceAll(serviceAccountLine, '');
}

writeFileSync(outputPath, contents, 'utf8');

console.log(`Rendered API Gateway specification to ${outputPath}`);
