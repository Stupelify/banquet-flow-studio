import { describe, expect, it } from 'vitest';
import {
  readPayableGrandTotalInput,
  resolveDueAmount,
  resolvePayableTotal,
  resolvePaymentReceivedGross,
} from '../booking-readers';

describe('booking-readers', () => {
  it('prefers finalAmountValue over grandTotal and legacy string', () => {
    expect(
      resolvePayableTotal({
        finalAmountValue: 1444500,
        grandTotal: 1400000,
        finalAmount: '1300000',
      })
    ).toBe(1444500);
  });

  it('falls back to grandTotal then finalAmount string', () => {
    expect(resolvePayableTotal({ grandTotal: 1400000, finalAmount: '1300000' })).toBe(1400000);
    expect(resolvePayableTotal({ finalAmount: '1300000' })).toBe(1300000);
  });

  it('prefers paymentReceivedAmountValue over legacy string', () => {
    expect(
      resolvePaymentReceivedGross({
        paymentReceivedAmountValue: 900000,
        paymentReceivedAmount: '500000',
      })
    ).toBe(900000);
  });

  it('prefers dueAmountValue over legacy string', () => {
    expect(resolveDueAmount({ dueAmountValue: 944500, dueAmount: '544500' })).toBe(944500);
  });

  it('reads payableGrandTotal before legacy finalAmount fields', () => {
    expect(
      readPayableGrandTotalInput({
        payableGrandTotal: 1444500,
        finalAmountValue: 999,
        finalAmount: '888',
      })
    ).toBe(1444500);
  });
});
