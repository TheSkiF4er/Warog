/**
 * Серверный адаптер Warog для Node.js (Express-подобный хэндлер).
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { renderToString } from '@warog/runtime-client';

export async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const html = renderToString('<div id="app">Warog — пример Node адаптера</div>');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}
