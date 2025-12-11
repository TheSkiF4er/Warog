/**
 * Примитивная кнопка Warog, отрисовываемая на сервере.
 */
export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'ghost';
}

export function Button(props: ButtonProps): string {
  const variantClass = props.variant === 'ghost' ? 'wg-btn-ghost' : 'wg-btn-primary';
  return `<button class="wg-btn ${variantClass}">${props.label}</button>`;
}
