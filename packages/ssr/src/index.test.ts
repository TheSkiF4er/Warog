import test from 'node:test';
import assert from 'node:assert/strict';

import type { WarogChild } from '@warog/dom';
import { renderToString } from './index.js';

test('renderToString renders html', () => {
  const node: WarogChild = {
    type: 'main',
    props: {
      className: 'app',
      children: [
        { type: 'h1', props: { children: 'Warog' } },
        { type: 'button', props: { disabled: true, children: 'Launch' } }
      ]
    }
  } as unknown as WarogChild;

  const html = renderToString(node);
  assert.equal(html, '<main class="app"><h1>Warog</h1><button disabled>Launch</button></main>');
});

test('renderToString escapes text and supports function components', () => {
  const App = () => ({ type: 'p', props: { children: '<safe>' } }) as unknown as WarogChild;
  const node: WarogChild = { type: App, props: {} } as unknown as WarogChild;
  assert.equal(renderToString(node), '<p>&lt;safe&gt;</p>');
});
