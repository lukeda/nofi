import lex from 'pug-lexer';
import parse from 'pug-parser';
import { parseExpressionAt } from 'acorn';
import { titleFromFilename, validateTitle } from './labels.js';
import { resolveViewport } from './viewport.js';

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
}

const tags = new Set(
  'body main header footer nav aside section article div span p h1 h2 h3 h4 h5 h6 button input label textarea select option form fieldset legend a ul ol li table thead tbody tfoot tr th td figure figcaption hr br strong em small b i s code pre blockquote details summary progress meter'.split(
    ' ',
  ),
);
const voidTags = new Set(['input', 'hr', 'br']);

function literal(value) {
  if (value === true) return true;
  const node = parseExpressionAt(value, 0, { ecmaVersion: 'latest' });
  if (
    node.type !== 'Literal' ||
    node.regex ||
    node.bigint ||
    value.slice(node.end).trim()
  ) {
    throw new Error(
      'Attributes must be quoted strings, numbers, or booleans. JavaScript expressions are not supported.',
    );
  }
  return node.value;
}

function renderNode(node, classes) {
  if (node.type === 'Block')
    return node.nodes.map((n) => renderNode(n, classes)).join('');
  if (node.type === 'Text') return escapeHtml(node.val);
  if (node.type === 'Comment') return '';
  if (
    node.type !== 'Tag' ||
    !tags.has(node.name) ||
    node.selfClosing ||
    node.attributeBlocks?.length
  ) {
    throw new Error(
      `Line ${node.line ?? '?'}: unsupported ${node.type === 'Tag' ? `tag or syntax "${node.name}"` : node.type}. Use declarative HTML markup.`,
    );
  }
  const attrs = new Map();
  for (const attr of node.attrs) {
    if (
      !/^(class|id|title|role|type|name|value|placeholder|disabled|checked|selected|multiple|required|readonly|for|rows|cols|min|max|step|open|colspan|rowspan|aria-[\w-]+|data-[\w-]+)$/.test(
        attr.name,
      )
    ) {
      throw new Error(
        `Line ${node.line}: unsupported attribute "${attr.name}".`,
      );
    }
    const value = literal(attr.val);
    if (attr.name === 'class') {
      const tokens = String(value).split(/\s+/).filter(Boolean);
      tokens.forEach((token) => classes.add(token));
      attrs.set(
        'class',
        [attrs.get('class'), ...tokens].filter(Boolean).join(' '),
      );
    } else attrs.set(attr.name, value);
  }
  const attributes = [...attrs]
    .map(([name, value]) =>
      value === false || value == null
        ? ''
        : value === true
          ? ` ${name}`
          : ` ${name}="${escapeHtml(value)}"`,
    )
    .join('');
  const content = renderNode(node.block, classes);
  if (voidTags.has(node.name) && content)
    throw new Error(
      `Line ${node.line}: ${node.name} cannot contain text or children.`,
    );
  return `<${node.name}${attributes}>${voidTags.has(node.name) ? '' : `${content}</${node.name}>`}`;
}

function parseSource(
  source,
  {
    filename = 'mockup.pug',
    title = titleFromFilename(filename),
    viewport: override,
    defaults = {},
  } = {},
) {
  source = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (/^---(?:\n|$)/.test(source))
    throw new Error(
      `${filename}: use plain Pug; remove the YAML frontmatter and pass labels or dimensions through options.`,
    );
  validateTitle(title);
  const viewport = resolveViewport({ override, fallback: defaults.viewport });
  if (!source.trim()) throw new Error('The mockup must contain markup.');
  const ast = parse(lex(source, { filename }), { filename });
  const classes = new Set();
  // A body may wrap the document, but cannot be nested or mixed with siblings.
  const roots = ast.nodes.filter((n) => n.type !== 'Comment');
  function checkBody(node, top = false) {
    if (
      node.type === 'Tag' &&
      node.name === 'body' &&
      (!top || roots.length !== 1)
    )
      throw new Error('body must be the only root element.');
    if (node.block) checkBody(node.block);
    if (node.nodes) node.nodes.forEach((n) => checkBody(n));
  }
  roots.forEach((node) => checkBody(node, true));
  const html = renderNode(ast, classes);
  return {
    title,
    viewport,
    html: roots[0]?.name === 'body' ? html : `<body>${html}</body>`,
    classes: [...classes],
  };
}

/** Preserve Pug diagnostics while explaining the common Tailwind shorthand trap. */
export function parseNofi(source, options = {}) {
  try {
    return parseSource(source, options);
  } catch (error) {
    if (typeof source !== 'string') throw error;
    const line = error.line ?? Number(error.message.match(/^Line (\d+):/)?.[1]);
    const text = source.replace(/^\uFEFF/, '').split(/\r?\n/)[line - 1] ?? '';
    // Examine only the tag/class prefix, never text or quoted attributes.
    const shorthand =
      text.match(/^\s*(?:[a-z][\w-]*)?([.#][^\s(]+)/i)?.[1] ?? '';
    if (
      error.code === 'PUG:INVALID_CLASS_NAME' ||
      /\.\d|\/[\w[]|\[|:[\w-]/.test(shorthand)
    ) {
      error.message +=
        '\nHint: Tailwind classes containing punctuation cannot use Pug dot shorthand. Move them into a quoted class attribute, e.g. span.rounded-full(class="py-0.5 w-2/3 text-[13px] md:flex-row bg-primary/10"). Keep simple classes such as .text-xs in shorthand.';
    }
    throw error;
  }
}
