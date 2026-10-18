import { diagramButton, part } from './parts';

/**
 * A row of buttons of which one is chosen, like the views of the pond: each says whether it is
 * pressed, so a screen reader and the eye both know which view is shown.
 */

/** A view a button chooses: its id and its label. */
export interface ViewChoice {
  readonly id: string;
  readonly label: string;
}

/** The row of `choices`, calling `onChoose` with a choice's id when its button is pressed. */
export function viewButtons(
  page: Document,
  choices: readonly ViewChoice[],
  onChoose: (id: string) => void,
): { readonly bar: HTMLElement; choose(id: string): void } {
  const bar = part(page, 'div', 'dg-bar dg-views');
  const buttons = choices.map((choice) => {
    const button = diagramButton(page, choice.label, () => onChoose(choice.id));
    button.dataset['view'] = choice.id;
    return button;
  });
  bar.append(...buttons);
  return {
    bar,
    choose(id) {
      for (const button of buttons) {
        button.setAttribute('aria-pressed', String(button.dataset['view'] === id));
      }
    },
  };
}
