import { describe, expect, it } from 'vitest';
import { isTeacherMode } from './teacherMode';

describe('teacher mode flag', () => {
  it('is on with ?teacher in the address, alone or with other parameters', () => {
    expect(isTeacherMode('?teacher')).toBe(true);
    expect(isTeacherMode('?lang=es&teacher=1')).toBe(true);
  });

  it('is off otherwise', () => {
    expect(isTeacherMode('')).toBe(false);
    expect(isTeacherMode('?teachers')).toBe(false);
  });
});
