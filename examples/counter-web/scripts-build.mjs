import { cpSync, mkdirSync } from 'node:fs';

mkdirSync(new URL('./dist/vendor/', import.meta.url), { recursive: true });
cpSync(new URL('../../packages/core/dist/index.js', import.meta.url), new URL('./dist/vendor/core.js', import.meta.url));
cpSync(new URL('../../packages/dom/dist/index.js', import.meta.url), new URL('./dist/vendor/dom.js', import.meta.url));
