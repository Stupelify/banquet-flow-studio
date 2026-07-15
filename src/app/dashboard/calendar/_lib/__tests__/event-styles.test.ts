import { describe, expect, it } from 'vitest';
import {
  buildBanquetIndex,
  compactClock,
  fitMonthLines,
  locationFor,
  monthLineVariant,
  NCAL_LOCATION_COUNT,
  NCAL_NEUTRAL,
  statusClass,
} from '../event-styles';

const halls = [
  { id: '1', name: '6a', banquetName: 'BIKA 2' },
  { id: '2', name: '1ab', banquetName: 'BIKA 1' },
  { id: '3', name: 'Tarang', banquetName: 'The Four Vedas' },
  { id: '4', name: 'Divinity', banquetName: 'Divinity Pavilion' },
  { id: '5', name: 'Mystery', banquetName: '' },
  { id: '6', name: 'Extra', banquetName: 'Zeta Hall' },
];

describe('buildBanquetIndex', () => {
  it('sorts banquets alphabetically, Unassigned last, wraps at palette size', () => {
    const idx = buildBanquetIndex(halls);
    expect(idx.get('BIKA 1')).toBe(0);
    expect(idx.get('BIKA 2')).toBe(1);
    expect(idx.get('Divinity Pavilion')).toBe(2);
    expect(idx.get('The Four Vedas')).toBe(3);
    expect(idx.get('Zeta Hall')).toBe(4);
    expect(idx.get('Unassigned')).toBe(5);
    expect(NCAL_LOCATION_COUNT).toBe(16);
  });
});

describe('locationFor', () => {
  it('maps unknown/empty banquet to neutral', () => {
    const idx = buildBanquetIndex(halls);
    expect(locationFor('Nope', idx)).toBe(NCAL_NEUTRAL);
    expect(locationFor(undefined, idx)).toEqual(locationFor('Unassigned', idx));
  });
});

describe('statusClass', () => {
  it('maps statuses to shape classes', () => {
    expect(statusClass('confirmed')).toBe('confirmed');
    expect(statusClass('CONFIRMED')).toBe('confirmed');
    expect(statusClass('pencil')).toBe('pencil');
    expect(statusClass('quotation')).toBe('quotation');
    expect(statusClass('enquiry')).toBe('enquiry');
    expect(statusClass('pending')).toBe('pending');
    expect(statusClass('cancelled')).toBe('cancelled');
    expect(statusClass('anything-else')).toBe('pending');
  });
});

describe('fitMonthLines', () => {
  it('shows all lines when they fit', () => {
    expect(fitMonthLines(4, 4 * 16.5)).toEqual({ visible: 4, hidden: 0 });
  });
  it('reserves a slot for +N more when overflowing', () => {
    // 100px avail, 71 total: floor((100-16.5)/16.5) = 5 visible
    expect(fitMonthLines(71, 100)).toEqual({ visible: 5, hidden: 66 });
  });
  it('handles zero space', () => {
    expect(fitMonthLines(10, 0)).toEqual({ visible: 0, hidden: 10 });
  });
  it('handles zero events', () => {
    expect(fitMonthLines(0, 200)).toEqual({ visible: 0, hidden: 0 });
  });
});

describe('compactClock', () => {
  it('formats compact 12h', () => {
    expect(compactClock('07:00')).toBe('7a');
    expect(compactClock('13:30')).toBe('1:30p');
    expect(compactClock('00:00')).toBe('12a');
    expect(compactClock('12:00')).toBe('12p');
    expect(compactClock('')).toBe('');
  });
});

describe('monthLineVariant', () => {
  it('solid only for confirmed', () => {
    expect(monthLineVariant('confirmed')).toBe('solid');
    expect(monthLineVariant('pencil')).toBe('hollow');
    expect(monthLineVariant('enquiry')).toBe('hollow');
  });
});
