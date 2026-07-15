import { describe, it, expect } from 'vitest';
import { resolveFlag, SERVER_PAGINATION_FLAG_KEYS } from '../featureFlags';

describe('resolveFlag', () => {
  it('localStorage override wins over env and default', () => {
    expect(resolveFlag('off', 'true', true)).toBe(false);
    expect(resolveFlag('on', 'false', false)).toBe(true);
  });
  it('accepts on/off/true/false/1/0 (case-insensitive)', () => {
    expect(resolveFlag('OFF', undefined, true)).toBe(false);
    expect(resolveFlag('True', undefined, false)).toBe(true);
    expect(resolveFlag('1', undefined, false)).toBe(true);
    expect(resolveFlag('0', undefined, true)).toBe(false);
  });
  it('falls back to env when no localStorage override', () => {
    expect(resolveFlag(null, 'false', true)).toBe(false);
    expect(resolveFlag(undefined, '1', false)).toBe(true);
  });
  it('falls back to default when neither is set', () => {
    expect(resolveFlag(null, undefined, true)).toBe(true);
    expect(resolveFlag(null, undefined, false)).toBe(false);
  });
  it('ignores unparseable localStorage values and uses next source', () => {
    expect(resolveFlag('maybe', 'false', true)).toBe(false);
    expect(resolveFlag('maybe', undefined, true)).toBe(true);
  });
  it('exposes a distinct localStorage key per list', () => {
    const keys = Object.values(SERVER_PAGINATION_FLAG_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(SERVER_PAGINATION_FLAG_KEYS.customers).toContain('customers');
  });
});
