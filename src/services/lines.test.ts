import { describe, expect, it } from 'vitest';
import { createLines } from './lines';

describe('dialogue lines by id', () => {
  it('gives the text of a recorded line', () => {
    const line = createLines({ 'ch0.1.sauce.00': 'Esos dos llevan toda la tarde mirándose.' });
    expect(line('ch0.1.sauce.00')).toBe('Esos dos llevan toda la tarde mirándose.');
  });

  it('shows the id of a line not written yet (greybox), so the playtest sees where it goes', () => {
    expect(createLines({})('ch4.1.sauce.01')).toBe('⟨ch4.1.sauce.01⟩');
  });
});
