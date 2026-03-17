import { cpSync, mkdirSync, writeFileSync } from 'node:fs';

mkdirSync(new URL('./dist/vendor/', import.meta.url), { recursive: true });
cpSync(new URL('../../packages/core/dist/index.js', import.meta.url), new URL('./dist/vendor/core.js', import.meta.url));
cpSync(new URL('../../packages/dom/dist/index.js', import.meta.url), new URL('./dist/vendor/dom.js', import.meta.url));
cpSync(new URL('../../packages/ssr/dist/index.js', import.meta.url), new URL('./dist/vendor/ssr.js', import.meta.url));

const { renderDemoDocument } = await import(new URL('./dist/server.js', import.meta.url));
writeFileSync(new URL('./dist/ssr.html', import.meta.url), renderDemoDocument(), 'utf8');
