import { describe, expect, it } from 'vitest';
import { optionalDigits, optionalId, optionalText } from '../customerPayload';

describe('customerPayload', () => {
  it('omits empty optional fields on create', () => {
    expect(optionalText('  ', 'create')).toBeUndefined();
    expect(optionalDigits('', 'create')).toBeUndefined();
    expect(optionalId('', 'create')).toBeUndefined();
  });

  it('clears empty optional fields on update', () => {
    expect(optionalText('  ', 'update')).toBeNull();
    expect(optionalDigits('', 'update')).toBeNull();
    expect(optionalId('', 'update')).toBeNull();
  });

  it('preserves non-empty values', () => {
    expect(optionalText('a@b.com', 'update')).toBe('a@b.com');
    expect(optionalDigits('9876543210', 'update')).toBe('9876543210');
  });
});
