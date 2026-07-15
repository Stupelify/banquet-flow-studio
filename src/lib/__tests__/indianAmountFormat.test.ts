import { describe, expect, it } from 'vitest';
import {
  formatIndianAmountDisplay,
  parseIndianAmountInput,
  stripToDigits,
} from '../indianAmountFormat';

describe('indianAmountFormat', () => {
  it('stripToDigits removes grouping and non-digits', () => {
    expect(stripToDigits('21,20,000')).toBe('2120000');
    expect(stripToDigits('₹ 5,000')).toBe('5000');
    expect(stripToDigits('')).toBe('');
  });

  it('formatIndianAmountDisplay uses en-IN grouping', () => {
    expect(formatIndianAmountDisplay('500')).toBe('500');
    expect(formatIndianAmountDisplay('5000')).toBe('5,000');
    expect(formatIndianAmountDisplay('50000')).toBe('50,000');
    expect(formatIndianAmountDisplay('500000')).toBe('5,00,000');
    expect(formatIndianAmountDisplay('2120000')).toBe('21,20,000');
    expect(formatIndianAmountDisplay('')).toBe('');
  });

  it('parseIndianAmountInput matches stripToDigits', () => {
    expect(parseIndianAmountInput('21,20,000')).toBe('2120000');
    expect(parseIndianAmountInput('2120000')).toBe('2120000');
  });
});
