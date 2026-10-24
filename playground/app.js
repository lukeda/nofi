import { highlightNofi } from './highlight.js';
import { renderPreview } from './render.js';
import { defaults, examples } from './generated.js';

const $ = (id) => document.getElementById(id);
const editor = $('source');
const picker = $('example');
const preset = $('preset');
const widthInput = $('width');
const heightInput = $('height');
const theme = $('theme');
const drafts = new Map();
let current = examples[0]?.filename;
let rendered;
let renderedSource;
let revision = 0;
let timer;

function syncHighlight() {
  $('highlight-code').innerHTML = highlightNofi(editor.value) + '\n';
  $('highlight').scrollTop = editor.scrollTop;
  $('highlight').scrollLeft = editor.scrollLeft;
}
editor.addEventListener('scroll', () => {
  $('highlight').scrollTop = editor.scrollTop;
  $('highlight').scrollLeft = editor.scrollLeft;
});

function fitPreview() {
  if (!rendered) return;
  const [width, height] = rendered.viewport;
  const stage = $('stage');
  const scale = Math.max(
    0.01,
    Math.min(
      1,
      (stage.clientWidth - 64) / width,
      (stage.clientHeight - 64) / height,
    ),
  );
  const frame = $('preview');
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.style.transform = `scale(${scale})`;
  $('viewport-shell').style.width = `${width * scale}px`;
  $('viewport-shell').style.height = `${height * scale}px`;
}

function saveDraft() {
  drafts.set(current, editor.value);
  try {
    localStorage.setItem(
      'nofi-playground-v2',
      JSON.stringify({
        filename: current,
        source: editor.value,
        preset: preset.value,
        width: widthInput.value,
        height: heightInput.value,
        theme: theme.value,
      }),
    );
  } catch {
    /* Editing still works if storage is unavailable. */
  }
}

async function update() {
  syncHighlight();
  clearTimeout(timer);
  const request = ++revision;
  $('download-html').disabled = true;
  $('download-source').disabled = true;
  const source = editor.value;
  try {
    if (source.length > 100000)
      throw new Error('Keep mockups under 100,000 characters.');
    const viewport =
      preset.value === 'default'
        ? undefined
        : [Number(widthInput.value), Number(heightInput.value)];
    const result = await renderPreview(source, {
      viewport,
      theme: theme.value,
      defaults,
      filename: current,
    });
    if (request !== revision) return;
    rendered = result;
    renderedSource = source;
    widthInput.value = result.viewport[0];
    heightInput.value = result.viewport[1];
    $('preview').srcdoc = result.html;
    $('preview').title = result.title;
    $('error-panel').hidden = true;
    $('download-html').disabled = false;
    $('download-source').disabled = false;
    fitPreview();
    saveDraft();
  } catch (error) {
    if (request !== revision) return;
    $('error').textContent = error.message;
    $('error-panel').hidden = false;
  }
}

function queueUpdate() {
  syncHighlight();
  // Invalidate an in-flight compile immediately, before the debounce expires.
  revision++;
  clearTimeout(timer);
  $('download-html').disabled = true;
  $('download-source').disabled = true;
  saveDraft();
  timer = setTimeout(update, 250);
}

editor.addEventListener('input', queueUpdate);
editor.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    editor.setRangeText(
      '  ',
      editor.selectionStart,
      editor.selectionEnd,
      'end',
    );
    queueUpdate();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    update();
  }
});
picker.addEventListener('change', () => {
  drafts.set(current, editor.value);
  current = picker.value;
  editor.value =
    drafts.get(current) ??
    examples.find((example) => example.filename === current).source;
  update();
});
preset.addEventListener('change', () => {
  if (preset.value.includes('x'))
    [widthInput.value, heightInput.value] = preset.value.split('x');
  update();
});
for (const input of [widthInput, heightInput])
  input.addEventListener('input', () => {
    preset.value = 'custom';
    queueUpdate();
  });
$('rotate').addEventListener('click', () => {
  [widthInput.value, heightInput.value] = [heightInput.value, widthInput.value];
  preset.value = 'custom';
  update();
});
theme.addEventListener('change', update);
new ResizeObserver(fitPreview).observe($('stage'));

function download(contents, extension, type) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([contents], { type }));
  link.href = url;
  link.download = `${current.replace(/\.pug$/, '')}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('download-html').addEventListener('click', () => {
  if (rendered) download(rendered.html, 'html', 'text/html');
});
$('download-source').addEventListener('click', () => {
  if (rendered) download(renderedSource, 'pug', 'text/plain');
});

picker.replaceChildren(
  ...examples.map((example) => {
    const option = document.createElement('option');
    option.value = example.filename;
    option.textContent = example.title;
    return option;
  }),
);
editor.value = examples[0].source;
theme.value = ['wireframe', 'blueprint'].includes(defaults.theme)
  ? defaults.theme
  : 'wireframe';
try {
  const currentDraft = localStorage.getItem('nofi-playground-v2');
  const saved = JSON.parse(
    currentDraft ?? localStorage.getItem('nofi-playground-v1'),
  );
  if (saved && !currentDraft) {
    saved.filename = saved.filename?.replace(/\.nofi$/, '.pug');
    if (typeof saved.source === 'string')
      saved.source = saved.source.replace(
        /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
        '',
      );
    if (saved.preset === 'source') saved.preset = 'custom';
  }
  if (
    saved &&
    examples.some((example) => example.filename === saved.filename) &&
    typeof saved.source === 'string'
  ) {
    current = saved.filename;
    picker.value = current;
    editor.value = saved.source;
    if ([...preset.options].some((option) => option.value === saved.preset))
      preset.value = saved.preset;
    widthInput.value = saved.width;
    heightInput.value = saved.height;
    if (['wireframe', 'blueprint'].includes(saved.theme))
      theme.value = saved.theme;
  }
} catch {
  /* Ignore unavailable or stale local storage. */
}
editor.disabled = false;
picker.disabled = false;
update();
