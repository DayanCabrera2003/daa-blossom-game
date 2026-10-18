import type { Translate } from '@services/i18n';
import type { PondPiece, PondView } from './pondPicture';

/**
 * What the pond of C3 says under its garden (plan 07, phase 5): how many lanterns each side lights
 * while the gardens are shown whole, and, once the tangle is parted, each thread and loop with the
 * lanterns of each side on it and who wins it: a thread the reflection wins by one is a chain of
 * yours (Berge's lemma, in the garden's words). The texts are keys of `strings.json`.
 */
export function pondWords(
  view: PondView,
  pieces: readonly PondPiece[],
  lanterns: { readonly yours: number; readonly mirror: number },
  names: readonly string[],
  t: Translate,
): string[] {
  if (view !== 'pieces') return [t('diagram.pond.count', lanterns)];
  if (pieces.length === 0) return [t('diagram.pond.none')];
  return pieces.map((piece) => {
    const path = piece.sprouts.map((v) => names[v] ?? String(v)).join('–');
    const counted = t(`diagram.pond.${piece.kind}`, {
      path,
      yours: piece.yours,
      mirror: piece.mirror,
    });
    const verdict =
      piece.gain > 0
        ? t('diagram.pond.gain', { gain: piece.gain })
        : piece.gain === 0
          ? t('diagram.pond.tie')
          : t('diagram.pond.loss', { gain: -piece.gain });
    return `${counted} ${verdict}`;
  });
}
