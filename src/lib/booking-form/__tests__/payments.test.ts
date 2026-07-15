import { describe, expect, it } from 'vitest';
import {
  mapBookingPaymentsFromApi,
  partitionPaymentsForSave,
  paymentRowChanged,
} from '../payments';

describe('partitionPaymentsForSave', () => {
  it('POSTs only rows without id that have amount and date', () => {
    const payments = [
      { mode: 'cash', amount: '100', date: '2026-01-01', narration: '', receivedBy: '', reference: '', clearingDate: '' },
      { id: 'p1', mode: 'cash', amount: '50', date: '2026-01-02', narration: '', receivedBy: '', reference: '', clearingDate: '', _original: { mode: 'cash', amount: '50', date: '2026-01-02', narration: '', receivedBy: '', reference: '', clearingDate: '' } },
    ];
    const { newPayments, changedPayments } = partitionPaymentsForSave(payments);
    expect(newPayments).toHaveLength(1);
    expect(changedPayments).toHaveLength(0);
  });

  it('PATCHes only changed rows with id', () => {
    const payments = [
      {
        id: 'p1',
        mode: 'cash',
        amount: '99',
        date: '2026-01-02',
        narration: '',
        receivedBy: '',
        reference: '',
        clearingDate: '',
        _original: {
          mode: 'cash',
          amount: '50',
          date: '2026-01-02',
          narration: '',
          receivedBy: '',
          reference: '',
          clearingDate: '',
        },
      },
    ];
    const { changedPayments, newPayments } = partitionPaymentsForSave(payments);
    expect(changedPayments).toHaveLength(1);
    expect(newPayments).toHaveLength(0);
  });

  it('does not POST rows that already have id', () => {
    const payments = [
      {
        id: 'p1',
        mode: 'cash',
        amount: '50',
        date: '2026-01-02',
        narration: '',
        receivedBy: '',
        reference: '',
        clearingDate: '',
        _original: {
          mode: 'cash',
          amount: '50',
          date: '2026-01-02',
          narration: '',
          receivedBy: '',
          reference: '',
          clearingDate: '',
        },
      },
    ];
    expect(paymentRowChanged(payments[0])).toBe(false);
    expect(partitionPaymentsForSave(payments).newPayments).toHaveLength(0);
  });
});

describe('mapBookingPaymentsFromApi', () => {
  it('maps API payment shape to form rows with _original snapshot', () => {
    const rows = mapBookingPaymentsFromApi([
      {
        id: 'abc',
        method: 'cash',
        amount: 500,
        paymentDate: '2026-05-01T00:00:00.000Z',
        narration: 'Advance',
        reference: 'REF1',
      },
    ]);
    expect(rows[0].id).toBe('abc');
    expect(rows[0].amount).toBe('500');
    expect(rows[0].date).toBe('2026-05-01');
    expect(rows[0]._original?.amount).toBe('500');
  });
});
