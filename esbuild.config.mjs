import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import fs from 'fs';

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins
  ],
  format: 'cjs',
  target: 'es2020',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outdir: 'dist',
  minify: prod,
});

// Copy manifest.json and styles.css to dist
fs.mkdirSync('dist', { recursive: true });
fs.copyFileSync('manifest.json', 'dist/manifest.json');
if (fs.existsSync('styles.css')) {
  fs.copyFileSync('styles.css', 'dist/styles.css');
}

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
