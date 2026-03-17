import test from 'node:test';
import assert from 'node:assert/strict';

import { ErrorBoundary, hydrate, jsx, type WarogChild } from '@warog/dom';
import { createClientOnly, createServerOnly, renderToStream, renderToString } from './index.js';

test('renderToString renders html, escapes text and respects void tags', () => {
  const node: WarogChild = {
    type: 'main',
    props: {
      className: 'app',
      children: [
        { type: 'h1', props: { children: 'Warog' } },
        { type: 'input', props: { value: 'x', disabled: true } },
        { type: 'p', props: { children: '<safe>' } }
      ]
    }
  } as unknown as WarogChild;

  const html = renderToString(node);
  assert.equal(html, '<main class="app"><h1>Warog</h1><input value="x" disabled><p>&lt;safe&gt;</p></main>');
});

test('SSR boundaries and markers render safely', () => {
  const ClientChart = createClientOnly(() => jsx('div', { children: 'client chart' }), jsx('p', { children: 'loading chart' }), 'ClientChart');
  const ServerInfo = createServerOnly(() => jsx('strong', { children: 'server data' }));
  const Boom = () => {
    throw new Error('boom');
  };

  const html = renderToString(
    jsx('section', {
      children: [
        jsx(ClientChart, {}),
        jsx(ServerInfo, {}),
        jsx(ErrorBoundary as never, { fallback: jsx('p', { children: 'recovered' }), children: jsx(Boom, {}) })
      ]
    })
  );

  assert.match(html, /<!--warog-client-only:ClientChart--><p>loading chart<\/p>/);
  assert.match(html, /<strong>server data<\/strong>/);
  assert.match(html, /<p>recovered<\/p>/);
});

test('renderToStream yields html chunks', async () => {
  const stream = renderToStream(jsx('div', { children: 'streamed' }));
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  assert.equal(chunks.join(''), '<div>streamed</div>');
  assert.ok(chunks.length >= 1);
});
