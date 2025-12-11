/**
 * @module @warog/compiler
 *
 * Упрощённый компилятор Warog.
 * Цель: показать общий контракт компиляции .wg.tsx файлов.
 */

export interface CompileResult {
  html: string;
  artifact: string;
  clientModule: string;
}

/**
 * Заглушка компилятора: преобразует исходник в простой HTML,
 * артефакт и минимальный клиентский модуль.
 */
export function compileSource(source: string): CompileResult {
  const escaped = source.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<div id="app">${escaped}</div>`;
  const artifact = JSON.stringify({ signals: {} });
  const clientModule = `// клиентский модуль-заглушка Warog\nconsole.log('Warog client bootstrap');`;
  return { html, artifact, clientModule };
}
