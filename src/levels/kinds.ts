import type { SproutKind } from './fields';

/** A vine between two sprouts of the same kind: two bees or two flowers. */
export interface KindClash {
  readonly u: string;
  readonly v: string;
  readonly kind: SproutKind;
}

/**
 * The vines of a garden of bees and flowers that join two of a kind (GDD, chapter 3: a bee only
 * pairs with a flower). A garden whose sprouts are neither has none. The declared kinds are checked
 * vine by vine instead of asking the core whether some two-colouring exists (`bipartition`): a
 * garden may be two-sided and still have its bees and flowers written on the wrong sprouts, and the
 * player sees the written kinds, not a colouring. Names the schema does not know are left to the
 * garden builder, which refuses them on its own.
 */
export function sameKindVines(
  sprouts: readonly { readonly label: string; readonly kind?: SproutKind | undefined }[],
  vines: readonly (readonly [string, string])[],
): KindClash[] {
  const kindOf = new Map(sprouts.map((sprout) => [sprout.label, sprout.kind]));
  const clashes: KindClash[] = [];
  for (const [u, v] of vines) {
    const kind = kindOf.get(u);
    if (kind !== undefined && kind === kindOf.get(v)) clashes.push({ u, v, kind });
  }
  return clashes;
}
