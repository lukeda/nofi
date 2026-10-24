/** Human-readable labels without coupling mockup source to board metadata. */
export function titleFromFilename(filename = 'mockup.pug') {
  const name = String(filename)
    .split(/[\\/]/)
    .pop()
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_\s]+/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return name ? name[0].toUpperCase() + name.slice(1) : 'Mockup';
}

export function validateTitle(title) {
  if (typeof title !== 'string' || !title.trim())
    throw new Error('title must be a non-empty string.');
  return title;
}

export function validateNames(names, count) {
  if (!Array.isArray(names) || names.length !== count)
    throw new Error(
      'names must be an array with one label per input file, in input order.',
    );
  names.forEach(validateTitle);
  return names;
}
