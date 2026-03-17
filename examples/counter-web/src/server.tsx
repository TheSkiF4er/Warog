/** @jsxImportSource @warog/dom */
import { renderToString } from '@warog/ssr';
import { App } from './app.js';

export function renderDemoDocument(): string {
  const appHtml = renderToString(<App />);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Warog SSR Demo</title>
  </head>
  <body>
    <div id="app">${appHtml}</div>
    <script type="module" src="./index.js"></script>
  </body>
</html>`;
}
