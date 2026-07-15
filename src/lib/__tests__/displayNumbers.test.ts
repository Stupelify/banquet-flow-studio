import { describe, expect, it } from 'vitest';
import {
  formatDisplayInr,
  formatDisplayInteger,
  formatDisplayNumber,
  formatDisplayPercent,
} from '../displayNumbers';

describe('displayNumbers', () => {
  it('caps fractional display at two decimals', () => {
    expect(formatDisplayNumber(89.76725542759418, 2)).toBe('89.77');
  });

  it('formats KPI trend percentages cleanly', () => {
    expect(formatDisplayPercent(89.76725542759418, 2)).toBe('89.77%');
    expect(formatDisplayPercent(-12.3456, 1)).toBe('12.3%');
  });

  it('formats whole-number counts without decimals', () => {
    expect(formatDisplayInteger(450.8)).toBe('451');
  });

  it('formats INR display amounts with at most two decimals', () => {
    expect(formatDisplayInr(1234.567)).toBe('₹1,234.57');
  });
});
