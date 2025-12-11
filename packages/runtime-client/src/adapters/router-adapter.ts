/**
 * Простейший клиентский роутер на базе History API.
 */
export function navigate(path: string): void {
  if (window.location.pathname === path) return;
  history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
