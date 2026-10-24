#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { render, board, screenshot } from './index.js';
import { parseBoardConfig } from './board-config.js';
import { loadConfig, parseViewport } from './config.js';

const help = `nofi — explore layouts before building them

  nofi setup                        Install Chromium for PNG export
  nofi render <file.pug> --output <file.html|file.png>
  nofi board <files.pug...|board.yaml|-> --output <file.html|file.png>

Options:
  --title <text>       Label for a single render (default: filename)
  --viewport <WxH>     Override every mockup viewport, e.g. 390x844
  --theme <name|path>   wireframe (default), blueprint, or a CSS file
  --columns <number>   Board columns, 1–8 (default: 4)
  --output, -o <path>  Output path (default: output/mockup.html or board.html)
  --help, -h           Show help

PNG export requires: nofi setup
`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      theme: { type: 'string' },
      title: { type: 'string' },
      viewport: { type: 'string' },
      columns: { type: 'string' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || !positionals.length) {
    console.log(help);
  } else {
    const [command, ...files] = positionals;
    if (command === 'setup') {
      if (files.length || Object.keys(values).length)
        throw new Error('setup takes no arguments.');
      const require = createRequire(import.meta.url);
      const cli = resolve(
        dirname(require.resolve('playwright/package.json')),
        'cli.js',
      );
      await new Promise((resolveSetup, reject) => {
        const child = spawn(process.execPath, [cli, 'install', 'chromium'], {
          stdio: 'inherit',
        });
        child.on('error', reject);
        child.on('exit', (code) =>
          code === 0
            ? resolveSetup()
            : reject(new Error('Chromium installation failed.')),
        );
      });
    } else {
      if (!['render', 'board'].includes(command))
        throw new Error(`Unknown command: ${command}. Run nofi --help.`);
      if (!files.length || (command === 'render' && files.length !== 1))
        throw new Error(
          `${command} requires ${command === 'render' ? 'exactly one input file' : 'one or more input files'}.`,
        );
      if (values.title !== undefined && command !== 'render')
        throw new Error(
          '--title is for a single render; use board YAML for labels.',
        );
      const manifestInputs = files.filter(
        (file) => file === '-' || /\.ya?ml$/i.test(file),
      );
      let config = {};
      if (command === 'board' && manifestInputs.length) {
        if (files.length !== 1)
          throw new Error(
            'Pass one board manifest or stdin, without additional inputs.',
          );
        const filename = files[0];
        let source;
        if (filename === '-') {
          process.stdin.setEncoding('utf8');
          source = '';
          for await (const chunk of process.stdin) source += chunk;
        } else source = await readFile(filename, 'utf8');
        config = parseBoardConfig(source, { filename });
      }
      const items = config.items ?? files.map((file) => ({ file }));
      const output =
        values.output ??
        `output/${command === 'board' ? 'board' : 'mockup'}.html`;
      const extension = extname(output).toLowerCase();
      if (!['.html', '.png'].includes(extension))
        throw new Error('Output must end in .html or .png.');
      if (
        [...files, ...items.map((item) => item.file)].some(
          (file) => resolve(file) === resolve(output),
        )
      )
        throw new Error('Output must not overwrite a source file.');
      const defaults = await loadConfig();
      const viewport =
        values.viewport === undefined
          ? config.viewport
          : parseViewport(values.viewport);
      const mockups = [];
      for (const { file, name } of items)
        mockups.push({
          ...(await render(await readFile(file, 'utf8'), {
            theme: values.theme ?? config.theme,
            viewport,
            defaults,
            filename: file,
            title: values.title ?? name,
          })),
          filename: file,
        });
      const document =
        command === 'board'
          ? board(mockups, {
              columns: Number(values.columns ?? config.columns ?? 4),
            })
          : mockups[0];
      await mkdir(dirname(output), { recursive: true });
      if (extension === '.png') await screenshot(document, output);
      else await writeFile(output, document.html);
      console.log(`Rendered ${output}`);
    }
  }
} catch (error) {
  console.error(`nofi: ${error.message}`);
  process.exitCode = 1;
}
