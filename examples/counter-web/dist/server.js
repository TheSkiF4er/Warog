import { jsx as _jsx } from "@warog/dom/jsx-runtime";
/** @jsxImportSource @warog/dom */
import { renderToString } from '@warog/ssr';
import { App } from './app.js';
export function renderDemoDocument() {
    const appHtml = renderToString(_jsx(App, {}));
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
//# sourceMappingURL=server.js.map