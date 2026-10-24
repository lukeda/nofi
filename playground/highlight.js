import lex from 'pug-lexer';
import { escapeHtml } from '../src/parse.js';

const tokenTypes = {
  tag: 'tag',
  class: 'class',
  id: 'class',
  text: 'text',
  comment: 'comment',
  'start-attributes': 'punctuation',
  'end-attributes': 'punctuation',
};
const span = (type, value) =>
  `<span class="syntax-${type}">${escapeHtml(value)}</span>`;

function highlightPug(source, recover = true) {
  let tokens;
  try {
    tokens = lex(source);
  } catch {
    if (!recover) return escapeHtml(source);
    // A half-written attribute must not remove highlighting from other lines.
    return source
      .split('\n')
      .map((line) => {
        const indentation = line.match(/^\s*/)[0];
        return (
          escapeHtml(indentation) +
          highlightPug(line.slice(indentation.length), false)
        );
      })
      .join('\n');
  }
  const starts = [0];
  for (let i = 0; i < source.length; i++)
    if (source[i] === '\n') starts.push(i + 1);
  const offset = (location) => starts[location.line - 1] + location.column - 1;
  let cursor = 0;
  let html = '';
  for (const token of tokens) {
    if (!(token.type in tokenTypes) && token.type !== 'attribute') continue;
    const start = offset(token.loc.start);
    const end = offset(token.loc.end);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < cursor ||
      end <= start
    )
      continue;
    html += escapeHtml(source.slice(cursor, start));
    const raw = source.slice(start, end);
    if (token.type === 'attribute') {
      const equals = raw.indexOf('=');
      html +=
        equals === -1
          ? span('attribute', raw)
          : span('attribute', raw.slice(0, equals)) +
            span('punctuation', '=') +
            span('string', raw.slice(equals + 1));
    } else html += span(tokenTypes[token.type], raw);
    cursor = end;
  }
  return html + escapeHtml(source.slice(cursor));
}

/** Highlight for display only. Rendering still uses the validated nofi parser. */
export function highlightNofi(source) {
  if (source.length > 100000) return escapeHtml(source);
  return highlightPug(source);
}
