/**
 * DOM-адаптер: монтирование Warog-приложения в DOM.
 */
export function mount(selector: string): void {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) {
    console.warn('[Warog] Элемент для монтирования не найден:', selector);
    return;
  }
  root.dataset.warogMounted = '1';
}
