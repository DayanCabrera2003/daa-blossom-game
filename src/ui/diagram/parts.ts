/**
 * The small DOM parts every diagram of the Codex is built from: an element with its class and
 * text, and a wooden button of the book.
 */

/** A new element of `tag`, with a class and maybe a text. */
export function part<K extends keyof HTMLElementTagNameMap>(
  page: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = page.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** A button of a diagram, labelled `text`, that calls `onPress`. */
export function diagramButton(
  page: Document,
  text: string,
  onPress: () => void,
): HTMLButtonElement {
  const button = part(page, 'button', 'dg-button', text);
  button.type = 'button';
  button.addEventListener('click', onPress);
  return button;
}
