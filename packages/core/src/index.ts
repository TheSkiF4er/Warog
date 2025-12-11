/**
 * @module @warog/core
 *
 * Ядро рантайма Warog:
 * - Signal: простая реактивная ячейка состояния.
 * - effect: побочные эффекты, зависящие от сигналов.
 * - schedule: простой батч-планировщик задач.
 */

export type Subscriber = () => void;

/**
 * Класс Signal инкапсулирует значение и список подписчиков.
 * Изменение значения уведомляет всех подписчиков.
 */
export class Signal<T> {
  private _value: T;
  private subs: Set<Subscriber> = new Set();

  constructor(initial: T) {
    this._value = initial;
  }

  get value(): T {
    return this._value;
  }

  set value(next: T) {
    if (Object.is(next, this._value)) return;
    this._value = next;
    this.notify();
  }

  subscribe(fn: Subscriber): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  private notify() {
    for (const fn of Array.from(this.subs)) {
      try {
        fn();
      } catch (e) {
        console.error('[Warog] Ошибка в подписчике Signal:', e);
      }
    }
  }
}

/**
 * Функция-обёртка для удобного создания Signal.
 */
export function signal<T>(initial: T): Signal<T> {
  return new Signal<T>(initial);
}

/**
 * Минималистичный effect: выполняет переданную функцию
 * и возвращает очистку (если она есть).
 */
export function effect(fn: () => void | (() => void)): () => void {
  let cleanup: void | (() => void) | undefined;
  try {
    cleanup = fn();
  } catch (e) {
    console.error('[Warog] Ошибка в effect:', e);
  }
  return () => {
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (e) {
        console.error('[Warog] Ошибка в очистке effect:', e);
      }
    }
  };
}

/**
 * Простейший батч-планировщик на основе microtask.
 */
let scheduled = false;
const queue = new Set<() => void>();

export function schedule(task: () => void): void {
  queue.add(task);
  if (!scheduled) {
    scheduled = true;
    Promise.resolve().then(flush);
  }
}

function flush() {
  for (const fn of Array.from(queue)) {
    try {
      fn();
    } catch (e) {
      console.error('[Warog] Ошибка в задаче планировщика:', e);
    }
  }
  queue.clear();
  scheduled = false;
}

/**
 * Упрощённый сериализатор состояния сигналов.
 * В реальном проекте может быть заменён на более компактный формат.
 */
export function serializeSignals(obj: Record<string, unknown>): string {
  const plain: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    plain[key] = value instanceof Signal ? value.value : value;
  }
  return JSON.stringify(plain);
}

export function deserializeSignals(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
