import { describe, expect, it } from 'vitest';
import { err, ok, unwrap } from './result';

describe('Result', () => {
  it('ok wraps a value', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
  });

  it('err wraps an error', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });

  it('unwrap returns the value of an ok result', () => {
    expect(unwrap(ok('seed'))).toBe('seed');
  });

  it('unwrap throws on an err result, including the error in the message', () => {
    expect(() => unwrap(err({ code: 'selfLoop' }))).toThrow(/selfLoop/);
  });
});
