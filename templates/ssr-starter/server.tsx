/** @jsxImportSource @warog/dom */
import { renderToString } from '@warog/ssr';
import { App } from './app.js';

export const html = renderToString(<App />);
