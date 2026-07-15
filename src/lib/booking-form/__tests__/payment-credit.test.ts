import { describe, expect, it } from 'vitest';
import {
  paymentCountsTowardDue,
  sumAllPaymentAmounts,
  sumPaymentsTowardDue,
} from '../payment-credit';

describe('paymentCountsTowardDue', () => {
  const today = '2026-05-29';

  it('counts cash immediately', () => {
    expect(
      paymentCountsTowardDue({ mode: 'cash', amount: '1000', clearingDate: '' }, today)
    ).toBe(true);
  });

  it('excludes cheque without clearing date', () => {
    expect(
      paymentCountsTowardDue({ mode: 'cheque', amount: '400000', clearingDate: '' }, today)
    ).toBe(false);
  });

  it('excludes cheque with future clearing date', () => {
    expect(
      paymentCountsTowardDue(
        { mode: 'cheque', amount: '400000', clearingDate: '2026-06-20' },
        today
      )
    ).toBe(false);
  });

  it('includes cheque when clearing date is today or past', () => {
    expect(
      paymentCountsTowardDue(
        { mode: 'cheque', amount: '400000', clearingDate: '2026-05-29' },
        today
      )
    ).toBe(true);
  });
});

describe('sumPaymentsTowardDue', () => {
  it('sums only cleared or non-cheque payments', () => {
    const payments = [
      { mode: 'cash', amount: '500000', clearingDate: '' },
      { mode: 'cheque', amount: '400000', clearingDate: '2026-06-20' },
    ];
    expect(sumPaymentsTowardDue(payments, '2026-05-29')).toBe(500000);
    expect(sumAllPaymentAmounts(payments)).toBe(900000);
  });
});
