import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseDocument } from 'yaml';

import { validateViewport } from './viewport.js';
export {
  DEFAULT_VIEWPORT,
  validateViewport,
  parseViewport,
  resolveViewport,
} from './viewport.js';

/** Find the nearest project config, starting at the working directory. */
export async function loadConfig(cwd = process.cwd()) {
  let directory = resolve(cwd);
  for (;;) {
    const filename = resolve(directory, 'nofi.config.yaml');
    let source;
    try {
      source = await readFile(filename, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (source !== undefined) {
      const doc = parseDocument(source, { uniqueKeys: true });
      if (doc.errors.length)
        throw new Error(`${filename}: ${doc.errors[0].message}`);
      const config = doc.toJS({ maxAliasCount: 0 });
      if (!config || typeof config !== 'object' || Array.isArray(config))
        throw new Error(`${filename}: config must be a mapping.`);
      for (const key of Object.keys(config))
        if (!['viewport', 'theme'].includes(key))
          throw new Error(`${filename}: unknown config field "${key}".`);
      if (config.viewport !== undefined)
        config.viewport = validateViewport(config.viewport);
      if (config.theme !== undefined) {
        if (typeof config.theme !== 'string' || !config.theme.trim())
          throw new Error(`${filename}: theme must be a non-empty string.`);
        if (!['wireframe', 'blueprint'].includes(config.theme))
          config.theme = resolve(directory, config.theme);
      }
      return config;
    }
    const parent = dirname(directory);
    if (parent === directory) return {};
    directory = parent;
  }
}
