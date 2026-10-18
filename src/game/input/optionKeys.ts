/**
 * The digits answer the question on screen (plan 09, phase 4), as a touch on an option would. A
 * bet's options are numbers, so a digit picks the option written as that number ("0" is "none");
 * written answers are counted from 1 in the order they are shown. Pure: the level scene presses the
 * option this names.
 */

/** Whether a label is a whole number written plainly. */
const isNumber = (label: string): boolean => /^\d+$/.test(label);

/** The index of the option `key` picks among options labelled `labels`, or null for none. */
export function optionForKey(key: string, labels: readonly string[]): number | null {
  if (!/^\d$/.test(key) || labels.length === 0) return null;
  if (labels.every(isNumber)) {
    const found = labels.indexOf(key);
    return found < 0 ? null : found;
  }
  const index = Number(key) - 1;
  return index >= 0 && index < labels.length ? index : null;
}
