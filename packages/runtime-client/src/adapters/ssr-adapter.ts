/**
 * SSR-адаптер: обёртка над HTML, чтобы отдать готовую страницу.
 */
export function renderToString(html: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/><title>Warog</title></head><body>${html}</body></html>`;
}
