import { dirname, resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { validateViewport } from './viewport.js';
import { validateTitle } from './labels.js';

/** Board file paths are relative to the manifest; stdin paths use cwd. */
export function parseBoardConfig(
  source,
  { filename = '-', cwd = process.cwd() } = {},
) {
  const base = filename === '-' ? cwd : dirname(resolve(cwd, filename));
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length)
    throw new Error(`${filename}: ${doc.errors[0].message}`);
  const config = doc.toJS({ maxAliasCount: 0 });
  function mapping(value, fields, context) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${context} must be a mapping.`);
    for (const key of Object.keys(value))
      if (!fields.includes(key))
        throw new Error(`${context}: unknown field "${key}".`);
  }
  mapping(config, ['viewport', 'theme', 'columns', 'items'], 'Board');
  if (config.viewport !== undefined)
    config.viewport = validateViewport(config.viewport);
  if (
    config.columns !== undefined &&
    (!Number.isInteger(config.columns) ||
      config.columns < 1 ||
      config.columns > 8)
  )
    throw new Error('columns must be an integer from 1 to 8.');
  if (config.theme !== undefined) {
    if (typeof config.theme !== 'string' || !config.theme.trim())
      throw new Error('theme must be a non-empty string.');
    if (!['wireframe', 'blueprint'].includes(config.theme))
      config.theme = resolve(base, config.theme);
  }
  if (!Array.isArray(config.items) || !config.items.length)
    throw new Error('Board items must be a non-empty array.');
  config.items = config.items.map((item) => {
    mapping(item, ['file', 'pug', 'name'], 'Board item');
    const hasFile = Object.hasOwn(item, 'file');
    const hasPug = Object.hasOwn(item, 'pug');
    if (hasFile === hasPug)
      throw new Error('Each board item needs exactly one of file or pug.');
    const key = hasFile ? 'file' : 'pug';
    if (typeof item[key] !== 'string' || !item[key].trim())
      throw new Error(`Board item ${key} must be a non-empty string.`);
    if (item.name !== undefined) validateTitle(item.name);
    return hasFile
      ? { file: resolve(base, item.file), name: item.name }
      : { pug: item.pug, name: item.name };
  });
  return config;
}
