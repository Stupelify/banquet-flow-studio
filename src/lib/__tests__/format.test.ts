import { describe, expect, it } from 'vitest';
import { formatINR, formatAppDate } from '../format';

describe('formatINR', () => {
  it('formats whole rupees with Indian grouping (lakh)', () => {
    expect(formatINR(1850000)).toBe('₹18,50,000');
  });

  it('always shows 2 decimals when paise is non-zero', () => {
    expect(formatINR(739964.8)).toBe('₹7,39,964.80');
  });

  it('shows 2 decimals for 1-decimal paise input, never 1', () => {
    expect(formatINR(100.5)).toBe('₹100.50');
    expect(formatINR(100.1)).toBe('₹100.10');
  });

  it('shows no decimals when paise is zero', () => {
    expect(formatINR(5000)).toBe('₹5,000');
  });

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });

  it('formats negatives with leading minus before the symbol', () => {
    expect(formatINR(-5000)).toBe('-₹5,000');
  });

  it('returns em dash for null/undefined', () => {
    expect(formatINR(null)).toBe('—');
    expect(formatINR(undefined)).toBe('—');
  });

  it('compact: crore with up to 2 decimals', () => {
    expect(formatINR(15200000, { compact: true })).toBe('₹1.52Cr');
  });

  it('compact: lakh with 1 decimal', () => {
    expect(formatINR(1850000, { compact: true })).toBe('₹18.5L');
  });

  it('compact: drops trailing .0', () => {
    expect(formatINR(400000, { compact: true })).toBe('₹4L');
  });

  it('compact: below 1 lakh falls back to full form', () => {
    expect(formatINR(99999, { compact: true })).toBe('₹99,999');
  });
});

describe('formatAppDate', () => {
  it('formats with year by default', () => {
    expect(formatAppDate('2026-07-07')).toBe('7 Jul 2026');
  });

  it('omits year when withYear is false', () => {
    expect(formatAppDate('2026-07-07', { withYear: false })).toBe('7 Jul');
  });

  it('appends 12h time (no seconds) when withTime is true', () => {
    expect(formatAppDate('2026-07-07T15:31:00+05:30', { withTime: true })).toBe(
      '7 Jul 2026, 3:31 PM'
    );
  });

  it('returns em dash for invalid date strings', () => {
    expect(formatAppDate('not-a-date')).toBe('—');
  });

  it('returns em dash for null/undefined', () => {
    expect(formatAppDate(null)).toBe('—');
    expect(formatAppDate(undefined)).toBe('—');
  });
});
