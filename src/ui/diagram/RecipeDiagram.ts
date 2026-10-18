import { itemAt } from '@core/shared/itemAt';
import { cardTextKey } from '@levels/recipeCards';
import type { Translate } from '@services/i18n';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import type { GardenDiagramSpec } from '@ui/model/diagramSpec';
import { recipeCards, type RecipeStep } from '@ui/model/recipePicture';
import { part } from './parts';
import { replayDiagram } from './ReplayDiagram';

/**
 * The recipe of C10 card by card (plan 07, phase 5; level 6.2): the day of the mechanical gardener
 * under the sun, and right under its controls the card it follows at the step shown, kept in sight
 * with the garden; below what happened, the whole right recipe with that card lit. The cards'
 * texts are the game's own (`recipe.card.*`).
 */
export function recipeDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  spec: GardenDiagramSpec,
  steps: readonly RecipeStep[],
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const following = part(page, 'div', 'dg-card');
  following.setAttribute('aria-live', 'polite');
  const lead = part(page, 'p', 'dg-card-lead');
  const card = part(page, 'p', 'dg-card-text');
  following.append(lead, card);
  const whole = part(page, 'div', 'dg-recipe-whole dg-aside');
  const list = part(page, 'ol', 'dg-recipe-list');
  const rows = recipeCards().map((id) => {
    const row = part(page, 'li', 'dg-recipe-card', t(cardTextKey(id)));
    row.dataset['card'] = id;
    return row;
  });
  list.append(...rows);
  whole.append(part(page, 'p', 'dg-card-lead', t('diagram.recipe.whole')), list);

  replayDiagram(hole, garden, spec, steps, t, {
    parts: [following],
    below: [whole],
    onShow: (k) => {
      const active = itemAt(steps, k).card;
      lead.textContent = t(active === null ? 'diagram.recipe.dawn' : 'diagram.recipe.following');
      card.textContent = active === null ? '' : t(cardTextKey(active));
      for (const row of rows) {
        if (row.dataset['card'] === active) row.setAttribute('aria-current', 'step');
        else row.removeAttribute('aria-current');
      }
    },
  });
}
