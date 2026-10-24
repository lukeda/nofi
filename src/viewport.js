export const DEFAULT_VIEWPORT = Object.freeze([640, 480]);

export function validateViewport(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value.some((n) => !Number.isInteger(n) || n < 1 || n > 4096)
  ) {
    throw new Error(
      'viewport must be [width, height], with integer dimensions from 1 to 4096.',
    );
  }
  return [...value];
}

export function parseViewport(value) {
  if (!/^\d+x\d+$/.test(value))
    throw new Error('--viewport must use WIDTHxHEIGHT, for example 640x480.');
  return validateViewport(value.split('x').map(Number));
}

export function resolveViewport({ override, fallback } = {}) {
  // Validate supplied values even when a higher-priority value overrides them.
  for (const value of [override, fallback])
    if (value !== undefined) validateViewport(value);
  return validateViewport(override ?? fallback ?? DEFAULT_VIEWPORT);
}
