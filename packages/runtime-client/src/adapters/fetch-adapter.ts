/**
 * Адаптер для вызова серверных действий через fetch.
 */
export async function callAction(url: string, payload: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`[Warog] Ошибка вызова действия: ${res.status}`);
  }
  return res.json();
}
