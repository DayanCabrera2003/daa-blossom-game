import strings from '@content/es/strings.json';
import { describe, expect, it } from 'vitest';
import { orderButtons } from './orderButtons';

const text = strings as Readonly<Record<string, string>>;
const order = (): null => null;

describe("the buttons of the free mode's orders", () => {
  it('the gardener first, then the certificate, each only when the player has it', () => {
    expect(orderButtons({ solve: order, certify: order })).toEqual([
      { kind: 'solve', label: 'sandbox.solve' },
      { kind: 'certify', label: 'sandbox.certify' },
    ]);
    expect(orderButtons({ solve: null, certify: order })).toEqual([
      { kind: 'certify', label: 'sandbox.certify' },
    ]);
    expect(orderButtons({ solve: null, certify: null })).toEqual([]);
  });

  it('every label has its text', () => {
    for (const { label } of orderButtons({ solve: order, certify: order })) {
      expect(text[label]).toBeDefined();
    }
  });
});
