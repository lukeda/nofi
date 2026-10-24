import { parseNofi } from '../src/parse.js';
import { renderDocument } from '../src/document.js';
import base from '../themes/wireframe.css';
import blueprint from '../themes/blueprint.css';
import theme from 'tailwindcss/theme.css';
import preflight from 'tailwindcss/preflight.css';

const stylesheets = {
  'tailwindcss/theme.css': theme,
  'tailwindcss/preflight.css': preflight,
};

export async function renderPreview(
  source,
  { viewport, theme = 'wireframe', defaults = {}, filename, title } = {},
) {
  return renderDocument(
    parseNofi(source, { viewport, defaults, filename, title }),
    {
      base,
      extra: theme === 'blueprint' ? blueprint : '',
      loadStylesheet: async (id) => {
        if (!(id in stylesheets))
          throw new Error(`Unsupported stylesheet: ${id}`);
        return { path: id, base: '', content: stylesheets[id] };
      },
    },
  );
}
