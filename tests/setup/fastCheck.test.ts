import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fastCheckSettings } from '../support/fastCheckSettings';

describe('fast-check setup', () => {
  it('is active in every test run with the settings the environment asks for', () => {
    expect(fc.readConfigureGlobal()).toMatchObject({ ...fastCheckSettings(process.env) });
  });
});
