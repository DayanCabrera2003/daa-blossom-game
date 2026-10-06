import { describe, expect, it } from 'vitest';
import { formatTable } from '../tools/formatTable';

describe('plain text tables', () => {
  it('right-aligns every column under its header', () => {
    expect(
      formatTable(
        ['n', 'recipe', 'Bruto'],
        [
          ['6', '120', '68'],
          ['64', '3519', 'asleep'],
        ],
      ),
    ).toBe(['   n  recipe   Bruto', '   6     120      68', '  64    3519  asleep'].join('\n'));
  });

  it('a table with no rows is just its header', () => {
    expect(formatTable(['a'], [])).toBe('  a');
  });
});
