import { isCertificate, type VictoryCondition } from '@core/rules/victory';

/**
 * The text key of the button that ends a level, by the level's victory (GDD §5.2): «Presentar»
 * where the player presents a certificate (scarecrows or stones), "Terminé" where the player claims
 * the lanterns or the search can do no better, and where no victory is judged.
 */
export const doneButton = (victory: VictoryCondition | undefined): 'hud.present' | 'hud.done' =>
  victory !== undefined && isCertificate(victory) ? 'hud.present' : 'hud.done';
